import React, { useState } from 'react';
import { X, Copy, Check, Sparkles, Film, Clock, Image as ImageIcon, Zap, BookOpen, ChevronRight, ArrowLeft, Layers, Edit3, Timer, Sliders, PlayCircle } from 'lucide-react';

interface StoryAngle {
  id: string;
  genre: string;
  title: string;
  mood: string;
  characters?: string;
  beginning?: string;
  middle?: string;
  ending?: string;
  synopsis: string;
  scriptText: string;
}

interface GeneratedShot {
  shotNumber: number;
  durationSeconds: number;
  timing: string;
  action: string;
  characters?: string[];
  malayalamDialogue: string;
  dialogueEnglish?: string;
  imagePrompt?: string;
  videoPrompt?: string;
  visualPrompt?: string;
}

const DEFAULT_SAMPLE_PREMISE = `രാജീവ് വൈകുന്നേരം നാട്ടിലെ ചായക്കടയിലിരുന്ന് ഗ്ലാസിൽ ചൂടുചായ കുടിക്കുന്നു. ചായ കുടിച്ചു കഴിഞ്ഞ് ബെഞ്ചിൽ നിന്ന് എണീറ്റ് റോഡിലേക്ക് ഇറങ്ങി നടക്കുന്നു. വൈകുന്നേരത്തെ വെളിച്ചത്തിൽ തറവാട്ടു വീട്ടിനുള്ളിലേക്ക് കയറിച്ചെല്ലുന്നു.`;

export default function App() {
  // Navigation Step: 'input' (Page 1) | 'options' (Page 2) | 'prompts' (Page 3)
  const [activeStep, setActiveStep] = useState<'input' | 'options' | 'prompts'>('input');
  const [premise, setPremise] = useState<string>(DEFAULT_SAMPLE_PREMISE);
  const [shotDurationSec, setShotDurationSec] = useState<number>(8); // Default 8s per video clip
  
  // Total Video Duration Controls (Supports Seconds, Minutes & Hours)
  const [durationValue, setDurationValue] = useState<number>(1); // Default 1
  const [durationUnit, setDurationUnit] = useState<'seconds' | 'minutes' | 'hours'>('minutes'); // Default 'minutes'
  const [customInputValue, setCustomInputValue] = useState<string>('1');

  const [storyAngles, setStoryAngles] = useState<StoryAngle[]>([]);
  const [selectedAngle, setSelectedAngle] = useState<StoryAngle | null>(null);
  const [shots, setShots] = useState<GeneratedShot[]>([]);
  const [visiblePromptCount, setVisiblePromptCount] = useState<number>(20); // Pagination display for smooth performance
  const [loadingAngles, setLoadingAngles] = useState<boolean>(false);
  const [loadingShots, setLoadingShots] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [speakingAngleId, setSpeakingAngleId] = useState<string | null>(null);

  // Calculate total duration in seconds based on unit
  const totalSeconds = durationUnit === 'seconds' 
    ? durationValue 
    : durationUnit === 'hours' 
    ? durationValue * 3600 
    : durationValue * 60;

  // Calculate EXACT number of 8-second video clips needed (without artificial capping)
  const calculatedShotCount = Math.max(1, Math.ceil(totalSeconds / shotDurationSec));

  // Format Duration Description in Malayalam
  const formatDurationDisplay = () => {
    if (durationUnit === 'seconds') return `${durationValue} സെക്കൻഡ് (${durationValue} Seconds)`;
    if (durationUnit === 'hours') return `${durationValue} മണിക്കൂർ (${durationValue * 60} മിനിറ്റ് / ${totalSeconds} സെക്കൻഡ്)`;
    return `${durationValue} മിനിറ്റ് (${totalSeconds} സെക്കൻഡ്)`;
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

  // Inline Shot Edit Handler
  const updateShotField = (index: number, field: keyof GeneratedShot, value: any) => {
    setShots((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // High-Quality Male Voice Toggle Speech Helper (പ്ലേ ചെയ്യാനും നിർത്താനും ഉള്ള ടോഗ്ല് ഫങ്ഷൻ)
  const toggleSpeakText = (angleId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('ഈ ബ്രൗസറിൽ സ്പീച്ച് സിന്തസിസ് ലഭ്യമല്ല.');
      return;
    }

    if (speakingAngleId === angleId) {
      // Already playing this card -> Stop it!
      window.speechSynthesis.cancel();
      setSpeakingAngleId(null);
    } else {
      // Stop any ongoing speech first
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ml-IN'; // Malayalam voice support
      utterance.rate = 0.92; // Natural reading speed
      utterance.pitch = 0.82; // Deeper pitch for high quality male voice tone

      const voices = window.speechSynthesis.getVoices();
      const mlVoice = voices.find(v => v.lang.includes('ml') || v.lang.includes('IN')) || voices[0];
      if (mlVoice) {
        utterance.voice = mlVoice;
      }

      utterance.onend = () => {
        setSpeakingAngleId(null);
      };
      utterance.onerror = () => {
        setSpeakingAngleId(null);
      };

      window.speechSynthesis.speak(utterance);
      setSpeakingAngleId(angleId);
    }
  };

  // Step 1 -> Step 2: Generate 25 Story Angle Variations and Open Options Page
  const handleGenerateStoryAngles = async () => {
    if (!premise.trim()) {
      setError('ദയവായി കഥയുടെ ഒരു ആമുഖം അല്ലെങ്കിൽ ആശയം നൽകുക.');
      return;
    }

    setLoadingAngles(true);
    setError(null);
    setStoryAngles([]);
    setSelectedAngle(null);
    setShots([]);

    try {
      const res = await fetch('/api/generate-story-angles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: premise.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate story angles');
      }

      const result = await res.json();
      if (result.angles && Array.isArray(result.angles) && result.angles.length > 0) {
        setStoryAngles(result.angles);
        // Navigate directly to Page 2 (4 Story Options Page)
        setActiveStep('options');
      } else {
        throw new Error('Unexpected format received for story angles.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'കഥയുടെ വേരിയേഷനുകൾ നിർമ്മിക്കുന്നതിൽ പിഴവ് സംഭവിച്ചു.');
    } finally {
      setLoadingAngles(false);
    }
  };

  // Step 2 -> Step 3: Select Chosen Story Angle and Navigate to Next Dedicated Prompt Generator Page
  const handleSelectStoryAndOpenPromptPage = async (angle: StoryAngle) => {
    setSelectedAngle(angle);
    setLoadingShots(true);
    setError(null);
    setVisiblePromptCount(25); // Reset visible count to 25
    setActiveStep('prompts');

    try {
      const res = await fetch('/api/generate-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: angle.scriptText || premise,
          preferredShotDuration: shotDurationSec,
          targetShotCount: calculatedShotCount,
          fastMode: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate shot prompts');
      }

      const result = await res.json();
      if (result.shots && Array.isArray(result.shots)) {
        setShots(result.shots);
      } else {
        throw new Error('Unexpected breakdown format.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'പ്രോംപ്റ്റുകൾ തരംതിരിക്കുന്നതിൽ പിഴവ് സംഭവിച്ചു.');
    } finally {
      setLoadingShots(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* App Header with Breadcrumb Step Indicator */}
      <header className="border-b border-zinc-800/80 px-6 py-4 bg-[#0d0f17] sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-black shadow-md shadow-amber-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide uppercase">
                AI Cinematic Story &amp; Prompt Studio
              </h1>
              <p className="text-xs text-zinc-400">
                {activeStep === 'input' && 'പേജ് 1: കഥയുടെ ആമുഖവും ആകെ സിനിമ ദൈർഘ്യവും'}
                {activeStep === 'options' && 'പേജ് 2: 25 വ്യത്യസ്ത കഥാ രൂപങ്ങൾ തിരഞ്ഞെടുക്കുക'}
                {activeStep === 'prompts' && `പേജ് 3: പ്രോംപ്റ്റുകൾ — ${formatDurationDisplay()} (${calculatedShotCount} Clips)`}
              </p>
            </div>
          </div>

          {/* Breadcrumb Steps Navigation */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span
              onClick={() => setActiveStep('input')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                activeStep === 'input'
                  ? 'bg-amber-500 text-black font-extrabold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              1. ആമുഖം
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span
              onClick={() => storyAngles.length > 0 && setActiveStep('options')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                storyAngles.length === 0 ? 'opacity-40 cursor-not-allowed text-zinc-600' : 'cursor-pointer'
              } ${
                activeStep === 'options'
                  ? 'bg-amber-500 text-black font-extrabold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              2. കഥകൾ ({storyAngles.length})
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span
              className={`px-2.5 py-1 rounded-lg transition-all ${
                !selectedAngle ? 'opacity-40 cursor-not-allowed text-zinc-600' : 'cursor-pointer'
              } ${
                activeStep === 'prompts'
                  ? 'bg-amber-500 text-black font-extrabold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              3. പ്രോംപ്റ്റുകൾ
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
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
          <div className="space-y-6">
            <div className="space-y-5 bg-[#11131f] border border-zinc-800 p-6 rounded-2xl shadow-2xl">
              {/* Story Concept Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>1. കഥയുടെ ആമുഖം ടൈപ്പ് ചെയ്യുക (Story Concept Input)</span>
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
                      className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
                      title="ക്ലിയർ ചെയ്യുക"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>ക്ലിയർ ചെയ്യുക (Clear ✕)</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    value={premise}
                    onChange={(e) => setPremise(e.target.value)}
                    rows={4}
                    placeholder="നിങ്ങളുടെ കഥയുടെ ചുരുങ്ങിയ ആമുഖം അല്ലെങ്കിൽ കോൺസെപ്റ്റ് ഇവിടെ ടൈപ്പ് ചെയ്യുക..."
                    className="w-full bg-[#0a0b12] border border-zinc-800 rounded-xl p-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors leading-relaxed"
                  />
                </div>
              </div>

              {/* Total Video Duration Selector & Custom Typing Box */}
              <div className="pt-4 space-y-4 border-t border-zinc-800/80">
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  <span>2. ആകെ സിനിമ / വീഡിയോ ദൈർഘ്യം (Select / Type Total Video Duration)</span>
                </label>

                {/* Duration Presets (Seconds, Minutes, Hours) */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { name: '30 സെക്കൻഡ്', val: 30, unit: 'seconds' as const },
                    { name: '1 മിനിറ്റ്', val: 1, unit: 'minutes' as const },
                    { name: '2 മിനിറ്റ്', val: 2, unit: 'minutes' as const },
                    { name: '5 മിനിറ്റ്', val: 5, unit: 'minutes' as const },
                    { name: '10 മിനിറ്റ്', val: 10, unit: 'minutes' as const },
                    { name: '30 മിനിറ്റ്', val: 30, unit: 'minutes' as const },
                    { name: '1 മണിക്കൂർ', val: 1, unit: 'hours' as const },
                    { name: '2 മണിക്കൂർ', val: 2, unit: 'hours' as const },
                    { name: '3 മണിക്കൂർ', val: 3, unit: 'hours' as const },
                  ].map((preset, idx) => {
                    const pSec = preset.unit === 'seconds' ? preset.val : preset.unit === 'hours' ? preset.val * 3600 : preset.val * 60;
                    const pClips = Math.max(1, Math.ceil(pSec / shotDurationSec));
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(preset.val, preset.unit)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                          durationValue === preset.val && durationUnit === preset.unit
                            ? 'bg-amber-500 text-black border-amber-400 font-extrabold shadow-md shadow-amber-500/20'
                            : 'bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {preset.name} ({pClips} Clips)
                      </button>
                    );
                  })}
                </div>

                {/* Custom Typing Box for Duration & Unit Switcher */}
                <div className="p-4 rounded-xl bg-[#090a12] border border-amber-500/30 space-y-3 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-zinc-300 font-bold">അല്ലെങ്കിൽ ദൈർഘ്യം ടൈപ്പ് ചെയ്യുക (Type Custom Duration):</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="180"
                          step="0.5"
                          value={customInputValue}
                          onChange={(e) => handleCustomInputChange(e.target.value)}
                          className="w-20 bg-zinc-950 border border-amber-500/50 rounded-lg px-2.5 py-1 text-sm font-mono text-amber-400 font-extrabold focus:outline-none focus:border-amber-400 text-center"
                        />
                        
                        {/* Unit Selector (Seconds / Minutes / Hours) */}
                        <select
                          value={durationUnit}
                          onChange={(e) => setDurationUnit(e.target.value as any)}
                          className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-mono text-zinc-200 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="seconds">സെക്കൻഡ് (Seconds)</option>
                          <option value="minutes">മിനിറ്റ് (Minutes)</option>
                          <option value="hours">മണിക്കൂർ (Hours)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-bold text-zinc-400">ക്ലിപ്പ് ദൈർഘ്യം:</span>
                      <div className="flex gap-1">
                        {[5, 8, 10, 12].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setShotDurationSec(sec)}
                            className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer ${
                              shotDurationSec === sec
                                ? 'bg-amber-500 text-black'
                                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Big Calculation Display Banner */}
                  <div className="p-3 bg-[#131626] rounded-xl border border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono text-zinc-300">
                      🎬 തിരഞ്ഞെടുത്തിരിക്കുന്ന ആകെ സിനിമ സമയം: <strong className="text-white font-bold">{formatDurationDisplay()}</strong>
                    </span>
                    <span className="text-xs font-mono px-3 py-1 rounded-lg bg-amber-500 text-black font-extrabold shadow-sm flex items-center gap-1">
                      <PlayCircle className="w-3.5 h-3.5" />
                      ആവശ്യമായ ക്ലിപ്പുകൾ: {calculatedShotCount} ക്ലിപ്പുകൾ ({calculatedShotCount} Sequential 8s Prompts)
                    </span>
                  </div>
                </div>

                {/* Submit Button to Open Page 2 */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleGenerateStoryAngles}
                    disabled={loadingAngles || !premise.trim()}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${loadingAngles ? 'animate-spin' : ''}`} />
                    {loadingAngles
                      ? '25 കഥാ ശൈലികൾ നിർമ്മിക്കുന്നു...'
                      : `25 കഥാ രൂപങ്ങൾ നിർമ്മിക്കുക (${formatDurationDisplay()} / ${calculatedShotCount} ക്ലിപ്പുകൾ) ➔`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PAGE 2: 4 STORY OPTION CARDS (`activeStep === 'options'`) */}
        {/* ================================================================= */}
        {activeStep === 'options' && (
          <div className="space-y-6">
            {/* Page Header with Back Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111320] p-4 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveStep('input')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← ബാക്ക് (ആമുഖത്തിലേക്കും സമയം തിരുത്തലിലേക്കും പോകുക)</span>
              </button>

              <span className="text-xs font-mono text-zinc-300 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                തിരഞ്ഞെടുത്ത സമയം: <strong className="text-amber-400 font-bold">{formatDurationDisplay()}</strong> ({calculatedShotCount} ക്ലിപ്പുകൾ)
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>25 കഥാ ശൈലികളിൽ നിന്നു നിങ്ങളുടെ കഥ തിരഞ്ഞെടുക്കുക (Select Story Angle)</span>
              </h2>
              <p className="text-xs text-zinc-400">
                താഴെ നൽകിയിരിക്കുന്ന 25 സിനിമ കഥകളിൽ ഒന്ന് തിരഞ്ഞെടുത്ത് ബട്ടണിൽ ക്ലിക്ക് ചെയ്താൽ അടുത്ത പേജിൽ {formatDurationDisplay()} നീളമുള്ള സിനിമയ്ക്ക് ആവശ്യമായ {calculatedShotCount} പ്രോംപ്റ്റുകൾ ലഭിക്കും.
              </p>
            </div>

            {/* Genre Category Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-[#0b0c14] border border-zinc-800">
              {[
                { id: 'all', label: `എല്ലാ കഥകളും (${storyAngles.length})` },
                { id: 'thriller', label: '🕵️ ത്രില്ലർ & ക്രൈം' },
                { id: 'action', label: '💥 ആക്ഷൻ & മാസ്' },
                { id: 'drama', label: '🎭 ഡ്രാമ & ഇമോഷണൽ' },
                { id: 'comedy', label: '😂 കോമഡി & ഫൺ' },
                { id: 'scifi', label: '⏳ സയൻസ് ഫിക്ഷൻ & സാങ്കേതികം' },
                { id: 'folk', label: '🌿 ഫോക്ക്, ഹൊറർ & നിധി' },
                { id: 'ad', label: '📢 കൊമേഴ്സ്യൽ പരസ്യം (Ads)' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setSelectedGenreFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedGenreFilter === filter.id
                      ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* 25+ Story Option Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {storyAngles
                .filter((angle) => {
                  if (selectedGenreFilter === 'all') return true;
                  if (selectedGenreFilter === 'thriller') return angle.genre.includes('ത്രില്ലർ') || angle.genre.includes('മിസ്റ്ററി') || angle.genre.includes('ക്രൈം') || angle.genre.includes('നോയർ') || angle.genre.includes('അന്വേഷണം');
                  if (selectedGenreFilter === 'action') return angle.genre.includes('ആക്ഷൻ') || angle.genre.includes('ഗാങ്‌സ്റ്റർ') || angle.genre.includes('പോരാട്ടം') || angle.genre.includes('ബോക്സിങ്') || angle.genre.includes('റിവഞ്ച്');
                  if (selectedGenreFilter === 'drama') return angle.genre.includes('ഡ്രാമ') || angle.genre.includes('ഇമോഷണൽ') || angle.genre.includes('പൊളിറ്റിക്കൽ') || angle.genre.includes('ക്യാമ്പസ്') || angle.genre.includes('കോർട്ട്');
                  if (selectedGenreFilter === 'comedy') return angle.genre.includes('കോമഡി') || angle.genre.includes('ചിരി') || angle.genre.includes('ഫൺ');
                  if (selectedGenreFilter === 'scifi') return angle.genre.includes('സയൻസ്') || angle.genre.includes('സൈബർ') || angle.genre.includes('ലൂപ്പ്') || angle.genre.includes('പ്രപഞ്ചം') || angle.genre.includes('മാജിക്') || angle.genre.includes('ഡിജിറ്റൽ');
                  if (selectedGenreFilter === 'folk') return angle.genre.includes('ഫോക്ക്') || angle.genre.includes('യക്ഷി') || angle.genre.includes('കാവു') || angle.genre.includes('പേടിസ്വപ്ന') || angle.genre.includes('നിധി') || angle.genre.includes('മിസ്റ്റിക്ക്');
                  if (selectedGenreFilter === 'ad') return angle.genre.includes('പരസ്യം') || angle.genre.includes('കൊമേഴ്സ്യൽ');
                  return true;
                })
                .map((angle) => {
                return (
                  <div
                    key={angle.id}
                    onClick={() => handleSelectStoryAndOpenPromptPage(angle)}
                    className="p-6 rounded-2xl bg-[#0f111c] border-2 border-zinc-800 hover:border-amber-400 hover:bg-[#131525] transition-all cursor-pointer flex flex-col justify-between space-y-4 relative group shadow-2xl"
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
                            പ്രധാന കഥാപാത്രങ്ങൾ (Characters):
                          </span>
                          <p className="text-zinc-200 font-medium leading-relaxed">
                            {angle.characters}
                          </p>
                        </div>
                      )}

                      {/* Full 10-15 Line Story Summary */}
                      <div className="p-4 bg-[#090a12] rounded-xl border border-zinc-800 text-xs leading-relaxed text-zinc-300 font-sans space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block font-mono">
                          കഥാ ചുരുക്കം (10-15 Line Story Overview):
                        </span>
                        <p className="whitespace-pre-line text-zinc-200 leading-relaxed font-sans">
                          {(angle as any).storySummary || angle.synopsis}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 flex items-center gap-2">
                      {(() => {
                        const isSpeaking = speakingAngleId === angle.id;
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const fullText = `${angle.title}. ${angle.genre}. കഥാപാത്രങ്ങൾ: ${angle.characters || ''}. കഥയുടെ വിവരണം: ${(angle as any).storySummary || angle.synopsis}`;
                              toggleSpeakText(angle.id, fullText);
                            }}
                            className={`px-3.5 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                              isSpeaking
                                ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30 animate-pulse'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30'
                            }`}
                            title={isSpeaking ? 'വോയിസ് ഓവർ നിർത്തുക (Stop Voiceover)' : 'മാൻ വോയിസ് ഓവർ കേൾക്കുക (Play Male Voiceover)'}
                          >
                            <span className="text-base">{isSpeaking ? '⏹️' : '🎙️'}</span>
                            <span>{isSpeaking ? 'നിർത്തുക (Stop)' : 'വോയിസ് ഓവർ (Male Voice)'}</span>
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
                        <span>ഈ കഥ തിരഞ്ഞെടുക്കുക ({calculatedShotCount} ക്ലിപ്പുകൾ) ➔</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PAGE 3: DEDICATED PROMPTS GENERATOR PAGE (`activeStep === 'prompts'`) */}
        {/* ================================================================= */}
        {activeStep === 'prompts' && selectedAngle && (
          <div className="space-y-6">
            {/* Prompts Page Top Header with Back to Options Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111320] p-4 rounded-xl border border-amber-500/40 shadow-xl">
              <button
                type="button"
                onClick={() => setActiveStep('options')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← കഥാ രൂപങ്ങളിലേക്ക് തിരികെ പോകുക (Back to Story Angles)</span>
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

            {loadingShots && (
              <div className="py-16 flex flex-col items-center justify-center space-y-3 text-zinc-400 bg-[#0f111c] border border-zinc-800 rounded-2xl">
                <Sparkles className="w-8 h-8 animate-spin text-amber-400" />
                <span className="text-xs font-mono">{formatDurationDisplay()} നീളമുള്ള സിനിമയ്ക്ക് ആവശ്യമായ {calculatedShotCount} സീൻ പ്രോംപ്റ്റുകൾ തയ്യാറാക്കുന്നു...</span>
              </div>
            )}

            {/* Editable Vertically Descending Shot Prompt Cards */}
            {!loadingShots && shots.length > 0 && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <h2 className="text-base font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                      <span>സീൻ ബ്രേക്ക്ഡൗൺ പ്രോംപ്റ്റുകൾ (Sequential Shot Prompts)</span>
                    </h2>
                    <p className="text-xs text-amber-400/90 font-mono">
                      വേണ്ട മാറ്റങ്ങൾ ബോക്സിൽ നേരിട്ട് ടൈപ്പ് ചെയ്ത് എഡിറ്റ് ചെയ്യാവുന്നത്!
                    </p>
                  </div>
                  <span className="text-xs font-mono text-amber-300 font-extrabold px-3.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    ആകെ {shots.length} സീൻ ക്ലിപ്പുകൾ ({formatDurationDisplay()})
                  </span>
                </div>

                {shots.slice(0, visiblePromptCount).map((shot, idx) => {
                  const shotNumber = shot.shotNumber || idx + 1;
                  const shotDur = shot.durationSeconds || shotDurationSec;

                  const vidPromptText = shot.videoPrompt || `[VIDEO GENERATION PROMPT]: Cinematic 24fps video motion prompt. Character & Face Continuity: [35yo South Indian Malayali man with short dark hair, trimmed stubble beard, and dark eyes - Face ID & Wardrobe Locked]. Situation & Action: ${shot.action}. Location & Background: Traditional Kerala background environment. Lighting & Color: Volumetric cinematic ambient lighting, dramatic contrast, photorealistic motion. Malayalam Dialogue/Voiceover: "${shot.malayalamDialogue}". Camera: Smooth anamorphic tracking shot, ${shotDur} seconds.`;

                  const imgPromptText = shot.imagePrompt || `[IMAGE GENERATION PROMPT]: Cinematic photorealistic 35mm film still of 35yo South Indian Malayali man with short dark hair and trimmed beard [100% Face & Wardrobe Continuity Locked]. Situation & Action: ${shot.action}. Background & Environment: Detailed Kerala cinematic film scene. Lighting: Natural golden hour light, volumetric shadows, 8k ultra detailed photography.`;

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

1. VIDEO GENERATION PROMPT (WITH INTEGRATED DIALOGUE & LIGHTING):
${vidPromptText}

2. IMAGE GENERATION PROMPT (FACE & CLOTHING CONTINUITY):
${imgPromptText}`;
                    navigator.clipboard.writeText(masterPayload);
                    setCopiedKey(`master-${idx}`);
                    setTimeout(() => setCopiedKey(null), 2000);
                  };

                  return (
                    <div
                      key={idx}
                      className="bg-[#10121d] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all"
                    >
                      {/* Shot Header Bar */}
                      <div className="px-5 py-3.5 bg-[#0b0c13] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="px-3.5 py-1 rounded-lg bg-amber-500 text-black font-mono font-extrabold text-xs">
                            SHOT {shotNumber.toString().padStart(2, '0')} — {shotDur} SECONDS
                          </span>
                          <span className="text-xs font-mono text-zinc-400 hidden sm:inline">
                            {shot.timing || `Shot ${shotNumber} - ${shotDur} Seconds`}
                          </span>
                        </div>

                        {/* Quick Copy Video Prompt Button */}
                        <button
                          type="button"
                          onClick={copyVideoPrompt}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isVideoCopied
                              ? 'bg-emerald-500 text-black font-extrabold shadow-md shadow-emerald-500/20'
                              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {isVideoCopied ? (
                            <>
                              <Check className="w-4 h-4 text-black" />
                              <span>വീഡിയോ പ്രോംപ്റ്റ് കോപ്പി ചെയ്തു!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-amber-400" />
                              <span>Copy Video Prompt (with Dialogue)</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Structured Editable Container Body */}
                      <div className="p-5 space-y-4">
                        {/* Editable Scene Action Summary */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                              <Edit3 className="w-3 h-3 text-amber-400" />
                              സീൻ വിവരണം (Shot Action Summary - എഡിറ്റ് ചെയ്യാവുന്നത്)
                            </span>
                          </div>
                          <input
                            type="text"
                            value={shot.action}
                            onChange={(e) => updateShotField(idx, 'action', e.target.value)}
                            className="w-full bg-[#0a0b12] border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 font-sans focus:outline-none focus:border-amber-500 transition-colors"
                          />
                        </div>

                        {/* 1. EDITABLE VIDEO GENERATION PROMPT (PRIMARY) */}
                        <div className="p-4 rounded-xl bg-[#141624] border-2 border-amber-500/50 space-y-2.5 shadow-lg">
                          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Film className="w-4 h-4 text-amber-400" />
                              1. വീഡിയോ ജനറേഷൻ പ്രോംപ്റ്റ് (Editable Video Prompt + Dialogue + Lighting + Background)
                            </span>
                            <button
                              type="button"
                              onClick={copyVideoPrompt}
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                isVideoCopied
                                  ? 'bg-emerald-500 text-black'
                                  : 'bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20'
                              }`}
                            >
                              {isVideoCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Copied Video Prompt!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Video Prompt (ഡയലോഗ് അടക്കം കോപ്പി ചെയ്യുക)</span>
                                </>
                              )}
                            </button>
                          </div>

                          <textarea
                            value={vidPromptText}
                            onChange={(e) => updateShotField(idx, 'videoPrompt', e.target.value)}
                            rows={5}
                            className="w-full text-xs text-zinc-100 font-mono leading-relaxed bg-zinc-950 p-4 rounded-lg border border-zinc-800 focus:outline-none focus:border-amber-500 selection:bg-amber-500 selection:text-black resize-y"
                          />
                        </div>

                        {/* 2. EDITABLE IMAGE GENERATION PROMPT (SECONDARY) */}
                        <div className="p-4 rounded-xl bg-[#0d0f17] border border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                            <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                              2. ഇമേജ് ജനറേഷൻ പ്രോംപ്റ്റ് (Editable Image Prompt - Character Face &amp; Clothing Continuity)
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
                                  <span>Copied Image Prompt</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Image Prompt</span>
                                </>
                              )}
                            </button>
                          </div>

                          <textarea
                            value={imgPromptText}
                            onChange={(e) => updateShotField(idx, 'imagePrompt', e.target.value)}
                            rows={4}
                            className="w-full text-xs text-zinc-300 font-mono leading-relaxed bg-zinc-950 p-3.5 rounded-lg border border-zinc-850 focus:outline-none focus:border-amber-500 selection:bg-amber-500 selection:text-black resize-y"
                          />
                        </div>

                        {/* 3. Master Copy Footer */}
                        <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 bg-[#0a0b12] -mx-5 -mb-5 p-4 rounded-b-2xl">
                          <span className="text-xs text-zinc-400 font-mono">
                            Master Block (Video Prompt + Image Prompt Combined)
                          </span>
                          <button
                            type="button"
                            onClick={copyMasterBlock}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
                              isMasterCopied
                                ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-500/20'
                            }`}
                          >
                            {isMasterCopied ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span>മൊത്തം കോപ്പി ചെയ്തു (Master Block Copied!)</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>1-Click Master Copy Both</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Show More Clips Pagination Button if shots > visiblePromptCount */}
                {shots.length > visiblePromptCount && (
                  <div className="pt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setVisiblePromptCount((prev) => Math.min(shots.length, prev + 25))}
                      className="px-8 py-3 rounded-xl bg-zinc-800 hover:bg-amber-500 hover:text-black text-amber-400 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer border border-amber-500/30 shadow-lg"
                    >
                      കൂടുതൽ പ്രോംപ്റ്റുകൾ കാണുക ({visiblePromptCount} of {shots.length} Shown - Load 25 More Clips)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
