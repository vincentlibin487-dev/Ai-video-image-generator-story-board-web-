import React, { useState } from 'react';
import { ShotItem, AspectRatioType, AiToolPreset } from '../types/director';
import {
  Film,
  Camera,
  SunMedium,
  Volume2,
  Copy,
  Check,
  Sparkles,
  Play,
  Layers,
  List,
  Eye,
  Clock,
  User,
  Sliders,
  ChevronRight,
  Maximize2
} from 'lucide-react';

interface StoryboardTimelineProps {
  shots: ShotItem[];
  aspectRatio: AspectRatioType;
  targetAiTool: AiToolPreset;
  onGenerateFrame: (shotId: string, prompt: string) => Promise<void>;
  onPlaySequence: () => void;
  onUpdateShot: (updatedShot: ShotItem) => void;
}

export const StoryboardTimeline: React.FC<StoryboardTimelineProps> = ({
  shots,
  aspectRatio,
  targetAiTool,
  onGenerateFrame,
  onPlaySequence,
  onUpdateShot,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'script'>('grid');
  const [activePromptTab, setActivePromptTab] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<string>(shots[0]?.id || '');
  const [speakingShotId, setSpeakingShotId] = useState<string | null>(null);
  const [showFullFrameUrl, setShowFullFrameUrl] = useState<string | null>(null);

  // Total runtime calculation
  const totalSeconds = shots.reduce((acc, s) => acc + (s.durationSeconds || 8), 0);
  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `00:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:00`;
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Browser Speech Synthesis for Dialogue
  const handleSpeakDialogue = (shot: ShotItem) => {
    if (!shot.dialogue?.lineOriginal) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(shot.dialogue.lineOriginal);
      utterance.rate = 0.9;
      setSpeakingShotId(shot.id);

      utterance.onend = () => setSpeakingShotId(null);
      utterance.onerror = () => setSpeakingShotId(null);

      // Try to find matching voice for Malayalam/Hindi/Tamil if available
      const voices = window.speechSynthesis.getVoices();
      const langVoice = voices.find(
        (v) =>
          v.lang.includes('ml') ||
          v.lang.includes('hi') ||
          v.lang.includes('ta') ||
          v.lang.includes('te') ||
          v.lang.includes('en')
      );
      if (langVoice) utterance.voice = langVoice;

      window.speechSynthesis.speak(utterance);
    }
  };

  if (shots.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#0f111a] border border-zinc-800/80 rounded-2xl p-5 shadow-2xl space-y-6">
      {/* Top Bar: Timeline Stats & View Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-100 uppercase tracking-wide font-cinema">
                Continuous Storyboard &amp; Shot Breakdown
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono-code font-bold">
                {shots.length} SHOTS
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Total Runtime: <span className="text-zinc-200 font-mono-code font-bold">{totalSeconds}s</span> ({formatTimecode(totalSeconds)}) • Film Standards Enforced
            </p>
          </div>
        </div>

        {/* View Switcher & Playback Actions */}
        <div className="flex items-center gap-2">
          {/* Play Sequence Modal Button */}
          <button
            onClick={onPlaySequence}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Director Playback Preview
          </button>

          {/* View Mode Buttons */}
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-zinc-800 text-amber-400 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Storyboard Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-zinc-800 text-amber-400 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Production Sheet
            </button>
            <button
              onClick={() => setViewMode('script')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewMode === 'script' ? 'bg-zinc-800 text-amber-400 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              Screenplay
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Timeline Scrub Ribbon */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono-code text-zinc-500">
          <span>TIMELINE SEQUENCE (CONTINUOUS FLOW)</span>
          <span>{formatTimecode(totalSeconds)}</span>
        </div>

        <div className="flex w-full h-8 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 p-0.5 gap-1">
          {shots.map((shot, idx) => {
            const widthPct = (shot.durationSeconds / totalSeconds) * 100;
            const isSelected = selectedShotId === shot.id;
            return (
              <button
                key={shot.id}
                onClick={() => setSelectedShotId(shot.id)}
                style={{ width: `${widthPct}%` }}
                className={`h-full rounded relative group transition-all text-left px-2 flex items-center justify-between overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-md ring-1 ring-amber-400'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300'
                }`}
                title={`Shot ${shot.shotNumber} (${shot.durationSeconds}s): ${shot.sceneHeading}`}
              >
                <span className="text-[10px] font-mono-code truncate">
                  #{shot.shotNumber}
                </span>
                <span className="text-[9px] font-mono-code opacity-80">
                  {shot.durationSeconds}s
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW MODE 1: STORYBOARD CARD GRID */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          {shots.map((shot) => {
            const currentTab = activePromptTab[shot.id] || targetAiTool || 'master';
            const isGeneratingThisFrame = shot.isGeneratingImage;
            const isSpeaking = speakingShotId === shot.id;

            return (
              <div
                key={shot.id}
                id={`shot-card-${shot.id}`}
                className={`rounded-2xl border transition-all p-5 ${
                  selectedShotId === shot.id
                    ? 'bg-[#121422] border-amber-500/60 shadow-xl shadow-amber-500/5'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {/* Shot Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-lg bg-amber-500 text-zinc-950 font-mono-code font-extrabold text-xs shadow-sm">
                      SHOT {shot.shotNumber.toString().padStart(2, '0')}
                    </span>
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400 font-mono-code text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      {shot.durationSeconds} SECONDS
                    </span>
                    <h3 className="text-sm font-bold text-zinc-100 font-mono-code tracking-wide">
                      {shot.sceneHeading}
                    </h3>
                  </div>

                  {/* Character presence badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {shot.charactersPresent.map((cName) => (
                      <span
                        key={cName}
                        className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800"
                      >
                        <User className="w-3 h-3 text-amber-400" />
                        {cName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Body: Split into Frame Preview / Action on Left, Generation Prompts & Specs on Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: Visual Frame Preview + Script Action + Dialogue */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Visual Frame Canvas */}
                    <div className="relative group rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-inner">
                      <div
                        className={`w-full overflow-hidden flex items-center justify-center bg-black ${
                          aspectRatio === '9:16'
                            ? 'aspect-[9/16]'
                            : aspectRatio === '4:3'
                            ? 'aspect-[4/3]'
                            : aspectRatio === '2.39:1'
                            ? 'aspect-[2.39/1]'
                            : 'aspect-video'
                        }`}
                      >
                        {shot.frameImageUrl ? (
                          <img
                            src={shot.frameImageUrl}
                            alt={`Shot ${shot.shotNumber}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                            <Camera className="w-8 h-8 mb-2 text-zinc-700" />
                            <p className="text-xs font-medium text-zinc-400">Storyboard Frame Preview</p>
                            <p className="text-[10px] text-zinc-600 mt-1">Aspect Ratio: {aspectRatio}</p>
                          </div>
                        )}
                      </div>

                      {/* Overlay action buttons */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        {shot.frameImageUrl && (
                          <button
                            onClick={() => setShowFullFrameUrl(shot.frameImageUrl || null)}
                            className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-zinc-300 hover:text-white backdrop-blur-sm transition-colors"
                            title="Expand Frame"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onGenerateFrame(shot.id, shot.generationPrompts.masterCinematic)}
                          disabled={isGeneratingThisFrame}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/90 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md backdrop-blur-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${isGeneratingThisFrame ? 'animate-spin' : ''}`} />
                          {isGeneratingThisFrame ? 'Rendering Frame...' : shot.frameImageUrl ? 'Regenerate Frame' : 'Generate Frame'}
                        </button>
                      </div>

                      {/* Framing info badge */}
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-mono-code text-zinc-300 border border-white/10">
                        {shot.cameraDetails.framing} • {shot.cameraDetails.lens}
                      </div>
                    </div>

                    {/* Script Action Segment */}
                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3">
                      <span className="text-[10px] font-mono-code uppercase tracking-wider text-amber-400/90 font-bold block mb-1">
                        Script Segment &amp; Physical Action (Rule 4)
                      </span>
                      <p className="text-xs text-zinc-200 leading-relaxed">
                        {shot.scriptSegment}
                      </p>
                    </div>

                    {/* Multi-Language Dialogue Block */}
                    {shot.dialogue && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span>{shot.dialogue.character}</span>
                            {shot.dialogue.audioEmotion && (
                              <span className="text-[10px] text-zinc-400 font-normal italic lowercase">
                                ({shot.dialogue.audioEmotion})
                              </span>
                            )}
                          </span>

                          <button
                            onClick={() => handleSpeakDialogue(shot)}
                            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                            title="Play audio voiceover preview"
                          >
                            <Volume2 className={`w-3 h-3 ${isSpeaking ? 'text-amber-400 animate-pulse' : ''}`} />
                            {isSpeaking ? 'Speaking...' : 'Listen VO'}
                          </button>
                        </div>

                        {/* Native Script Dialogue (Malayalam, Hindi, Tamil, etc.) */}
                        <p className="text-sm font-semibold text-zinc-100 leading-relaxed">
                          "{shot.dialogue.lineOriginal}"
                        </p>

                        {/* Romanized Transliteration */}
                        {shot.dialogue.lineRomanized && (
                          <p className="text-[11px] font-mono-code text-zinc-400 mt-1.5">
                            <span className="text-zinc-500">Cadence: </span>
                            {shot.dialogue.lineRomanized}
                          </p>
                        )}

                        {/* English Translation */}
                        {shot.dialogue.lineEnglish && (
                          <p className="text-[11px] text-zinc-400 italic mt-1 border-t border-zinc-800/80 pt-1">
                            <span className="text-zinc-500 not-italic">English: </span>
                            "{shot.dialogue.lineEnglish}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: AI Video/Image Prompts (Kling, Luma, Midjourney) & Film Specs */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Prompt Tabs for Video/Image AI Tools */}
                    <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2 mb-3">
                        <div className="flex items-center gap-1 text-[11px] font-mono-code text-zinc-400">
                          <Sliders className="w-3.5 h-3.5 text-amber-400" />
                          <span>AI GENERATION PROMPT:</span>
                        </div>

                        {/* Tool Tabs */}
                        <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[11px]">
                          {(
                            [
                              { key: 'master', label: 'Master Cinematic' },
                              { key: 'kling', label: 'Kling AI' },
                              { key: 'luma', label: 'Luma' },
                              { key: 'midjourney', label: 'Midjourney v6' },
                              { key: 'runway', label: 'Runway Gen-3' },
                            ] as const
                          ).map((tab) => (
                            <button
                              key={tab.key}
                              onClick={() =>
                                setActivePromptTab((prev) => ({ ...prev, [shot.id]: tab.key }))
                              }
                              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                                currentTab === tab.key
                                  ? 'bg-amber-500 text-zinc-950 font-bold'
                                  : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Active Prompt Text with Copy Button */}
                      {(() => {
                        let activePromptText = shot.generationPrompts.masterCinematic;
                        if (currentTab === 'kling') activePromptText = shot.generationPrompts.klingPrompt;
                        else if (currentTab === 'luma') activePromptText = shot.generationPrompts.lumaPrompt;
                        else if (currentTab === 'midjourney')
                          activePromptText = shot.generationPrompts.midjourneyPrompt;
                        else if (currentTab === 'runway')
                          activePromptText = shot.generationPrompts.runwayPrompt;

                        const copyKey = `${shot.id}-${currentTab}`;
                        const isCopied = copiedKey === copyKey;

                        return (
                          <div className="relative">
                            <p className="text-xs text-zinc-300 font-mono-code bg-zinc-900/90 border border-zinc-800/90 rounded-lg p-3 pr-20 leading-relaxed selection:bg-amber-500 selection:text-zinc-950">
                              {activePromptText}
                            </p>

                            <button
                              onClick={() => handleCopy(activePromptText, copyKey)}
                              className={`absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                                isCopied
                                  ? 'bg-emerald-500 text-zinc-950'
                                  : 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700'
                              }`}
                              title="Copy prompt for AI video tool"
                            >
                              {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {isCopied ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                        );
                      })()}

                      {/* Character Continuity Injected Tags */}
                      {shot.characterContinuityTokens.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-800/60">
                          <span className="text-[10px] font-mono-code text-zinc-500 uppercase tracking-wider block mb-1">
                            Locked Continuity Anchors In Prompt:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {shot.characterContinuityTokens.map((tok, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-amber-300/80 border border-zinc-800"
                              >
                                ✓ {tok}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Film Technical Specs Grid: Camera, Lighting & Grade, Audio & Foley */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* 1. Camera Specs */}
                      <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Camera Move</span>
                        </div>
                        <p className="text-[11px] text-zinc-200 font-medium">{shot.cameraDetails.framing}</p>
                        <p className="text-[11px] text-zinc-400">{shot.cameraDetails.movement}</p>
                        <p className="text-[10px] font-mono-code text-zinc-500">Lens: {shot.cameraDetails.lens}</p>
                      </div>

                      {/* 2. Lighting & Color Grade */}
                      <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                          <SunMedium className="w-3.5 h-3.5" />
                          <span>Lighting &amp; Grade</span>
                        </div>
                        <p className="text-[11px] text-zinc-200">{shot.lightingColor.lighting}</p>
                        <p className="text-[10px] font-mono-code text-amber-300/80">{shot.lightingColor.colorGrade}</p>
                        <p className="text-[10px] text-zinc-400">Atmo: {shot.lightingColor.atmosphere}</p>
                      </div>

                      {/* 3. Audio & Foley */}
                      <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Audio / Foley</span>
                        </div>
                        <p className="text-[11px] text-zinc-200">{shot.audioFoley.sfx}</p>
                        <p className="text-[10px] text-zinc-400 italic">Score: {shot.audioFoley.musicCue}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: PRODUCTION SHEET TABLE */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/90 text-zinc-400 uppercase font-mono-code text-[11px] border-b border-zinc-800">
              <tr>
                <th className="p-3">Shot #</th>
                <th className="p-3">Dur</th>
                <th className="p-3">Scene &amp; Action</th>
                <th className="p-3">Characters &amp; Dialogue</th>
                <th className="p-3">Camera &amp; Lens</th>
                <th className="p-3">Lighting / Grade</th>
                <th className="p-3">AI Video Prompt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {shots.map((shot) => (
                <tr key={shot.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="p-3 font-mono-code font-bold text-amber-400">
                    #{shot.shotNumber}
                  </td>
                  <td className="p-3 font-mono-code text-zinc-300">
                    {shot.durationSeconds}s
                  </td>
                  <td className="p-3 max-w-xs">
                    <p className="font-semibold text-zinc-100 mb-1">{shot.sceneHeading}</p>
                    <p className="text-zinc-400 line-clamp-3">{shot.scriptSegment}</p>
                  </td>
                  <td className="p-3 max-w-xs">
                    <div className="space-y-1">
                      <p className="text-[11px] text-amber-300 font-medium">
                        {shot.charactersPresent.join(', ')}
                      </p>
                      {shot.dialogue && (
                        <p className="text-zinc-200 italic">
                          "{shot.dialogue.lineOriginal}"
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-zinc-300 font-mono-code text-[11px] max-w-xs">
                    <p>{shot.cameraDetails.framing}</p>
                    <p className="text-zinc-500">{shot.cameraDetails.lens}</p>
                    <p className="text-zinc-400">{shot.cameraDetails.movement}</p>
                  </td>
                  <td className="p-3 text-zinc-400 text-[11px] max-w-xs">
                    <p className="text-zinc-300">{shot.lightingColor.lighting}</p>
                    <p className="text-amber-400/80 font-mono-code">{shot.lightingColor.colorGrade}</p>
                  </td>
                  <td className="p-3 max-w-sm">
                    <div className="relative">
                      <p className="font-mono-code text-[11px] text-zinc-300 bg-zinc-950 p-2 rounded border border-zinc-800 line-clamp-2">
                        {shot.generationPrompts.masterCinematic}
                      </p>
                      <button
                        onClick={() => handleCopy(shot.generationPrompts.masterCinematic, `tbl-${shot.id}`)}
                        className="mt-1 text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                      >
                        {copiedKey === `tbl-${shot.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedKey === `tbl-${shot.id}` ? 'Copied' : 'Copy Prompt'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW MODE 3: SCREENPLAY FORMAT */}
      {viewMode === 'script' && (
        <div className="bg-[#0b0d14] border border-zinc-800/90 rounded-xl p-8 max-w-3xl mx-auto shadow-inner font-mono text-zinc-300 space-y-6">
          <div className="text-center border-b border-zinc-800 pb-4">
            <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-widest font-cinema">
              DIRECTOR'S PRODUCTION SCREENPLAY
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Multi-Language Sequential Shot Breakdown • Total {shots.length} Shots ({totalSeconds}s)
            </p>
          </div>

          <div className="space-y-8">
            {shots.map((shot) => (
              <div key={shot.id} className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400 border-b border-zinc-800/50 pb-1">
                  <span>
                    SHOT {shot.shotNumber} — {shot.sceneHeading}
                  </span>
                  <span>[{shot.durationSeconds} SECONDS]</span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed pl-4 border-l-2 border-zinc-700">
                  {shot.scriptSegment}
                </p>

                {shot.dialogue && (
                  <div className="text-center max-w-md mx-auto my-3 space-y-1">
                    <p className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                      {shot.dialogue.character}
                    </p>
                    {shot.dialogue.audioEmotion && (
                      <p className="text-[11px] text-zinc-500 italic">
                        ({shot.dialogue.audioEmotion})
                      </p>
                    )}
                    <p className="text-sm font-semibold text-amber-300">
                      "{shot.dialogue.lineOriginal}"
                    </p>
                    {shot.dialogue.lineRomanized && (
                      <p className="text-[11px] text-zinc-400">
                        ({shot.dialogue.lineRomanized})
                      </p>
                    )}
                    {shot.dialogue.lineEnglish && (
                      <p className="text-[11px] text-zinc-500 italic">
                        [Eng: "{shot.dialogue.lineEnglish}"]
                      </p>
                    )}
                  </div>
                )}

                <div className="text-[10px] text-zinc-500 font-mono-code bg-zinc-950 p-2 rounded border border-zinc-800/70">
                  <span className="text-amber-500/80 font-semibold">CAMERA: </span>
                  {shot.cameraDetails.framing} • {shot.cameraDetails.movement} ({shot.cameraDetails.lens}) |{' '}
                  <span className="text-amber-500/80 font-semibold">LIGHTING: </span>
                  {shot.lightingColor.lighting}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expand Frame Modal */}
      {showFullFrameUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative max-w-4xl w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 p-2 shadow-2xl">
            <button
              onClick={() => setShowFullFrameUrl(null)}
              className="absolute top-4 right-4 z-10 px-3 py-1 rounded-lg bg-black/80 hover:bg-black text-white text-xs font-bold border border-zinc-700 cursor-pointer"
            >
              Close ✕
            </button>
            <img src={showFullFrameUrl} alt="Expanded Storyboard Frame" className="w-full h-auto rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
