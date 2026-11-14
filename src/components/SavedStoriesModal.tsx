import React from 'react';
import {
  X,
  BookOpen,
  Film,
  Download,
  Trash2,
  PlayCircle,
  PlusCircle,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { GeneratedShot, StoryAngle } from '../lib/storyEngine';
import type { AppLang } from '../lib/i18n';

export interface SavedStoryItem {
  id: string;
  title: string;
  storySummary: string;
  genre?: string;
  durationDisplay: string;
  durationSeconds: number;
  shotCount: number;
  shots: GeneratedShot[];
  angle: StoryAngle;
  savedAt: number;
  partNumber?: number;
}

interface SavedStoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedStories: SavedStoryItem[];
  onDeleteStory: (id: string) => void;
  onLoadStory: (story: SavedStoryItem) => void;
  onContinueStory: (story: SavedStoryItem) => void;
  onDownloadStory: (story: SavedStoryItem) => void;
  lang: AppLang;
}

export const SavedStoriesModal: React.FC<SavedStoriesModalProps> = ({
  isOpen,
  onClose,
  savedStories,
  onDeleteStory,
  onLoadStory,
  onContinueStory,
  onDownloadStory,
  lang,
}) => {
  if (!isOpen) return null;

  const isMl = lang === 'ml';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0e101a] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-[#121524] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-black shadow-md shadow-amber-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>{isMl ? 'സേവ് ചെയ്ത കഥകളുടെ ശേഖരം' : 'Saved Stories Library'}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-mono">
                  {savedStories.length}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                {isMl
                  ? 'ഇവിടെ സേവ് ചെയ്തു വെച്ച കഥകൾ കാണാനും തുടർഭാഗങ്ങൾ (Part 2, Part 3) എഴുതാനും സാധിക്കും'
                  : 'Revisit saved stories, view prompt shots, or generate next continuation chapters'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story List / Empty State */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {savedStories.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-amber-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <p className="text-zinc-300 font-bold text-sm">
                {isMl ? 'ഇതുവരെ കഥകളൊന്നും സേവ് ചെയ്തിട്ടില്ല' : 'No saved stories yet'}
              </p>
              <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                {isMl
                  ? 'സ്റ്റെപ്പ് 3-ൽ (പ്രോംപ്റ്റുകൾ) താഴെയുള്ള "💾 കഥയും പ്രോംപ്റ്റുകളും സേവ് ചെയ്യുക" ബട്ടൺ അമർത്തിയാൽ നിങ്ങളുടെ കഥകൾ ഇവിടെ സുരക്ഷിതമായി സൂക്ഷിക്കപ്പെടും. എപ്പോൾ വേണമെങ്കിലും തുടർന്ന് എഴുതാം!'
                  : 'Generate a story and tap "Save Story & Prompts" on Step 3 to archive your cinematic chapters here.'}
              </p>
            </div>
          ) : (
            savedStories.map((story, idx) => (
              <div
                key={story.id || idx}
                className="bg-[#121422] border border-zinc-800/90 hover:border-amber-500/40 rounded-xl p-4 sm:p-5 transition-all shadow-md space-y-3"
              >
                {/* Story Top Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-bold">
                        {story.genre || 'Cinematic'}
                      </span>
                      {story.partNumber && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-[11px] font-bold">
                          Part {story.partNumber}
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-white tracking-wide truncate">
                        {story.title}
                      </h4>
                    </div>
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

                {/* Synopsis snippet */}
                <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3 bg-[#0a0c14] p-3 rounded-lg border border-zinc-900">
                  {story.storySummary}
                </p>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Continue story */}
                    <button
                      type="button"
                      onClick={() => onContinueStory(story)}
                      className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{isMl ? '➕ അടുത്ത ഭാഗം തുടരുക' : 'Continue Story'}</span>
                    </button>

                    {/* View shots */}
                    <button
                      type="button"
                      onClick={() => onLoadStory(story)}
                      className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border border-zinc-700"
                    >
                      <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isMl ? 'ഷോട്ടുകൾ കാണുക' : 'Open Prompts'}</span>
                    </button>

                    {/* Download text */}
                    <button
                      type="button"
                      onClick={() => onDownloadStory(story)}
                      className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs transition-all cursor-pointer flex items-center gap-1 border border-zinc-800"
                      title={isMl ? 'ടെക്സ്റ്റ് ഫയൽ ഡൗൺലോഡ് ചെയ്യുക' : 'Download TXT'}
                    >
                      <Download className="w-3.5 h-3.5 text-zinc-400" />
                      <span>.TXT</span>
                    </button>
                  </div>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => onDeleteStory(story.id)}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    title={isMl ? 'ഈ കഥ നീക്കം ചെയ്യുക' : 'Delete Story'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-800/80 bg-[#121524] flex items-center justify-between text-xs text-zinc-400">
          <span>
            {isMl
              ? 'ബ്രൗസറിൽ ലോക്കലായി സേവ് ചെയ്യപ്പെടുന്നു'
              : 'Saved locally in your device browser storage'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold cursor-pointer transition-colors"
          >
            {isMl ? 'അടയ്ക്കുക' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
