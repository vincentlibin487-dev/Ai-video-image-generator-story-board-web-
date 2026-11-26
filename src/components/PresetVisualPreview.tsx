import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { WheelCategoryItem } from './CircularToolWheel';
import {
  type FilterItem,
  type AudioItem,
  type TransitionItem,
  type EffectItem,
  type TitleItem,
  type TemplateItem,
  type StickerItem,
  type ColorGradePreset,
  type CinemaVfxItem,
  type MediaMotionPreset,
  type DialoguePresetItem,
  type TrailerCardPresetItem,
  type ChromaPresetItem,
  type SplitLayoutPresetItem,
} from './videoStudioLibrary';

export interface LivePreviewContextProps {
  category: WheelCategoryItem;
  isMutedOrOff: boolean;
  primaryClipThumbUrl?: string;
  secondaryClipThumbUrl?: string;
  activeFilter: FilterItem;
  activeColorGrade: ColorGradePreset | null;
  activeTransition: TransitionItem | null;
  activeEffect: EffectItem | null;
  activeTitle: { title: string; subtitle: string; show: boolean };
  activeAudio: AudioItem;
  previewingAudioId: string | null;
  activeMotionPreset: MediaMotionPreset | null;
  activeDialogue: { speaker: string; text: string } | null;
  activeCardPreset: TrailerCardPresetItem | null;
  activeChromaEnabled: boolean;
  activeChromaBgMode: string;
  activeSplitEnabled: boolean;
  activeSplitLayout: string;
  activeSplitRatio: number;
  activeVfx: CinemaVfxItem | null;
  activeSticker: StickerItem | null;
  activeTemplate: TemplateItem | null;
}

export function getColorGradeCssFilter(cg: ColorGradePreset): string {
  const b = Math.max(40, Math.min(180, 100 + cg.brightness));
  const c = Math.max(40, Math.min(200, 100 + cg.contrast));
  const s = Math.max(0, Math.min(200, 100 + cg.saturation));
  const parts = [`brightness(${b}%)`, `contrast(${c}%)`, `saturate(${s}%)`];
  if (cg.warmth > 0) parts.push(`sepia(${Math.min(55, cg.warmth)}%)`);
  if (cg.tint && Math.abs(cg.tint) > 0) parts.push(`hue-rotate(${cg.tint}deg)`);
  return parts.join(' ');
}

function drawDemoScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  variant: 'A' | 'B',
  imgA: HTMLImageElement | null,
  imgB: HTMLImageElement | null,
  filterCss = 'none'
) {
  ctx.save();
  ctx.filter = filterCss;
  const img = variant === 'A' ? imgA : imgB;
  if (img && img.complete && img.naturalWidth > 0) {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.restore();
    return;
  }

  // Rich built-in vector Scene A (Warm Golden Sunset) & Scene B (Cyan Cyber Night)
  const g = ctx.createLinearGradient(0, 0, w, h);
  if (variant === 'A') {
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.55, '#9a3412');
    g.addColorStop(1, '#f59e0b');
  } else {
    g.addColorStop(0, '#042f2e');
    g.addColorStop(0.5, '#0369a1');
    g.addColorStop(1, '#311042');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Sun / Moon orb
  ctx.fillStyle = variant === 'A' ? 'rgba(253, 224, 71, 0.9)' : 'rgba(103, 232, 249, 0.88)';
  ctx.beginPath();
  ctx.arc(variant === 'A' ? w * 0.72 : w * 0.28, h * 0.32, Math.min(w, h) * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // Mountain / Skyline silhouettes
  ctx.fillStyle = variant === 'A' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(9, 12, 24, 0.88)';
  ctx.beginPath();
  if (variant === 'A') {
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.72);
    ctx.lineTo(w * 0.28, h * 0.48);
    ctx.lineTo(w * 0.56, h * 0.68);
    ctx.lineTo(w * 0.82, h * 0.42);
    ctx.lineTo(w, h * 0.62);
    ctx.lineTo(w, h);
  } else {
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.55);
    ctx.lineTo(w * 0.18, h * 0.55);
    ctx.lineTo(w * 0.18, h * 0.4);
    ctx.lineTo(w * 0.36, h * 0.4);
    ctx.lineTo(w * 0.36, h * 0.62);
    ctx.lineTo(w * 0.55, h * 0.34);
    ctx.lineTo(w * 0.72, h * 0.34);
    ctx.lineTo(w * 0.72, h * 0.52);
    ctx.lineTo(w, h * 0.48);
    ctx.lineTo(w, h);
  }
  ctx.closePath();
  ctx.fill();

  // Scene Badge tag on corner so A -> B transitions read unmistakably
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(6, 6, 20, 13);
  ctx.fillStyle = variant === 'A' ? '#fbbf24' : '#22d3ee';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(variant, 16, 12.5);
  ctx.restore();
}

export const LiveDrawerPreviewMonitor: React.FC<LivePreviewContextProps> = React.memo((props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offARef = useRef<HTMLCanvasElement | null>(null);
  const offBRef = useRef<HTMLCanvasElement | null>(null);
  const imgARef = useRef<HTMLImageElement | null>(null);
  const imgBRef = useRef<HTMLImageElement | null>(null);
  const [replayNonce, setReplayNonce] = useState<number>(0);

  const latestRef = useRef(props);
  latestRef.current = props;

  // Load clip thumbnails cleanly if user has uploaded media
  useEffect(() => {
    if (props.primaryClipThumbUrl) {
      const img = new Image();
      img.src = props.primaryClipThumbUrl;
      imgARef.current = img;
    } else {
      imgARef.current = null;
    }
    if (props.secondaryClipThumbUrl) {
      const img = new Image();
      img.src = props.secondaryClipThumbUrl;
      imgBRef.current = img;
    } else {
      imgBRef.current = null;
    }
  }, [props.primaryClipThumbUrl, props.secondaryClipThumbUrl]);

  // Trigger clean replay cycle whenever active selection changes inside drawer
  useEffect(() => {
    setReplayNonce((n) => n + 1);
  }, [
    props.category.id,
    props.activeTransition?.id,
    props.activeEffect?.id,
    props.activeFilter.id,
    props.activeColorGrade?.id,
    props.activeMotionPreset?.id,
    props.activeCardPreset?.id,
    props.activeTemplate?.id,
    props.activeVfx?.id,
    props.activeSticker?.id,
    props.activeSplitLayout,
    props.activeSplitRatio,
    props.activeChromaBgMode,
  ]);

  useEffect(() => {
    let rafId = 0;
    const startTs = performance.now();

    const draw = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafId = window.requestAnimationFrame(draw);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafId = window.requestAnimationFrame(draw);
        return;
      }

      const st = latestRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const elapsed = (now - startTs) / 1000;

      if (!offARef.current) {
        offARef.current = document.createElement('canvas');
        offARef.current.width = w;
        offARef.current.height = h;
      }
      if (!offBRef.current) {
        offBRef.current = document.createElement('canvas');
        offBRef.current.width = w;
        offBRef.current.height = h;
      }
      const ctxA = offARef.current.getContext('2d');
      const ctxB = offBRef.current.getContext('2d');

      ctx.clearRect(0, 0, w, h);

      const baseFilterCss =
        !st.isMutedOrOff && st.activeFilter.id !== 'f_none' ? st.activeFilter.cssFilter : '';
      const gradeFilterCss =
        !st.isMutedOrOff && st.activeColorGrade ? getColorGradeCssFilter(st.activeColorGrade) : '';
      const activeFilterCss = [baseFilterCss, gradeFilterCss].filter(Boolean).join(' ') || 'none';

      // Category-specific live animated playback
      if (st.category.id === 'transitions') {
        const tr = st.activeTransition;
        const dur = Math.max(0.45, tr?.durationSec || 0.9);
        const cycleDur = dur + 1.1; // Hold A 0.55s -> Transition (dur) -> Hold B 0.55s
        const t = elapsed % cycleDur;
        let p = 0;
        if (t < 0.55) p = 0;
        else if (t < 0.55 + dur) p = (t - 0.55) / dur;
        else p = 1;
        const ease = p * p * (3 - 2 * p);

        if (ctxA && ctxB) {
          drawDemoScene(ctxA, w, h, 'A', imgARef.current, imgBRef.current, activeFilterCss);
          drawDemoScene(ctxB, w, h, 'B', imgARef.current, imgBRef.current, activeFilterCss);
          const effectType = tr?.effectType || 'dissolve';

          if (p <= 0.001) {
            ctx.drawImage(offARef.current, 0, 0);
          } else if (p >= 0.999) {
            ctx.drawImage(offBRef.current, 0, 0);
          } else if (effectType === 'slide') {
            const shift = -ease * w;
            ctx.drawImage(offARef.current, shift, 0);
            ctx.drawImage(offBRef.current, shift + w, 0);
          } else if (effectType === 'whip') {
            const shift = -ease * w;
            ctx.drawImage(offARef.current, shift, 0);
            ctx.drawImage(offBRef.current, shift + w, 0);
            ctx.fillStyle = `rgba(255,255,255,${0.25 * Math.sin(p * Math.PI)})`;
            ctx.fillRect(0, 0, w, h);
          } else if (effectType === 'zoom') {
            ctx.save();
            ctx.globalAlpha = 1 - ease;
            ctx.translate(w / 2, h / 2);
            ctx.scale(1 + ease * 0.45, 1 + ease * 0.45);
            ctx.drawImage(offARef.current, -w / 2, -h / 2);
            ctx.restore();
            ctx.save();
            ctx.globalAlpha = ease;
            ctx.translate(w / 2, h / 2);
            ctx.scale(1.35 - ease * 0.35, 1.35 - ease * 0.35);
            ctx.drawImage(offBRef.current, -w / 2, -h / 2);
            ctx.restore();
          } else if (effectType === 'flash') {
            ctx.drawImage(p < 0.5 ? offARef.current : offBRef.current, 0, 0);
            ctx.fillStyle = `rgba(255,255,255,${Math.sin(p * Math.PI) * 0.92})`;
            ctx.fillRect(0, 0, w, h);
          } else if (effectType === 'glitch') {
            ctx.drawImage(p < 0.5 ? offARef.current : offBRef.current, 0, 0);
            const sliceH = 6;
            for (let sy = 0; sy < h; sy += sliceH) {
              const dx = ((sy % 2 === 0 ? 1 : -1) * Math.sin(p * Math.PI) * 14);
              ctx.drawImage(
                (sy + Math.floor(p * 8)) % 2 === 0 ? offBRef.current : offARef.current,
                0,
                sy,
                w,
                sliceH,
                dx,
                sy,
                w,
                sliceH
              );
            }
          } else if (effectType === 'cube3d') {
            const wA = Math.max(0, (1 - ease) * w);
            const wB = Math.max(0, ease * w);
            if (wA > 1) ctx.drawImage(offARef.current, 0, 0, w, h, 0, 0, wA, h);
            if (wB > 1) ctx.drawImage(offBRef.current, 0, 0, w, h, wA, 0, wB, h);
          } else if (effectType === 'wipe') {
            ctx.drawImage(offARef.current, 0, 0);
            const rw = Math.round(ease * w);
            if (rw > 0) ctx.drawImage(offBRef.current, 0, 0, rw, h, 0, 0, rw, h);
          } else {
            ctx.globalAlpha = 1 - ease;
            ctx.drawImage(offARef.current, 0, 0);
            ctx.globalAlpha = ease;
            ctx.drawImage(offBRef.current, 0, 0);
            ctx.globalAlpha = 1;
          }
        }
      } else if (st.category.id === 'split') {
        if (ctxA && ctxB) {
          drawDemoScene(ctxA, w, h, 'A', imgARef.current, imgBRef.current, activeFilterCss);
          drawDemoScene(ctxB, w, h, 'B', imgARef.current, imgBRef.current, activeFilterCss);
          const ratio = Math.max(0.25, Math.min(0.75, (st.activeSplitRatio || 50) / 100));
          if (st.activeSplitLayout === 'top_bottom') {
            const ySplit = Math.round(h * ratio);
            ctx.drawImage(offARef.current, 0, 0, w, ySplit, 0, 0, w, ySplit);
            ctx.drawImage(offBRef.current, 0, ySplit, w, h - ySplit, 0, ySplit, w, h - ySplit);
            ctx.fillStyle = '#22d3ee';
            ctx.fillRect(0, ySplit - 1, w, 2);
          } else if (st.activeSplitLayout === 'pip_bottom_right') {
            ctx.drawImage(offARef.current, 0, 0);
            const pw = Math.round(w * 0.42);
            const ph = Math.round(h * 0.42);
            ctx.drawImage(offBRef.current, 0, 0, w, h, w - pw - 6, h - ph - 6, pw, ph);
            ctx.strokeStyle = '#22d3ee';
            ctx.strokeRect(w - pw - 6, h - ph - 6, pw, ph);
          } else {
            const xSplit = Math.round(w * ratio);
            ctx.drawImage(offARef.current, 0, 0, xSplit, h, 0, 0, xSplit, h);
            ctx.drawImage(offBRef.current, xSplit, 0, w - xSplit, h, xSplit, 0, w - xSplit, h);
            ctx.fillStyle = '#22d3ee';
            ctx.fillRect(xSplit - 1, 0, 2, h);
          }
        }
      } else if (st.category.id === 'audio' || st.category.id === 'music') {
        drawDemoScene(ctx, w, h, 'A', imgARef.current, imgBRef.current, 'brightness(65%)');
        const bars = 18;
        const barW = Math.floor((w - 16) / bars);
        const spd = (st.activeAudio.bpm || 110) / 30;
        const activeColor = st.category.id === 'music' ? '#14b8a6' : '#34d399';
        for (let i = 0; i < bars; i += 1) {
          const amp = 0.25 + 0.65 * Math.abs(Math.sin(elapsed * spd + i * 0.55));
          const bh = Math.round(h * 0.68 * amp);
          ctx.fillStyle = activeColor;
          ctx.fillRect(8 + i * barW, h - bh - 5, Math.max(2, barW - 2), bh);
        }
      } else {
        // Motion / Filters / Effects / Titles / Stickers / VFX / Cards / Chroma / Dialogues / Templates
        ctx.save();
        if (st.category.id === 'video' && st.activeMotionPreset) {
          const pulse = 0.5 + 0.5 * Math.sin(elapsed * 2.2 * st.activeMotionPreset.speed);
          const sc = 1 + (st.activeMotionPreset.zoomScale - 1) * pulse;
          ctx.translate(w / 2 + st.activeMotionPreset.panX * w * pulse, h / 2 + st.activeMotionPreset.panY * h * pulse);
          ctx.scale(sc, sc);
          ctx.translate(-w / 2, -h / 2);
        }
        drawDemoScene(ctx, w, h, 'A', imgARef.current, imgBRef.current, activeFilterCss);
        ctx.restore();

        if (st.category.id === 'chroma') {
          ctx.fillStyle =
            st.activeChromaBgMode === 'sunset_gold'
              ? 'rgba(245, 158, 11, 0.35)'
              : st.activeChromaBgMode === 'cyber_grid'
              ? 'rgba(217, 70, 239, 0.35)'
              : 'rgba(13, 148, 136, 0.35)';
          ctx.fillRect(0, 0, w, h);
          // Keyed foreground subject silhouette
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(w / 2, h * 0.38, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(w / 2 - 14, h * 0.52, 28, h * 0.48, 8);
          ctx.fill();
        }

        if (st.category.id === 'effects' && st.activeEffect && !st.isMutedOrOff) {
          const eff = st.activeEffect;
          const wave = 0.5 + 0.5 * Math.sin(elapsed * 4);
          ctx.save();
          if (eff.effectType === 'particles') {
            ctx.fillStyle = eff.accentColor;
            for (let i = 0; i < 14; i += 1) {
              const px = ((i * 29 + elapsed * 24) % w);
              const py = ((i * 19 + elapsed * 18) % h);
              ctx.beginPath();
              ctx.arc(px, py, 1.5 + (i % 2), 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (eff.effectType === 'neon') {
            ctx.strokeStyle = eff.accentColor;
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.55 + wave * 0.45;
            ctx.strokeRect(4, 4, w - 8, h - 8);
          } else if (eff.effectType === 'halftone' || eff.effectType === 'grain') {
            ctx.fillStyle = 'rgba(255,255,255,0.16)';
            for (let y = 0; y < h; y += 4) {
              ctx.fillRect(0, y, w, 1);
            }
          } else {
            ctx.globalCompositeOperation = 'screen';
            const gr = ctx.createRadialGradient(w * (0.2 + wave * 0.6), h * 0.35, 2, w * 0.5, h * 0.5, w * 0.65);
            gr.addColorStop(0, eff.accentColor);
            gr.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = 0.65;
            ctx.fillStyle = gr;
            ctx.fillRect(0, 0, w, h);
          }
          ctx.restore();
        }

        if (st.category.id === 'vfx' && st.activeVfx) {
          const p = (elapsed * 0.9) % 1;
          const x = st.activeVfx.hasMotionRoute ? w * (0.18 + 0.64 * p) : w * 0.5;
          const y = st.activeVfx.hasMotionRoute ? h * (0.62 - 0.24 * p) : h * 0.5;
          const r = 10 + Math.sin(p * Math.PI) * 16;
          const rg = ctx.createRadialGradient(x, y, 1, x, y, r);
          rg.addColorStop(0, '#ffffff');
          rg.addColorStop(0.45, st.activeVfx.primaryColor);
          rg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }

        if ((st.category.id === 'titles' || st.category.id === 'templates') && (st.activeTitle.title || st.activeTemplate)) {
          const txt = (st.activeTemplate?.movieTitle || st.activeTitle.title || 'CINESTUDIO').slice(0, 18);
          const sc = 0.88 + 0.12 * Math.sin(elapsed * 3);
          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.scale(sc, sc);
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(-w * 0.42, -12, w * 0.84, 24);
          ctx.fillStyle = '#fde68a';
          ctx.font = '900 10px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(txt, 0, 0);
          ctx.restore();
        }

        if (st.category.id === 'card' && st.activeCardPreset) {
          ctx.save();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.strokeRect(5, 5, w - 10, h - 10);
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(8, h - 22, w - 16, 15);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 8.5px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(st.activeCardPreset.title.slice(0, 18), w / 2, h - 12);
          ctx.restore();
        }

        if (st.category.id === 'dialogues' && st.activeDialogue) {
          ctx.fillStyle = 'rgba(8,12,18,0.82)';
          ctx.fillRect(6, h - 18, w - 12, 13);
          ctx.fillStyle = '#fde68a';
          ctx.font = 'bold 7.5px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${st.activeDialogue.speaker}: ${st.activeDialogue.text}`.slice(0, 24), w / 2, h - 9.5);
        }

        if (st.category.id === 'stickers' && st.activeSticker) {
          const bounce = Math.sin(elapsed * 4) * 3;
          ctx.font = '22px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(st.activeSticker.emoji, w / 2, h / 2 + bounce);
        }
      }

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(rafId);
  }, [replayNonce]);

  const activeHeadline = (() => {
    switch (props.category.id) {
      case 'transitions':
        return props.activeTransition
          ? `${props.activeTransition.name} (${props.activeTransition.durationSec}s)`
          : 'Tap any transition to preview A → B';
      case 'effects':
        return props.activeEffect ? props.activeEffect.name : 'Live Effect Preview';
      case 'filters':
        return props.activeColorGrade ? props.activeColorGrade.name : props.activeFilter.name;
      case 'audio':
      case 'music':
        return `${props.activeAudio.title} · ${props.activeAudio.duration}`;
      case 'video':
        return props.activeMotionPreset ? props.activeMotionPreset.name : 'Motion & Speed Stage';
      case 'titles':
        return props.activeTitle.title || 'Title Preview Stage';
      case 'templates':
        return props.activeTemplate?.title || 'Template Preview';
      case 'vfx':
        return props.activeVfx?.name || 'Action VFX Stage';
      case 'stickers':
        return props.activeSticker?.name || 'Sticker Stage';
      case 'card':
        return props.activeCardPreset?.name || 'Trailer Card Stage';
      case 'chroma':
        return `Chroma · ${props.activeChromaBgMode.replace('_', ' ')}`;
      case 'split':
        return `Split · ${props.activeSplitLayout.replace('_', ' ')} (${props.activeSplitRatio}%)`;
      case 'dialogues':
        return props.activeDialogue?.speaker || 'Dialogue Stage';
      default:
        return props.category.label;
    }
  })();

  return (
    <div className="px-1.5 py-1 border-b border-zinc-800/80 bg-[#0d121b] flex items-center gap-2 shrink-0">
      <div className="w-[84px] h-[47px] rounded-md overflow-hidden border border-zinc-700/80 bg-black shrink-0">
        <canvas ref={canvasRef} width={160} height={90} className="w-full h-full block" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[9.5px] font-bold text-zinc-100 truncate">{activeHeadline}</div>
        <div className="text-[8px] text-zinc-400 truncate">Live animated preview</div>
      </div>
      <button
        type="button"
        onClick={() => setReplayNonce((n) => n + 1)}
        className="w-7 h-7 rounded-md bg-[#161e2b] hover:bg-teal-400/20 border border-zinc-700/70 text-teal-300 flex items-center justify-center shrink-0 cursor-pointer"
        title="Replay preview animation"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

// =========================================================================
// INDIVIDUAL VISUAL THUMBNAILS FOR ALL PRESET CARDS (ZERO MISSING IMAGES)
// =========================================================================

export const MotionPresetThumb: React.FC<{ preset: MediaMotionPreset; thumbUrl?: string }> = ({
  preset,
  thumbUrl,
}) => (
  <div className="h-10 w-full rounded bg-gradient-to-br from-slate-900 via-teal-950 to-amber-900 relative overflow-hidden mb-1">
    {thumbUrl ? (
      <img
        src={thumbUrl}
        alt={preset.name}
        className="w-full h-full object-cover opacity-85"
        style={{
          transform: `scale(${preset.zoomScale}) translate(${preset.panX * 40}%, ${preset.panY * 40}%)`,
        }}
      />
    ) : (
      <div
        className="w-full h-full bg-gradient-to-tr from-[#0f172a] via-[#134e4a] to-[#b45309] flex items-center justify-center"
        style={{
          transform: `scale(${preset.zoomScale}) translate(${preset.panX * 30}%, ${preset.panY * 30}%)`,
        }}
      >
        <div className="w-8 h-5 border border-teal-300/70 rounded-sm" />
      </div>
    )}
    <span className="absolute bottom-0.5 right-1 px-1 rounded bg-black/80 text-[8px] font-mono text-teal-300 tabular-nums">
      {preset.speed}x{preset.aspectRatio ? ` · ${preset.aspectRatio}` : ''}
    </span>
  </div>
);

export const AudioArtworkThumb: React.FC<{ audio: AudioItem; isMusic: boolean; playing: boolean }> = ({
  audio,
  isMusic,
  playing,
}) => {
  const cat = audio.category.toLowerCase();
  const grad = cat.includes('cat') || cat.includes('animal')
    ? 'from-amber-500 to-orange-700'
    : cat.includes('bird')
    ? 'from-emerald-500 to-teal-800'
    : cat.includes('thunder') || cat.includes('rain')
    ? 'from-sky-600 to-slate-900'
    : cat.includes('cartoon') || cat.includes('meme')
    ? 'from-fuchsia-500 to-indigo-800'
    : isMusic
    ? 'from-teal-500 to-cyan-900'
    : 'from-emerald-500 to-slate-800';

  return (
    <div
      className={`w-8 h-8 rounded-md bg-gradient-to-br ${grad} flex items-end justify-center gap-[2px] p-1.5 shrink-0 border border-white/10`}
    >
      {[0.45, 0.9, 0.65, 0.8].map((hRatio, idx) => (
        <span
          key={idx}
          className={`w-[3px] rounded-full bg-white/90 ${playing ? 'animate-pulse' : ''}`}
          style={{ height: `${Math.round(hRatio * 100)}%` }}
        />
      ))}
    </div>
  );
};

export const TransitionVisualThumb: React.FC<{ transition: TransitionItem }> = ({ transition }) => {
  const t = transition.effectType;
  return (
    <div className="w-12 h-8 rounded overflow-hidden border border-zinc-700/80 relative shrink-0 bg-slate-900">
      <div className="absolute inset-0 flex">
        <div className="w-1/2 h-full bg-gradient-to-br from-amber-500 to-orange-800" />
        <div className="w-1/2 h-full bg-gradient-to-br from-cyan-500 to-indigo-900" />
      </div>
      {t === 'dissolve' && (
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/80 via-purple-400/50 to-cyan-500/80" />
      )}
      {t === 'flash' && (
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-3 bg-white/85 blur-[2px]" />
      )}
      {t === 'zoom' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-white/85" />
        </div>
      )}
      {t === 'glitch' && (
        <div className="absolute inset-0 flex flex-col justify-evenly">
          <div className="h-1 bg-rose-400/80 translate-x-1" />
          <div className="h-1 bg-cyan-300/80 -translate-x-1" />
        </div>
      )}
      {t === 'slide' && (
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white shadow" />
      )}
      {t === 'cube3d' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/55 to-transparent" />
      )}
      {t === 'wipe' && (
        <div
          className="absolute inset-0 bg-cyan-400/60"
          style={{ clipPath: 'polygon(42% 0, 100% 0, 100% 100%, 24% 100%)' }}
        />
      )}
      {t === 'whip' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
      )}
    </div>
  );
};

export const EffectVisualThumb: React.FC<{ effect: EffectItem; baseThumb: string }> = ({
  effect,
  baseThumb,
}) => (
  <div className="h-10 w-full rounded overflow-hidden relative mb-1 bg-black border border-zinc-800">
    <img src={baseThumb} alt={effect.name} className="w-full h-full object-cover opacity-80" />
    {effect.effectType === 'neon' && (
      <div
        className="absolute inset-1 rounded border-2 pointer-events-none"
        style={{ borderColor: effect.accentColor }}
      />
    )}
    {effect.effectType === 'particles' && (
      <div className="absolute inset-0 pointer-events-none">
        <span className="absolute top-2 left-3 w-1.5 h-1.5 rounded-full bg-amber-200" />
        <span className="absolute top-5 left-9 w-1 h-1 rounded-full bg-white" />
        <span className="absolute top-3 right-4 w-1.5 h-1.5 rounded-full bg-amber-300" />
      </div>
    )}
    {effect.effectType === 'halftone' && (
      <div
        className="absolute inset-0 opacity-45"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #000 0 2px, transparent 2px 4px)' }}
      />
    )}
    {effect.effectType !== 'neon' && effect.effectType !== 'particles' && effect.effectType !== 'halftone' && (
      <div
        className="absolute inset-0 opacity-45 mix-blend-screen"
        style={{
          background: `radial-gradient(circle at 28% 35%, ${effect.accentColor}, transparent 75%)`,
        }}
      />
    )}
  </div>
);

export const VfxVisualThumb: React.FC<{ vfx: CinemaVfxItem }> = ({ vfx }) => (
  <div
    className="w-9 h-9 rounded-md shrink-0 flex items-center justify-center relative overflow-hidden border border-white/10"
    style={{
      background: `radial-gradient(circle at 38% 38%, ${vfx.primaryColor}, ${vfx.secondaryColor} 70%, #090d14 100%)`,
    }}
  >
    <span className="text-sm leading-none drop-shadow">{vfx.emoji}</span>
  </div>
);

export const TitleVisualThumb: React.FC<{ title: TitleItem }> = ({ title }) => (
  <div className="h-9 w-full rounded bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#090d14] border border-zinc-800 flex flex-col items-center justify-center px-1.5 mb-1 overflow-hidden">
    <div className={`text-[9px] truncate w-full text-center leading-tight ${title.styleClass}`}>
      {title.titleText}
    </div>
    <div className="text-[7px] text-zinc-400 truncate w-full text-center">{title.subtitleText}</div>
  </div>
);

export const DialogueVisualThumb: React.FC<{ preset: DialoguePresetItem }> = ({ preset }) => (
  <div className="h-8 w-full rounded bg-gradient-to-r from-slate-900 to-zinc-900 border border-zinc-800 flex items-center px-1.5 gap-1.5 mb-1">
    <span className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-[8.5px] font-bold flex items-center justify-center shrink-0">
      {preset.speaker.slice(0, 2).toUpperCase()}
    </span>
    <div className="min-w-0 flex-1">
      <div className="h-1.5 w-3/4 rounded-full bg-amber-300/70 mb-1" />
      <div className="h-1 w-1/2 rounded-full bg-zinc-500/60" />
    </div>
  </div>
);

export const CardVisualThumb: React.FC<{ card: TrailerCardPresetItem }> = ({ card }) => {
  const borderClass =
    card.theme === 'action_flame'
      ? 'border-orange-500/70 from-orange-950 to-zinc-950'
      : card.theme === 'scifi_holo'
      ? 'border-cyan-400/70 from-cyan-950 to-slate-950'
      : card.theme === 'noir_mystery'
      ? 'border-zinc-400/60 from-zinc-800 to-black'
      : 'border-amber-400/75 from-amber-950 to-zinc-950';

  return (
    <div className={`h-9 w-full rounded bg-gradient-to-br ${borderClass} border flex flex-col items-center justify-center px-1.5 mb-1`}>
      <div className="text-[8.5px] font-black tracking-wider text-amber-200 truncate w-full text-center">
        {card.title}
      </div>
      <div className="text-[7px] text-zinc-400 truncate w-full text-center">{card.badgeText}</div>
    </div>
  );
};

export const ChromaVisualThumb: React.FC<{ chroma: ChromaPresetItem }> = ({ chroma }) => (
  <div className={`h-8 rounded mb-1 bg-gradient-to-r ${chroma.swatchClass} relative overflow-hidden flex items-center justify-center border border-white/10`}>
    <div className="w-3.5 h-3.5 rounded-full bg-zinc-950/85 border border-emerald-400/70" />
    <span
      className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
        chroma.colorPreset === 'blue' ? 'bg-blue-500' : chroma.colorPreset === 'cyan' ? 'bg-cyan-400' : 'bg-emerald-400'
      }`}
    />
  </div>
);

export const SplitVisualThumb: React.FC<{ preset: SplitLayoutPresetItem }> = ({ preset }) => (
  <div className="w-11 h-7 rounded border border-zinc-700 bg-black overflow-hidden shrink-0 flex relative">
    {preset.layout === 'top_bottom' ? (
      <div className="w-full h-full flex flex-col">
        <div className="bg-teal-500/70 w-full" style={{ height: `${preset.splitRatio}%` }} />
        <div className="bg-amber-500/70 w-full flex-1" />
      </div>
    ) : preset.layout === 'pip_bottom_right' ? (
      <div className="w-full h-full bg-teal-600/60 relative">
        <div className="absolute bottom-0.5 right-0.5 w-4 h-3 bg-amber-400 border border-white/80 rounded-[2px]" />
      </div>
    ) : preset.layout === 'diagonal' ? (
      <div className="w-full h-full bg-teal-600/70 relative">
        <div
          className="absolute inset-0 bg-amber-500/75"
          style={{ clipPath: 'polygon(60% 0, 100% 0, 100% 100%, 35% 100%)' }}
        />
      </div>
    ) : preset.layout === 'dual_cards' ? (
      <div className="w-full h-full bg-zinc-900 p-0.5 flex gap-0.5 items-center justify-center">
        <div className="flex-1 h-full rounded-[2px] bg-teal-500/75" />
        <div className="flex-1 h-full rounded-[2px] bg-amber-500/75" />
      </div>
    ) : preset.layout === 'mirror_twin' ? (
      <div className="w-full h-full flex">
        <div className="w-1/2 h-full bg-gradient-to-r from-teal-700 to-cyan-400" />
        <div className="w-1/2 h-full bg-gradient-to-l from-teal-700 to-cyan-400 border-l border-white/50" />
      </div>
    ) : (
      <>
        <div className="bg-teal-500/75 h-full" style={{ width: `${preset.splitRatio}%` }} />
        <div className="bg-amber-500/75 h-full flex-1" />
      </>
    )}
  </div>
);

export const StickerVisualThumb: React.FC<{ sticker: StickerItem }> = ({ sticker }) => (
  <div
    className="w-full h-10 rounded flex flex-col items-center justify-center relative overflow-hidden mb-1 border border-zinc-800"
    style={{
      backgroundColor: '#131924',
      backgroundImage:
        'linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.04) 75%), linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '8px 8px',
      backgroundPosition: '0 0, 4px 4px',
    }}
  >
    <span className="text-lg leading-none drop-shadow">{sticker.emoji}</span>
    {sticker.badgeText && (
      <span
        className={`mt-0.5 px-1 rounded text-[6.5px] font-extrabold uppercase tracking-wider text-white ${sticker.colorClass}`}
      >
        {sticker.badgeText}
      </span>
    )}
  </div>
);

export const TemplateVisualThumb: React.FC<{ template: TemplateItem }> = ({ template }) => (
  <div className="h-10 w-full rounded overflow-hidden relative mb-1 bg-black border border-zinc-800">
    <img src={template.thumbnail} alt={template.title} className="w-full h-full object-cover opacity-75" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-center pb-1 px-1">
      <span className="text-[8px] font-black tracking-wide text-amber-200 truncate">{template.movieTitle}</span>
    </div>
  </div>
);
