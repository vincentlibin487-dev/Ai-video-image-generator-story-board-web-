import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Film,
  Globe,
  HardDrive,
  LogIn,
  MonitorPlay,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tv,
  UserCheck,
  Users,
  UserX,
  Video,
  XCircle,
} from 'lucide-react';
import {
  ADMIN_EMAIL,
  db,
  FIREBASE_QUOTA_UPGRADE_URL,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type {
  GenerationLogRecord,
  VideoEditLogRecord,
  VisitorSessionRecord,
} from '../lib/analytics';
import type { UserAccountRecord } from '../lib/storySync';
import {
  ADSTERRA_CONFIG,
  fetchLiveVastData,
  HILLTOP_CONFIG,
} from './AdsterraAds';

interface AdminAnalyticsViewProps {
  isMl: boolean;
  adminUser: User | null;
  onAdminGoogleSignIn: () => Promise<void>;
  adminAuthBusy: boolean;
  adminAuthError: string | null;
}

interface ProbeResult {
  name: string;
  network: string;
  status: 'checking' | 'working' | 'warning' | 'error';
  detail: string;
  latencyMs?: number;
}

interface VideoEngineCheck {
  webgl2: boolean;
  canvas2d: boolean;
  webCodecsMp4: boolean;
  mediaRecorder: boolean;
  indexedDb: boolean;
  storageQuotaMb: number | null;
  storageUsedMb: number | null;
}

function getLocalDayKeyOffset(daysOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTs(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '—';
  try {
    const d = ts.toDate();
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

async function probeEndpointNoCors(
  url: string,
  timeoutMs = 4500
): Promise<{ ok: boolean; latencyMs: number; errorMsg?: string }> {
  const started = performance.now();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer =
    controller && typeof window !== 'undefined'
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    await fetch(url, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller ? controller.signal : undefined,
    });
    if (timer !== null) window.clearTimeout(timer);
    return { ok: true, latencyMs: Math.round(performance.now() - started) };
  } catch (err: any) {
    if (timer !== null) window.clearTimeout(timer);
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - started),
      errorMsg: err?.name === 'AbortError' ? 'Timeout' : err?.message || 'Blocked/Unreachable',
    };
  }
}

export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = ({
  isMl,
  adminUser,
  onAdminGoogleSignIn,
  adminAuthBusy,
  adminAuthError,
}) => {
  const isVerifiedAdmin = Boolean(
    adminUser &&
      adminUser.emailVerified &&
      adminUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  // Real Firestore states
  const [sessions, setSessions] = useState<VisitorSessionRecord[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccountRecord[]>([]);
  const [generationLogs, setGenerationLogs] = useState<GenerationLogRecord[]>([]);
  const [videoEditLogs, setVideoEditLogs] = useState<VideoEditLogRecord[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  // UI filters
  const [activitySubTab, setActivitySubTab] = useState<
    'overview' | 'editor' | 'prompts' | 'users'
  >('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [promptFilter, setPromptFilter] = useState<'all' | 'prompts' | 'angles' | 'today'>('all');

  // Live Video & Ad diagnostics state
  const [diagRunning, setDiagRunning] = useState<boolean>(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string>('');
  const [vastPreviewUrls, setVastPreviewUrls] = useState<string[]>([]);
  const [showVastPreview, setShowVastPreview] = useState<boolean>(false);
  const [adProbes, setAdProbes] = useState<ProbeResult[]>([]);
  const [videoEngineCheck, setVideoEngineCheck] = useState<VideoEngineCheck>({
    webgl2: false,
    canvas2d: false,
    webCodecsMp4: false,
    mediaRecorder: false,
    indexedDb: false,
    storageQuotaMb: null,
    storageUsedMb: null,
  });

  // Run real browser Video Engine & Live Ad Network Diagnostics
  const runSystemDiagnostics = useCallback(async () => {
    setDiagRunning(true);

    // 1. Check Video Editor hardware/browser capabilities
    let webgl2 = false;
    let canvas2d = false;
    try {
      const testCanvas = document.createElement('canvas');
      webgl2 = Boolean(testCanvas.getContext('webgl2'));
      canvas2d = Boolean(testCanvas.getContext('2d'));
    } catch {}

    const webCodecsMp4 =
      typeof (window as any).VideoEncoder === 'function' &&
      typeof (window as any).VideoDecoder === 'function';
    const mediaRecorder = typeof MediaRecorder !== 'undefined';
    const indexedDb = typeof indexedDB !== 'undefined';

    let storageQuotaMb: number | null = null;
    let storageUsedMb: number | null = null;
    try {
      if (navigator.storage && typeof navigator.storage.estimate === 'function') {
        const est = await navigator.storage.estimate();
        if (typeof est.quota === 'number') {
          storageQuotaMb = Math.round((est.quota / (1024 * 1024)) * 10) / 10;
        }
        if (typeof est.usage === 'number') {
          storageUsedMb = Math.round((est.usage / (1024 * 1024)) * 10) / 10;
        }
      }
    } catch {}

    setVideoEngineCheck({
      webgl2,
      canvas2d,
      webCodecsMp4,
      mediaRecorder,
      indexedDb,
      storageQuotaMb,
      storageUsedMb,
    });

    // 2. Initialize checking state for Ad probes
    setAdProbes([
      {
        name: 'HilltopAds VAST Video Feed (/api/vast-ad)',
        network: 'HilltopAds Video',
        status: 'checking',
        detail: isMl ? 'പരിശോധിക്കുന്നു...' : 'Checking live VAST stream...',
      },
      {
        name: 'Adsterra Banner (728x90 Desktop)',
        network: 'Adsterra',
        status: 'checking',
        detail: isMl ? 'പരിശോധിക്കുന്നു...' : 'Checking script endpoint...',
      },
      {
        name: 'Adsterra Banner (320x50 Mobile)',
        network: 'Adsterra',
        status: 'checking',
        detail: isMl ? 'പരിശോധിക്കുന്നു...' : 'Checking script endpoint...',
      },
      {
        name: 'HilltopAds Banner (300x100)',
        network: 'HilltopAds',
        status: 'checking',
        detail: isMl ? 'പരിശോധിക്കുന്നു...' : 'Checking banner endpoint...',
      },
      {
        name: 'HilltopAds Square (300x250)',
        network: 'HilltopAds',
        status: 'checking',
        detail: isMl ? 'പരിശോധിക്കുന്നു...' : 'Checking banner endpoint...',
      },
    ]);

    // 3. Probe HilltopAds VAST + /api/vast-ad
    const vastStarted = performance.now();
    let vastProbe: ProbeResult;
    try {
      const [vastData, apiRes] = await Promise.allSettled([
        fetchLiveVastData(true),
        fetch('/api/vast-ad'),
      ]);
      const latencyMs = Math.round(performance.now() - vastStarted);

      let blockedAdultCount = 0;
      let apiReachable = false;
      if (apiRes.status === 'fulfilled' && apiRes.value.ok) {
        apiReachable = true;
        try {
          const json = await apiRes.value.json();
          blockedAdultCount = Number(json?.blockedAdultCount || 0);
        } catch {}
      }

      const resolvedData = vastData.status === 'fulfilled' ? vastData.value : null;
      const urls = resolvedData?.allVideoUrls || [];
      setVastPreviewUrls(urls);

      if (urls.length > 0) {
        vastProbe = {
          name: 'HilltopAds VAST Video Feed (/api/vast-ad)',
          network: 'HilltopAds Video',
          status: 'working',
          latencyMs,
          detail: isMl
            ? `${urls.length} SFW വീഡിയോ പരസ്യങ്ങൾ ലഭ്യമാണ് (${blockedAdultCount} NSFW ബ്ലോക്ക് ചെയ്തു)`
            : `${urls.length} playable SFW MP4 stream(s) active (${blockedAdultCount} adult filtered)`,
        };
      } else if (apiReachable) {
        vastProbe = {
          name: 'HilltopAds VAST Video Feed (/api/vast-ad)',
          network: 'HilltopAds Video',
          status: 'warning',
          latencyMs,
          detail: isMl
            ? `പ്രോക്സി വർക്ക് ചെയ്യുന്നു, നിലവിൽ 0 SFW വീഡിയോ (${blockedAdultCount} ഫിൽറ്റർ ചെയ്തു)`
            : `Proxy online; 0 SFW video fills right now (${blockedAdultCount} filtered)`,
        };
      } else {
        vastProbe = {
          name: 'HilltopAds VAST Video Feed (/api/vast-ad)',
          network: 'HilltopAds Video',
          status: 'error',
          latencyMs,
          detail: isMl
            ? 'VAST ഫീഡ് ലഭ്യമല്ല അല്ലെങ്കിൽ ബ്ലോക്ക് ചെയ്തിരിക്കുന്നു'
            : 'VAST feed unreachable or blocked',
        };
      }
    } catch {
      vastProbe = {
        name: 'HilltopAds VAST Video Feed (/api/vast-ad)',
        network: 'HilltopAds Video',
        status: 'error',
        latencyMs: Math.round(performance.now() - vastStarted),
        detail: isMl ? 'VAST കണക്ഷൻ പരാജയപ്പെട്ടു' : 'VAST probe failed',
      };
    }

    // 4. Probe Adsterra & HilltopAds Banner endpoints in parallel
    const [ad728, ad320, ht100, ht250] = await Promise.all([
      probeEndpointNoCors(ADSTERRA_CONFIG.desktop728x90.invokeUrl),
      probeEndpointNoCors(ADSTERRA_CONFIG.mobile320x50.invokeUrl),
      probeEndpointNoCors(HILLTOP_CONFIG.banner300x100.src),
      probeEndpointNoCors(HILLTOP_CONFIG.banner300x250.src),
    ]);

    const toBannerProbe = (
      name: string,
      network: string,
      res: { ok: boolean; latencyMs: number; errorMsg?: string }
    ): ProbeResult => ({
      name,
      network,
      status: res.ok ? 'working' : 'error',
      latencyMs: res.latencyMs,
      detail: res.ok
        ? isMl
          ? 'എൻഡ്‌പോയിന്റ് സജീവമാണ് (Working)'
          : 'Endpoint reachable & serving'
        : isMl
        ? `തടസ്സപ്പെട്ടു (${res.errorMsg || 'AdBlocker/Offline'})`
        : `Blocked or unreachable (${res.errorMsg || 'AdBlocker/Offline'})`,
    });

    setAdProbes([
      vastProbe,
      toBannerProbe('Adsterra Banner (728x90 Desktop)', 'Adsterra', ad728),
      toBannerProbe('Adsterra Banner (320x50 Mobile)', 'Adsterra', ad320),
      toBannerProbe('HilltopAds Banner (300x100)', 'HilltopAds', ht100),
      toBannerProbe('HilltopAds Square (300x250)', 'HilltopAds', ht250),
    ]);

    setLastCheckedAt(
      new Date().toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
    setDiagRunning(false);
  }, [isMl]);

  useEffect(() => {
    void runSystemDiagnostics();
  }, [runSystemDiagnostics]);

  // Real-time Firestore subscriptions (only when verified Admin Google Account is signed in)
  useEffect(() => {
    if (!isVerifiedAdmin) {
      setSessions([]);
      setUserAccounts([]);
      setGenerationLogs([]);
      setVideoEditLogs([]);
      setLoadingData(false);
      setFirestoreError(null);
      return;
    }

    setLoadingData(true);
    setFirestoreError(null);

    let loadedFlags = {
      sessions: false,
      users: false,
      gens: false,
      edits: false,
    };

    const markLoaded = (key: keyof typeof loadedFlags) => {
      loadedFlags[key] = true;
      if (loadedFlags.sessions && loadedFlags.users && loadedFlags.gens && loadedFlags.edits) {
        setLoadingData(false);
      }
    };

    const handleSnapError = (colName: string, err: unknown) => {
      markLoaded('sessions');
      markLoaded('users');
      markLoaded('gens');
      markLoaded('edits');
      try {
        handleFirestoreError(err, OperationType.LIST, colName);
      } catch (wrapped) {
        const rawMsg = err instanceof Error ? err.message : String(wrapped);
        setFirestoreError(rawMsg);
      }
    };

    const unsubSessions = onSnapshot(
      query(collection(db, 'visitor_sessions'), orderBy('createdAt', 'desc'), limit(500)),
      (snap) => {
        setSessions(snap.docs.map((d) => d.data() as VisitorSessionRecord));
        markLoaded('sessions');
      },
      (err) => handleSnapError('visitor_sessions', err)
    );

    const unsubUsers = onSnapshot(
      query(collection(db, 'user_accounts'), orderBy('lastLoginAt', 'desc'), limit(300)),
      (snap) => {
        setUserAccounts(snap.docs.map((d) => d.data() as UserAccountRecord));
        markLoaded('users');
      },
      (err) => handleSnapError('user_accounts', err)
    );

    const unsubGens = onSnapshot(
      query(collection(db, 'generation_logs'), orderBy('createdAt', 'desc'), limit(500)),
      (snap) => {
        setGenerationLogs(snap.docs.map((d) => d.data() as GenerationLogRecord));
        markLoaded('gens');
      },
      (err) => handleSnapError('generation_logs', err)
    );

    const unsubEdits = onSnapshot(
      query(collection(db, 'video_edit_logs'), orderBy('createdAt', 'desc'), limit(500)),
      (snap) => {
        setVideoEditLogs(snap.docs.map((d) => d.data() as VideoEditLogRecord));
        markLoaded('edits');
      },
      (err) => handleSnapError('video_edit_logs', err)
    );

    return () => {
      unsubSessions();
      unsubUsers();
      unsubGens();
      unsubEdits();
    };
  }, [isVerifiedAdmin, refreshTick]);

  // Derived real analytics
  const todayKey = useMemo(() => getLocalDayKeyOffset(0), []);
  const yesterdayKey = useMemo(() => getLocalDayKeyOffset(-1), []);

  const analytics = useMemo(() => {
    const allVisitorIds = new Set<string>();
    const loggedInVisitorIds = new Set<string>();
    const guestVisitorIds = new Set<string>();

    const todayVisitorIds = new Set<string>();
    const todayLoggedInIds = new Set<string>();
    const todayGuestIds = new Set<string>();

    const yesterdayVisitorIds = new Set<string>();
    const yesterdayLoggedInIds = new Set<string>();
    const yesterdayGuestIds = new Set<string>();

    const byDay = new Map<
      string,
      {
        dayKey: string;
        sessions: number;
        uniqueVisitors: Set<string>;
        loggedInVisitors: Set<string>;
        guestVisitors: Set<string>;
      }
    >();

    for (const s of sessions) {
      const vid = s.visitorId || s.sessionId;
      allVisitorIds.add(vid);
      if (s.isLoggedIn || s.userEmail) {
        loggedInVisitorIds.add(vid);
      } else {
        guestVisitorIds.add(vid);
      }

      if (s.dayKey === todayKey) {
        todayVisitorIds.add(vid);
        if (s.isLoggedIn || s.userEmail) todayLoggedInIds.add(vid);
        else todayGuestIds.add(vid);
      } else if (s.dayKey === yesterdayKey) {
        yesterdayVisitorIds.add(vid);
        if (s.isLoggedIn || s.userEmail) yesterdayLoggedInIds.add(vid);
        else yesterdayGuestIds.add(vid);
      }

      const dayKey = s.dayKey || 'Unknown';
      let bucket = byDay.get(dayKey);
      if (!bucket) {
        bucket = {
          dayKey,
          sessions: 0,
          uniqueVisitors: new Set<string>(),
          loggedInVisitors: new Set<string>(),
          guestVisitors: new Set<string>(),
        };
        byDay.set(dayKey, bucket);
      }
      bucket.sessions += 1;
      bucket.uniqueVisitors.add(vid);
      if (s.isLoggedIn || s.userEmail) {
        bucket.loggedInVisitors.add(vid);
      } else {
        bucket.guestVisitors.add(vid);
      }
    }

    // Remove logged-in visitors from guest-only set so counts don't double-count someone who logged in later
    loggedInVisitorIds.forEach((id) => guestVisitorIds.delete(id));
    todayLoggedInIds.forEach((id) => todayGuestIds.delete(id));
    yesterdayLoggedInIds.forEach((id) => yesterdayGuestIds.delete(id));

    const dailyRows = Array.from(byDay.values())
      .sort((a, b) => b.dayKey.localeCompare(a.dayKey))
      .slice(0, 14)
      .map((b) => ({
        dayKey: b.dayKey,
        sessions: b.sessions,
        uniqueCount: b.uniqueVisitors.size,
        loggedInCount: b.loggedInVisitors.size,
        guestCount: Math.max(0, b.uniqueVisitors.size - b.loggedInVisitors.size),
      }));

    // Prompt & Angle Generation metrics
    const promptBreakdowns = generationLogs.filter((g) => g.actionType === 'prompts');
    const angleSearches = generationLogs.filter((g) => g.actionType === 'angles');
    const todayGenerations = generationLogs.filter((g) => g.dayKey === todayKey);
    const yesterdayGenerations = generationLogs.filter((g) => g.dayKey === yesterdayKey);
    const genLoggedInCount = generationLogs.filter((g) => g.isLoggedIn).length;
    const genGuestCount = generationLogs.length - genLoggedInCount;

    // Video Editor metrics
    const editorOpenCount = videoEditLogs.filter((v) => v.actionType === 'open_editor').length;
    const editorAddMediaCount = videoEditLogs.filter((v) => v.actionType === 'add_media').length;
    const editorTimelineCount = videoEditLogs.filter((v) => v.actionType === 'edit_timeline').length;
    const editorExportCount = videoEditLogs.filter((v) => v.actionType === 'export_video').length;
    const editorTodayCount = videoEditLogs.filter((v) => v.dayKey === todayKey).length;
    const editorUniqueActors = new Set(
      videoEditLogs.map((v) => (v.userEmail ? v.userEmail.toLowerCase() : v.visitorId))
    ).size;

    const totalUsersCount = Math.max(allVisitorIds.size, userAccounts.length);
    const loggedInAccountsCount = Math.max(userAccounts.length, loggedInVisitorIds.size);

    return {
      totalSessions: sessions.length,
      totalUniqueVisitors: totalUsersCount,
      loggedInAccountsCount,
      guestVisitorsCount: guestVisitorIds.size,
      todayVisitors: todayVisitorIds.size,
      todaySessions: sessions.filter((s) => s.dayKey === todayKey).length,
      todayLoggedIn: todayLoggedInIds.size,
      todayGuests: todayGuestIds.size,
      yesterdayVisitors: yesterdayVisitorIds.size,
      yesterdaySessions: sessions.filter((s) => s.dayKey === yesterdayKey).length,
      dailyRows,
      totalGenerations: generationLogs.length,
      promptBreakdownsCount: promptBreakdowns.length,
      angleSearchesCount: angleSearches.length,
      todayGenerationsCount: todayGenerations.length,
      yesterdayGenerationsCount: yesterdayGenerations.length,
      genLoggedInCount,
      genGuestCount,
      editorOpenCount,
      editorAddMediaCount,
      editorTimelineCount,
      editorExportCount,
      editorTodayCount,
      editorUniqueActors,
    };
  }, [sessions, userAccounts, generationLogs, videoEditLogs, todayKey, yesterdayKey]);

  // Filtered lists for search
  const filteredGenerationLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return generationLogs.filter((g) => {
      if (promptFilter === 'prompts' && g.actionType !== 'prompts') return false;
      if (promptFilter === 'angles' && g.actionType !== 'angles') return false;
      if (promptFilter === 'today' && g.dayKey !== todayKey) return false;
      if (!q) return true;
      return (
        g.searchPremise.toLowerCase().includes(q) ||
        g.selectedStoryTitle.toLowerCase().includes(q) ||
        (g.userEmail || '').toLowerCase().includes(q) ||
        g.visitorId.toLowerCase().includes(q)
      );
    });
  }, [generationLogs, searchQuery, promptFilter, todayKey]);

  const filteredVideoEditLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return videoEditLogs.filter((v) => {
      if (!q) return true;
      return (
        v.projectTitle.toLowerCase().includes(q) ||
        v.actionType.toLowerCase().includes(q) ||
        (v.userEmail || '').toLowerCase().includes(q) ||
        v.visitorId.toLowerCase().includes(q)
      );
    });
  }, [videoEditLogs, searchQuery]);

  const filteredUserAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return userAccounts.filter((u) => {
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q)
      );
    });
  }, [userAccounts, searchQuery]);

  const workingAdsCount = adProbes.filter((p) => p.status === 'working').length;
  const isQuotaError =
    firestoreError &&
    (firestoreError.toLowerCase().includes('resource-exhausted') ||
      firestoreError.toLowerCase().includes('quota'));

  return (
    <div className="space-y-6">
      {/* Admin Google Account Verification Card (Required by Firestore Rules for Telemetry List) */}
      {!isVerifiedAdmin && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#131928] to-[#0d121c] border border-amber-500/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  {isMl
                    ? 'തത്സമയ യൂസർ & എഡിറ്റർ ഡാറ്റ കാണാൻ Admin Gmail സൈൻ ഇൻ ചെയ്യുക'
                    : 'Sign in with Admin Google Account to Load Live Analytics'}
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {isMl
                    ? `സുരക്ഷാ നിയമങ്ങൾ പ്രകാരം യൂസർമാരുടെ എണ്ണം, ലോഗിൻ വിവരങ്ങൾ, വീഡിയോ എഡിറ്റർ ഉപയോഗം, പ്രോംപ്റ്റ് ചരിത്രം എന്നിവ കാണാൻ ${ADMIN_EMAIL} വഴി വെരിഫൈ ചെയ്യണം.`
                    : `Firestore security rules restrict visitor logs, Gmail user lists, video editor logs, and prompt generation history to the verified admin account (${ADMIN_EMAIL}).`}
                </p>
                {adminUser && adminUser.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && (
                  <p className="text-xs text-red-300 font-semibold">
                    {isMl
                      ? `നിലവിൽ സൈൻ ഇൻ ചെയ്തിരിക്കുന്നത്: ${adminUser.email} (ഇത് അഡ്മിൻ ഇമെയിൽ അല്ല).`
                      : `Currently signed in as ${adminUser.email}. Please switch to ${ADMIN_EMAIL}.`}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={adminAuthBusy}
              onClick={() => void onAdminGoogleSignIn()}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-black font-extrabold text-xs inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {adminAuthBusy
                  ? isMl
                    ? 'സൈൻ ഇൻ ചെയ്യുന്നു...'
                    : 'Signing in...'
                  : isMl
                  ? 'Admin Gmail വഴി സൈൻ ഇൻ ചെയ്യുക'
                  : 'Sign in as Admin Google'}
              </span>
            </button>
          </div>

          {adminAuthError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {adminAuthError}
            </div>
          )}
        </div>
      )}

      {/* Firestore Query Error Banner */}
      {firestoreError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="font-bold text-red-300">
              {isMl ? 'ഡാറ്റ ലോഡ് ചെയ്യുന്നതിൽ പിശക്' : 'Telemetry Query Error'}
            </div>
            <div className="text-red-200/80 break-all">{firestoreError}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isQuotaError && (
              <a
                href={FIREBASE_QUOTA_UPGRADE_URL}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs"
              >
                Check Firebase Quota
              </a>
            )}
            <button
              type="button"
              onClick={() => setRefreshTick((t) => t + 1)}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs cursor-pointer"
            >
              {isMl ? 'വീണ്ടും ശ്രമിക്കുക' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      {/* Top Real-Time KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Users & Visitors */}
        <div className="p-4 rounded-2xl bg-[#121722] border border-zinc-800 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              {isMl ? 'ആകെ യൂസർമാർ (Total Users)' : 'Total Visitors & Users'}
            </span>
            <div className="text-2xl font-black text-white tabular-nums">
              {isVerifiedAdmin ? analytics.totalUniqueVisitors.toLocaleString() : '—'}
            </div>
            <div className="text-[11px] text-teal-400 font-medium">
              {isVerifiedAdmin
                ? `${analytics.totalSessions} ${isMl ? 'ആകെ സെഷനുകൾ' : 'total sessions'}`
                : isMl
                ? 'Admin Gmail ആവശ്യമാണ്'
                : 'Sign in to view'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* 2. Today vs Yesterday Visitors */}
        <div className="p-4 rounded-2xl bg-[#121722] border border-zinc-800 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              {isMl ? 'ഇന്ന് / ഇന്നലെ കയറിയവർ' : 'Today vs Yesterday'}
            </span>
            <div className="text-2xl font-black text-white tabular-nums flex items-baseline gap-2">
              <span>{isVerifiedAdmin ? analytics.todayVisitors : '—'}</span>
              <span className="text-xs font-semibold text-emerald-400">
                {isMl ? 'ഇന്ന്' : 'today'}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-medium">
              {isVerifiedAdmin
                ? `${analytics.yesterdayVisitors} ${isMl ? 'ഇന്നലെ കയറിയവർ' : 'yesterday'} (${analytics.todaySessions} ${isMl ? 'ഇന്നത്തെ സെഷൻ' : 'sessions today'})`
                : '—'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* 3. Logged-In (Gmail) vs Guests (No Login) */}
        <div className="p-4 rounded-2xl bg-[#121722] border border-zinc-800 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              {isMl ? 'ലോഗിൻ ചെയ്തവർ / ഗസ്റ്റ്' : 'Logged-In vs Guests'}
            </span>
            <div className="text-2xl font-black text-white tabular-nums flex items-baseline gap-2">
              <span className="text-cyan-300">
                {isVerifiedAdmin ? analytics.loggedInAccountsCount : '—'}
              </span>
              <span className="text-xs font-semibold text-zinc-400">Gmail</span>
              <span className="text-zinc-600">/</span>
              <span className="text-amber-300">
                {isVerifiedAdmin ? analytics.guestVisitorsCount : '—'}
              </span>
              <span className="text-xs font-semibold text-zinc-400">Guest</span>
            </div>
            <div className="text-[11px] text-cyan-400 font-medium">
              {isVerifiedAdmin
                ? isMl
                  ? `ഇന്ന്: ${analytics.todayLoggedIn} ലോഗിൻ, ${analytics.todayGuests} ഗസ്റ്റ്`
                  : `Today: ${analytics.todayLoggedIn} Gmail, ${analytics.todayGuests} Guest`
                : '—'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* 4. Prompts Generated & Video Editor Usage */}
        <div className="p-4 rounded-2xl bg-[#121722] border border-zinc-800 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              {isMl ? 'പ്രോംപ്റ്റ് & വീഡിയോ എഡിറ്റർ' : 'Prompts & Video Editor'}
            </span>
            <div className="text-2xl font-black text-white tabular-nums flex items-baseline gap-2">
              <span className="text-violet-300">
                {isVerifiedAdmin ? analytics.promptBreakdownsCount : '—'}
              </span>
              <span className="text-xs font-semibold text-zinc-400">
                {isMl ? 'പ്രോംപ്റ്റ്' : 'prompts'}
              </span>
            </div>
            <div className="text-[11px] text-amber-400 font-medium">
              {isVerifiedAdmin
                ? isMl
                  ? `എഡിറ്റർ: ${analytics.editorUniqueActors} പേർ • ${analytics.editorExportCount} എക്സ്പോർട്ട്`
                  : `Editor: ${analytics.editorUniqueActors} users • ${analytics.editorExportCount} exports`
                : '—'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Live Video Editor & Ad Networks Health Check Card */}
      <div className="p-5 rounded-2xl bg-[#121722] border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                {isMl
                  ? 'വീഡിയോ എഡിറ്റർ & പരസ്യങ്ങളുടെ തത്സമയ പ്രവർത്തന നില (Live Health)'
                  : 'Live Video Editor & Ad Networks Status'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {lastCheckedAt
                  ? `${isMl ? 'അവസാനം പരിശോധിച്ചത്:' : 'Last tested:'} ${lastCheckedAt}`
                  : isMl
                  ? 'പരിശോധിക്കുന്നു...'
                  : 'Running live checks...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {vastPreviewUrls.length > 0 && (
              <button
                type="button"
                onClick={() => setShowVastPreview((v) => !v)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>
                  {showVastPreview
                    ? isMl
                      ? 'പ്രിവ്യൂ അടയ്ക്കുക'
                      : 'Hide VAST Preview'
                    : isMl
                    ? 'പരസ്യ വീഡിയോ ടെസ്റ്റ് ചെയ്യുക'
                    : 'Test Play Video Ad'}
                </span>
              </button>
            )}
            <button
              type="button"
              disabled={diagRunning}
              onClick={() => void runSystemDiagnostics()}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-teal-400 hover:bg-teal-300 disabled:opacity-60 text-black text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${diagRunning ? 'animate-spin' : ''}`} />
              <span>
                {diagRunning
                  ? isMl
                    ? 'പരിശോധിക്കുന്നു...'
                    : 'Testing...'
                  : isMl
                  ? 'വീണ്ടും ടെസ്റ്റ് ചെയ്യുക'
                  : 'Re-test Video & Ads'}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Video Editor Engine Health */}
          <div className="p-4 rounded-xl bg-[#0c1018] border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-extrabold text-white">
                  {isMl ? 'വീഡിയോ എഡിറ്റർ പ്രവർത്തന നില' : 'Video Editor Engine Status'}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  videoEngineCheck.canvas2d &&
                  (videoEngineCheck.webCodecsMp4 || videoEngineCheck.mediaRecorder)
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {videoEngineCheck.canvas2d &&
                (videoEngineCheck.webCodecsMp4 || videoEngineCheck.mediaRecorder)
                  ? isMl
                    ? '✅ ശരിയായി പ്രവർത്തിക്കുന്നു'
                    : '✅ Operational'
                  : isMl
                  ? '⚠️ പരിമിതം'
                  : '⚠️ Limited'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">MP4 Encoder</span>
                <span
                  className={`font-mono font-bold ${
                    videoEngineCheck.webCodecsMp4 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {videoEngineCheck.webCodecsMp4 ? 'WebCodecs OK' : 'Fallback'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">WebGL2 / Canvas</span>
                <span
                  className={`font-mono font-bold ${
                    videoEngineCheck.webgl2 || videoEngineCheck.canvas2d
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  {videoEngineCheck.webgl2 ? 'WebGL 2.0' : videoEngineCheck.canvas2d ? '2D OK' : 'No'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">MediaRecorder</span>
                <span
                  className={`font-mono font-bold ${
                    videoEngineCheck.mediaRecorder ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {videoEngineCheck.mediaRecorder ? 'Ready' : 'Unavailable'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">Local Media DB</span>
                <span
                  className={`font-mono font-bold ${
                    videoEngineCheck.indexedDb ? 'text-cyan-400' : 'text-red-400'
                  }`}
                >
                  {videoEngineCheck.storageUsedMb !== null
                    ? `${videoEngineCheck.storageUsedMb} MB`
                    : videoEngineCheck.indexedDb
                    ? 'IndexedDB OK'
                    : 'Off'}
                </span>
              </div>
            </div>

            {isVerifiedAdmin && (
              <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-200 flex items-center justify-between flex-wrap gap-2">
                <span>
                  {isMl ? 'എഡിറ്റർ ഉപയോഗം:' : 'Recorded Activity:'}{' '}
                  <strong>{analytics.editorOpenCount}</strong> {isMl ? 'ഓപ്പൺ' : 'opens'},{' '}
                  <strong>{analytics.editorAddMediaCount}</strong> {isMl ? 'മീഡിയ' : 'media adds'},{' '}
                  <strong>{analytics.editorExportCount}</strong> {isMl ? 'വീഡിയോ എക്സ്പോർട്ട്' : 'MP4 exports'}
                </span>
                <span className="font-mono text-teal-300">
                  {analytics.editorTodayCount} {isMl ? 'ഇന്ന്' : 'today'}
                </span>
              </div>
            )}
          </div>

          {/* Right: Live Ad Network Probes */}
          <div className="p-4 rounded-xl bg-[#0c1018] border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-extrabold text-white">
                  {isMl ? 'പരസ്യങ്ങളുടെ പ്രവർത്തന നില (Ad Networks)' : 'Ad Networks Live Probe'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-cyan-300">
                {workingAdsCount}/{adProbes.length} {isMl ? 'സജീവം' : 'Working'}
              </span>
            </div>

            <div className="space-y-1.5">
              {adProbes.map((probe) => (
                <div
                  key={probe.name}
                  className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {probe.status === 'checking' && (
                      <RefreshCw className="w-3.5 h-3.5 text-zinc-400 animate-spin shrink-0" />
                    )}
                    {probe.status === 'working' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    {probe.status === 'warning' && (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    {probe.status === 'error' && (
                      <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-200 truncate">{probe.name}</div>
                      <div className="text-[10px] text-zinc-400 truncate">{probe.detail}</div>
                    </div>
                  </div>
                  {typeof probe.latencyMs === 'number' && (
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                      {probe.latencyMs}ms
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Optional Live VAST Video Ad Verification Player */}
        {showVastPreview && vastPreviewUrls.length > 0 && (
          <div className="p-3 rounded-xl bg-black border border-violet-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs text-violet-300 font-bold">
              <span>Live SFW VAST Video Ad Stream Preview ({vastPreviewUrls.length} stream)</span>
              <span className="text-[10px] font-mono text-zinc-400 truncate max-w-xs">
                {vastPreviewUrls[0]}
              </span>
            </div>
            <video
              src={vastPreviewUrls[0]}
              controls
              muted
              autoPlay
              playsInline
              className="w-full max-h-52 rounded-lg bg-zinc-950 object-contain"
            />
          </div>
        )}
      </div>

      {/* Sub-Navigation for Detailed Real Logs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#121722] border border-zinc-800 rounded-2xl p-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActivitySubTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              activitySubTab === 'overview'
                ? 'bg-teal-400 text-black'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            📅 {isMl ? 'ദിവസേനയുള്ള ട്രാഫിക്' : 'Daily Traffic'}
          </button>
          <button
            type="button"
            onClick={() => setActivitySubTab('editor')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              activitySubTab === 'editor'
                ? 'bg-teal-400 text-black'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            🎬 {isMl ? 'വീഡിയോ എഡിറ്റർ ഉപയോഗിച്ചവർ' : 'Video Editor Users'} (
            {videoEditLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActivitySubTab('prompts')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              activitySubTab === 'prompts'
                ? 'bg-teal-400 text-black'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            ✨ {isMl ? 'പ്രോംപ്റ്റ് ജനറേറ്റ് ചെയ്തവർ' : 'Prompt Generations'} (
            {generationLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActivitySubTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              activitySubTab === 'users'
                ? 'bg-teal-400 text-black'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            👤 {isMl ? 'ലോഗിൻ ചെയ്ത യൂസർമാർ' : 'Gmail Accounts'} ({userAccounts.length})
          </button>
        </div>

        {activitySubTab !== 'overview' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isMl ? 'ഇമെയിൽ / പ്രോജക്ട് തിരയുക...' : 'Search email, title, ID...'}
              className="w-full min-h-[38px] pl-8 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-teal-400 text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {isVerifiedAdmin && loadingData && (
        <div className="p-6 rounded-2xl bg-[#121722] border border-zinc-800 text-center text-xs text-zinc-400">
          {isMl ? 'തത്സമയ ഡാറ്റ ലോഡ് ചെയ്യുന്നു...' : 'Loading live Firestore telemetry...'}
        </div>
      )}

      {/* SUB-TAB 1: DAILY TRAFFIC BREAKDOWN */}
      {activitySubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[#121722] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-extrabold text-white">
                  {isMl
                    ? 'ദിവസേനയുള്ള സന്ദർശക കണക്ക് (ഇന്ന്, ഇന്നലെ & കഴിഞ്ഞ ദിവസങ്ങൾ)'
                    : 'Daily Website Visitors (Today, Yesterday & Recent Days)'}
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-teal-400/15 text-teal-300 border border-teal-400/30">
                Real Firestore
              </span>
            </div>

            {!isVerifiedAdmin ? (
              <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 text-center">
                {isMl
                  ? 'ദിവസേനയുള്ള ട്രാഫിക് കാണാൻ മുകളിലുള്ള Admin Gmail ബട്ടൺ വഴി സൈൻ ഇൻ ചെയ്യുക.'
                  : 'Sign in with Admin Google account above to inspect daily traffic logs.'}
              </div>
            ) : analytics.dailyRows.length === 0 ? (
              <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 text-center">
                {isMl ? 'ഇതുവരെ സന്ദർശന ലോഗുകൾ ലഭ്യമല്ല.' : 'No visitor sessions recorded yet.'}
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {analytics.dailyRows.map((d) => {
                  const maxCount = Math.max(
                    1,
                    ...analytics.dailyRows.map((row) => row.uniqueCount)
                  );
                  const barWidth = Math.max(4, Math.round((d.uniqueCount / maxCount) * 100));
                  const loggedInPct =
                    d.uniqueCount > 0 ? Math.round((d.loggedInCount / d.uniqueCount) * 100) : 0;
                  const label =
                    d.dayKey === todayKey
                      ? isMl
                        ? `ഇന്ന് (${d.dayKey})`
                        : `Today (${d.dayKey})`
                      : d.dayKey === yesterdayKey
                      ? isMl
                        ? `ഇന്നലെ (${d.dayKey})`
                        : `Yesterday (${d.dayKey})`
                      : d.dayKey;

                  return (
                    <div key={d.dayKey} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-bold text-zinc-200">{label}</span>
                        <span className="font-mono text-zinc-200 font-bold text-right">
                          {d.uniqueCount} {isMl ? 'പേർ' : 'visitors'}{' '}
                          <span className="text-[11px] text-zinc-400 font-normal">
                            ({d.loggedInCount} Gmail, {d.guestCount} Guest • {d.sessions}{' '}
                            {isMl ? 'സെഷൻ' : 'sess'})
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-zinc-900 overflow-hidden">
                        <div
                          className="h-full flex rounded-full overflow-hidden transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        >
                          <div
                            className="h-full bg-teal-400"
                            style={{ width: `${loggedInPct}%` }}
                            title="Logged-in Gmail users"
                          />
                          <div
                            className="h-full bg-cyan-400 flex-1"
                            title="Guest users"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Usage Summary Breakdown */}
          <div className="p-5 rounded-2xl bg-[#121722] border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-extrabold text-white">
                {isMl ? 'ആകെ ഉപയോഗ സംഗ്രഹം' : 'Usage Summary'}
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">
                  {isMl ? 'ആകെ പ്രോംപ്റ്റ് ജനറേഷൻ' : 'Prompt Breakdowns'}
                </span>
                <span className="font-mono font-bold text-violet-300">
                  {analytics.promptBreakdownsCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">
                  {isMl ? 'ആകെ സ്റ്റോറി ആംഗിൾ തിരയലുകൾ' : 'Story Angle Searches'}
                </span>
                <span className="font-mono font-bold text-teal-300">
                  {analytics.angleSearchesCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">
                  {isMl ? 'ഇന്ന് ജനറേറ്റ് ചെയ്തവ' : 'Generated Today'}
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {analytics.todayGenerationsCount} (
                  {analytics.yesterdayGenerationsCount} {isMl ? 'ഇന്നലെ' : 'yest'})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">
                  {isMl ? 'വീഡിയോ എഡിറ്റർ ഓപ്പൺ' : 'Video Editor Opens'}
                </span>
                <span className="font-mono font-bold text-amber-300">
                  {analytics.editorOpenCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">
                  {isMl ? 'വീഡിയോ എക്സ്പോർട്ട്സ് (MP4)' : 'Completed MP4 Exports'}
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {analytics.editorExportCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: WHO USED VIDEO EDITOR */}
      {activitySubTab === 'editor' && (
        <div className="p-5 rounded-2xl bg-[#121722] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-extrabold text-white">
                {isMl
                  ? 'വീഡിയോ എഡിറ്റർ ഉപയോഗിച്ചവരുടെ പട്ടിക (Real Logs)'
                  : 'Who Used the Video Editor (Live Logs)'}
              </h3>
            </div>
            <span className="text-xs text-zinc-400">
              {analytics.editorUniqueActors} {isMl ? 'യൂസർമാർ' : 'unique users'} •{' '}
              {analytics.editorExportCount} {isMl ? 'എക്സ്പോർട്ടുകൾ' : 'exports'}
            </span>
          </div>

          {!isVerifiedAdmin ? (
            <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 text-center">
              {isMl
                ? 'Admin Gmail സൈൻ ഇൻ ചെയ്താൽ വീഡിയോ എഡിറ്റർ ലോഗുകൾ കാണാം.'
                : 'Sign in as Admin Google account to view video editor logs.'}
            </div>
          ) : filteredVideoEditLogs.length === 0 ? (
            <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 text-center">
              {isMl
                ? 'വീഡിയോ എഡിറ്റർ ലോഗുകൾ ഒന്നും കണ്ടെത്തിയില്ല.'
                : 'No video editor activity records match.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredVideoEditLogs.slice(0, 100).map((log) => (
                <div
                  key={log.editId}
                  className="p-3.5 rounded-xl bg-[#0c1018] border border-zinc-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-white truncate">
                      {log.isLoggedIn && log.userEmail
                        ? log.userEmail
                        : `Guest (${log.visitorId.slice(0, 10)})`}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        log.actionType === 'export_video'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : log.actionType === 'add_media'
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                          : 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                      }`}
                    >
                      {log.actionType}
                    </span>
                  </div>
                  <div className="text-zinc-300 font-semibold truncate">{log.projectTitle}</div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 flex-wrap gap-2">
                    <span>
                      {log.resolution} • {log.aspectRatio} • {log.clipCount}{' '}
                      {isMl ? 'ക്ലിപ്പ്' : 'clips'}
                      {log.exportDurationSec > 0 ? ` • ${log.exportDurationSec}s` : ''}
                    </span>
                    <span className="font-mono text-zinc-500">
                      {log.deviceType} • {formatTs(log.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: WHO GENERATED PROMPTS & ANGLES */}
      {activitySubTab === 'prompts' && (
        <div className="p-5 rounded-2xl bg-[#121722] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <h3 className="text-sm font-extrabold text-white">
                {isMl
                  ? 'പ്രോംപ്റ്റ് / സ്റ്റോറി ജനറേറ്റ് ചെയ്തവർ'
                  : 'Prompt & Storyboard Generations'}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'prompts', 'angles', 'today'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setPromptFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    promptFilter === f
                      ? 'bg-violet-400 text-black'
                      : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                  }`}
                >
                  {f === 'all'
                    ? isMl
                      ? 'എല്ലാം'
                      : 'All'
                    : f === 'prompts'
                    ? isMl
                      ? 'പ്രോംപ്റ്റുകൾ'
                      : 'Prompts'
                    : f === 'angles'
                    ? isMl
                      ? 'ആംഗിളുകൾ'
                      : 'Angles'
                    : isMl
                    ? 'ഇന്ന്'
                    : 'Today'}
                </button>
              ))}
            </div>
          </div>

          {!isVerifiedAdmin ? (
            <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 text-center">
              {isMl
                ? 'Admin Gmail സൈൻ ഇൻ ചെയ്താൽ പ്രോംപ്റ്റ് ചരിത്രം കാണാം.'
                : 'Sign in as Admin Google account to view prompt generation history.'}
            </div>
          ) : filteredGenerationLogs.length === 0 ? (
            <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 text-center">
              {isMl
                ? 'പ്രോംപ്റ്റ് ജനറേഷൻ ലോഗുകൾ കണ്ടെത്തിയില്ല.'
                : 'No generation logs match your filter.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredGenerationLogs.slice(0, 100).map((g) => (
                <div
                  key={g.logId}
                  className="p-3.5 rounded-xl bg-[#0c1018] border border-zinc-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-white truncate">
                      {g.isLoggedIn && g.userEmail
                        ? g.userEmail
                        : `Guest (${g.visitorId.slice(0, 10)})`}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        g.actionType === 'prompts'
                          ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                          : 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                      }`}
                    >
                      {g.actionType === 'prompts'
                        ? `${g.shotCount} Shots`
                        : `${g.generatedTitles.length} Angles`}
                    </span>
                  </div>
                  <div className="text-zinc-200 font-semibold line-clamp-2">
                    {g.selectedStoryTitle || g.searchPremise}
                  </div>
                  {g.selectedStoryTitle && g.searchPremise !== g.selectedStoryTitle && (
                    <div className="text-[11px] text-zinc-400 line-clamp-1">
                      {g.searchPremise}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>
                      {g.language.toUpperCase()} • {g.dayKey}
                    </span>
                    <span className="font-mono">{formatTs(g.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: LOGGED-IN GMAIL USERS */}
      {activitySubTab === 'users' && (
        <div className="p-5 rounded-2xl bg-[#121722] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-extrabold text-white">
                {isMl
                  ? 'ലോഗിൻ ചെയ്ത യൂസർമാർ (Gmail Accounts)'
                  : 'Logged-In Google Users'}
              </h3>
            </div>
            <span className="text-xs text-zinc-400">
              {userAccounts.length} {isMl ? 'അക്കൗണ്ടുകൾ' : 'verified Gmail accounts'} •{' '}
              {analytics.guestVisitorsCount} {isMl ? 'ഗസ്റ്റ് സന്ദർശകർ' : 'guest visitors'}
            </span>
          </div>

          {!isVerifiedAdmin ? (
            <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 text-center">
              {isMl
                ? 'Admin Gmail സൈൻ ഇൻ ചെയ്താൽ ലോഗിൻ ചെയ്ത യൂസർമാരുടെ പട്ടിക കാണാം.'
                : 'Sign in as Admin Google account to view registered Gmail accounts.'}
            </div>
          ) : filteredUserAccounts.length === 0 ? (
            <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 text-center">
              {isMl ? 'ലോഗിൻ ചെയ്ത യൂസർമാർ ആരുമില്ല.' : 'No signed-in Google accounts found.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredUserAccounts.map((u) => (
                <div
                  key={u.uid}
                  className="p-3.5 rounded-xl bg-[#0c1018] border border-zinc-800 flex items-center gap-3 text-xs"
                >
                  {u.photoURL ? (
                    <img
                      src={u.photoURL}
                      alt={u.displayName}
                      className="w-9 h-9 rounded-full object-cover border border-zinc-700 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold shrink-0">
                      {(u.displayName || u.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="font-bold text-white truncate">{u.displayName}</div>
                    <div className="text-[11px] text-cyan-300 truncate">{u.email}</div>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-2">
                      <span>{u.loginCount} logins</span>
                      <span>•</span>
                      <span>{u.savedStoriesCount} stories</span>
                      <span>•</span>
                      <span>{u.lastDayKey}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
