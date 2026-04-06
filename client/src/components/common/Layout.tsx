import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { LogOut, User, LayoutDashboard, Monitor, Menu, X, BookOpen, BarChart3, GraduationCap } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'super_admin' || user?.role === 'institution_admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-blue-800 to-blue-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center group">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mr-3 group-hover:bg-white/20 transition-colors">
                  <Monitor className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-white font-bold text-lg">KEAM Mock Test</span>
                  <span className="hidden sm:block text-blue-200 text-xs">Professional CBT Platform</span>
                </div>
              </Link>
            </div>

            <div className="hidden md:flex items-center space-x-1">
              <Link 
                to="/" 
                className="flex items-center text-blue-100 hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </Link>

              {!isAdmin && (
                <Link 
                  to="/my-mistakes" 
                  className="flex items-center text-blue-100 hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  My Mistakes
                </Link>
              )}

              {isAdmin && (
                <Link 
                  to="/" 
                  className="flex items-center text-blue-100 hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Link>
              )}

              <div className="w-px h-8 bg-blue-700 mx-3"></div>

              <div className="flex items-center">
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div className="mr-4">
                  <p className="text-white text-sm font-medium">{user?.name}</p>
                  <p className="text-blue-300 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>

              <button 
                onClick={handleLogout} 
                className="flex items-center text-blue-100 hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all ml-2"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="md:hidden flex items-center text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-blue-800 border-t border-blue-700">
            <div className="px-4 py-4 space-y-2">
              <Link 
                to="/" 
                onClick={() => setMobileMenuOpen(false)} 
                className="flex items-center text-blue-100 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg text-sm font-medium"
              >
                <LayoutDashboard className="w-5 h-5 mr-3" />
                Dashboard
              </Link>
              
              {!isAdmin && (
                <Link 
                  to="/my-mistakes" 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="flex items-center text-blue-100 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg text-sm font-medium"
                >
                  <BookOpen className="w-5 h-5 mr-3" />
                  My Mistakes
                </Link>
              )}

              <div className="border-t border-blue-700 pt-4 mt-2">
                <div className="flex items-center px-4 py-2">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{user?.name}</p>
                    <p className="text-blue-300 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }} 
                className="flex items-center text-blue-100 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg text-sm font-medium w-full mt-2"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <Monitor className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-gray-600 text-sm">KEAM Mock Test Platform v2.0</span>
            </div>
            <div className="text-gray-500 text-xs">
              Professional Computer-Based Testing System for KEAM B.Tech Entrance Examination
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
