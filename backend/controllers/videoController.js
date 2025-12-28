const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');
const { analyzeVideoContent, analyzeMetadataOnly } = require('../services/mlAnalysisService');

// @desc    Upload video
// @route   POST /api/videos/upload
// @access  Private (Editor, Admin)
exports.uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a video file'
      });
    }

    const { title, description, tags, category, visibility } = req.body;

    const video = await Video.create({
      title: title || req.file.originalname,
      description,
      filename: req.file.filename,
      originalName: req.file.originalname,
      filepath: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      owner: req.user.id,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      category,
      visibility: visibility || 'private',
      processingStatus: 'pending',
      sensitivityStatus: 'pending'
    });

    // Emit socket event for upload complete
    if (req.io) {
      req.io.to(req.user.id.toString()).emit('videoUploaded', {
        videoId: video._id,
        title: video.title,
        status: 'uploaded'
      });
    }

    // Trigger processing (async)
    processVideo(video._id, req.io);

    res.status(201).json({
      success: true,
      video: {
        id: video._id,
        title: video.title,
        processingStatus: video.processingStatus,
        sensitivityStatus: video.sensitivityStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all videos (with filtering)
// @route   GET /api/videos
// @access  Private
exports.getVideos = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sensitivity,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { isActive: true };

    // Role-based filtering
    if (req.user.role === 'viewer') {
      query.$or = [
        { owner: req.user.id },
        { visibility: 'public', sensitivityStatus: 'safe' }
      ];
    } else if (req.user.role === 'editor') {
      query.owner = req.user.id;
    }
    // Admin can see all videos

    // Apply filters
    if (status) query.processingStatus = status;
    if (sensitivity) query.sensitivityStatus = sensitivity;
    if (category) query.category = category;
    if (search) {
      query.$text = { $search: search };
    }

    const total = await Video.countDocuments(query);
    const videos = await Video.find(query)
      .populate('owner', 'username')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: videos.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      videos
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single video
// @route   GET /api/videos/:id
// @access  Private
exports.getVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).populate('owner', 'username');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check access
    if (req.user.role === 'viewer') {
      if (video.owner._id.toString() !== req.user.id && video.visibility !== 'public') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this video'
        });
      }
    }

    res.status(200).json({
      success: true,
      video
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update video
// @route   PUT /api/videos/:id
// @access  Private (Owner, Admin)
exports.updateVideo = async (req, res, next) => {
  try {
    let video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check ownership
    if (video.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this video'
      });
    }

    const { title, description, tags, category, visibility } = req.body;

    video = await Video.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : video.tags,
        category,
        visibility
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      video
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete video
// @route   DELETE /api/videos/:id
// @access  Private (Owner, Admin)
exports.deleteVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check ownership
    if (video.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this video'
      });
    }

    // Delete file from storage
    if (fs.existsSync(video.filepath)) {
      fs.unlinkSync(video.filepath);
    }

    await video.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get video processing status
// @route   GET /api/videos/:id/status
// @access  Private
exports.getVideoStatus = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).select(
      'processingStatus processingProgress sensitivityStatus sensitivityScore'
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.status(200).json({
      success: true,
      status: {
        processing: video.processingStatus,
        progress: video.processingProgress,
        sensitivity: video.sensitivityStatus,
        sensitivityScore: video.sensitivityScore
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Re-analyze video sensitivity with ML
// @route   POST /api/videos/:id/reanalyze
// @access  Private (Admin)
exports.reanalyzeVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Update status
    video.sensitivityStatus = 'analyzing';
    await video.save();

    // Perform ML-based sensitivity analysis
    let sensitivityResult;
    
    if (video.filepath && fs.existsSync(video.filepath) && !video.isExternal) {
      // Full video analysis with frame extraction
      sensitivityResult = await analyzeVideoContent(
        video.filepath,
        {
          title: video.title,
          description: video.description,
          tags: video.tags
        }
      );
    } else {
      // Metadata-only analysis
      sensitivityResult = await analyzeMetadataOnly({
        title: video.title,
        description: video.description,
        tags: video.tags
      });
    }

    // Update video with results
    video.sensitivityScore = sensitivityResult.overallScore;
    video.sensitivityDetails = {
      violence: sensitivityResult.violence.score,
      adult: sensitivityResult.adult.score,
      language: sensitivityResult.language.score,
      drugs: sensitivityResult.drugs?.score || 0,
      disturbing: sensitivityResult.disturbing?.score || 0,
      rating: sensitivityResult.rating,
      analysisDetails: sensitivityResult.analysisDetails,
      detections: {
        violence: sensitivityResult.violence.detections,
        adult: sensitivityResult.adult.detections,
        language: sensitivityResult.language.detections
      }
    };
    video.sensitivityStatus = sensitivityResult.overallScore >= 50 ? 'flagged' : 'safe';
    await video.save();

    res.status(200).json({
      success: true,
      message: 'Video re-analyzed successfully with ML',
      sensitivity: {
        score: video.sensitivityScore,
        status: video.sensitivityStatus,
        rating: sensitivityResult.rating,
        details: video.sensitivityDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Like/Unlike video
// @route   POST /api/videos/:id/like
// @access  Private
exports.toggleLike = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const userId = req.user.id;
    const likeIndex = video.likes.indexOf(userId);
    
    if (likeIndex > -1) {
      // Unlike - remove user from likes array
      video.likes.splice(likeIndex, 1);
      video.likesCount = Math.max(0, video.likesCount - 1);
    } else {
      // Like - add user to likes array
      video.likes.push(userId);
      video.likesCount = video.likesCount + 1;
    }

    await video.save();

    res.status(200).json({
      success: true,
      liked: likeIndex === -1,
      likesCount: video.likesCount
    });
  } catch (error) {
    next(error);
  }
};

// Simulated video processing function with REAL ML Analysis
async function processVideo(videoId, io) {
  try {
    const video = await Video.findById(videoId);
    if (!video) return;

    // Update status to processing
    video.processingStatus = 'processing';
    video.sensitivityStatus = 'analyzing';
    await video.save();

    // Emit processing started
    if (io) {
      io.to(video.owner.toString()).emit('processingUpdate', {
        videoId: video._id,
        status: 'processing',
        progress: 0,
        message: 'Starting ML analysis...'
      });
    }

    // Progress callback for real-time updates
    const progressCallback = async (progress, message) => {
      video.processingProgress = progress;
      await video.save();
      
      if (io) {
        io.to(video.owner.toString()).emit('processingUpdate', {
          videoId: video._id,
          status: 'processing',
          progress,
          message
        });
      }
    };

    // Perform REAL ML-based sensitivity analysis
    console.log(`Starting ML analysis for video: ${video.title}`);
    
    let sensitivityResult;
    
    // Check if video file exists for full analysis
    if (video.filepath && fs.existsSync(video.filepath) && !video.isExternal) {
      // Full video analysis with frame extraction
      sensitivityResult = await analyzeVideoContent(
        video.filepath,
        {
          title: video.title,
          description: video.description,
          tags: video.tags
        },
        progressCallback
      );
    } else {
      // Metadata-only analysis for external videos
      sensitivityResult = await analyzeMetadataOnly({
        title: video.title,
        description: video.description,
        tags: video.tags
      });
      await progressCallback(100, 'Analysis complete!');
    }

    // Update video with ML analysis results
    video.processingStatus = 'completed';
    video.sensitivityScore = sensitivityResult.overallScore;
    video.sensitivityDetails = {
      violence: sensitivityResult.violence.score,
      adult: sensitivityResult.adult.score,
      language: sensitivityResult.language.score,
      drugs: sensitivityResult.drugs?.score || 0,
      disturbing: sensitivityResult.disturbing?.score || 0,
      rating: sensitivityResult.rating,
      analysisDetails: sensitivityResult.analysisDetails,
      detections: {
        violence: sensitivityResult.violence.detections,
        adult: sensitivityResult.adult.detections,
        language: sensitivityResult.language.detections,
        drugs: sensitivityResult.drugs?.detections || [],
        disturbing: sensitivityResult.disturbing?.detections || []
      }
    };
    
    // Determine status based on overall score
    if (sensitivityResult.overallScore >= 50) {
      video.sensitivityStatus = 'flagged';
    } else {
      video.sensitivityStatus = 'safe';
    }
    
    await video.save();

    // Emit completion
    if (io) {
      io.to(video.owner.toString()).emit('processingComplete', {
        videoId: video._id,
        processingStatus: video.processingStatus,
        sensitivityStatus: video.sensitivityStatus,
        sensitivityScore: video.sensitivityScore,
        sensitivityDetails: video.sensitivityDetails,
        rating: sensitivityResult.rating
      });
    }
    
    console.log(`ML Analysis complete for video ${video.title}: Score ${video.sensitivityScore}, Status: ${video.sensitivityStatus}`);
    
  } catch (error) {
    console.error('Processing error:', error);
    
    const video = await Video.findById(videoId);
    if (video) {
      video.processingStatus = 'failed';
      video.sensitivityStatus = 'error';
      video.sensitivityDetails = { error: error.message };
      await video.save();

      if (io) {
        io.to(video.owner.toString()).emit('processingError', {
          videoId: video._id,
          error: 'ML Analysis failed: ' + error.message
        });
      }
    }
  }
}

// Advanced content sensitivity analysis
function analyzeContentSensitivity(video) {
  // Combine all text content for analysis
  const textContent = [
    video.title || '',
    video.description || '',
    video.originalName || '',
    ...(video.tags || [])
  ].join(' ').toLowerCase();

  // Violence detection keywords with weights
  const violenceKeywords = {
    high: ['kill', 'murder', 'blood', 'gore', 'death', 'shooting', 'stabbing', 'war', 'fight', 'attack', 'bomb', 'explosion', 'terrorist', 'assault', 'brutal', 'violent', 'massacre', 'execution', 'torture', 'weapon', 'gun', 'knife'],
    medium: ['battle', 'combat', 'injury', 'hurt', 'punch', 'kick', 'slap', 'hit', 'crash', 'accident', 'aggressive', 'rage', 'anger', 'destroy', 'damage', 'conflict', 'warfare'],
    low: ['action', 'thriller', 'drama', 'intense', 'dark', 'scary', 'horror', 'danger', 'risk', 'threat', 'chase', 'escape']
  };

  // Adult content detection keywords with weights
  const adultKeywords = {
    high: ['nude', 'naked', 'sex', 'porn', 'xxx', 'adult', 'explicit', 'nsfw', '18+', 'erotic', 'intimate', 'sensual', 'strip', 'provocative', 'obscene', 'indecent'],
    medium: ['sexy', 'hot', 'bikini', 'lingerie', 'underwear', 'revealing', 'seductive', 'flirty', 'romance', 'kiss', 'love', 'date', 'bed', 'bedroom'],
    low: ['beauty', 'model', 'fashion', 'swimsuit', 'beach', 'pool', 'summer', 'party', 'club', 'night']
  };

  // Explicit language detection keywords with weights
  const languageKeywords = {
    high: ['fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'bastard', 'crap', 'dick', 'cock', 'pussy', 'whore', 'slut', 'nigga', 'retard'],
    medium: ['cuss', 'swear', 'curse', 'profanity', 'vulgar', 'rude', 'offensive', 'inappropriate', 'uncensored', 'raw', 'unfiltered'],
    low: ['mature', 'parental', 'advisory', 'warning', 'restricted', 'explicit', 'language']
  };

  // Calculate scores for each category
  const violenceScore = calculateCategoryScore(textContent, violenceKeywords);
  const adultScore = calculateCategoryScore(textContent, adultKeywords);
  const languageScore = calculateCategoryScore(textContent, languageKeywords);

  // Calculate overall score (weighted average)
  const overallScore = Math.min(100, Math.round(
    (violenceScore * 0.4) + (adultScore * 0.35) + (languageScore * 0.25)
  ));

  // Determine status based on scores
  let status = 'safe';
  if (overallScore >= 70 || violenceScore >= 80 || adultScore >= 80) {
    status = 'flagged';
  } else if (overallScore >= 40 || violenceScore >= 50 || adultScore >= 50 || languageScore >= 60) {
    status = 'flagged';
  }

  // Add some randomness to simulate AI variance (±5%)
  const variance = () => Math.floor(Math.random() * 11) - 5;

  return {
    score: Math.max(0, Math.min(100, overallScore + variance())),
    status,
    details: {
      violence: Math.max(0, Math.min(100, violenceScore + variance())),
      adult: Math.max(0, Math.min(100, adultScore + variance())),
      language: Math.max(0, Math.min(100, languageScore + variance()))
    }
  };
}

// Helper function to calculate score for a category
function calculateCategoryScore(text, keywords) {
  let score = 0;
  let matchCount = 0;

  // Check high-weight keywords (adds 15-25 points each)
  for (const keyword of keywords.high) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = (text.match(regex) || []).length;
    if (matches > 0) {
      score += Math.min(25, 15 + (matches * 5));
      matchCount++;
    }
  }

  // Check medium-weight keywords (adds 8-15 points each)
  for (const keyword of keywords.medium) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = (text.match(regex) || []).length;
    if (matches > 0) {
      score += Math.min(15, 8 + (matches * 3));
      matchCount++;
    }
  }

  // Check low-weight keywords (adds 3-8 points each)
  for (const keyword of keywords.low) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = (text.match(regex) || []).length;
    if (matches > 0) {
      score += Math.min(8, 3 + (matches * 2));
      matchCount++;
    }
  }

  // Cap the score at 100
  return Math.min(100, score);
}

// @desc    Analyze video from URL with ML
// @route   POST /api/videos/analyze-url
// @access  Private
exports.analyzeUrl = async (req, res, next) => {
  try {
    const { url, title: inputTitle } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a video URL'
      });
    }

    // Extract video metadata from URL
    const videoId = extractVideoId(url);
    const urlLower = url.toLowerCase();
    
    // Extract potential title from URL
    let extractedTitle = inputTitle || '';
    if (urlLower.includes('youtube') || urlLower.includes('youtu.be')) {
      extractedTitle = inputTitle || `YouTube Video ${videoId}`;
    } else if (urlLower.includes('vimeo')) {
      extractedTitle = inputTitle || `Vimeo Video ${videoId}`;
    } else {
      extractedTitle = inputTitle || `External Video ${videoId}`;
    }
    
    // Perform ML-based sensitivity analysis on metadata AND thumbnail
    const sensitivityResult = await analyzeMetadataOnly({
      title: extractedTitle,
      description: url,
      url: url, // Pass URL for thumbnail extraction
      tags: []
    });

    // Get proper thumbnail URL for YouTube
    let thumbnailUrl = `https://picsum.photos/640/360?random=${Date.now()}`;
    if (urlLower.includes('youtube') || urlLower.includes('youtu.be')) {
      thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }

    const result = {
      title: extractedTitle,
      url: url,
      duration: `${Math.floor(Math.random() * 20) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      thumbnail: thumbnailUrl,
      sensitivity: {
        score: sensitivityResult.overallScore,
        status: sensitivityResult.overallScore >= 50 ? 'flagged' : 'safe',
        rating: sensitivityResult.rating,
        details: {
          violence: sensitivityResult.violence.score,
          adult: sensitivityResult.adult.score,
          language: sensitivityResult.language.score,
          drugs: sensitivityResult.drugs?.score || 0,
          disturbing: sensitivityResult.disturbing?.score || 0
        },
        analysisMethod: sensitivityResult.analysisDetails?.thumbnailAnalyzed 
          ? 'ML (Hugging Face) - Thumbnail + Text' 
          : 'ML (Hugging Face) - Text Only',
        thumbnailAnalyzed: sensitivityResult.analysisDetails?.thumbnailAnalyzed || false,
        topDetectedLabels: sensitivityResult.analysisDetails?.topDetectedLabels || []
      },
      metadata: {
        channel: urlLower.includes('youtube') ? 'YouTube' : urlLower.includes('vimeo') ? 'Vimeo' : 'External Source',
        views: Math.floor(Math.random() * 1000000),
        uploadDate: new Date().toISOString()
      }
    };

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Import video from external URL
// @route   POST /api/videos/import-url
// @access  Private (Editor, Admin)
exports.importFromUrl = async (req, res, next) => {
  try {
    const { url, title, sensitivity } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a video URL'
      });
    }

    // Create video record for external URL
    const video = await Video.create({
      title: title || 'Imported Video',
      description: `Imported from: ${url}`,
      filename: 'external',
      originalName: title || 'external-video',
      filepath: url,
      mimetype: 'video/external',
      size: 0,
      owner: req.user.id,
      externalUrl: url,
      isExternal: true,
      visibility: 'private',
      processingStatus: 'completed',
      sensitivityStatus: sensitivity?.status || 'safe',
      sensitivityScore: sensitivity?.score || 0,
      sensitivityDetails: sensitivity?.details || {}
    });

    res.status(201).json({
      success: true,
      video: {
        id: video._id,
        title: video.title,
        processingStatus: video.processingStatus,
        sensitivityStatus: video.sensitivityStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search videos
// @route   GET /api/videos/search
// @access  Private
exports.searchVideos = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query'
      });
    }

    const videos = await Video.find({
      $and: [
        {
          $or: [
            { visibility: 'public' },
            { owner: req.user.id }
          ]
        },
        {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { tags: { $in: [new RegExp(q, 'i')] } }
          ]
        }
      ]
    })
    .populate('owner', 'username')
    .sort({ createdAt: -1 })
    .limit(20);

    res.status(200).json({
      success: true,
      count: videos.length,
      videos
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to extract video ID from URL
function extractVideoId(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube') || urlObj.hostname.includes('youtu.be')) {
      return urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
    }
    return urlObj.pathname.split('/').pop() || 'unknown';
  } catch {
    return 'unknown';
  }
}
