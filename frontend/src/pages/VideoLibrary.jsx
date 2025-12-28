import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import videoService from '../services/videoService';
import VideoCard from '../components/VideoCard';
import { toast } from 'react-toastify';
import { 
  FiSearch, 
  FiFilter, 
  FiGrid, 
  FiList,
  FiVideo,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiUploadCloud
} from 'react-icons/fi';

const VideoLibrary = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    sensitivity: '',
    visibility: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  useEffect(() => {
    fetchVideos();
  }, [pagination.page, filters]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: 12,
        ...filters
      };
      
      if (search) {
        params.search = search;
      }

      const response = await videoService.getVideos(params);
      setVideos(response.videos || []);
      setPagination({
        page: response.currentPage || 1,
        totalPages: response.totalPages || 1,
        total: response.total || 0
      });
    } catch (error) {
      toast.error('Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchVideos();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleWatch = (id) => {
    navigate('/watch/' + id);
  };

  const handleEdit = (video) => {
    toast.info('Edit functionality coming soon');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        await videoService.deleteVideo(id);
        toast.success('Video deleted successfully');
        fetchVideos();
      } catch (error) {
        toast.error('Failed to delete video');
      }
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="w-10 h-10 stats-gradient-3 rounded-xl flex items-center justify-center">
              <FiVideo className="w-5 h-5 text-white" />
            </span>
            Video Library
          </h1>
          <p className="text-gray-400 mt-2">{pagination.total} videos in your library</p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center gap-2"
          >
            <FiUploadCloud className="w-5 h-5" />
            Upload
          </button>
          <button
            onClick={fetchVideos}
            className="p-3 glass rounded-xl text-gray-400 hover:text-white transition"
            title="Refresh"
          >
            <FiRefreshCw className={loading ? 'w-5 h-5 animate-spin' : 'w-5 h-5'} />
          </button>
          <div className="glass rounded-xl p-1 flex">
            <button
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'p-2.5 rounded-lg transition bg-indigo-500 text-white' : 'p-2.5 rounded-lg transition text-gray-400 hover:text-white'}
            >
              <FiGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'p-2.5 rounded-lg transition bg-indigo-500 text-white' : 'p-2.5 rounded-lg transition text-gray-400 hover:text-white'}
            >
              <FiList className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass rounded-2xl p-4 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search videos..."
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white placeholder:text-gray-500 transition"
              />
            </div>
          </form>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="appearance-none px-4 py-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none cursor-pointer"
              >
                <option value="" className="bg-gray-800">All Status</option>
                <option value="pending" className="bg-gray-800">Pending</option>
                <option value="processing" className="bg-gray-800">Processing</option>
                <option value="completed" className="bg-gray-800">Completed</option>
              </select>
              <FiFilter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={filters.sensitivity}
                onChange={(e) => handleFilterChange('sensitivity', e.target.value)}
                className="appearance-none px-4 py-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none cursor-pointer"
              >
                <option value="" className="bg-gray-800">All Sensitivity</option>
                <option value="safe" className="bg-gray-800">Safe</option>
                <option value="flagged" className="bg-gray-800">Flagged</option>
                <option value="pending" className="bg-gray-800">Pending</option>
              </select>
              <FiFilter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={filters.visibility}
                onChange={(e) => handleFilterChange('visibility', e.target.value)}
                className="appearance-none px-4 py-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none cursor-pointer"
              >
                <option value="" className="bg-gray-800">All Visibility</option>
                <option value="public" className="bg-gray-800">Public</option>
                <option value="private" className="bg-gray-800">Private</option>
                <option value="restricted" className="bg-gray-800">Restricted</option>
              </select>
              <FiFilter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading videos...</p>
          </div>
        </div>
      ) : videos.length === 0 ? (
        /* Empty State */
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-20 h-20 stats-gradient-2 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FiVideo className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No videos found</h3>
          <p className="text-gray-400 mb-6">Upload your first video or adjust your filters</p>
          <button
            onClick={() => navigate('/upload')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 transition"
          >
            Upload Video
          </button>
        </div>
      ) : (
        <>
          {/* Video Grid/List */}
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {videos.map((video) => (
              <VideoCard
                key={video._id}
                video={video}
                viewMode={viewMode}
                onWatch={() => handleWatch(video._id)}
                onEdit={() => handleEdit(video)}
                onDelete={() => handleDelete(video._id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <FiChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                      className={pagination.page === pageNum
                        ? 'w-10 h-10 rounded-xl font-medium transition bg-indigo-500 text-white'
                        : 'w-10 h-10 rounded-xl font-medium transition glass text-gray-400 hover:text-white hover:bg-white/10'
                      }
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VideoLibrary;
