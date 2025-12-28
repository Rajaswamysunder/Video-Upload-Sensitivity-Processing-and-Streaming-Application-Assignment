const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');

// @desc    Stream video
// @route   GET /api/stream/:id
// @access  Private
exports.streamVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'viewer') {
      if (video.owner.toString() !== req.user.id && video.visibility !== 'public') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to stream this video'
        });
      }
    }

    // Check if file exists
    const videoPath = path.resolve(video.filepath);
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        success: false,
        message: 'Video file not found'
      });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // Validate range
      if (start >= fileSize) {
        return res.status(416).json({
          success: false,
          message: 'Requested range not satisfiable'
        });
      }

      const file = fs.createReadStream(videoPath, { start, end });

      const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': video.mimetype
      };

      res.writeHead(206, headers);
      file.pipe(res);
    } else {
      // No range requested, send entire file
      const headers = {
        'Content-Length': fileSize,
        'Content-Type': video.mimetype,
        'Accept-Ranges': 'bytes'
      };

      res.writeHead(200, headers);
      fs.createReadStream(videoPath).pipe(res);
    }

    // Increment view count (async, don't wait)
    Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();
  } catch (error) {
    next(error);
  }
};

// @desc    Get video thumbnail
// @route   GET /api/stream/:id/thumbnail
// @access  Private
exports.getThumbnail = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    if (!video.thumbnail || !fs.existsSync(video.thumbnail)) {
      // Return default thumbnail
      return res.status(404).json({
        success: false,
        message: 'Thumbnail not available'
      });
    }

    res.sendFile(path.resolve(video.thumbnail));
  } catch (error) {
    next(error);
  }
};
