const { HfInference } = require('@huggingface/inference');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');

// Initialize Hugging Face client - REQUIRES API KEY for reliable inference
// Get free API key at: https://huggingface.co/settings/tokens
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const hf = HF_API_KEY ? new HfInference(HF_API_KEY) : null;

if (!HF_API_KEY) {
  console.warn('⚠️  HUGGINGFACE_API_KEY not set. Using fallback image analysis.');
  console.warn('   Get a free API key at: https://huggingface.co/settings/tokens');
}

// Content moderation models (require API key)
const MODELS = {
  // NSFW/Adult content detection - works well
  nsfw: 'Falconsai/nsfw_image_detection',
  // General image classification
  imageClassification: 'google/vit-base-patch16-224',
  // Text classification for profanity  
  textClassification: 'facebook/roberta-hate-speech-dynabench-r4-target'
};

// Sensitivity categories and their weights
const SENSITIVITY_CATEGORIES = {
  violence: { weight: 0.25, threshold: 0.3 },
  adult: { weight: 0.25, threshold: 0.3 },
  language: { weight: 0.20, threshold: 0.3 },
  drugs: { weight: 0.15, threshold: 0.3 },
  disturbing: { weight: 0.15, threshold: 0.3 }
};

/**
 * Extract frames from video at specified intervals
 * @param {string} videoPath - Path to video file
 * @param {number} numFrames - Number of frames to extract
 * @returns {Promise<string[]>} - Array of frame file paths
 */
async function extractFrames(videoPath, numFrames = 10) {
  return new Promise((resolve, reject) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-frames-'));
    const frames = [];
    
    // Get video duration first
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error('Error probing video:', err);
        reject(err);
        return;
      }
      
      const duration = metadata.format.duration || 60;
      const interval = Math.max(1, Math.floor(duration / numFrames));
      
      console.log(`Video duration: ${duration}s, extracting ${numFrames} frames at ${interval}s intervals`);
      
      let extractedCount = 0;
      
      ffmpeg(videoPath)
        .on('end', () => {
          // Read all extracted frames
          const files = fs.readdirSync(tempDir)
            .filter(f => f.endsWith('.jpg'))
            .sort()
            .map(f => path.join(tempDir, f));
          console.log(`Extracted ${files.length} frames`);
          resolve(files);
        })
        .on('error', (err) => {
          console.error('Error extracting frames:', err);
          reject(err);
        })
        .outputOptions([
          `-vf fps=1/${interval}`,
          '-q:v 2'
        ])
        .output(path.join(tempDir, 'frame-%03d.jpg'))
        .run();
    });
  });
}

/**
 * Read image file and convert to base64
 * @param {string} imagePath - Path to image file
 * @returns {Buffer} - Image buffer
 */
function readImageAsBuffer(imagePath) {
  return fs.readFileSync(imagePath);
}

/**
 * Analyze image buffer for color characteristics
 * Basic heuristic analysis when HF API is not available
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Object} - Color analysis results
 */
function analyzeImageColors(imageBuffer) {
  // Simple analysis of image bytes for dominant colors
  // This is a heuristic approach when ML API is unavailable
  const stats = {
    redIntensity: 0,
    skinToneIndicator: 0,
    darkIntensity: 0,
    totalPixels: 0
  };
  
  // Sample every 100 bytes for quick analysis
  for (let i = 0; i < imageBuffer.length - 3; i += 100) {
    const r = imageBuffer[i] || 0;
    const g = imageBuffer[i + 1] || 0;
    const b = imageBuffer[i + 2] || 0;
    
    stats.totalPixels++;
    
    // Red intensity (blood, violence indicators)
    if (r > 150 && r > g * 1.3 && r > b * 1.3) {
      stats.redIntensity++;
    }
    
    // Skin tone detection (rough approximation)
    if (r > 95 && g > 40 && b > 20 && 
        r > g && r > b &&
        Math.abs(r - g) > 15 &&
        r - g < 100) {
      stats.skinToneIndicator++;
    }
    
    // Dark/disturbing content indicator
    if (r < 50 && g < 50 && b < 50) {
      stats.darkIntensity++;
    }
  }
  
  return {
    redRatio: stats.redIntensity / Math.max(1, stats.totalPixels),
    skinRatio: stats.skinToneIndicator / Math.max(1, stats.totalPixels),
    darkRatio: stats.darkIntensity / Math.max(1, stats.totalPixels)
  };
}

/**
 * Analyze a single frame for NSFW content
 * Uses Hugging Face API if available, otherwise falls back to heuristics
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} - Analysis result
 */
async function analyzeFrameForNSFW(imageBuffer) {
  // Try Hugging Face API first
  if (hf) {
    try {
      const result = await hf.imageClassification({
        model: MODELS.nsfw,
        data: imageBuffer,
      });
      
      // Find NSFW score
      const nsfwLabels = ['nsfw', 'porn', 'sexy', 'hentai', 'explicit'];
      let nsfwScore = 0;
      
      for (const item of result) {
        const label = item.label.toLowerCase();
        if (nsfwLabels.some(l => label.includes(l))) {
          nsfwScore = Math.max(nsfwScore, item.score);
        }
      }
      
      console.log('NSFW HF API result:', nsfwScore);
      return { nsfwScore, details: result, method: 'huggingface' };
    } catch (error) {
      console.error('Hugging Face NSFW API error:', error.message);
      // Fall through to heuristic
    }
  }
  
  // Fallback: Use heuristic analysis
  console.log('Using fallback heuristic NSFW analysis');
  const colorAnalysis = analyzeImageColors(imageBuffer);
  
  // High skin tone ratio might indicate adult content
  const nsfwScore = Math.min(0.9, colorAnalysis.skinRatio * 2.5);
  
  return { 
    nsfwScore, 
    details: [{ label: 'heuristic_skin_detection', score: nsfwScore }],
    method: 'heuristic'
  };
}

/**
 * Analyze a single frame for general content
 * Uses Hugging Face API if available, otherwise falls back to heuristics
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} - Analysis result with detected categories
 */
async function analyzeFrameContent(imageBuffer) {
  let huggingFaceLabels = [];
  let hfSuccess = false;
  
  // Try Hugging Face API first
  if (hf) {
    try {
      const result = await hf.imageClassification({
        model: MODELS.imageClassification,
        data: imageBuffer,
      });
      huggingFaceLabels = result;
      hfSuccess = true;
      console.log('HF image classification success, top labels:', result.slice(0, 3).map(r => r.label));
    } catch (error) {
      console.error('Hugging Face content API error:', error.message);
      // Fall through to heuristic
    }
  }
  
  // Keywords that indicate sensitive content - EXPANDED for better detection
  const violenceKeywords = [
    'gun', 'weapon', 'blood', 'knife', 'sword', 'military', 'tank', 'rifle', 
    'assault', 'combat', 'war', 'fight', 'fighting', 'punch', 'kick', 'boxer', 
    'wrestling', 'martial', 'karate', 'boxing', 'mma', 'ufc', 'battle', 
    'soldier', 'explosion', 'grenade', 'bomb', 'wound', 'injury', 'punch bag',
    'sparring', 'cage', 'octagon', 'knockout', 'bruise', 'brawl'
  ];
  const drugKeywords = ['syringe', 'pill', 'medicine', 'cigarette', 'smoke', 'marijuana', 'drug', 'needle', 'cannabis', 'weed', 'beer', 'alcohol', 'vodka', 'whiskey', 'wine'];
  const disturbingKeywords = ['skull', 'skeleton', 'corpse', 'dead', 'gore', 'horror', 'scary', 'monster', 'demon', 'zombie', 'ghost', 'murder', 'torture', 'pain'];
  
  let violenceScore = 0;
  let drugScore = 0;
  let disturbingScore = 0;
  
  // Process HF labels if available
  if (hfSuccess && huggingFaceLabels.length > 0) {
    for (const item of huggingFaceLabels) {
      const label = item.label.toLowerCase();
      
      // Check for violence
      if (violenceKeywords.some(k => label.includes(k))) {
        violenceScore = Math.max(violenceScore, item.score);
      }
      
      // Check for drugs
      if (drugKeywords.some(k => label.includes(k))) {
        drugScore = Math.max(drugScore, item.score);
      }
      
      // Check for disturbing content
      if (disturbingKeywords.some(k => label.includes(k))) {
        disturbingScore = Math.max(disturbingScore, item.score);
      }
    }
    
    return {
      violenceScore,
      drugScore,
      disturbingScore,
      topLabels: huggingFaceLabels.slice(0, 5),
      details: huggingFaceLabels,
      method: 'huggingface'
    };
  }
  
  // Fallback: Use heuristic analysis based on image characteristics
  console.log('Using fallback heuristic content analysis');
  const colorAnalysis = analyzeImageColors(imageBuffer);
  
  // High red intensity often indicates violence (blood, fighting sports, action)
  violenceScore = Math.min(0.85, colorAnalysis.redRatio * 4);
  
  // Dark imagery might indicate disturbing content
  disturbingScore = Math.min(0.6, colorAnalysis.darkRatio * 2);
  
  return {
    violenceScore,
    drugScore: 0, // Can't detect from colors alone
    disturbingScore,
    topLabels: [
      { label: 'heuristic_red_detection', score: colorAnalysis.redRatio },
      { label: 'heuristic_dark_detection', score: colorAnalysis.darkRatio }
    ],
    details: [],
    method: 'heuristic'
  };
}

// Keyword dictionaries for text analysis fallback
const VIOLENCE_TEXT_KEYWORDS = [
  'fight', 'fighting', 'knockout', 'ko', 'punch', 'kick', 'blood', 'war', 'kill', 
  'murder', 'assault', 'attack', 'violence', 'violent', 'brutal', 'deadly', 
  'weapon', 'gun', 'shoot', 'shot', 'stab', 'ufc', 'mma', 'boxing', 'wrestler',
  'battle', 'combat', 'warrior', 'explosion', 'destroy', 'death', 'beat', 'beaten',
  'hurt', 'injury', 'wound', 'clash', 'striking', 'striker', 'knockout', 'brawl'
];

const ADULT_TEXT_KEYWORDS = [
  'adult', 'xxx', 'porn', 'sex', 'sexy', 'nude', 'naked', 'explicit', 
  'nsfw', '18+', 'mature', 'erotic', 'sensual', 'intimate', 'hot', 'steamy'
];

const DRUG_TEXT_KEYWORDS = [
  'drug', 'drugs', 'weed', 'marijuana', 'cocaine', 'heroin', 'meth', 
  'alcohol', 'drunk', 'high', 'stoned', 'smoke', 'smoking', 'cigarette',
  'beer', 'vodka', 'whiskey', 'wine', 'drunk', 'intoxicated', 'overdose'
];

const DISTURBING_TEXT_KEYWORDS = [
  'horror', 'scary', 'terrifying', 'nightmare', 'gore', 'gory', 'disturbing',
  'creepy', 'haunted', 'demon', 'devil', 'evil', 'curse', 'zombie', 'undead',
  'torture', 'pain', 'suffering', 'agony', 'scream', 'fear', 'terror'
];

const PROFANITY_KEYWORDS = [
  'fuck', 'shit', 'damn', 'hell', 'ass', 'bitch', 'bastard', 'crap'
];

/**
 * Analyze text for toxicity and profanity
 * Uses HF API if available, otherwise keyword-based fallback
 * @param {string} text - Text to analyze
 * @returns {Promise<Object>} - Toxicity analysis result with category breakdown
 */
async function analyzeText(text) {
  if (!text || text.trim().length === 0) {
    return { 
      toxicityScore: 0, 
      violenceScore: 0,
      adultScore: 0,
      drugScore: 0,
      disturbingScore: 0,
      details: [],
      method: 'none'
    };
  }
  
  const lowerText = text.toLowerCase();
  let hfSuccess = false;
  let toxicityScore = 0;
  let hfDetails = [];
  
  // Try Hugging Face API first
  if (hf) {
    try {
      const result = await hf.textClassification({
        model: MODELS.textClassification,
        inputs: text.substring(0, 512),
      });
      
      hfDetails = result;
      hfSuccess = true;
      
      // Find toxic/offensive score
      const toxicLabels = ['toxic', 'obscene', 'insult', 'threat', 'identity_hate', 'severe_toxic', 'hate'];
      for (const item of result) {
        const label = item.label.toLowerCase();
        if (toxicLabels.some(l => label.includes(l))) {
          toxicityScore = Math.max(toxicityScore, item.score);
        }
      }
      console.log('HF text classification success, toxicity:', toxicityScore);
    } catch (error) {
      console.error('Hugging Face text API error:', error.message);
    }
  }
  
  // Always do keyword analysis (supplements HF or provides fallback)
  let violenceScore = 0;
  let adultScore = 0;
  let drugScore = 0;
  let disturbingScore = 0;
  let profanityScore = 0;
  
  // Count keyword matches
  const violenceMatches = VIOLENCE_TEXT_KEYWORDS.filter(k => lowerText.includes(k));
  const adultMatches = ADULT_TEXT_KEYWORDS.filter(k => lowerText.includes(k));
  const drugMatches = DRUG_TEXT_KEYWORDS.filter(k => lowerText.includes(k));
  const disturbingMatches = DISTURBING_TEXT_KEYWORDS.filter(k => lowerText.includes(k));
  const profanityMatches = PROFANITY_KEYWORDS.filter(k => lowerText.includes(k));
  
  // Calculate scores based on keyword density
  const words = lowerText.split(/\s+/).length;
  violenceScore = Math.min(0.95, (violenceMatches.length * 0.15) + (violenceMatches.length > 2 ? 0.3 : 0));
  adultScore = Math.min(0.95, (adultMatches.length * 0.2) + (adultMatches.length > 1 ? 0.3 : 0));
  drugScore = Math.min(0.95, (drugMatches.length * 0.15) + (drugMatches.length > 1 ? 0.2 : 0));
  disturbingScore = Math.min(0.95, (disturbingMatches.length * 0.15) + (disturbingMatches.length > 1 ? 0.2 : 0));
  profanityScore = Math.min(0.95, (profanityMatches.length * 0.2) + (profanityMatches.length > 1 ? 0.3 : 0));
  
  // Combine with HF toxicity
  const finalToxicity = Math.max(toxicityScore, profanityScore);
  
  console.log('Text analysis results:', {
    violence: violenceScore,
    adult: adultScore,
    drugs: drugScore,
    disturbing: disturbingScore,
    profanity: profanityScore,
    hfToxicity: toxicityScore,
    violenceMatches: violenceMatches.slice(0, 5),
    method: hfSuccess ? 'huggingface+keywords' : 'keywords'
  });
  
  return { 
    toxicityScore: finalToxicity, 
    violenceScore,
    adultScore,
    drugScore,
    disturbingScore,
    details: hfDetails,
    matches: {
      violence: violenceMatches,
      adult: adultMatches,
      drugs: drugMatches,
      disturbing: disturbingMatches
    },
    method: hfSuccess ? 'huggingface+keywords' : 'keywords'
  };
}

/**
 * Main function to analyze video content using ML models
 * @param {string} videoPath - Path to video file
 * @param {Object} metadata - Video metadata (title, description, tags)
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Object>} - Complete sensitivity analysis
 */
async function analyzeVideoContent(videoPath, metadata = {}, progressCallback = null) {
  console.log(`Starting ML analysis for video: ${videoPath}`);
  
  const results = {
    violence: { score: 0, confidence: 0, detections: [] },
    adult: { score: 0, confidence: 0, detections: [] },
    language: { score: 0, confidence: 0, detections: [] },
    drugs: { score: 0, confidence: 0, detections: [] },
    disturbing: { score: 0, confidence: 0, detections: [] },
    overallScore: 0,
    rating: 'G',
    analysisDetails: {
      framesAnalyzed: 0,
      textAnalyzed: false,
      modelUsed: 'Hugging Face Inference API',
      timestamp: new Date().toISOString()
    }
  };
  
  try {
    // Step 1: Extract frames from video
    if (progressCallback) progressCallback(10, 'Extracting video frames...');
    console.log('Extracting frames...');
    
    let frames = [];
    try {
      frames = await extractFrames(videoPath, 8); // Extract 8 frames
      console.log(`Extracted ${frames.length} frames for analysis`);
    } catch (error) {
      console.error('Frame extraction failed:', error.message);
      // Continue with text analysis only
    }
    
    results.analysisDetails.framesAnalyzed = frames.length;
    
    // Step 2: Analyze each frame
    if (frames.length > 0) {
      const frameResults = {
        nsfwScores: [],
        violenceScores: [],
        drugScores: [],
        disturbingScores: [],
        allLabels: []
      };
      
      for (let i = 0; i < frames.length; i++) {
        if (progressCallback) {
          progressCallback(20 + (i / frames.length) * 50, `Analyzing frame ${i + 1}/${frames.length}...`);
        }
        
        const frameBuffer = readImageAsBuffer(frames[i]);
        
        // Run NSFW and content analysis in parallel
        const [nsfwResult, contentResult] = await Promise.all([
          analyzeFrameForNSFW(frameBuffer),
          analyzeFrameContent(frameBuffer)
        ]);
        
        frameResults.nsfwScores.push(nsfwResult.nsfwScore);
        frameResults.violenceScores.push(contentResult.violenceScore);
        frameResults.drugScores.push(contentResult.drugScore);
        frameResults.disturbingScores.push(contentResult.disturbingScore);
        
        if (contentResult.topLabels) {
          frameResults.allLabels.push(...contentResult.topLabels);
        }
        
        // Log significant detections
        if (nsfwResult.nsfwScore > 0.3) {
          results.adult.detections.push({ frame: i + 1, score: nsfwResult.nsfwScore });
        }
        if (contentResult.violenceScore > 0.3) {
          results.violence.detections.push({ frame: i + 1, score: contentResult.violenceScore });
        }
        if (contentResult.drugScore > 0.3) {
          results.drugs.detections.push({ frame: i + 1, score: contentResult.drugScore });
        }
        if (contentResult.disturbingScore > 0.3) {
          results.disturbing.detections.push({ frame: i + 1, score: contentResult.disturbingScore });
        }
      }
      
      // Calculate average scores from frames
      const avgNsfw = frameResults.nsfwScores.reduce((a, b) => a + b, 0) / frameResults.nsfwScores.length;
      const maxNsfw = Math.max(...frameResults.nsfwScores);
      results.adult.score = Math.round((avgNsfw * 0.6 + maxNsfw * 0.4) * 100);
      results.adult.confidence = frameResults.nsfwScores.length > 0 ? 0.85 : 0;
      
      const avgViolence = frameResults.violenceScores.reduce((a, b) => a + b, 0) / frameResults.violenceScores.length;
      const maxViolence = Math.max(...frameResults.violenceScores);
      results.violence.score = Math.round((avgViolence * 0.6 + maxViolence * 0.4) * 100);
      results.violence.confidence = frameResults.violenceScores.length > 0 ? 0.80 : 0;
      
      const avgDrugs = frameResults.drugScores.reduce((a, b) => a + b, 0) / frameResults.drugScores.length;
      const maxDrugs = Math.max(...frameResults.drugScores);
      results.drugs.score = Math.round((avgDrugs * 0.6 + maxDrugs * 0.4) * 100);
      results.drugs.confidence = frameResults.drugScores.length > 0 ? 0.75 : 0;
      
      const avgDisturbing = frameResults.disturbingScores.reduce((a, b) => a + b, 0) / frameResults.disturbingScores.length;
      const maxDisturbing = Math.max(...frameResults.disturbingScores);
      results.disturbing.score = Math.round((avgDisturbing * 0.6 + maxDisturbing * 0.4) * 100);
      results.disturbing.confidence = frameResults.disturbingScores.length > 0 ? 0.75 : 0;
      
      // Store top detected labels
      results.analysisDetails.topDetectedLabels = frameResults.allLabels
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(l => ({ label: l.label, score: Math.round(l.score * 100) }));
      
      // Clean up extracted frames
      frames.forEach(f => {
        try { fs.unlinkSync(f); } catch (e) {}
      });
      try {
        const tempDir = path.dirname(frames[0]);
        fs.rmdirSync(tempDir);
      } catch (e) {}
    }
    
    // Step 3: Analyze text content (title, description, tags)
    if (progressCallback) progressCallback(75, 'Analyzing text content...');
    
    const textToAnalyze = [
      metadata.title || '',
      metadata.description || '',
      ...(metadata.tags || [])
    ].join(' ').trim();
    
    if (textToAnalyze.length > 0) {
      const textResult = await analyzeText(textToAnalyze);
      results.language.score = Math.round(textResult.toxicityScore * 100);
      results.language.confidence = 0.80;
      results.analysisDetails.textAnalyzed = true;
      
      if (textResult.toxicityScore > 0.3) {
        results.language.detections.push({ 
          text: textToAnalyze.substring(0, 100), 
          score: textResult.toxicityScore 
        });
      }
    }
    
    // Step 4: Calculate overall sensitivity score
    if (progressCallback) progressCallback(90, 'Calculating final scores...');
    
    const weightedScore = 
      results.violence.score * SENSITIVITY_CATEGORIES.violence.weight +
      results.adult.score * SENSITIVITY_CATEGORIES.adult.weight +
      results.language.score * SENSITIVITY_CATEGORIES.language.weight +
      results.drugs.score * SENSITIVITY_CATEGORIES.drugs.weight +
      results.disturbing.score * SENSITIVITY_CATEGORIES.disturbing.weight;
    
    results.overallScore = Math.round(weightedScore);
    
    // Determine content rating
    if (results.adult.score > 50 || results.overallScore > 70) {
      results.rating = 'R';
    } else if (results.violence.score > 40 || results.drugs.score > 40 || results.overallScore > 50) {
      results.rating = 'PG-13';
    } else if (results.overallScore > 25) {
      results.rating = 'PG';
    } else {
      results.rating = 'G';
    }
    
    if (progressCallback) progressCallback(100, 'Analysis complete!');
    
    console.log('ML Analysis Results:', {
      overallScore: results.overallScore,
      rating: results.rating,
      violence: results.violence.score,
      adult: results.adult.score,
      language: results.language.score,
      drugs: results.drugs.score,
      disturbing: results.disturbing.score
    });
    
    return results;
    
  } catch (error) {
    console.error('Error in ML video analysis:', error);
    
    // Return default low-sensitivity scores on error
    return {
      ...results,
      analysisDetails: {
        ...results.analysisDetails,
        error: error.message,
        fallback: true
      }
    };
  }
}

/**
 * Fetch image from URL and return as buffer
 * @param {string} imageUrl - URL of the image to fetch
 * @returns {Promise<Buffer>} - Image buffer
 */
async function fetchImageFromUrl(imageUrl) {
  return new Promise((resolve, reject) => {
    const protocol = imageUrl.startsWith('https') ? https : http;
    
    protocol.get(imageUrl, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return fetchImageFromUrl(response.headers.location).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch image: ${response.statusCode}`));
        return;
      }
      
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Extract YouTube video ID from URL
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null
 */
function extractYouTubeVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Get YouTube thumbnail URL
 * @param {string} videoId - YouTube video ID
 * @returns {string} - Thumbnail URL
 */
function getYouTubeThumbnailUrl(videoId) {
  // Try maxresdefault first, fallback to hqdefault
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Analyze thumbnail image from URL
 * @param {string} thumbnailUrl - URL of the thumbnail
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeThumbnailFromUrl(thumbnailUrl) {
  try {
    console.log(`Fetching thumbnail from: ${thumbnailUrl}`);
    const imageBuffer = await fetchImageFromUrl(thumbnailUrl);
    console.log(`Thumbnail fetched, size: ${imageBuffer.length} bytes`);
    
    // Run both NSFW and content analysis
    const [nsfwResult, contentResult] = await Promise.all([
      analyzeFrameForNSFW(imageBuffer),
      analyzeFrameContent(imageBuffer)
    ]);
    
    return {
      nsfwScore: nsfwResult.nsfwScore,
      violenceScore: contentResult.violenceScore,
      drugScore: contentResult.drugScore,
      disturbingScore: contentResult.disturbingScore,
      topLabels: contentResult.topLabels,
      success: true
    };
  } catch (error) {
    console.error('Error analyzing thumbnail:', error.message);
    return {
      nsfwScore: 0,
      violenceScore: 0,
      drugScore: 0,
      disturbingScore: 0,
      topLabels: [],
      success: false,
      error: error.message
    };
  }
}

/**
 * Enhanced analysis for URL-imported videos (metadata + thumbnail)
 * @param {Object} metadata - Video metadata (title, description, tags, url)
 * @returns {Promise<Object>} - Sensitivity analysis based on metadata and thumbnail
 */
async function analyzeMetadataOnly(metadata) {
  console.log('Performing enhanced metadata + thumbnail analysis...');
  
  const results = {
    violence: { score: 0, confidence: 0.5, detections: [] },
    adult: { score: 0, confidence: 0.5, detections: [] },
    language: { score: 0, confidence: 0, detections: [] },
    drugs: { score: 0, confidence: 0.5, detections: [] },
    disturbing: { score: 0, confidence: 0.5, detections: [] },
    overallScore: 0,
    rating: 'G',
    analysisDetails: {
      framesAnalyzed: 0,
      thumbnailAnalyzed: false,
      textAnalyzed: true,
      modelUsed: 'Hugging Face Inference API',
      timestamp: new Date().toISOString(),
      metadataOnly: true
    }
  };
  
  // Check if this is a YouTube URL and try to analyze thumbnail
  const url = metadata.url || metadata.description || '';
  const youtubeVideoId = extractYouTubeVideoId(url);
  
  if (youtubeVideoId) {
    console.log(`Detected YouTube video ID: ${youtubeVideoId}`);
    const thumbnailUrl = getYouTubeThumbnailUrl(youtubeVideoId);
    
    try {
      const thumbnailResult = await analyzeThumbnailFromUrl(thumbnailUrl);
      
      if (thumbnailResult.success) {
        results.analysisDetails.thumbnailAnalyzed = true;
        results.analysisDetails.framesAnalyzed = 1;
        results.analysisDetails.modelUsed = 'Hugging Face Inference API (Thumbnail + Text)';
        
        // Apply thumbnail analysis results
        results.adult.score = Math.round(thumbnailResult.nsfwScore * 100);
        results.adult.confidence = 0.85;
        
        results.violence.score = Math.round(thumbnailResult.violenceScore * 100);
        results.violence.confidence = 0.80;
        
        results.drugs.score = Math.round(thumbnailResult.drugScore * 100);
        results.drugs.confidence = 0.75;
        
        results.disturbing.score = Math.round(thumbnailResult.disturbingScore * 100);
        results.disturbing.confidence = 0.75;
        
        if (thumbnailResult.topLabels && thumbnailResult.topLabels.length > 0) {
          results.analysisDetails.topDetectedLabels = thumbnailResult.topLabels.map(l => ({
            label: l.label,
            score: Math.round(l.score * 100)
          }));
        }
        
        console.log('Thumbnail analysis results:', {
          adult: results.adult.score,
          violence: results.violence.score,
          drugs: results.drugs.score,
          disturbing: results.disturbing.score
        });
      }
    } catch (error) {
      console.error('Thumbnail analysis failed:', error.message);
    }
  }
  
  // Analyze text content - this now returns per-category scores
  const textToAnalyze = [
    metadata.title || '',
    metadata.description || '',
    ...(metadata.tags || [])
  ].join(' ').trim();
  
  if (textToAnalyze.length > 0) {
    try {
      const textResult = await analyzeText(textToAnalyze);
      
      // Apply text analysis scores (takes the max of thumbnail + text)
      results.language.score = Math.max(results.language.score, Math.round(textResult.toxicityScore * 100));
      results.language.confidence = 0.80;
      
      // Combine text-based category detection with thumbnail results
      results.violence.score = Math.max(results.violence.score, Math.round(textResult.violenceScore * 100));
      results.adult.score = Math.max(results.adult.score, Math.round(textResult.adultScore * 100));
      results.drugs.score = Math.max(results.drugs.score, Math.round(textResult.drugScore * 100));
      results.disturbing.score = Math.max(results.disturbing.score, Math.round(textResult.disturbingScore * 100));
      
      // Store keyword matches for debugging
      if (textResult.matches) {
        if (textResult.matches.violence.length > 0) {
          results.violence.detections.push({ keywords: textResult.matches.violence.slice(0, 5) });
        }
        if (textResult.matches.adult.length > 0) {
          results.adult.detections.push({ keywords: textResult.matches.adult.slice(0, 5) });
        }
        if (textResult.matches.drugs.length > 0) {
          results.drugs.detections.push({ keywords: textResult.matches.drugs.slice(0, 5) });
        }
        if (textResult.matches.disturbing.length > 0) {
          results.disturbing.detections.push({ keywords: textResult.matches.disturbing.slice(0, 5) });
        }
      }
      
      results.analysisDetails.textMethod = textResult.method;
    } catch (error) {
      console.error('Text analysis error:', error.message);
    }
  }
  
  // Calculate overall score
  results.overallScore = Math.round(
    results.violence.score * 0.25 +
    results.adult.score * 0.25 +
    results.language.score * 0.20 +
    results.drugs.score * 0.15 +
    results.disturbing.score * 0.15
  );
  
  // Determine rating
  if (results.adult.score > 50 || results.overallScore > 70) {
    results.rating = 'R';
  } else if (results.violence.score > 40 || results.drugs.score > 40 || results.overallScore > 50) {
    results.rating = 'PG-13';
  } else if (results.overallScore > 25) {
    results.rating = 'PG';
  } else {
    results.rating = 'G';
  }
  
  console.log('Final metadata analysis results:', {
    overallScore: results.overallScore,
    rating: results.rating,
    thumbnailAnalyzed: results.analysisDetails.thumbnailAnalyzed
  });
  
  return results;
}

module.exports = {
  analyzeVideoContent,
  analyzeMetadataOnly,
  extractFrames,
  analyzeFrameForNSFW,
  analyzeFrameContent,
  analyzeText,
  analyzeThumbnailFromUrl,
  fetchImageFromUrl
};
