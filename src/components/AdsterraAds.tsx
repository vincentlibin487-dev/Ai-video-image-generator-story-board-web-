import React, { useEffect, useRef, useState } from 'react';
import { SkipForward, Volume2, VolumeX, X } from 'lucide-react';

// =========================================================================
// OFFICIAL LIVE AD NETWORKS (Network 1: Adsterra | Network 2: HilltopAds)
// Strict Non-Adult / Family-Safe (SFW) Guard Enabled
// =========================================================================

export const ADSTERRA_CONFIG = {
  desktop728x90: {
    key: '5f1ed3d25298d614ede7fc1d7dabb7b0',
    width: 728,
    height: 90,
    invokeUrl: 'https://www.highperformanceformat.com/5f1ed3d25298d614ede7fc1d7dabb7b0/invoke.js',
  },
  mobile320x50: {
    key: '14df69c732a8a38670f754f6fcfba403',
    width: 320,
    height: 50,
    invokeUrl: 'https://www.highperformanceformat.com/14df69c732a8a38670f754f6fcfba403/invoke.js',
  },
};

export const HILLTOP_CONFIG = {
  banner300x100: {
    width: 300,
    height: 100,
    src: 'https://unfoldedtrade.com/bdX_Vfs.dwGtl/0lY/WDcU/uegmI9Yu/Z/U_lgkNPgTicN2KMTjFYM0uNJD/kbtONfzEYMy-NpjZQ/1cMEwF',
  },
  banner300x250: {
    width: 300,
    height: 250,
    src: 'https://unfoldedtrade.com/bCX.VFsCdkGwlv0/YOWccO/beymA9GuUZPUrlkkpPlTOcT2bM-jEY/0zNNj/klthNgzoYFykNkjbQh3XMxwU',
  },
  vastVideoFeedUrl:
    'https://subtle-injury.com/d/mLF.zQdgGfNEvDZGGhUU/Gemme9/uFZjUolTkaPSTzcV2YMBjcYO0/MADJE/t/NFzvYRyGNqjuQAwYN-QR',
};

const CLIENT_ADULT_NSFW_REGEX =
  /\b(porn|porno|pornography|xxx|nsfw|adult|erotic|erotica|hentai|nude|nudity|naked|sex|sexy|horny|milf|boob|boobs|tits|titty|pussy|cock|dick|fuck|fucking|babe|babes|camgirl|camgirls|livecam|webcam|stripchat|chaturbate|bongacams|livejasmin|myfreecams|camsoda|flirt4free|onlyfans|fansly|xvideos|xhamster|pornhub|redtube|youporn|xnxx|spankbang|brazzers|bangbros|realitykings|fetish|bdsm|escort|escorts|hookup|hookups|sexdating|adultdating|jerkmate|adultfriendfinder|ashleymadison|benaughty|nutaku|fakku|exoclick|trafficjunky|juicyads|plugrush|18\+|18plus|plus18|hot-singles|local-girls|meet-girls|sugar-daddy|lingerie|hardcore|softcore|playboy|penthouse|hustler|ecchi|viagra|cialis|penis|rta-5042)\b/i;

export function containsAdultAdSignals(...values: Array<string | undefined | null>): boolean {
  const combined = values.filter(Boolean).join(' ');
  if (!combined) return false;
  return CLIENT_ADULT_NSFW_REGEX.test(combined);
}

interface VastAdData {
  videoUrl: string;
  allVideoUrls: string[];
  clickThrough: string;
  impressions: string[];
  loaded: boolean;
}

let cachedVastData: VastAdData | null = null;
let vastFetchPromise: Promise<VastAdData> | null = null;

async function fetchLiveVastData(): Promise<VastAdData> {
  if (cachedVastData) return cachedVastData;
  if (vastFetchPromise) return vastFetchPromise;

  vastFetchPromise = (async () => {
    try {
      const res = await fetch('/api/vast-ad');
      if (res.ok) {
        const data = await res.json();
        const rawUrls: string[] = Array.isArray(data?.allVideoUrls) ? data.allVideoUrls : [];
        const safeUrls = rawUrls.filter((u) => Boolean(u) && !containsAdultAdSignals(u));
        const safeClick =
          data?.clickThrough && !containsAdultAdSignals(data.clickThrough) ? data.clickThrough : '';

        cachedVastData = {
          videoUrl: safeUrls[0] || '',
          allVideoUrls: safeUrls,
          clickThrough: safeClick,
          impressions: Array.isArray(data?.impressions) ? data.impressions : [],
          loaded: true,
        };
        return cachedVastData;
      }
    } catch {}

    cachedVastData = {
      videoUrl: '',
      allVideoUrls: [],
      clickThrough: '',
      impressions: [],
      loaded: true,
    };
    return cachedVastData;
  })();

  return vastFetchPromise;
}

function hasRenderedCreative(doc: Document | null | undefined): boolean {
  if (!doc || !doc.body) return false;
  const media = doc.body.querySelector('img, iframe, video, canvas, ins, a, object, embed');
  if (!media) return false;
  const rect = media.getBoundingClientRect();
  return rect.width >= 40 && rect.height >= 20;
}

function documentHasAdultCreative(doc: Document | null | undefined): boolean {
  if (!doc || !doc.body) return false;
  try {
    const signals: Array<string | null | undefined> = [doc.title, doc.body.innerText];

    doc.body.querySelectorAll('a, img, iframe, video, source, script').forEach((el) => {
      signals.push(
        el.getAttribute('href'),
        el.getAttribute('src'),
        el.getAttribute('alt'),
        el.getAttribute('title'),
        el.getAttribute('aria-label'),
        el.getAttribute('data-url'),
        el.getAttribute('data-href')
      );
    });

    return containsAdultAdSignals(...signals);
  } catch {
    return false;
  }
}

/**
 * Pure Frameless Dual-Network Banner Renderer (Adsterra <-> HilltopAds).
 * - ZERO outer boxes, borders, backgrounds, or ad-network/sponsored text labels.
 * - Strict SFW guard scans injected DOM links/images/text and wipes/hides any adult creative immediately.
 */
export const DualNetworkBannerFrame: React.FC<{
  slotId: string;
  slotIndex?: number;
  preferFormat?: 'banner' | 'square' | 'wide';
  title?: string;
}> = ({ slotId, slotIndex = 0, preferFormat = 'banner', title = 'Advertisement' }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [inView, setInView] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  const [containerWidth, setContainerWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 360
  );
  const [activeNetwork, setActiveNetwork] = useState<'adsterra' | 'hilltop'>(
    slotIndex % 2 === 0 ? 'hilltop' : 'adsterra'
  );
  const [failoverAttempts, setFailoverAttempts] = useState<number>(0);
  const [blockedAsAdult, setBlockedAsAdult] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateSize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
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
        { rootMargin: '500px 0px' }
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

  // Rotate between Adsterra and HilltopAds periodically
  useEffect(() => {
    if (blockedAsAdult) return;
    const timer = window.setInterval(() => {
      setActiveNetwork((prev) => (prev === 'adsterra' ? 'hilltop' : 'adsterra'));
    }, 25000);
    return () => window.clearInterval(timer);
  }, [blockedAsAdult]);

  const adDetails = (() => {
    if (activeNetwork === 'adsterra') {
      const cfg = isDesktop ? ADSTERRA_CONFIG.desktop728x90 : ADSTERRA_CONFIG.mobile320x50;
      const scriptHtml = `<script type="text/javascript">
        atOptions = {
          'key': '${cfg.key}',
          'format': 'iframe',
          'height': ${cfg.height},
          'width': ${cfg.width},
          'params': {}
        };
      </script>
      <script type="text/javascript" src="${cfg.invokeUrl}"></script>`;
      return { width: cfg.width, height: cfg.height, scriptHtml };
    }

    const is300x250 = preferFormat === 'square' || (!isDesktop && preferFormat !== 'wide');
    const cfg = is300x250 ? HILLTOP_CONFIG.banner300x250 : HILLTOP_CONFIG.banner300x100;
    const scriptHtml = `<script>
      (function(cfg){
        var d = document,
            s = d.createElement('script'),
            l = d.currentScript || d.scripts[d.scripts.length - 1];
        s.settings = cfg || {};
        s.src = "${cfg.src}";
        s.async = true;
        s.referrerPolicy = 'no-referrer-when-downgrade';
        if (l && l.parentNode) {
          l.parentNode.insertBefore(s, l);
        } else {
          d.body.appendChild(s);
        }
      })({});
    </script>`;
    return { width: cfg.width, height: cfg.height, scriptHtml };
  })();

  const safeWidth = Math.max(260, containerWidth);
  const scale = Math.min(1, safeWidth / adDetails.width);
  const scaledWidth = Math.floor(adDetails.width * scale);
  const scaledHeight = Math.floor(adDetails.height * scale);

  useEffect(() => {
    if (!inView || blockedAsAdult) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    let observer: MutationObserver | null = null;

    const inspectAndProtect = () => {
      try {
        const doc = iframeRef.current?.contentWindow?.document;
        if (documentHasAdultCreative(doc)) {
          if (doc?.body) doc.body.innerHTML = '';
          if (failoverAttempts < 1) {
            setFailoverAttempts((c) => c + 1);
            setActiveNetwork((prev) => (prev === 'adsterra' ? 'hilltop' : 'adsterra'));
          } else {
            setBlockedAsAdult(true);
          }
          return true;
        }
      } catch {}
      return false;
    };

    try {
      const doc = iframe.contentWindow?.document;
      if (!doc) return;
      const baseHref = typeof window !== 'undefined' ? window.location.origin : '';
      doc.open();
      doc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="rating" content="General" />
    ${baseHref ? `<base href="${baseHref}/" />` : ''}
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: ${adDetails.width}px;
        height: ${adDetails.height}px;
        overflow: hidden;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      a { cursor: pointer; }
    </style>
  </head>
  <body>
    ${adDetails.scriptHtml}
  </body>
</html>`);
      doc.close();

      if (doc.body && typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(() => {
          inspectAndProtect();
        });
        observer.observe(doc.body, {
          childList: true,
          subtree: true,
          attributes: true,
        });
      }
    } catch {}

    const checkTimes = [800, 1800, 3500, 6500];
    const timers = checkTimes.map((ms) =>
      window.setTimeout(() => {
        if (inspectAndProtect()) return;
        if (ms === 3500) {
          try {
            const filled = hasRenderedCreative(iframeRef.current?.contentWindow?.document);
            if (!filled && failoverAttempts < 1) {
              setFailoverAttempts((c) => c + 1);
              setActiveNetwork((prev) => (prev === 'adsterra' ? 'hilltop' : 'adsterra'));
            }
          } catch {}
        }
      }, ms)
    );

    return () => {
      observer?.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [
    inView,
    blockedAsAdult,
    activeNetwork,
    adDetails.width,
    adDetails.height,
    adDetails.scriptHtml,
    slotId,
    failoverAttempts,
  ]);

  if (blockedAsAdult) return null;

  return (
    <div ref={wrapperRef} className="w-full max-w-full flex items-center justify-center">
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
            key={`${slotId}-${activeNetwork}-${adDetails.width}x${adDetails.height}`}
            title={title}
            scrolling="no"
            frameBorder="0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            allow="autoplay; encrypted-media"
            style={{
              width: `${adDetails.width}px`,
              height: `${adDetails.height}px`,
              border: 'none',
              overflow: 'hidden',
              background: 'transparent',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              display: 'block',
            }}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Pure Frameless Video Ad Unit (Real SFW-Filtered VAST Commercial Video Only).
 * - Waits for server-side Non-Adult (SFW) VAST validation before rendering any stream.
 * - Hides cleanly if no verified SFW video stream is available.
 * - Tapping on or near the video NEVER hijacks navigation to another website.
 */
export const SkippableVideoAdUnit: React.FC<{
  slotId: string;
  compact?: boolean;
  mini?: boolean;
  fillParent?: boolean;
  startIndex?: number;
  onDismiss?: () => void;
}> = ({ compact = false, mini = false, fillParent = false, startIndex = 0, onDismiss }) => {
  const [adData, setAdData] = useState<VastAdData>({
    videoUrl: '',
    allVideoUrls: [],
    clickThrough: '',
    impressions: [],
    loaded: false,
  });
  const [videoIndex, setVideoIndex] = useState<number>(startIndex);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [skipSecondsLeft, setSkipSecondsLeft] = useState<number>(2);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchLiveVastData().then((data) => {
      if (isMounted) {
        setAdData(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setSkipSecondsLeft(2);
    const t1 = window.setTimeout(() => setSkipSecondsLeft(1), 1000);
    const t2 = window.setTimeout(() => setSkipSecondsLeft(0), 2000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [videoIndex]);

  const currentVideoSrc =
    adData.allVideoUrls.length > 0
      ? adData.allVideoUrls[videoIndex % adData.allVideoUrls.length]
      : '';

  // Ensure continuous muted playback whenever visible on screen
  useEffect(() => {
    if (!currentVideoSrc) return;
    const vid = videoRef.current;
    const container = containerRef.current;
    if (!vid || !container) return;

    const tryPlay = () => {
      if (vid.paused) {
        vid.muted = isMuted;
        vid.play().catch(() => {
          vid.muted = true;
          vid.play().catch(() => {});
        });
      }
    };

    tryPlay();

    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          tryPlay();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(container);
    return () => io.disconnect();
  }, [currentVideoSrc, isMuted]);

  // If SFW validation returned no safe video URLs (or failed all), hide slot cleanly
  if (!adData.loaded || !currentVideoSrc || errorCount >= adData.allVideoUrls.length) {
    return null;
  }

  const handleSkipNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (skipSecondsLeft > 0) return;
    setVideoIndex((prev) => prev + 1);
  };

  const handleVideoError = () => {
    setErrorCount((c) => c + 1);
    setVideoIndex((prev) => prev + 1);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.muted = next;
        if (videoRef.current.paused) {
          videoRef.current.play().catch(() => {});
        }
      }
      return next;
    });
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-xl overflow-hidden flex items-center justify-center bg-black ${
        fillParent
          ? 'h-full'
          : mini
          ? 'h-[94px] sm:h-[136px]'
          : compact
          ? 'h-[150px] sm:h-[180px]'
          : 'h-[190px] sm:h-[230px]'
      }`}
    >
      <video
        ref={videoRef}
        key={currentVideoSrc}
        src={currentVideoSrc}
        autoPlay
        muted={isMuted}
        playsInline
        loop
        preload="auto"
        onCanPlay={() => {
          if (videoRef.current?.paused) {
            videoRef.current.play().catch(() => {});
          }
        }}
        onError={handleVideoError}
        className="w-full h-full object-cover pointer-events-none select-none"
      />

      {/* Minimal Overlay Controls Only (Mute + 2s Next Video + Close) — stays safely inside app */}
      <div
        className={`absolute z-10 flex items-center gap-1 ${
          mini ? 'top-1.5 right-1.5' : 'top-2 right-2 gap-1.5'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={toggleMute}
          className={`${
            mini ? 'p-1' : 'p-1.5'
          } rounded-lg bg-black/70 hover:bg-black/90 text-white cursor-pointer backdrop-blur-sm`}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className={mini ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          ) : (
            <Volume2 className={mini ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          )}
        </button>

        {!mini && (
          <button
            type="button"
            onClick={handleSkipNext}
            disabled={skipSecondsLeft > 0}
            className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 backdrop-blur-sm transition-all ${
              skipSecondsLeft > 0
                ? 'bg-black/70 text-zinc-300 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-black cursor-pointer font-extrabold'
            }`}
          >
            <SkipForward className="w-3 h-3" />
            <span>{skipSecondsLeft > 0 ? `${skipSecondsLeft}s` : 'Next'}</span>
          </button>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className={`${
              mini ? 'p-1' : 'p-1.5'
            } rounded-lg bg-black/70 hover:bg-black/90 text-white cursor-pointer backdrop-blur-sm`}
            aria-label="Close"
          >
            <X className={mini ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Centered Compact Playing Video Ad WITH a Small Banner Ad directly below it.
 * Used between every 3 cards, below 3-feature grids, and underneath long paragraphs (~8-10+ lines).
 */
export const VideoWithSmallBannerAd: React.FC<{
  slotId: string;
  slotIndex?: number;
  startIndex?: number;
  compact?: boolean;
}> = ({ slotId, slotIndex = 0, startIndex = 0, compact = true }) => {
  return (
    <div className="col-span-full w-full max-w-xl mx-auto my-3 flex flex-col items-center gap-2">
      <div className="w-full">
        <SkippableVideoAdUnit
          slotId={`${slotId}-video`}
          compact={compact}
          startIndex={startIndex}
        />
      </div>
      <div className="w-full flex items-center justify-center">
        <DualNetworkBannerFrame
          slotId={`${slotId}-small-banner`}
          slotIndex={slotIndex}
          preferFormat="banner"
          title={`Banner ${slotId}`}
        />
      </div>
    </div>
  );
};

/**
 * Top In-Flow Compact Video + Small Banner directly below.
 */
export const TopBannerAd: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto mb-4 flex flex-col items-center gap-2">
      <div className="w-full max-w-md mx-auto">
        <SkippableVideoAdUnit slotId="top-flow-video" compact startIndex={0} />
      </div>
      <DualNetworkBannerFrame
        slotId="top-flow"
        slotIndex={0}
        preferFormat="banner"
        title="Top Banner"
      />
    </div>
  );
};

/**
 * Compact Video Ad Pair with Small Banner right below.
 */
export const InlineVideoAdPair: React.FC<{ sectionId: string }> = ({ sectionId }) => {
  return (
    <div className="w-full max-w-5xl mx-auto my-3 space-y-2.5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SkippableVideoAdUnit slotId={`${sectionId}-vid-1`} compact startIndex={0} />
        <SkippableVideoAdUnit slotId={`${sectionId}-vid-2`} compact startIndex={1} />
      </div>
      <div className="flex items-center justify-center">
        <DualNetworkBannerFrame
          slotId={`${sectionId}-sub-banner`}
          slotIndex={1}
          preferFormat="banner"
          title={`Sub Banner ${sectionId}`}
        />
      </div>
    </div>
  );
};

/**
 * Full-Width Showcase (Centered Playing Video + Dual Small Banners below).
 */
export const FullWidthShowcaseAd: React.FC<{ slotId: string }> = ({ slotId }) => {
  return (
    <div className="col-span-full w-full max-w-5xl mx-auto my-3 space-y-2.5">
      <div className="max-w-lg mx-auto w-full">
        <SkippableVideoAdUnit slotId={`${slotId}-center-vid`} compact startIndex={2} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
        <div className="md:col-span-6 w-full flex items-center justify-center">
          <DualNetworkBannerFrame
            slotId={`${slotId}-wide`}
            slotIndex={0}
            preferFormat="banner"
            title={`Showcase Wide ${slotId}`}
          />
        </div>
        <div className="md:col-span-6 w-full flex items-center justify-center">
          <DualNetworkBannerFrame
            slotId={`${slotId}-alt`}
            slotIndex={1}
            preferFormat="banner"
            title={`Showcase Alt ${slotId}`}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Pure In-Feed Banner (placed where compact small banner is needed — NO box, NO title).
 */
export const InFeedBannerAd: React.FC<{
  slotId: string;
  slotIndex?: number;
  size?: 'auto' | 'large' | 'wide';
}> = ({ slotId, slotIndex = 0, size = 'auto' }) => {
  const preferFormat = size === 'large' ? 'square' : size === 'wide' ? 'wide' : 'banner';

  return (
    <div className="col-span-full w-full max-w-4xl mx-auto my-2 flex items-center justify-center">
      <DualNetworkBannerFrame
        slotId={slotId}
        slotIndex={slotIndex}
        preferFormat={preferFormat}
        title={`In-Feed Banner ${slotId}`}
      />
    </div>
  );
};

/**
 * 2-Second Auto-Cut In-Page Video Ad Overlay:
 * - Triggered smoothly inside the website (40s after opening) — zero external page redirects.
 * - Only opens when verified SFW VAST video stream is available.
 * - Auto-skips cleanly in 2 seconds AND offers an immediate Skip button on the video corner.
 */
export const TwoSecondVideoBreakOverlay: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [msLeft, setMsLeft] = useState<number>(2000);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setMsLeft(2000);

    let cancelled = false;
    fetchLiveVastData().then((data) => {
      if (cancelled) return;
      if (data?.allVideoUrls && data.allVideoUrls.length > 0) {
        const randomVid = data.allVideoUrls[Math.floor(Math.random() * data.allVideoUrls.length)];
        setVideoSrc(randomVid);
      } else {
        onCloseRef.current();
      }
    });

    const start = performance.now();
    const interval = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, 2000 - elapsed);
      setMsLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
        onCloseRef.current();
      }
    }, 60);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [open]);

  if (!open || !videoSrc) return null;

  const secondsLeft = Math.max(1, Math.ceil(msLeft / 1000));
  const pct = Math.min(100, Math.max(0, ((2000 - msLeft) / 2000) * 100));

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => {
      const next = !prev;
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Skip & Audio Controls overlaid on video */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white cursor-pointer backdrop-blur-sm"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow-lg"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Skip ({secondsLeft}s)</span>
          </button>
        </div>

        {/* Pure In-Site Video Only (no forced external navigation) */}
        <div className="w-full h-[220px] sm:h-[260px] flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted={isMuted}
            playsInline
            loop
            className="w-full h-full object-cover"
          />
        </div>

        {/* Sleek bottom 2s progress line */}
        <div className="w-full h-1 bg-zinc-900">
          <div className="h-full bg-amber-400 transition-all duration-75" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
};

/**
 * Small Persistent Corner Mini Video Player (Mobile + Desktop) — keeps playing smoothly inside the screen.
 */
export const FloatingMiniVideoAd: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(true);
  if (!visible) return null;

  return (
    <div className="fixed bottom-[68px] sm:bottom-4 right-2 sm:right-4 z-30 w-[156px] sm:w-[230px] shadow-2xl rounded-xl overflow-hidden border border-zinc-800/80 bg-black">
      <SkippableVideoAdUnit
        slotId="floating-mini-vid"
        mini
        startIndex={1}
        onDismiss={() => setVisible(false)}
      />
    </div>
  );
};

/**
 * Bottom In-Flow Video + Small Banner right underneath.
 */
export const BottomBannerAd: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto mt-6 mb-2 flex flex-col items-center gap-2">
      <div className="w-full max-w-md mx-auto">
        <SkippableVideoAdUnit slotId="bottom-flow-video" compact startIndex={1} />
      </div>
      <DualNetworkBannerFrame
        slotId="bottom-flow"
        slotIndex={1}
        preferFormat="banner"
        title="Bottom Banner"
      />
    </div>
  );
};

/**
 * Clean Idle Editor Ad Strip (shown gently at top/bottom ONLY while not playing or actively editing/uploading).
 */
export const EditorIdleBannerBar: React.FC<{ slotId: string; compactVideo?: boolean }> = ({
  slotId,
  compactVideo = false,
}) => {
  return (
    <div className="w-full flex items-center justify-center gap-2 px-2 py-1 bg-[#08090c] border-t border-zinc-900 shrink-0">
      {compactVideo && (
        <div className="w-[88px] sm:w-[130px] h-[48px] sm:h-[58px] rounded-lg overflow-hidden bg-black shrink-0 border border-zinc-800/80">
          <SkippableVideoAdUnit slotId={`${slotId}-vid`} mini fillParent startIndex={0} />
        </div>
      )}
      <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden">
        <DualNetworkBannerFrame
          slotId={slotId}
          slotIndex={0}
          preferFormat="banner"
          title={`Editor ${slotId}`}
        />
      </div>
    </div>
  );
};

/**
 * 10-Second Skippable Video Ad Break triggered cleanly ONLY during Export.
 * Counts down 10 seconds (or immediately if no verified SFW VAST stream exists) and proceeds directly to 4K export.
 */
export const FourSecondExportVideoAd: React.FC<{
  open: boolean;
  onComplete: () => void;
  durationMs?: number;
}> = ({ open, onComplete, durationMs = 10000 }) => {
  const [msLeft, setMsLeft] = useState<number>(durationMs);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!open) return;
    setMsLeft(durationMs);
    setVideoSrc('');

    let cancelled = false;
    fetchLiveVastData().then((data) => {
      if (cancelled) return;
      if (data?.allVideoUrls && data.allVideoUrls.length > 0) {
        const randomVid = data.allVideoUrls[Math.floor(Math.random() * data.allVideoUrls.length)];
        setVideoSrc(randomVid);
      } else {
        onCompleteRef.current();
      }
    });

    const start = performance.now();
    const interval = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, durationMs - elapsed);
      setMsLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
        onCompleteRef.current();
      }
    }, 60);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [open, durationMs]);

  if (!open || !videoSrc) return null;

  const secondsLeft = Math.max(1, Math.ceil(msLeft / 1000));
  const pct = Math.min(100, Math.max(0, ((durationMs - msLeft) / durationMs) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl">
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsMuted((prev) => {
                const next = !prev;
                if (videoRef.current) videoRef.current.muted = next;
                return next;
              });
            }}
            className="p-2 rounded-xl bg-black/75 text-white cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={msLeft > 5000}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-lg ${
              msLeft > 5000
                ? 'bg-black/75 text-zinc-300 cursor-not-allowed'
                : 'bg-white text-black hover:bg-amber-400 cursor-pointer'
            }`}
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>{msLeft > 5000 ? `${secondsLeft}s` : `Skip (${secondsLeft}s)`}</span>
          </button>
        </div>

        <div className="w-full h-[230px] sm:h-[260px] flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted={isMuted}
            playsInline
            loop
            className="w-full h-full object-cover"
          />
        </div>

        <div className="px-3 py-2 bg-[#0d0e14] flex items-center justify-between text-[11px] font-mono text-zinc-300">
          <span>Preparing 4K Render...</span>
          <span className="text-amber-400 font-bold">{secondsLeft}s</span>
        </div>

        <div className="w-full h-1.5 bg-zinc-900">
          <div className="h-full bg-amber-400 transition-all duration-75" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
};

