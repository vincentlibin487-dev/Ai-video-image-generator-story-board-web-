import React, { useMemo, useRef } from 'react';
import {
  Film,
  Volume2,
  VolumeX,
  Palette,
  Music,
  Mic,
  Type,
  Smile,
  Flame,
  Clapperboard,
  Wand2,
  Split,
  SlidersHorizontal,
  Sparkles,
  Layers,
  Plus,
  Loader2,
  Scissors,
} from 'lucide-react';
import type { WheelCategoryItem } from './CircularToolWheel';

export interface TimelineClipItem {
  id: string;
  mediaId?: string;
  title: string;
  durationSec: number;
  sourceStartSec?: number;
  url: string;
  thumbnailUrl?: string;
  type: 'video' | 'photo';
  isProcessing?: boolean;
}

export interface TimelineOverlayBlock {
  id: string;
  trackId: string;
  label: string;
  startSec: number;
  durationSec: number;
  accentHex: string;
  muted?: boolean;
  selected?: boolean;
  onSelect: () => void;
}

interface TimelinePanelProps {
  clips: TimelineClipItem[];
  activeClipIndex: number;
  isTimelineSelectionActive: boolean;
  activeCategory: WheelCategoryItem;
  disabledCategoryIds: string[];
  currentTimeSec: number;
  totalDurationSec: number;
  pxPerSec: number;
  isClipAudioMuted: boolean;
  isPlaying: boolean;
  isCssRotatedLandscape: boolean;
  overlayBlocks: TimelineOverlayBlock[];
  onSelectClip: (index: number) => void;
  onSeekToTime: (timeSec: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  onRequestAddMedia: () => void;
  onOpenActiveCategoryPanel: () => void;
  onToggleCategoryMute: (category: WheelCategoryItem) => void;
  onSplitAtPlayhead: () => void;
  timelineScrollRef: React.RefObject<HTMLDivElement | null>;
  playheadLineRef: React.RefObject<HTMLDivElement | null>;
  redBadgeTimeRef: React.RefObject<HTMLSpanElement | null>;
}

export function formatTimecodeShort(sec: number): string {
  const safe = Math.max(0, Number.isFinite(sec) ? sec : 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const tenths = Math.floor((safe % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function formatRulerTime(sec: number): string {
  const safe = Math.max(0, Math.round(sec));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const LEAD_PX = 20;

const TRACK_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Film,
  audio: Volume2,
  filters: Palette,
  music: Music,
  dialogues: Mic,
  titles: Type,
  stickers: Smile,
  vfx: Flame,
  card: Clapperboard,
  chroma: Wand2,
  split: Split,
  transitions: SlidersHorizontal,
  effects: Sparkles,
  templates: Layers,
};

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  clips,
  activeClipIndex,
  isTimelineSelectionActive,
  activeCategory,
  disabledCategoryIds,
  currentTimeSec,
  totalDurationSec,
  pxPerSec,
  isClipAudioMuted,
  isCssRotatedLandscape,
  overlayBlocks,
  onSelectClip,
  onSeekToTime,
  onScrubStart,
  onScrubEnd,
  onRequestAddMedia,
  onOpenActiveCategoryPanel,
  onToggleCategoryMute,
  onSplitAtPlayhead,
  timelineScrollRef,
  playheadLineRef,
  redBadgeTimeRef,
}) => {
  const scrubbingModeRef = useRef<'none' | 'playhead' | 'ruler'>('none');

  const safeTotal = Math.max(0, totalDurationSec);
  const rulerMaxSec = Math.max(15, Math.ceil((safeTotal + 6) / 5) * 5);
  const trackCanvasWidth = Math.max(520, LEAD_PX + rulerMaxSec * pxPerSec + 64);

  // Compute exact cumulative timeline start offset for every clip
  const clipSegments = useMemo(() => {
    let cursor = 0;
    return clips.map((clip, idx) => {
      const dur = Math.max(0.2, Number(clip.durationSec) || 4);
      const seg = {
        clip,
        index: idx,
        startSec: cursor,
        endSec: cursor + dur,
        durationSec: dur,
      };
      cursor += dur;
      return seg;
    });
  }, [clips]);

  // Pre-compute ruler ticks every 1s with labeled major ticks every 5s (or 2s when zoomed in)
  const majorStepSec = pxPerSec >= 34 ? 2 : 5;
  const rulerTicks = useMemo(() => {
    const arr: Array<{ sec: number; major: boolean }> = [];
    for (let s = 0; s <= rulerMaxSec; s += 1) {
      arr.push({ sec: s, major: s % majorStepSec === 0 });
    }
    return arr;
  }, [rulerMaxSec, majorStepSec]);

  // Group compact active overlay blocks into slim rows (never giant cards)
  const activeOverlayItems = useMemo(() => {
    if (activeCategory.id === 'video') {
      return overlayBlocks;
    }
    const matching = overlayBlocks.filter((b) => b.trackId === activeCategory.id);
    const others = overlayBlocks.filter((b) => b.trackId !== activeCategory.id);
    return [...matching, ...others];
  }, [overlayBlocks, activeCategory.id]);

  // Convert pointer coordinate (accounting for CSS 90deg rotation on portrait mobile) into timeline seconds
  const getTimeFromPointer = (clientX: number, clientY: number): number => {
    const el = timelineScrollRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    let relX = clientX - rect.left;
    if (isCssRotatedLandscape && rect.height > 0 && el.clientWidth > 0) {
      // When container is rotated 90deg clockwise, visual horizontal axis maps to clientY
      const ratio = (clientY - rect.top) / rect.height;
      relX = ratio * el.clientWidth;
    }
    const contentX = relX + el.scrollLeft - LEAD_PX;
    const rawSec = contentX / Math.max(1, pxPerSec);
    return Math.max(0, Math.min(safeTotal, rawSec));
  };

  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    scrubbingModeRef.current = 'ruler';
    onScrubStart();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    onSeekToTime(getTimeFromPointer(e.clientX, e.clientY));
  };

  const handleRulerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubbingModeRef.current !== 'ruler') return;
    onSeekToTime(getTimeFromPointer(e.clientX, e.clientY));
  };

  const handleRulerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubbingModeRef.current !== 'ruler') return;
    scrubbingModeRef.current = 'none';
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    onScrubEnd();
  };

  const handlePlayheadPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    scrubbingModeRef.current = 'playhead';
    onScrubStart();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePlayheadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubbingModeRef.current !== 'playhead') return;
    onSeekToTime(getTimeFromPointer(e.clientX, e.clientY));
  };

  const handlePlayheadPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubbingModeRef.current !== 'playhead') return;
    scrubbingModeRef.current = 'none';
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    onScrubEnd();
  };

  const ActiveTrackIcon = TRACK_ICON_MAP[activeCategory.id] || Sparkles;
  const isActiveCatMuted = disabledCategoryIds.includes(activeCategory.id);
  const playheadLeftPx = LEAD_PX + Math.min(safeTotal, Math.max(0, currentTimeSec)) * pxPerSec;

  return (
    <div className="flex-1 min-h-0 flex bg-[#090c11] border-t border-zinc-800/80 select-none overflow-hidden">
      {/* LEFT COMPACT TRACK LABEL RAIL (42px wide, clean icons only) */}
      <div className="w-[42px] shrink-0 bg-[#0d1118] border-r border-zinc-800/80 flex flex-col z-20">
        {/* Top corner aligns with Time Ruler */}
        <div className="h-[22px] border-b border-zinc-800/80 flex items-center justify-center">
          <span className="text-[8px] font-mono text-zinc-500 tabular-nums">
            {clips.length}
          </span>
        </div>

        {/* Video Track Header */}
        <div className="h-[44px] border-b border-zinc-800/60 flex items-center justify-center">
          <button
            type="button"
            onClick={onRequestAddMedia}
            className="w-7 h-7 rounded-lg bg-[#161c26] hover:bg-teal-400/20 border border-zinc-700/70 text-teal-300 flex items-center justify-center cursor-pointer transition-colors"
            title="Add Video / Photo Clip"
          >
            {clips.length === 0 ? <Plus className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Audio / Active Effect Slim Track Header */}
        <div className="h-[32px] border-b border-zinc-800/40 flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              if (activeCategory.id === 'video') {
                onOpenActiveCategoryPanel();
              } else {
                onToggleCategoryMute(activeCategory);
              }
            }}
            className={`w-7 h-6 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${
              isActiveCatMuted || (activeCategory.id === 'video' && isClipAudioMuted)
                ? 'bg-red-950/50 border-red-500/40 text-red-400'
                : 'bg-[#141923] border-zinc-700/60 text-zinc-300 hover:text-white'
            }`}
            title={
              activeCategory.id === 'video'
                ? isClipAudioMuted
                  ? 'Clip Audio Muted'
                  : 'Clip Audio Active'
                : isActiveCatMuted
                ? `${activeCategory.shortLabel} Muted/Off (Tap to enable)`
                : `${activeCategory.shortLabel} Active (Tap to mute/disable)`
            }
          >
            {activeCategory.id === 'video' ? (
              isClipAudioMuted ? (
                <VolumeX className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3 text-emerald-400" />
              )
            ) : (
              <ActiveTrackIcon className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* RIGHT SCROLLABLE TIME-ALIGNED TRACK CANVAS */}
      <div
        ref={timelineScrollRef}
        className="relative flex-1 min-w-0 overflow-x-auto overflow-y-auto overscroll-contain bg-[#090c11]"
      >
        <div
          className="relative min-h-full"
          style={{ width: `${trackCanvasWidth}px` }}
        >
          {/* 1. EXACT PIXEL-SYNCED TIME RULER (Tap or drag anywhere on ruler to scrub) */}
          <div
            onPointerDown={handleRulerPointerDown}
            onPointerMove={handleRulerPointerMove}
            onPointerUp={handleRulerPointerUp}
            onPointerCancel={handleRulerPointerUp}
            className="sticky top-0 z-20 h-[22px] bg-[#0e131b]/95 border-b border-zinc-800/90 cursor-ew-resize touch-none"
          >
            {rulerTicks.map((tick) => {
              const leftPx = LEAD_PX + tick.sec * pxPerSec;
              return (
                <div
                  key={tick.sec}
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: `${leftPx}px` }}
                >
                  <div
                    className={`w-px ${
                      tick.major ? 'h-2.5 bg-zinc-400/80' : 'h-1.5 bg-zinc-700/70'
                    }`}
                  />
                  {tick.major && (
                    <span className="absolute top-[7px] -translate-x-1/2 text-[9px] font-mono text-zinc-400 tabular-nums whitespace-nowrap">
                      {formatRulerTime(tick.sec)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 2. PRIMARY VIDEO / MEDIA CLIP TRACK (Clean strips aligned 1:1 with ruler — NO giant placeholder box) */}
          <div className="relative h-[44px] border-b border-zinc-800/70 bg-[#0b0f16]">
            {/* Subtle vertical 5s grid lines */}
            {rulerTicks
              .filter((t) => t.major)
              .map((t) => (
                <div
                  key={`vg_${t.sec}`}
                  className="absolute top-0 bottom-0 w-px bg-zinc-800/40 pointer-events-none"
                  style={{ left: `${LEAD_PX + t.sec * pxPerSec}px` }}
                />
              ))}

            {clipSegments.map(({ clip, index, startSec, durationSec }) => {
              const leftPx = LEAD_PX + startSec * pxPerSec;
              const widthPx = Math.max(26, durationSec * pxPerSec);
              const isSelected = isTimelineSelectionActive && index === activeClipIndex;

              return (
                <button
                  key={clip.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClip(index);
                  }}
                  style={{
                    left: `${leftPx}px`,
                    width: `${widthPx}px`,
                  }}
                  className={`absolute top-1 bottom-1 rounded-md overflow-hidden border text-left cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-amber-400 ring-1 ring-amber-400/70 bg-[#182230] z-10'
                      : 'border-teal-500/45 bg-[#121923] hover:border-teal-400/80'
                  }`}
                  title={`${clip.title} (${durationSec.toFixed(1)}s)`}
                >
                  {/* Filmstrip thumbnail background */}
                  {clip.thumbnailUrl ? (
                    <img
                      src={clip.thumbnailUrl}
                      alt={clip.title}
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-cover opacity-55 pointer-events-none"
                    />
                  ) : clip.type === 'photo' && clip.url ? (
                    <img
                      src={clip.url}
                      alt={clip.title}
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-cover opacity-55 pointer-events-none"
                    />
                  ) : null}

                  <div className="relative h-full w-full px-1.5 py-0.5 flex flex-col justify-between bg-gradient-to-r from-black/75 via-black/35 to-black/75 pointer-events-none">
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <span className="text-[9.5px] font-semibold text-white truncate">
                        {clip.title}
                      </span>
                      {clip.isProcessing && (
                        <Loader2 className="w-2.5 h-2.5 text-amber-300 animate-spin shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[8px] font-mono text-zinc-200 tabular-nums">
                      <span>{clip.isProcessing ? 'Sync...' : `${durationSec.toFixed(1)}s`}</span>
                      {widthPx > 86 && (
                        <span className="text-zinc-400">{formatRulerTime(startSec)}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 3. COMPACT OVERLAY / FEATURE / TEMPLATE TRACKS (Slim 22px proportional strips, NEVER giant boxes) */}
          <div className="relative min-h-[32px] py-1 space-y-1 bg-[#090c11]">
            {activeOverlayItems.length === 0 ? (
              <div className="h-[24px]" />
            ) : (
              activeOverlayItems.map((block) => {
                const leftPx = LEAD_PX + Math.max(0, block.startSec) * pxPerSec;
                const widthPx = Math.max(46, Math.max(0.4, block.durationSec) * pxPerSec);
                return (
                  <div key={block.id} className="relative h-[22px]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        block.onSelect();
                      }}
                      style={{
                        left: `${leftPx}px`,
                        width: `${widthPx}px`,
                        borderColor: block.muted ? 'rgba(239,68,68,0.45)' : `${block.accentHex}88`,
                      }}
                      className={`absolute top-0 bottom-0 px-2 rounded-md border flex items-center justify-between gap-1.5 text-left cursor-pointer transition-all overflow-hidden ${
                        block.muted
                          ? 'bg-zinc-900/70 text-zinc-500 opacity-60'
                          : block.selected
                          ? 'bg-[#1e293b] text-white ring-1 ring-white/40'
                          : 'bg-[#121822]/95 text-zinc-200 hover:bg-[#1a2230]'
                      }`}
                      title={block.label}
                    >
                      <span className="text-[9px] font-medium truncate leading-none">
                        {block.label}
                      </span>
                      <span className="text-[8px] font-mono text-zinc-400 shrink-0 tabular-nums">
                        {block.muted ? 'OFF' : `${block.durationSec.toFixed(1)}s`}
                      </span>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* 4. FULL-HEIGHT DRAGGABLE RED PLAYHEAD LINE WITH CENTERED SCISSORS SPLIT */}
          <div
            ref={playheadLineRef}
            onPointerDown={handlePlayheadPointerDown}
            onPointerMove={handlePlayheadPointerMove}
            onPointerUp={handlePlayheadPointerUp}
            onPointerCancel={handlePlayheadPointerUp}
            style={{ left: `${playheadLeftPx}px` }}
            className="absolute top-0 bottom-0 z-30 -translate-x-1/2 w-7 flex flex-col items-center cursor-ew-resize touch-none"
            title="Drag red playhead to scrub"
          >
            <span
              ref={redBadgeTimeRef}
              className="mt-[1px] px-1.5 py-[1px] rounded bg-red-600 text-white text-[8px] font-mono font-bold leading-tight shadow tabular-nums whitespace-nowrap"
            >
              {formatTimecodeShort(currentTimeSec)}
            </span>
            <div className="relative w-[2px] flex-1 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] flex items-center justify-center">
              {clips.length > 0 && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSplitAtPlayhead();
                  }}
                  className="w-6 h-6 rounded-full bg-red-600 hover:bg-amber-400 hover:text-black text-white border border-white/90 shadow-[0_2px_10px_rgba(0,0,0,0.8)] flex items-center justify-center cursor-pointer transition-transform active:scale-90"
                  title="Split clip into two segments at playhead"
                >
                  <Scissors className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="mb-0.5 w-3.5 h-2.5 rounded-full bg-red-500 border border-white/80 shadow" />
          </div>
        </div>
      </div>
    </div>
  );
};
