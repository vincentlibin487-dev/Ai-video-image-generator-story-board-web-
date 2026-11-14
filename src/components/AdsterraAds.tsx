import React, { useEffect, useRef, useState } from 'react';
import { VolumeX, SkipForward, ShieldCheck, Play } from 'lucide-react';

const POPUNDER_SRC = 'https://abscloud.org/1/258bc21406c0c2080700daaefc38766c';

const MOBILE_BANNER = {
  key: '14df69c732a8a38670f754f6fcfba403',
  format: 'iframe',
  height: 50,
  width: 320,
  params: { safe: true, adult: false },
  src: 'https://bauval.org/22/14df69c732a8a38670f754f6fcfba403',
};

const DESKTOP_BANNER = {
  key: '5f1ed3d25298d614ede7fc1d7dabb7b0',
  format: 'iframe',
  height: 90,
  width: 728,
  params: { safe: true, adult: false },
  src: 'https://bauval.org/22/5f1ed3d25298d614ede7fc1d7dabb7b0',
};

/**
 * Fires Adsterra Popunder dynamically (strictly throttled so it doesn't fire on every click).
 */
export function triggerAdsterraPopunder(): void {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById('adsterra-popunder-script');
  if (existing) {
    existing.remove();
  }

  const script = document.createElement('script');
  script.id = 'adsterra-popunder-script';
  script.setAttribute('data-cfasync', 'false');
  script.src = POPUNDER_SRC;
  script.async = true;
  document.body.appendChild(script);
}

/**
 * Builds an isolated HTML document for each Adsterra banner slot so multiple
 * slots (Top, Bottom, Wide In-Feed, Interstitial) never overwrite each other's
 * global `window.atOptions`, and prevents overflow outside mobile viewports.
 */
function buildBannerSrcDoc(banner: typeof MOBILE_BANNER): string {
  const optionsJson = JSON.stringify({
    key: banner.key,
    format: banner.format,
    height: banner.height,
    width: banner.width,
    params: banner.params,
  });

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        width: ${banner.width}px;
        height: ${banner.height}px;
        overflow: hidden;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      iframe, ins, div {
        max-width: ${banner.width}px !important;
        max-height: ${banner.height}px !important;
      }
    </style>
  </head>
  <body>
    <script type="text/javascript">
      var atOptions = ${optionsJson};
    </script>
    <script type="text/javascript" src="${banner.src}"></script>
  </body>
</html>`;
}

/**
 * Responsive, isolated, zero-overflow Adsterra banner container.
 * Uses ResizeObserver + proportional CSS scaling so banners ALWAYS stay inside
 * mobile & desktop screen bounds without ever clipping horizontally.
 */
export const AdsterraSlotFrame: React.FC<{
  mode?: 'responsive' | 'wide-prefer-desktop' | 'mobile-compact';
  title?: string;
}> = ({ mode = 'responsive', title = 'Sponsored Banner' }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 360
  );
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const updateWidth = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) setContainerWidth(rect.width);
    };
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const banner =
    mode === 'mobile-compact'
      ? MOBILE_BANNER
      : mode === 'wide-prefer-desktop'
      ? containerWidth >= 460
        ? DESKTOP_BANNER
        : MOBILE_BANNER
      : isDesktop
      ? DESKTOP_BANNER
      : MOBILE_BANNER;

  // Strictly scale down if viewport / card width is narrower than banner width
  const safeWidth = Math.max(240, containerWidth);
  const scale = Math.min(1, safeWidth / banner.width);
  const scaledWidth = Math.floor(banner.width * scale);
  const scaledHeight = Math.max(40, Math.floor(banner.height * scale));
  const srcDoc = buildBannerSrcDoc(banner);

  return (
    <div
      ref={wrapperRef}
      className="w-full max-w-full overflow-hidden flex items-center justify-center"
    >
      <div
        className="relative overflow-hidden mx-auto"
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          maxWidth: '100%',
        }}
      >
        <iframe
          key={`${banner.key}-${mode}`}
          title={title}
          srcDoc={srcDoc}
          scrolling="no"
          frameBorder="0"
          style={{
            width: `${banner.width}px`,
            height: `${banner.height}px`,
            border: 'none',
            overflow: 'hidden',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
};

/**
 * Clean SFW Canvas Motion Loop (2-second cycle continuous motion showcase).
 * Replaces broken external video URLs or adult-prone streams with a crisp,
 * hardware-accelerated continuous 2-second loop inside screen bounds.
 */
const SafeLoopingMotionCanvas: React.FC<{
  compact?: boolean;
  progressPct?: number;
}> = ({ compact = false, progressPct }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const start = performance.now();

    const renderFrame = (now: number) => {
      const elapsed = ((now - start) % 2000) / 2000; // Clean 2-second cycle
      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0f1324');
      grad.addColorStop(0.5, '#1b162d');
      grad.addColorStop(1, '#0b0e18');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle golden cinematic sweep every 2s
      const sweepX = -w * 0.3 + elapsed * (w * 1.6);
      const glow = ctx.createRadialGradient(sweepX, h * 0.5, 6, sweepX, h * 0.5, w * 0.45);
      glow.addColorStop(0, 'rgba(245, 158, 11, 0.38)');
      glow.addColorStop(0.6, 'rgba(245, 158, 11, 0.1)');
      glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Animated audio/video timeline bars inside frame
      const barCount = compact ? 14 : 24;
      const barGap = w / (barCount + 2);
      for (let i = 0; i < barCount; i++) {
        const wave = Math.sin(elapsed * Math.PI * 2 + i * 0.55) * 0.5 + 0.5;
        const barH = (compact ? 10 : 18) + wave * (h * 0.38);
        ctx.fillStyle = `rgba(251, 191, 36, ${0.22 + wave * 0.48})`;
        const x = barGap * (i + 1);
        const y = h * 0.5 - barH * 0.5;
        ctx.fillRect(x, y, Math.max(2, barGap * 0.48), barH);
      }

      // Film border ticks
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, w - 2, h - 2);

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [compact]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg bg-[#0b0e18]">
      <canvas
        ref={canvasRef}
        width={compact ? 160 : 320}
        height={compact ? 54 : 96}
        className="w-full h-full block object-cover"
      />
      {typeof progressPct === 'number' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
          <div
            className="h-full bg-amber-400 transition-all duration-100"
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Persistent Sticky TOP Banner across all screens (Zero mobile overflow).
 * 320x50 scaled cleanly on mobile, 728x90 scaled cleanly on desktop.
 */
export const StickyTopAd: React.FC = () => {
  return (
    <aside
      aria-label="Top Advertisement Banner"
      className="fixed top-0 left-0 right-0 w-full max-w-full overflow-hidden z-[9990] h-[54px] md:h-[94px] bg-[#07080d]/95 border-b border-zinc-800/80 backdrop-blur-md flex items-center justify-center px-1 shadow-[0_4px_20px_rgba(0,0,0,0.65)]"
    >
      <AdsterraSlotFrame mode="responsive" title="Top Adsterra Banner" />
    </aside>
  );
};

/**
 * Persistent Sticky BOTTOM Banner across all screens (Zero mobile overflow).
 * 320x50 scaled cleanly on mobile, 728x90 scaled cleanly on desktop.
 */
export const StickyBottomAd: React.FC = () => {
  return (
    <aside
      aria-label="Bottom Advertisement Banner"
      className="fixed bottom-0 left-0 right-0 w-full max-w-full overflow-hidden z-[9990] h-[54px] md:h-[94px] bg-[#07080d]/95 border-t border-zinc-800/80 backdrop-blur-md flex items-center justify-center px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.65)]"
    >
      <AdsterraSlotFrame mode="responsive" title="Bottom Adsterra Banner" />
    </aside>
  );
};

/**
 * Wide Full-Width Center Ad & Continuous 2s Motion Video Strip
 * Placed cleanly between every 2-3 cards on Pages 2 & 3 (and bottom of Page 1).
 * Guaranteed 100% inside mobile & desktop screens with zero horizontal spill.
 */
export const InFeedWideVideoAd: React.FC<{ slotId: string }> = ({ slotId }) => {
  return (
    <section
      aria-label="Featured Wide Sponsor"
      className="col-span-full w-full max-w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#0e111d] via-[#131729] to-[#0e111d] border border-amber-500/30 p-3 sm:p-4 shadow-xl space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
        <span className="flex items-center gap-1.5 text-amber-400 font-bold">
          <Play className="w-3 h-3 fill-amber-400 text-amber-400" />
          SPONSORED SPOTLIGHT • 2s LOOP
        </span>
        <span className="flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-3 h-3" />
          SAFE AD
        </span>
      </div>

      {/* Side-by-side on desktop, neatly stacked inside viewport on mobile */}
      <div className="flex flex-col md:flex-row items-center gap-3 w-full max-w-full overflow-hidden">
        <div className="w-full md:w-44 h-[52px] md:h-[90px] shrink-0 rounded-xl overflow-hidden border border-amber-500/20 relative">
          <SafeLoopingMotionCanvas compact />
          <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none">
            <span className="text-[10px] font-mono font-bold text-amber-300 bg-black/60 px-1.5 py-0.5 rounded">
              LIVE REEL
            </span>
            <VolumeX className="w-3.5 h-3.5 text-zinc-300 bg-black/50 p-0.5 rounded" />
          </div>
        </div>

        <div className="flex-1 w-full max-w-full overflow-hidden flex items-center justify-center bg-[#080910] rounded-xl p-1.5 border border-zinc-800/80 min-h-[58px] md:min-h-[94px]">
          <AdsterraSlotFrame mode="wide-prefer-desktop" title={`Wide In-Feed Ad ${slotId}`} />
        </div>
      </div>
    </section>
  );
};

/**
 * Auto-cutting 2-Second Video Ad Overlay triggered strictly every 2-3 actions.
 * - Contained 100% within mobile/desktop screens (`max-w-[calc(100vw-24px)]`)
 * - Shows a 2-second countdown + Skip button
 * - Automatically skips & resumes action after 2.2 seconds
 */
export const InterstitialVideoAdModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [msLeft, setMsLeft] = useState<number>(2200);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setMsLeft(2200);
    const start = performance.now();

    const interval = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, 2200 - elapsed);
      setMsLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
        onCloseRef.current();
      }
    }, 80);

    return () => window.clearInterval(interval);
  }, [open]);

  if (!open) return null;

  const secondsLeft = Math.ceil(msLeft / 1000);
  const progressPct = ((2200 - msLeft) / 2200) * 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sponsored Video Break"
      className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 overflow-hidden"
    >
      <div className="w-full max-w-[440px] max-h-[calc(100dvh-24px)] bg-[#101320] border border-amber-500/40 rounded-2xl p-4 shadow-2xl space-y-3 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            SPONSOR BREAK • {secondsLeft}s AUTO-SKIP
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold cursor-pointer transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Skip ({secondsLeft}s)</span>
          </button>
        </div>

        <div className="w-full h-24 rounded-xl overflow-hidden border border-zinc-800">
          <SafeLoopingMotionCanvas progressPct={progressPct} />
        </div>

        <div className="w-full max-w-full overflow-hidden rounded-xl bg-[#07080f] p-1.5 border border-zinc-800/80 flex items-center justify-center">
          <AdsterraSlotFrame mode="wide-prefer-desktop" title="Auto-Skip Video Ad Banner" />
        </div>
      </div>
    </div>
  );
};
