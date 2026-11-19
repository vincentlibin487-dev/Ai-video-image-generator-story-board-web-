import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { SkipForward, Volume2, VolumeX, X } from 'lucide-react';

// =========================================================================
// OFFICIAL LIVE AD NETWORKS (Network 1: Adsterra | Network 2: HilltopAds)
// Strict Non-Adult / Family-Safe (SFW) Guard + Opaque Sandbox Isolation
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
let lastEmptyVastAt = 0;

function stripClientXmlTags(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function parseVastXmlClient(xml: string, depth = 0): Promise<VastAdData | null> {
  if (!xml || !xml.includes('<')) return null;
  const adBlocks = [...xml.matchAll(/<Ad\b[^>]*>[\s\S]*?<\/Ad>/gi)].map((m) => m[0]);
  const blocks = adBlocks.length > 0 ? adBlocks : [xml];

  const safeUrls: string[] = [];
  const seenPrefixes = new Set<string>();
  let safeClick = '';
  const safeImpressions: string[] = [];
  const wrapperUrls: string[] = [];

  for (const block of blocks) {
    const metaText = stripClientXmlTags(block);
    const mediaUrls = [
      ...block.matchAll(/<MediaFile([^>]*)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/MediaFile>/gi),
    ]
      .map((m) => ({ attrs: m[1] || '', url: (m[2] || '').trim() }))
      .filter(({ attrs, url }) => {
        if (!url || !/^https?:\/\//i.test(url)) return false;
        const lower = url.toLowerCase();
        return lower.includes('.mp4') || lower.includes('.webm') || /type=["']video\//i.test(attrs);
      })
      .map((item) => item.url);

    const clickThrough =
      block
        .match(/<ClickThrough[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ClickThrough>/i)?.[1]
        ?.trim() || '';

    const impressions = [
      ...block.matchAll(/<Impression[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/Impression>/gi),
    ]
      .map((m) => m[1]?.trim())
      .filter((u): u is string => Boolean(u));

    const wrapperUrl =
      block
        .match(/<VASTAdTagURI[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/VASTAdTagURI>/i)?.[1]
        ?.trim() || '';

    if (containsAdultAdSignals(metaText, clickThrough, wrapperUrl, ...mediaUrls, ...impressions)) {
      continue;
    }

    const preferred =
      mediaUrls.find((u) => u.includes('480.mp4')) ||
      mediaUrls.find((u) => u.includes('.mp4') && !u.includes('360.mp4')) ||
      mediaUrls[0];

    if (preferred) {
      const prefix = preferred.replace(/(480|360|720)?\.(mp4|webm)$/i, '');
      if (!seenPrefixes.has(prefix)) {
        seenPrefixes.add(prefix);
        safeUrls.push(preferred);
      }
      if (!safeClick && clickThrough) safeClick = clickThrough;
      safeImpressions.push(...impressions);
    } else if (wrapperUrl && /^https?:\/\//i.test(wrapperUrl)) {
      wrapperUrls.push(wrapperUrl);
    }
  }

  if (safeUrls.length === 0 && depth < 1 && wrapperUrls.length > 0) {
    try {
      const wrapRes = await fetch(wrapperUrls[0], {
        signal: typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(3500) : undefined,
      });
      if (wrapRes.ok) {
        const wrapXml = await wrapRes.text();
        return await parseVastXmlClient(wrapXml, depth + 1);
      }
    } catch {
      // Fall through to server fallback
    }
  }

  if (safeUrls.length === 0) return null;
  return {
    videoUrl: safeUrls[0],
    allVideoUrls: safeUrls,
    clickThrough: safeClick || HILLTOP_CONFIG.vastVideoFeedUrl,
    impressions: safeImpressions,
    loaded: true,
  };
}

async function fetchLiveVastData(forceRetry = false): Promise<VastAdData> {
  if (cachedVastData && cachedVastData.allVideoUrls.length > 0) {
    return cachedVastData;
  }
  if (!forceRetry && cachedVastData && Date.now() - lastEmptyVastAt < 12000) {
    return cachedVastData;
  }
  if (vastFetchPromise) return vastFetchPromise;

  vastFetchPromise = (async () => {
    // 1. Try direct browser fetch first so HilltopAds sees user's real residential/mobile IP & User-Agent
    try {
      const directController = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const directTimer =
        typeof window !== 'undefined' && directController
          ? window.setTimeout(() => directController.abort(), 3800)
          : null;
      try {
        const directRes = await fetch(
          HILLTOP_CONFIG.vastVideoFeedUrl,
          directController ? { signal: directController.signal } : undefined
        );
        if (directTimer !== null) window.clearTimeout(directTimer);
        if (directRes.ok) {
          const xml = await directRes.text();
          const parsedDirect = await parseVastXmlClient(xml, 0);
          if (parsedDirect && parsedDirect.allVideoUrls.length > 0) {
            cachedVastData = parsedDirect;
            return cachedVastData;
          }
        }
      } catch {
        if (directTimer !== null) window.clearTimeout(directTimer);
      }
    } catch {}

    // 2. Fallback to backend /api/vast-ad proxy (handles CORS environments and extracts nested wrappers)
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId =
      typeof window !== 'undefined' && controller
        ? window.setTimeout(() => controller.abort(), 4800)
        : null;

    try {
      const res = await fetch('/api/vast-ad', controller ? { signal: controller.signal } : undefined);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const rawUrls: string[] = Array.isArray(data?.allVideoUrls) ? data.allVideoUrls : [];
        const safeUrls = rawUrls.filter((u) => Boolean(u) && !containsAdultAdSignals(u));
        const safeClick =
          data?.clickThrough && !containsAdultAdSignals(data.clickThrough) ? data.clickThrough : '';

        if (safeUrls.length > 0) {
          cachedVastData = {
            videoUrl: safeUrls[0],
            allVideoUrls: safeUrls,
            clickThrough: safeClick,
            impressions: Array.isArray(data?.impressions) ? data.impressions : [],
            loaded: true,
          };
          return cachedVastData;
        }
      }
    } catch {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    }

    lastEmptyVastAt = Date.now();
    cachedVastData = {
      videoUrl: '',
      allVideoUrls: [],
      clickThrough: '',
      impressions: [],
      loaded: true,
    };
    return cachedVastData;
  })().finally(() => {
    vastFetchPromise = null;
  });

  return vastFetchPromise;
}

// =========================================================================
// GLOBAL SINGLE-ACTIVE-VIDEO COORDINATOR
// Guarantees ONLY ONE background/in-flow video ad decodes & plays at a time
// so mobile hardware MediaCodec decoders & main UI thread never saturate.
// =========================================================================
type ActiveVideoListener = (activeInstanceId: string | null) => void;
const visibleVideoPriorities = new Map<string, number>();
const activeVideoListeners = new Set<ActiveVideoListener>();
let modalVideoLockCount = 0;
let currentActiveVideoInstanceId: string | null = null;

function notifyActiveVideoListeners() {
  let nextActiveId: string | null = null;
  if (modalVideoLockCount === 0 && visibleVideoPriorities.size > 0) {
    let bestPriority = -1;
    visibleVideoPriorities.forEach((priority, id) => {
      if (priority > bestPriority) {
        bestPriority = priority;
        nextActiveId = id;
      }
    });
  }
  if (nextActiveId !== currentActiveVideoInstanceId) {
    currentActiveVideoInstanceId = nextActiveId;
    activeVideoListeners.forEach((listener) => listener(nextActiveId));
  }
}

function setVideoSlotVisibility(instanceId: string, priority: number | null) {
  if (priority === null) {
    if (visibleVideoPriorities.delete(instanceId)) {
      notifyActiveVideoListeners();
    }
    return;
  }
  const prev = visibleVideoPriorities.get(instanceId);
  if (prev === undefined || Math.abs(prev - priority) >= 0.05) {
    visibleVideoPriorities.set(instanceId, priority);
    notifyActiveVideoListeners();
  }
}

function subscribeActiveVideo(listener: ActiveVideoListener): () => void {
  activeVideoListeners.add(listener);
  listener(currentActiveVideoInstanceId);
  return () => {
    activeVideoListeners.delete(listener);
  };
}

function acquireModalVideoLock(): () => void {
  modalVideoLockCount += 1;
  notifyActiveVideoListeners();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    modalVideoLockCount = Math.max(0, modalVideoLockCount - 1);
    notifyActiveVideoListeners();
  };
}

/**
 * Pure Frameless Dual-Network Banner Renderer (Adsterra <-> HilltopAds).
 * - Uses strict opaque-origin srcDoc isolation (NO `allow-same-origin` alongside `allow-scripts`)
 *   so third-party ad scripts CANNOT access `window.top`, attach invisible overlays,
 *   intercept Storyboard touch/scroll events, or block the main React UI thread.
 * - Zero synchronous DOM/innerText polling and zero simultaneous 3.2s reload bursts.
 */
export const DualNetworkBannerFrame: React.FC<{
  slotId: string;
  slotIndex?: number;
  preferFormat?: 'banner' | 'square' | 'wide';
  maxHeight?: number;
  title?: string;
}> = ({ slotId, slotIndex = 0, preferFormat = 'banner', maxHeight, title = 'Advertisement' }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState<boolean>(false);
  const [mountReady, setMountReady] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  const [containerWidth, setContainerWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? Math.min(window.innerWidth, 760) : 360
  );
  const activeNetwork: 'adsterra' | 'hilltop' = slotIndex % 2 === 0 ? 'hilltop' : 'adsterra';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId: number | null = null;
    const updateSize = () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        const nextDesktop = window.innerWidth >= 768;
        setIsDesktop((prev) => (prev === nextDesktop ? prev : nextDesktop));
      });
    };
    window.addEventListener('resize', updateSize, { passive: true });
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const updateWidth = () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const rounded = Math.round(rect.width);
        if (rounded > 0) {
          setContainerWidth((prev) => (Math.abs(prev - rounded) >= 4 ? rounded : prev));
        }
      });
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
        { rootMargin: '120px 0px' }
      );
      io.observe(el);
    } else {
      setInView(true);
    }

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      ro?.disconnect();
      io?.disconnect();
    };
  }, []);

  // Stagger iframe script hydration lightly when multiple banners enter near load
  useEffect(() => {
    if (!inView) return;
    const delayMs = 80 + (slotIndex % 4) * 140;
    const timer = window.setTimeout(() => setMountReady(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [inView, slotIndex]);

  const adDetails = useMemo(() => {
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
      <script type="text/javascript" src="${cfg.invokeUrl}" async></script>`;
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
        } else if (d.body) {
          d.body.appendChild(s);
        }
      })({});
    </script>`;
    return { width: cfg.width, height: cfg.height, scriptHtml };
  }, [activeNetwork, isDesktop, preferFormat]);

  const bannerSrcDoc = useMemo(() => {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="rating" content="General" />
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
</html>`;
  }, [adDetails]);

  const safeWidth = maxHeight ? Math.max(96, containerWidth) : Math.max(260, containerWidth);
  const heightScale = maxHeight ? maxHeight / adDetails.height : 1;
  const scale = Math.min(1, safeWidth / adDetails.width, heightScale);
  const scaledWidth = Math.max(1, Math.floor(adDetails.width * scale));
  const scaledHeight = Math.max(1, Math.floor(adDetails.height * scale));

  return (
    <div ref={wrapperRef} className="w-full max-w-full flex items-center justify-center">
      <div
        className="relative overflow-hidden mx-auto flex items-center justify-center"
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          maxWidth: '100%',
          contain: 'layout style paint',
        }}
      >
        {inView && mountReady && (
          <iframe
            key={`${slotId}-${activeNetwork}-${adDetails.width}x${adDetails.height}`}
            srcDoc={bannerSrcDoc}
            title={title}
            loading="lazy"
            scrolling="no"
            frameBorder={0}
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
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
 * - Coordinated globally so ONLY ONE video ad actively decodes/plays at any moment,
 *   preventing mobile GPU/MediaCodec stalls and main-thread freezes.
 * - Releases the `<video>` element cleanly when scrolled out of view or superseded.
 */
export const SkippableVideoAdUnit: React.FC<{
  slotId: string;
  compact?: boolean;
  mini?: boolean;
  fillParent?: boolean;
  startIndex?: number;
  fallbackBannerSlotId?: string;
  forceRetryOnMount?: boolean;
  onDismiss?: () => void;
}> = ({
  slotId,
  compact = false,
  mini = false,
  fillParent = false,
  startIndex = 0,
  fallbackBannerSlotId,
  forceRetryOnMount = false,
  onDismiss,
}) => {
  const reactId = useId();
  const instanceId = `${slotId}::${reactId}`;
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
  const [isActiveDecoder, setIsActiveDecoder] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchLiveVastData(forceRetryOnMount).then((data) => {
      if (isMounted) {
        setAdData(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [forceRetryOnMount]);

  useEffect(() => {
    const unsub = subscribeActiveVideo((activeId) => {
      setIsActiveDecoder(activeId === instanceId);
    });
    return unsub;
  }, [instanceId]);

  useEffect(() => {
    if (!isActiveDecoder) return;
    setSkipSecondsLeft(2);
    const t1 = window.setTimeout(() => setSkipSecondsLeft(1), 1000);
    const t2 = window.setTimeout(() => setSkipSecondsLeft(0), 2000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [videoIndex, isActiveDecoder]);

  const currentVideoSrc =
    adData.allVideoUrls.length > 0
      ? adData.allVideoUrls[videoIndex % adData.allVideoUrls.length]
      : '';

  const hasPlayableAd =
    adData.loaded && Boolean(currentVideoSrc) && errorCount < adData.allVideoUrls.length;

  useEffect(() => {
    if (!hasPlayableAd) {
      setVideoSlotVisibility(instanceId, null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    const basePriorityBoost = slotId === 'floating-mini-vid' ? 0.25 : 1.0;

    if (typeof IntersectionObserver === 'undefined') {
      setVideoSlotVisibility(instanceId, basePriorityBoost);
      return () => setVideoSlotVisibility(instanceId, null);
    }

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && entry.intersectionRatio >= 0.02) {
          setVideoSlotVisibility(instanceId, Math.max(0.05, entry.intersectionRatio) * basePriorityBoost);
        } else {
          setVideoSlotVisibility(instanceId, null);
        }
      },
      { threshold: [0, 0.02, 0.25, 0.75] }
    );
    io.observe(container);

    return () => {
      io.disconnect();
      setVideoSlotVisibility(instanceId, null);
    };
  }, [hasPlayableAd, instanceId, slotId]);

  // Release hardware decoder immediately when inactive or unmounted
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isActiveDecoder && currentVideoSrc) {
      vid.muted = isMuted;
      vid.play().catch(() => {
        vid.muted = true;
        vid.play().catch(() => {});
      });
    }

    return () => {
      try {
        vid.pause();
        vid.removeAttribute('src');
        vid.load();
      } catch {}
    };
  }, [isActiveDecoder, currentVideoSrc, isMuted]);

  // If SFW validation returned no safe video URLs (or failed all), optionally show compact live banner fallback
  if (!hasPlayableAd) {
    if (fallbackBannerSlotId) {
      return (
        <div
          className={`w-full ${fillParent ? 'h-full' : mini ? 'h-[46px]' : 'h-[120px]'} flex items-center justify-center overflow-hidden bg-[#0a0d14]`}
        >
          <DualNetworkBannerFrame
            slotId={fallbackBannerSlotId}
            slotIndex={0}
            preferFormat="banner"
            maxHeight={mini ? 46 : undefined}
            title="Sponsor Ad"
          />
        </div>
      );
    }
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
      style={{ contain: 'layout style paint' }}
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
      {isActiveDecoder ? (
        <video
          ref={videoRef}
          key={currentVideoSrc}
          src={currentVideoSrc}
          autoPlay
          muted={isMuted}
          playsInline
          loop
          preload="metadata"
          onCanPlay={() => {
            if (videoRef.current?.paused) {
              videoRef.current.play().catch(() => {});
            }
          }}
          onError={handleVideoError}
          className="w-full h-full object-cover pointer-events-none select-none"
        />
      ) : (
        <div className="w-full h-full bg-zinc-950/90" aria-hidden="true" />
      )}

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
 * Compact Video Ad + Small Banner right below (capped to 1 active video for smooth mobile playback).
 */
export const InlineVideoAdPair: React.FC<{ sectionId: string }> = ({ sectionId }) => {
  return (
    <div className="w-full max-w-3xl mx-auto my-3 space-y-2.5">
      <div className="max-w-lg mx-auto w-full">
        <SkippableVideoAdUnit slotId={`${sectionId}-vid-1`} compact startIndex={0} />
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
 * Full-Width Showcase (Centered Playing Video + Clean Banner below).
 */
export const FullWidthShowcaseAd: React.FC<{ slotId: string }> = ({ slotId }) => {
  return (
    <div className="col-span-full w-full max-w-4xl mx-auto my-3 space-y-2.5">
      <div className="max-w-lg mx-auto w-full">
        <SkippableVideoAdUnit slotId={`${slotId}-center-vid`} compact startIndex={2} />
      </div>
      <div className="w-full flex items-center justify-center">
        <DualNetworkBannerFrame
          slotId={`${slotId}-wide`}
          slotIndex={0}
          preferFormat="banner"
          title={`Showcase Wide ${slotId}`}
        />
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
 * - Pauses inline video ads while active so hardware decoders stay free.
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
    if (!open) {
      setVideoSrc('');
      return;
    }
    const releaseLock = acquireModalVideoLock();
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
    }, 100);

    const failsafeTimer = window.setTimeout(() => {
      onCloseRef.current();
    }, 2600);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(failsafeTimer);
      releaseLock();
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
            onError={() => onCloseRef.current()}
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
 * Small Persistent Corner Mini Video Player (Desktop / Wide Screens) — stays cleanly in corner
 * without competing against visible in-flow video decoders.
 */
export const FloatingMiniVideoAd: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(true);
  if (!visible) return null;

  return (
    <div className="hidden md:block fixed bottom-[68px] sm:bottom-4 right-2 sm:right-4 z-30 w-[180px] sm:w-[220px] shadow-2xl rounded-xl overflow-hidden border border-zinc-800/80 bg-black">
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
  activeWhileExporting?: boolean;
  exportProgress?: number;
  exportElapsedSec?: number;
  exportTotalSec?: number;
  resolutionLabel?: string;
  onCancelExport?: () => void;
}> = ({
  open,
  onComplete,
  durationMs = 10000,
  activeWhileExporting = false,
  exportProgress = 0,
  exportElapsedSec = 0,
  exportTotalSec = 0,
  resolutionLabel = '1080p',
  onCancelExport,
}) => {
  const [msLeft, setMsLeft] = useState<number>(durationMs);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [videoIdx, setVideoIdx] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!open) {
      setVideoUrls([]);
      setVideoIdx(0);
      return;
    }
    const releaseLock = acquireModalVideoLock();
    setMsLeft(durationMs);
    setVideoUrls([]);
    setVideoIdx(0);

    let cancelled = false;
    fetchLiveVastData().then((data) => {
      if (cancelled) return;
      if (data?.allVideoUrls && data.allVideoUrls.length > 0) {
        const shuffled = [...data.allVideoUrls].sort(() => Math.random() - 0.5);
        setVideoUrls(shuffled);
        setVideoIdx(0);
      } else if (!activeWhileExporting) {
        onCompleteRef.current();
      }
    });

    if (activeWhileExporting) {
      return () => {
        cancelled = true;
        releaseLock();
      };
    }

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
      releaseLock();
    };
  }, [open, durationMs, activeWhileExporting]);

  const videoSrc = videoUrls[videoIdx % Math.max(1, videoUrls.length)] || '';

  useEffect(() => {
    if (!open || !videoSrc || !videoRef.current) return;
    const vid = videoRef.current;
    vid.muted = isMuted;
    vid.play().catch(() => {});
  }, [open, videoSrc, isMuted]);

  if (!open || !videoSrc) return null;

  const secondsLeft = Math.max(1, Math.ceil(msLeft / 1000));
  const pct = activeWhileExporting
    ? Math.min(100, Math.max(0, exportProgress))
    : Math.min(100, Math.max(0, ((durationMs - msLeft) / durationMs) * 100));

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
          {activeWhileExporting ? (
            onCancelExport && (
              <button
                type="button"
                onClick={onCancelExport}
                className="px-3 py-2 rounded-xl text-xs font-extrabold bg-red-600/90 hover:bg-red-500 text-white cursor-pointer shadow-lg"
              >
                Cancel Export
              </button>
            )
          ) : (
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
          )}
        </div>

        <div className="w-full h-[230px] sm:h-[260px] flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted={isMuted}
            playsInline
            loop={videoUrls.length <= 1}
            onEnded={() => {
              if (videoUrls.length > 1) {
                setVideoIdx((i) => (i + 1) % videoUrls.length);
              } else if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.play().catch(() => {});
              }
            }}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="px-3.5 py-2.5 bg-[#0d0e14] flex items-center justify-between text-[11px] font-mono text-zinc-200 gap-2">
          <span className="truncate font-bold">
            {activeWhileExporting
              ? `Exporting ${resolutionLabel} Video...`
              : 'Preparing Video Render...'}
          </span>
          <span className="text-amber-400 font-extrabold shrink-0 tabular-nums">
            {activeWhileExporting
              ? `${Math.round(pct)}%${exportTotalSec > 0 ? ` · ${Math.min(Math.round(exportElapsedSec), Math.ceil(exportTotalSec))}s / ${Math.ceil(exportTotalSec)}s` : ''}`
              : `${secondsLeft}s`}
          </span>
        </div>

        <div className="w-full h-2 bg-zinc-900">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-100"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Persistent Compact Bottom Video Ad Strip for the Video Editing System.
 * Always sits cleanly at the very bottom of the Video Editor (left compact video ad + right live banner ad)
 * without overlapping timeline tracks or clipping vertically.
 */
export const EditorBottomVideoAdBar: React.FC<{ slotId?: string }> = ({ slotId = 'studio-bottom' }) => {
  return (
    <div className="w-full h-[58px] sm:h-[66px] bg-[#070a0f] border-t border-zinc-800/90 px-2 py-1 flex items-center justify-between gap-2 shrink-0 overflow-hidden z-20">
      <div className="w-[104px] sm:w-[146px] h-[46px] sm:h-[54px] rounded-lg overflow-hidden bg-black border border-zinc-800 shrink-0 shadow-md">
        <SkippableVideoAdUnit
          slotId={`${slotId}-vid`}
          mini
          fillParent
          startIndex={0}
          forceRetryOnMount
          fallbackBannerSlotId={`${slotId}-vid-banner`}
        />
      </div>
      <div className="flex-1 min-w-0 h-full flex items-center justify-center overflow-hidden">
        <DualNetworkBannerFrame
          slotId={`${slotId}-wide`}
          slotIndex={1}
          preferFormat="wide"
          maxHeight={54}
          title="Video Editor Bottom Ad"
        />
      </div>
    </div>
  );
};

/**
 * Live Video Commercial Player embedded directly inside the Export Modal Box.
 * Plays continuously for the ENTIRE export + download finalization duration (0% -> 100%)
 * and shuts off cleanly at the exact moment export finishes.
 */
export const ExportModalVideoAdPlayer: React.FC<{
  active: boolean;
  progress: number;
  elapsedSec: number;
  totalSec: number;
  statusText?: string;
}> = ({ active, progress, elapsedSec, totalSec, statusText }) => {
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [videoIdx, setVideoIdx] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [loadedVast, setLoadedVast] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!active) {
      setVideoUrls([]);
      setVideoIdx(0);
      setErrorCount(0);
      setLoadedVast(false);
      return;
    }
    const releaseLock = acquireModalVideoLock();
    setErrorCount(0);
    setLoadedVast(false);
    let cancelled = false;
    fetchLiveVastData(true).then((data) => {
      if (cancelled) return;
      if (data?.allVideoUrls && data.allVideoUrls.length > 0) {
        const shuffled = [...data.allVideoUrls].sort(() => Math.random() - 0.5);
        setVideoUrls(shuffled);
        setVideoIdx(0);
      }
      setLoadedVast(true);
    });
    return () => {
      cancelled = true;
      releaseLock();
    };
  }, [active]);

  const hasPlayableVideo = videoUrls.length > 0 && errorCount < videoUrls.length;
  const videoSrc = hasPlayableVideo ? videoUrls[videoIdx % videoUrls.length] || '' : '';

  useEffect(() => {
    if (!active || !videoSrc || !videoRef.current) return;
    const vid = videoRef.current;
    vid.muted = isMuted;
    vid.play().catch(() => {
      vid.muted = true;
      vid.play().catch(() => {});
    });
    return () => {
      try {
        vid.pause();
      } catch {}
    };
  }, [active, videoSrc, isMuted]);

  if (!active) return null;

  const clampedPct = Math.min(100, Math.max(2, Math.round(progress)));
  const safeTotal = Math.max(1, Math.ceil(totalSec || 1));
  const safeElapsed = Math.min(safeTotal, Math.max(0, Math.round(elapsedSec || 0)));

  return (
    <div className="rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-xl space-y-0">
      <div className="relative w-full h-[180px] sm:h-[210px] bg-black flex items-center justify-center overflow-hidden">
        {videoSrc ? (
          <>
            <video
              key={videoSrc}
              ref={videoRef}
              src={videoSrc}
              autoPlay
              muted={isMuted}
              playsInline
              preload="auto"
              loop={videoUrls.length <= 1}
              onCanPlay={() => {
                if (active && videoRef.current?.paused) {
                  videoRef.current.play().catch(() => {});
                }
              }}
              onPause={() => {
                if (active && videoRef.current && !videoRef.current.ended) {
                  videoRef.current.play().catch(() => {});
                }
              }}
              onEnded={() => {
                if (!active) return;
                if (videoUrls.length > 1) {
                  setVideoIdx((i) => (i + 1) % videoUrls.length);
                } else if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().catch(() => {});
                }
              }}
              onError={() => {
                setErrorCount((c) => c + 1);
                if (videoUrls.length > 1) {
                  setVideoIdx((i) => (i + 1) % videoUrls.length);
                }
              }}
              className="w-full h-full object-cover pointer-events-none select-none"
            />
            <button
              type="button"
              onClick={() => {
                setIsMuted((prev) => {
                  const next = !prev;
                  if (videoRef.current) videoRef.current.muted = next;
                  return next;
                });
              }}
              className="absolute top-2.5 right-2.5 z-20 p-2 rounded-lg bg-black/75 hover:bg-black text-white border border-white/15 cursor-pointer"
              aria-label={isMuted ? 'Unmute Ad' : 'Mute Ad'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </>
        ) : loadedVast ? (
          <div className="w-full h-full flex items-center justify-center p-2 bg-[#0a0d14]">
            <DualNetworkBannerFrame
              slotId="export-modal-fallback"
              slotIndex={0}
              preferFormat="banner"
              maxHeight={180}
              title="Export Sponsor Ad"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0a0d14] text-xs text-zinc-400 font-medium">
            Loading live video stream...
          </div>
        )}
      </div>

      {/* Export Countdown & Live Video Render Progress */}
      <div className="p-2.5 bg-[#0e131b] border-t border-zinc-800/90 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono gap-2">
          <span className="text-teal-300 font-semibold truncate">
            {statusText || 'Rendering Video...'}
          </span>
          <span className="text-amber-300 font-extrabold shrink-0 tabular-nums">
            {clampedPct}% · {safeElapsed}s / {safeTotal}s
          </span>
        </div>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-amber-400 transition-all duration-150"
            style={{ width: `${clampedPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};



