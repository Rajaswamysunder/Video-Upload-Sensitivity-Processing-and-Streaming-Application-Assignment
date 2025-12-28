import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  FiHome, 
  FiVideo, 
  FiUpload, 
  FiSettings, 
  FiLogOut,
  FiZap,
  FiPlay,
  FiSearch,
  FiUser,
  FiShield
} from 'react-icons/fi';

const Layout = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', icon: FiHome, label: 'Dashboard' },
    { to: '/videos', icon: FiVideo, label: 'Video Library' },
    { to: '/search', icon: FiSearch, label: 'Search & Import' },
    { to: '/upload', icon: FiUpload, label: 'Upload' },
    { to: '/profile', icon: FiUser, label: 'My Profile' },
    { to: '/admin', icon: FiShield, label: 'Admin Panel', roles: ['admin'] }
  ];

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-72 glass-dark">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 h-20 border-b border-white/5">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FiPlay className="w-5 h-5 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold text-white">StreamVault</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navLinks.map((link) => {
              if (link.roles && !link.roles.includes(user?.role)) {
                return null;
              }
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'sidebar-active text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <link.icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-white/5">
            {/* Connection Status */}
            <div className="flex items-center gap-2 px-4 py-2 mb-4 glass rounded-xl">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 pulse-slow' : 'bg-red-400'}`}></div>
              <span className="text-sm text-gray-400">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
              {connected && <FiZap className="w-3 h-3 text-yellow-400 ml-auto" />}
            </div>

            {/* User Info */}
            <div className="flex items-center px-4 py-3 glass rounded-xl mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-400 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-white">{user?.username}</p>
                <p className="text-xs text-gray-400 capitalize flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    user?.role === 'admin' ? 'bg-red-400' : 
                    user?.role === 'editor' ? 'bg-blue-400' : 'bg-green-400'
                  }`}></span>
                  {user?.role}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300"
            >
              <FiLogOut className="w-5 h-5 mr-3" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-72 min-h-screen">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
