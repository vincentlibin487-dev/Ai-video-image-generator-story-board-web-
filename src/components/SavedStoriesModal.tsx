import React, { useState } from 'react';
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
  Heart,
  History,
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
  isLoved?: boolean;
  syncedToGmail?: string;
}

interface SavedStoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedStories: SavedStoryItem[];
  onDeleteStory: (id: string) => void;
  onLoadStory: (story: SavedStoryItem) => void;
  onContinueStory: (story: SavedStoryItem) => void;
  onDownloadStory: (story: SavedStoryItem) => void;
  onToggleLove?: (story: SavedStoryItem) => void;
  lang: AppLang;
  userEmail?: string | null;
}

export const SavedStoriesModal: React.FC<SavedStoriesModalProps> = ({
  isOpen,
  onClose,
  savedStories,
  onDeleteStory,
  onLoadStory,
  onContinueStory,
  onDownloadStory,
  onToggleLove,
  lang,
  userEmail,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'loved'>('all');

  if (!isOpen) return null;

  const isMl = lang === 'ml';

  const lovedStories = savedStories.filter((s) => s.isLoved);
  const displayedStories = (filterMode === 'loved' ? lovedStories : savedStories)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0e101a] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-[#121524] space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500 text-black shadow-md shadow-amber-500/20">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>{isMl ? 'സ്റ്റോറി ഹിസ്റ്ററി & ❤️ പ്രിയപ്പെട്ട കഥകൾ' : 'Story History & ❤️ Saved Stories'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-mono">
                    {savedStories.length}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  {isMl
                    ? 'നിങ്ങൾ തിരഞ്ഞെടുത്തതും ❤️ ലൈക്ക് ചെയ്തതുമായ കഥകൾ മാത്രം ഇവിടെ കാണാം. ഏത് കഥയിലും അമർത്തി പഴയ പ്രോംപ്റ്റുകൾ വീണ്ടും എടുക്കാം.'
                    : 'Your generated & ❤️ favorited stories history. Tap any story to jump straight back to its prompts.'}
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

          {/* All History vs ❤️ Loved Filter Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-amber-500 text-black font-extrabold'
                  : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
              }`}
            >
              {isMl ? `എല്ലാ കഥകളും (${savedStories.length})` : `All Stories (${savedStories.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('loved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'loved'
                  ? 'bg-rose-500 text-white font-extrabold'
                  : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${filterMode === 'loved' ? 'fill-white' : 'text-rose-400 fill-rose-400'}`} />
              <span>{isMl ? `❤️ പ്രിയപ്പെട്ടവ (${lovedStories.length})` : `Loved (${lovedStories.length})`}</span>
            </button>
          </div>
        </div>

        {/* Story List / Empty State */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {displayedStories.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-rose-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <p className="text-zinc-300 font-bold text-sm">
                {filterMode === 'loved'
                  ? isMl
                    ? '❤️ ലൗ ചിഹ്നം നൽകിയ കഥകളൊന്നും ഇതുവരെ ഇല്ല'
                    : 'No ❤️ loved stories yet'
                  : isMl
                  ? 'ഇതുവരെ കഥകളൊന്നും ഹിസ്റ്ററിയിൽ സേവ് ചെയ്തിട്ടില്ല'
                  : 'No stories in history yet'}
              </p>
              <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                {isMl
                  ? '14 കഥാ ഓപ്ഷനുകളിൽ ഏതെങ്കിലും കഥയുടെ മുകളിലുള്ള ❤️ ലൗ ചിഹ്നത്തിൽ അമർത്തുകയോ പ്രോംപ്റ്റുകൾ തയ്യാറാക്കുകയോ ചെയ്താൽ അവ ഓട്ടോമാറ്റിക്കായി ഇവിടെ സേവ് ആകും!'
                  : 'Tap the ❤️ heart icon on any of the 14 story scripts or open its prompts to automatically save it here.'}
              </p>
            </div>
          ) : (
            displayedStories.map((story, idx) => (
              <div
                key={story.id || idx}
                className={`bg-[#121422] border rounded-xl p-4 sm:p-5 transition-all shadow-md space-y-3 ${
                  story.isLoved
                    ? 'border-rose-500/40 hover:border-rose-400/70'
                    : 'border-zinc-800/90 hover:border-amber-500/40'
                }`}
              >
                {/* Story Top Info with ❤️ Heart Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    {onToggleLove ? (
                      <button
                        type="button"
                        onClick={() => onToggleLove(story)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                          story.isLoved
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-rose-400'
                        }`}
                        title={story.isLoved ? (isMl ? '❤️ പ്രിയപ്പെട്ടത്' : 'Loved') : (isMl ? 'ലൗ ചിഹ്നം നൽകുക' : 'Love story')}
                      >
                        <Heart className={`w-4 h-4 ${story.isLoved ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                    ) : (
                      story.isLoved && <Heart className="w-4 h-4 fill-rose-500 text-rose-500 shrink-0" />
                    )}

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
                    <h4 className="text-sm font-bold text-white tracking-wide truncate">
                      {story.title}
                    </h4>
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
                    {/* View shots / Auto-open old Page 3 prompts */}
                    <button
                      type="button"
                      onClick={() => onLoadStory(story)}
                      className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
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

                    {/* Continue story */}
                    <button
                      type="button"
                      onClick={() => onContinueStory(story)}
                      className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border border-zinc-700"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isMl ? '➕ തുടരുക' : 'Continue Story'}</span>
                    </button>

                    {/* Download text if shots exist */}
                    {story.shots && story.shots.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onDownloadStory(story)}
                        className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs transition-all cursor-pointer flex items-center gap-1 border border-zinc-800"
                        title={isMl ? 'ടെക്സ്റ്റ് ഫയൽ ഡൗൺലോഡ് ചെയ്യുക' : 'Download TXT'}
                      >
                        <Download className="w-3.5 h-3.5 text-zinc-400" />
                        <span>.TXT</span>
                      </button>
                    )}
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
            {userEmail
              ? isMl
                ? `☁️ ${userEmail} അക്കൗണ്ടിൽ ഓട്ടോമാറ്റിക്കായി സേവ് ചെയ്യപ്പെടുന്നു`
                : `☁️ Auto-synced to ${userEmail}`
              : isMl
              ? 'ബ്രൗസറിൽ സേവ് ചെയ്യപ്പെടുന്നു (Google ലോഗിൻ ചെയ്താൽ ജിമെയിലിൽ സുരക്ഷിതമാകും)'
              : 'Saved locally (Sign in with Google to auto-sync across devices)'}
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
