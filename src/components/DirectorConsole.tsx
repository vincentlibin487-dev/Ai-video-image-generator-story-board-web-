import React from 'react';
import { AspectRatioType, AiToolPreset } from '../types/director';
import { Clapperboard, Sparkles, Clock, Globe, Film, Ratio, Sliders, BookOpen } from 'lucide-react';
import { SAMPLE_PROJECTS } from '../data/sampleProjects';

interface DirectorConsoleProps {
  script: string;
  onChangeScript: (val: string) => void;
  targetLanguage: string;
  onChangeLanguage: (val: string) => void;
  preferredShotDuration: number;
  onChangeDuration: (val: number) => void;
  cinematicStyle: string;
  onChangeStyle: (val: string) => void;
  aspectRatio: AspectRatioType;
  onChangeAspectRatio: (val: AspectRatioType) => void;
  targetAiTool: AiToolPreset;
  onChangeAiTool: (val: AiToolPreset) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onLoadSample: (sampleId: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'Malayalam', label: 'Malayalam (മലയാളം)', native: 'മലയാളം' },
  { code: 'Hindi', label: 'Hindi (हिन्दी)', native: 'हिन्दी' },
  { code: 'Tamil', label: 'Tamil (தமிழ்)', native: 'தமிழ்' },
  { code: 'Telugu', label: 'Telugu (తెలుగు)', native: 'తెలుగు' },
  { code: 'English', label: 'English', native: 'English' },
  { code: 'Kannada', label: 'Kannada (ಕನ್ನಡ)', native: 'ಕನ್ನಡ' },
  { code: 'Bengali', label: 'Bengali (বাংলা)', native: 'বাংলা' },
  { code: 'Spanish', label: 'Spanish (Español)', native: 'Español' },
  { code: 'Japanese', label: 'Japanese (日本語)', native: '日本語' },
];

const SHOT_DURATIONS = [
  { sec: 5, label: '5s (Fast Cuts)', desc: 'High-octane action & punchy rhythms' },
  { sec: 8, label: '8s (Cinema Standard)', desc: 'Balanced character beats & camera moves' },
  { sec: 10, label: '10s (Dramatic Focus)', desc: 'Deep dialogues & tense suspense' },
  { sec: 12, label: '12s (Atmospheric)', desc: 'World building & wide reveals' },
  { sec: 15, label: '15s (Master Long Take)', desc: 'Continuous camera tracking sequence' },
];

const CINEMATIC_STYLES = [
  'Malayalam Monsoon Neo-Noir (Kodak Vision3, rainy Kochi harbor, teal & sodium amber)',
  'Kerala Hyper-Realistic Drama (Lijo Jose Pellissery / Dileesh Pothan rustic naturalism)',
  'Banaras Mystical Arthouse Noir (A24 aesthetic, hazy ghats, deep shadows, clay lamps)',
  'Anamorphic Cyberpunk Sci-Fi (Blade Runner style, heavy volumetric haze, neon reflections)',
  'High-Stakes Action Thriller (Christopher Nolan 70mm IMAX, grounded realism)',
  'Vintage 1970s Technicolor Crime (Warm grain, muted pastels, vintage zoom lenses)',
];

export const DirectorConsole: React.FC<DirectorConsoleProps> = ({
  script,
  onChangeScript,
  targetLanguage,
  onChangeLanguage,
  preferredShotDuration,
  onChangeDuration,
  cinematicStyle,
  onChangeStyle,
  aspectRatio,
  onChangeAspectRatio,
  targetAiTool,
  onChangeAiTool,
  onGenerate,
  isGenerating,
  onLoadSample,
}) => {
  return (
    <div className="bg-[#0f111a] border border-zinc-800/80 rounded-2xl p-5 shadow-2xl space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100 uppercase tracking-wide font-cinema">
              Director's Story &amp; Script Console
            </h2>
            <p className="text-xs text-zinc-400">
              Input your screenplay or story concept. Gemini will architect continuous, sequential cinematic shots.
            </p>
          </div>
        </div>

        {/* Load Sample Script dropdown */}
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs text-zinc-400">Sample Scripts:</span>
          <div className="flex gap-1.5">
            {SAMPLE_PROJECTS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => onLoadSample(sample.id)}
                className="px-2.5 py-1 text-xs rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-amber-300 transition-colors cursor-pointer"
              >
                {sample.id === 'kochi-ferry' ? '🌧️ Kochi Ferry (Malayalam)' : '🪔 Banaras Noir (Hindi)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Script text area on left, Director parameters on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Script Input */}
        <div className="lg:col-span-7 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Scene Screenplay / Story Action</span>
            </label>
            <span className="text-[11px] text-zinc-500 font-mono-code">
              {script.length} characters • auto-splits into continuous shots
            </span>
          </div>

          <textarea
            value={script}
            onChange={(e) => onChangeScript(e.target.value)}
            rows={10}
            placeholder={`Enter your story, action beats, or screenplay in any language...

Example (Malayalam):
രാത്രി പന്ത്രണ്ടു മണി. കൊച്ചിയിലെ പഴയ ബോട്ട് ജെട്ടിയിൽ തോരാത്ത മഴ പെയ്യുന്നു. ഡിറ്റക്ടീവ് മോഹൻ പഴയ റെയിൻകോട്ടിന്റെ കോളർ ഉയർത്തി കടവിലേക്ക് നടക്കുന്നു. ഇരുട്ടിൽ ദൂരെ ഒരു ഇരുണ്ട ബോട്ടിൽ നിന്ന് ഒരാൾ കറുത്ത ബ്രീഫ്കേസുമായി ഇറങ്ങി വരുന്നു...`}
            className="w-full h-64 text-sm bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-4 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 font-sans leading-relaxed resize-none"
          />

          <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 pt-1">
            <span>Tip: Works in Malayalam (മലയാളം), Hindi, Tamil, English, and Romanized script.</span>
            <span className="text-amber-400/80">Continuous narrative flow enforced</span>
          </div>
        </div>

        {/* Right Column: Production Settings */}
        <div className="lg:col-span-5 space-y-4">
          {/* Target Language */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>Dialogue Language (Rule 1)</span>
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => onChangeLanguage(e.target.value)}
              className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-zinc-900 text-zinc-100">
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Shot Duration */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Target Shot Duration (Rule 3)</span>
              </label>
              <span className="text-xs font-mono-code font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {preferredShotDuration} SECONDS / SHOT
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {SHOT_DURATIONS.map((dur) => (
                <button
                  key={dur.sec}
                  type="button"
                  onClick={() => onChangeDuration(dur.sec)}
                  className={`py-2 px-1 text-center rounded-lg border text-xs font-mono-code transition-all cursor-pointer ${
                    preferredShotDuration === dur.sec
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                  title={dur.desc}
                >
                  {dur.sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Cinematic Style */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>Cinematic Visual Style</span>
            </label>
            <select
              value={cinematicStyle}
              onChange={(e) => onChangeStyle(e.target.value)}
              className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {CINEMATIC_STYLES.map((style) => (
                <option key={style} value={style} className="bg-zinc-900 text-zinc-100">
                  {style}
                </option>
              ))}
            </select>
          </div>

          {/* Aspect Ratio & Target AI Tool */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Ratio className="w-3.5 h-3.5 text-amber-400" />
                <span>Aspect Ratio</span>
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => onChangeAspectRatio(e.target.value as AspectRatioType)}
                className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-zinc-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="16:9">16:9 Widescreen</option>
                <option value="2.39:1">2.39:1 Cinemascope</option>
                <option value="4:3">4:3 Vintage Academy</option>
                <option value="9:16">9:16 Vertical Cinema</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Primary AI Engine</span>
              </label>
              <select
                value={targetAiTool}
                onChange={(e) => onChangeAiTool(e.target.value as AiToolPreset)}
                className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-zinc-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="universal">Universal Master (All)</option>
                <option value="kling">Kling AI Focus</option>
                <option value="luma">Luma Dream Machine</option>
                <option value="midjourney">Midjourney v6.1</option>
                <option value="runway">Runway Gen-3 Alpha</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Rule-Checked: Multi-Language &amp; Face Continuity Engine Active
          </span>
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating || !script.trim()}
          className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-zinc-950 font-bold text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? (
            <span>Architecting Sequence with Gemini AI...</span>
          ) : (
            <span>Generate Continuous Cinematic Shots</span>
          )}
        </button>
      </div>
    </div>
  );
};
