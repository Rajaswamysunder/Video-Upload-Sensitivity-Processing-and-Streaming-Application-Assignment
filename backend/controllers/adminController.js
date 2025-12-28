const User = require('../models/User');
const Video = require('../models/Video');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;

    const query = {};

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's video stats
    const videoStats = await Video.aggregate([
      { $match: { owner: user._id } },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: '$views' },
          safeVideos: {
            $sum: { $cond: [{ $eq: ['$sensitivityStatus', 'safe'] }, 1, 0] }
          },
          flaggedVideos: {
            $sum: { $cond: [{ $eq: ['$sensitivityStatus', 'flagged'] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      user,
      stats: videoStats[0] || {
        totalVideos: 0,
        totalViews: 0,
        safeVideos: 0,
        flaggedVideos: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin)
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['viewer', 'editor', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [userStats, videoStats, recentVideos] = await Promise.all([
      // User stats
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]),
      // Video stats
      Video.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalViews: { $sum: '$views' },
            pending: {
              $sum: { $cond: [{ $eq: ['$processingStatus', 'pending'] }, 1, 0] }
            },
            processing: {
              $sum: { $cond: [{ $eq: ['$processingStatus', 'processing'] }, 1, 0] }
            },
            completed: {
              $sum: { $cond: [{ $eq: ['$processingStatus', 'completed'] }, 1, 0] }
            },
            safe: {
              $sum: { $cond: [{ $eq: ['$sensitivityStatus', 'safe'] }, 1, 0] }
            },
            flagged: {
              $sum: { $cond: [{ $eq: ['$sensitivityStatus', 'flagged'] }, 1, 0] }
            }
          }
        }
      ]),
      // Recent videos
      Video.find()
        .populate('owner', 'username')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title processingStatus sensitivityStatus createdAt')
    ]);

    res.status(200).json({
      success: true,
      stats: {
        users: userStats,
        videos: videoStats[0] || {},
        recentVideos
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user and all their videos
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res, next) => {
  try {
    const userToDelete = await User.findById(req.params.id);

    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self-deletion
    if (userToDelete._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Delete all videos owned by this user
    const deletedVideos = await Video.deleteMany({ owner: userToDelete._id });

    // Delete the user
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `User "${userToDelete.username}" and ${deletedVideos.deletedCount} videos deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all videos (admin)
// @route   GET /api/admin/videos
// @access  Private (Admin)
exports.getAllVideos = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, sensitivity } = req.query;

    const query = {};
    if (status) query.processingStatus = status;
    if (sensitivity) query.sensitivityStatus = sensitivity;

    const total = await Video.countDocuments(query);
    const videos = await Video.find(query)
      .populate('owner', 'username email')
      .sort({ createdAt: -1 })
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

// @desc    Delete video (admin)
// @route   DELETE /api/admin/videos/:id
// @access  Private (Admin)
exports.deleteVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    await Video.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Video "${video.title}" deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};
