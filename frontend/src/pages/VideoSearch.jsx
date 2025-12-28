import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import videoService from '../services/videoService';
import { 
  FiSearch, 
  FiLink, 
  FiPlay, 
  FiShield, 
  FiLoader,
  FiYoutube,
  FiExternalLink,
  FiDownload,
  FiAlertTriangle,
  FiCheckCircle,
  FiVideo,
  FiEye,
  FiClock,
  FiFolder
} from 'react-icons/fi';

const VideoSearch = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [libraryVideos, setLibraryVideos] = useState([]);
  const [activeTab, setActiveTab] = useState('url');
  const [loading, setLoading] = useState(true);

  // Load library videos on mount
  useEffect(() => {
    fetchLibraryVideos();
  }, []);

  const fetchLibraryVideos = async () => {
    try {
      const response = await videoService.getVideos({ limit: 20 });
      setLibraryVideos(response.videos || []);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeUrl = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error('Please enter a video URL');
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const response = await videoService.analyzeUrl(url);
      if (response.success) {
        setAnalysisResult(response);
        toast.success('Video analyzed successfully!');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to analyze video');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImportVideo = async () => {
    if (!analysisResult) return;
    
    setImporting(true);
    try {
      const response = await videoService.importFromUrl({
        url: url,
        title: analysisResult.title,
        sensitivity: analysisResult.sensitivity
      });
      
      if (response.success) {
        toast.success('Video imported to your library!');
        navigate('/videos');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to import video');
    } finally {
      setImporting(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const response = await videoService.searchVideos(searchQuery);
      if (response.success) {
        setSearchResults(response.videos || []);
        if (response.videos.length === 0) {
          toast.info('No videos found matching your search');
        }
      }
    } catch (error) {
      toast.error('Search failed');
      // Fallback to client-side filtering
      const filtered = libraryVideos.filter(v => 
        v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setSearchResults(filtered);
    } finally {
      setSearching(false);
    }
  };

  const handleVideoClick = (video) => {
    navigate(`/video/${video._id}`);
  };

  const getSensitivityColor = (score) => {
    if (score < 25) return 'text-emerald-400';
    if (score < 50) return 'text-yellow-400';
    if (score < 75) return 'text-orange-400';
    return 'text-red-400';
  };

  const formatViews = (views) => {
    if (!views) return '0';
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toString();
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center">
            <FiYoutube className="w-5 h-5 text-white" />
          </span>
          Video Search & Import
        </h1>
        <p className="text-gray-400 mt-2">Search your video library or import videos from URL</p>
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl p-1.5 inline-flex mb-8">
        <button
          onClick={() => setActiveTab('url')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition ${
            activeTab === 'url'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <FiLink className="w-4 h-4" />
          Import by URL
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition ${
            activeTab === 'search'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <FiSearch className="w-4 h-4" />
          Search Library
        </button>
      </div>

      {/* URL Import Tab */}
      {activeTab === 'url' && (
        <div className="space-y-6">
          {/* URL Input */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FiLink className="w-5 h-5 text-indigo-400" />
              Paste Video URL
            </h2>
            <form onSubmit={handleAnalyzeUrl} className="flex gap-4">
              <div className="flex-1 relative">
                <FiExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or any video URL"
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white placeholder:text-gray-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={analyzing}
                className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {analyzing ? (
                  <>
                    <FiLoader className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FiShield className="w-5 h-5" />
                    Analyze
                  </>
                )}
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-3">
              Paste any video URL to analyze its content sensitivity
            </p>
          </div>

          {/* Analysis Result */}
          {analysisResult && (
            <div className="glass rounded-2xl p-6 animate-fadeIn">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <FiCheckCircle className="w-5 h-5 text-emerald-400" />
                Analysis Complete
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Video Preview */}
                <div>
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video mb-4">
                    {analysisResult.thumbnail ? (
                      <img 
                        src={analysisResult.thumbnail} 
                        alt={analysisResult.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/50 to-purple-900/50">
                        <FiVideo className="w-16 h-16 text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <FiPlay className="w-8 h-8 text-white ml-1" />
                      </div>
                    </div>
                    {analysisResult.duration && (
                      <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 rounded text-white text-sm">
                        {analysisResult.duration}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{analysisResult.title}</h3>
                  <p className="text-gray-400 text-sm break-all">{url}</p>
                </div>

                {/* Sensitivity Analysis */}
                <div className="space-y-4">
                  <div className="glass rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        <FiShield className="w-5 h-5 text-indigo-400" />
                        Sensitivity Score
                      </h4>
                      <span className={`text-3xl font-bold ${getSensitivityColor(analysisResult.sensitivity.score)}`}>
                        {analysisResult.sensitivity.score}/100
                      </span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-4">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          analysisResult.sensitivity.score < 25 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                          analysisResult.sensitivity.score < 50 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                          analysisResult.sensitivity.score < 75 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                          'bg-gradient-to-r from-red-400 to-red-600'
                        }`}
                        style={{ width: `${analysisResult.sensitivity.score}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {analysisResult.sensitivity.status === 'safe' ? (
                        <span className="badge-safe flex items-center gap-1">
                          <FiCheckCircle className="w-4 h-4" />
                          Safe Content
                        </span>
                      ) : (
                        <span className="badge-flagged flex items-center gap-1">
                          <FiAlertTriangle className="w-4 h-4" />
                          Flagged Content
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="glass rounded-xl p-5 space-y-4">
                    <h4 className="font-semibold text-white">Content Breakdown</h4>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Violence</span>
                        <span className="text-white">{analysisResult.sensitivity.details.violence}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full"
                          style={{ width: `${analysisResult.sensitivity.details.violence}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Adult Content</span>
                        <span className="text-white">{analysisResult.sensitivity.details.adult}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
                          style={{ width: `${analysisResult.sensitivity.details.adult}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Explicit Language</span>
                        <span className="text-white">{analysisResult.sensitivity.details.language}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
                          style={{ width: `${analysisResult.sensitivity.details.language}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Import Button */}
                  <button
                    onClick={handleImportVideo}
                    disabled={importing}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <>
                        <FiLoader className="w-5 h-5 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <FiDownload className="w-5 h-5" />
                        Import to Library
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info Note */}
          <div className="glass rounded-xl p-4 border border-indigo-500/20">
            <p className="text-sm text-gray-400">
              <span className="text-indigo-400 font-medium">Note:</span> The sensitivity analysis simulates content moderation. 
              For production use with YouTube/external videos, integrate with YouTube Data API or video analysis services.
            </p>
          </div>
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Search Input */}
          <div className="glass rounded-2xl p-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your video library..."
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white placeholder:text-gray-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {searching ? (
                  <FiLoader className="w-5 h-5 animate-spin" />
                ) : (
                  <FiSearch className="w-5 h-5" />
                )}
                Search
              </button>
            </form>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center h-[40vh]">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading videos...</p>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FiVideo className="w-5 h-5 text-indigo-400" />
                {searchResults.length > 0 ? `Search Results (${searchResults.length})` : `Your Videos (${libraryVideos.length})`}
              </h2>
              
              {(searchResults.length > 0 ? searchResults : libraryVideos).length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <div className="w-20 h-20 glass rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiVideo className="w-10 h-10 text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Videos Found</h3>
                  <p className="text-gray-400 mb-6">
                    {searchQuery ? 'No videos match your search query' : 'Upload some videos to see them here'}
                  </p>
                  <button
                    onClick={() => navigate('/upload')}
                    className="btn-neon"
                  >
                    Upload Video
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(searchResults.length > 0 ? searchResults : libraryVideos).map((video) => (
                    <div
                      key={video._id}
                      onClick={() => handleVideoClick(video)}
                      className="glass rounded-xl overflow-hidden cursor-pointer card-hover group"
                    >
                      <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900">
                        {video.thumbnail ? (
                          <img
                            src={`http://localhost:5000${video.thumbnail}`}
                            alt={video.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FiVideo className="w-12 h-12 text-gray-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <FiPlay className="w-6 h-6 text-white ml-0.5" />
                          </div>
                        </div>
                        {/* Status Badge */}
                        <div className="absolute top-2 left-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            video.sensitivityStatus === 'safe' ? 'bg-emerald-500/80' :
                            video.sensitivityStatus === 'flagged' ? 'bg-red-500/80' :
                            'bg-yellow-500/80'
                          } text-white`}>
                            {video.sensitivityStatus}
                          </span>
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-white text-sm line-clamp-2 mb-2">{video.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <FiEye className="w-3 h-3" />
                            {formatViews(video.views)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiClock className="w-3 h-3" />
                            {formatDate(video.createdAt)}
                          </span>
                        </div>
                        {video.category && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                            <FiFolder className="w-3 h-3" />
                            {video.category}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoSearch;
