import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  Film,
  Globe,
  Heart,
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
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
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
  FIREBASE_AUTH_DOMAINS_URL,
  FIREBASE_QUOTA_UPGRADE_URL,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type { GenerationLogRecord, VisitorSessionRecord } from '../lib/analytics';
import type { UserAccountRecord } from '../lib/storySync';
import { AppLang, LANGUAGE_OPTIONS } from '../lib/i18n';
import { BookOpen, Calendar, FileText, Mail } from 'lucide-react';

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
  const [userAccounts, setUserAccounts] = useState<UserAccountRecord[]>([]);
  const [generationLogs, setGenerationLogs] = useState<GenerationLogRecord[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userAccountFilter, setUserAccountFilter] = useState<'all' | 'today'>('all');
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [userStoriesMap, setUserStoriesMap] = useState<
    Record<
      string,
      {
        loading: boolean;
        error?: string;
        stories: Array<{
          id: string;
          title: string;
          genre: string;
          durationDisplay: string;
          shotCount: number;
          isLoved: boolean;
          storySummary: string;
          savedAtMs: number;
        }>;
      }
    >
  >({});
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logAuthFilter, setLogAuthFilter] = useState<'all' | 'guest' | 'gmail'>('all');
  const [visibleLogs, setVisibleLogs] = useState<number>(25);
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

  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const isInIframe =
    typeof window !== 'undefined' &&
    (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

  useEffect(() => {
    let active = true;
    getRedirectResult(auth).catch((err: any) => {
      if (!active || !err) return;
      const code = String(err?.code || '');
      if (code === 'auth/unauthorized-domain' && typeof window !== 'undefined') {
        setUnauthorizedDomain(window.location.hostname);
      }
      setAuthError(err instanceof Error ? err.message : String(err));
    });
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!active) return;
      setAuthUser(user);
      setAuthReady(true);
    });
    return () => {
      active = false;
      unsub();
    };
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
    let cancelled = false;
    let activeUnsub: (() => void) | null = null;

    const subscribe = (useOrderedQuery: boolean) => {
      const q = useOrderedQuery
        ? query(collection(db, path), orderBy('updatedAt', 'desc'), limit(2000))
        : query(collection(db, path), limit(2000));

      activeUnsub = onSnapshot(
        q,
        (snapshot) => {
          if (cancelled) return;
          const rows: VisitorSessionRecord[] = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as VisitorSessionRecord),
            sessionId: docSnap.id,
          }));
          if (!useOrderedQuery) {
            rows.sort(
              (a, b) =>
                (toEpochMs(b.updatedAt) || toEpochMs(b.createdAt)) -
                (toEpochMs(a.updatedAt) || toEpochMs(a.createdAt))
            );
          }
          setSessions(rows);
          setLoadingData(false);
        },
        (err) => {
          if (cancelled) return;
          const msg = err instanceof Error ? err.message : String(err);
          const lowerMsg = msg.toLowerCase();
          if (
            useOrderedQuery &&
            (lowerMsg.includes('failed-precondition') || lowerMsg.includes('index'))
          ) {
            activeUnsub?.();
            subscribe(false);
            return;
          }
          setLoadingData(false);
          if (lowerMsg.includes('quota exceeded')) {
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
    };

    subscribe(true);

    // Subscribe to signed-in Google (Gmail) user accounts for Today's Logins & Saved Stories tracking
    const usersPath = 'user_accounts';
    let activeUsersUnsub: (() => void) | null = null;
    const subscribeUsers = (useOrderedQuery: boolean) => {
      const uq = useOrderedQuery
        ? query(collection(db, usersPath), orderBy('lastLoginAt', 'desc'), limit(500))
        : query(collection(db, usersPath), limit(500));

      activeUsersUnsub = onSnapshot(
        uq,
        (snapshot) => {
          if (cancelled) return;
          const rows: UserAccountRecord[] = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as UserAccountRecord),
            uid: docSnap.id,
          }));
          if (!useOrderedQuery) {
            rows.sort(
              (a, b) =>
                (toEpochMs(b.lastLoginAt) || toEpochMs(b.createdAt)) -
                (toEpochMs(a.lastLoginAt) || toEpochMs(a.createdAt))
            );
          }
          setUserAccounts(rows);
        },
        (err) => {
          if (cancelled) return;
          const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
          if (useOrderedQuery && (msg.includes('failed-precondition') || msg.includes('index'))) {
            activeUsersUnsub?.();
            subscribeUsers(false);
            return;
          }
          try {
            handleFirestoreError(err, OperationType.LIST, usersPath);
          } catch {
            // Logged
          }
        }
      );
    };
    subscribeUsers(true);

    // Subscribe to generation_logs (All searched premises & generated story/prompt details)
    const logsPath = 'generation_logs';
    let activeLogsUnsub: (() => void) | null = null;
    const subscribeLogs = (useOrderedQuery: boolean) => {
      const lq = useOrderedQuery
        ? query(collection(db, logsPath), orderBy('createdAt', 'desc'), limit(1000))
        : query(collection(db, logsPath), limit(1000));

      activeLogsUnsub = onSnapshot(
        lq,
        (snapshot) => {
          if (cancelled) return;
          const rows: GenerationLogRecord[] = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as GenerationLogRecord),
            logId: docSnap.id,
          }));
          if (!useOrderedQuery) {
            rows.sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
          }
          setGenerationLogs(rows);
        },
        (err) => {
          if (cancelled) return;
          const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
          if (useOrderedQuery && (msg.includes('failed-precondition') || msg.includes('index'))) {
            activeLogsUnsub?.();
            subscribeLogs(false);
            return;
          }
          try {
            handleFirestoreError(err, OperationType.LIST, logsPath);
          } catch {
            // Logged
          }
        }
      );
    };
    subscribeLogs(true);

    return () => {
      cancelled = true;
      activeUnsub?.();
      activeUsersUnsub?.();
      activeLogsUnsub?.();
    };
  }, [authReady, isAuthorizedAdmin]);

  const formatAuthError = (err: any): string => {
    const code = String(err?.code || '');
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (code === 'auth/unauthorized-domain') {
      setUnauthorizedDomain(host);
      return isMl
        ? `ഈ വെബ്സൈറ്റ് ഡൊമെയ്ൻ (${host}) Firebase-ൽ അനുവദിച്ചിട്ടില്ല (auth/unauthorized-domain). Firebase Console -> Authentication -> Settings -> Authorized domains-ൽ ഈ ഡൊമെയ്ൻ ചേർക്കുക.`
        : `Domain "${host}" is not in Firebase Authorized Domains. Add it under Firebase Console -> Authentication -> Settings -> Authorized domains.`;
    }
    if (code === 'auth/popup-blocked') {
      return isMl
        ? 'ബ്രൗസർ ലോഗിൻ പോപ്പ്-അപ്പ് തടഞ്ഞു. പോപ്പ്-അപ്പ് അനുവദിക്കുകയോ അല്ലെങ്കിൽ താഴെയുള്ള "പുതിയ ടാബിൽ തുറക്കുക" ബട്ടൺ ഉപയോഗിക്കുകയോ ചെയ്യുക.'
        : 'Sign-in popup was blocked by your browser. Allow popups or open the Admin Panel in a new tab.';
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return isMl
        ? 'Google ലോഗിൻ വിൻഡോ പൂർത്തിയാക്കുന്നതിന് മുമ്പ് അടച്ചുപോയി. വീണ്ടും ശ്രമിക്കുക.'
        : 'Google sign-in window was closed before completing login. Please try again.';
    }
    return err instanceof Error ? err.message : 'Google Sign-In failed';
  };

  const handleGoogleSignIn = async () => {
    setAuthBusy(true);
    setAuthError(null);
    setUnauthorizedDomain(null);
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
        } catch (redirectErr) {
          setAuthError(formatAuthError(redirectErr));
        }
      } else {
        setAuthError(formatAuthError(err));
      }
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
      let snap;
      let sortedClientSide = false;
      try {
        snap = await getDocs(
          query(collection(db, path), orderBy('updatedAt', 'desc'), limit(2000))
        );
      } catch (orderErr: any) {
        const msg = String(orderErr?.message || '').toLowerCase();
        if (msg.includes('failed-precondition') || msg.includes('index')) {
          snap = await getDocs(query(collection(db, path), limit(2000)));
          sortedClientSide = true;
        } else {
          throw orderErr;
        }
      }
      const rows = snap.docs.map((docSnap) => ({
        ...(docSnap.data() as VisitorSessionRecord),
        sessionId: docSnap.id,
      }));
      if (sortedClientSide) {
        rows.sort(
          (a, b) =>
            (toEpochMs(b.updatedAt) || toEpochMs(b.createdAt)) -
            (toEpochMs(a.updatedAt) || toEpochMs(a.createdAt))
        );
      }
      setSessions(rows);

      // Refresh signed-in Gmail accounts list
      try {
        let userSnap;
        let sortUsersClient = false;
        try {
          userSnap = await getDocs(
            query(collection(db, 'user_accounts'), orderBy('lastLoginAt', 'desc'), limit(500))
          );
        } catch (uErr: any) {
          const uMsg = String(uErr?.message || '').toLowerCase();
          if (uMsg.includes('failed-precondition') || uMsg.includes('index')) {
            userSnap = await getDocs(query(collection(db, 'user_accounts'), limit(500)));
            sortUsersClient = true;
          } else {
            throw uErr;
          }
        }
        const userRows: UserAccountRecord[] = userSnap.docs.map((docSnap) => ({
          ...(docSnap.data() as UserAccountRecord),
          uid: docSnap.id,
        }));
        if (sortUsersClient) {
          userRows.sort(
            (a, b) =>
              (toEpochMs(b.lastLoginAt) || toEpochMs(b.createdAt)) -
              (toEpochMs(a.lastLoginAt) || toEpochMs(a.createdAt))
          );
        }
        setUserAccounts(userRows);
      } catch {}

      // Refresh generation_logs
      try {
        let logSnap;
        let sortLogsClient = false;
        try {
          logSnap = await getDocs(
            query(collection(db, 'generation_logs'), orderBy('createdAt', 'desc'), limit(1000))
          );
        } catch (lErr: any) {
          const lMsg = String(lErr?.message || '').toLowerCase();
          if (lMsg.includes('failed-precondition') || lMsg.includes('index')) {
            logSnap = await getDocs(query(collection(db, 'generation_logs'), limit(1000)));
            sortLogsClient = true;
          } else {
            throw lErr;
          }
        }
        const logRows: GenerationLogRecord[] = logSnap.docs.map((docSnap) => ({
          ...(docSnap.data() as GenerationLogRecord),
          logId: docSnap.id,
        }));
        if (sortLogsClient) {
          logRows.sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
        }
        setGenerationLogs(logRows);
      } catch {}

      if (expandedUid) {
        void loadUserSavedStories(expandedUid, true);
      }
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

  const loadUserSavedStories = async (uid: string, force = false) => {
    if (!isAuthorizedAdmin || !uid) return;
    if (!force && userStoriesMap[uid] && !userStoriesMap[uid].error) return;

    setUserStoriesMap((prev) => ({
      ...prev,
      [uid]: { loading: true, stories: prev[uid]?.stories || [] },
    }));

    const storiesPath = `user_accounts/${uid}/saved_stories`;
    try {
      const snap = await getDocs(query(collection(db, storiesPath), limit(50)));
      const stories = snap.docs
        .map((d) => {
          const raw = d.data() as Record<string, any>;
          return {
            id: d.id,
            title: String(raw.title || 'Untitled Story'),
            genre: String(raw.genre || 'Cinematic'),
            durationDisplay: String(raw.durationDisplay || ''),
            shotCount: Number(raw.shotCount || 0),
            isLoved: Boolean(raw.isLoved),
            storySummary: String(raw.storySummary || ''),
            savedAtMs: Number(raw.savedAtMs || 0),
          };
        })
        .sort((a, b) => {
          if (a.isLoved !== b.isLoved) return a.isLoved ? -1 : 1;
          return (b.savedAtMs || 0) - (a.savedAtMs || 0);
        });

      setUserStoriesMap((prev) => ({
        ...prev,
        [uid]: { loading: false, stories },
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUserStoriesMap((prev) => ({
        ...prev,
        [uid]: { loading: false, stories: [], error: msg },
      }));
    }
  };

  const handleToggleExpandUser = (uid: string) => {
    if (expandedUid === uid) {
      setExpandedUid(null);
      return;
    }
    setExpandedUid(uid);
    void loadUserSavedStories(uid);
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
        (s.userEmail || '').toLowerCase().includes(q) ||
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

  const gmailMetrics = useMemo(() => {
    const todayLogins = userAccounts.filter((u) => u.lastDayKey === todayKey).length;
    const totalCloudStories = userAccounts.reduce(
      (sum, u) => sum + (Number(u.savedStoriesCount) || 0),
      0
    );
    const totalLoginEvents = userAccounts.reduce((sum, u) => sum + (Number(u.loginCount) || 0), 0);
    return {
      totalAccounts: userAccounts.length,
      todayLogins,
      totalCloudStories,
      totalLoginEvents,
    };
  }, [userAccounts, todayKey]);

  const filteredUserAccounts = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    return userAccounts.filter((u) => {
      if (userAccountFilter === 'today' && u.lastDayKey !== todayKey) return false;
      if (!q) return true;
      return (
        (u.email || '').toLowerCase().includes(q) ||
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.uid || '').toLowerCase().includes(q)
      );
    });
  }, [userAccounts, userSearchQuery, userAccountFilter, todayKey]);

  // Historical vs Today Split + Guest (Without Gmail) vs Logged-in + Generator Stats
  const usageBreakdown = useMemo(() => {
    const allVisitors = new Set<string>();
    const pastVisitors = new Set<string>();
    const todayVisitors = new Set<string>();
    const guestOnlyVisitors = new Set<string>();
    const guestTodayVisitors = new Set<string>();
    const guestPastVisitors = new Set<string>();
    const generatorVisitors = new Set<string>();
    const guestGeneratorVisitors = new Set<string>();
    const gmailGeneratorEmails = new Set<string>();

    let guestSessionsTotal = 0;
    let guestSessionsToday = 0;
    let guestSessionsPast = 0;
    let pastSessionsTotal = 0;

    for (const s of sessions) {
      allVisitors.add(s.visitorId);
      const isToday = s.dayKey === todayKey;
      const hasGenerated = (s.anglesGeneratedCount || 0) > 0 || (s.breakdownsGeneratedCount || 0) > 0;
      const isGmail = Boolean(s.isLoggedIn && s.userEmail);

      if (isToday) {
        todayVisitors.add(s.visitorId);
      } else {
        pastVisitors.add(s.visitorId);
        pastSessionsTotal += 1;
      }

      if (!isGmail) {
        guestSessionsTotal += 1;
        guestOnlyVisitors.add(s.visitorId);
        if (isToday) {
          guestSessionsToday += 1;
          guestTodayVisitors.add(s.visitorId);
        } else {
          guestSessionsPast += 1;
          guestPastVisitors.add(s.visitorId);
        }
      }

      if (hasGenerated) {
        generatorVisitors.add(s.visitorId);
        if (isGmail && s.userEmail) {
          gmailGeneratorEmails.add(s.userEmail.toLowerCase());
        } else {
          guestGeneratorVisitors.add(s.visitorId);
        }
      }
    }

    for (const log of generationLogs) {
      generatorVisitors.add(log.visitorId);
      if (log.isLoggedIn && log.userEmail) {
        gmailGeneratorEmails.add(log.userEmail.toLowerCase());
      } else {
        guestGeneratorVisitors.add(log.visitorId);
      }
    }

    // Complete Day-by-Day Historical Breakdown (today + all prior active days)
    const dayMap = new Map<
      string,
      {
        dayKey: string;
        visitors: Set<string>;
        guestVisitors: Set<string>;
        gmailUsers: Set<string>;
        generators: Set<string>;
        sessions: number;
        angles: number;
        prompts: number;
        searches: number;
      }
    >();

    const ensureDay = (k: string) => {
      const key = k || 'unknown';
      if (!dayMap.has(key)) {
        dayMap.set(key, {
          dayKey: key,
          visitors: new Set(),
          guestVisitors: new Set(),
          gmailUsers: new Set(),
          generators: new Set(),
          sessions: 0,
          angles: 0,
          prompts: 0,
          searches: 0,
        });
      }
      return dayMap.get(key)!;
    };

    for (const s of sessions) {
      const b = ensureDay(s.dayKey);
      b.visitors.add(s.visitorId);
      b.sessions += 1;
      b.angles += s.anglesGeneratedCount || 0;
      b.prompts += s.breakdownsGeneratedCount || 0;
      if (s.isLoggedIn && s.userEmail) {
        b.gmailUsers.add(s.userEmail.toLowerCase());
      } else {
        b.guestVisitors.add(s.visitorId);
      }
      if ((s.anglesGeneratedCount || 0) > 0 || (s.breakdownsGeneratedCount || 0) > 0) {
        b.generators.add(s.visitorId);
      }
    }

    for (const u of userAccounts) {
      if (u.lastDayKey && u.email) {
        const b = ensureDay(u.lastDayKey);
        b.gmailUsers.add(u.email.toLowerCase());
      }
    }

    for (const log of generationLogs) {
      const b = ensureDay(log.dayKey);
      b.searches += 1;
      b.generators.add(log.visitorId);
      if (log.isLoggedIn && log.userEmail) {
        b.gmailUsers.add(log.userEmail.toLowerCase());
      }
    }

    const dailyHistory = Array.from(dayMap.values())
      .sort((a, b) => b.dayKey.localeCompare(a.dayKey))
      .map((item) => ({
        dayKey: item.dayKey,
        uniqueVisitors: item.visitors.size,
        guestVisitors: item.guestVisitors.size,
        gmailUsers: item.gmailUsers.size,
        generators: item.generators.size,
        sessions: item.sessions,
        angles: item.angles,
        prompts: item.prompts,
        searches: item.searches,
      }));

    return {
      allVisitorsCount: allVisitors.size,
      pastVisitorsCount: pastVisitors.size,
      todayVisitorsCount: todayVisitors.size,
      pastSessionsTotal,
      guestVisitorsTotal: guestOnlyVisitors.size,
      guestTodayVisitors: guestTodayVisitors.size,
      guestPastVisitors: guestPastVisitors.size,
      guestSessionsTotal,
      guestSessionsToday,
      guestSessionsPast,
      generatorVisitorsCount: generatorVisitors.size,
      guestGeneratorCount: guestGeneratorVisitors.size,
      gmailGeneratorCount: gmailGeneratorEmails.size,
      dailyHistory,
    };
  }, [sessions, userAccounts, generationLogs, todayKey]);

  const filteredGenerationLogs = useMemo(() => {
    const q = logSearchQuery.trim().toLowerCase();
    return generationLogs.filter((log) => {
      if (logAuthFilter === 'guest' && log.isLoggedIn) return false;
      if (logAuthFilter === 'gmail' && !log.isLoggedIn) return false;
      if (!q) return true;
      return (
        log.searchPremise.toLowerCase().includes(q) ||
        log.selectedStoryTitle.toLowerCase().includes(q) ||
        log.userEmail.toLowerCase().includes(q) ||
        log.visitorId.toLowerCase().includes(q) ||
        (log.generatedTitles || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [generationLogs, logSearchQuery, logAuthFilter]);

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
      'UserType',
      'GmailEmail',
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
      s.isLoggedIn && s.userEmail ? 'Gmail' : 'Guest',
      s.userEmail || '',
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
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 text-left space-y-2">
              <p className="leading-relaxed">{authError}</p>
              {unauthorizedDomain && (
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <code className="px-2 py-1 rounded bg-black/50 text-amber-300 font-mono">
                    {unauthorizedDomain}
                  </code>
                  <a
                    href={FIREBASE_AUTH_DOMAINS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline font-bold text-amber-400 hover:text-amber-300"
                  >
                    <span>{isMl ? 'Firebase Authorized Domains തുറക്കുക' : 'Open Firebase Auth Domains'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
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

            {isInIframe && typeof window !== 'undefined' && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto min-h-[44px] px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold inline-flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>{isMl ? 'പുതിയ ടാബിൽ തുറക്കുക' : 'Open in New Tab'}</span>
              </a>
            )}
          </div>
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

          {/* Extended Historical & Guest vs Logged-In Comparison Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-4 space-y-1.5">
              <div className="text-xs font-bold text-zinc-400">
                {isMl ? 'ജിമെയിൽ ഇല്ലാതെ ഉപയോഗിച്ചവർ (Guest)' : 'Used Without Gmail (Guest)'}
              </div>
              <div className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums">
                {loadingData ? '—' : usageBreakdown.guestVisitorsTotal.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                {isMl
                  ? `ഇന്ന്: ${usageBreakdown.guestTodayVisitors} | ഇതിനുമുമ്പ്: ${usageBreakdown.guestPastVisitors} (${usageBreakdown.guestSessionsTotal} സെഷൻ)`
                  : `Today: ${usageBreakdown.guestTodayVisitors} | Before today: ${usageBreakdown.guestPastVisitors}`}
              </div>
            </div>

            <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-4 space-y-1.5">
              <div className="text-xs font-bold text-zinc-400">
                {isMl ? 'മുമ്പത്തെ ദിവസങ്ങളിലും ഇന്നും കയറിയവർ' : 'All-Time & Historical Visitors'}
              </div>
              <div className="text-2xl font-extrabold text-sky-400 font-mono tabular-nums">
                {loadingData ? '—' : usageBreakdown.allVisitorsCount.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                {isMl
                  ? `ഇന്ന്: ${usageBreakdown.todayVisitorsCount} | ഇതിനുമുമ്പ്: ${usageBreakdown.pastVisitorsCount}`
                  : `Today: ${usageBreakdown.todayVisitorsCount} | Before today: ${usageBreakdown.pastVisitorsCount}`}
              </div>
            </div>

            <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-4 space-y-1.5">
              <div className="text-xs font-bold text-zinc-400">
                {isMl ? 'കഥ/പ്രോംപ്റ്റ് ജനറേറ്റ് ചെയ്തവർ' : 'Users Who Generated'}
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
                {loadingData ? '—' : usageBreakdown.generatorVisitorsCount.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                {isMl
                  ? `Gmail ഇല്ലാതെ: ${usageBreakdown.guestGeneratorCount} | Gmail വഴി: ${usageBreakdown.gmailGeneratorCount}`
                  : `Guest: ${usageBreakdown.guestGeneratorCount} | Gmail: ${usageBreakdown.gmailGeneratorCount}`}
              </div>
            </div>
          </div>

          {/* Gmail Login & Saved Stories Summary Strip + Table */}
          <div className="bg-[#11131f] border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#141728]">
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {isMl
                      ? 'ഇന്ന് ലോഗിൻ ചെയ്തവരും ജിമെയിൽ അക്കൗണ്ടുകളും (Gmail Logins & Cloud Saves)'
                      : 'Today Logins & Saved Gmail Accounts'}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  {isMl
                    ? 'Google Sign-In വഴി ലോഗിൻ ചെയ്ത ഉപയോക്താക്കളുടെ ജിമെയിൽ ഐഡികളും സേവ് ചെയ്ത കഥകളും. (Google സുരക്ഷാ നയം അനുസരിച്ച് പാസ്‌വേഡുകൾ ശേഖരിക്കുകയോ കാണിക്കുകയോ ചെയ്യാറില്ല.)'
                    : 'Tracks daily Google logins, total verified Gmail IDs, and cloud story counts. (Google OAuth never exposes passwords.)'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0 font-mono tabular-nums">
                <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <div className="text-lg sm:text-xl font-extrabold text-emerald-400">
                    {gmailMetrics.todayLogins}
                  </div>
                  <div className="text-[10px] text-zinc-300 font-sans font-bold">
                    {isMl ? 'ഇന്ന് ലോഗിൻ' : 'Logged In Today'}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                  <div className="text-lg sm:text-xl font-extrabold text-amber-400">
                    {gmailMetrics.totalAccounts}
                  </div>
                  <div className="text-[10px] text-zinc-300 font-sans font-bold">
                    {isMl ? 'ആകെ ജിമെയിൽ' : 'Total Gmails'}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-center">
                  <div className="text-lg sm:text-xl font-extrabold text-sky-400">
                    {gmailMetrics.totalCloudStories}
                  </div>
                  <div className="text-[10px] text-zinc-300 font-sans font-bold">
                    {isMl ? 'സേവ് ചെയ്ത കഥകൾ' : 'Saved Stories'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder={isMl ? 'ജിമെയിൽ ഐഡി / പേര് തിരയുക...' : 'Search Gmail ID or name...'}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setUserAccountFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      userAccountFilter === 'all'
                        ? 'bg-amber-500 text-black font-extrabold'
                        : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
                    }`}
                  >
                    {isMl ? `എല്ലാം (${userAccounts.length})` : `All (${userAccounts.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserAccountFilter('today')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      userAccountFilter === 'today'
                        ? 'bg-emerald-500 text-black font-extrabold'
                        : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
                    }`}
                  >
                    {isMl ? `ഇന്ന് (${gmailMetrics.todayLogins})` : `Today (${gmailMetrics.todayLogins})`}
                  </button>
                </div>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {isMl
                  ? `ആകെ കാണിക്കുന്നത്: ${filteredUserAccounts.length} അക്കൗണ്ടുകൾ`
                  : `Showing ${filteredUserAccounts.length} Gmail accounts`}
              </span>
            </div>

            {filteredUserAccounts.length === 0 ? (
              <div className="p-8 text-center space-y-1.5">
                <Mail className="w-6 h-6 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400">
                  {isMl
                    ? 'ഈ വിഭാഗത്തിൽ ലോഗിൻ ചെയ്ത Gmail അക്കൗണ്ടുകൾ ഒന്നും ഇതുവരെ ഇല്ല.'
                    : 'No Gmail users found in this filter.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-bold">
                      <th className="py-3 px-4">{isMl ? 'ഉപയോക്താവ്' : 'User'}</th>
                      <th className="py-3 px-3">{isMl ? 'ജിമെയിൽ ഐഡി (Gmail ID)' : 'Gmail ID'}</th>
                      <th className="py-3 px-3 text-center">{isMl ? 'ഇന്നത്തെ സ്റ്റാറ്റസ്' : 'Today'}</th>
                      <th className="py-3 px-3 text-right">{isMl ? 'സേവ് ചെയ്ത കഥകൾ' : 'Saved Stories'}</th>
                      <th className="py-3 px-3 text-right">{isMl ? 'ലോഗിൻ തവണ' : 'Logins'}</th>
                      <th className="py-3 px-3 text-right">{isMl ? 'അവസാന ലോഗിൻ' : 'Last Login'}</th>
                      <th className="py-3 px-4 text-right">{isMl ? 'വിവരങ്ങൾ' : 'Details'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    {filteredUserAccounts.slice(0, 50).map((u) => {
                      const isLoggedToday = u.lastDayKey === todayKey;
                      const isExpanded = expandedUid === u.uid;
                      const userStoryInfo = userStoriesMap[u.uid];
                      const userSearchCount = generationLogs.filter(
                        (l) => l.userEmail && l.userEmail.toLowerCase() === (u.email || '').toLowerCase()
                      ).length;

                      return (
                        <React.Fragment key={u.uid}>
                          <tr
                            onClick={() => handleToggleExpandUser(u.uid)}
                            className={`hover:bg-zinc-900/40 transition-colors cursor-pointer ${
                              isExpanded ? 'bg-zinc-900/60' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                {u.photoURL ? (
                                  <img
                                    src={u.photoURL}
                                    alt={u.displayName}
                                    className="w-7 h-7 rounded-full border border-zinc-700 object-cover shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
                                    {(u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <span className="font-bold text-zinc-100 truncate max-w-[140px] block">
                                    {u.displayName || 'Creator'}
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-500 block">
                                    {isMl ? `സെർച്ച്: ${userSearchCount}` : `Logs: ${userSearchCount}`}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-amber-300">{u.email}</td>
                            <td className="py-3 px-3 text-center">
                              {isLoggedToday ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                                  {isMl ? 'ഇന്ന് സജീവം' : 'Today'}
                                </span>
                              ) : (
                                <span className="text-[11px] font-mono text-zinc-500">{u.lastDayKey}</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-sky-300">
                              <span className="inline-flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                                {u.savedStoriesCount || 0}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-zinc-300">
                              {u.loginCount || 1}
                            </td>
                            <td className="py-3 px-3 text-right text-zinc-400 whitespace-nowrap">
                              {formatTimestampLabel(u.lastLoginAt || u.createdAt)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleExpandUser(u.uid);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-bold text-amber-300 cursor-pointer"
                              >
                                <span>{isMl ? 'കഥകൾ' : 'Stories'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-[#0b0d17]">
                              <td colSpan={7} className="p-4 border-t border-zinc-800/80 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-400 border-b border-zinc-800/70 pb-2.5">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <span>
                                      UID: <strong className="text-zinc-200">{u.uid}</strong>
                                    </span>
                                    <span>
                                      {isMl ? 'ആദ്യ ലോഗിൻ:' : 'First Login:'}{' '}
                                      <strong className="text-zinc-200">
                                        {formatTimestampLabel(u.createdAt)}
                                      </strong>
                                    </span>
                                    <span>
                                      {isMl ? 'അവസാന ലോഗിൻ:' : 'Last Login:'}{' '}
                                      <strong className="text-emerald-300">
                                        {formatTimestampLabel(u.lastLoginAt)}
                                      </strong>
                                    </span>
                                  </div>
                                  <span>
                                    {isMl ? 'ക്ലൗഡ് കഥകൾ' : 'Cloud Stories'}:{' '}
                                    <strong className="text-amber-400">
                                      {userStoryInfo?.stories.length ?? u.savedStoriesCount ?? 0}
                                    </strong>
                                  </span>
                                </div>

                                {userStoryInfo?.loading ? (
                                  <p className="text-xs text-zinc-400 py-2">
                                    {isMl
                                      ? 'ഈ അക്കൗണ്ടിൽ സേവ് ചെയ്ത കഥകൾ ലോഡ് ചെയ്യുന്നു...'
                                      : 'Loading cloud saved stories...'}
                                  </p>
                                ) : userStoryInfo?.error ? (
                                  <p className="text-xs text-red-300 py-1">{userStoryInfo.error}</p>
                                ) : !userStoryInfo || userStoryInfo.stories.length === 0 ? (
                                  <p className="text-xs text-zinc-500 py-1">
                                    {isMl
                                      ? 'ഈ ജിമെയിൽ അക്കൗണ്ടിൽ ഇതുവരെ ക്ലൗഡ് കഥകൾ സേവ് ചെയ്തിട്ടില്ല.'
                                      : 'No cloud saved stories found in this account yet.'}
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {userStoryInfo.stories.map((st) => (
                                      <div
                                        key={st.id}
                                        className="p-3 rounded-xl bg-[#11131f] border border-zinc-800 space-y-1.5"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            {st.isLoved && (
                                              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
                                            )}
                                            <span className="text-xs font-bold text-white truncate">
                                              {st.title}
                                            </span>
                                          </div>
                                          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-300 shrink-0">
                                            {st.genre}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                                          {st.storySummary}
                                        </p>
                                        <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                                          <span>
                                            {st.shotCount} {isMl ? 'ഷോട്ടുകൾ' : 'shots'} ·{' '}
                                            {st.durationDisplay}
                                          </span>
                                          <span>
                                            {st.savedAtMs
                                              ? new Date(st.savedAtMs).toLocaleDateString('en-IN')
                                              : ''}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Day-by-Day Historical Breakdown (Today + All Previous Days) */}
          <div className="bg-[#11131f] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#141728]">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {isMl
                      ? 'അന്നന്ന് ഉപയോഗിച്ചവരുടെ പൂർണ്ണ ചരിത്രം (Daily Historical Breakdown)'
                      : 'Day-by-Day Historical Usage'}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isMl
                    ? 'ഇന്നും ഇതിനുമുമ്പുള്ള എല്ലാ ദിവസങ്ങളിലും കയറിയവർ, ജിമെയിൽ ഇല്ലാത്തവർ, ലോഗിൻ ചെയ്തവർ, ജനറേറ്റ് ചെയ്തവർ.'
                    : 'Daily totals across today and all prior dates: visitors, guest vs Gmail, and generated stories/prompts.'}
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {usageBreakdown.dailyHistory.length} {isMl ? 'ദിവസങ്ങൾ' : 'days'}
              </span>
            </div>

            {usageBreakdown.dailyHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                {isMl ? 'ദിവസേനയുള്ള കണക്കുകൾ ഇതുവരെ ഇല്ല.' : 'No daily records yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-sans font-bold">
                      <th className="py-3 px-4">{isMl ? 'തീയതി' : 'Date'}</th>
                      <th className="py-3 px-3 text-right">{isMl ? 'ആകെ കയറിയവർ' : 'Total Visitors'}</th>
                      <th className="py-3 px-3 text-right">{isMl ? 'Gmail ഇല്ലാതെ' : 'Guest (No Gmail)'}</th>
                      <th className="py-3 px-3 text-right">{isMl ? 'Gmail ലോഗിൻ' : 'Gmail Users'}</th>
                      <th className="py-3 px-3 text-right">{isMl ? 'ജനറേറ്റ് ചെയ്തവർ' : 'Generators'}</th>
                      <th className="py-3 px-4 text-right">{isMl ? 'കഥ / പ്രോംപ്റ്റ് / സെർച്ച്' : 'Stories / Prompts / Searches'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    {usageBreakdown.dailyHistory.map((day) => (
                      <tr key={day.dayKey} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">
                          <span>{day.dayKey}</span>
                          {day.dayKey === todayKey && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-sans">
                              {isMl ? 'ഇന്ന്' : 'Today'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-100 font-bold">
                          {day.uniqueVisitors}{' '}
                          <span className="text-zinc-500 font-normal">({day.sessions})</span>
                        </td>
                        <td className="py-3 px-3 text-right text-amber-400 font-bold">
                          {day.guestVisitors}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                          {day.gmailUsers}
                        </td>
                        <td className="py-3 px-3 text-right text-sky-400 font-bold">
                          {day.generators}
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-300">
                          {day.angles} / {day.prompts} / {day.searches}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Search & Generation Logs Table (What Users Searched & Generated) */}
          <div className="bg-[#11131f] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#141728]">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {isMl
                      ? `ഉപയോക്താക്കൾ തിരഞ്ഞതും നിർമ്മിച്ചതുമായ വിവരങ്ങൾ (${filteredGenerationLogs.length})`
                      : `User Searches & Generated Content (${filteredGenerationLogs.length})`}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isMl
                    ? 'Gmail ഉള്ളവരും ഇല്ലാത്തവരും ടൈപ്പ് ചെയ്ത കഥാ ആശയങ്ങളും (Search/Premise) ജനറേറ്റ് ചെയ്ത കഥകളും പ്രോംപ്റ്റുകളും.'
                    : 'Complete record of searched premises, generated story angles, and selected shot prompts across guests and Gmail users.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1 sm:flex-none">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => {
                      setLogSearchQuery(e.target.value);
                      setVisibleLogs(25);
                    }}
                    placeholder={isMl ? 'സെർച്ച് / കഥ / Gmail തിരയുക...' : 'Search premise, title, Gmail...'}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <select
                  value={logAuthFilter}
                  onChange={(e) => setLogAuthFilter(e.target.value as 'all' | 'guest' | 'gmail')}
                  className="px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">{isMl ? 'എല്ലാവരും (All)' : 'All Users'}</option>
                  <option value="guest">{isMl ? 'ജിമെയിൽ ഇല്ലാതെ (Guest)' : 'Without Gmail'}</option>
                  <option value="gmail">{isMl ? 'ജിമെയിൽ വഴി (Gmail)' : 'With Gmail'}</option>
                </select>
              </div>
            </div>

            {filteredGenerationLogs.length === 0 ? (
              <div className="p-8 text-center space-y-1.5">
                <FileText className="w-6 h-6 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400">
                  {isMl
                    ? 'ഉപയോക്താക്കൾ തിരഞ്ഞതും നിർമ്മിച്ചതുമായ പുതിയ വിവരങ്ങൾ ഇവിടെ തത്സമയം രേഖപ്പെടുത്തും.'
                    : 'User search premises and generated story details will appear here as visitors generate.'}
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-zinc-800/80">
                  {filteredGenerationLogs.slice(0, visibleLogs).map((log) => (
                    <div key={log.logId} className="p-4 hover:bg-zinc-900/30 transition-colors space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              log.isLoggedIn && log.userEmail
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-mono'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            }`}
                          >
                            {log.isLoggedIn && log.userEmail
                              ? `Gmail: ${log.userEmail}`
                              : isMl
                              ? `ജിമെയിൽ ഇല്ലാതെ (#${log.visitorId.slice(-6)})`
                              : `Guest (#${log.visitorId.slice(-6)})`}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                            {log.actionType === 'prompts'
                              ? isMl
                                ? `പ്രോംപ്റ്റുകൾ (${log.shotCount} ഷോട്ട്)`
                                : `Prompts (${log.shotCount} shots)`
                              : isMl
                              ? '14 കഥകൾ (Angles)'
                              : 'Story Angles'}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {getLangDisplayName(log.language)}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500">
                          {log.dayKey} · {formatTimestampLabel(log.createdAt)}
                        </span>
                      </div>

                      <div className="bg-[#0a0b12] border border-zinc-800/90 rounded-xl p-3 space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                          {isMl ? 'സെർച്ച് / ടൈപ്പ് ചെയ്ത ആശയം (Premise):' : 'Searched / Entered Premise:'}
                        </div>
                        <p className="text-xs text-zinc-200 whitespace-pre-wrap break-words leading-relaxed">
                          {log.searchPremise}
                        </p>
                      </div>

                      {log.selectedStoryTitle && (
                        <div className="text-xs text-emerald-300 font-bold">
                          {isMl ? 'തിരഞ്ഞെടുത്ത കഥ:' : 'Selected Story:'}{' '}
                          <span className="text-white">{log.selectedStoryTitle}</span>
                        </div>
                      )}

                      {log.generatedTitles && log.generatedTitles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {log.generatedTitles.map((title, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300"
                            >
                              {title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {filteredGenerationLogs.length > visibleLogs && (
                  <div className="p-3 border-t border-zinc-800 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleLogs((prev) => prev + 25)}
                      className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-amber-400 cursor-pointer"
                    >
                      {isMl
                        ? `കൂടുതൽ കാണുക (${visibleLogs} / ${filteredGenerationLogs.length})`
                        : `Show More (${visibleLogs} / ${filteredGenerationLogs.length})`}
                    </button>
                  </div>
                )}
              </>
            )}
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
                            <div className="text-zinc-200 font-bold flex items-center gap-1.5 flex-wrap">
                              <span>#{s.visitorId.slice(-8)}</span>
                              {s.isLoggedIn && s.userEmail ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono max-w-[170px] truncate">
                                  {s.userEmail}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-sans">
                                  {isMl ? 'Guest' : 'Guest'}
                                </span>
                              )}
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
