/**
 * Helpers for smooth standalone Website + Mobile App WebView compatibility:
 * - Safe embedded WebView detection
 * - Resilient localStorage JSON persistence with QuotaExceeded fallback
 * - Multi-strategy local file download / native WebView Share Sheet export
 */

export function isEmbeddedWebView(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  try {
    const ua = navigator.userAgent || '';
    const isAndroidWv = /; wv\)/i.test(ua) || /\bVersion\/[\d.]+.*Chrome\/[\d.]+ Mobile/i.test(ua) && /\bwv\b/i.test(ua);
    const isIos = /iP(hone|ad|od)/i.test(ua);
    const isIosWebView = isIos && !/Safari/i.test(ua);
    const hasReactNativeBridge = Boolean(
      (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView ||
        (window as unknown as { AndroidInterface?: unknown }).AndroidInterface ||
        (window as unknown as { webkit?: { messageHandlers?: unknown } }).webkit?.messageHandlers
    );
    return Boolean(isAndroidWv || isIosWebView || hasReactNativeBridge);
  } catch {
    return false;
  }
}

export function safeSetLocalStorage(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeGetLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Triggers a clean browser / WebView file download without calling window.open or window.alert.
 */
export function triggerLocalBlobDownload(url: string, filename: string): boolean {
  if (typeof document === 'undefined' || !url) return false;
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      try {
        if (link.parentNode) link.parentNode.removeChild(link);
      } catch {}
    }, 800);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks whether native OS Share Sheet with media File is available (works smoothly in mobile browsers & WebViews).
 */
export function canShareMediaFile(filename: string, mimeType = 'video/mp4'): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof File === 'undefined') {
    return false;
  }
  if (typeof navigator.canShare !== 'function') {
    return true;
  }
  try {
    const probe = new File([new Uint8Array([0])], filename, { type: mimeType });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export async function shareMediaBlobToDevice(
  blobUrl: string,
  filename: string,
  mimeType = 'video/mp4'
): Promise<'shared' | 'downloaded' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof File !== 'undefined') {
      const resp = await fetch(blobUrl);
      const blob = await resp.blob();
      const file = new File([blob], filename, { type: blob.type || mimeType });
      if (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
        });
        return 'shared';
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return 'downloaded';
    }
  }

  const ok = triggerLocalBlobDownload(blobUrl, filename);
  return ok ? 'downloaded' : 'failed';
}
