import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import videoService from '../services/videoService';
import { toast } from 'react-toastify';
import { 
  FiVideo, 
  FiUpload, 
  FiEye, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiClock,
  FiTrendingUp,
  FiPlay,
  FiArrowUpRight
} from 'react-icons/fi';

const Dashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    processing: 0,
    completed: 0,
    flagged: 0
  });
  const [recentVideos, setRecentVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('processingComplete', (data) => {
        toast.success(`Video processing complete: ${data.sensitivityStatus}`);
        fetchDashboardData();
      });

      socket.on('processingUpdate', (data) => {
        setRecentVideos(prev => 
          prev.map(v => 
            v._id === data.videoId 
              ? { ...v, processingProgress: data.progress }
              : v
          )
        );
      });

      return () => {
        socket.off('processingComplete');
        socket.off('processingUpdate');
      };
    }
  }, [socket]);

  const fetchDashboardData = async () => {
    try {
      const response = await videoService.getVideos({ limit: 5 });
      const videos = response.videos;
      
      setRecentVideos(videos);
      
      const allVideos = await videoService.getVideos({ limit: 1000 });
      const allVideosList = allVideos.videos;
      
      setStats({
        total: allVideosList.length,
        processing: allVideosList.filter(v => v.processingStatus === 'processing').length,
        completed: allVideosList.filter(v => v.processingStatus === 'completed').length,
        flagged: allVideosList.filter(v => v.sensitivityStatus === 'flagged').length
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Videos', value: stats.total, icon: FiVideo, gradient: 'stats-gradient-1', change: '+12%' },
    { label: 'Processing', value: stats.processing, icon: FiClock, gradient: 'stats-gradient-2', change: 'Active' },
    { label: 'Completed', value: stats.completed, icon: FiCheckCircle, gradient: 'stats-gradient-3', change: '+8%' },
    { label: 'Flagged', value: stats.flagged, icon: FiAlertTriangle, gradient: 'stats-gradient-4', change: stats.flagged > 0 ? 'Review' : 'Clear' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">👋</span>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{user?.username}</span>!
          </h1>
        </div>
        <p className="text-gray-400">Here's what's happening with your videos today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={stat.label} className="glass rounded-2xl p-6 card-hover relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.gradient} opacity-10 rounded-full blur-2xl -mr-10 -mt-10`}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.gradient} rounded-xl flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                  <FiTrendingUp className="w-3 h-3" />
                  {stat.change}
                </span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {(user?.role === 'editor' || user?.role === 'admin') && (
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Quick Actions
          </h2>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/upload')}
              className="btn-neon flex items-center gap-2 px-6"
            >
              <FiUpload className="w-5 h-5" />
              Upload Video
            </button>
            <button
              onClick={() => navigate('/videos')}
              className="flex items-center gap-2 px-6 py-3 glass rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all"
            >
              <FiVideo className="w-5 h-5" />
              View Library
              <FiArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Recent Videos */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            Recent Videos
          </h2>
          <button
            onClick={() => navigate('/videos')}
            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1 transition"
          >
            View all
            <FiArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {recentVideos.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 glass rounded-full flex items-center justify-center mx-auto mb-4">
              <FiVideo className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No videos yet</h3>
            <p className="text-gray-400 mb-6">Upload your first video to get started!</p>
            {(user?.role === 'editor' || user?.role === 'admin') && (
              <button
                onClick={() => navigate('/upload')}
                className="btn-neon"
              >
                <FiUpload className="w-5 h-5 mr-2 inline" />
                Upload Video
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-white/5">
                  <th className="pb-4 text-sm font-medium text-gray-400">Video</th>
                  <th className="pb-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="pb-4 text-sm font-medium text-gray-400">Sensitivity</th>
                  <th className="pb-4 text-sm font-medium text-gray-400">Views</th>
                  <th className="pb-4 text-sm font-medium text-gray-400">Date</th>
                  <th className="pb-4 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentVideos.map((video) => (
                  <tr key={video._id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                          <FiPlay className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="font-medium text-white">{video.title}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                        video.processingStatus === 'completed' ? 'badge-safe' :
                        video.processingStatus === 'processing' ? 'badge-processing' :
                        video.processingStatus === 'failed' ? 'badge-flagged' :
                        'badge-pending'
                      }`}>
                        {video.processingStatus}
                        {video.processingStatus === 'processing' && ` ${video.processingProgress}%`}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                        video.sensitivityStatus === 'safe' ? 'badge-safe' :
                        video.sensitivityStatus === 'flagged' ? 'badge-flagged' :
                        'glass text-gray-400'
                      }`}>
                        {video.sensitivityStatus}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-1 text-gray-300">
                        <FiEye className="w-4 h-4 text-gray-500" />
                        {video.views}
                      </div>
                    </td>
                    <td className="py-4 text-gray-400">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      {video.processingStatus === 'completed' && (
                        <button
                          onClick={() => navigate(`/watch/${video._id}`)}
                          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition"
                        >
                          <FiPlay className="w-4 h-4" />
                          Watch
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
