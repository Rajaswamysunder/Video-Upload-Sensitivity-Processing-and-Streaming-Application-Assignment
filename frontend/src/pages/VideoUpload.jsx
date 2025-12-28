import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import videoService from '../services/videoService';
import { toast } from 'react-toastify';
import { 
  FiUploadCloud, 
  FiFile, 
  FiX, 
  FiCheck, 
  FiPlay,
  FiInfo,
  FiTag,
  FiEye,
  FiFolder
} from 'react-icons/fi';

const VideoUpload = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'uncategorized',
    visibility: 'private',
    tags: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [uploadedVideoId, setUploadedVideoId] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (socket && uploadedVideoId) {
      socket.on('processingUpdate', (data) => {
        if (data.videoId === uploadedVideoId) {
          setProcessingProgress(data.progress);
        }
      });

      socket.on('processingComplete', (data) => {
        if (data.videoId === uploadedVideoId) {
          setStatus('complete');
          toast.success('Video processing complete!');
        }
      });

      socket.on('processingError', (data) => {
        if (data.videoId === uploadedVideoId) {
          setStatus('error');
          toast.error('Video processing failed');
        }
      });

      return () => {
        socket.off('processingUpdate');
        socket.off('processingComplete');
        socket.off('processingError');
      };
    }
  }, [socket, uploadedVideoId]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    processFile(selectedFile);
  };

  const processFile = (selectedFile) => {
    if (selectedFile) {
      if (!selectedFile.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }
      
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }

      setFile(selectedFile);
      
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
      
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: selectedFile.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    processFile(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setFormData(prev => ({ ...prev, title: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset everything for a new upload
  const resetUpload = () => {
    setFile(null);
    setPreview(null);
    setFormData({
      title: '',
      description: '',
      category: 'uncategorized',
      visibility: 'private',
      tags: ''
    });
    setUploading(false);
    setUploadProgress(0);
    setProcessingProgress(0);
    setStatus('idle');
    setUploadedVideoId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select a video file');
      return;
    }

    setUploading(true);
    setStatus('uploading');

    try {
      const data = new FormData();
      data.append('video', file);
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('visibility', formData.visibility);
      data.append('tags', formData.tags);

      const response = await videoService.uploadVideo(data, (progress) => {
        setUploadProgress(progress);
      });

      setUploadedVideoId(response.video.id);
      setStatus('processing');
      toast.success('Upload complete! Processing video...');
    } catch (error) {
      setStatus('error');
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const categories = [
    { value: 'uncategorized', label: 'Uncategorized', icon: '📁' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
    { value: 'education', label: 'Education', icon: '📚' },
    { value: 'music', label: 'Music', icon: '🎵' },
    { value: 'sports', label: 'Sports', icon: '⚽' },
    { value: 'gaming', label: 'Gaming', icon: '🎮' },
    { value: 'news', label: 'News', icon: '📰' },
    { value: 'other', label: 'Other', icon: '📦' }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="w-10 h-10 stats-gradient-2 rounded-xl flex items-center justify-center">
            <FiUploadCloud className="w-5 h-5 text-white" />
          </span>
          Upload Video
        </h1>
        <p className="text-gray-400 mt-2">Share your content with the world</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative overflow-hidden border-2 border-dashed rounded-2xl transition-all duration-300 ${
            dragActive 
              ? 'border-indigo-500 bg-indigo-500/10' 
              : file 
                ? 'border-emerald-500/50 bg-emerald-500/5' 
                : 'border-white/20 hover:border-indigo-500/50 bg-white/5'
          }`}
        >
          {file ? (
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative w-full md:w-64 h-40 bg-black rounded-xl overflow-hidden flex-shrink-0">
                  {preview && (
                    <video 
                      src={preview} 
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <FiPlay className="w-12 h-12 text-white/80" />
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{file.name}</h3>
                      <p className="text-gray-400">{formatFileSize(file.size)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="badge-safe">Ready to upload</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-20 h-20 glass rounded-full flex items-center justify-center mx-auto mb-6">
                <FiUploadCloud className={`w-10 h-10 ${dragActive ? 'text-indigo-400' : 'text-gray-400'}`} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {dragActive ? 'Drop your video here' : 'Drag and drop your video'}
              </h3>
              <p className="text-gray-400 mb-6">or click to browse from your computer</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-neon"
              >
                <FiFile className="w-5 h-5 mr-2 inline" />
                Browse Files
              </button>
              <p className="text-sm text-gray-500 mt-4">MP4, MOV, AVI, MKV up to 100MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Video Details */}
        <div className="glass rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FiInfo className="w-5 h-5 text-indigo-400" />
            Video Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white placeholder:text-gray-500 transition"
              placeholder="Give your video a catchy title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white placeholder:text-gray-500 resize-none transition"
              placeholder="Tell viewers about your video..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FiFolder className="w-4 h-4 inline mr-1" />
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white transition"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value} className="bg-gray-800">
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FiEye className="w-4 h-4 inline mr-1" />
                Visibility
              </label>
              <select
                value={formData.visibility}
                onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white transition"
              >
                <option value="private" className="bg-gray-800">🔒 Private</option>
                <option value="public" className="bg-gray-800">🌍 Public</option>
                <option value="restricted" className="bg-gray-800">🔞 Restricted</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <FiTag className="w-4 h-4 inline mr-1" />
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white placeholder:text-gray-500 transition"
              placeholder="music, vlog, tutorial (separate with commas)"
            />
          </div>
        </div>

        {/* Progress Indicators */}
        {(status === 'uploading' || status === 'processing') && (
          <div className="glass rounded-2xl p-6 space-y-6">
            {status === 'uploading' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-medium">Uploading...</span>
                  <span className="text-indigo-400 font-semibold">{uploadProgress}%</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full stats-gradient-1 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            {status === 'processing' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-medium">Processing video...</span>
                  <span className="text-purple-400 font-semibold">{processingProgress}%</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full stats-gradient-3 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-3">
                  Analyzing content sensitivity and generating thumbnails...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Success Message */}
        {status === 'complete' && (
          <div className="glass rounded-2xl p-6 border border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <FiCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">Upload Complete!</h3>
                <p className="text-gray-400">Your video has been processed and is ready to watch.</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          {status === 'complete' ? (
            <>
              <button
                type="button"
                onClick={resetUpload}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 focus:ring-4 focus:ring-indigo-500/30 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <FiUploadCloud className="w-5 h-5" />
                Upload Another Video
              </button>
              <button
                type="button"
                onClick={() => navigate(`/watch/${uploadedVideoId}`)}
                className="px-8 py-4 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-all duration-300 flex items-center gap-2"
              >
                <FiPlay className="w-5 h-5" />
                Watch Video
              </button>
            </>
          ) : (
            <button
              type="submit"
              disabled={!file || uploading || status === 'processing'}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 focus:ring-4 focus:ring-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : status === 'processing' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <FiUploadCloud className="w-5 h-5" />
                  Upload Video
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default VideoUpload;
