import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import {
  DialogueMode,
  StoryAngle,
  GeneratedShot,
  generateStoryAnglesLocal,
  generateBreakdownLocal,
} from './lib/storyEngine';
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
  StickyTopAd,
  StickyBottomAd,
  InFeedWideVideoAd,
  InterstitialVideoAdModal,
  triggerAdsterraPopunder,
} from './components/AdsterraAds';

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

export default function App() {
  const [lang, setLang] = useState<AppLang>('ml');
  const t = UI_TRANSLATIONS[lang];

  // Navigation Step: 'input' (Page 1) | 'options' (Page 2) | 'prompts' (Page 3)
  const [activeStep, setActiveStep] = useState<'input' | 'options' | 'prompts'>('input');
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
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [speakingAngleId, setSpeakingAngleId] = useState<string | null>(null);
  const [loadingTtsId, setLoadingTtsId] = useState<string | null>(null);
  const [voicePace, setVoicePace] = useState<VoicePace>('story');
  const [dialogueMode, setDialogueMode] = useState<DialogueMode>('dynamic');
  const [showVideoAdModal, setShowVideoAdModal] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const ttsCacheRef = useRef<Map<string, string>>(new Map());
  const speechSessionRef = useRef<number>(0);
  const adInteractionCountRef = useRef<number>(0);

  // Trigger 2-second auto-skip video ad & popunder ONLY every 2-3 interactions (not every click)
  const triggerThrottledAdBreak = () => {
    adInteractionCountRef.current += 1;
    const count = adInteractionCountRef.current;
    if (count === 2 || (count > 2 && (count - 2) % 3 === 0)) {
      setShowVideoAdModal(true);
      triggerAdsterraPopunder();
    }
  };

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
    return () => {
      stopAllSpeech();
    };
  }, []);

  useEffect(() => {
    stopAllSpeech();
  }, [activeStep]);

  // Calculate total duration in seconds based on unit
  const totalSeconds =
    durationUnit === 'seconds'
      ? durationValue
      : durationUnit === 'hours'
      ? durationValue * 3600
      : durationValue * 60;

  // Calculate EXACT number of video clips needed
  const calculatedShotCount = Math.max(1, Math.ceil(totalSeconds / shotDurationSec));

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
    stopAllSpeech();
    setLang(newLang);
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
        });
        if (result.angles && Array.isArray(result.angles) && result.angles.length > 0) {
          updatedAngles = result.angles;
        }
      } catch {
        updatedAngles = [];
      }

      if (updatedAngles.length === 0) {
        updatedAngles = generateStoryAnglesLocal(trimmedCurrent, newLang);
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
          const scriptInput =
            matchedAngle.scriptText || matchedAngle.storySummary || trimmedCurrent;
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
              dialogueMode
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
    triggerThrottledAdBreak();
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

  // Step 1 -> Step 2: Generate Story Angle Variations in Selected Language
  const handleGenerateStoryAngles = async () => {
    triggerThrottledAdBreak();

    const trimmedPremise = premise.trim();
    if (!trimmedPremise) {
      setError(t.premiseRequiredError);
      return;
    }

    setLoadingAngles(true);
    setError(null);
    setStoryAngles([]);
    setSelectedAngle(null);
    setShots([]);
    setSelectedGenreFilter('all');

    try {
      const result = await postApiJson<{ angles?: StoryAngle[] }>('/api/generate-story-angles', {
        script: trimmedPremise,
        language: lang,
        dialogueMode,
      });

      if (result.angles && Array.isArray(result.angles) && result.angles.length > 0) {
        setStoryAngles(result.angles);
        setActiveStep('options');
        return;
      }
      throw new Error('Unexpected format received for story angles.');
    } catch (err: any) {
      console.warn('API /api/generate-story-angles fallback activated:', err?.message);
      const localAngles = generateStoryAnglesLocal(trimmedPremise, lang);
      if (localAngles.length > 0) {
        setStoryAngles(localAngles);
        setActiveStep('options');
      } else {
        setError(err?.message || t.angleErrorFallback);
      }
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
    triggerThrottledAdBreak();
    stopAllSpeech();
    setSelectedAngle(angle);
    setLoadingShots(true);
    setError(null);
    setVisiblePromptCount(25);
    setActiveStep('prompts');

    const scriptInput = angle.scriptText || angle.storySummary || premise.trim();

    try {
      const result = await postApiJson<{ shots?: GeneratedShot[] }>('/api/generate-breakdown', {
        script: scriptInput,
        preferredShotDuration: shotDurationSec,
        targetShotCount: calculatedShotCount,
        fastMode: false,
        language: lang,
        dialogueMode: activeMode,
      });

      if (result.shots && Array.isArray(result.shots)) {
        setShots(result.shots);
        return;
      }
      throw new Error('Unexpected breakdown format.');
    } catch (err: any) {
      console.warn('API /api/generate-breakdown fallback activated:', err?.message);
      const localBreakdown = generateBreakdownLocal(
        scriptInput,
        shotDurationSec,
        [],
        calculatedShotCount,
        lang,
        activeMode
      );
      if (localBreakdown.shots.length > 0) {
        setShots(localBreakdown.shots);
      } else {
        setError(err?.message || t.breakdownErrorFallback);
      }
    } finally {
      setLoadingShots(false);
    }
  };

  const handleDialogueModeChangeOnPrompts = (newMode: DialogueMode) => {
    setDialogueMode(newMode);
    if (selectedAngle && activeStep === 'prompts' && !loadingShots) {
      handleSelectStoryAndOpenPromptPage(selectedAngle, newMode);
    }
  };

  const presetDurations = [
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

  const totalAngleCountDisplay = storyAngles.length > 0 ? storyAngles.length : 14;

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black pt-[54px] md:pt-[94px] max-w-full overflow-x-hidden">
      {/* Persistent Sticky Top Advertisement Banner */}
      <StickyTopAd />

      {/* Top Global Language Switcher Bar */}
      <div className="bg-[#07080d] border-b border-zinc-800/80 px-3.5 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 shrink-0">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{t.languageLabel}:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap sm:flex-wrap py-0.5">
            {LANGUAGE_OPTIONS.map((option) => {
              const isSelected = lang === option.code;
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => handleLanguageChange(option.code)}
                  className={`px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-black font-extrabold shadow-sm shadow-amber-500/20'
                      : 'bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  {option.nativeName}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* App Header with Desktop Breadcrumb Step Indicator */}
      <header className="border-b border-zinc-800/80 px-3.5 sm:px-6 lg:px-8 py-3 sm:py-4 bg-[#0d0f17]/95 sticky top-[54px] md:top-[94px] z-30 backdrop-blur-md">
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
              </p>
            </div>
          </div>

          {/* Desktop / Tablet Breadcrumb Steps Navigation */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono shrink-0">
            <button
              type="button"
              onClick={() => setActiveStep('input')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                activeStep === 'input'
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
              onClick={() => storyAngles.length > 0 && setActiveStep('options')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                storyAngles.length === 0 ? 'opacity-40 cursor-not-allowed text-zinc-600' : 'cursor-pointer'
              } ${
                activeStep === 'options'
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
              onClick={() => selectedAngle && shots.length > 0 && setActiveStep('prompts')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                !selectedAngle ? 'opacity-40 cursor-not-allowed text-zinc-600' : 'cursor-pointer'
              } ${
                activeStep === 'prompts'
                  ? 'bg-amber-500 text-black font-extrabold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {t.step3}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container (Safe bottom clearance for Sticky Bottom Ad + Mobile Nav) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-36 sm:pb-28 md:pb-32 overflow-x-hidden">
        {/* Error notification */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl">
            {error}
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
                    }}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    title={t.clearBtn}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{t.clearBtn}</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <textarea
                  value={premise}
                  onChange={(e) => setPremise(e.target.value)}
                  rows={6}
                  placeholder={t.premisePlaceholder}
                  className="w-full min-h-[160px] lg:min-h-[300px] bg-[#0a0b12] border border-zinc-800 rounded-xl p-3.5 sm:p-4 text-base sm:text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors leading-relaxed resize-y"
                />
              </div>
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
                        onChange={(e) => setDurationUnit(e.target.value as any)}
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
                          onClick={() => setShotDurationSec(sec)}
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
                          onClick={() => setDialogueMode(modeOpt.id)}
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
                    : t.generateAnglesBtn(14, formatDurationDisplay(), calculatedShotCount)}
                </span>
              </button>
            </div>

            {/* Wide In-Screen Continuous Video & Banner Slot on Page 1 */}
            <div className="lg:col-span-12">
              <InFeedWideVideoAd slotId="page1-center" />
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

            {/* Genre Category Filter Bar (Swipeable Single Row on Mobile, Wrapping Grid on Desktop) */}
            {!loadingAngles && (
              <>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap sm:flex-wrap p-2 rounded-xl bg-[#0b0c14] border border-zinc-800">
                  {[
                    { id: 'all', label: t.filterAll(storyAngles.length) },
                    { id: 'thriller', label: t.filterThriller },
                    { id: 'action', label: t.filterAction },
                    { id: 'drama', label: t.filterDrama },
                    { id: 'comedy', label: t.filterComedy },
                    { id: 'scifi', label: t.filterScifi },
                    { id: 'folk', label: t.filterFolk },
                    { id: 'ad', label: t.filterAd },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setSelectedGenreFilter(filter.id)}
                      className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        selectedGenreFilter === filter.id
                          ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Story Option Cards Grid (1 col Mobile, 2 col Tablet, 3 col Desktop Web) */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {storyAngles
                    .filter((angle) => {
                      if (selectedGenreFilter === 'all') return true;
                      if (angle.catKey) return angle.catKey === selectedGenreFilter;
                      const g = angle.genre.toLowerCase();
                      if (selectedGenreFilter === 'thriller') return g.includes('thriller') || g.includes('ത്രില്ലർ') || g.includes('थ्रिलर') || g.includes('திரில்லர்') || g.includes('ಥ್ರಿಲ್ಲರ್') || g.includes('థ్రిల్లర్');
                      if (selectedGenreFilter === 'action') return g.includes('action') || g.includes('ആക്ഷൻ') || g.includes('एक्शन') || g.includes('ஆக்ஷன்') || g.includes('ಆಕ್ಷನ್') || g.includes('యాక్షన్');
                      if (selectedGenreFilter === 'drama') return g.includes('drama') || g.includes('ഡ്രാമ') || g.includes('ड्रामा') || g.includes('டிராமா') || g.includes('ಡ್ರಾಮಾ') || g.includes('డ్రామా');
                      if (selectedGenreFilter === 'comedy') return g.includes('comedy') || g.includes('കോമഡി') || g.includes('कॉमेडी') || g.includes('காமெடி') || g.includes('ಕಾಮಿಡಿ') || g.includes('కామెడీ');
                      if (selectedGenreFilter === 'scifi') return g.includes('sci-fi') || g.includes('സയൻസ്') || g.includes('साइंस') || g.includes('சயின்ஸ்') || g.includes('ಸೈನ್ಸ್') || g.includes('సైన్స్');
                      if (selectedGenreFilter === 'folk') return g.includes('folk') || g.includes('ഫോക്ക്') || g.includes('लोक') || g.includes('நாட்டு') || g.includes('ಜಾನಪದ') || g.includes('జానపద');
                      if (selectedGenreFilter === 'ad') return g.includes('ad') || g.includes('പരസ്യം') || g.includes('विज्ञापन') || g.includes('விளம்பரம்') || g.includes('ಜಾಹೀರಾತು') || g.includes('ప్రకటన');
                      return true;
                    })
                    .map((angle, angleIdx, visibleAngles) => {
                      const showAdAfter =
                        visibleAngles.length > 1 &&
                        (angleIdx === 1 || (angleIdx > 1 && (angleIdx - 1) % 3 === 0));

                      return (
                        <React.Fragment key={angle.id}>
                          <div
                            onClick={() => handleSelectStoryAndOpenPromptPage(angle)}
                            className="p-4 sm:p-6 rounded-2xl bg-[#0f111c] border-2 border-zinc-800 hover:border-amber-400 hover:bg-[#131525] transition-all cursor-pointer flex flex-col justify-between space-y-4 relative group shadow-2xl"
                          >
                            <div className="space-y-3.5">
                              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  {angle.genre}
                                </span>
                                <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                              </div>

                              <h3 className="text-lg font-extrabold text-white tracking-wide group-hover:text-amber-300 transition-colors">
                                {angle.title}
                              </h3>

                              <p className="text-xs text-amber-400/90 font-mono font-semibold">
                                {angle.mood}
                              </p>

                              {/* Characters List */}
                              {angle.characters && (
                                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block font-mono">
                                    {t.charactersLabel}
                                  </span>
                                  <p className="text-zinc-200 font-medium leading-relaxed">
                                    {angle.characters}
                                  </p>
                                </div>
                              )}

                              {/* Full Story Summary */}
                              <div className="p-4 bg-[#090a12] rounded-xl border border-zinc-800 text-xs leading-relaxed text-zinc-300 font-sans space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block font-mono">
                                  {t.storyOverviewLabel}
                                </span>
                                <p className="whitespace-pre-line text-zinc-200 leading-relaxed font-sans">
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
                                      <p className="text-zinc-200 leading-relaxed">{angle.bgm}</p>
                                    </div>
                                  )}
                                  {angle.continuity && (
                                    <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/90 text-xs space-y-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-mono">
                                        {t.continuityLabel}
                                      </span>
                                      <p className="text-zinc-300 leading-relaxed">{angle.continuity}</p>
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

                          {showAdAfter && <InFeedWideVideoAd slotId={`angle-slot-${angleIdx}`} />}
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

            {loadingShots && (
              <div className="py-16 flex flex-col items-center justify-center space-y-3 text-zinc-400 bg-[#0f111c] border border-zinc-800 rounded-2xl">
                <Sparkles className="w-8 h-8 animate-spin text-amber-400" />
                <span className="text-xs font-mono">
                  {t.preparingPrompts(formatDurationDisplay(), calculatedShotCount)}
                </span>
              </div>
            )}

            {/* Editable Vertically Descending Shot Prompt Cards */}
            {!loadingShots && shots.length > 0 && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
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

                {shots.slice(0, visiblePromptCount).map((shot, idx) => {
                  const shotNumber = shot.shotNumber || idx + 1;
                  const shotDur = shot.durationSeconds || shotDurationSec;

                  const shotBgm = shot.bgm || selectedAngle.bgm || '';
                  const shotContinuity = shot.continuity || selectedAngle.continuity || '';

                  const shotDialogue = shot.malayalamDialogue || '';

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
                    triggerThrottledAdBreak();
                    setTimeout(() => setCopiedKey(null), 2000);
                  };

                  const copyImagePrompt = () => {
                    navigator.clipboard.writeText(imgPromptText);
                    setCopiedKey(`img-${idx}`);
                    triggerThrottledAdBreak();
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
                    triggerThrottledAdBreak();
                    setTimeout(() => setCopiedKey(null), 2000);
                  };

                  const showShotAdAfter =
                    idx === 1 || (idx > 1 && (idx - 1) % 3 === 0);

                  return (
                    <React.Fragment key={idx}>
                      <div
                        className="bg-[#10121d] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all"
                      >
                      {/* Shot Header Bar */}
                      <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-[#0b0c13] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <span className="px-3 py-1 rounded-lg bg-amber-500 text-black font-mono font-extrabold text-xs">
                            SHOT {shotNumber.toString().padStart(2, '0')} — {shotDur}s
                          </span>
                          <span className="text-xs font-mono text-zinc-400 hidden sm:inline">
                            {shot.timing || `Shot ${shotNumber} - ${shotDur}s`}
                          </span>
                        </div>

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

                      {/* Structured Editable Container Body */}
                      <div className="p-4 sm:p-5 space-y-4">
                        {/* Editable Scene Action Summary */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                              <Edit3 className="w-3 h-3 text-amber-400" />
                              {t.shotActionLabel}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={shot.action}
                            onChange={(e) => updateShotField(idx, 'action', e.target.value)}
                            className="w-full bg-[#0a0b12] border border-zinc-800 rounded-lg p-2.5 text-base sm:text-sm text-zinc-100 font-sans focus:outline-none focus:border-amber-500 transition-colors"
                          />
                        </div>

                        {/* Editable Dialogue, BGM & Visual Continuity Lock */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                              {t.shotDialogueLabel}
                            </span>
                            <input
                              type="text"
                              value={shotDialogue}
                              placeholder="—"
                              onChange={(e) => updateShotField(idx, 'malayalamDialogue', e.target.value)}
                              className="w-full bg-[#0a0b12] border border-emerald-500/30 rounded-lg p-2.5 text-sm sm:text-xs text-emerald-100 placeholder-zinc-600 font-sans focus:outline-none focus:border-emerald-400 transition-colors"
                            />
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                <Music className="w-3.5 h-3.5 shrink-0" />
                                {t.shotBgmLabel}
                              </span>
                              <input
                                type="text"
                                value={shotBgm}
                                onChange={(e) => updateShotField(idx, 'bgm', e.target.value)}
                                className="w-full bg-[#0a0b12] border border-amber-500/30 rounded-lg p-2.5 text-sm sm:text-xs text-zinc-100 font-sans focus:outline-none focus:border-amber-500 transition-colors"
                              />
                            </div>

                            <div className="space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                {t.continuityLabel}
                              </span>
                              <input
                                type="text"
                                value={shotContinuity}
                                onChange={(e) => updateShotField(idx, 'continuity', e.target.value)}
                                className="w-full bg-[#0a0b12] border border-zinc-800 rounded-lg p-2.5 text-sm sm:text-xs text-zinc-300 font-sans focus:outline-none focus:border-amber-500 transition-colors"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Dual Layout: Stacked on Mobile, Side-by-Side on Desktop Web */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* 1. EDITABLE VIDEO GENERATION PROMPT (PRIMARY) */}
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

                            <textarea
                              value={vidPromptText}
                              onChange={(e) => updateShotField(idx, 'videoPrompt', e.target.value)}
                              rows={5}
                              className="w-full flex-1 text-sm sm:text-xs text-zinc-100 font-mono leading-relaxed bg-zinc-950 p-3.5 sm:p-4 rounded-lg border border-zinc-800 focus:outline-none focus:border-amber-500 selection:bg-amber-500 selection:text-black resize-y"
                            />
                          </div>

                          {/* 2. EDITABLE IMAGE GENERATION PROMPT (SECONDARY) */}
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

                            <textarea
                              value={imgPromptText}
                              onChange={(e) => updateShotField(idx, 'imagePrompt', e.target.value)}
                              rows={5}
                              className="w-full flex-1 text-sm sm:text-xs text-zinc-300 font-mono leading-relaxed bg-zinc-950 p-3.5 sm:p-4 rounded-lg border border-zinc-800 focus:outline-none focus:border-amber-500 selection:bg-amber-500 selection:text-black resize-y"
                            />
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

                      {showShotAdAfter && <InFeedWideVideoAd slotId={`shot-slot-${idx}`} />}
                    </React.Fragment>
                  );
                })}

                {/* Show More Clips Pagination Button if shots > visiblePromptCount */}
                {shots.length > visiblePromptCount && (
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
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom App Navigation Bar (Positioned cleanly above the 50px Mobile Sticky Ad Banner) */}
      <nav className="sm:hidden fixed bottom-[54px] inset-x-0 z-40 bg-[#0d0f17]/95 backdrop-blur-lg border-t border-zinc-800 px-2 py-2 grid grid-cols-3 gap-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.65)]">
        <button
          type="button"
          onClick={() => setActiveStep('input')}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
            activeStep === 'input'
              ? 'bg-amber-500 text-black font-extrabold shadow-sm'
              : 'text-zinc-400 hover:text-white bg-zinc-900/70'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span className="truncate max-w-full">{t.step1}</span>
        </button>

        <button
          type="button"
          disabled={storyAngles.length === 0}
          onClick={() => storyAngles.length > 0 && setActiveStep('options')}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all ${
            storyAngles.length === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          } ${
            activeStep === 'options'
              ? 'bg-amber-500 text-black font-extrabold shadow-sm'
              : 'text-zinc-400 hover:text-white bg-zinc-900/70'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="truncate max-w-full">{t.step2(storyAngles.length)}</span>
        </button>

        <button
          type="button"
          disabled={!selectedAngle || shots.length === 0}
          onClick={() => selectedAngle && shots.length > 0 && setActiveStep('prompts')}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all ${
            !selectedAngle || shots.length === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          } ${
            activeStep === 'prompts'
              ? 'bg-amber-500 text-black font-extrabold shadow-sm'
              : 'text-zinc-400 hover:text-white bg-zinc-900/70'
          }`}
        >
          <Film className="w-4 h-4" />
          <span className="truncate max-w-full">{t.step3}</span>
        </button>
      </nav>

      {/* Persistent Sticky Bottom Adsterra Banner (320x50 Mobile / 728x90 Desktop) */}
      <StickyBottomAd />

      {/* 2-Second Auto-Skip Sponsored Video Break (Triggered every 2-3 actions) */}
      <InterstitialVideoAdModal
        open={showVideoAdModal}
        onClose={() => setShowVideoAdModal(false)}
      />
    </div>
  );
}
