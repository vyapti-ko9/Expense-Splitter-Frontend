import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCircle2, Loader2, Moon, Palette, Shield, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';
import type { User } from '../types';
import { authApi } from '../api/authApi';

type Currency = 'INR' | 'USD' | 'EUR';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [currency] = useState<Currency>(() => {
    const saved = localStorage.getItem('currency');
    return saved === 'USD' || saved === 'EUR' ? saved : 'INR';
  });
  const [notifyExpense, setNotifyExpense] = useState(true);
  const [notifySettlement, setNotifySettlement] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser));
      } catch {
        navigate('/login');
      }
    }
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Enter your password to confirm.');
      return;
    }
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await authApi.deleteAccount(deletePassword);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setDeleteError(ax?.response?.data?.message || 'Could not delete account. Try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const showSaved = () => {
    setMessage('Settings saved.');
    setShowToast(true);
    window.setTimeout(() => {
      setShowToast(false);
      window.setTimeout(() => setMessage(null), 150);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {message && (
        <div
          className={`fixed top-4 right-4 z-10000 transition-all duration-200 ${showToast ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0 pointer-events-none'
            }`}
        >
          <div className="min-w-240px flex items-center gap-2 rounded-xl border border-emerald-300/90 dark:border-emerald-900 bg-green-600 dark:bg-green-400 backdrop-blur-md px-3.5 py-2.5 shadow-[0_10px_30px_rgba(16,185,129,0.18)] dark:shadow-[0_12px_34px_rgba(16,185,129,0.28)] ring-1 ring-emerald-200/60 dark:ring-emerald-400/25">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-white dark:text-emerald-300" />
            <p className="text-sm font-semibold tracking-wide text-white dark:text-emerald-100">{message}</p>
            <button
              type="button"
              onClick={() => {
                setShowToast(false);
                window.setTimeout(() => setMessage(null), 150);
              }}
              className="ml-auto rounded-md p-1 text-white hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-400/10 dark:text-emerald-300"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <Navbar userName={user?.name} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50">Settings</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">Demo UI for app preferences</p>

          <div className="mt-6 space-y-5">
            <section className="rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4 text-blue-600" />
                <h2 className="font-semibold text-gray-900 dark:text-slate-100">Appearance</h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTheme('light');
                    showSaved();
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm ${theme === 'light' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-700 dark:border-slate-700 dark:text-slate-300'}`}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTheme('dark');
                    showSaved();
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm ${theme === 'dark' ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-slate-800' : 'border-gray-300 text-gray-700 dark:border-slate-700 dark:text-slate-300'}`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Moon className="w-4 h-4" />
                    Dark
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
                    setTheme(systemDark ? 'dark' : 'light');
                    showSaved();
                  }}
                  className="rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm text-gray-700 dark:text-slate-300"
                >
                  System
                </button>
              </div>
            </section>

            {/* <section className="rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe2 className="w-4 h-4 text-blue-600" />
                <h2 className="font-semibold text-gray-900 dark:text-slate-100">Currency</h2>
              </div>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value as Currency);
                  showSaved();
                }}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 px-3 py-2"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </section> */}

            <section className="rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-blue-600" />
                <h2 className="font-semibold text-gray-900 dark:text-slate-100">Notifications (Demo)</h2>
              </div>
              <label className="flex items-center justify-between py-2 text-sm text-gray-700 dark:text-slate-300">
                Expense added alerts
                <input
                  type="checkbox"
                  checked={notifyExpense}
                  onChange={(e) => {
                    setNotifyExpense(e.target.checked);
                    showSaved();
                  }}
                />
              </label>
              <label className="flex items-center justify-between py-2 text-sm text-gray-700 dark:text-slate-300">
                Settlement reminders
                <input
                  type="checkbox"
                  checked={notifySettlement}
                  onChange={(e) => {
                    setNotifySettlement(e.target.checked);
                    showSaved();
                  }}
                />
              </label>
            </section>

            <section className="rounded-xl border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-red-600" />
                <h2 className="font-semibold text-red-700 dark:text-red-300">Danger Zone</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                Permanently delete your account and remove you from all groups. Groups you created alone
                will be deleted; in shared groups, ownership moves to another member when possible.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeletePassword('');
                  setDeleteError(null);
                  setShowDeleteModal(true);
                }}
                className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm hover:bg-red-700"
              >
                Delete Account
              </button>
            </section>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-800"
            role="dialog"
            aria-labelledby="delete-account-title"
            aria-modal="true"
          >
            <h2 id="delete-account-title" className="text-lg font-semibold text-gray-900 dark:text-slate-50">
              Delete account?
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
              This cannot be undone. Enter your password to confirm.
            </p>
            <div className="mt-4">
              <label htmlFor="delete-password" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
            </div>
            {deleteError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => !deleteLoading && setShowDeleteModal(false)}
                className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteAccount}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-60"
              >
                {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
