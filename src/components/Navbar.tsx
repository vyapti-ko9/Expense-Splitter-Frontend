import { useEffect, useRef, useState } from 'react';
import { LogOut, Moon, Settings, Sun, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.tsx';

interface NavbarProps {
  userName?: string;
}

export default function Navbar({ userName }: NavbarProps) {
  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    if (!menuOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setMenuOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <nav className="relative z-9999 bg-gray-50 dark:bg-slate-950 shadow-sm border-b border-gray-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50">Expense Splitter</h1>
          </div>

          {userName && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold uppercase">
                  {userName.charAt(0)}
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-slate-200 max-w-[160px] truncate">
                  {userName}
                </span>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                >
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Signed in</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <UserIcon className="w-4 h-4 text-gray-500" />
                    Profile
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4 text-gray-500" />
                    Settings
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      {theme === 'dark' ? (
                        <Sun className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Moon className="w-4 h-4 text-blue-600" />
                      )}
                      Theme
                    </span>
                    <span className="text-xs text-gray-500">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                  </button>

                  <div className="border-t border-gray-100">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setShowLogoutDialog(true);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {showLogoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Log out?</h2>
                <p className="text-xs text-gray-500">
                  You’ll need to sign in again to access your groups.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 px-4 py-2 rounded-full bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
