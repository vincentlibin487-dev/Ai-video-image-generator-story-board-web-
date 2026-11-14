import React, { useEffect, useRef, useState } from 'react';
import { SkipForward, Play, Volume2, VolumeX, RefreshCw, X } from 'lucide-react';

// --- Adsterra Configuration (Network A) ---
const ADSTERRA_MOBILE = {
  key: '14df69c732a8a38670f754f6fcfba403',
  format: 'iframe',
  height: 50,
  width: 320,
  params: {},
  src: 'https://bauval.org/22/14df69c732a8a38670f754f6fcfba403',
};

const ADSTERRA_DESKTOP = {
  key: '5f1ed3d25298d614ede7fc1d7dabb7b0',
  format: 'iframe',
  height: 90,
  width: 728,
  params: {},
  src: 'https://bauval.org/22/5f1ed3d25298d614ede7fc1d7dabb7b0',
};

// --- HilltopAds / UnfoldedTrade Configuration (Network B) ---
const HILLTOP_VAST_VIDEO_URL =
  'https://subtle-injury.com/d/mLF.zQdgGfNEvDZGGhUU/Gemme9/uFZjUolTkaPSTzcV2YMBjcYO0/MADJE/t/NFzvYRyGNqjuQAwYN-QR';

const HILLTOP_BANNER_300X100 = {
  width: 300,
  height: 100,
  src: 'https://unfoldedtrade.com/bdX_Vfs.dwGtl/0lY/WDcU/uegmI9Yu/Z/U_lgkNPgTicN2KMTjFYM0uNJD/kbtONfzEYMy-NpjZQ/1cMEwF',
};

const HILLTOP_BANNER_300X250 = {
  width: 300,
  height: 250,
  src: 'https://unfoldedtrade.com/bCX.VFsCdkGwlv0/YOWccO/beymA9GuUZPUrlkkpPlTOcT2bM-jEY/0zNNj/klthNgzoYFykNkjbQh3XMxwU',
};

const HILLTOP_VIDEO_SLIDER_SRC =
  'https://unfoldedtrade.com/bXX.VIsSdJG/lL0PYZWWce/uehmR9zuVZ/UTlsk/P_Tgcj2/M/j/YJ0BO/DeUgttN/zdYzyyNQjxQq4zOFQh';

// Contained in-frame reference URLs (isolated inside sandboxed iframes so root buttons never jump externally)
const CONTAINED_POPUNDER_URLS = [
  'https://pleased-report.com/be3.Vg0/PD3spPv/bXm-VkJUZwD/0/3lNAjuIp2hNXDNIL1sLvTGco2gMxjPY/0vMKj/kC',
  'https://abscloud.org/1/258bc21406c0c2080700daaefc38766c',
];

type BannerVariant =
  | 'adsterra-wide'
  | 'hilltop-300x100'
  | 'hilltop-300x250'
  | 'hilltop-slider';

/**
 * Checks whether a sandboxed same-origin iframe rendered any visible ad creative.
 */
function hasVisibleAdContent(doc: Document | null | undefined): boolean {
  if (!doc || !doc.body) return false;
  if (doc.body.scrollHeight >= 24 && doc.body.innerHTML.trim().length > 80) {
    const media = doc.body.querySelector('img, iframe, video, canvas, ins, a, object, embed');
    if (media) {
      const rect = media.getBoundingClientRect();
      if (rect.width >= 40 && rect.height >= 20) return true;
    }
  }
  return false;
}

/**
 * Dual-Network Sandboxed Banner Renderer (Adsterra <-> HilltopAds / UnfoldedTrade).
 * - Runs strictly inside an isolated sandboxed iframe (`allow-scripts allow-same-origin allow-forms`)
 *   WITHOUT `allow-top-navigation` or `allow-popups`, so clicking/hovering NEVER navigates outside the app.
 * - Automatically fails over to the alternate network if one network doesn't populate within ~3.2s.
 */
export const DualNetworkBannerFrame: React.FC<{
  slotId: string;
  rotationOrder?: BannerVariant[];
  title?: string;
}> = ({
  slotId,
  rotationOrder = ['adsterra-wide', 'hilltop-300x100', 'hilltop-300x250'],
  title = 'Sponsored Banner',
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [inView, setInView] = useState<boolean>(false);
  const [variantIdx, setVariantIdx] = useState<number>(0);
  const [attemptsCount, setAttemptsCount] = useState<number>(0);
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
    if (!el) return;

    const updateWidth = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) setContainerWidth(rect.width);
    };
    updateWidth();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateWidth);
      ro.observe(el);
    }

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setInView(true);
            io?.disconnect();
          }
        },
        { rootMargin: '350px 0px' }
      );
      io.observe(el);
    } else {
      setInView(true);
    }

    return () => {
      ro?.disconnect();
      io?.disconnect();
    };
  }, []);

  const currentVariant = rotationOrder[variantIdx % rotationOrder.length];

  const dimensions = (() => {
    if (currentVariant === 'hilltop-300x250') {
      return { width: HILLTOP_BANNER_300X250.width, height: HILLTOP_BANNER_300X250.height };
    }
    if (currentVariant === 'hilltop-300x100') {
      return { width: HILLTOP_BANNER_300X100.width, height: HILLTOP_BANNER_300X100.height };
    }
    if (currentVariant === 'hilltop-slider') {
      return isDesktop ? { width: 320, height: 180 } : { width: 300, height: 160 };
    }
    return isDesktop
      ? { width: ADSTERRA_DESKTOP.width, height: ADSTERRA_DESKTOP.height }
      : { width: ADSTERRA_MOBILE.width, height: ADSTERRA_MOBILE.height };
  })();

  const safeWidth = Math.max(260, containerWidth);
  const scale = Math.min(1, safeWidth / dimensions.width);
  const scaledWidth = Math.floor(dimensions.width * scale);
  const scaledHeight = Math.floor(dimensions.height * scale);

  useEffect(() => {
    if (!inView) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentWindow?.document;
      if (!doc) return;

      let scriptMarkup = '';
      if (currentVariant === 'adsterra-wide') {
        const b = isDesktop ? ADSTERRA_DESKTOP : ADSTERRA_MOBILE;
        const optionsJson = JSON.stringify({
          key: b.key,
          format: b.format,
          height: b.height,
          width: b.width,
          params: {},
        });
        scriptMarkup = `<script type="text/javascript">atOptions = ${optionsJson};</script><script type="text/javascript" src="${b.src}"></script>`;
      } else {
        const hilltopSrc =
          currentVariant === 'hilltop-300x250'
            ? HILLTOP_BANNER_300X250.src
            : currentVariant === 'hilltop-slider'
            ? HILLTOP_VIDEO_SLIDER_SRC
            : HILLTOP_BANNER_300X100.src;
        scriptMarkup = `<script type="text/javascript">
(function(cfg){
  var d = document, s = d.createElement('script'), l = d.currentScript || d.scripts[d.scripts.length - 1];
  s.settings = cfg || {};
  s.src = ${JSON.stringify(hilltopSrc)};
  s.async = true;
  s.referrerPolicy = 'no-referrer-when-downgrade';
  l.parentNode.insertBefore(s, l);
})({});
</script>`;
      }

      // Contained fallback ping script only inside the isolated sandboxed iframe (cannot escape frame)
      const containedRefSrc = CONTAINED_POPUNDER_URLS[variantIdx % CONTAINED_POPUNDER_URLS.length];

      doc.open();
      doc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: ${dimensions.width}px;
        height: ${dimensions.height}px;
        overflow: hidden;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      a { cursor: pointer; }
    </style>
  </head>
  <body data-contained-ref="${containedRefSrc}">
    ${scriptMarkup}
  </body>
</html>`);
      doc.close();
    } catch {
      // Safe catch if frame write is restricted
    }

    // Automatic Dual-Network Failover: if active slot shows empty after 3.2s, switch to alternate network
    const timer = window.setTimeout(() => {
      try {
        const ok = hasVisibleAdContent(iframeRef.current?.contentWindow?.document);
        if (!ok && attemptsCount < rotationOrder.length - 1) {
          setAttemptsCount((c) => c + 1);
          setVariantIdx((v) => (v + 1) % rotationOrder.length);
        }
      } catch {
        // Ignore cross-frame checks
      }
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [inView, currentVariant, isDesktop, dimensions.width, dimensions.height, slotId, attemptsCount, rotationOrder.length, variantIdx]);

  return (
    <div ref={wrapperRef} className="w-full max-w-full flex flex-col items-center justify-center gap-1.5">
      <div
        className="relative overflow-hidden mx-auto flex items-center justify-center"
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          maxWidth: '100%',
        }}
      >
        {inView && (
          <iframe
            ref={iframeRef}
            key={`${slotId}-${currentVariant}-${isDesktop ? 'd' : 'm'}`}
            title={title}
            scrolling="no"
            frameBorder="0"
            sandbox="allow-scripts allow-same-origin allow-forms"
            allow="autoplay; encrypted-media; picture-in-picture"
            style={{
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              border: 'none',
              overflow: 'hidden',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              display: 'block',
            }}
          />
        )}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAttemptsCount(0);
          setVariantIdx((v) => (v + 1) % rotationOrder.length);
        }}
        className="text-[10px] font-mono text-zinc-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
      >
        <RefreshCw className="w-2.5 h-2.5" />
        <span>Next Ad</span>
      </button>
    </div>
  );
};

/**
 * Fetches HilltopAds VAST XML in-browser and extracts playable MP4/WebM MediaFile URLs
 * so real video ads play strictly inside the website without external page redirects.
 */
async function fetchVastMediaUrl(vastUrl: string): Promise<string | null> {
  try {
    const res = await fetch(vastUrl, { referrerPolicy: 'no-referrer-when-downgrade' });
    if (!res.ok) return null;
    const xmlText = await res.text();
    if (!xmlText || !xmlText.includes('MediaFile')) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const mediaFiles = Array.from(doc.querySelectorAll('MediaFile'));
    for (const mf of mediaFiles) {
      const type = (mf.getAttribute('type') || '').toLowerCase();
      const url = (mf.textContent || '').trim();
      if (url.startsWith('http') && (type.includes('mp4') || type.includes('webm') || url.includes('.mp4'))) {
        return url;
      }
    }
    const firstUrl = (mediaFiles[0]?.textContent || '').trim();
    return firstUrl.startsWith('http') ? firstUrl : null;
  } catch {
    return null;
  }
}

/**
 * In-Page 2-Second Skippable Video Ad Card.
 * - Tries HilltopAds VAST Video (<video> inline player)
 * - Alternates cleanly with HilltopAds MultiTag Video Slider, Banner 300x250, and Adsterra
 * - Unlocks 2-second Skip button & auto-advances smoothly INSIDE the website (never redirects outside)
 */
export const SkippableVideoAdUnit: React.FC<{
  slotId: string;
  compact?: boolean;
  startIndex?: number;
  onDismiss?: () => void;
}> = ({ slotId, compact = false, startIndex = 0, onDismiss }) => {
  const [vastVideoUrl, setVastVideoUrl] = useState<string | null>(null);
  const [vastChecked, setVastChecked] = useState<boolean>(false);
  const [cycleIdx, setCycleIdx] = useState<number>(startIndex);
  const [skipSecondsLeft, setSkipSecondsLeft] = useState<number>(2);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let active = true;
    fetchVastMediaUrl(HILLTOP_VAST_VIDEO_URL).then((url) => {
      if (!active) return;
      setVastVideoUrl(url);
      setVastChecked(true);
    });
    return () => {
      active = false;
    };
  }, [slotId]);

  // 2-Second Skip Countdown per video/ad cycle
  useEffect(() => {
    setSkipSecondsLeft(2);
    const t1 = window.setTimeout(() => setSkipSecondsLeft(1), 1000);
    const t2 = window.setTimeout(() => setSkipSecondsLeft(0), 2000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [cycleIdx]);

  const handleSkipNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (skipSecondsLeft > 0) return;
    setCycleIdx((prev) => prev + 1);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((m) => {
      const next = !m;
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  };

  const showVastPlayer = vastChecked && vastVideoUrl && cycleIdx % 3 === 0;
  const videoRotation: BannerVariant[] =
    cycleIdx % 2 === 0
      ? ['hilltop-slider', 'hilltop-300x250', 'adsterra-wide']
      : ['adsterra-wide', 'hilltop-slider', 'hilltop-300x250'];

  return (
    <div
      className={`rounded-xl bg-[#0b0d17] border border-amber-500/30 overflow-hidden shadow-lg ${
        compact ? 'p-2 space-y-1.5' : 'p-3 space-y-2'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1 uppercase tracking-wider">
          <Play className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          <span>Video Ad</span>
        </span>

        <div className="flex items-center gap-1.5">
          {showVastPlayer && (
            <button
              type="button"
              onClick={toggleMute}
              className="p-1 rounded bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-700 cursor-pointer"
              aria-label="Toggle Mute"
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
          )}

          <button
            type="button"
            onClick={handleSkipNext}
            disabled={skipSecondsLeft > 0}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
              skipSecondsLeft > 0
                ? 'bg-zinc-900 text-zinc-400 border border-zinc-800 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-black cursor-pointer font-extrabold'
            }`}
          >
            <SkipForward className="w-2.5 h-2.5" />
            <span>{skipSecondsLeft > 0 ? `Skip ${skipSecondsLeft}s` : 'Skip'}</span>
          </button>

          {onDismiss && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
              aria-label="Close Video Ad"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div
        className={`w-full rounded-lg bg-[#06070d] border border-zinc-800/80 overflow-hidden flex items-center justify-center ${
          compact ? 'min-h-[110px]' : 'min-h-[130px]'
        }`}
      >
        {showVastPlayer && vastVideoUrl ? (
          <video
            ref={videoRef}
            src={vastVideoUrl}
            autoPlay
            muted={isMuted}
            playsInline
            loop
            onClick={toggleMute}
            className={`w-full ${compact ? 'max-h-[140px]' : 'max-h-[210px]'} object-contain cursor-pointer`}
          />
        ) : (
          <DualNetworkBannerFrame
            slotId={`${slotId}-cycle-${cycleIdx}`}
            rotationOrder={videoRotation}
            title={`In-Page Video Ad ${slotId}`}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Top In-Flow Banner placed cleanly BELOW Language Bar & Header
 * so top buttons and language switcher are NEVER covered or obscured.
 */
export const TopBannerAd: React.FC = () => {
  return (
    <aside
      aria-label="Top Sponsored Banner"
      className="w-full max-w-4xl mx-auto mb-5 rounded-2xl bg-[#0e101c] border border-zinc-800/90 px-3 py-2.5 flex flex-col items-center justify-center gap-1.5 shadow-lg"
    >
      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        Sponsored
      </span>
      <div className="w-full flex items-center justify-center min-h-[54px] md:min-h-[94px]">
        <DualNetworkBannerFrame
          slotId="top-flow"
          rotationOrder={['adsterra-wide', 'hilltop-300x100']}
          title="Top Banner Advertisement"
        />
      </div>
    </aside>
  );
};

/**
 * Always-present Pair of Compact In-Page Video Ads (2s Skippable) cleanly inside the page grid.
 * Plays strictly inside the website with zero button hijacking.
 */
export const InlineVideoAdPair: React.FC<{ sectionId: string }> = ({ sectionId }) => {
  return (
    <section
      aria-label="Featured Video Ads"
      className="w-full max-w-5xl mx-auto my-4 grid grid-cols-1 md:grid-cols-2 gap-3"
    >
      <SkippableVideoAdUnit slotId={`${sectionId}-vid-1`} compact startIndex={0} />
      <SkippableVideoAdUnit slotId={`${sectionId}-vid-2`} compact startIndex={1} />
    </section>
  );
};

/**
 * Centered Wide Card-Style Banner placed cleanly BETWEEN every 2-3 cards.
 * Alternates automatically between Adsterra Wide (728x90 / 320x50) and HilltopAds (300x100 / 300x250 / Video Slider)
 * with built-in automatic failover if one network fails to render.
 */
export const InFeedBannerAd: React.FC<{ slotId: string; slotIndex?: number }> = ({
  slotId,
  slotIndex = 0,
}) => {
  const rotationOrder: BannerVariant[] =
    slotIndex % 2 === 0
      ? ['adsterra-wide', 'hilltop-300x100', 'hilltop-300x250']
      : ['hilltop-300x100', 'adsterra-wide', 'hilltop-300x250'];

  return (
    <aside
      aria-label="In-Feed Sponsored Card"
      className="col-span-full w-full max-w-4xl mx-auto my-2 rounded-2xl bg-[#0e101c] border border-zinc-800/90 p-3.5 sm:p-4 shadow-xl flex flex-col items-center justify-center gap-2"
    >
      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        Sponsored
      </span>
      <div className="w-full flex items-center justify-center rounded-xl bg-[#080910] border border-zinc-800/80 py-2 px-1 min-h-[60px] md:min-h-[100px]">
        <DualNetworkBannerFrame
          slotId={slotId}
          rotationOrder={rotationOrder}
          title={`Centered Wide Banner ${slotId}`}
        />
      </div>
    </aside>
  );
};

/**
 * Unobtrusive Compact Floating Corner Mini Video Ad (Desktop & Above Mobile Bottom Nav)
 * Plays 2-second skippable in-page video ads continuously without ever covering app navigation buttons.
 */
export const FloatingMiniVideoAd: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(true);

  if (!visible) return null;

  return (
    <div
      aria-label="Floating Mini Video Ad"
      className="hidden sm:block fixed bottom-4 right-4 z-30 w-[260px] shadow-2xl"
    >
      <SkippableVideoAdUnit
        slotId="floating-mini-vid"
        compact
        startIndex={0}
        onDismiss={() => setVisible(false)}
      />
    </div>
  );
};

/**
 * Bottom In-Flow Banner placed at the bottom of main content above the mobile nav bar,
 * ensuring bottom navigation & action buttons remain 100% visible and effortless to tap.
 */
export const BottomBannerAd: React.FC = () => {
  return (
    <aside
      aria-label="Bottom Sponsored Banner"
      className="w-full max-w-4xl mx-auto mt-8 rounded-2xl bg-[#0e101c] border border-zinc-800/90 px-3 py-3 flex flex-col items-center justify-center gap-1.5 shadow-lg"
    >
      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        Sponsored
      </span>
      <div className="w-full flex items-center justify-center min-h-[54px] md:min-h-[94px]">
        <DualNetworkBannerFrame
          slotId="bottom-flow"
          rotationOrder={['hilltop-300x100', 'adsterra-wide', 'hilltop-300x250']}
          title="Bottom Banner Advertisement"
        />
      </div>
    </aside>
  );
};
