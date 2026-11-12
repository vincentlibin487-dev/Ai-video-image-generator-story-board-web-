import React from 'react';
import { Clapperboard, Download, Play, RefreshCw, Film, ShieldCheck } from 'lucide-react';
import { DirectorProject } from '../types/director';

interface NavbarProps {
  project: DirectorProject;
  onOpenExport: () => void;
  onOpenPlayer: () => void;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  project,
  onOpenExport,
  onOpenPlayer,
  onReset,
}) => {
  const totalSeconds = project.shots.reduce((acc, s) => acc + (s.durationSeconds || 8), 0);

  return (
    <header className="sticky top-0 z-40 bg-[#090a10]/90 backdrop-blur-md border-b border-zinc-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-zinc-950 shadow-md shadow-amber-500/20">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-wider text-zinc-100 uppercase font-cinema">
                CineDirector AI
              </h1>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                STUDIO V3
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              AI Cinematic Director • Multi-Language &amp; Character Continuity Engine
            </p>
          </div>
        </div>

        {/* Center: Quick Production Badges */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500">Language:</span>
            <span className="font-semibold text-amber-400">{project.targetLanguage}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono-code">
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-zinc-200">{project.shots.length}</span> Shots
            <span className="text-zinc-500">•</span>
            <span className="text-amber-400 font-bold">{totalSeconds}s</span> Total
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Face Continuity Active
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {project.shots.length > 0 && (
            <>
              <button
                onClick={onOpenPlayer}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 text-xs font-semibold transition-colors cursor-pointer"
                title="Preview full sequence in player"
              >
                <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
                <span className="hidden sm:inline">Preview</span>
              </button>

              <button
                onClick={onOpenExport}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Prompts &amp; List
              </button>
            </>
          )}

          <button
            onClick={onReset}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
            title="Reset to New Screenplay"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
