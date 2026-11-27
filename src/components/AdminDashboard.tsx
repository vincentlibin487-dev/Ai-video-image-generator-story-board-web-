import React, { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  ArrowLeft,
  BarChart3,
  KeyRound,
  Layers,
  Lock,
  LogIn,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { AppLang } from '../lib/i18n';
import { ADMIN_EMAIL, auth, googleProvider } from '../lib/firebase';
import { AdminCategoriesManager } from './AdminCategoriesManager';
import { AdminAnalyticsView } from './AdminAnalyticsView';

interface AdminDashboardProps {
  lang: AppLang;
  onClose: () => void;
}

const ADMIN_PASSWORD = 'vengakkal';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ lang, onClose }) => {
  const isMl = lang === 'ml';

  const [passwordInput, setPasswordInput] = useState<string>('');
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('cine_admin_unlocked') === 'true';
  });
  const [authError, setAuthError] = useState<string | null>(null);

  // Default to Analytics Overview first; Categories opens when clicking Categories button
  const [activeTab, setActiveTab] = useState<'analytics' | 'categories'>('analytics');

  // Firebase Auth observation for bootstrapped admin (amalj7767@gmail.com)
  const [adminUser, setAdminUser] = useState<User | null>(() => auth.currentUser);
  const [adminAuthBusy, setAdminAuthBusy] = useState<boolean>(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
    });
    return () => unsub();
  }, []);

  const isVerifiedAdmin = Boolean(
    adminUser &&
      adminUser.emailVerified &&
      adminUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  const handleAdminGoogleSignIn = async () => {
    setAdminAuthBusy(true);
    setAdminAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const code = String(err?.code || '');
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (rErr: any) {
          setAdminAuthError(rErr?.message || 'Google login failed');
        }
      } else if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setAdminAuthError(
          isMl
            ? `ഈ ഡൊമെയ്ൻ (${host}) Firebase Authorized Domains-ൽ ചേർക്കേണ്ടതുണ്ട്.`
            : `Domain "${host}" needs to be added to Firebase Authorized Domains.`
        );
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setAdminAuthError(err instanceof Error ? err.message : 'Google sign-in failed');
      }
    } finally {
      setAdminAuthBusy(false);
    }
  };

  const handleAdminGoogleSignOut = async () => {
    setAdminAuthBusy(true);
    try {
      await signOut(auth);
    } finally {
      setAdminAuthBusy(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passwordInput.trim().toLowerCase();
    if (clean === ADMIN_PASSWORD) {
      setUnlocked(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('cine_admin_unlocked', 'true');
      }
      setAuthError(null);
    } else {
      setAuthError(
        isMl
          ? 'പാസ്സ്‌വേർഡ് തെറ്റാണ്. (vengakkal എന്ന് നൽകുക)'
          : 'Incorrect password. (Please enter vengakkal)'
      );
    }
  };

  return (
    <section className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pb-24 sm:pb-12 space-y-6">
      {/* Top Header */}
      <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 shrink-0">
            {activeTab === 'analytics' ? (
              <BarChart3 className="w-5 h-5" />
            ) : (
              <Layers className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-wide">
              {activeTab === 'analytics'
                ? isMl
                  ? 'അഡ്മിൻ പാനൽ — യൂസർ, എഡിറ്റർ & പരസ്യ നിരീക്ഷണം'
                  : 'Admin Panel — Analytics, Users & System Health'
                : isMl
                ? 'അഡ്മിൻ പാനൽ — കാറ്റഗറികളും ഗാനവരികളും'
                : 'Admin Panel — Categories & Song Lyrics'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {activeTab === 'analytics'
                ? isMl
                  ? 'ഇന്നത്തെ/ഇന്നലത്തെ സന്ദർശകർ, ലോഗിൻ/ഗസ്റ്റ് കണക്ക്, വീഡിയോ എഡിറ്റർ ഉപയോഗം, പ്രോംപ്റ്റ് ഹിസ്റ്ററി, പരസ്യങ്ങളുടെ പ്രവർത്തനം എന്നിവ തത്സമയം കാണാം.'
                  : 'Live visitors (today/yesterday/daily), Gmail vs Guest logins, video editor & prompt logs, and ad diagnostics.'
                : isMl
                ? '14 കാറ്റഗറികളും പുതിയവ ചേർക്കലും, ഓരോ പാട്ടിന്റെ വരികളും വെവ്വേറെ ബോക്സുകളായി കൈകാര്യം ചെയ്യാം.'
                : 'Manage 14 categories, add dynamic categories, and edit song lyrics in separate boxes with 1-click copy.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unlocked && isVerifiedAdmin && (
            <button
              type="button"
              onClick={() => void handleAdminGoogleSignOut()}
              disabled={adminAuthBusy}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              title={adminUser?.email || ADMIN_EMAIL}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="max-w-[140px] truncate">{adminUser?.email}</span>
              <LogOut className="w-3 h-3 opacity-70" />
            </button>
          )}
          {unlocked && !isVerifiedAdmin && (
            <button
              type="button"
              onClick={() => void handleAdminGoogleSignIn()}
              disabled={adminAuthBusy}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isMl ? 'Admin Gmail ലോഗിൻ' : 'Admin Sign-In'}</span>
            </button>
          )}
          {unlocked && (
            <button
              type="button"
              onClick={() => {
                setUnlocked(false);
                setPasswordInput('');
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('cine_admin_unlocked');
                }
              }}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
            >
              {isMl ? 'ലോക്ക് ചെയ്യുക' : 'Lock'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isMl ? 'സ്റ്റുഡിയോയിലേക്ക്' : 'Back to Studio'}</span>
          </button>
        </div>
      </div>

      {/* Password Gate */}
      {!unlocked ? (
        <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-6 sm:p-10 max-w-md mx-auto text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              {isMl ? 'അഡ്മിൻ പാസ്സ്‌വേർഡ് നൽകുക' : 'Enter Admin Password'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {isMl
                ? 'അഡ്മിൻ പാനൽ തുറക്കാൻ പാസ്സ്‌വേർഡ് നൽകുക.'
                : 'Please enter the admin password to access analytics, monitoring, and categories.'}
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 text-left">
              {authError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3 text-left">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {isMl ? 'പാസ്സ്‌വേർഡ് (vengakkal)' : 'Password (vengakkal)'}
              </span>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoFocus
                  placeholder="Enter password..."
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-teal-400 text-sm text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>
            </label>

            <button
              type="submit"
              className="w-full min-h-[44px] px-6 py-3 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isMl ? 'അഡ്മിൻ പാനൽ തുറക്കുക' : 'Open Admin Panel'}</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Primary Admin Section Tabs (Analytics first, Categories on click) */}
          <div className="flex items-center gap-2.5 flex-wrap border-b border-zinc-800 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`min-h-[42px] px-4 py-2.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-teal-400 text-black shadow-lg shadow-teal-500/20'
                  : 'bg-[#11131f] text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>
                {isMl
                  ? 'അനലിറ്റിക്സ്, യൂസർ & പരസ്യ നില'
                  : 'Analytics, Users, Editor & Ads'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`min-h-[42px] px-4 py-2.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === 'categories'
                  ? 'bg-teal-400 text-black shadow-lg shadow-teal-500/20'
                  : 'bg-[#11131f] text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>
                {isMl ? 'കാറ്റഗറികളും ഗാനവരികളും' : 'Categories & Song Lyrics'}
              </span>
            </button>
          </div>

          {activeTab === 'analytics' ? (
            <AdminAnalyticsView
              isMl={isMl}
              adminUser={adminUser}
              onAdminGoogleSignIn={handleAdminGoogleSignIn}
              adminAuthBusy={adminAuthBusy}
              adminAuthError={adminAuthError}
            />
          ) : (
            <AdminCategoriesManager isMl={isMl} />
          )}
        </div>
      )}
    </section>
  );
};
