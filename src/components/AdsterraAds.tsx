import React, { useEffect, useRef, useState } from 'react';

const POPUNDER_SRC = 'https://abscloud.org/1/258bc21406c0c2080700daaefc38766c';

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

type AdWindow = Window & {
  atOptions?: {
    key: string;
    format: string;
    height: number;
    width: number;
    params: Record<string, unknown>;
  };
};

/**
 * Dynamically injects and executes the Adsterra Popunder script on Generate click.
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
 * Persistent sticky bottom Adsterra banner across all pages:
 * - Mobile (<768px): 320x50
 * - Desktop (>=768px): 728x90
 */
export const StickyBottomAd: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
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
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    container.innerHTML = '';

    const bannerConfig = isDesktop ? DESKTOP_BANNER : MOBILE_BANNER;

    // Set window.atOptions immediately and via inline script for Adsterra's loader
    (window as AdWindow).atOptions = {
      key: bannerConfig.key,
      format: bannerConfig.format,
      height: bannerConfig.height,
      width: bannerConfig.width,
      params: bannerConfig.params,
    };

    const configScript = document.createElement('script');
    configScript.type = 'text/javascript';
    configScript.text = `atOptions = ${JSON.stringify({
      key: bannerConfig.key,
      format: bannerConfig.format,
      height: bannerConfig.height,
      width: bannerConfig.width,
      params: bannerConfig.params,
    })};`;

    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = bannerConfig.src;
    invokeScript.async = false;

    if (!cancelled) {
      container.appendChild(configScript);
      container.appendChild(invokeScript);
    }

    return () => {
      cancelled = true;
      container.innerHTML = '';
    };
  }, [isDesktop]);

  return (
    <aside
      aria-label="Advertisement Banner"
      className="fixed bottom-0 left-0 right-0 w-full z-[9999] bg-[#07080d]/95 border-t border-zinc-800/80 backdrop-blur-md flex items-center justify-center py-0.5 shadow-[0_-4px_20px_rgba(0,0,0,0.65)]"
    >
      <div
        ref={containerRef}
        className={`flex items-center justify-center overflow-hidden mx-auto ${
          isDesktop ? 'w-[728px] h-[90px] max-w-full' : 'w-[320px] h-[50px] max-w-full'
        }`}
      />
    </aside>
  );
};
