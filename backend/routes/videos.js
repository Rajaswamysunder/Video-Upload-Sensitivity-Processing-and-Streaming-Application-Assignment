const express = require('express');
const router = express.Router();
const {
  uploadVideo,
  getVideos,
  getVideo,
  updateVideo,
  deleteVideo,
  getVideoStatus,
  analyzeUrl,
  importFromUrl,
  searchVideos,
  toggleLike,
  reanalyzeVideo
} = require('../controllers/videoController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../config/multer');

// All routes require authentication
router.use(protect);

// Search videos
router.get('/search', searchVideos);

// Analyze and import from URL
router.post('/analyze-url', analyzeUrl);
router.post('/import-url', importFromUrl);

// Video CRUD operations
router.route('/')
  .get(getVideos);

router.route('/upload')
  .post(upload.single('video'), uploadVideo);

router.route('/:id')
  .get(getVideo)
  .put(updateVideo)
  .delete(deleteVideo);

router.get('/:id/status', getVideoStatus);
router.post('/:id/like', toggleLike);
router.post('/:id/reanalyze', authorize('admin'), reanalyzeVideo);

module.exports = router;
