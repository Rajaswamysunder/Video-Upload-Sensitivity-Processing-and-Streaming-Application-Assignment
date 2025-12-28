import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import adminService from '../services/adminService';
import { toast } from 'react-toastify';
import { 
  FiUsers, 
  FiVideo, 
  FiEye, 
  FiAlertTriangle, 
  FiCheck, 
  FiX,
  FiShield,
  FiTrendingUp,
  FiChevronLeft,
  FiChevronRight,
  FiSettings,
  FiTrash2,
  FiMail,
  FiCheckCircle
} from 'react-icons/fi';

const AdminPanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [userPagination, setUserPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });
  const [videoPagination, setVideoPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'videos') {
      fetchVideos();
    }
  }, [activeTab, userPagination.page, videoPagination.page]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await adminService.getStats();
      setStats(response.stats);
    } catch (error) {
      toast.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminService.getUsers({ 
        page: userPagination.page, 
        limit: 10 
      });
      setUsers(response.users);
      setUserPagination({
        page: response.currentPage,
        totalPages: response.totalPages,
        total: response.total
      });
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await adminService.getVideos({ 
        page: videoPagination.page, 
        limit: 10 
      });
      setVideos(response.videos);
      setVideoPagination({
        page: response.currentPage,
        totalPages: response.totalPages,
        total: response.total
      });
    } catch (error) {
      toast.error('Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminService.updateUserRole(userId, newRole);
      setUsers(prev => 
        prev.map(u => u._id === userId ? { ...u, role: newRole } : u)
      );
      toast.success('Role updated successfully');
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const response = await adminService.toggleUserStatus(userId);
      setUsers(prev => 
        prev.map(u => u._id === userId ? { ...u, isActive: response.user.isActive } : u)
      );
      toast.success('User status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const response = await adminService.deleteUser(userId);
      setUsers(prev => prev.filter(u => u._id !== userId));
      setDeleteConfirm(null);
      toast.success(response.message);
      // Refresh stats
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleDeleteVideo = async (videoId) => {
    try {
      const response = await adminService.deleteVideo(videoId);
      setVideos(prev => prev.filter(v => v._id !== videoId));
      setDeleteConfirm(null);
      toast.success(response.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete video');
    }
  };

  const getUserCountByRole = (role) => {
    if (!stats?.users) return 0;
    const roleStats = stats.users.find(s => s._id === role);
    return roleStats?.count || 0;
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FiTrendingUp },
    { id: 'users', label: 'User Management', icon: FiUsers },
    { id: 'videos', label: 'Video Management', icon: FiVideo }
  ];

  const getTabClass = (tabId) => {
    if (activeTab === tabId) {
      return 'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition bg-indigo-500 text-white';
    }
    return 'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition text-gray-400 hover:text-white hover:bg-white/10';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="w-10 h-10 stats-gradient-4 rounded-xl flex items-center justify-center">
            <FiShield className="w-5 h-5 text-white" />
          </span>
          Admin Panel
        </h1>
        <p className="text-gray-400 mt-2">Manage users, videos, and system settings</p>
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl p-1.5 inline-flex mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={getTabClass(tab.id)}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass rounded-2xl p-6 card-hover relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 stats-gradient-1 opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 stats-gradient-1 rounded-xl flex items-center justify-center">
                        <FiUsers className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                        <FiTrendingUp className="w-3 h-3" /> Active
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">
                      {getUserCountByRole('viewer') + getUserCountByRole('editor') + getUserCountByRole('admin')}
                    </p>
                    <p className="text-sm text-gray-400">Total Users</p>
                  </div>
                </div>

                <div className="glass rounded-2xl p-6 card-hover relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 stats-gradient-3 opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 stats-gradient-3 rounded-xl flex items-center justify-center">
                        <FiVideo className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{stats.videos?.total || 0}</p>
                    <p className="text-sm text-gray-400">Total Videos</p>
                  </div>
                </div>

                <div className="glass rounded-2xl p-6 card-hover relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 stats-gradient-2 opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 stats-gradient-2 rounded-xl flex items-center justify-center">
                        <FiEye className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{stats.videos?.totalViews || 0}</p>
                    <p className="text-sm text-gray-400">Total Views</p>
                  </div>
                </div>

                <div className="glass rounded-2xl p-6 card-hover relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 stats-gradient-4 opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 stats-gradient-4 rounded-xl flex items-center justify-center">
                        <FiAlertTriangle className="w-6 h-6 text-white" />
                      </div>
                      {(stats.videos?.flagged || 0) > 0 && (
                        <span className="text-xs font-medium text-red-400">Review needed</span>
                      )}
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{stats.videos?.flagged || 0}</p>
                    <p className="text-sm text-gray-400">Flagged Videos</p>
                  </div>
                </div>
              </div>

              {/* User Role Distribution */}
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                  User Role Distribution
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass text-center p-6 rounded-xl">
                    <p className="text-4xl font-bold text-indigo-400 mb-2">{getUserCountByRole('viewer')}</p>
                    <p className="text-gray-400">Viewers</p>
                  </div>
                  <div className="glass text-center p-6 rounded-xl">
                    <p className="text-4xl font-bold text-purple-400 mb-2">{getUserCountByRole('editor')}</p>
                    <p className="text-gray-400">Editors</p>
                  </div>
                  <div className="glass text-center p-6 rounded-xl">
                    <p className="text-4xl font-bold text-emerald-400 mb-2">{getUserCountByRole('admin')}</p>
                    <p className="text-gray-400">Admins</p>
                  </div>
                </div>
              </div>

              {/* Video Processing Stats */}
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Video Processing Status
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass text-center p-5 rounded-xl border border-yellow-500/20">
                    <p className="text-2xl font-bold text-yellow-400 mb-1">{stats.videos?.pending || 0}</p>
                    <p className="text-sm text-gray-400">Pending</p>
                  </div>
                  <div className="glass text-center p-5 rounded-xl border border-blue-500/20">
                    <p className="text-2xl font-bold text-blue-400 mb-1">{stats.videos?.processing || 0}</p>
                    <p className="text-sm text-gray-400">Processing</p>
                  </div>
                  <div className="glass text-center p-5 rounded-xl border border-emerald-500/20">
                    <p className="text-2xl font-bold text-emerald-400 mb-1">{stats.videos?.completed || 0}</p>
                    <p className="text-sm text-gray-400">Completed</p>
                  </div>
                  <div className="glass text-center p-5 rounded-xl border border-green-500/20">
                    <p className="text-2xl font-bold text-green-400 mb-1">{stats.videos?.safe || 0}</p>
                    <p className="text-sm text-gray-400">Safe</p>
                  </div>
                </div>
              </div>

              {/* Recent Videos */}
              {stats.recentVideos && stats.recentVideos.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Recent Uploads
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b border-white/10">
                          <th className="pb-4 text-sm font-medium text-gray-400">Title</th>
                          <th className="pb-4 text-sm font-medium text-gray-400">Owner</th>
                          <th className="pb-4 text-sm font-medium text-gray-400">Status</th>
                          <th className="pb-4 text-sm font-medium text-gray-400">Sensitivity</th>
                          <th className="pb-4 text-sm font-medium text-gray-400">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentVideos.map((video) => (
                          <tr key={video._id} className="border-b border-white/5 hover:bg-white/5 transition">
                            <td className="py-4 text-white font-medium">{video.title}</td>
                            <td className="py-4 text-gray-400">{video.owner?.username}</td>
                            <td className="py-4">
                              <span className={
                                video.processingStatus === 'completed' ? 'badge-safe' :
                                video.processingStatus === 'processing' ? 'badge-processing' :
                                'badge-pending'
                              }>
                                {video.processingStatus}
                              </span>
                            </td>
                            <td className="py-4">
                              <span className={
                                video.sensitivityStatus === 'safe' ? 'badge-safe' :
                                video.sensitivityStatus === 'flagged' ? 'badge-flagged' :
                                'badge-pending'
                              }>
                                {video.sensitivityStatus}
                              </span>
                            </td>
                            <td className="py-4 text-gray-400">
                              {new Date(video.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-white/10 bg-white/5">
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Username</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Email</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Role</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Joined</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 stats-gradient-1 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {u.username?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-white">{u.username}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{u.email}</td>
                        <td className="px-6 py-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                            disabled={u._id === user.id}
                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="viewer" className="bg-gray-800">Viewer</option>
                            <option value="editor" className="bg-gray-800">Editor</option>
                            <option value="admin" className="bg-gray-800">Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <span className={u.isActive ? 'badge-safe' : 'badge-flagged'}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          {u._id !== user.id && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleStatus(u._id)}
                                className={u.isActive
                                  ? 'p-2.5 rounded-lg transition text-yellow-400 hover:bg-yellow-500/10'
                                  : 'p-2.5 rounded-lg transition text-emerald-400 hover:bg-emerald-500/10'
                                }
                                title={u.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {u.isActive ? <FiX className="w-5 h-5" /> : <FiCheck className="w-5 h-5" />}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ type: 'user', id: u._id, name: u.username })}
                                className="p-2.5 rounded-lg transition text-red-400 hover:bg-red-500/10"
                                title="Delete User"
                              >
                                <FiTrash2 className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {userPagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 p-6 border-t border-white/10">
                  <button
                    onClick={() => setUserPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={userPagination.page === 1}
                    className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-400">
                    Page {userPagination.page} of {userPagination.totalPages}
                  </span>
                  <button
                    onClick={() => setUserPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={userPagination.page === userPagination.totalPages}
                    className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Videos Tab */}
          {activeTab === 'videos' && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-white/10 bg-white/5">
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Title</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Owner</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Views</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Sensitivity</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Uploaded</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map((v) => (
                      <tr key={v._id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-8 bg-white/10 rounded overflow-hidden flex-shrink-0">
                              {v.thumbnail ? (
                                <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FiVideo className="w-4 h-4 text-gray-500" />
                                </div>
                              )}
                            </div>
                            <span className="font-medium text-white truncate max-w-[200px]">{v.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{v.owner?.username || 'Unknown'}</td>
                        <td className="px-6 py-4 text-gray-400">{v.views || 0}</td>
                        <td className="px-6 py-4">
                          <span className={
                            v.processingStatus === 'completed' ? 'badge-safe' :
                            v.processingStatus === 'processing' ? 'badge-processing' :
                            v.processingStatus === 'failed' ? 'badge-flagged' :
                            'badge-pending'
                          }>
                            {v.processingStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={
                            v.sensitivityStatus === 'safe' ? 'badge-safe' :
                            v.sensitivityStatus === 'flagged' ? 'badge-flagged' :
                            'badge-pending'
                          }>
                            {v.sensitivityStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setDeleteConfirm({ type: 'video', id: v._id, name: v.title })}
                            className="p-2.5 rounded-lg transition text-red-400 hover:bg-red-500/10"
                            title="Delete Video"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {videos.length === 0 && (
                <div className="text-center py-12">
                  <FiVideo className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No videos found</p>
                </div>
              )}

              {/* Pagination */}
              {videoPagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 p-6 border-t border-white/10">
                  <button
                    onClick={() => setVideoPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={videoPagination.page === 1}
                    className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-400">
                    Page {videoPagination.page} of {videoPagination.totalPages}
                  </span>
                  <button
                    onClick={() => setVideoPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={videoPagination.page === videoPagination.totalPages}
                    className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 max-w-md w-full">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiTrash2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white text-center mb-2">
              Delete {deleteConfirm.type === 'user' ? 'User' : 'Video'}?
            </h3>
            <p className="text-gray-400 text-center mb-6">
              Are you sure you want to delete <strong className="text-white">"{deleteConfirm.name}"</strong>?
              {deleteConfirm.type === 'user' && ' This will also delete all their videos.'}
              {' '}This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 glass rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirm.type === 'user' 
                  ? handleDeleteUser(deleteConfirm.id) 
                  : handleDeleteVideo(deleteConfirm.id)
                }
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
