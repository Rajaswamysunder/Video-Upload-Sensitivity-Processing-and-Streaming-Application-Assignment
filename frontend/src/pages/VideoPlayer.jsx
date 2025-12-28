import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import videoService from '../services/videoService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  FiArrowLeft, 
  FiEye, 
  FiCalendar, 
  FiUser, 
  FiTag, 
  FiAlertTriangle,
  FiShield,
  FiFolder,
  FiGlobe,
  FiHardDrive,
  FiShare2,
  FiHeart,
  FiDownload,
  FiExternalLink
} from 'react-icons/fi';

const VideoPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef(null);
  
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    fetchVideo();
  }, [id]);

  const fetchVideo = async () => {
    try {
      const response = await videoService.getVideo(id);
      setVideo(response.video);
      setLikesCount(response.video.likesCount || 0);
      if (user && response.video.likes) {
        setLiked(response.video.likes.includes(user.id));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load video');
      toast.error('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  // Check if URL is a YouTube URL
  const isYouTubeUrl = (url) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getStreamUrl = () => {
    const token = localStorage.getItem('token');
    return `http://localhost:5000/api/stream/${id}?token=${token}`;
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please login to like videos');
      return;
    }
    try {
      const response = await videoService.toggleLike(id);
      setLiked(response.liked);
      setLikesCount(response.likesCount);
      toast.success(response.liked ? 'Added to liked videos!' : 'Removed from liked videos');
    } catch (err) {
      toast.error('Failed to update like');
    }
  };

  const handleNativeShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: video.description || 'Check out this video!',
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink(shareUrl);
        }
      }
    } else {
      handleCopyLink(shareUrl);
    }
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const handleDownload = async () => {
    if (video.isExternal) {
      window.open(video.externalUrl, '_blank');
      toast.info('Opening external video source');
      return;
    }
    try {
      const downloadUrl = videoService.getDownloadUrl(id);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = video.title || 'video';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started!');
    } catch (err) {
      toast.error('Failed to download video');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatViews = (views) => {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <div className="w-20 h-20 glass rounded-full flex items-center justify-center mb-6">
          <FiAlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">Video Not Found</h2>
        <p className="text-gray-400 mb-6">{error || 'The video you are looking for does not exist.'}</p>
        <button
          onClick={() => navigate('/videos')}
          className="btn-neon"
        >
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition group"
      >
        <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Back to videos
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Video Player Column */}
        <div className="lg:col-span-2">
          {/* Video Player */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="bg-black relative">
              {video.isExternal && isYouTubeUrl(video.externalUrl) ? (
                // YouTube video - show thumbnail with play button that opens YouTube
                <div className="w-full aspect-video relative">
                  <img 
                    src={`https://img.youtube.com/vi/${getYouTubeVideoId(video.externalUrl)}/maxresdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = `https://img.youtube.com/vi/${getYouTubeVideoId(video.externalUrl)}/hqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                    <a
                      href={video.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-20 h-20 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-2xl mb-4"
                    >
                      <svg className="w-10 h-10 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </a>
                    <p className="text-white text-lg font-medium">Click to Watch on YouTube</p>
                    <p className="text-gray-300 text-sm mt-1">Opens in a new tab (⌘+Click)</p>
                  </div>
                </div>
              ) : video.isExternal ? (
                // External non-YouTube video - show link
                <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <div className="text-center p-8">
                    <FiGlobe className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">External video</p>
                    <a 
                      href={video.externalUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-neon inline-flex items-center gap-2"
                    >
                      <FiExternalLink className="w-5 h-5" />
                      Open Video (⌘+Click)
                    </a>
                    <p className="text-gray-500 text-sm mt-4">Click the button to open in new tab</p>
                  </div>
                </div>
              ) : (
                // Local video
                <video
                  ref={videoRef}
                  controls
                  className="w-full aspect-video"
                  src={getStreamUrl()}
                  poster={video.thumbnail ? `http://localhost:5000${video.thumbnail}` : undefined}
                  onError={(e) => {
                    console.error('Video error:', e);
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          </div>

          {/* Video Title & Meta */}
          <div className="glass rounded-2xl p-6 mt-6">
            <h1 className="text-2xl font-bold text-white mb-4">{video.title}</h1>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 mb-6">
              <span className="flex items-center gap-2">
                <FiEye className="w-4 h-4" />
                {formatViews(video.views)} views
              </span>
              <span className="flex items-center gap-2">
                <FiCalendar className="w-4 h-4" />
                {formatDate(video.createdAt)}
              </span>
              <span className="flex items-center gap-2">
                <FiUser className="w-4 h-4" />
                {video.owner?.username || 'Unknown'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-white/10">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
                  liked 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                    : 'glass text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <FiHeart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                {liked ? 'Liked' : 'Like'} {likesCount > 0 && `(${likesCount})`}
              </button>
              <button 
                onClick={handleNativeShare}
                className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition"
              >
                <FiShare2 className="w-5 h-5" />
                Share
              </button>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition"
              >
                <FiDownload className="w-5 h-5" />
                Download
              </button>
              {video.isExternal && (
                <a 
                  href={video.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-white transition"
                >
                  <FiExternalLink className="w-5 h-5" />
                  Open in New Tab
                </a>
              )}
            </div>

            {/* Description */}
            {video.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{video.description}</p>
              </div>
            )}

            {/* Tags */}
            {video.tags && video.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <FiTag className="w-4 h-4" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {video.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 glass text-gray-300 rounded-lg text-sm hover:bg-white/10 cursor-pointer transition"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Video Info Card */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              Video Information
            </h2>
            
            <div className="space-y-5">
              {/* Source Type */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  {video.isExternal ? <FiGlobe className="w-4 h-4" /> : <FiHardDrive className="w-4 h-4" />}
                  <span className="text-sm">Source</span>
                </div>
                <span className="text-white">{video.isExternal ? 'External' : 'Uploaded'}</span>
              </div>

              {/* Processing Status */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Processing Status</p>
                <span className={`${
                  video.processingStatus === 'completed' ? 'badge-safe' :
                  video.processingStatus === 'processing' ? 'badge-processing' :
                  video.processingStatus === 'failed' ? 'badge-flagged' :
                  'badge-pending'
                }`}>
                  {video.processingStatus}
                </span>
              </div>

              {/* Sensitivity Status */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Content Sensitivity</p>
                <div className="flex items-center gap-3">
                  <span className={`${
                    video.sensitivityStatus === 'safe' ? 'badge-safe' :
                    video.sensitivityStatus === 'flagged' ? 'badge-flagged' :
                    'badge-pending'
                  }`}>
                    {video.sensitivityStatus}
                  </span>
                  {video.sensitivityScore !== undefined && (
                    <span className="text-sm text-gray-400">
                      Score: {video.sensitivityScore}/100
                    </span>
                  )}
                </div>
              </div>

              {/* Category */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <FiFolder className="w-4 h-4" />
                  <span className="text-sm">Category</span>
                </div>
                <span className="text-white capitalize">{video.category}</span>
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <FiGlobe className="w-4 h-4" />
                  <span className="text-sm">Visibility</span>
                </div>
                <span className="text-white capitalize">{video.visibility}</span>
              </div>

              {/* File Size - only for uploaded videos */}
              {!video.isExternal && video.size && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <FiHardDrive className="w-4 h-4" />
                    <span className="text-sm">File Size</span>
                  </div>
                  <span className="text-white">
                    {(video.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sensitivity Breakdown - ML Analysis Results */}
          {video.sensitivityDetails && video.sensitivityStatus !== 'pending' && (
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FiShield className="w-5 h-5 text-indigo-400" />
                ML Sensitivity Analysis
              </h2>

              {/* Content Rating Badge */}
              {video.sensitivityDetails.rating && (
                <div className="mb-5 p-4 glass rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Content Rating</span>
                    <span className={`px-3 py-1 font-bold text-lg rounded-lg border ${
                      video.sensitivityDetails.rating === 'G' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      video.sensitivityDetails.rating === 'PG' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                      video.sensitivityDetails.rating === 'PG-13' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                      'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {video.sensitivityDetails.rating}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {/* Violence */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Violence</span>
                    <span className="text-white">{video.sensitivityDetails.violence || 0}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-500"
                      style={{ width: `${video.sensitivityDetails.violence || 0}%` }}
                    />
                  </div>
                </div>

                {/* Adult Content */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Adult Content</span>
                    <span className="text-white">{video.sensitivityDetails.adult || 0}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-500"
                      style={{ width: `${video.sensitivityDetails.adult || 0}%` }}
                    />
                  </div>
                </div>

                {/* Language */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Explicit Language</span>
                    <span className="text-white">{video.sensitivityDetails.language || 0}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-500"
                      style={{ width: `${video.sensitivityDetails.language || 0}%` }}
                    />
                  </div>
                </div>

                {/* Drugs */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Drugs/Substances</span>
                    <span className="text-white">{video.sensitivityDetails.drugs || 0}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${video.sensitivityDetails.drugs || 0}%` }}
                    />
                  </div>
                </div>

                {/* Disturbing Content */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Disturbing Content</span>
                    <span className="text-white">{video.sensitivityDetails.disturbing || 0}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-400 to-pink-600 rounded-full transition-all duration-500"
                      style={{ width: `${video.sensitivityDetails.disturbing || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Analysis Method */}
              {video.sensitivityDetails.analysisDetails && (
                <div className="mt-5 pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-500">
                    Analyzed via {video.sensitivityDetails.analysisDetails.modelUsed || 'ML Model'}
                    {video.sensitivityDetails.analysisDetails.framesAnalyzed > 0 && 
                      ` • ${video.sensitivityDetails.analysisDetails.framesAnalyzed} frames analyzed`
                    }
                    {video.sensitivityDetails.analysisDetails.metadataOnly && ' • Metadata only'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
