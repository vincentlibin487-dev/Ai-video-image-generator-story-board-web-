import React, { useEffect, useRef, useState } from 'react';
import { SkipForward, Play, Volume2, VolumeX, X, ExternalLink, RefreshCw } from 'lucide-react';

// =========================================================================
// OFFICIAL AD NETWORKS CONFIGURATION (Network 1: Adsterra | Network 2: HilltopAds)
// =========================================================================

// --- Network 1: Adsterra Real Codes ---
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
  popunderUrl: 'https://abscloud.org/1/258bc21406c0c2080700daaefc38766c',
};

// --- Network 2: HilltopAds Real Codes ---
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
  videoSliderSrc:
    'https://unfoldedtrade.com/bXX.VIsSdJG/lL0PYZWWce/uehmR9zuVZ/UTlsk/P_Tgcj2/M/j/YJ0BO/DeUgttN/zdYzyyNQjxQq4zOFQh',
  vastVideoFeedUrl:
    'https://subtle-injury.com/d/mLF.zQdgGfNEvDZGGhUU/Gemme9/uFZjUolTkaPSTzcV2YMBjcYO0/MADJE/t/NFzvYRyGNqjuQAwYN-QR',
  popunderUrl:
    'https://pleased-report.com/be3.Vg0/PD3spPv/bXm-VkJUZwD/0/3lNAjuIp2hNXDNIL1sLvTGco2gMxjPY/0vMKj/kC',
};

// Verified original commercial video streams from the user's HilltopAds VAST account
const VERIFIED_VAST_COMMERCIALS = [
  'https://www.dismal-library.pro/152327/199275/530449_c6438y.mp4',
  'https://www.dismal-library.pro/152327/199275/559487_2f79fy.mp4',
  'https://www.dismal-library.pro/360312/974363/1329362_5d4bfy.mp4',
  'https://www.dismal-library.pro/152327/199275/559491_4e8bey.mp4',
  'https://www.dismal-library.pro/152327/199275/559485_3654ay.mp4',
];

interface VastAdData {
  videoUrl: string;
  allVideoUrls: string[];
  clickThrough: string;
  impressions: string[];
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
        if (data && data.videoUrl) {
          cachedVastData = {
            videoUrl: data.videoUrl,
            allVideoUrls:
              Array.isArray(data.allVideoUrls) && data.allVideoUrls.length > 0
                ? data.allVideoUrls
                : VERIFIED_VAST_COMMERCIALS,
            clickThrough: data.clickThrough || HILLTOP_CONFIG.vastVideoFeedUrl,
            impressions: data.impressions || [],
          };
          return cachedVastData;
        }
      }
    } catch {}

    cachedVastData = {
      videoUrl: VERIFIED_VAST_COMMERCIALS[0],
      allVideoUrls: VERIFIED_VAST_COMMERCIALS,
      clickThrough: HILLTOP_CONFIG.vastVideoFeedUrl,
      impressions: [],
    };
    return cachedVastData;
  })();

  return vastFetchPromise;
}

/**
 * Dual-Network Live Banner Frame (Adsterra <-> HilltopAds Automatic Rotation)
 * - Rotates automatically between Network 1 (Adsterra) and Network 2 (HilltopAds).
 * - Delivers original live ads with full permissions (clicks, impressions, responsive scaling).
 * - No skip button (permanent image/banner ad, exactly as requested).
 */
export const DualNetworkBannerFrame: React.FC<{
  slotId: string;
  slotIndex?: number;
  preferFormat?: 'banner' | 'square' | 'wide';
  title?: string;
}> = ({ slotId, slotIndex = 0, preferFormat = 'banner', title = 'Sponsored Banner' }) => {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );

  // Alternate initial network based on slotIndex (Odd: Adsterra, Even: HilltopAds)
  const [activeNetwork, setActiveNetwork] = useState<'adsterra' | 'hilltop'>(
    slotIndex % 2 === 0 ? 'hilltop' : 'adsterra'
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateSize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Periodic rotation between Network 1 (Adsterra) and Network 2 (HilltopAds) every 20 seconds
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveNetwork((prev) => (prev === 'adsterra' ? 'hilltop' : 'adsterra'));
    }, 20000);
    return () => window.clearInterval(timer);
  }, []);

  // Calculate dimensions and markup for active network
  const adDetails = (() => {
    if (activeNetwork === 'adsterra') {
      const cfg = isDesktop ? ADSTERRA_CONFIG.desktop728x90 : ADSTERRA_CONFIG.mobile320x50;
      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: transparent;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <script type="text/javascript">
      atOptions = {
        'key': '${cfg.key}',
        'format': 'iframe',
        'height': ${cfg.height},
        'width': ${cfg.width},
        'params': {}
      };
    </script>
    <script type="text/javascript" src="${cfg.invokeUrl}"></script>
  </body>
</html>`;
      return {
        width: cfg.width,
        height: cfg.height,
        networkName: 'Adsterra',
        srcDoc: html,
      };
    }

    // HilltopAds: 300x250 or 300x100
    const is300x250 = preferFormat === 'square' || (!isDesktop && preferFormat !== 'wide');
    const cfg = is300x250 ? HILLTOP_CONFIG.banner300x250 : HILLTOP_CONFIG.banner300x100;
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: transparent;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
      <script>
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
      </script>
    </div>
  </body>
</html>`;
    return {
      width: cfg.width,
      height: cfg.height,
      networkName: 'HilltopAds',
      srcDoc: html,
    };
  })();

  return (
    <div className="w-full flex flex-col items-center justify-center overflow-hidden">
      {/* Network indicator tag */}
      <div className="w-full flex items-center justify-between px-2 mb-1 text-[9px] font-mono text-zinc-500">
        <span>SPONSORED</span>
        <button
          type="button"
          onClick={() => setActiveNetwork((prev) => (prev === 'adsterra' ? 'hilltop' : 'adsterra'))}
          className="flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer"
          title="Switch Network"
        >
          <RefreshCw className="w-2.5 h-2.5" />
          <span>{adDetails.networkName} (Live)</span>
        </button>
      </div>

      <div
        className="relative overflow-hidden flex items-center justify-center max-w-full rounded-xl bg-[#080a14] border border-zinc-800/80"
        style={{
          width: `${adDetails.width}px`,
          height: `${adDetails.height}px`,
        }}
      >
        <iframe
          key={`${slotId}-${activeNetwork}-${adDetails.width}x${adDetails.height}`}
          title={title}
          srcDoc={adDetails.srcDoc}
          scrolling="no"
          frameBorder="0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          allow="autoplay; encrypted-media"
          className="w-full h-full border-0 block"
        />
      </div>
    </div>
  );
};

/**
 * Real In-Page Video Ad Unit (Original Commercial Video, 2-Second Skip, Audio Toggle, Sponsor Click).
 * Seamlessly plays genuine commercial advertisements between story angles and shot cards.
 */
export const SkippableVideoAdUnit: React.FC<{
  slotId: string;
  compact?: boolean;
  startIndex?: number;
  onDismiss?: () => void;
}> = ({ slotId, compact = false, startIndex = 0, onDismiss }) => {
  const [adData, setAdData] = useState<VastAdData>({
    videoUrl: VERIFIED_VAST_COMMERCIALS[startIndex % VERIFIED_VAST_COMMERCIALS.length],
    allVideoUrls: VERIFIED_VAST_COMMERCIALS,
    clickThrough: HILLTOP_CONFIG.vastVideoFeedUrl,
    impressions: [],
  });
  const [videoIndex, setVideoIndex] = useState<number>(startIndex);
  const [skipSecondsLeft, setSkipSecondsLeft] = useState<number>(2);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchLiveVastData().then((data) => {
      if (isMounted && data?.videoUrl) {
        setAdData(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2-Second skippable countdown
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
    adData.allVideoUrls[videoIndex % adData.allVideoUrls.length] || adData.videoUrl;

  const handleSkipNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (skipSecondsLeft > 0) return;
    setVideoIndex((prev) => prev + 1);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.muted = next;
      }
      return next;
    });
  };

  const handleOpenClickThrough = () => {
    if (typeof window !== 'undefined' && adData.clickThrough) {
      window.open(adData.clickThrough, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`rounded-2xl bg-[#0b0d17] border border-amber-500/40 overflow-hidden shadow-2xl transition-all ${
        compact ? 'p-2.5 space-y-2' : 'p-3.5 space-y-2.5'
      }`}
    >
      {/* Top Header bar with skip, audio toggle, and sponsor link */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1 uppercase tracking-wider bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
            <Play className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span>Commercial Ad</span>
          </span>
          <button
            type="button"
            onClick={handleOpenClickThrough}
            className="hidden sm:flex items-center gap-1 text-[10px] text-zinc-400 hover:text-amber-300 font-mono transition-colors cursor-pointer"
            title="Visit sponsor"
          >
            <span>Visit Sponsor</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mute / Unmute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-700 cursor-pointer transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {/* 2-Second Skip Button */}
          <button
            type="button"
            onClick={handleSkipNext}
            disabled={skipSecondsLeft > 0}
            className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
              skipSecondsLeft > 0
                ? 'bg-zinc-900 text-zinc-400 border border-zinc-800 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-black cursor-pointer font-extrabold shadow-md'
            }`}
          >
            <SkipForward className="w-3 h-3" />
            <span>{skipSecondsLeft > 0 ? `Skip in ${skipSecondsLeft}s` : 'Skip'}</span>
          </button>

          {onDismiss && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Real Video Player Box */}
      <div
        onClick={handleOpenClickThrough}
        className={`relative w-full rounded-xl bg-black border border-zinc-800 overflow-hidden flex items-center justify-center cursor-pointer group ${
          compact ? 'min-h-[140px] max-h-[200px]' : 'min-h-[180px] max-h-[260px]'
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
          className="w-full h-full object-contain"
        />

        {/* Sponsor overlay hint */}
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between text-[10px] font-mono text-zinc-300 opacity-90 group-hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-1 text-amber-300">
            <span>Tap to open offer</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </span>
          <span className="text-zinc-500">{isMuted ? 'Audio Muted' : 'Sound ON'}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Top In-Flow Banner placed cleanly BELOW Language Bar & Header.
 * Automatically alternates between Adsterra (728x90/320x50) and HilltopAds (300x100).
 */
export const TopBannerAd: React.FC = () => {
  return (
    <aside
      aria-label="Top Sponsored Banner"
      className="w-full max-w-5xl mx-auto mb-5 rounded-2xl bg-[#0e101c] border border-zinc-800/90 px-3 py-2.5 flex flex-col items-center justify-center gap-1 shadow-lg"
    >
      <div className="w-full flex items-center justify-center min-h-[104px]">
        <DualNetworkBannerFrame
          slotId="top-flow"
          slotIndex={0}
          preferFormat="wide"
          title="Top Banner Advertisement"
        />
      </div>
    </aside>
  );
};

/**
 * Inline Video Ad Pair (1-2 Compact Real Commercial Videos with 2-Second Skip).
 */
export const InlineVideoAdPair: React.FC<{ sectionId: string }> = ({ sectionId }) => {
  return (
    <section
      aria-label="Featured Video Ads"
      className="w-full max-w-5xl mx-auto my-4 grid grid-cols-1 md:grid-cols-2 gap-3.5"
    >
      <SkippableVideoAdUnit slotId={`${sectionId}-vid-1`} compact startIndex={0} />
      <SkippableVideoAdUnit slotId={`${sectionId}-vid-2`} compact startIndex={1} />
    </section>
  );
};

/**
 * Large Full-Width Center Showcase Image Banner.
 * Features Adsterra and HilltopAds side-by-side or rotating.
 */
export const FullWidthShowcaseAd: React.FC<{ slotId: string }> = ({ slotId }) => {
  return (
    <aside
      aria-label="Full-Width Sponsored Showcase"
      className="col-span-full w-full mx-auto my-3 rounded-2xl bg-gradient-to-b from-[#111528] to-[#0b0d17] border border-amber-500/25 p-4 sm:p-5 shadow-2xl flex flex-col items-center justify-center gap-3"
    >
      <div className="w-full flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400/80">
          Featured Sponsor Spotlight
        </span>
        <span className="text-[10px] font-mono text-zinc-500">Dual Network Live</span>
      </div>
      <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-6 w-full flex items-center justify-center rounded-xl bg-[#07080f] border border-zinc-800/80 p-2 min-h-[120px]">
          <DualNetworkBannerFrame
            slotId={`${slotId}-wide`}
            slotIndex={0}
            preferFormat="wide"
            title={`Full-Width Showcase Wide ${slotId}`}
          />
        </div>
        <div className="md:col-span-6 w-full flex items-center justify-center rounded-xl bg-[#07080f] border border-zinc-800/80 p-2 min-h-[260px]">
          <DualNetworkBannerFrame
            slotId={`${slotId}-square`}
            slotIndex={1}
            preferFormat="square"
            title={`Full-Width Showcase Feature ${slotId}`}
          />
        </div>
      </div>
    </aside>
  );
};

/**
 * Centered In-Feed Banner Card placed between items.
 * Alternates between Adsterra and HilltopAds (300x250 / 728x90).
 */
export const InFeedBannerAd: React.FC<{
  slotId: string;
  slotIndex?: number;
  size?: 'auto' | 'large' | 'wide';
}> = ({ slotId, slotIndex = 0, size = 'auto' }) => {
  const preferFormat = size === 'large' ? 'square' : size === 'wide' ? 'wide' : 'banner';

  return (
    <aside
      aria-label="In-Feed Sponsored Card"
      className="col-span-full w-full max-w-4xl mx-auto my-2.5 rounded-2xl bg-[#0e101c] border border-zinc-800/90 p-3 sm:p-4 shadow-xl flex flex-col items-center justify-center gap-2"
    >
      <div className="w-full flex items-center justify-center min-h-[110px]">
        <DualNetworkBannerFrame
          slotId={slotId}
          slotIndex={slotIndex}
          preferFormat={preferFormat}
          title={`Sponsored Banner ${slotId}`}
        />
      </div>
    </aside>
  );
};

/**
 * Non-blocking 2-Second In-Page Video Ad Overlay.
 * Triggered on option selections: plays the REAL commercial video with sound controls,
 * auto-closes after 2 seconds or on skip, with direct link to sponsor.
 */
export const TwoSecondVideoBreakOverlay: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [msLeft, setMsLeft] = useState<number>(2200);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [videoSrc, setVideoSrc] = useState<string>(VERIFIED_VAST_COMMERCIALS[0]);
  const [clickThrough, setClickThrough] = useState<string>(HILLTOP_CONFIG.vastVideoFeedUrl);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setMsLeft(2200);

    fetchLiveVastData().then((data) => {
      if (data?.allVideoUrls && data.allVideoUrls.length > 0) {
        const randomVid = data.allVideoUrls[Math.floor(Math.random() * data.allVideoUrls.length)];
        setVideoSrc(randomVid);
        setClickThrough(data.clickThrough || HILLTOP_CONFIG.vastVideoFeedUrl);
      }
    });

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

  const secondsLeft = Math.max(1, Math.ceil(msLeft / 1000));
  const pct = Math.min(100, Math.max(0, ((2200 - msLeft) / 2200) * 100));

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => {
      const next = !prev;
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  };

  const handleOpenClick = () => {
    if (typeof window !== 'undefined' && clickThrough) {
      window.open(clickThrough, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="In-Page 2-Second Video Ad"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#0e101c] border border-amber-500/40 p-4 shadow-2xl space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>COMMERCIAL BREAK • {secondsLeft}s</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow-md"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Skip</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-amber-400 transition-all duration-75" style={{ width: `${pct}%` }} />
        </div>

        {/* Real Video Player Container */}
        <div
          onClick={handleOpenClick}
          className="relative w-full rounded-xl bg-black border border-zinc-800 overflow-hidden flex items-center justify-center min-h-[220px] max-h-[300px] cursor-pointer group"
        >
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted={isMuted}
            playsInline
            loop
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between text-xs font-mono text-zinc-300 opacity-90 group-hover:opacity-100 transition-opacity">
            <span className="flex items-center gap-1 text-amber-300 font-bold">
              <span>Open Sponsor Offer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
            <span className="text-zinc-400">{isMuted ? 'Muted' : 'Audio On'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Floating Corner Mini Video Ad (Desktop)
 */
export const FloatingMiniVideoAd: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(true);
  if (!visible) return null;

  return (
    <div
      aria-label="Floating Mini Video Ad"
      className="hidden sm:block fixed bottom-4 right-4 z-30 w-[280px] shadow-2xl"
    >
      <SkippableVideoAdUnit
        slotId="floating-mini-vid"
        compact
        startIndex={2}
        onDismiss={() => setVisible(false)}
      />
    </div>
  );
};

/**
 * Bottom In-Flow Banner placed cleanly above bottom navigation.
 * Alternates between HilltopAds (300x100 / 300x250) and Adsterra.
 */
export const BottomBannerAd: React.FC = () => {
  return (
    <aside
      aria-label="Bottom Sponsored Banner"
      className="w-full max-w-5xl mx-auto mt-8 rounded-2xl bg-[#0e101c] border border-zinc-800/90 px-3 py-3 flex flex-col items-center justify-center gap-1 shadow-lg"
    >
      <div className="w-full flex items-center justify-center min-h-[104px]">
        <DualNetworkBannerFrame
          slotId="bottom-flow"
          slotIndex={1}
          preferFormat="wide"
          title="Bottom Banner Advertisement"
        />
      </div>
    </aside>
  );
};
