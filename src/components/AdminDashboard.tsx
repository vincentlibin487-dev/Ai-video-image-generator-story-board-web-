import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Clock,
  Download,
  Film,
  Globe,
  Layers,
  Lock,
  LogOut,
  Monitor,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  UserCheck,
  Users,
  Volume2,
} from 'lucide-react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import {
  ADMIN_EMAIL,
  auth,
  db,
  FIREBASE_QUOTA_UPGRADE_URL,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type { VisitorSessionRecord } from '../lib/analytics';
import { AppLang, LANGUAGE_OPTIONS } from '../lib/i18n';

interface AdminDashboardProps {
  lang: AppLang;
  onClose: () => void;
}

type TimeRangeFilter = 'today' | '7d' | '30d' | 'all';

function getTodayDayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDaysAgoTimestampMs(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function toEpochMs(ts?: Timestamp | null): number {
  if (!ts || typeof ts.toMillis !== 'function') return 0;
  return ts.toMillis();
}

function formatDurationShort(sec: number): string {
  const safe = Math.max(0, Math.round(sec));
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }
  if (mins > 0) return `${mins}m ${String(rem).padStart(2, '0')}s`;
  return `${rem}s`;
}

function formatTimestampLabel(ts?: Timestamp | null): string {
  if (!ts || typeof ts.toDate !== 'function') return '—';
  return ts.toDate().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getLangDisplayName(code: string): string {
  return LANGUAGE_OPTIONS.find((item) => item.code === code)?.nativeName || code.toUpperCase();
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ lang, onClose }) => {
  const isMl = lang === 'ml';

  const [authUser, setAuthUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<VisitorSessionRecord[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<boolean>(false);

  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('all');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'mobile' | 'tablet' | 'desktop'>('all');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [visibleRows, setVisibleRows] = useState<number>(30);

  const isAuthorizedAdmin = Boolean(
    authUser &&
      authUser.emailVerified &&
      authUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !isAuthorizedAdmin) {
      setSessions([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    setDataError(null);
    setQuotaError(false);

    const path = 'visitor_sessions';
    const q = query(
      collection(db, path),
      orderBy('updatedAt', 'desc'),
      limit(500)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const rows: VisitorSessionRecord[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as VisitorSessionRecord),
          sessionId: docSnap.id,
        }));
        setSessions(rows);
        setLoadingData(false);
      },
      (err) => {
        setLoadingData(false);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('quota exceeded')) {
          setQuotaError(true);
        }
        setDataError(msg);
        try {
          handleFirestoreError(err, OperationType.LIST, path);
        } catch {
          // Structured error already logged by handleFirestoreError
        }
      }
    );

    return () => unsub();
  }, [authReady, isAuthorizedAdmin]);

  const handleGoogleSignIn = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-Out failed');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!isAuthorizedAdmin) return;
    setLoadingData(true);
    setDataError(null);
    const path = 'visitor_sessions';
    try {
      const snap = await getDocs(
        query(collection(db, path), orderBy('updatedAt', 'desc'), limit(500))
      );
      setSessions(
        snap.docs.map((docSnap) => ({
          ...(docSnap.data() as VisitorSessionRecord),
          sessionId: docSnap.id,
        }))
      );
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Refresh failed');
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch {
        // Logged
      }
    } finally {
      setLoadingData(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setDeletingId(sessionId);
    const path = `visitor_sessions/${sessionId}`;
    try {
      await deleteDoc(doc(db, 'visitor_sessions', sessionId));
      setConfirmDeleteId(null);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Delete failed');
      try {
        handleFirestoreError(err, OperationType.DELETE, path);
      } catch {
        // Logged
      }
    } finally {
      setDeletingId(null);
    }
  };

  const todayKey = useMemo(() => getTodayDayKey(), []);

  // Time-filtered dataset (drives KPIs & charts)
  const timeFilteredSessions = useMemo(() => {
    if (timeRange === 'all') return sessions;
    if (timeRange === 'today') {
      return sessions.filter((s) => s.dayKey === todayKey);
    }
    const cutoff = getDaysAgoTimestampMs(timeRange === '7d' ? 7 : 30);
    return sessions.filter((s) => {
      const ms = toEpochMs(s.updatedAt) || toEpochMs(s.createdAt);
      return ms >= cutoff;
    });
  }, [sessions, timeRange, todayKey]);

  // Search + Facet filtered dataset (for sessions table)
  const tableSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return timeFilteredSessions.filter((s) => {
      if (deviceFilter !== 'all' && s.deviceType !== deviceFilter) return false;
      if (langFilter !== 'all' && s.language !== langFilter) return false;
      if (!q) return true;
      return (
        s.visitorId.toLowerCase().includes(q) ||
        s.sessionId.toLowerCase().includes(q) ||
        s.referrerSource.toLowerCase().includes(q) ||
        s.language.toLowerCase().includes(q) ||
        s.deviceType.toLowerCase().includes(q)
      );
    });
  }, [timeFilteredSessions, deviceFilter, langFilter, searchQuery]);

  // Core KPI Calculations
  const metrics = useMemo(() => {
    const uniqueVisitors = new Set<string>();
    const returningVisitors = new Set<string>();
    const todayUnique = new Set<string>();
    const recent15mUnique = new Set<string>();
    const cutoff15m = Date.now() - 15 * 60 * 1000;

    let totalAngles = 0;
    let totalBreakdowns = 0;
    let totalTts = 0;
    let totalDurationSec = 0;
    let todaySessionCount = 0;

    for (const s of timeFilteredSessions) {
      uniqueVisitors.add(s.visitorId);
      if (s.isReturning) returningVisitors.add(s.visitorId);
      totalAngles += s.anglesGeneratedCount || 0;
      totalBreakdowns += s.breakdownsGeneratedCount || 0;
      totalTts += s.ttsPlaysCount || 0;
      totalDurationSec += s.activeDurationSec || 0;
    }

    for (const s of sessions) {
      if (s.dayKey === todayKey) {
        todayUnique.add(s.visitorId);
        todaySessionCount += 1;
      }
      const ms = toEpochMs(s.updatedAt);
      if (ms >= cutoff15m) {
        recent15mUnique.add(s.visitorId);
      }
    }

    const avgSessionSec =
      timeFilteredSessions.length > 0
        ? Math.round(totalDurationSec / timeFilteredSessions.length)
        : 0;

    return {
      uniqueVisitorCount: uniqueVisitors.size,
      returningVisitorCount: returningVisitors.size,
      newVisitorCount: Math.max(0, uniqueVisitors.size - returningVisitors.size),
      totalSessions: timeFilteredSessions.length,
      todayUniqueVisitors: todayUnique.size,
      todaySessionCount,
      recentActiveVisitors: recent15mUnique.size,
      totalAngles,
      totalBreakdowns,
      totalTts,
      avgSessionSec,
    };
  }, [timeFilteredSessions, sessions, todayKey]);

  // Daily trend (up to 10 most recent active days)
  const dailyTrend = useMemo(() => {
    const map = new Map<string, { dayKey: string; visitors: Set<string>; sessions: number }>();
    for (const s of timeFilteredSessions) {
      const key = s.dayKey || 'unknown';
      if (!map.has(key)) {
        map.set(key, { dayKey: key, visitors: new Set(), sessions: 0 });
      }
      const bucket = map.get(key)!;
      bucket.visitors.add(s.visitorId);
      bucket.sessions += 1;
    }
    return Array.from(map.values())
      .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
      .slice(-10)
      .map((item) => ({
        dayKey: item.dayKey,
        uniqueCount: item.visitors.size,
        sessionCount: item.sessions,
      }));
  }, [timeFilteredSessions]);

  const maxDailySessions = useMemo(
    () => Math.max(1, ...dailyTrend.map((d) => d.sessionCount)),
    [dailyTrend]
  );

  // Language & Device & Step breakdown
  const breakdowns = useMemo(() => {
    const langs = new Map<string, number>();
    const devices = { mobile: 0, tablet: 0, desktop: 0 };
    const steps = { input: 0, options: 0, prompts: 0 };

    for (const s of timeFilteredSessions) {
      langs.set(s.language, (langs.get(s.language) || 0) + 1);
      if (s.deviceType === 'mobile' || s.deviceType === 'tablet' || s.deviceType === 'desktop') {
        devices[s.deviceType] += 1;
      }
      if (s.currentStep === 'prompts' || (s.breakdownsGeneratedCount || 0) > 0) {
        steps.prompts += 1;
      } else if (s.currentStep === 'options' || (s.anglesGeneratedCount || 0) > 0) {
        steps.options += 1;
      } else {
        steps.input += 1;
      }
    }

    const total = Math.max(1, timeFilteredSessions.length);
    const langRows = Array.from(langs.entries())
      .map(([code, count]) => ({
        code,
        label: getLangDisplayName(code),
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      langRows,
      devices,
      steps,
      total: timeFilteredSessions.length,
    };
  }, [timeFilteredSessions]);

  const handleExportCsv = () => {
    const header = [
      'SessionID',
      'VisitorID',
      'VisitNumber',
      'Returning',
      'Language',
      'Device',
      'Viewport',
      'Referrer',
      'Step',
      'StoriesGenerated',
      'BreakdownsGenerated',
      'VoicePlays',
      'ActiveSeconds',
      'Day',
    ];
    const rows = tableSessions.map((s) => [
      s.sessionId,
      s.visitorId,
      s.visitNumber,
      s.isReturning ? 'Yes' : 'No',
      s.language,
      s.deviceType,
      s.screenCategory,
      s.referrerSource,
      s.currentStep,
      s.anglesGeneratedCount,
      s.breakdownsGeneratedCount,
      s.ttsPlaysCount,
      s.activeDurationSec,
      s.dayKey,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visitor-analytics-${todayKey}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pb-24 sm:pb-12 space-y-6">
      {/* Top Admin Control Header */}
      <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-wide">
              {isMl
                ? 'അഡ്മിൻ പാനൽ — വെബ്സൈറ്റ് സന്ദർശക കണക്കുകൾ'
                : 'Admin Analytics Panel — Anonymous Visitor Tracking'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isMl
                ? 'ലോഗിൻ ചെയ്യാതെ വെബ്സൈറ്റ് ഉപയോഗിക്കുന്ന സന്ദർശകരുടെയും സെഷനുകളുടെയും തത്സമയ വിവരങ്ങൾ.'
                : 'Live anonymous visitor counts, session history, and story usage tracked without requiring guest login.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAuthorizedAdmin && (
            <>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={loadingData}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                <span>{isMl ? 'പുതുക്കുക' : 'Refresh'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={tableSessions.length === 0}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={authBusy}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-zinc-900 hover:bg-red-950/50 border border-zinc-800 hover:border-red-500/40 text-zinc-300 hover:text-red-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isMl ? 'ലോഗ് ഔട്ട്' : 'Sign Out'}</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isMl ? 'സ്റ്റുഡിയോയിലേക്ക്' : 'Back to Studio'}</span>
          </button>
        </div>
      </div>

      {/* Auth Gate 1: Loading Auth State */}
      {!authReady && (
        <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-10 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-zinc-400 font-mono">
            {isMl ? 'അഡ്മിൻ പരിശോധന നടക്കുന്നു...' : 'Verifying admin session...'}
          </p>
        </div>
      )}

      {/* Auth Gate 2: Not Signed In */}
      {authReady && !authUser && (
        <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-6 sm:p-10 max-w-xl mx-auto text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              {isMl ? 'അഡ്മിൻ ലോഗിൻ ആവശ്യമാണ്' : 'Administrator Sign-In Required'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              {isMl
                ? 'സാധാരണ ഉപയോക്താക്കൾക്ക് ലോഗിൻ ഇല്ലാതെ തന്നെ വെബ്സൈറ്റ് ഉപയോഗിക്കാം. എന്നാൽ സന്ദർശകരുടെ കണക്കുകൾ കാണാൻ അഡ്മിൻ Google അക്കൗണ്ട് വഴി ലോഗിൻ ചെയ്യുക.'
                : 'Regular visitors can use the website completely without logging in. Only the authorized administrator can sign in with Google to view visitor analytics.'}
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 text-left">
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={authBusy}
            className="w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {authBusy
                ? isMl
                  ? 'ലോഗിൻ ചെയ്യുന്നു...'
                  : 'Signing in...'
                : isMl
                ? 'Google ഉപയോഗിച്ച് അഡ്മിൻ ലോഗിൻ ചെയ്യുക'
                : 'Sign in with Google (Admin)'}
            </span>
          </button>
        </div>
      )}

      {/* Auth Gate 3: Signed In with Wrong Account */}
      {authReady && authUser && !isAuthorizedAdmin && (
        <div className="bg-[#11131f] border border-red-500/30 rounded-2xl p-6 sm:p-10 max-w-xl mx-auto text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              {isMl ? 'അനുമതിയില്ലാത്ത അക്കൗണ്ട്' : 'Unauthorized Account'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              {isMl
                ? `നിങ്ങൾ ഇപ്പോൾ ${authUser.email || 'Unknown'} എന്ന അക്കൗണ്ടിലാണ് ലോഗിൻ ചെയ്തിരിക്കുന്നത്. അഡ്മിൻ പാനൽ തുറക്കാൻ ${ADMIN_EMAIL} എന്ന അക്കൗണ്ട് ഉപയോഗിക്കുക.`
                : `Signed in as ${authUser.email || 'unknown'}. Please sign in with the authorized admin account (${ADMIN_EMAIL}) to access analytics.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={authBusy}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold cursor-pointer"
            >
              {isMl ? 'മറ്റൊരു അക്കൗണ്ടിലേക്ക് മാറുക' : 'Switch Google Account'}
            </button>
          </div>
        </div>
      )}

      {/* Authenticated Admin Dashboard Content */}
      {authReady && isAuthorizedAdmin && (
        <>
          {/* Quota / Error Alerts */}
          {quotaError && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                {isMl
                  ? 'Firestore സൗജന്യ ദൈനംദിന റീഡ് പരിധി (Quota) കഴിഞ്ഞു. നാളെ റീസെറ്റ് ആകും അല്ലെങ്കിൽ പ്ലാൻ അപ്ഗ്രേഡ് ചെയ്യാം.'
                  : 'Firestore free daily quota exceeded. Quota resets tomorrow or can be upgraded in Firebase Console.'}
              </span>
              <a
                href={FIREBASE_QUOTA_UPGRADE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold text-amber-400 shrink-0"
              >
                Firebase Console ↗
              </a>
            </div>
          )}

          {dataError && !quotaError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {dataError}
            </div>
          )}

          {/* Timeframe Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#11131f] border border-zinc-800 rounded-2xl p-3.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'today', label: isMl ? 'ഇന്ന്' : 'Today' },
                  { id: '7d', label: isMl ? '7 ദിവസം' : 'Last 7 Days' },
                  { id: '30d', label: isMl ? '30 ദിവസം' : 'Last 30 Days' },
                  { id: 'all', label: isMl ? 'എല്ലാക്കാലവും' : 'All Time' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTimeRange(opt.id);
                    setVisibleRows(30);
                  }}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    timeRange === opt.id
                      ? 'bg-amber-500 text-black font-extrabold'
                      : 'bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono tabular-nums">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{authUser?.email}</span>
              <span className="text-zinc-600">•</span>
              <span>
                {isMl ? 'കഴിഞ്ഞ 15 മിനിറ്റിൽ:' : 'Active (15m):'}{' '}
                <strong className="text-white">{metrics.recentActiveVisitors}</strong>
              </span>
            </div>
          </div>

          {/* Primary KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* KPI 1: Unique Anonymous Visitors */}
            <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold">
                  {isMl ? 'ആകെ സന്ദർശകർ (Unique)' : 'Unique Visitors'}
                </span>
                <Users className="w-4 h-4 text-amber-400 shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                {loadingData ? '—' : metrics.uniqueVisitorCount.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono tabular-nums">
                {isMl
                  ? `പുതിയവർ: ${metrics.newVisitorCount} | വീണ്ടും വന്നവർ: ${metrics.returningVisitorCount}`
                  : `New: ${metrics.newVisitorCount} | Returning: ${metrics.returningVisitorCount}`}
              </div>
            </div>

            {/* KPI 2: Total Sessions */}
            <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold">
                  {isMl ? 'ആകെ ഉപയോഗ സെഷനുകൾ' : 'Total Sessions'}
                </span>
                <Layers className="w-4 h-4 text-sky-400 shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                {loadingData ? '—' : metrics.totalSessions.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono tabular-nums">
                {isMl
                  ? `ശരാശരി സമയം: ${formatDurationShort(metrics.avgSessionSec)}`
                  : `Avg session: ${formatDurationShort(metrics.avgSessionSec)}`}
              </div>
            </div>

            {/* KPI 3: Active Today */}
            <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold">
                  {isMl ? 'ഇന്ന് ഉപയോഗിച്ചവർ' : 'Visitors Today'}
                </span>
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                {loadingData ? '—' : metrics.todayUniqueVisitors.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono tabular-nums">
                {isMl
                  ? `ഇന്നത്തെ സെഷനുകൾ: ${metrics.todaySessionCount}`
                  : `Sessions today: ${metrics.todaySessionCount}`}
              </div>
            </div>

            {/* KPI 4: Stories & Prompts Generated */}
            <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold">
                  {isMl ? 'നിർമ്മിച്ച കഥകളും പ്രോംപ്റ്റുകളും' : 'Stories & Prompts'}
                </span>
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                {loadingData
                  ? '—'
                  : (metrics.totalAngles + metrics.totalBreakdowns).toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono tabular-nums">
                {isMl
                  ? `കഥകൾ: ${metrics.totalAngles} | പ്രോംപ്റ്റ്: ${metrics.totalBreakdowns} | വോയിസ്: ${metrics.totalTts}`
                  : `Angles: ${metrics.totalAngles} | Prompts: ${metrics.totalBreakdowns} | TTS: ${metrics.totalTts}`}
              </div>
            </div>
          </div>

          {/* Analytics Visual Row: Daily Activity + Language + Device Mix */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Daily Usage Trend */}
            <div className="lg:col-span-6 bg-[#11131f] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span>{isMl ? 'ദിവസേനയുള്ള സന്ദർശക കണക്ക്' : 'Daily Sessions & Visitors'}</span>
                </h3>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {isMl ? 'അവസാന 10 ദിവസങ്ങൾ' : 'Recent active days'}
                </span>
              </div>

              {dailyTrend.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-500">
                  {isMl ? 'തിരഞ്ഞെടുത്ത കാലയളവിൽ വിവരങ്ങൾ ഇല്ല.' : 'No sessions in this range yet.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dailyTrend.map((day) => {
                    const widthPct = Math.max(
                      6,
                      Math.round((day.sessionCount / maxDailySessions) * 100)
                    );
                    return (
                      <div key={day.dayKey} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                          <span className="text-zinc-300">{day.dayKey}</span>
                          <span className="text-zinc-400">
                            <strong className="text-white">{day.uniqueCount}</strong>{' '}
                            {isMl ? 'പേർ' : 'users'} ·{' '}
                            <strong className="text-amber-400">{day.sessionCount}</strong>{' '}
                            {isMl ? 'സെഷൻ' : 'visits'}
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Language & Device Breakdown */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Language Distribution */}
              <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span>{isMl ? 'ഉപയോഗിച്ച ഭാഷകൾ' : 'Languages Used'}</span>
                </h3>
                {breakdowns.langRows.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">
                    {isMl ? 'വിവരങ്ങൾ ഇല്ല' : 'No data yet'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {breakdowns.langRows.map((row) => (
                      <div key={row.code} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                          <span className="text-zinc-200 font-sans font-semibold">{row.label}</span>
                          <span className="text-zinc-400">
                            {row.count} ({row.pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-400"
                            style={{ width: `${Math.max(4, row.pct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Device & Studio Funnel */}
              <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="space-y-2.5">
                  <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    <span>{isMl ? 'ഡിവൈസുകൾ' : 'Devices'}</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-center font-mono tabular-nums">
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2">
                      <Smartphone className="w-3.5 h-3.5 text-zinc-400 mx-auto mb-1" />
                      <div className="text-sm font-bold text-white">{breakdowns.devices.mobile}</div>
                      <div className="text-[10px] text-zinc-400">Mobile</div>
                    </div>
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2">
                      <Tablet className="w-3.5 h-3.5 text-zinc-400 mx-auto mb-1" />
                      <div className="text-sm font-bold text-white">{breakdowns.devices.tablet}</div>
                      <div className="text-[10px] text-zinc-400">Tablet</div>
                    </div>
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2">
                      <Monitor className="w-3.5 h-3.5 text-zinc-400 mx-auto mb-1" />
                      <div className="text-sm font-bold text-white">{breakdowns.devices.desktop}</div>
                      <div className="text-[10px] text-zinc-400">Desktop</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                  <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isMl ? 'ഉപയോഗ ഘട്ടങ്ങൾ' : 'Funnel Reach'}</span>
                  </div>
                  <div className="space-y-1 text-[11px] font-mono tabular-nums text-zinc-400">
                    <div className="flex justify-between">
                      <span>{isMl ? '1. ആമുഖം മാത്രം' : '1. Concept Only'}</span>
                      <span className="text-zinc-200">{breakdowns.steps.input}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isMl ? '2. കഥകൾ കണ്ടവർ' : '2. Story Options'}</span>
                      <span className="text-amber-400">{breakdowns.steps.options}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isMl ? '3. പ്രോംപ്റ്റുകൾ എടുത്തവർ' : '3. Shot Prompts'}</span>
                      <span className="text-emerald-400">{breakdowns.steps.prompts}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Controls + Sessions Table */}
          <div className="bg-[#11131f] border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-white">
                  {isMl
                    ? `സന്ദർശക സെഷൻ പട്ടിക (${tableSessions.length})`
                    : `Guest Usage Sessions (${tableSessions.length})`}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {isMl
                    ? 'വ്യക്തിഗത വിവരങ്ങളൊന്നും ശേഖരിക്കാതെ തന്നെ ഓരോ സന്ദർശനവും ഇവിടെ രേഖപ്പെടുത്തുന്നു.'
                    : 'Every anonymous guest session is tracked with zero personal information.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:flex-none min-w-[190px]">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isMl ? 'Visitor ID / Referrer തിരയുക...' : 'Search visitor ID / source...'}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={deviceFilter}
                  onChange={(e) => setDeviceFilter(e.target.value as typeof deviceFilter)}
                  className="px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">{isMl ? 'എല്ലാ ഡിവൈസും' : 'All Devices'}</option>
                  <option value="mobile">Mobile</option>
                  <option value="tablet">Tablet</option>
                  <option value="desktop">Desktop</option>
                </select>

                <select
                  value={langFilter}
                  onChange={(e) => setLangFilter(e.target.value)}
                  className="px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">{isMl ? 'എല്ലാ ഭാഷയും' : 'All Languages'}</option>
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.nativeName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingData ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                {isMl ? 'കണക്കുകൾ ലോഡ് ചെയ്യുന്നു...' : 'Loading visitor sessions...'}
              </div>
            ) : tableSessions.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Users className="w-7 h-7 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400">
                  {isMl
                    ? 'ഈ ഫിൽട്ടറിൽ സന്ദർശക വിവരങ്ങളൊന്നും കണ്ടെത്തിയില്ല.'
                    : 'No visitor sessions match the current filters.'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-bold">
                        <th className="py-3 px-4">{isMl ? 'സന്ദർശകൻ' : 'Visitor'}</th>
                        <th className="py-3 px-3">{isMl ? 'ഭാഷ' : 'Language'}</th>
                        <th className="py-3 px-3">{isMl ? 'ഡിവൈസ്' : 'Device'}</th>
                        <th className="py-3 px-3">{isMl ? 'ഉറവിടം' : 'Source'}</th>
                        <th className="py-3 px-3">{isMl ? 'ഘട്ടം' : 'Step'}</th>
                        <th className="py-3 px-3 text-right">{isMl ? 'കഥ / പ്രോംപ്റ്റ്' : 'Activity'}</th>
                        <th className="py-3 px-3 text-right">{isMl ? 'സമയം' : 'Active'}</th>
                        <th className="py-3 px-4 text-right">{isMl ? 'അവസാന സമയം' : 'Last Seen'}</th>
                        <th className="py-3 px-3 text-right" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70 font-mono tabular-nums">
                      {tableSessions.slice(0, visibleRows).map((s) => (
                        <tr key={s.sessionId} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="text-zinc-200 font-bold">
                              #{s.visitorId.slice(-8)}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-sans">
                              {isMl
                                ? `സന്ദർശനം #${s.visitNumber}`
                                : `Visit #${s.visitNumber}`}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-sans text-zinc-300">
                            {getLangDisplayName(s.language)}
                          </td>
                          <td className="py-3 px-3 text-zinc-300">
                            <span className="capitalize">{s.deviceType}</span>
                            <span className="block text-[10px] text-zinc-500">
                              {s.screenCategory}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-zinc-400 max-w-[140px] truncate">
                            {s.referrerSource || 'direct'}
                          </td>
                          <td className="py-3 px-3 font-sans">
                            <span
                              className={`text-[11px] font-bold ${
                                s.currentStep === 'prompts'
                                  ? 'text-emerald-400'
                                  : s.currentStep === 'options'
                                  ? 'text-amber-400'
                                  : 'text-zinc-400'
                              }`}
                            >
                              {s.currentStep === 'prompts'
                                ? isMl
                                  ? 'പ്രോംപ്റ്റുകൾ'
                                  : 'Prompts'
                                : s.currentStep === 'options'
                                ? isMl
                                  ? 'കഥകൾ'
                                  : 'Stories'
                                : isMl
                                ? 'ആമുഖം'
                                : 'Concept'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-300">
                            <span>
                              {s.anglesGeneratedCount} / {s.breakdownsGeneratedCount}
                            </span>
                            {(s.ttsPlaysCount || 0) > 0 && (
                              <span className="inline-flex items-center gap-0.5 ml-1.5 text-[10px] text-amber-400">
                                <Volume2 className="w-3 h-3" />
                                {s.ttsPlaysCount}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-300">
                            {formatDurationShort(s.activeDurationSec || 0)}
                          </td>
                          <td className="py-3 px-4 text-right text-zinc-400 font-sans whitespace-nowrap">
                            {formatTimestampLabel(s.updatedAt || s.createdAt)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {confirmDeleteId === s.sessionId ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={deletingId === s.sessionId}
                                  onClick={() => handleDeleteSession(s.sessionId)}
                                  className="px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-sans font-bold cursor-pointer"
                                >
                                  {isMl ? 'ഉറപ്പ്' : 'Confirm'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-[10px] font-sans cursor-pointer"
                                >
                                  {isMl ? 'വേണ്ട' : 'Cancel'}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(s.sessionId)}
                                title={isMl ? 'നീക്കം ചെയ്യുക' : 'Delete session'}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {tableSessions.length > visibleRows && (
                  <div className="p-3 border-t border-zinc-800 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleRows((prev) => prev + 30)}
                      className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-amber-400 cursor-pointer"
                    >
                      {isMl
                        ? `കൂടുതൽ കാണുക (${visibleRows} / ${tableSessions.length})`
                        : `Show More (${visibleRows} / ${tableSessions.length})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
};
