import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Sparkles,
  Film,
  Clock,
  Image as ImageIcon,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Layers,
  Edit3,
  Timer,
  PlayCircle,
  Globe,
  Volume2,
  Music,
  MessageSquare,
  BarChart3,
  FolderOpen,
  PlusCircle,
  Download,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Heart,
  History,
  Scissors,
  LogIn,
  Trash2,
  Calendar,
  Flame,
  Palette,
  Search,
  Camera,
  Sun,
  Wallet,
  Gift,
  HardDrive,
  UserCheck,
  Lock,
} from 'lucide-react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from './lib/firebase';
import {
  deleteStoryFromGmailCloud,
  saveStoryToGmailCloud,
  subscribeUserCloudStories,
  syncStoryCountToUserAccount,
  upsertUserAccountOnLogin,
} from './lib/storySync';
import {
  DialogueMode,
  StoryAngle,
  GeneratedShot,
  generateStoryAnglesLocal,
  generateBreakdownLocal,
} from './lib/storyEngine';
import {
  STORY_CATEGORIES,
  STORY_CATEGORY_GROUPS,
  getCategoryById,
  getCategoryGroup,
  searchStoryCategories,
  type StoryCategoryGroupId,
} from './lib/storyCategories';
import {
  AppLang,
  LANGUAGE_OPTIONS,
  UI_TRANSLATIONS,
  VOICE_PACE_SETTINGS,
  VoicePace,
  buildCardNarrationText,
  cleanTextForSpeech,
  getLangConfig,
} from './lib/i18n';
import {
  TopBannerAd,
  BottomBannerAd,
  FullWidthShowcaseAd,
  InlineVideoAdPair,
  FloatingMiniVideoAd,
  TwoSecondVideoBreakOverlay,
  VideoWithSmallBannerAd,
  InFeedBannerAd,
  CompactSmallBannerAd,
  NativeCardAd,
} from './components/AdsterraAds';
import { AdminDashboard } from './components/AdminDashboard';
import { type SavedStoryItem } from './components/SavedStoriesModal';
import { VideoEditorStudio } from './components/VideoEditorStudio';
import { TermsAndConditionsModal, hasAcceptedTerms } from './components/TermsAndConditionsModal';
import {
  isEmbeddedWebView,
  tryLockLandscapeOrientation,
  unlockScreenOrientation,
} from './lib/deviceEnvironment';
import {
  initGuestSession,
  recordGenerationActivity,
  setSessionAuthUser,
  trackAnglesGenerated,
  trackBreakdownGenerated,
  trackLanguageChange,
  trackStepChange,
  trackTtsPlayed,
} from './lib/analytics';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

async function postApiJson<T>(endpoint: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `API request failed (${res.status})`);
    }
    throw new Error(`API endpoint unavailable (${res.status})`);
  }

  if (!contentType.includes('application/json')) {
    throw new Error('Expected JSON response from API endpoint.');
  }

  return res.json() as Promise<T>;
}

const AutoResizeTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  value,
  className = '',
  ...props
}) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    const rafId = window.requestAnimationFrame(() => {
      if (!ref.current) return;
      const target = ref.current;
      target.style.height = 'auto';
      const nextHeight = `${target.scrollHeight}px`;
      if (target.style.height !== nextHeight) {
        target.style.height = nextHeight;
      }
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      className={`overflow-hidden resize-none ${className}`}
      {...props}
    />
  );
};

export default function App() {
  const [lang, setLang] = useState<AppLang>('en');
  const t = UI_TRANSLATIONS[lang];

  // Navigation Step: 'input' | 'options' | 'prompts' | 'editor' | 'vfx' | 'color' | 'history' | 'login'
  const [activeStep, setActiveStep] = useState<
    'input' | 'options' | 'prompts' | 'editor' | 'vfx' | 'color' | 'history' | 'login'
  >('input');
  const [lastStoryStep, setLastStoryStep] = useState<'input' | 'options' | 'prompts'>('input');
  const [premise, setPremise] = useState<string>('');
  const [shotDurationSec, setShotDurationSec] = useState<number>(8);

  // Total Video Duration Controls (Supports Seconds, Minutes & Hours)
  const [durationValue, setDurationValue] = useState<number>(1);
  const [durationUnit, setDurationUnit] = useState<'seconds' | 'minutes' | 'hours'>('minutes');
  const [customInputValue, setCustomInputValue] = useState<string>('1');

  const [storyAngles, setStoryAngles] = useState<StoryAngle[]>([]);
  const [selectedAngle, setSelectedAngle] = useState<StoryAngle | null>(null);
  const [shots, setShots] = useState<GeneratedShot[]>([]);
  const [visiblePromptCount, setVisiblePromptCount] = useState<number>(20);
  const [loadingAngles, setLoadingAngles] = useState<boolean>(false);
  const [loadingShots, setLoadingShots] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineFallbackType, setOfflineFallbackType] = useState<'angles' | 'prompts' | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [categoryGroupFilter, setCategoryGroupFilter] = useState<StoryCategoryGroupId | 'all'>('all');
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [speakingAngleId, setSpeakingAngleId] = useState<string | null>(null);
  const [loadingTtsId, setLoadingTtsId] = useState<string | null>(null);
  const [voicePace, setVoicePace] = useState<VoicePace>('story');
  const [dialogueMode, setDialogueMode] = useState<DialogueMode>('dialogue');
  const [promptViewMode, setPromptViewMode] = useState<'all' | 'single'>('all');
  const [focusedShotIndex, setFocusedShotIndex] = useState<number>(0);
  const [editingShots, setEditingShots] = useState<Record<number, boolean>>({});
  const [show2sVideoBreak, setShow2sVideoBreak] = useState<boolean>(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(() => hasAcceptedTerms());
  const [showTermsReviewModal, setShowTermsReviewModal] = useState<boolean>(false);
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    return (
      hash === '#admin' ||
      hash === '#/admin' ||
      hash.startsWith('#admin?') ||
      params.get('admin') === '1' ||
      params.get('admin') === 'true' ||
      pathname === '/admin'
    );
  });

  const [savedStories, setSavedStories] = useState<SavedStoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('cinematic_saved_stories');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [historyFilterMode, setHistoryFilterMode] = useState<'all' | 'loved'>('all');
  const [continuationBadge, setContinuationBadge] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Optional Account Login State (Profile, Wallet & Promotions)
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [userAuthBusy, setUserAuthBusy] = useState<boolean>(false);
  const [userAuthError, setUserAuthError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const ttsCacheRef = useRef<Map<string, string>>(new Map());
  const speechSessionRef = useRef<number>(0);
  const optionClickCountRef = useRef<number>(0);
  const savedStoriesRef = useRef<SavedStoryItem[]>(savedStories);
  savedStoriesRef.current = savedStories;

  const lovedStoryKeys = useMemo(() => {
    const set = new Set<string>();
    for (const s of savedStories) {
      if (!s.isLoved) continue;
      if (s.angle?.id && s.title) set.add(`id:${s.angle.id}::${s.title}`);
      if (s.title && s.genre) set.add(`tg:${s.title}::${s.genre}`);
    }
    return set;
  }, [savedStories]);

  const filteredCategories = useMemo(
    () => searchStoryCategories(categorySearchQuery, categoryGroupFilter),
    [categorySearchQuery, categoryGroupFilter]
  );

  const selectedCategoryObj = useMemo(
    () => (selectedCategoryId !== 'all' ? getCategoryById(selectedCategoryId) : undefined),
    [selectedCategoryId]
  );

  const isInIframe =
    typeof window !== 'undefined' &&
    (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

  // Normal UI buttons stay strictly inside the website without interrupting clicks or opening external links
  const triggerOptionVideoBreak = () => {
    optionClickCountRef.current += 1;
  };

  // Auto-trigger a 2-second auto-skipping video commercial 40 seconds after Terms are accepted
  useEffect(() => {
    if (showAdminPanel || !termsAccepted) return;
    const timer = window.setTimeout(() => {
      setShow2sVideoBreak(true);
    }, 40000);
    return () => window.clearTimeout(timer);
  }, [showAdminPanel, termsAccepted]);

  const stopAllSpeech = () => {
    speechSessionRef.current += 1;
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingAngleId(null);
    setLoadingTtsId(null);
  };

  useEffect(() => {
    initGuestSession(lang);
    getRedirectResult(auth).catch((err: any) => {
      if (err) {
        setUserAuthError(err instanceof Error ? err.message : String(err));
      }
    });
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    const checkAdminRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const isRouteAdmin =
        hash === '#admin' ||
        hash === '#/admin' ||
        hash.startsWith('#admin?') ||
        params.get('admin') === '1' ||
        params.get('admin') === 'true' ||
        pathname === '/admin';
      setShowAdminPanel(isRouteAdmin);
    };
    window.addEventListener('hashchange', checkAdminRoute);
    window.addEventListener('popstate', checkAdminRoute);
    return () => {
      unsubAuth();
      window.removeEventListener('hashchange', checkAdminRoute);
      window.removeEventListener('popstate', checkAdminRoute);
      stopAllSpeech();
    };
  }, []);

  // Tag active analytics session with verified Gmail status (or anonymous guest)
  useEffect(() => {
    setSessionAuthUser(currentUser);
  }, [currentUser?.uid, currentUser?.emailVerified]);

  // Automatically sync saved stories & log today's login whenever user is signed in with Google (Gmail)
  useEffect(() => {
    if (!currentUser || !currentUser.emailVerified || showAdminPanel) return;
    let active = true;
    let mergedPendingLocal = false;

    const bootstrapSync = async () => {
      try {
        await upsertUserAccountOnLogin(currentUser, savedStoriesRef.current.length);
      } catch (err: any) {
        if (active) {
          console.warn('Account profile sync error:', err?.message);
        }
      }
    };

    void bootstrapSync();

    const unsubStories = subscribeUserCloudStories(
      currentUser,
      async (cloudItems) => {
        if (!active) return;
        const cloudIds = new Set(cloudItems.map((c) => c.id));
        const localOnly = savedStoriesRef.current.filter((l) => !cloudIds.has(l.id));

        if (!mergedPendingLocal && localOnly.length > 0) {
          mergedPendingLocal = true;
          for (const item of localOnly) {
            try {
              await saveStoryToGmailCloud(currentUser, item, true);
            } catch {}
          }
        } else {
          mergedPendingLocal = true;
        }

        const mergedMap = new Map<string, SavedStoryItem>();
        for (const l of savedStoriesRef.current) {
          mergedMap.set(l.id, l);
        }
        for (const c of cloudItems) {
          mergedMap.set(c.id, c);
        }
        const merged = Array.from(mergedMap.values())
          .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
          .slice(0, 50);

        setSavedStories(merged);
        try {
          localStorage.setItem('cinematic_saved_stories', JSON.stringify(merged));
        } catch {}

        if (cloudItems.length > 0) {
          void syncStoryCountToUserAccount(currentUser, merged.length);
        }
      },
      () => {}
    );

    return () => {
      active = false;
      unsubStories();
    };
  }, [currentUser?.uid, currentUser?.emailVerified, showAdminPanel]);

  const handleUserGoogleLogin = async () => {
    if (isEmbeddedWebView()) {
      setUserAuthError(
        lang === 'ml'
          ? 'മൊബൈൽ ആപ്പ് (WebView) ഉള്ളിൽ Google ലോഗിൻ പരിമിതമാണ്. പക്ഷെ നിങ്ങളുടെ എല്ലാ എഡിറ്റുകളും സ്റ്റോറികളും ലോഗിൻ ഇല്ലാതെ തന്നെ 100% സ്വകാര്യമായി ഫോണിൽ സേവ് ആകും.'
          : 'Google popup login is restricted inside embedded mobile app WebViews. All stories, local media, and video exports continue working 100% privately on your device without login.'
      );
      return;
    }
    setUserAuthBusy(true);
    setUserAuthError(null);
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
          setUserAuthError(
            lang === 'ml'
              ? 'ലോഗിൻ പോപ്പ്-അപ്പ് ബ്ലോക്കായി. "പുതിയ ടാബിൽ തുറക്കുക" വഴി ശ്രമിക്കുക.'
              : rErr?.message || 'Google login failed'
          );
        }
      } else if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setUserAuthError(
          lang === 'ml'
            ? `ഈ ഡൊമെയ്ൻ (${host}) Firebase Authorized Domains-ൽ ചേർക്കേണ്ടതുണ്ട്.`
            : `Domain "${host}" needs to be added to Firebase Authorized Domains.`
        );
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setUserAuthError(err instanceof Error ? err.message : 'Google sign-in failed');
      }
    } finally {
      setUserAuthBusy(false);
    }
  };

  const handleUserGoogleSignOut = async () => {
    setUserAuthBusy(true);
    setUserAuthError(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      setUserAuthError(err instanceof Error ? err.message : 'Sign-out failed');
    } finally {
      setUserAuthBusy(false);
    }
  };

  useEffect(() => {
    stopAllSpeech();
    if (activeStep === 'input' || activeStep === 'options' || activeStep === 'prompts') {
      setLastStoryStep(activeStep);
      trackStepChange(activeStep);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [activeStep]);

  // Calculate total duration in seconds based on unit
  const totalSeconds =
    durationUnit === 'seconds'
      ? durationValue
      : durationUnit === 'hours'
      ? durationValue * 3600
      : durationValue * 60;

  // Calculate EXACT number of video clips needed (safely bounded to avoid browser memory freeze)
  const calculatedShotCount = Math.min(600, Math.max(1, Math.ceil(totalSeconds / shotDurationSec)));

  // Format Duration Description in the active UI language
  const formatDurationDisplay = () => {
    if (durationUnit === 'seconds') return `${durationValue} ${t.unitSecond}`;
    if (durationUnit === 'hours') {
      return `${durationValue} ${t.unitHour} (${durationValue * 60} ${t.unitMinute} / ${totalSeconds} ${t.unitSecond})`;
    }
    return `${durationValue} ${t.unitMinute} (${totalSeconds} ${t.unitSecond})`;
  };

  // Switch entire site, generated stories, options, and prompts to the newly selected language
  const handleLanguageChange = async (newLang: AppLang) => {
    if (newLang === lang) return;
    triggerOptionVideoBreak();
    stopAllSpeech();
    setLang(newLang);
    trackLanguageChange(newLang);
    setError(null);

    const trimmedCurrent = premise.trim();

    // If stories were already generated from user's premise, automatically regenerate all stories (and prompts if active) in the new language
    if (storyAngles.length > 0 && trimmedCurrent) {
      setLoadingAngles(true);
      let updatedAngles: StoryAngle[] = [];
      try {
        const result = await postApiJson<{ angles?: StoryAngle[] }>('/api/generate-story-angles', {
          script: trimmedCurrent,
          language: newLang,
          dialogueMode,
          targetShotCount: calculatedShotCount,
          durationDisplay: formatDurationDisplay(),
          categoryId: selectedCategoryId,
        });
        if (result.angles && Array.isArray(result.angles) && result.angles.length > 0) {
          updatedAngles = result.angles;
        }
      } catch {
        updatedAngles = generateStoryAnglesLocal(
          trimmedCurrent,
          newLang,
          calculatedShotCount,
          selectedCategoryId,
          dialogueMode
        );
      }

      setStoryAngles(updatedAngles);
      setLoadingAngles(false);

      // If user is on Page 3 (Prompts), also translate/regenerate the active angle and shots
      if (selectedAngle && updatedAngles.length > 0) {
        const matchedAngle =
          updatedAngles.find((a) => a.id === selectedAngle.id) || updatedAngles[0];
        setSelectedAngle(matchedAngle);

        if (activeStep === 'prompts' || shots.length > 0) {
          setLoadingShots(true);
          const baseText = matchedAngle.scriptText || matchedAngle.storySummary || trimmedCurrent;
          const scriptInput =
            matchedAngle.characters && !baseText.includes('[CHARACTERS:')
              ? `${baseText}\n\n[CHARACTERS: ${matchedAngle.characters}]`
              : baseText;
          const activeCategoryId = matchedAngle.categoryId || selectedCategoryId;
          try {
            const shotResult = await postApiJson<{ shots?: GeneratedShot[] }>(
              '/api/generate-breakdown',
              {
                script: scriptInput,
                preferredShotDuration: shotDurationSec,
                targetShotCount: calculatedShotCount,
                fastMode: false,
                language: newLang,
                dialogueMode,
                categoryId: activeCategoryId,
              }
            );
            if (shotResult.shots && Array.isArray(shotResult.shots)) {
              setShots(shotResult.shots);
            } else {
              throw new Error('Fallback to local breakdown');
            }
          } catch {
            const localBreakdown = generateBreakdownLocal(
              scriptInput,
              shotDurationSec,
              [],
              calculatedShotCount,
              newLang,
              dialogueMode,
              activeCategoryId
            );
            setShots(localBreakdown.shots);
          } finally {
            setLoadingShots(false);
          }
        }
      }
    }
  };

  // Preset Handlers
  const handleSelectPreset = (val: number, unit: 'seconds' | 'minutes' | 'hours') => {
    setDurationValue(val);
    setDurationUnit(unit);
    setCustomInputValue(val.toString());
    triggerOptionVideoBreak();
  };

  const handleCustomInputChange = (val: string) => {
    setCustomInputValue(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      setDurationValue(parsed);
    }
  };

  // Inline Shot Edit Handler (keeps Spoken Dialogue synced cleanly with Video Prompt)
  const updateShotField = (index: number, field: keyof GeneratedShot, value: any) => {
    setShots((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      if (field === 'malayalamDialogue' && typeof value === 'string' && current.videoPrompt) {
        const trimmed = value.trim();
        const cleanedVideo = current.videoPrompt
          .replace(/\s*Spoken Dialogue \([^)]+\):\s*"[^"]*"\.?/gi, '')
          .replace(/\s*Audio:\s*NO SPOKEN DIALOGUE[^.]*\.?/gi, '')
          .trim();

        current.videoPrompt = trimmed
          ? `${cleanedVideo} Spoken Dialogue (${lang.toUpperCase()}): "${trimmed}".`
          : `${cleanedVideo} Audio: NO SPOKEN DIALOGUE — Pure visual ambient sound.`;
      }

      updated[index] = current;
      return updated;
    });
  };

  // High-Quality Male Voice Toggle Speech Helper (Slow, Paused & Clearly Articulated)
  const toggleSpeakText = async (angleId: string, rawText: string) => {
    if (speakingAngleId === angleId || loadingTtsId === angleId) {
      stopAllSpeech();
      return;
    }

    stopAllSpeech();
    const sessionId = speechSessionRef.current;
    const paceCfg = VOICE_PACE_SETTINGS[voicePace];
    const cleanText = cleanTextForSpeech(rawText, lang);
    setLoadingTtsId(angleId);

    const playDataUrl = (dataUrl: string) => {
      if (speechSessionRef.current !== sessionId) return;
      const audio = new Audio(dataUrl);
      audio.preload = 'auto';
      audio.preservesPitch = true;
      audio.playbackRate = paceCfg.audioPlaybackRate;
      audioRef.current = audio;
      audio.onended = () => {
        audioRef.current = null;
        setSpeakingAngleId(null);
      };
      audio.onerror = () => {
        audioRef.current = null;
        setSpeakingAngleId(null);
      };
      setLoadingTtsId(null);
      setSpeakingAngleId(angleId);
      trackTtsPlayed();
      audio.play().catch(() => {
        audioRef.current = null;
        setSpeakingAngleId(null);
      });
    };

    try {
      const cacheKey = `${lang}:${voicePace}:${angleId}:${cleanText.slice(0, 80)}`;
      const cachedAudio = ttsCacheRef.current.get(cacheKey);
      if (cachedAudio) {
        playDataUrl(cachedAudio);
        return;
      }

      const controller = new AbortController();
      ttsAbortRef.current = controller;

      const data = await postApiJson<{ audioDataUrl?: string }>(
        '/api/tts',
        { text: cleanText, language: lang, pace: voicePace },
        controller.signal
      );

      if (ttsAbortRef.current !== controller || speechSessionRef.current !== sessionId) {
        return;
      }
      ttsAbortRef.current = null;

      if (data?.audioDataUrl) {
        ttsCacheRef.current.set(cacheKey, data.audioDataUrl);
        playDataUrl(data.audioDataUrl);
        return;
      }
      throw new Error('No audio data returned');
    } catch (err: any) {
      if (err?.name === 'AbortError' || speechSessionRef.current !== sessionId) {
        return;
      }
      setLoadingTtsId(null);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const langCfg = getLangConfig(lang);
        window.speechSynthesis.cancel();
        const voices = window.speechSynthesis.getVoices();
        const matchedVoice =
          voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ||
          voices.find((v) => v.lang.includes('IN')) ||
          voices[0];

        const chunks = cleanText
          .split(/\n{2,}|(?<=[.।!?])\s+/)
          .map((s) => s.replace(/\.{3,}/g, '.').trim())
          .filter(Boolean);

        setSpeakingAngleId(angleId);
        trackTtsPlayed();

        const speakChunk = (idx: number) => {
          if (speechSessionRef.current !== sessionId || idx >= chunks.length) {
            if (speechSessionRef.current === sessionId) {
              setSpeakingAngleId(null);
            }
            return;
          }
          const utterance = new SpeechSynthesisUtterance(chunks[idx]);
          utterance.lang = langCfg.ttsLang;
          utterance.rate = paceCfg.webRate;
          utterance.pitch = 0.85;
          if (matchedVoice) utterance.voice = matchedVoice;
          utterance.onend = () => {
            if (speechSessionRef.current !== sessionId) return;
            setTimeout(() => speakChunk(idx + 1), paceCfg.pauseMs);
          };
          utterance.onerror = () => {
            if (speechSessionRef.current === sessionId) {
              setSpeakingAngleId(null);
            }
          };
          window.speechSynthesis.speak(utterance);
        };

        speakChunk(0);
      } else {
        setSpeakingAngleId(null);
      }
    }
  };

  // Step 1 -> Step 2: Generate Story Angle Variations in Selected Language & Category
  const handleGenerateStoryAngles = async () => {
    triggerOptionVideoBreak();
    const trimmedPremise = premise.trim();
    if (!trimmedPremise) {
      setError(t.premiseRequiredError);
      setOfflineFallbackType(null);
      return;
    }

    setLoadingAngles(true);
    setError(null);
    setOfflineFallbackType(null);
    setStoryAngles([]);
    setSelectedAngle(null);
    setShots([]);
    setSelectedGenreFilter('all');

    try {
      const result = await postApiJson<{ angles?: StoryAngle[] }>('/api/generate-story-angles', {
        script: trimmedPremise,
        language: lang,
        dialogueMode,
        targetShotCount: calculatedShotCount,
        durationDisplay: formatDurationDisplay(),
        categoryId: selectedCategoryId,
      });

      if (result.angles && Array.isArray(result.angles) && result.angles.length > 0) {
        setStoryAngles(result.angles);
        trackAnglesGenerated();
        void recordGenerationActivity({
          actionType: 'angles',
          language: lang,
          searchPremise: trimmedPremise,
          generatedTitles: result.angles.map((a) => a.title),
          user: currentUser,
        });
        setActiveStep('options');
        return;
      }
      throw new Error('Unexpected format received for story angles.');
    } catch (err: any) {
      setError(err?.message || t.angleErrorFallback);
      setOfflineFallbackType('angles');
    } finally {
      setLoadingAngles(false);
    }
  };

  // Step 2 -> Step 3: Select Chosen Story Angle and Generate Prompts
  const handleSelectStoryAndOpenPromptPage = async (
    angle: StoryAngle,
    modeOverride?: DialogueMode
  ) => {
    const activeMode = modeOverride ?? dialogueMode;
    const activeCategoryId = angle.categoryId || selectedCategoryId;
    triggerOptionVideoBreak();
    stopAllSpeech();
    setSelectedAngle(angle);
    setFocusedShotIndex(0);
    setEditingShots({});
    setLoadingShots(true);
    setError(null);
    setOfflineFallbackType(null);
    setVisiblePromptCount(25);
    setActiveStep('prompts');

    const baseText = angle.scriptText || angle.storySummary || premise.trim();
    const scriptInput =
      angle.characters && !baseText.includes('[CHARACTERS:')
        ? `${baseText}\n\n[CHARACTERS: ${angle.characters}]`
        : baseText;

    const autoSaveToHistoryAndGmail = async (generatedShots: GeneratedShot[]) => {
      if (!generatedShots || generatedShots.length === 0) return;

      const existingMatch = savedStoriesRef.current.find(
        (s) =>
          (s.angle?.id === angle.id && s.title === angle.title) ||
          (s.title === angle.title && s.genre === angle.genre)
      );
      const itemId = existingMatch?.id || `story_${Date.now()}`;
      const isVerifiedUser = Boolean(currentUser && currentUser.emailVerified && currentUser.email);

      const autoItem: SavedStoryItem = {
        id: itemId,
        title: angle.title || 'Untitled Cinematic Story',
        storySummary: angle.storySummary || angle.synopsis,
        genre: angle.genre,
        durationDisplay: formatDurationDisplay(),
        durationSeconds: totalSeconds,
        shotCount: generatedShots.length,
        shots: generatedShots,
        angle,
        savedAt: Date.now(),
        isLoved: Boolean(existingMatch?.isLoved),
        syncedToGmail: isVerifiedUser ? currentUser?.email || undefined : existingMatch?.syncedToGmail,
      };

      const nextList = [autoItem, ...savedStoriesRef.current.filter((s) => s.id !== itemId)].slice(
        0,
        50
      );
      setSavedStories(nextList);
      try {
        localStorage.setItem('cinematic_saved_stories', JSON.stringify(nextList));
      } catch {}

      if (isVerifiedUser && currentUser) {
        try {
          await saveStoryToGmailCloud(currentUser, autoItem, true);
          await syncStoryCountToUserAccount(currentUser, nextList.length);
        } catch (syncErr) {
          console.warn('Auto-save to Gmail skipped/deferred:', syncErr);
        }
      }
    };

    try {
      const result = await postApiJson<{ shots?: GeneratedShot[] }>('/api/generate-breakdown', {
        script: scriptInput,
        preferredShotDuration: shotDurationSec,
        targetShotCount: calculatedShotCount,
        fastMode: false,
        language: lang,
        dialogueMode: activeMode,
        categoryId: activeCategoryId,
      });

      if (result.shots && Array.isArray(result.shots)) {
        setShots(result.shots);
        trackBreakdownGenerated();
        void recordGenerationActivity({
          actionType: 'prompts',
          language: lang,
          searchPremise: premise.trim() || angle.title,
          selectedStoryTitle: angle.title,
          shotCount: result.shots.length,
          user: currentUser,
        });
        void autoSaveToHistoryAndGmail(result.shots);
        return;
      }
      throw new Error('Unexpected breakdown format.');
    } catch (err: any) {
      setError(err?.message || t.breakdownErrorFallback);
      setOfflineFallbackType('prompts');
    } finally {
      setLoadingShots(false);
    }
  };

  // Explicit user-triggered Offline Script Engine fallback when Gemini API key is unavailable or fails
  const handleRunOfflineFallback = () => {
    if (offlineFallbackType === 'angles') {
      const trimmedPremise = premise.trim();
      if (!trimmedPremise) return;
      const localAngles = generateStoryAnglesLocal(
        trimmedPremise,
        lang,
        calculatedShotCount,
        selectedCategoryId,
        dialogueMode
      );
      setError(null);
      setOfflineFallbackType(null);
      setStoryAngles(localAngles);
      trackAnglesGenerated();
      setActiveStep('options');
      return;
    }

    if (offlineFallbackType === 'prompts' && selectedAngle) {
      const activeCategoryId = selectedAngle.categoryId || selectedCategoryId;
      const baseText = selectedAngle.scriptText || selectedAngle.storySummary || premise.trim();
      const scriptInput =
        selectedAngle.characters && !baseText.includes('[CHARACTERS:')
          ? `${baseText}\n\n[CHARACTERS: ${selectedAngle.characters}]`
          : baseText;
      const localBreakdown = generateBreakdownLocal(
        scriptInput,
        shotDurationSec,
        [],
        calculatedShotCount,
        lang,
        dialogueMode,
        activeCategoryId
      );
      setError(null);
      setOfflineFallbackType(null);
      setShots(localBreakdown.shots);
      trackBreakdownGenerated();
      setActiveStep('prompts');
    }
  };

  const handleDialogueModeChangeOnPrompts = (newMode: DialogueMode) => {
    setDialogueMode(newMode);
    if (selectedAngle && activeStep === 'prompts' && !loadingShots) {
      handleSelectStoryAndOpenPromptPage(selectedAngle, newMode);
    } else {
      triggerOptionVideoBreak();
    }
  };

  const handleDownloadStoryTxt = (story: SavedStoryItem) => {
    const textBlob = [
      `TITLE: ${story.title}`,
      `GENRE: ${story.genre || 'Cinematic'}`,
      `DURATION: ${story.durationDisplay} (${story.durationSeconds}s)`,
      `SHOTS: ${story.shotCount} shots`,
      `SAVED DATE: ${new Date(story.savedAt).toLocaleString()}`,
      `\nSYNOPSIS / LOGLINE:\n${story.storySummary}`,
      `\n================================================================`,
      `SEQUENTIAL SHOTS & PRODUCTION PROMPTS`,
      `================================================================\n`,
      ...story.shots.map(
        (s, i) =>
          `SHOT ${i + 1} (${s.durationSeconds || shotDurationSec}s) - ${s.timing || ''}\n` +
          `ACTION: ${s.action}\n` +
          `DIALOGUE: ${s.malayalamDialogue || 'None'}\n` +
          (s.bgm ? `BGM / AUDIO: ${s.bgm}\n` : '') +
          (s.imagePrompt ? `IMAGE PROMPT: ${s.imagePrompt}\n` : '') +
          (s.videoPrompt ? `VIDEO PROMPT: ${s.videoPrompt}\n` : '')
      ),
    ].join('\n----------------------------------------------------------------\n');

    const blob = new Blob([textBlob], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = story.title.replace(/[^a-zA-Z0-9_\u0D00-\u0D7F-]/g, '_').slice(0, 30);
    link.download = `${safeTitle || 'cinematic-story'}-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleToggleLoveAngle = async (angle: StoryAngle) => {
    const existingMatch = savedStoriesRef.current.find(
      (s) =>
        (s.angle?.id === angle.id && s.title === angle.title) ||
        (s.title === angle.title && s.genre === angle.genre)
    );
    const activeEmail = currentUser?.emailVerified ? currentUser.email || undefined : undefined;

    if (existingMatch) {
      const nextLoved = !existingMatch.isLoved;
      const updatedItem: SavedStoryItem = {
        ...existingMatch,
        isLoved: nextLoved,
        savedAt: nextLoved ? Date.now() : existingMatch.savedAt,
        angle,
        syncedToGmail: activeEmail || existingMatch.syncedToGmail,
      };
      const updatedList = [
        updatedItem,
        ...savedStoriesRef.current.filter((s) => s.id !== existingMatch.id),
      ].slice(0, 50);
      setSavedStories(updatedList);
      try {
        localStorage.setItem('cinematic_saved_stories', JSON.stringify(updatedList));
      } catch {}

      if (currentUser && currentUser.emailVerified) {
        try {
          await saveStoryToGmailCloud(currentUser, updatedItem, true);
        } catch {}
      }
      return;
    }

    const newFavId = `story_fav_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newFavItem: SavedStoryItem = {
      id: newFavId,
      title: angle.title || 'Untitled Cinematic Story',
      storySummary: angle.storySummary || angle.synopsis || '',
      genre: angle.genre,
      durationDisplay: formatDurationDisplay(),
      durationSeconds: totalSeconds,
      shotCount: 0,
      shots: [],
      angle,
      savedAt: Date.now(),
      isLoved: true,
      syncedToGmail: activeEmail,
    };

    const updatedList = [newFavItem, ...savedStoriesRef.current].slice(0, 50);
    setSavedStories(updatedList);
    try {
      localStorage.setItem('cinematic_saved_stories', JSON.stringify(updatedList));
    } catch {}

    if (currentUser && currentUser.emailVerified) {
      try {
        await saveStoryToGmailCloud(currentUser, newFavItem, true);
        await syncStoryCountToUserAccount(currentUser, updatedList.length);
      } catch {}
    }
  };

  const handleToggleLoveSavedStory = async (story: SavedStoryItem) => {
    const updatedItem: SavedStoryItem = {
      ...story,
      isLoved: !story.isLoved,
    };
    const updatedList = savedStoriesRef.current.map((s) =>
      s.id === story.id ? updatedItem : s
    );
    setSavedStories(updatedList);
    try {
      localStorage.setItem('cinematic_saved_stories', JSON.stringify(updatedList));
    } catch {}
    if (currentUser && currentUser.emailVerified) {
      try {
        await saveStoryToGmailCloud(currentUser, updatedItem, true);
      } catch {}
    }
  };

  const handleSaveCurrentStory = async () => {
    if (!selectedAngle || shots.length === 0) return;
    const activeEmail = currentUser?.emailVerified ? currentUser.email || undefined : undefined;
    const existingMatch = savedStoriesRef.current.find(
      (s) =>
        (s.angle?.id === selectedAngle.id && s.title === selectedAngle.title) ||
        (s.title === selectedAngle.title && s.genre === selectedAngle.genre)
    );
    const storyId = existingMatch?.id || `story_${Date.now()}`;
    const newStoryItem: SavedStoryItem = {
      id: storyId,
      title: selectedAngle.title || 'Untitled Cinematic Story',
      storySummary: selectedAngle.storySummary || selectedAngle.synopsis,
      genre: selectedAngle.genre,
      durationDisplay: formatDurationDisplay(),
      durationSeconds: totalSeconds,
      shotCount: shots.length,
      shots,
      angle: selectedAngle,
      savedAt: Date.now(),
      isLoved: Boolean(existingMatch?.isLoved),
      syncedToGmail: activeEmail || existingMatch?.syncedToGmail,
    };

    const updated = [newStoryItem, ...savedStories.filter((s) => s.id !== storyId)].slice(0, 50);
    setSavedStories(updated);
    try {
      localStorage.setItem('cinematic_saved_stories', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }

    if (currentUser && currentUser.emailVerified) {
      try {
        await saveStoryToGmailCloud(currentUser, newStoryItem, false);
        await syncStoryCountToUserAccount(currentUser, updated.length);
      } catch (cloudErr) {
        console.warn('Cloud sync failed:', cloudErr);
      }
    }

    handleDownloadStoryTxt(newStoryItem);

    setSaveSuccessMessage(
      lang === 'ml'
        ? '✅ കഥയും എല്ലാ പ്രോംപ്റ്റുകളും നിങ്ങളുടെ ഡിവൈസിലെ ഹിസ്റ്ററിയിൽ സേവ് ചെയ്യുകയും .TXT ഫയൽ ഡൗൺലോഡ് ആവുകയും ചെയ്തു!'
        : '✅ Story & prompts saved locally to History on your device and downloaded as .TXT!'
    );
    setTimeout(() => setSaveSuccessMessage(null), 6000);
  };

  const handleContinueFromStory = (
    storyTitle: string,
    storySummary: string,
    lastShotAction?: string
  ) => {
    const isMalayalam = lang === 'ml';
    const continuationPrompt = isMalayalam
      ? `കഥയുടെ മുൻഭാഗം / കഴിഞ്ഞ സീൻ (${storyTitle}):\n"${storySummary}"\n\nഒടുവിലത്തെ ക്ലൈമാക്സ് രംഗം:\n"${lastShotAction || ''}"\n\nഇതിന്റെ അടുത്ത ഭാഗം (Next Part / പുതിയ അധ്യായം) കൂടുതൽ ട്വിസ്റ്റുകളോടും നാടകീയതയോടും കൂടി തുടർന്ന് എഴുതുക.`
      : `Story Part Continuation for "${storyTitle}":\nPrevious Summary: "${storySummary}"\nLast Climax Shot: "${lastShotAction || ''}"\n\nWrite the next exciting continuation chapter with escalating stakes and twists.`;

    setPremise(continuationPrompt);
    setContinuationBadge(storyTitle);
    setActiveStep('input');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLoadSavedStory = (story: SavedStoryItem) => {
    if (story.shots && story.shots.length > 0) {
      setSelectedAngle(story.angle);
      setShots(story.shots);
      setActiveStep('prompts');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (story.angle) {
      void handleSelectStoryAndOpenPromptPage(story.angle);
    }
  };

  const handleDeleteSavedStory = (id: string) => {
    const updated = savedStories.filter((s) => s.id !== id);
    setSavedStories(updated);
    try {
      localStorage.setItem('cinematic_saved_stories', JSON.stringify(updated));
    } catch {}
    if (currentUser && currentUser.emailVerified) {
      void deleteStoryFromGmailCloud(currentUser, id);
      void syncStoryCountToUserAccount(currentUser, updated.length);
    }
  };

  const presetDurations = [
    { name: `8 ${t.unitSecond}`, val: 8, unit: 'seconds' as const },
    { name: `16 ${t.unitSecond}`, val: 16, unit: 'seconds' as const },
    { name: `24 ${t.unitSecond}`, val: 24, unit: 'seconds' as const },
    { name: `30 ${t.unitSecond}`, val: 30, unit: 'seconds' as const },
    { name: `1 ${t.unitMinute}`, val: 1, unit: 'minutes' as const },
    { name: `2 ${t.unitMinute}`, val: 2, unit: 'minutes' as const },
    { name: `5 ${t.unitMinute}`, val: 5, unit: 'minutes' as const },
    { name: `10 ${t.unitMinute}`, val: 10, unit: 'minutes' as const },
    { name: `30 ${t.unitMinute}`, val: 30, unit: 'minutes' as const },
    { name: `1 ${t.unitHour}`, val: 1, unit: 'hours' as const },
    { name: `2 ${t.unitHour}`, val: 2, unit: 'hours' as const },
    { name: `3 ${t.unitHour}`, val: 3, unit: 'hours' as const },
  ];

  const expectedAngleCount = selectedCategoryId === 'all' ? 28 : 8;
  const totalAngleCountDisplay = storyAngles.length > 0 ? storyAngles.length : expectedAngleCount;

  // Standalone dedicated Admin Panel view (no website header, login bar, or bottom nav tabs)
  if (showAdminPanel) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black max-w-full overflow-x-clip touch-pan-y">
        <AdminDashboard
          lang={lang}
          onClose={() => {
            setShowAdminPanel(false);
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('admin');
              if (url.hash.toLowerCase().includes('admin')) url.hash = '';
              if (url.pathname.toLowerCase().replace(/\/+$/, '') === '/admin') url.pathname = '/';
              window.history.replaceState(null, '', url.pathname + url.search + url.hash);
            }
          }}
        />
      </div>
    );
  }

  // Mandatory First-Open Terms & Conditions Gate (blocks until user taps I Agree / Continue)
  if (!termsAccepted) {
    return (
      <div className="min-h-screen bg-[#07090e] text-zinc-100">
        <TermsAndConditionsModal
          open={true}
          lang={lang}
          onChangeLang={(nextLang) => handleLanguageChange(nextLang)}
          alreadyAccepted={false}
          onAccept={() => setTermsAccepted(true)}
        />
      </div>
    );
  }

  // Full-screen dedicated 16:9 Studio (Editing / VFX Editing / Color Grading)
  if (
    !showAdminPanel &&
    (activeStep === 'editor' || activeStep === 'vfx' || activeStep === 'color')
  ) {
    const resolvedStudioMode: 'editing' | 'vfx' | 'color' =
      activeStep === 'vfx' ? 'vfx' : activeStep === 'color' ? 'color' : 'editing';
    return (
      <>
        <VideoEditorStudio
          lang={lang}
          currentUser={currentUser}
          studioMode={resolvedStudioMode}
          onChangeStudioMode={(mode) => {
            void tryLockLandscapeOrientation();
            trackStepChange('editor');
            setActiveStep(mode === 'vfx' ? 'vfx' : mode === 'color' ? 'color' : 'editor');
          }}
          onBackToStoryboard={() => {
            unlockScreenOrientation();
            trackStepChange('input');
            setActiveStep('input');
          }}
          onOpenTerms={() => setShowTermsReviewModal(true)}
        />
        <TermsAndConditionsModal
          open={showTermsReviewModal}
          lang={lang}
          onChangeLang={(nextLang) => handleLanguageChange(nextLang)}
          alreadyAccepted={true}
          onAccept={() => setShowTermsReviewModal(false)}
          onCloseReview={() => setShowTermsReviewModal(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black max-w-full overflow-x-clip touch-pan-y">
      {/* Top Global Language Switcher Bar (Clean Dropdown Card + Terms Viewer) */}
      <div className="bg-[#07080d] border-b border-zinc-800/80 px-3.5 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <Globe className="w-4 h-4 shrink-0" />
            <span>{t.languageLabel}:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTermsReviewModal(true)}
              className="min-h-[32px] px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-teal-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title={lang === 'ml' ? 'നിബന്ധനകളും വ്യവസ്ഥകളും കാണുക' : 'View Terms & Conditions'}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'ml' ? 'നിബന്ധനകൾ' : 'Terms'}</span>
            </button>
            <div className="relative">
              <select
                value={lang}
                onChange={(e) => handleLanguageChange(e.target.value as AppLang)}
                className="bg-zinc-900 border border-amber-500/40 text-amber-300 rounded-xl px-3.5 py-1.5 text-xs font-bold font-sans cursor-pointer focus:outline-none focus:border-amber-400 shadow-sm"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code} className="bg-zinc-900 text-white">
                    {opt.nativeName} ({opt.label})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* App Header with Desktop Breadcrumb Step Indicator & Profile Avatar */}
      <header className="border-b border-zinc-800/80 px-3.5 sm:px-6 lg:px-8 py-3 sm:py-4 bg-[#0d0f17]/95 sm:sticky sm:top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500 text-black shadow-md shadow-amber-500/20 shrink-0">
              <Film className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase truncate">
                {t.appTitle}
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-400 line-clamp-1">
                {activeStep === 'input' && t.page1Subtitle}
                {activeStep === 'options' && t.page2Subtitle(totalAngleCountDisplay)}
                {activeStep === 'prompts' && t.page3Subtitle(formatDurationDisplay(), calculatedShotCount)}
                {activeStep === 'history' &&
                  (lang === 'ml'
                    ? 'സേവ് ചെയ്ത കഥകളും ❤️ പ്രിയപ്പെട്ട പ്രോംപ്റ്റുകളും'
                    : 'Saved Story History & ❤️ Favorites')}
                {activeStep === 'login' &&
                  (lang === 'ml'
                    ? 'അക്കൗണ്ട് — പ്രൊഫൈൽ, വാലറ്റ് & പ്രൊമോഷനുകൾ (ലോഗിൻ നിർബന്ധമില്ല)'
                    : 'Account — Profile, Wallet & Promotions (Optional Sign-In)')}
                {(activeStep === 'editor' || activeStep === 'vfx' || activeStep === 'color') &&
                  (lang === 'ml'
                    ? 'വീഡിയോ എഡിറ്റിംഗ്, VFX & കളർ ഗ്രേഡിംഗ് സ്റ്റുഡിയോ'
                    : 'Video Editing, VFX & Color Grading Studio')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Desktop / Tablet Story Sub-Steps Indicator (Story steps only) */}
            {(activeStep === 'input' || activeStep === 'options' || activeStep === 'prompts') && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminPanel(false);
                      setActiveStep('input');
                    }}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                      !showAdminPanel && activeStep === 'input'
                        ? 'bg-amber-500 text-black font-extrabold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {t.step1}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                  <button
                    type="button"
                    disabled={storyAngles.length === 0}
                    onClick={() => {
                      if (storyAngles.length > 0) {
                        setShowAdminPanel(false);
                        setActiveStep('options');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                      storyAngles.length === 0 ? 'opacity-40 cursor-not-allowed text-zinc-600' : 'cursor-pointer'
                    } ${
                      !showAdminPanel && activeStep === 'options'
                        ? 'bg-amber-500 text-black font-extrabold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {t.step2(storyAngles.length)}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                  <button
                    type="button"
                    disabled={!selectedAngle || shots.length === 0}
                    onClick={() => {
                      if (selectedAngle && shots.length > 0) {
                        setShowAdminPanel(false);
                        setActiveStep('prompts');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                      !selectedAngle ? 'opacity-40 cursor-not-allowed text-zinc-600' : 'cursor-pointer'
                    } ${
                      !showAdminPanel && activeStep === 'prompts'
                        ? 'bg-amber-500 text-black font-extrabold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {t.step3}
                  </button>
                </div>
              </div>
            )}

            {/* Optional Account Button (Profile, Wallet & Promotions) */}
            <button
              type="button"
              onClick={() => setActiveStep('login')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold transition-all cursor-pointer shrink-0"
              title={
                currentUser?.email ||
                (lang === 'ml'
                  ? 'പ്രൊഫൈൽ, വാലറ്റ് & പ്രൊമോഷനുകൾ (ഓപ്ഷണൽ)'
                  : 'Profile, Wallet & Promotions (Optional Sign-In)')
              }
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-7 h-7 rounded-full object-cover border border-amber-500/50"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                  {(currentUser?.email || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="max-w-[110px] truncate hidden sm:inline text-zinc-200">
                {currentUser?.displayName || currentUser?.email || (lang === 'ml' ? 'അക്കൗണ്ട്' : 'Account')}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container (Safe bottom clearance above fixed 4-tab bottom nav on both mobile & desktop) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 overflow-x-clip touch-pan-y">
            {/* Top In-Flow Banner placed cleanly below Language Bar & Header */}
            <TopBannerAd />

        {/* Error notification with explicit Offline Script Engine action */}
        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>{error}</span>
            {offlineFallbackType && (
              <button
                type="button"
                onClick={handleRunOfflineFallback}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider cursor-pointer shrink-0 transition-all shadow-md"
              >
                {t.offlineFallbackBtn}
              </button>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* PAGE 1: STORY PREMISE & TOTAL FILM DURATION INPUT (`activeStep === 'input'`) */}
        {/* ================================================================= */}
        {activeStep === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            {/* Left Studio Panel (Mobile Top / Desktop 7 cols): Story Concept */}
            <div className="lg:col-span-7 bg-[#11131f] border border-zinc-800 p-4 sm:p-6 rounded-2xl shadow-2xl space-y-3">

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>{t.premiseLabel}</span>
                </label>
                {premise.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPremise('');
                      setStoryAngles([]);
                      setSelectedAngle(null);
                      setShots([]);
                      setContinuationBadge(null);
                    }}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    title={t.clearBtn}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{t.clearBtn}</span>
                  </button>
                )}
              </div>

              {continuationBadge && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-300 min-w-0">
                    <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                    <span className="truncate">
                      {lang === 'ml'
                        ? `⚡ "${continuationBadge}" കഥയുടെ തുടർഭാഗമാണ് ഇപ്പോൾ തയ്യാറാക്കുന്നത്.`
                        : `⚡ Continuing story: "${continuationBadge}"`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContinuationBadge(null)}
                    className="text-zinc-400 hover:text-white px-2 py-0.5 rounded cursor-pointer shrink-0 font-bold"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="relative">
                <AutoResizeTextarea
                  value={premise}
                  onChange={(e) => setPremise(e.target.value)}
                  rows={5}
                  placeholder={t.premisePlaceholder}
                  className="w-full min-h-[140px] lg:min-h-[200px] bg-[#0a0b12] border border-zinc-800 rounded-xl p-3.5 sm:p-4 text-base sm:text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors leading-relaxed"
                />
              </div>

              {/* 366+ Curated Story Categories Selector */}
              <div className="p-3.5 rounded-xl bg-[#090a12] border border-zinc-800/90 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.categorySelectorLabel}</span>
                  </label>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                    {t.categoriesCountBadge(STORY_CATEGORIES.length)}
                  </span>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    placeholder={t.categorySearchPlaceholder}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-lg pl-9 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none"
                  />
                  {categorySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCategorySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 14 Genre Group Horizontal Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => setCategoryGroupFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer transition-all ${
                      categoryGroupFilter === 'all'
                        ? 'bg-amber-500 text-black font-extrabold'
                        : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
                    }`}
                  >
                    All ({STORY_CATEGORIES.length})
                  </button>
                  {STORY_CATEGORY_GROUPS.map((grp) => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setCategoryGroupFilter(grp.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer transition-all ${
                        categoryGroupFilter === grp.id
                          ? 'bg-amber-500 text-black font-extrabold'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
                      }`}
                    >
                      {grp.icon} {grp.labels[lang] || grp.labels.en}
                    </button>
                  ))}
                </div>

                {/* All Categories Explore Option + Matching Categories Scrollable Grid */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId('all')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      selectedCategoryId === 'all'
                        ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                        : 'bg-zinc-900/70 border border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span>✨ {t.allCategoriesLabel}</span>
                    {selectedCategoryId === 'all' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>

                  <div className="max-h-48 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {filteredCategories.slice(0, 120).map((cat) => {
                      const grp = getCategoryGroup(cat.groupId);
                      const isSel = selectedCategoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className={`text-left px-2.5 py-2 rounded-lg border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-amber-500 text-black border-amber-400 font-extrabold shadow-sm'
                              : 'bg-zinc-950/90 hover:bg-zinc-900 text-zinc-200 border-zinc-800/90'
                          }`}
                        >
                          <div className="text-[11px] font-bold leading-snug truncate">
                            {grp.icon} {cat.name}
                          </div>
                          <div
                            className={`text-[10px] truncate ${
                              isSel ? 'text-black/80 font-semibold' : 'text-zinc-500'
                            }`}
                          >
                            {cat.tone} · {cat.pacing}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedCategoryObj && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 space-y-1">
                      <div className="font-bold text-amber-300">
                        {getCategoryGroup(selectedCategoryObj.groupId).icon} {selectedCategoryObj.name} — {selectedCategoryObj.tone}
                      </div>
                      <div className="text-zinc-300 text-[10px] leading-relaxed">
                        {selectedCategoryObj.visualStyle} · {selectedCategoryObj.cameraFocus}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-1">
                <InFeedBannerAd slotId="page1-left-bottom" slotIndex={1} />
              </div>
            </div>

            {/* Compact video + small banner between Premise & Duration panels on mobile without breaking desktop grid */}
            <div className="lg:hidden col-span-full">
              <VideoWithSmallBannerAd slotId="page1-mobile-mid" slotIndex={0} startIndex={1} />
            </div>

            {/* Right Studio Panel (Mobile Bottom / Desktop 5 cols): Duration, Clips & CTA */}
            <div className="lg:col-span-5 bg-[#11131f] border border-zinc-800 p-4 sm:p-6 rounded-2xl shadow-2xl space-y-4">
              <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Timer className="w-4 h-4 shrink-0" />
                <span>{t.durationLabel}</span>
              </label>

              {/* Duration Presets (Responsive Mobile 3-col Grid / Desktop Flex Wrap) */}
              <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2">
                {presetDurations.map((preset, idx) => {
                  const pSec =
                    preset.unit === 'seconds'
                      ? preset.val
                      : preset.unit === 'hours'
                      ? preset.val * 3600
                      : preset.val * 60;
                  const pClips = Math.max(1, Math.ceil(pSec / shotDurationSec));
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(preset.val, preset.unit)}
                      className={`px-2.5 sm:px-3.5 py-2.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer text-center ${
                        durationValue === preset.val && durationUnit === preset.unit
                          ? 'bg-amber-500 text-black border-amber-400 font-extrabold shadow-md shadow-amber-500/20'
                          : 'bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800'
                      }`}
                    >
                      <span className="block sm:inline">{preset.name}</span>{' '}
                      <span className="opacity-80 text-[10px] sm:text-xs">
                        ({pClips} {t.clipsWord})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Compact small sponsor slot below presets */}
              <CompactSmallBannerAd slotId="page1-presets-small" slotIndex={2} />

              {/* Custom Typing Box for Duration & Unit Switcher */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-[#090a12] border border-amber-500/30 space-y-3 shadow-inner">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-zinc-300 font-bold">{t.typeCustomDuration}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="180"
                        step="0.5"
                        value={customInputValue}
                        onChange={(e) => handleCustomInputChange(e.target.value)}
                        className="w-20 bg-zinc-950 border border-amber-500/50 rounded-lg px-2.5 py-1.5 sm:py-1 text-base sm:text-sm font-mono text-amber-400 font-extrabold focus:outline-none focus:border-amber-400 text-center"
                      />

                      <select
                        value={durationUnit}
                        onChange={(e) => {
                          setDurationUnit(e.target.value as any);
                          triggerOptionVideoBreak();
                        }}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 sm:py-1 text-sm sm:text-xs font-mono text-zinc-200 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="seconds">{t.unitSecondsFull}</option>
                        <option value="minutes">{t.unitMinutesFull}</option>
                        <option value="hours">{t.unitHoursFull}</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/60">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-zinc-400">{t.clipDurationLabel}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[5, 8, 10, 12].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => {
                            setShotDurationSec(sec);
                            triggerOptionVideoBreak();
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
                            shotDurationSec === sec
                              ? 'bg-amber-500 text-black'
                              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Flexible Dialogue vs Visual Comedy Control (Page 1) */}
                  <div className="pt-2.5 border-t border-zinc-800/60 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-zinc-400">{t.dialogueModeLabel}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'dynamic', label: t.dialogueModeDynamic },
                          { id: 'dialogue', label: t.dialogueModeDialogue },
                          { id: 'silent', label: t.dialogueModeSilent },
                        ] as const
                      ).map((modeOpt) => (
                        <button
                          key={modeOpt.id}
                          type="button"
                          onClick={() => {
                            setDialogueMode(modeOpt.id);
                            triggerOptionVideoBreak();
                          }}
                          className={`px-2.5 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center leading-tight ${
                            dialogueMode === modeOpt.id
                              ? 'bg-amber-500 text-black font-extrabold shadow-sm shadow-amber-500/20'
                              : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
                          }`}
                        >
                          {modeOpt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dynamic Big Calculation Display Banner */}
                <div className="p-3 bg-[#131626] rounded-xl border border-amber-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-xs font-mono text-zinc-300">
                    {t.selectedTotalTime} <strong className="text-white font-bold">{formatDurationDisplay()}</strong>
                  </span>
                  <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-amber-500 text-black font-extrabold shadow-sm flex items-center justify-center gap-1.5 w-full sm:w-auto">
                    <PlayCircle className="w-3.5 h-3.5 shrink-0" />
                    {t.requiredClips(calculatedShotCount, shotDurationSec)}
                  </span>
                </div>
              </div>

              {/* Submit Button to Open Page 2 */}
              <button
                type="button"
                onClick={handleGenerateStoryAngles}
                disabled={loadingAngles || !premise.trim()}
                className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.99] text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 shrink-0 ${loadingAngles ? 'animate-spin' : ''}`} />
                <span className="text-center leading-snug">
                  {loadingAngles
                    ? t.generatingAngles
                    : t.generateAnglesBtn(expectedAngleCount, formatDurationDisplay(), calculatedShotCount)}
                </span>
              </button>
            </div>

            {/* Clean Full-Width Showcase Video + Banner below panels */}
            <div className="lg:col-span-12 space-y-4">
              <NativeCardAd slotId="page1-native-card" slotIndex={3} />
              <FullWidthShowcaseAd slotId="page1-showcase" />
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PAGE 2: STORY OPTION CARDS (`activeStep === 'options'`)           */}
        {/* ================================================================= */}
        {activeStep === 'options' && (
          <div className="space-y-6">
            {/* Page Header with Back Button & Voice Speed Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111320] p-3.5 sm:p-4 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveStep('input')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t.backToInput}</span>
              </button>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Voice Storytelling Style Control */}
                <div className="flex items-center gap-1.5 bg-[#090a12] px-2.5 py-1.5 rounded-xl border border-zinc-800">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold text-zinc-400 hidden sm:inline">
                    {t.voicePaceLabel}
                  </span>
                  <div className="flex items-center gap-1">
                    {(
                      [
                        { id: 'story', label: t.paceVerySlow },
                        { id: 'narrator', label: t.paceSlow },
                        { id: 'calm', label: t.paceNormal },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          if (voicePace !== opt.id) {
                            stopAllSpeech();
                            setVoicePace(opt.id);
                          }
                          triggerOptionVideoBreak();
                        }}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          voicePace === opt.id
                            ? 'bg-amber-500 text-black font-extrabold'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="text-xs font-mono text-zinc-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                  {t.selectedTimeLabel} <strong className="text-amber-400 font-bold">{formatDurationDisplay()}</strong> ({calculatedShotCount} {t.clipsWord})
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>{t.selectStoryTitle(storyAngles.length)}</span>
              </h2>
              <p className="text-xs text-zinc-400">
                {t.selectStoryDesc(storyAngles.length, formatDurationDisplay(), calculatedShotCount)}
              </p>
            </div>

            {loadingAngles && (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-zinc-400 bg-[#0f111c] border border-zinc-800 rounded-2xl">
                <Sparkles className="w-8 h-8 animate-spin text-amber-400" />
                <span className="text-xs font-mono">{t.generatingAngles}</span>
              </div>
            )}

            {/* Genre Category Filter Bar across all populated Category Groups */}
            {!loadingAngles && (
              <>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap sm:flex-wrap p-2 rounded-xl bg-[#0b0c14] border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGenreFilter('all');
                      triggerOptionVideoBreak();
                    }}
                    className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      selectedGenreFilter === 'all'
                        ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {t.filterAll(storyAngles.length)}
                  </button>
                  {STORY_CATEGORY_GROUPS.filter((grp) =>
                    storyAngles.some((a) => a.categoryGroup === grp.id)
                  ).map((grp) => {
                    const count = storyAngles.filter((a) => a.categoryGroup === grp.id).length;
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => {
                          setSelectedGenreFilter(grp.id);
                          triggerOptionVideoBreak();
                        }}
                        className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          selectedGenreFilter === grp.id
                            ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {grp.icon} {grp.labels[lang] || grp.labels.en} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Story Option Cards List — Small banner between every card + Playing Video Ad & Banner every 3 cards */}
                <div className="grid grid-cols-1 max-w-4xl mx-auto gap-4 sm:gap-5">
                  {storyAngles
                    .filter((angle) => {
                      if (selectedGenreFilter === 'all') return true;
                      if (angle.categoryGroup) return angle.categoryGroup === selectedGenreFilter;
                      if (angle.catKey) return angle.catKey === selectedGenreFilter;
                      return true;
                    })
                    .map((angle, angleIdx) => {
                      const showVideoAndBannerHere =
                        angleIdx === 2 || angleIdx === 7 || angleIdx === 12;
                      const showSmallBannerHere =
                        !showVideoAndBannerHere && (angleIdx === 0 || angleIdx === 4 || angleIdx === 9 || angleIdx === 14);

                      return (
                        <React.Fragment key={angle.id}>
                          <div className="p-4 sm:p-6 rounded-2xl bg-[#0f111c] border-2 border-zinc-800 hover:border-amber-400/70 transition-all flex flex-col justify-between space-y-4 relative shadow-2xl">
                            <div className="space-y-3.5 select-text">
                              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 gap-2">
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  {angle.genre}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {(() => {
                                    const isLoved =
                                      lovedStoryKeys.has(`id:${angle.id}::${angle.title}`) ||
                                      lovedStoryKeys.has(`tg:${angle.title}::${angle.genre}`);
                                    return (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void handleToggleLoveAngle(angle);
                                        }}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                          isLoved
                                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-sm shadow-rose-500/20'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/40'
                                        }`}
                                        title={
                                          isLoved
                                            ? lang === 'ml'
                                              ? '❤️ ഹിസ്റ്ററിയിൽ സേവ് ചെയ്തു'
                                              : '❤️ Loved & Saved in History'
                                            : lang === 'ml'
                                            ? '❤️ പ്രിയപ്പെട്ടതായി ഹിസ്റ്ററിയിൽ സേവ് ചെയ്യുക'
                                            : '❤️ Love & Save to History'
                                        }
                                        aria-label={isLoved ? 'Loved story' : 'Love and save story'}
                                      >
                                        <Heart
                                          className={`w-4 h-4 ${
                                            isLoved ? 'fill-rose-500 text-rose-500' : ''
                                          }`}
                                        />
                                        <span className="text-[11px]">
                                          {isLoved
                                            ? lang === 'ml'
                                              ? 'സേവ് ആയി'
                                              : 'Saved'
                                            : lang === 'ml'
                                            ? 'ഇഷ്ടമായി'
                                            : 'Love'}
                                        </span>
                                      </button>
                                    );
                                  })()}
                                  <button
                                    type="button"
                                    onClick={() => handleSelectStoryAndOpenPromptPage(angle)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-all cursor-pointer"
                                    aria-label={t.selectThisStory(calculatedShotCount)}
                                  >
                                    <ChevronRight className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>

                              <h3
                                onClick={() => handleSelectStoryAndOpenPromptPage(angle)}
                                className="text-lg font-extrabold text-white tracking-wide hover:text-amber-300 transition-colors cursor-pointer break-words"
                              >
                                {angle.title}
                              </h3>

                              <p className="text-xs text-amber-400/90 font-mono font-semibold break-words">
                                {angle.mood}
                              </p>

                              {(angle.visualStyle || angle.cameraFocus) && (
                                <div className="flex flex-wrap gap-1.5 text-[11px]">
                                  {angle.categoryName && (
                                    <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-amber-300 font-semibold">
                                      {angle.categoryName}
                                    </span>
                                  )}
                                  {angle.cameraFocus && (
                                    <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                                      🎥 {angle.cameraFocus}
                                    </span>
                                  )}
                                  {angle.visualStyle && (
                                    <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                                      💡 {angle.visualStyle}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Characters List */}
                              {angle.characters && (
                                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-sm sm:text-xs space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block font-mono">
                                    {t.charactersLabel}
                                  </span>
                                  <p className="text-zinc-200 font-medium leading-relaxed break-words">
                                    {angle.characters}
                                  </p>
                                </div>
                              )}

                              {/* Full Story Summary */}
                              <div className="p-4 bg-[#090a12] rounded-xl border border-zinc-800 text-sm sm:text-[13px] leading-relaxed text-zinc-200 font-sans space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block font-mono">
                                  {t.storyOverviewLabel}
                                </span>
                                <p className="whitespace-pre-line text-zinc-100 leading-relaxed font-sans break-words">
                                  {angle.storySummary || angle.synopsis}
                                </p>
                              </div>

                              {/* Background Music (BGM) & Visual Continuity Badges */}
                              {(angle.bgm || angle.continuity) && (
                                <div className="space-y-2">
                                  {angle.bgm && (
                                    <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block font-mono">
                                        {t.bgmLabel}
                                      </span>
                                      <p className="text-zinc-200 leading-relaxed break-words">{angle.bgm}</p>
                                    </div>
                                  )}
                                  {angle.continuity && (
                                    <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/90 text-xs space-y-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-mono">
                                        {t.continuityLabel}
                                      </span>
                                      <p className="text-zinc-300 leading-relaxed break-words">{angle.continuity}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-zinc-800/80 flex items-center gap-2">
                              {(() => {
                                const isSpeaking = speakingAngleId === angle.id;
                                const isLoadingVoice = loadingTtsId === angle.id;
                                const isActiveVoice = isSpeaking || isLoadingVoice;
                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const fullText = buildCardNarrationText({
                                        title: angle.title,
                                        genre: angle.genre,
                                        characters: angle.characters,
                                        summary: angle.storySummary || angle.synopsis,
                                        lang,
                                      });
                                      toggleSpeakText(angle.id, fullText);
                                    }}
                                    className={`px-3.5 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                                      isActiveVoice
                                        ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30'
                                        : 'bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30'
                                    }`}
                                    title={isActiveVoice ? t.voiceStop : t.voicePlay}
                                  >
                                    <span className="text-base">{isActiveVoice ? '⏹️' : '🎙️'}</span>
                                    <span>
                                      {isLoadingVoice
                                        ? t.voiceLoadingStop
                                        : isSpeaking
                                        ? t.voiceStop
                                        : t.voicePlay}
                                    </span>
                                  </button>
                                );
                              })()}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectStoryAndOpenPromptPage(angle);
                                }}
                                className="flex-1 py-3.5 rounded-xl bg-amber-500 group-hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <span>{t.selectThisStory(calculatedShotCount)}</span>
                              </button>
                            </div>
                          </div>

                          {showVideoAndBannerHere && (
                            <VideoWithSmallBannerAd
                              slotId={`angle-vband-${angleIdx}`}
                              slotIndex={angleIdx}
                              startIndex={angleIdx % 5}
                            />
                          )}
                          {showSmallBannerHere && (
                            <CompactSmallBannerAd
                              slotId={`angle-small-${angleIdx}`}
                              slotIndex={angleIdx}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* PAGE 3: DEDICATED PROMPTS GENERATOR PAGE (`activeStep === 'prompts'`) */}
        {/* ================================================================= */}
        {activeStep === 'prompts' && selectedAngle && (
          <div className="space-y-6">
            {/* Prompts Page Top Header with Back to Options & Dialogue Mode Switcher */}
            <div className="bg-[#111320] p-4 rounded-xl border border-amber-500/40 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveStep('options')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t.backToAngles}</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {selectedAngle.genre}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {selectedAngle.title} — {formatDurationDisplay()}
                  </span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 shrink-0">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  {t.dialogueModeLabel}
                </span>
                <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'dynamic', label: t.dialogueModeDynamic },
                      { id: 'dialogue', label: t.dialogueModeDialogue },
                      { id: 'silent', label: t.dialogueModeSilent },
                    ] as const
                  ).map((modeOpt) => (
                    <button
                      key={modeOpt.id}
                      type="button"
                      disabled={loadingShots}
                      onClick={() => handleDialogueModeChangeOnPrompts(modeOpt.id)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 ${
                        dialogueMode === modeOpt.id
                          ? 'bg-amber-500 text-black font-extrabold shadow-sm shadow-amber-500/20'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
                      }`}
                    >
                      {modeOpt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subtle Top Sponsor Banner */}
            <CompactSmallBannerAd slotId="prompts-top-small" slotIndex={1} />

            {loadingShots && (
              <div className="py-16 flex flex-col items-center justify-center space-y-3 text-zinc-400 bg-[#0f111c] border border-zinc-800 rounded-2xl">
                <Sparkles className="w-8 h-8 animate-spin text-amber-400" />
                <span className="text-xs font-mono">
                  {t.preparingPrompts(formatDurationDisplay(), calculatedShotCount)}
                </span>
              </div>
            )}

            {/* Editable Vertically Descending or Single Full-Screen Shot Prompt Cards */}
            {!loadingShots && shots.length > 0 && (() => {
              const safeFocusedIdx = Math.min(focusedShotIndex, Math.max(0, shots.length - 1));
              const displayedEntries =
                promptViewMode === 'single'
                  ? [{ shot: shots[safeFocusedIdx], idx: safeFocusedIdx }]
                  : shots.slice(0, visiblePromptCount).map((shot, idx) => ({ shot, idx }));

              const jumpToShot = (nextIdx: number) => {
                const bounded = Math.max(0, Math.min(shots.length - 1, nextIdx));
                setFocusedShotIndex(bounded);
                triggerOptionVideoBreak();
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              };

              return (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <h2 className="text-base font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                      <span>{t.breakdownTitle}</span>
                    </h2>
                    <p className="text-xs text-amber-400/90 font-mono">
                      {t.breakdownEditHint}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-amber-300 font-extrabold px-3.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    {t.totalSceneClips(shots.length, formatDurationDisplay())}
                  </span>
                </div>

                {/* Reading Mode Toggle Bar: Full-Screen One-by-One Card OR Smooth Free Vertical Scroll */}
                <div className="p-2.5 rounded-xl bg-[#0e101c] border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="grid grid-cols-2 sm:flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setPromptViewMode('all');
                        triggerOptionVideoBreak();
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                        promptViewMode === 'all'
                          ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
                      }`}
                    >
                      {t.viewAllShotsBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPromptViewMode('single');
                        triggerOptionVideoBreak();
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                        promptViewMode === 'single'
                          ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
                      }`}
                    >
                      {t.viewSingleShotBtn}
                    </button>
                  </div>

                  {promptViewMode === 'single' && (
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <button
                        type="button"
                        disabled={safeFocusedIdx === 0}
                        onClick={() => jumpToShot(safeFocusedIdx - 1)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-amber-400 border border-amber-500/30 text-xs font-bold cursor-pointer disabled:cursor-not-allowed"
                      >
                        {t.prevShotBtn}
                      </button>
                      <span className="text-xs font-mono font-bold text-white px-2">
                        {t.shotOfTotal(safeFocusedIdx + 1, shots.length)}
                      </span>
                      <button
                        type="button"
                        disabled={safeFocusedIdx >= shots.length - 1}
                        onClick={() => jumpToShot(safeFocusedIdx + 1)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-extrabold cursor-pointer disabled:cursor-not-allowed"
                      >
                        {t.nextShotBtn}
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Shot Number Jump Strip when in One-by-One Full View */}
                {promptViewMode === 'single' && shots.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {shots.map((_, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => jumpToShot(sIdx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold shrink-0 cursor-pointer transition-all ${
                          sIdx === safeFocusedIdx
                            ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                        }`}
                      >
                        #{(sIdx + 1).toString().padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                )}

                {displayedEntries.map(({ shot, idx }) => {
                  const shotNumber = shot.shotNumber || idx + 1;
                  const shotDur = shot.durationSeconds || shotDurationSec;

                  const shotBgm = shot.bgm || selectedAngle.bgm || '';
                  const shotContinuity = shot.continuity || selectedAngle.continuity || '';
                  const shotDialogue = shot.malayalamDialogue || '';
                  const isEditingThisShot = Boolean(editingShots[idx]);

                  const vidPromptText =
                    shot.videoPrompt ||
                    `[VIDEO MOTION PROMPT — SHOT ${shotNumber.toString().padStart(2, '0')}]: Continuous 24fps sequence${
                      shotNumber > 1 ? ` seamlessly following Shot ${(shotNumber - 1).toString().padStart(2, '0')}` : ''
                    }. Situation & Action: ${shot.action}.${
                      shotContinuity ? ` Continuity Lock: ${shotContinuity}.` : ''
                    }${
                      shotDialogue.trim().length > 0
                        ? ` Spoken Dialogue (${lang.toUpperCase()}): "${shotDialogue.trim()}".`
                        : ' Audio: NO SPOKEN DIALOGUE — Pure visual storytelling with realistic ambient sound only.'
                    }${shotBgm ? ` Background Music & SFX: ${shotBgm}.` : ''} Camera: Smooth anamorphic tracking shot, ${shotDur} seconds.`;

                  const imgPromptText =
                    shot.imagePrompt ||
                    `[PHOTO KEYFRAME PROMPT — SHOT ${shotNumber.toString().padStart(2, '0')}]: Cinematic photorealistic 35mm static film frame. Situation & Action: ${shot.action}.${
                      shotContinuity ? ` Continuity Lock: ${shotContinuity}.` : ''
                    } Lighting: Natural cinematic key light, volumetric shadows, 8k crisp still photography, no text overlays.`;

                  const isVideoCopied = copiedKey === `vid-${idx}`;
                  const isImageCopied = copiedKey === `img-${idx}`;
                  const isMasterCopied = copiedKey === `master-${idx}`;

                  const copyVideoPrompt = () => {
                    navigator.clipboard.writeText(vidPromptText);
                    setCopiedKey(`vid-${idx}`);
                    setTimeout(() => setCopiedKey(null), 2000);
                  };

                  const copyImagePrompt = () => {
                    navigator.clipboard.writeText(imgPromptText);
                    setCopiedKey(`img-${idx}`);
                    setTimeout(() => setCopiedKey(null), 2000);
                  };

                  const copyMasterBlock = () => {
                    const masterPayload = `========================================
SHOT ${shotNumber} (${shotDur} SECONDS) - ${shot.action}
========================================
${shotDialogue.trim() ? `SPOKEN DIALOGUE: "${shotDialogue.trim()}"\n` : ''}${shotBgm ? `BGM & SOUND: ${shotBgm}\n` : ''}${shotContinuity ? `CONTINUITY LOCK: ${shotContinuity}\n` : ''}
1. VIDEO MOTION PROMPT (CONTINUOUS MOTION + DIALOGUE + BGM):
${vidPromptText}

2. STATIC PHOTO KEYFRAME PROMPT (FACE & WARDROBE CONTINUITY):
${imgPromptText}`;
                    navigator.clipboard.writeText(masterPayload);
                    setCopiedKey(`master-${idx}`);
                    setTimeout(() => setCopiedKey(null), 2000);
                  };

                  const showShotVideoAndBanner =
                    promptViewMode === 'all' &&
                    idx > 0 &&
                    (idx + 1) % 6 === 0 &&
                    idx < 24;

                  const showShotSmallBanner =
                    promptViewMode === 'all' &&
                    !showShotVideoAndBanner &&
                    (idx === 2 || idx === 8 || idx === 14 || idx === 20);

                  return (
                    <React.Fragment key={idx}>
                      <div className="bg-[#10121d] border border-zinc-800 rounded-2xl shadow-2xl transition-all">
                      {/* Shot Header Bar */}
                      <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-[#0b0c13] border-b border-zinc-800 rounded-t-2xl flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                          <span className="px-3 py-1 rounded-lg bg-amber-500 text-black font-mono font-extrabold text-xs">
                            SHOT {shotNumber.toString().padStart(2, '0')} — {shot.timeRange || `${shotDur}s`}
                          </span>
                          <span className="text-xs font-mono text-zinc-400">
                            ({shotDur}s)
                          </span>
                          {shot.categoryTag && (
                            <span className="px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-amber-300 text-[11px] font-bold">
                              {shot.categoryTag}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Inline Edit / Done Toggle (keeps mobile finger scrolling 100% free when reading) */}
                          <button
                            type="button"
                            onClick={() =>
                              setEditingShots((prev) => ({ ...prev, [idx]: !prev[idx] }))
                            }
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isEditingThisShot
                                ? 'bg-emerald-500 text-black font-extrabold'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            <span>{isEditingThisShot ? t.doneEditingBtn : t.editShotBtn}</span>
                          </button>

                          {/* Quick Copy Video Prompt Button */}
                          <button
                            type="button"
                            onClick={copyVideoPrompt}
                            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isVideoCopied
                                ? 'bg-emerald-500 text-black font-extrabold shadow-md shadow-emerald-500/20'
                                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isVideoCopied ? (
                              <>
                                <Check className="w-4 h-4 text-black" />
                                <span>{t.copiedVideoPromptBtn}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-amber-400" />
                                <span>{t.copyVideoPromptBtn}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Full-Height Non-Scrolling Body (100% visible & swipe-free) */}
                      <div className="p-4 sm:p-5 space-y-4">
                        {/* Camera Angle & Lighting Cues */}
                        {(shot.cameraAngle || shot.lightingCue) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {shot.cameraAngle && (
                              <div className="p-2.5 rounded-lg bg-[#0a0b12] border border-zinc-800/90 text-xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 mb-0.5">
                                  <Camera className="w-3 h-3 shrink-0" />
                                  {t.cameraAngleLabel}
                                </span>
                                <span className="text-zinc-200">{shot.cameraAngle}</span>
                              </div>
                            )}
                            {shot.lightingCue && (
                              <div className="p-2.5 rounded-lg bg-[#0a0b12] border border-zinc-800/90 text-xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 mb-0.5">
                                  <Sun className="w-3 h-3 shrink-0" />
                                  {t.lightingCueLabel}
                                </span>
                                <span className="text-zinc-200">{shot.lightingCue}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Scene Action Summary */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                            <Edit3 className="w-3 h-3 text-amber-400" />
                            {t.shotActionLabel}
                          </span>
                          {isEditingThisShot ? (
                            <AutoResizeTextarea
                              rows={2}
                              value={shot.action}
                              onChange={(e) => updateShotField(idx, 'action', e.target.value)}
                              className="w-full bg-[#0a0b12] border border-zinc-700 rounded-lg p-3 text-base sm:text-sm text-zinc-100 font-sans focus:outline-none focus:border-amber-500 leading-relaxed"
                            />
                          ) : (
                            <p className="w-full bg-[#0a0b12] border border-zinc-800/90 rounded-lg p-3 text-sm sm:text-[15px] text-zinc-100 font-sans leading-relaxed whitespace-pre-wrap break-words select-text">
                              {shot.action}
                            </p>
                          )}
                        </div>

                        {/* Dialogue, BGM & Visual Continuity Lock */}
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                              {t.shotDialogueLabel}
                            </span>
                            {isEditingThisShot ? (
                              <AutoResizeTextarea
                                rows={2}
                                value={shotDialogue}
                                placeholder="—"
                                onChange={(e) => updateShotField(idx, 'malayalamDialogue', e.target.value)}
                                className="w-full bg-[#0a0b12] border border-emerald-500/40 rounded-lg p-3 text-sm text-emerald-100 placeholder-zinc-600 font-sans focus:outline-none focus:border-emerald-400 leading-relaxed"
                              />
                            ) : shotDialogue.trim().length > 0 ? (
                              <p className="w-full bg-[#0a0b12] border border-emerald-500/25 rounded-lg p-3 text-sm text-emerald-100 font-sans leading-relaxed whitespace-pre-wrap break-words select-text">
                                {shotDialogue}
                              </p>
                            ) : (
                              <div className="w-full bg-[#0a0b12] border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 font-semibold">
                                {t.pureVisualBadge}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                <Music className="w-3.5 h-3.5 shrink-0" />
                                {t.shotBgmLabel}
                              </span>
                              {isEditingThisShot ? (
                                <AutoResizeTextarea
                                  rows={2}
                                  value={shotBgm}
                                  onChange={(e) => updateShotField(idx, 'bgm', e.target.value)}
                                  className="w-full bg-[#0a0b12] border border-amber-500/40 rounded-lg p-3 text-sm sm:text-xs text-zinc-100 font-sans focus:outline-none focus:border-amber-500 leading-relaxed"
                                />
                              ) : (
                                <p className="w-full bg-[#0a0b12] border border-amber-500/25 rounded-lg p-3 text-xs sm:text-sm text-zinc-100 font-sans leading-relaxed whitespace-pre-wrap break-words select-text">
                                  {shotBgm}
                                </p>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                {t.continuityLabel}
                              </span>
                              {isEditingThisShot ? (
                                <AutoResizeTextarea
                                  rows={2}
                                  value={shotContinuity}
                                  onChange={(e) => updateShotField(idx, 'continuity', e.target.value)}
                                  className="w-full bg-[#0a0b12] border border-zinc-700 rounded-lg p-3 text-sm sm:text-xs text-zinc-300 font-sans focus:outline-none focus:border-amber-500 leading-relaxed"
                                />
                              ) : (
                                <p className="w-full bg-[#0a0b12] border border-zinc-800/90 rounded-lg p-3 text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap break-words select-text">
                                  {shotContinuity}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Dual Layout: Stacked on Mobile, Side-by-Side on Desktop Web */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* 1. VIDEO GENERATION PROMPT (FULL READABLE HEIGHT) */}
                          <div className="p-3.5 sm:p-4 rounded-xl bg-[#141624] border-2 border-amber-500/50 space-y-2.5 shadow-lg flex flex-col">
                            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-amber-500/20 pb-2">
                              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Film className="w-4 h-4 text-amber-400 shrink-0" />
                                {t.videoPromptHeading}
                              </span>
                              <button
                                type="button"
                                onClick={copyVideoPrompt}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                  isVideoCopied
                                    ? 'bg-emerald-500 text-black'
                                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20'
                                }`}
                              >
                                {isVideoCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{t.copiedVideoShort}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>{t.copyVideoWithDialogue}</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {isEditingThisShot ? (
                              <AutoResizeTextarea
                                value={vidPromptText}
                                onChange={(e) => updateShotField(idx, 'videoPrompt', e.target.value)}
                                rows={4}
                                className="w-full text-sm sm:text-xs text-zinc-100 font-mono leading-relaxed bg-zinc-950 p-3.5 sm:p-4 rounded-lg border border-zinc-700 focus:outline-none focus:border-amber-500 selection:bg-amber-500 selection:text-black"
                              />
                            ) : (
                              <div className="w-full text-sm sm:text-[13px] text-zinc-100 font-mono leading-relaxed bg-zinc-950 p-3.5 sm:p-4 rounded-lg border border-zinc-800 whitespace-pre-wrap break-words select-text">
                                {vidPromptText}
                              </div>
                            )}
                          </div>

                          {/* 2. IMAGE GENERATION PROMPT (FULL READABLE HEIGHT) */}
                          <div className="p-3.5 sm:p-4 rounded-xl bg-[#0d0f17] border border-zinc-800 space-y-2.5 flex flex-col">
                            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-zinc-800 pb-2">
                              <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                {t.imagePromptHeading}
                              </span>
                              <button
                                type="button"
                                onClick={copyImagePrompt}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  isImageCopied
                                    ? 'bg-emerald-500 text-black'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                                }`}
                              >
                                {isImageCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{t.copiedImageShort}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>{t.copyImageShort}</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {isEditingThisShot ? (
                              <AutoResizeTextarea
                                value={imgPromptText}
                                onChange={(e) => updateShotField(idx, 'imagePrompt', e.target.value)}
                                rows={4}
                                className="w-full text-sm sm:text-xs text-zinc-300 font-mono leading-relaxed bg-zinc-950 p-3.5 sm:p-4 rounded-lg border border-zinc-700 focus:outline-none focus:border-amber-500 selection:bg-amber-500 selection:text-black"
                              />
                            ) : (
                              <div className="w-full text-sm sm:text-[13px] text-zinc-200 font-mono leading-relaxed bg-zinc-950 p-3.5 sm:p-4 rounded-lg border border-zinc-800 whitespace-pre-wrap break-words select-text">
                                {imgPromptText}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3. Master Copy Footer */}
                        <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0b12] -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-4 rounded-b-2xl">
                          <span className="text-xs text-zinc-400 font-mono">
                            {t.masterBlockDesc}
                          </span>
                          <button
                            type="button"
                            onClick={copyMasterBlock}
                            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
                              isMasterCopied
                                ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-500/20'
                            }`}
                          >
                            {isMasterCopied ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span>{t.masterCopied}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>{t.masterCopyBoth}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                      {showShotVideoAndBanner && (
                        <VideoWithSmallBannerAd
                          slotId={`shot-vband-${idx}`}
                          slotIndex={idx}
                          startIndex={idx % 5}
                        />
                      )}
                      {showShotSmallBanner && (
                        <CompactSmallBannerAd
                          slotId={`shot-small-${idx}`}
                          slotIndex={idx}
                        />
                      )}
                      {promptViewMode === 'single' && (
                        <>
                          <VideoWithSmallBannerAd
                            slotId={`shot-single-${safeFocusedIdx}`}
                            slotIndex={safeFocusedIdx}
                            startIndex={safeFocusedIdx % 5}
                          />
                          <CompactSmallBannerAd
                            slotId={`shot-single-small-${safeFocusedIdx}`}
                            slotIndex={safeFocusedIdx + 1}
                          />
                        </>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Bottom Prev / Next Bar when in One-by-One Full View */}
                {promptViewMode === 'single' && shots.length > 1 && (
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      disabled={safeFocusedIdx === 0}
                      onClick={() => jumpToShot(safeFocusedIdx - 1)}
                      className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-amber-400 border border-amber-500/30 text-xs font-bold cursor-pointer disabled:cursor-not-allowed"
                    >
                      {t.prevShotBtn}
                    </button>
                    <button
                      type="button"
                      disabled={safeFocusedIdx >= shots.length - 1}
                      onClick={() => jumpToShot(safeFocusedIdx + 1)}
                      className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-extrabold cursor-pointer disabled:cursor-not-allowed"
                    >
                      {t.nextShotBtn}
                    </button>
                  </div>
                )}

                {/* Show More Clips Pagination Button if shots > visiblePromptCount */}
                {promptViewMode === 'all' && shots.length > visiblePromptCount && (
                  <div className="pt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setVisiblePromptCount((prev) => Math.min(shots.length, prev + 25))}
                      className="w-full sm:w-auto px-8 py-3.5 sm:py-3 rounded-xl bg-zinc-800 hover:bg-amber-500 hover:text-black text-amber-400 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer border border-amber-500/30 shadow-lg"
                    >
                      {t.loadMorePrompts(visiblePromptCount, shots.length)}
                    </button>
                  </div>
                )}

                {/* Save Confirmation Banner */}
                {saveSuccessMessage && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm rounded-xl flex items-center justify-between gap-2 shadow-lg">
                    <span className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      {saveSuccessMessage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSaveSuccessMessage(null)}
                      className="text-zinc-400 hover:text-white px-2 py-0.5 rounded cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Story Continuation & Save Action Bar */}
                <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                    {/* Continue story button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedAngle) return;
                        const lastShot = shots[shots.length - 1];
                        handleContinueFromStory(
                          selectedAngle.title,
                          selectedAngle.storySummary || selectedAngle.synopsis,
                          lastShot?.action
                        );
                      }}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{lang === 'ml' ? '➕ ഈ കഥ തുടരുക (Continue Story)' : 'Continue Story (Next Part)'}</span>
                    </button>

                    {/* Save story & prompts button */}
                    <button
                      type="button"
                      onClick={handleSaveCurrentStory}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-amber-500/30 text-amber-300 hover:text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      <span>{lang === 'ml' ? '💾 കഥയും പ്രോംപ്റ്റുകളും സേവ് ചെയ്യുക' : 'Save Story & Prompts'}</span>
                    </button>
                  </div>
                </div>
              </div>
              );
            })()}
          </div>
        )}

        {/* ================================================================= */}
        {/* PAGE 4: VIDEO EDITING / VFX / COLOR STUDIO FALLBACK            */}
        {/* ================================================================= */}
        {(activeStep === 'editor' || activeStep === 'vfx' || activeStep === 'color') && (
          <VideoEditorStudio
            lang={lang}
            currentUser={currentUser}
            studioMode={activeStep === 'vfx' ? 'vfx' : activeStep === 'color' ? 'color' : 'editing'}
            onChangeStudioMode={(mode) => {
              void tryLockLandscapeOrientation();
              trackStepChange('editor');
              setActiveStep(mode === 'vfx' ? 'vfx' : mode === 'color' ? 'color' : 'editor');
            }}
            onBackToStoryboard={() => {
              trackStepChange('input');
              setActiveStep('input');
            }}
          />
        )}

        {/* ================================================================= */}
        {/* PAGE 5: DEDICATED STORY HISTORY PAGE (`activeStep === 'history'`) */}
        {/* ================================================================= */}
        {activeStep === 'history' && (() => {
          const isMl = lang === 'ml';
          const lovedStories = savedStories.filter((s) => s.isLoved);
          const displayedStories = (historyFilterMode === 'loved' ? lovedStories : savedStories)
            .slice()
            .sort((a, b) => {
              if (Boolean(a.isLoved) !== Boolean(b.isLoved)) {
                return a.isLoved ? -1 : 1;
              }
              return (b.savedAt || 0) - (a.savedAt || 0);
            });

          const formatSavedDate = (ms: number) => {
            try {
              const d = new Date(ms);
              return d.toLocaleDateString(isMl ? 'ml-IN' : 'en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
            } catch {
              return '';
            }
          };

          return (
            <div className="max-w-4xl mx-auto space-y-5">
              {/* History Header & Filter Tabs */}
              <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500 text-black shadow-md shadow-amber-500/20 shrink-0">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>
                          {isMl ? 'സ്റ്റോറി ഹിസ്റ്ററി & ❤️ സേവ് ചെയ്തവ' : 'Story History & ❤️ Saved Stories'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-mono">
                          {savedStories.length}
                        </span>
                      </h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {isMl
                          ? 'നിങ്ങൾ തിരഞ്ഞെടുത്തതും ❤️ ലൈക്ക് ചെയ്തതുമായ കഥകൾ ഇവിടെ കാണാം. ഏത് കഥയിലും അമർത്തി പഴയ പ്രോംപ്റ്റുകൾ വീണ്ടും എടുക്കാം.'
                          : 'Your generated & ❤️ favorited stories history. Tap any story to jump straight back to its prompts.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setHistoryFilterMode('all')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      historyFilterMode === 'all'
                        ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                        : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
                    }`}
                  >
                    {isMl ? `എല്ലാ കഥകളും (${savedStories.length})` : `All Stories (${savedStories.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilterMode('loved')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      historyFilterMode === 'loved'
                        ? 'bg-rose-500 text-white font-extrabold shadow-sm'
                        : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        historyFilterMode === 'loved' ? 'fill-white' : 'text-rose-400 fill-rose-400'
                      }`}
                    />
                    <span>{isMl ? `❤️ പ്രിയപ്പെട്ടവ (${lovedStories.length})` : `Loved (${lovedStories.length})`}</span>
                  </button>
                </div>
              </div>

              {/* Top History Sponsor Slot */}
              <CompactSmallBannerAd slotId="history-filter-small-ad" slotIndex={0} />

              {/* Stories List / Empty State */}
              {displayedStories.length === 0 ? (
                <div className="bg-[#11131f] border border-zinc-800 rounded-2xl text-center py-14 px-4 space-y-4 shadow-xl">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-amber-400">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <p className="text-zinc-200 font-bold text-sm sm:text-base">
                    {historyFilterMode === 'loved'
                      ? isMl
                        ? '❤️ ലൗ ചിഹ്നം നൽകിയ കഥകളൊന്നും ഇതുവരെ ഇല്ല'
                        : 'No ❤️ loved stories yet'
                      : isMl
                      ? 'ഇതുവരെ കഥകളൊന്നും ഹിസ്റ്ററിയിൽ സേവ് ചെയ്തിട്ടില്ല'
                      : 'No stories in history yet'}
                  </p>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                    {isMl
                      ? 'സ്റ്റോറി ടാബിൽ പോയി കഥാ ഓപ്ഷനുകളിൽ ❤️ ലൗ ചിഹ്നത്തിൽ അമർത്തുകയോ പ്രോംപ്റ്റുകൾ തയ്യാറാക്കുകയോ ചെയ്താൽ അവ ഓട്ടോമാറ്റിക്കായി ഇവിടെ സേവ് ആകും.'
                      : 'Go to the Story tab, generate story options, or tap the ❤️ heart icon to save stories here automatically.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveStep('input')}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider cursor-pointer inline-flex items-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isMl ? 'പുതിയ കഥ എഴുതി തുടങ്ങുക' : 'Write a New Story'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedStories.map((story, idx) => (
                    <React.Fragment key={story.id || idx}>
                      <div
                        className={`bg-[#11131f] border rounded-2xl p-4 sm:p-5 transition-all shadow-xl space-y-3 ${
                        story.isLoved
                          ? 'border-rose-500/40 hover:border-rose-400/70'
                          : 'border-zinc-800 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/70 pb-3">
                        <div className="min-w-0 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleLoveSavedStory(story)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                              story.isLoved
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-rose-400'
                            }`}
                            title={
                              story.isLoved
                                ? isMl
                                  ? '❤️ പ്രിയപ്പെട്ടത്'
                                  : 'Loved'
                                : isMl
                                ? 'ലൗ ചിഹ്നം നൽകുക'
                                : 'Love story'
                            }
                          >
                            <Heart className={`w-4 h-4 ${story.isLoved ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-bold">
                            {story.genre || 'Cinematic'}
                          </span>
                          {story.partNumber && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-[11px] font-bold">
                              Part {story.partNumber}
                            </span>
                          )}
                          {story.syncedToGmail && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                              ☁️ {story.syncedToGmail}
                            </span>
                          )}
                          <h3 className="text-sm sm:text-base font-bold text-white tracking-wide truncate">
                            {story.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 shrink-0">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-400/80" />
                            {story.durationDisplay}
                          </span>
                          <span className="flex items-center gap-1">
                            <Film className="w-3.5 h-3.5 text-amber-400/80" />
                            {story.shotCount} {isMl ? 'ഷോട്ടുകൾ' : 'shots'}
                          </span>
                          <span className="text-zinc-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatSavedDate(story.savedAt)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed line-clamp-3 bg-[#0a0c14] p-3 rounded-xl border border-zinc-800/80">
                        {story.storySummary}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoadSavedStory(story)}
                            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                          >
                            <PlayCircle className="w-4 h-4" />
                            <span>
                              {story.shots && story.shots.length > 0
                                ? isMl
                                  ? 'പ്രോംപ്റ്റുകൾ എടുക്കുക'
                                  : 'Open Prompts'
                                : isMl
                                ? 'പ്രോംപ്റ്റുകൾ നിർമ്മിച്ച് തുറക്കുക'
                                : 'Generate & Open Prompts'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const lastShot = story.shots[story.shots.length - 1];
                              handleContinueFromStory(story.title, story.storySummary, lastShot?.action);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border border-zinc-700"
                          >
                            <PlusCircle className="w-4 h-4 text-amber-400" />
                            <span>{isMl ? '➕ തുടരുക' : 'Continue Story'}</span>
                          </button>

                          {story.shots && story.shots.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleDownloadStoryTxt(story)}
                              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border border-zinc-800"
                              title={isMl ? 'ടെക്സ്റ്റ് ഫയൽ ഡൗൺലോഡ് ചെയ്യുക' : 'Download TXT'}
                            >
                              <Download className="w-4 h-4 text-zinc-400" />
                              <span>.TXT</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSavedStory(story.id)}
                          className="p-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                          title={isMl ? 'ഈ കഥ നീക്കം ചെയ്യുക' : 'Delete Story'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {idx > 0 && (idx + 1) % 3 === 0 && (
                      <CompactSmallBannerAd
                        slotId={`history-inline-small-${idx}`}
                        slotIndex={idx}
                      />
                    )}
                  </React.Fragment>
                ))}
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#11131f] border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between gap-3 flex-wrap">
                <span className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>
                    {isMl
                      ? 'പെയ്ഡ് ക്ലൗഡ് സ്റ്റോറേജ് ഇല്ലാതെ നിങ്ങളുടെ ഡിവൈസിലും ബ്രൗസറിലും ലോക്കലായി സേവ് ചെയ്യപ്പെടുന്നു. എപ്പോൾ വേണമെങ്കിലും .TXT ആയി ഡൗൺലോഡ് ചെയ്യാം.'
                      : 'Saved locally on your device/browser with zero paid cloud storage required. Export .TXT anytime.'}
                  </span>
                </span>
              </div>
            </div>
          );
        })()}

        {/* ================================================================= */}
        {/* PAGE 6: OPTIONAL ACCOUNT PAGE — PROFILE, WALLET & PROMOTIONS       */}
        {/* ================================================================= */}
        {activeStep === 'login' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Local-First Studio Banner (No Login / No Paid Cloud Storage Required) */}
            <div className="bg-teal-500/10 border border-teal-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 shrink-0">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xs sm:text-sm font-extrabold text-teal-200 uppercase tracking-wider">
                    {lang === 'ml'
                      ? '100% ലോക്കൽ & ലോഗിൻ-രഹിത ക്രിയേറ്റീവ് സ്റ്റുഡിയോ'
                      : '100% Local & Login-Free Creative Studio'}
                  </h2>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {lang === 'ml'
                      ? 'സ്റ്റോറി/സ്ക്രിപ്റ്റ് ജനറേറ്റർ, വീഡിയോ എഡിറ്റിംഗ്, VFX എഡിറ്റിംഗ്, കളർ ഗ്രേഡിംഗ്, മീഡിയ സെലക്ഷൻ, പ്രിവ്യൂ, എക്സ്പോർട്ട് എന്നിവയെല്ലാം ലോഗിൻ ഇല്ലാതെയും പെയ്ഡ് ക്ലൗഡ് സ്റ്റോറേജ് ഇല്ലാതെയും നിങ്ങളുടെ ഡിവൈസിൽ നേരിട്ട് പ്രവർത്തിക്കുന്നു.'
                      : 'Story/Script generator, Editing studio, VFX Editing, Color Grading, media selection, previews, and video exports all run directly on your device/browser with zero forced login and zero paid cloud storage.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveStep('editor')}
                className="px-4 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-extrabold text-xs uppercase tracking-wider shrink-0 cursor-pointer transition-colors"
              >
                {lang === 'ml' ? 'സ്റ്റുഡിയോ തുറക്കുക' : 'Open Studio'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CARD 1: Profile & Optional Account Sign-In */}
              <div className="bg-[#11131f] border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-5 shadow-2xl transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 text-amber-400">
                      <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <h2 className="text-base font-extrabold text-white">
                        {lang === 'ml' ? 'പ്രൊഫൈൽ' : 'Profile'}
                      </h2>
                    </div>
                    {currentUser && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                        {lang === 'ml' ? 'സജീവം' : 'Signed In'}
                      </span>
                    )}
                  </div>

                  {currentUser ? (
                    <div className="p-3.5 rounded-xl bg-[#0a0b12] border border-emerald-500/25 flex items-center gap-3">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || 'User'}
                          className="w-11 h-11 rounded-full border border-emerald-500/40 object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0">
                          {(currentUser.email || 'G').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {currentUser.displayName || 'Creator Account'}
                        </p>
                        <p className="text-xs font-mono text-emerald-400 truncate">
                          {currentUser.email}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {lang === 'ml'
                        ? 'ലോഗിൻ ഓപ്ഷണൽ ആണ് — നിങ്ങളുടെ അക്കൗണ്ട് പ്രൊഫൈൽ, വാലറ്റ്, പ്രൊമോഷനുകൾ എന്നിവ തുറക്കാൻ മാത്രം Google അക്കൗണ്ട് വഴി ലോഗിൻ ചെയ്യാം.'
                        : 'Sign in with Google only if you want account features: Profile, Wallet, and Promotions. All creative tools stay open without sign-in.'}
                    </p>
                  )}

                  {userAuthError && (
                    <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-2.5">
                      {userAuthError}
                    </p>
                  )}
                </div>

                <div className="space-y-2.5">
                  {currentUser ? (
                    <button
                      type="button"
                      onClick={handleUserGoogleSignOut}
                      disabled={userAuthBusy}
                      className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-red-950/50 border border-zinc-700 hover:border-red-500/40 text-zinc-300 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{lang === 'ml' ? 'ലോഗ് ഔട്ട്' : 'Sign Out'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleUserGoogleLogin}
                        disabled={userAuthBusy}
                        className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                      >
                        <LogIn className="w-4 h-4 shrink-0" />
                        <span>
                          {userAuthBusy
                            ? lang === 'ml'
                              ? 'ലോഗിൻ ചെയ്യുന്നു...'
                              : 'Signing in...'
                            : lang === 'ml'
                            ? 'Google ലോഗിൻ (അക്കൗണ്ട് മാത്രം)'
                            : 'Sign In for Account Features'}
                        </span>
                      </button>
                      {isInIframe && typeof window !== 'undefined' && (
                        <a
                          href={window.location.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                          <span>{lang === 'ml' ? 'പുതിയ ടാബിൽ തുറന്ന് ലോഗിൻ ചെയ്യുക' : 'Open in New Tab to Sign In'}</span>
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Compact Sponsor Banner below Profile card */}
              <div className="col-span-full">
                <CompactSmallBannerAd slotId="account-profile-small" slotIndex={1} />
              </div>

              {/* CARD 2: Account Wallet (Auth-Only Feature) */}
              <div className="bg-[#11131f] border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-5 shadow-2xl transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 text-emerald-400">
                      <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-extrabold text-white">
                        {lang === 'ml' ? 'വാലറ്റ്' : 'Wallet'}
                      </h3>
                    </div>
                    {!currentUser && (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 text-[10px] font-bold inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>{lang === 'ml' ? 'അക്കൗണ്ട്' : 'Account Only'}</span>
                      </span>
                    )}
                  </div>

                  {currentUser ? (
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-xl bg-[#0a0b12] border border-zinc-800 space-y-1">
                        <div className="text-[11px] text-zinc-400">
                          {lang === 'ml' ? 'ക്രിയേറ്റർ പ്ലാൻ' : 'Creator Studio Tier'}
                        </div>
                        <div className="text-sm font-extrabold text-emerald-400">
                          {lang === 'ml' ? 'ഫ്രീ ലോക്കൽ എഡിഷൻ ($0 ക്ലൗഡ് ഫീസ്)' : 'Free Local Edition ($0 Cloud Storage)'}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0a0b12] border border-zinc-800 flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-400">
                          {lang === 'ml' ? 'ലോക്കൽ സ്റ്റോറികൾ:' : 'Local Stories:'}
                        </span>
                        <span className="text-amber-400 font-extrabold text-sm">{savedStories.length}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {lang === 'ml'
                        ? 'നിങ്ങളുടെ അക്കൗണ്ട് വാലറ്റും ക്രെഡിറ്റ് വിവരങ്ങളും കാണാൻ Google വഴി ലോഗിൻ ചെയ്യുക. എഡിറ്റിംഗും എക്സ്പോർട്ടും പൂർണ്ണമായും സൗജന്യമാണ്.'
                        : 'Sign in with your Google account to access your personal Creator Wallet and account credits. Local editing & exports remain 100% free.'}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStep('history')}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <History className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {lang === 'ml'
                      ? `ലോക്കൽ ഹിസ്റ്ററി (${savedStories.length})`
                      : `Local History (${savedStories.length})`}
                  </span>
                </button>
              </div>

              {/* CARD 3: Promotions & Partner Offers (Auth-Only Feature) */}
              <div className="bg-[#11131f] border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-5 shadow-2xl transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 text-rose-400">
                      <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30">
                        <Gift className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-extrabold text-white">
                        {lang === 'ml' ? 'പ്രൊമോഷനുകൾ' : 'Promotions'}
                      </h3>
                    </div>
                    {!currentUser && (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 text-[10px] font-bold inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>{lang === 'ml' ? 'അക്കൗണ്ട്' : 'Account Only'}</span>
                      </span>
                    )}
                  </div>

                  {currentUser ? (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-[#0a0b12] border border-rose-500/25 space-y-1">
                        <div className="text-xs font-extrabold text-rose-300">
                          {lang === 'ml' ? 'ക്രിയേറ്റർ വെൽക്കം പാസ്' : 'Creator Member Perks Active'}
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          {lang === 'ml'
                            ? 'സീറോ-ക്ലൗഡ് HD ലോക്കൽ എക്സ്പോർട്ട്, 360+ സ്റ്റോറി കാറ്റഗറികൾ, VFX & കളർ ഗ്രേഡിംഗ് എല്ലാം സജീവമാണ്.'
                            : 'Full access active for your account — seasonal creator campaigns and partner offers appear here when available.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {lang === 'ml'
                        ? 'അക്കൗണ്ട് ഉടമകൾക്കുള്ള പ്രത്യേക പ്രൊമോഷനുകളും ക്രിയേറ്റർ ഓഫറുകളും കാണാൻ സൈൻ ഇൻ ചെയ്യുക.'
                        : 'Sign in with Google to view account-only creator promotions, reward campaigns, and partner offers.'}
                    </p>
                  )}
                </div>

                {!currentUser ? (
                  <button
                    type="button"
                    onClick={handleUserGoogleLogin}
                    disabled={userAuthBusy}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{lang === 'ml' ? 'അക്കൗണ്ട് തുറക്കുക' : 'Unlock Account Area'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveStep('input')}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{lang === 'ml' ? 'പുതിയ സ്റ്റോറി' : 'Create Story'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Native Sponsor Card in Account View */}
            <div className="col-span-full">
              <NativeCardAd slotId="account-sponsor-card" slotIndex={2} />
            </div>
          </div>
        )}

        {/* Compact In-Page 2-Second Skippable Video Ads Pair + Bottom Banner (never hides buttons) */}
        {activeStep !== 'input' &&
          activeStep !== 'editor' &&
          activeStep !== 'vfx' &&
          activeStep !== 'color' && (
            <InlineVideoAdPair sectionId={`bottom-pair-${activeStep}`} />
          )}

        <BottomBannerAd />
      </main>

      {/* Non-blocking Corner Mini Skippable Video Ad (Desktop) */}
      <FloatingMiniVideoAd />

      {/* Brief 2-Second In-Page Video Ad Break (auto-closes after 2s, never interrupts editor) */}
      <TwoSecondVideoBreakOverlay
        open={
          show2sVideoBreak &&
          activeStep !== 'editor' &&
          activeStep !== 'vfx' &&
          activeStep !== 'color'
        }
        onClose={() => setShow2sVideoBreak(false)}
      />

      {/* Review Terms & Conditions Modal (Viewable anytime after acceptance) */}
      <TermsAndConditionsModal
        open={showTermsReviewModal}
        lang={lang}
        onChangeLang={(nextLang) => handleLanguageChange(nextLang)}
        alreadyAccepted={true}
        onAccept={() => setShowTermsReviewModal(false)}
        onCloseReview={() => setShowTermsReviewModal(false)}
      />

      {/* Unified 6-Tab Bottom App Navigation Bar (Story, Editing, VFX Editing, Color Grading, History, Login) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#0d0f17]/95 backdrop-blur-lg border-t border-zinc-800 px-1.5 sm:px-2.5 py-1.5 sm:py-2 shadow-[0_-8px_30px_rgba(0,0,0,0.7)]">
        <div className="max-w-5xl mx-auto grid grid-cols-6 gap-1 sm:gap-1.5">
          {/* Tab 1: Story */}
          <button
            type="button"
            onClick={() => {
              setShowAdminPanel(false);
              if (activeStep === 'options' || activeStep === 'prompts') {
                setActiveStep('input');
              } else if (activeStep === 'input') {
                if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                setActiveStep(lastStoryStep);
              }
            }}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              !showAdminPanel && (activeStep === 'input' || activeStep === 'options' || activeStep === 'prompts')
                ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/30'
                : 'text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800'
            }`}
          >
            <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-amber-500/40 shrink-0 shadow-inner">
              <img
                src="https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=100&q=80"
                alt="Story"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
            <span className="truncate max-w-full whitespace-nowrap">
              {lang === 'ml' ? 'സ്റ്റോറി' : 'Story'}
            </span>
          </button>

          {/* Tab 2: Editing */}
          <button
            type="button"
            onClick={() => {
              void tryLockLandscapeOrientation();
              setShowAdminPanel(false);
              trackStepChange('editor');
              setActiveStep('editor');
            }}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              !showAdminPanel && activeStep === 'editor'
                ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/30'
                : 'text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800'
            }`}
          >
            <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-amber-500/40 shrink-0 shadow-inner">
              <img
                src="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=100&q=80"
                alt="Editing"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
            <span className="truncate max-w-full whitespace-nowrap">
              {lang === 'ml' ? 'എഡിറ്റിംഗ്' : 'Editing'}
            </span>
          </button>

          {/* Tab 3: VFX Editing (16:9 Studio Model) */}
          <button
            type="button"
            onClick={() => {
              void tryLockLandscapeOrientation();
              setShowAdminPanel(false);
              trackStepChange('editor');
              setActiveStep('vfx');
            }}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              !showAdminPanel && activeStep === 'vfx'
                ? 'bg-rose-500 text-white font-extrabold shadow-md shadow-rose-500/35'
                : 'text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800'
            }`}
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-600/90 via-orange-600/80 to-zinc-900 border border-rose-400/50 flex items-center justify-center shrink-0 shadow-inner">
              <Flame className="w-3.5 h-3.5 text-amber-200" />
            </div>
            <span className="truncate max-w-full whitespace-nowrap">
              {lang === 'ml' ? 'VFX' : 'VFX Edit'}
            </span>
          </button>

          {/* Tab 4: Color Grading (16:9 Studio Model) */}
          <button
            type="button"
            onClick={() => {
              void tryLockLandscapeOrientation();
              setShowAdminPanel(false);
              trackStepChange('editor');
              setActiveStep('color');
            }}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              !showAdminPanel && activeStep === 'color'
                ? 'bg-cyan-400 text-black font-extrabold shadow-md shadow-cyan-500/35'
                : 'text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800'
            }`}
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500/85 via-indigo-600/80 to-amber-500/75 border border-cyan-300/50 flex items-center justify-center shrink-0 shadow-inner">
              <Palette className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="truncate max-w-full whitespace-nowrap">
              {lang === 'ml' ? 'കളർ' : 'Color'}
            </span>
          </button>

          {/* Tab 5: History */}
          <button
            type="button"
            onClick={() => {
              setShowAdminPanel(false);
              setActiveStep('history');
            }}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              !showAdminPanel && activeStep === 'history'
                ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/30'
                : 'text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800'
            }`}
          >
            <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-amber-500/40 shrink-0 shadow-inner">
              <img
                src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=100&q=80"
                alt="History"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
            <span className="truncate max-w-full whitespace-nowrap">
              {lang === 'ml' ? 'ഹിസ്റ്ററി' : 'History'}
            </span>
          </button>

          {/* Tab 6: Account (Profile, Wallet, Promotions) */}
          <button
            type="button"
            onClick={() => {
              setShowAdminPanel(false);
              setActiveStep('login');
            }}
            className={`min-h-[44px] relative flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              !showAdminPanel && activeStep === 'login'
                ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/30'
                : 'text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800'
            }`}
          >
            <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-amber-500/40 shrink-0 shadow-inner">
              <img
                src={currentUser?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"}
                alt="Account"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
            <span className="truncate max-w-full whitespace-nowrap">
              {currentUser
                ? lang === 'ml'
                  ? 'പ്രൊഫൈൽ'
                  : 'Profile'
                : lang === 'ml'
                ? 'അക്കൗണ്ട്'
                : 'Account'}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
