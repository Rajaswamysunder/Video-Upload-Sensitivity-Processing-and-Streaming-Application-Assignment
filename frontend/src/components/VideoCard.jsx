import { FiPlay, FiEdit2, FiTrash2, FiEye, FiClock, FiCalendar, FiShield } from 'react-icons/fi';

const VideoCard = ({ video, onWatch, onEdit, onDelete, viewMode = 'grid' }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-pending',
      processing: 'badge-processing',
      completed: 'badge-safe',
      failed: 'badge-flagged',
      safe: 'badge-safe',
      flagged: 'badge-flagged',
      analyzing: 'badge-processing'
    };
    return badges[status] || 'glass text-gray-400';
  };

  const getRatingBadge = (rating) => {
    const colors = {
      'G': 'bg-green-500/20 text-green-400 border-green-500/30',
      'PG': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'PG-13': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'R': 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[rating] || colors['G'];
  };

  if (viewMode === 'list') {
    return (
      <div className="glass rounded-xl p-4 card-hover flex items-center gap-4">
        {/* Thumbnail */}
        <div className="relative w-48 h-28 bg-black/40 rounded-lg overflow-hidden flex-shrink-0 group">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
              <FiPlay className="w-8 h-8 text-gray-400" />
            </div>
          )}
          
          {video.processingStatus === 'processing' && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-1"></div>
                <span className="text-xs">{video.processingProgress || 0}%</span>
              </div>
            </div>
          )}

          {video.processingStatus === 'completed' && (
            <div 
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
              onClick={() => onWatch(video._id)}
            >
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <FiPlay className="w-6 h-6 text-white ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{video.title}</h3>
          
          <div className="flex items-center gap-3 mt-2">
            <span className={`${getStatusBadge(video.processingStatus)}`}>
              {video.processingStatus}
            </span>
            <span className={`${getStatusBadge(video.sensitivityStatus)}`}>
              {video.sensitivityStatus}
            </span>
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <FiEye className="w-3.5 h-3.5" /> {video.views}
            </span>
            <span className="flex items-center gap-1">
              <FiCalendar className="w-3.5 h-3.5" /> {formatDate(video.createdAt)}
            </span>
            <span>{formatFileSize(video.size)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {video.processingStatus === 'completed' && (
            <button
              onClick={() => onWatch(video._id)}
              className="p-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
            >
              <FiPlay className="w-5 h-5" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(video)}
              className="p-2.5 glass text-gray-400 hover:text-white rounded-lg transition"
            >
              <FiEdit2 className="w-5 h-5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(video._id)}
              className="p-2.5 glass text-gray-400 hover:text-red-400 rounded-lg transition"
            >
              <FiTrash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden card-hover group">
      {/* Thumbnail */}
      <div className="relative h-44 bg-black/40">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
            <FiPlay className="w-12 h-12 text-gray-500" />
          </div>
        )}
        
        {/* Processing Progress Overlay */}
        {video.processingStatus === 'processing' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
              <span className="text-sm font-medium">{video.processingProgress || 0}%</span>
            </div>
          </div>
        )}

        {/* Play Overlay */}
        {video.processingStatus === 'completed' && (
          <div 
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
            onClick={() => onWatch(video._id)}
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform">
              <FiPlay className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 text-xs font-medium bg-black/40 backdrop-blur-sm text-white rounded-lg capitalize">
            {video.category}
          </span>
        </div>

        {/* Rating Badge (from ML Analysis) */}
        {video.sensitivityDetails?.rating && (
          <div className="absolute top-3 right-3">
            <span className={`px-2 py-1 text-xs font-bold rounded-lg border ${getRatingBadge(video.sensitivityDetails.rating)}`}>
              {video.sensitivityDetails.rating}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-white truncate mb-3">{video.title}</h3>
        
        {/* Status Badges */}
        <div className="flex gap-2 mb-4">
          <span className={`${getStatusBadge(video.processingStatus)}`}>
            {video.processingStatus}
          </span>
          <span className={`${getStatusBadge(video.sensitivityStatus)}`}>
            {video.sensitivityStatus}
          </span>
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <FiEye className="w-4 h-4" /> {video.views}
          </span>
          <span className="flex items-center gap-1">
            <FiClock className="w-4 h-4" /> {formatDate(video.createdAt)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {video.processingStatus === 'completed' && (
            <button
              onClick={() => onWatch(video._id)}
              className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              <FiPlay className="w-4 h-4" />
              Watch
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(video)}
              className="p-2.5 glass text-gray-400 hover:text-white rounded-lg transition"
            >
              <FiEdit2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(video._id)}
              className="p-2.5 glass text-gray-400 hover:text-red-400 rounded-lg transition"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
