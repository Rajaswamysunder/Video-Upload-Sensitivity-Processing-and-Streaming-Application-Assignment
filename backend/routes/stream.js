const express = require('express');
const router = express.Router();
const { streamVideo, getThumbnail } = require('../controllers/streamController');
const { protect } = require('../middleware/auth');

// Stream routes - support token in query string for video element
router.get('/:id', protect, streamVideo);
router.get('/:id/thumbnail', protect, getThumbnail);

module.exports = router;
