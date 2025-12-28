const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  updateUserRole,
  toggleUserStatus,
  getDashboardStats,
  deleteUser,
  getAllVideos,
  deleteVideo
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);

router.route('/users')
  .get(getUsers);

router.route('/users/:id')
  .get(getUser)
  .delete(deleteUser);

router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/status', toggleUserStatus);

// Video management
router.route('/videos')
  .get(getAllVideos);

router.route('/videos/:id')
  .delete(deleteVideo);

module.exports = router;
