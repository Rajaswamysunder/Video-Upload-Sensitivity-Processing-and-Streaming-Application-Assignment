import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiPlay, FiMail, FiLock, FiUser, FiArrowRight, FiCheck, FiAlertCircle } from 'react-icons/fi';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  // Disposable email domains to block
  const disposableEmails = [
    'tempmail.com', 'throwaway.com', 'guerrillamail.com', 'mailinator.com',
    '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
    'yopmail.com', 'getnada.com', 'maildrop.cc', 'dispostable.com'
  ];

  // Validate email
  const validateEmail = (emailValue) => {
    const domain = emailValue.split('@')[1]?.toLowerCase();
    
    if (!domain) {
      setEmailError('');
      return;
    }

    if (disposableEmails.includes(domain)) {
      setEmailError('Temporary emails are not allowed. Use Gmail, Outlook, or Yahoo.');
      return false;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    setEmailError('');
    return true;
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (value.includes('@')) {
      validateEmail(value);
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error('Please use a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!/\d/.test(password)) {
      toast.error('Password must contain at least one number');
      return;
    }

    setLoading(true);

    try {
      await register(username, email, password);
      toast.success('Account created successfully! 🚀');
      navigate('/');
    } catch (error) {
      // Handle validation errors from backend
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        errors.forEach(err => toast.error(err.msg));
      } else {
        toast.error(error.response?.data?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Upload unlimited videos',
    'AI-powered content analysis',
    'Real-time processing updates',
    'Secure video streaming',
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <FiPlay className="w-7 h-7 text-white" />
            </div>
            <span className="ml-3 text-2xl font-bold text-white">StreamVault</span>
          </div>

          <div className="glass rounded-3xl p-8 card-hover">
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-gray-400 mb-8">Join thousands of creators today</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 input-modern rounded-xl text-white placeholder-gray-500"
                    placeholder="Choose a username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={handleEmailChange}
                    className={`w-full pl-12 pr-4 py-4 input-modern rounded-xl text-white placeholder-gray-500 ${
                      emailError ? 'border-red-500 focus:ring-red-500' : ''
                    }`}
                    placeholder="you@gmail.com"
                  />
                </div>
                {emailError && (
                  <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                    <FiAlertCircle className="w-4 h-4" />
                    {emailError}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Use a real email (Gmail, Outlook, Yahoo, etc.)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 input-modern rounded-xl text-white placeholder-gray-500"
                    placeholder="••••••••"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  At least 6 characters with 1 number
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 input-modern rounded-xl text-white placeholder-gray-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-neon py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  <>
                    Get Started
                    <FiArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-90"></div>
        <div className="absolute inset-0 bg-black/30"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 right-20 w-24 h-24 bg-white/10 rounded-full float blur-xl"></div>
        <div className="absolute bottom-32 left-20 w-36 h-36 bg-purple-500/20 rounded-full float blur-xl" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/3 right-1/3 w-20 h-20 bg-pink-500/20 rounded-full float blur-xl" style={{animationDelay: '2s'}}></div>
        
        <div className="relative z-10 flex flex-col justify-center w-full p-12 text-white">
          <div className="flex items-center mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <FiPlay className="w-8 h-8" />
            </div>
            <span className="ml-4 text-3xl font-bold">StreamVault</span>
          </div>
          
          <h2 className="text-4xl font-bold mb-6">Start your journey today</h2>
          <p className="text-xl text-white/80 mb-8">
            Join our platform and experience the future of video streaming
          </p>
          
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <FiCheck className="w-4 h-4" />
                </div>
                <span className="text-lg">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
