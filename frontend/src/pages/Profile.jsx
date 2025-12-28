import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../services/api';
import { 
  FiUser, 
  FiMail, 
  FiLock, 
  FiCamera, 
  FiSave,
  FiShield,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiCalendar,
  FiVideo,
  FiAlertCircle,
  FiCheckCircle,
  FiRefreshCw
} from 'react-icons/fi';

const Profile = () => {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef(null);
  
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setSaving] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Real stats from database
  const [stats, setStats] = useState({
    videosUploaded: 0,
    totalViews: 0,
    recentVideos: [],
    memberSince: user?.createdAt || new Date().toISOString()
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Email verification
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState(null);
  const [sentCode, setSentCode] = useState(null);

  // Fetch real user stats
  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await api.get('/auth/stats');
      if (response.data.success) {
        setStats({
          videosUploaded: response.data.stats.videosUploaded,
          totalViews: response.data.stats.totalViews,
          recentVideos: response.data.stats.recentVideos || [],
          memberSince: user?.createdAt || new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Verify email
  const handleVerifyEmail = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setVerifying(true);
    try {
      const response = await api.post('/auth/verify-email', { code: verificationCode });
      if (response.data.success) {
        toast.success('Email verified successfully! 🎉');
        // Update user context
        setUser({ ...user, isEmailVerified: true });
        localStorage.setItem('user', JSON.stringify({ ...user, isEmailVerified: true }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    setResending(true);
    try {
      const response = await api.post('/auth/resend-verification');
      if (response.data.success) {
        toast.success('New verification code sent!');
        // Store the code and preview URL for testing
        if (response.data.verificationCode) {
          setSentCode(response.data.verificationCode);
        }
        if (response.data.emailPreviewUrl) {
          setEmailPreviewUrl(response.data.emailPreviewUrl);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        username: formData.username,
        email: formData.email
      };

      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await api.put('/auth/profile', updateData);
      
      if (response.data.user) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      toast.success('Profile updated successfully!');
      setEditing(false);
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { class: 'stats-gradient-4', label: 'Administrator' },
      editor: { class: 'stats-gradient-3', label: 'Editor' },
      viewer: { class: 'stats-gradient-1', label: 'Viewer' }
    };
    return badges[role] || badges.viewer;
  };

  const roleBadge = getRoleBadge(user?.role);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="w-10 h-10 stats-gradient-1 rounded-xl flex items-center justify-center">
            <FiUser className="w-5 h-5 text-white" />
          </span>
          My Profile
        </h1>
        <p className="text-gray-400 mt-2">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="glass rounded-2xl p-6 text-center">
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-500/30 mx-auto">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full stats-gradient-1 flex items-center justify-center">
                    <span className="text-5xl font-bold text-white">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              {editing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white hover:bg-indigo-600 transition shadow-lg"
                >
                  <FiCamera className="w-5 h-5" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Username & Role */}
            <h2 className="text-2xl font-bold text-white mb-1">{user?.username}</h2>
            <p className="text-gray-400 mb-4">{user?.email}</p>
            
            <div className={`inline-flex items-center gap-2 px-4 py-2 ${roleBadge.class} rounded-full`}>
              <FiShield className="w-4 h-4 text-white" />
              <span className="text-white font-medium text-sm">{roleBadge.label}</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
              <div className="text-center">
                {statsLoading ? (
                  <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                ) : (
                  <p className="text-2xl font-bold text-indigo-400">{stats.videosUploaded}</p>
                )}
                <p className="text-sm text-gray-400">Videos</p>
              </div>
              <div className="text-center">
                {statsLoading ? (
                  <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
                ) : (
                  <p className="text-2xl font-bold text-purple-400">{stats.totalViews.toLocaleString()}</p>
                )}
                <p className="text-sm text-gray-400">Views</p>
              </div>
            </div>

            {/* Email Verification Status */}
            <div className="mt-6 pt-6 border-t border-white/10">
              {user?.isEmailVerified ? (
                <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
                  <FiCheckCircle className="w-4 h-4" />
                  Email Verified
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm">
                  <FiAlertCircle className="w-4 h-4" />
                  Email Not Verified
                </div>
              )}
            </div>

            {/* Member Since */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <FiCalendar className="w-4 h-4" />
                Member since {new Date(stats.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FiEdit2 className="w-5 h-5 text-indigo-400" />
                Account Settings
              </h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 glass rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition flex items-center gap-2"
                >
                  <FiEdit2 className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <FiUser className="w-4 h-4 inline mr-2" />
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={!editing}
                  className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white disabled:opacity-60 disabled:cursor-not-allowed transition"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <FiMail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!editing}
                  className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white disabled:opacity-60 disabled:cursor-not-allowed transition"
                />
              </div>

              {/* Password Section */}
              {editing && (
                <div className="pt-6 border-t border-white/10">
                  <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                    <FiLock className="w-4 h-4 text-indigo-400" />
                    Change Password
                  </h3>

                  <div className="space-y-4">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleChange}
                          className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white pr-12 transition"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                        >
                          {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        New Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white transition"
                        placeholder="Enter new password"
                      />
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white transition"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {editing && (
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FiSave className="w-5 h-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        username: user?.username || '',
                        email: user?.email || '',
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                      setAvatarPreview(null);
                    }}
                    className="px-6 py-4 glass rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Email Verification Card - Show if not verified */}
          {!user?.isEmailVerified && (
            <div className="glass rounded-2xl p-6 mb-6 border border-yellow-500/30 bg-yellow-500/5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FiMail className="w-5 h-5 text-yellow-400" />
                Verify Your Email
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                We sent a 6-digit verification code to <strong className="text-white">{user?.email}</strong>. 
                Enter it below to verify your account.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none text-white text-center text-lg tracking-widest font-mono"
                />
                <button
                  onClick={handleVerifyEmail}
                  disabled={verifying || verificationCode.length !== 6}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 transition flex items-center gap-2"
                >
                  {verifying ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <FiCheck className="w-5 h-5" />
                      Verify
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={handleResendCode}
                disabled={resending}
                className="mt-3 text-sm text-gray-400 hover:text-white flex items-center gap-1 transition"
              >
                <FiRefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Sending...' : "Didn't receive code? Resend"}
              </button>

              {/* DEV MODE: Show code and preview URL */}
              {(sentCode || emailPreviewUrl) && (
                <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <p className="text-emerald-400 text-xs font-semibold mb-2">🧪 DEV MODE - Testing Info:</p>
                  {sentCode && (
                    <p className="text-white text-sm mb-2">
                      <span className="text-gray-400">Your code: </span>
                      <span className="font-mono text-lg font-bold tracking-widest">{sentCode}</span>
                    </p>
                  )}
                  {emailPreviewUrl && (
                    <a
                      href={emailPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 text-sm underline block"
                    >
                      📧 Click here to view the email →
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Activity Card */}
          <div className="glass rounded-2xl p-6 mt-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FiVideo className="w-5 h-5 text-purple-400" />
              Recent Videos
            </h2>
            {statsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
              </div>
            ) : stats.recentVideos.length > 0 ? (
              <div className="space-y-3">
                {stats.recentVideos.map((video, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 glass rounded-lg">
                    <div className="w-10 h-10 stats-gradient-3 rounded-lg flex items-center justify-center">
                      <FiVideo className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm truncate">{video.title}</p>
                      <p className="text-gray-500 text-xs">
                        {new Date(video.createdAt).toLocaleDateString()} • {video.processingStatus}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FiVideo className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No videos uploaded yet</p>
                <p className="text-gray-500 text-sm mt-1">Upload your first video to see it here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
