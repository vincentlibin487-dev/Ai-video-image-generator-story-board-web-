import React, { useState, useEffect, useRef } from 'react';
import { ShotItem } from '../types/director';
import { Play, Pause, SkipForward, SkipBack, X, Volume2, VolumeX } from 'lucide-react';

interface CinematicPlayerModalProps {
  shots: ShotItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const CinematicPlayerModal: React.FC<CinematicPlayerModalProps> = ({
  shots,
  isOpen,
  onClose,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [remainingSec, setRemainingSec] = useState(shots[0]?.durationSeconds || 8);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);

  const currentShot = shots[currentIdx];

  // Initialize or toggle ambient rain / cinema drone via Web Audio API
  useEffect(() => {
    if (!isOpen) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      return;
    }

    if (soundEnabled && !audioCtxRef.current) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        // Create warm low frequency cinematic drone
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, ctx.currentTime); // A1 note 55Hz low drone

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.04, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        noiseNodeRef.current = osc;
      } catch (e) {
        console.warn('AudioContext not allowed or failed:', e);
      }
    } else if (!soundEnabled && audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, [isOpen, soundEnabled]);

  // Voiceover playback on shot change
  useEffect(() => {
    if (!isOpen || !isPlaying || !currentShot?.dialogue?.lineOriginal) return;

    if (soundEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentShot.dialogue.lineOriginal);
      utterance.rate = 0.88;
      const voices = window.speechSynthesis.getVoices();
      const langVoice = voices.find(
        (v) =>
          v.lang.includes('ml') ||
          v.lang.includes('hi') ||
          v.lang.includes('ta') ||
          v.lang.includes('en')
      );
      if (langVoice) utterance.voice = langVoice;
      window.speechSynthesis.speak(utterance);
    }

    setRemainingSec(currentShot.durationSeconds || 8);
  }, [currentIdx, isOpen, isPlaying]);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const timer = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          if (currentIdx < shots.length - 1) {
            setCurrentIdx((c) => c + 1);
            return shots[currentIdx + 1]?.durationSeconds || 8;
          } else {
            setIsPlaying(false);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentIdx, shots]);

  if (!isOpen || !currentShot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <div className="relative w-full max-w-5xl bg-[#08090e] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Cinema Monitor Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-zinc-950 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/20 text-red-400 border border-red-600/40 text-xs font-mono-code font-bold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              DIRECTOR LIVE PREVIEW
            </span>
            <span className="text-xs font-mono-code text-zinc-400">
              Shot {currentIdx + 1} of {shots.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cinematic Viewport */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[380px]">
          {currentShot.frameImageUrl ? (
            <img
              src={currentShot.frameImageUrl}
              alt={currentShot.sceneHeading}
              className="w-full h-full object-contain max-h-[500px]"
            />
          ) : (
            <div className="p-8 text-center max-w-lg space-y-3">
              <div className="text-amber-400/60 font-cinema text-lg uppercase tracking-wider">
                {currentShot.sceneHeading}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                {currentShot.scriptSegment}
              </p>
              <div className="text-xs font-mono-code text-zinc-500">
                Camera: {currentShot.cameraDetails.framing} • {currentShot.cameraDetails.movement}
              </div>
            </div>
          )}

          {/* Subtitle / Dialogue Overlay at Bottom of Screen */}
          {currentShot.dialogue && (
            <div className="absolute bottom-6 inset-x-8 text-center pointer-events-none">
              <div className="inline-block px-5 py-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/10 max-w-2xl shadow-2xl">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-0.5">
                  {currentShot.dialogue.character}
                </p>
                <p className="text-base font-semibold text-white drop-shadow">
                  "{currentShot.dialogue.lineOriginal}"
                </p>
                {currentShot.dialogue.lineEnglish && (
                  <p className="text-xs text-zinc-300 italic mt-0.5">
                    ({currentShot.dialogue.lineEnglish})
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Viewfinder crosshairs & time remaining */}
          <div className="absolute top-4 left-4 text-xs font-mono-code bg-black/75 px-3 py-1 rounded text-amber-400 border border-amber-500/30">
            CUT IN: {remainingSec}s / {currentShot.durationSeconds}s
          </div>
        </div>

        {/* Player Controls Bar */}
        <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-mono-code text-zinc-400">
            <span className="text-zinc-200 font-bold">{currentShot.sceneHeading}</span> •{' '}
            <span className="text-amber-400">{currentShot.cameraDetails.framing}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (currentIdx > 0) {
                  setCurrentIdx((c) => c - 1);
                }
              }}
              disabled={currentIdx === 0}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              onClick={() => {
                if (currentIdx < shots.length - 1) {
                  setCurrentIdx((c) => c + 1);
                }
              }}
              disabled={currentIdx === shots.length - 1}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs font-mono-code text-zinc-500">
            Press ESC or Close to return to Director Console
          </div>
        </div>
      </div>
    </div>
  );
};
