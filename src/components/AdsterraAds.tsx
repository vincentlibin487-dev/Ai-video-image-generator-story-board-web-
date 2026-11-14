import React, { useEffect, useRef, useState } from 'react';

const MOBILE_BANNER = {
  key: '14df69c732a8a38670f754f6fcfba403',
  format: 'iframe',
  height: 50,
  width: 320,
  params: {},
  src: 'https://bauval.org/22/14df69c732a8a38670f754f6fcfba403',
};

const DESKTOP_BANNER = {
  key: '5f1ed3d25298d614ede7fc1d7dabb7b0',
  format: 'iframe',
  height: 90,
  width: 728,
  params: {},
  src: 'https://bauval.org/22/5f1ed3d25298d614ede7fc1d7dabb7b0',
};

/**
 * Renders an Adsterra banner inside a dedicated same-origin blank <iframe>
 * via `contentWindow.document.write()`.
 *
 * Why this fixes non-playing/blank banners:
 * 1. Unlike `srcdoc` (`about:srcdoc`), a blank same-origin iframe inherits the real
 *    site domain URL & Referer so Adsterra (`bauval.org`) serves real campaigns.
 * 2. Unlike dynamic `<script>` tags on the main page DOM, `document.write()` works
 *    100% synchronously inside the iframe without touching React DOM.
 * 3. Each slot has its own isolated `window.atOptions` with exact `params: {}` so
 *    multiple banners (Top, In-Feed between every 2 cards, Bottom) never collide.
 */
export const AdsterraSlotFrame: React.FC<{
  slotId: string;
  mode?: 'responsive' | 'wide-prefer-desktop' | 'mobile-compact';
  title?: string;
}> = ({ slotId, mode = 'responsive', title = 'Sponsored Banner' }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [inView, setInView] = useState<boolean>(false);
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

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateWidth);
      observer.observe(el);
    }

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
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
      observer?.disconnect();
      io?.disconnect();
    };
  }, []);

  const banner =
    mode === 'mobile-compact'
      ? MOBILE_BANNER
      : mode === 'wide-prefer-desktop'
      ? isDesktop || containerWidth >= 728
        ? DESKTOP_BANNER
        : MOBILE_BANNER
      : isDesktop
      ? DESKTOP_BANNER
      : MOBILE_BANNER;

  const safeWidth = Math.max(260, containerWidth);
  const scale = Math.min(1, safeWidth / banner.width);
  const scaledWidth = Math.floor(banner.width * scale);
  const scaledHeight = Math.floor(banner.height * scale);

  useEffect(() => {
    if (!inView) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentWindow?.document;
      if (!doc) return;

      const optionsJson = JSON.stringify({
        key: banner.key,
        format: banner.format,
        height: banner.height,
        width: banner.width,
        params: banner.params,
      });

      doc.open();
      doc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <base target="_top" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: ${banner.width}px;
        height: ${banner.height}px;
        overflow: hidden;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <script type="text/javascript">
      atOptions = ${optionsJson};
    </script>
    <script type="text/javascript" src="${banner.src}"></script>
  </body>
</html>`);
      doc.close();
    } catch {
      // Safe fallback if browser blocks iframe document write
    }
  }, [inView, banner.key, banner.height, banner.width, banner.src, slotId]);

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
        {inView && (
          <iframe
            ref={iframeRef}
            key={`${slotId}-${banner.key}`}
            title={title}
            scrolling="no"
            frameBorder="0"
            allow="autoplay; encrypted-media; picture-in-picture"
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
        <AdsterraSlotFrame slotId="top-flow" mode="responsive" title="Top Banner Advertisement" />
      </div>
    </aside>
  );
};

/**
 * Centered Card-Style Banner placed cleanly BETWEEN every 2 cards.
 * Generously sized container centering the image/banner ad clearly.
 */
export const InFeedBannerAd: React.FC<{ slotId: string }> = ({ slotId }) => {
  return (
    <aside
      aria-label="In-Feed Sponsored Card"
      className="col-span-full w-full max-w-4xl mx-auto my-2 rounded-2xl bg-[#0e101c] border border-zinc-800/90 p-3.5 sm:p-4 shadow-xl flex flex-col items-center justify-center gap-2"
    >
      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        Sponsored
      </span>
      <div className="w-full flex items-center justify-center rounded-xl bg-[#080910] border border-zinc-800/80 py-2 px-1 min-h-[58px] md:min-h-[98px]">
        <AdsterraSlotFrame
          slotId={slotId}
          mode="wide-prefer-desktop"
          title={`Centered Card Banner ${slotId}`}
        />
      </div>
    </aside>
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
        <AdsterraSlotFrame
          slotId="bottom-flow"
          mode="responsive"
          title="Bottom Banner Advertisement"
        />
      </div>
    </aside>
  );
};
