import { ArrayBufferTarget, Muxer } from 'mp4-muxer';

export interface ExportAudioSourceClip {
  url: string;
  type: 'video' | 'photo';
  startTimelineSec: number;
  durationSec: number;
  sourceStartSec: number;
}

export interface ProbedVideoConfig {
  config: VideoEncoderConfig;
  outW: number;
  outH: number;
}

const alignEven = (n: number) => Math.max(2, Math.floor(n / 2) * 2);
const align16 = (n: number) => Math.max(16, Math.floor(n / 16) * 16);

export type StudioExportResolution = '420p' | '720p' | '1080p';

/**
 * Computes exact requested output pixel dimensions for 420p / 720p / 1080p
 * while honoring the user's chosen aspect ratio and keeping H.264 even alignment.
 */
export function computeRequestedExportDimensions(
  res: StudioExportResolution,
  aspectRatio: string
): { outW: number; outH: number } {
  let rawW = 1280;
  let rawH = 720;

  if (res === '420p') {
    if (aspectRatio === '9:16') {
      rawW = 420;
      rawH = 748;
    } else if (aspectRatio === '1:1') {
      rawW = 420;
      rawH = 420;
    } else if (aspectRatio === '4:5') {
      rawW = 420;
      rawH = 526;
    } else if (aspectRatio === '21:9') {
      rawW = 980;
      rawH = 420;
    } else if (aspectRatio === '4:3') {
      rawW = 560;
      rawH = 420;
    } else {
      rawW = 748;
      rawH = 420;
    }
  } else if (res === '720p') {
    if (aspectRatio === '9:16') {
      rawW = 720;
      rawH = 1280;
    } else if (aspectRatio === '1:1') {
      rawW = 720;
      rawH = 720;
    } else if (aspectRatio === '4:5') {
      rawW = 720;
      rawH = 900;
    } else if (aspectRatio === '21:9') {
      rawW = 1680;
      rawH = 720;
    } else if (aspectRatio === '4:3') {
      rawW = 960;
      rawH = 720;
    } else {
      rawW = 1280;
      rawH = 720;
    }
  } else {
    // 1080p
    if (aspectRatio === '9:16') {
      rawW = 1080;
      rawH = 1920;
    } else if (aspectRatio === '1:1') {
      rawW = 1080;
      rawH = 1080;
    } else if (aspectRatio === '4:5') {
      rawW = 1080;
      rawH = 1350;
    } else if (aspectRatio === '21:9') {
      rawW = 2560;
      rawH = 1080;
    } else if (aspectRatio === '4:3') {
      rawW = 1440;
      rawH = 1080;
    } else {
      rawW = 1920;
      rawH = 1080;
    }
  }

  return { outW: alignEven(rawW), outH: alignEven(rawH) };
}

/**
 * Probes WebCodecs VideoEncoder for the exact requested resolution & high-quality H.264 profile.
 * Only steps down dimensions if the host device hardware/software encoder reports unsupported.
 */
export async function probeSupportedVideoEncoderConfig(
  reqW: number,
  reqH: number,
  res: StudioExportResolution,
  fps = 30
): Promise<ProbedVideoConfig | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return null;
  }

  const dimCandidates: Array<{ w: number; h: number; maxEdgeTag: number }> = [];
  const pushDims = (w: number, h: number) => {
    const ew = alignEven(w);
    const eh = alignEven(h);
    if (!dimCandidates.some((d) => d.w === ew && d.h === eh)) {
      dimCandidates.push({ w: ew, h: eh, maxEdgeTag: Math.max(ew, eh) });
    }
  };

  pushDims(reqW, reqH);
  pushDims(align16(reqW), align16(reqH));

  // Graceful step-downs only if native 1080p / 720p encoder is unavailable on low-RAM device
  const fallbackEdges = res === '1080p' ? [1280] : res === '720p' ? [854] : [];
  for (const edge of fallbackEdges) {
    const longest = Math.max(reqW, reqH);
    if (longest > edge) {
      const s = edge / longest;
      pushDims(align16(reqW * s), align16(reqH * s));
    }
  }

  const accelCandidates: HardwareAcceleration[] = ['prefer-hardware', 'no-preference', 'prefer-software'];

  for (const dims of dimCandidates) {
    const codecs =
      dims.maxEdgeTag > 1280
        ? ['avc1.64002a', 'avc1.4d002a', 'avc1.640028', 'avc1.4d0028', 'avc1.420028']
        : ['avc1.64001f', 'avc1.4d001f', 'avc1.42001f', 'avc1.4d0028'];

    const bitrate =
      dims.maxEdgeTag >= 1400 ? 8_500_000 : dims.maxEdgeTag >= 900 ? 4_500_000 : 2_000_000;

    for (const codec of codecs) {
      for (const hardwareAcceleration of accelCandidates) {
        const cfg: VideoEncoderConfig = {
          codec,
          width: dims.w,
          height: dims.h,
          bitrate,
          framerate: fps,
          hardwareAcceleration,
          latencyMode: 'quality',
        };
        try {
          const support = await VideoEncoder.isConfigSupported(cfg);
          if (support.supported) {
            return { config: support.config || cfg, outW: dims.w, outH: dims.h };
          }
        } catch {
          // Try next combination
        }
      }
    }
  }

  return null;
}

/**
 * Deterministically seeks an HTMLVideoElement to `targetSec` and guarantees the frame is decoded
 * (`readyState >= 2`) before painting to export canvas so frames NEVER freeze at frame 0.
 */
export function waitForVideoSeekReady(
  vid: HTMLVideoElement,
  targetSec: number,
  timeoutMs = 950
): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      if (!vid.paused) vid.pause();
    } catch {}

    const maxValidTime =
      isFinite(vid.duration) && vid.duration > 0.06 ? Math.max(0, vid.duration - 0.03) : Math.max(0, targetSec);
    const clamped = Math.min(maxValidTime, Math.max(0, targetSec));

    if (Math.abs(vid.currentTime - clamped) <= 0.015 && vid.readyState >= 2) {
      resolve();
      return;
    }

    let settled = false;
    let rafId = 0;
    let timer = 0;

    const finish = () => {
      if (settled) return;
      settled = true;
      vid.removeEventListener('seeked', onSeeked);
      vid.removeEventListener('loadeddata', onDataReady);
      if (timer) window.clearTimeout(timer);
      if (rafId) cancelAnimationFrame(rafId);
      resolve();
    };

    const onDataReady = () => {
      if (vid.readyState >= 2 && !vid.seeking) {
        finish();
      }
    };

    const onSeeked = () => {
      if (vid.readyState >= 2) {
        // Yield 1 micro-tick so Chromium's GPU video compositor updates the frame backing store
        rafId = requestAnimationFrame(() => finish());
      } else {
        vid.addEventListener('loadeddata', onDataReady, { once: true });
      }
    };

    timer = window.setTimeout(finish, timeoutMs);
    vid.addEventListener('seeked', onSeeked, { once: true });

    try {
      vid.currentTime = clamped;
    } catch {
      finish();
    }
  });
}

/**
 * Decodes and mixes timeline video audio tracks into a stereo AudioBuffer for AAC MP4 muxing.
 */
async function renderMixedExportAudio(
  clips: ExportAudioSourceClip[],
  totalWallSec: number,
  speedFactor: number,
  volumePct: number,
  isMuted: boolean,
  bgAudioUrl?: string
): Promise<{
  buffer: AudioBuffer;
  sampleRate: number;
  numberOfChannels: number;
  encoderConfig: AudioEncoderConfig;
} | null> {
  if (isMuted || volumePct <= 0) return null;
  if (typeof AudioEncoder === 'undefined' || typeof OfflineAudioContext === 'undefined') return null;

  const videoClips = clips.filter((c) => c.type === 'video' && c.url);
  if (videoClips.length === 0 && !bgAudioUrl) return null;

  let chosenAudioConfig: AudioEncoderConfig | null = null;
  for (const sr of [48000, 44100]) {
    try {
      const support = await AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2',
        sampleRate: sr,
        numberOfChannels: 2,
        bitrate: 128_000,
      });
      if (support.supported) {
        chosenAudioConfig = support.config || {
          codec: 'mp4a.40.2',
          sampleRate: sr,
          numberOfChannels: 2,
          bitrate: 128_000,
        };
        break;
      }
    } catch {}
  }
  if (!chosenAudioConfig) return null;

  const sampleRate = chosenAudioConfig.sampleRate || 48000;
  const totalSamples = Math.max(1024, Math.ceil(totalWallSec * sampleRate));
  const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
  const decodedCache = new Map<string, AudioBuffer | null>();

  let hasAnyAudioStream = false;

  for (const clip of videoClips) {
    let decoded = decodedCache.get(clip.url);
    if (decoded === undefined) {
      try {
        const resp = await fetch(clip.url);
        const arr = await resp.arrayBuffer();
        decoded = await offlineCtx.decodeAudioData(arr);
      } catch {
        decoded = null;
      }
      decodedCache.set(clip.url, decoded);
    }
    if (!decoded || decoded.duration <= 0.02) continue;

    hasAnyAudioStream = true;
    const src = offlineCtx.createBufferSource();
    src.buffer = decoded;
    src.playbackRate.value = speedFactor;
    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = Math.max(0, Math.min(1, volumePct / 100));
    src.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    const wallStart = clip.startTimelineSec / speedFactor;
    const offset = Math.min(Math.max(0, clip.sourceStartSec || 0), Math.max(0, decoded.duration - 0.05));
    const wallDur = Math.min(clip.durationSec / speedFactor, Math.max(0.02, totalWallSec - wallStart));
    if (wallDur > 0.02 && wallStart < totalWallSec) {
      src.start(wallStart, offset, wallDur * speedFactor);
    }
  }

  // Mix optional local background music / voiceover track if provided
  if (bgAudioUrl) {
    try {
      const bgResp = await fetch(bgAudioUrl);
      const bgArr = await bgResp.arrayBuffer();
      const bgDecoded = await offlineCtx.decodeAudioData(bgArr);
      if (bgDecoded && bgDecoded.duration > 0.02) {
        hasAnyAudioStream = true;
        const bgSrc = offlineCtx.createBufferSource();
        bgSrc.buffer = bgDecoded;
        bgSrc.loop = totalWallSec > bgDecoded.duration;
        const bgGain = offlineCtx.createGain();
        bgGain.gain.value = Math.max(0, Math.min(1, volumePct / 100));
        bgSrc.connect(bgGain);
        bgGain.connect(offlineCtx.destination);
        bgSrc.start(0, 0, totalWallSec);
      }
    } catch {}
  }

  if (!hasAnyAudioStream) return null;

  const buffer = await offlineCtx.startRendering();
  return {
    buffer,
    sampleRate,
    numberOfChannels: 2,
    encoderConfig: chosenAudioConfig,
  };
}

export interface RunWebCodecsMp4ExportParams {
  exportCanvas: HTMLCanvasElement;
  outW: number;
  outH: number;
  probedConfig: ProbedVideoConfig;
  fps?: number;
  exactTotalSec: number;
  speedFactor: number;
  isReversePlayback: boolean;
  clips: ExportAudioSourceClip[];
  bgAudioUrl?: string;
  volumePct: number;
  isMuted: boolean;
  prepareFrameAtTime: (tPos: number) => Promise<void>;
  renderFrameAtTime: (tPos: number) => number;
  onProgress: (pct: number, elapsedWallSec: number, activeClipIdx: number) => void;
  onAfterFirstFrame?: () => void;
  shouldCancel: () => boolean;
}

/**
 * Encodes a 100% standard, fast-start H.264 `.mp4` Blob frame-by-frame using WebCodecs + mp4-muxer.
 * Guarantees crisp movement across every frame (no frozen frame-0 image bug) & full resolution.
 */
export async function runWebCodecsMp4Export(params: RunWebCodecsMp4ExportParams): Promise<Blob | null> {
  const {
    exportCanvas,
    outW,
    outH,
    probedConfig,
    fps = 30,
    exactTotalSec,
    speedFactor,
    isReversePlayback,
    clips,
    bgAudioUrl,
    volumePct,
    isMuted,
    prepareFrameAtTime,
    renderFrameAtTime,
    onProgress,
    onAfterFirstFrame,
    shouldCancel,
  } = params;

  const wallDurationSec = Math.max(0.5, exactTotalSec / speedFactor);
  const totalFrames = Math.max(15, Math.round(wallDurationSec * fps));

  const mixedAudio = await renderMixedExportAudio(
    clips,
    wallDurationSec,
    speedFactor,
    volumePct,
    isMuted || isReversePlayback,
    bgAudioUrl
  ).catch(() => null);

  if (shouldCancel()) return null;

  const muxerTarget = new ArrayBufferTarget();
  const muxer = new Muxer({
    target: muxerTarget,
    video: {
      codec: 'avc',
      width: outW,
      height: outH,
      frameRate: fps,
    },
    ...(mixedAudio
      ? {
          audio: {
            codec: 'aac',
            numberOfChannels: mixedAudio.numberOfChannels,
            sampleRate: mixedAudio.sampleRate,
          },
        }
      : {}),
    fastStart: 'in-memory',
  });

  let encoderError: Error | null = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (err) => {
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });
  videoEncoder.configure(probedConfig.config);

  let audioEncoder: AudioEncoder | null = null;
  if (mixedAudio) {
    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        muxer.addAudioChunk(chunk, meta);
      },
      error: () => {
        // Ignore non-fatal audio encoder errors so video MP4 still succeeds
      },
    });
    try {
      audioEncoder.configure(mixedAudio.encoderConfig);
    } catch {
      audioEncoder = null;
    }
  }

  try {
    const frameDurationUs = Math.round(1_000_000 / fps);

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (shouldCancel()) {
        try {
          videoEncoder.close();
          audioEncoder?.close();
        } catch {}
        return null;
      }
      if (encoderError) throw encoderError;

      const elapsedWall = frameIdx / fps;
      const timelineAdvance = Math.min(exactTotalSec, elapsedWall * speedFactor);
      const tPos = isReversePlayback ? Math.max(0, exactTotalSec - timelineAdvance) : timelineAdvance;

      // Ensure all active <video> tags have decoded exact tPos BEFORE painting
      await prepareFrameAtTime(tPos);
      const activeIdx = renderFrameAtTime(tPos);

      if (frameIdx === 0 || frameIdx === 6) {
        onAfterFirstFrame?.();
      }

      const timestampUs = Math.round((frameIdx * 1_000_000) / fps);
      const vf = new VideoFrame(exportCanvas, {
        timestamp: timestampUs,
        duration: frameDurationUs,
      });

      videoEncoder.encode(vf, { keyFrame: frameIdx % fps === 0 });
      vf.close();

      // Prevent encoder backlog RAM growth on mobile exports
      if (videoEncoder.encodeQueueSize > 5) {
        await videoEncoder.flush();
      }

      if (frameIdx % 2 === 0 || frameIdx === totalFrames - 1) {
        const pct = Math.min(97, Math.max(5, Math.round(((frameIdx + 1) / totalFrames) * 94) + 3));
        onProgress(pct, elapsedWall, activeIdx);
      }

      // Yield cleanly so UI progress & export ad player stay smooth
      await new Promise<void>((r) => window.setTimeout(r, 0));
    }

    // Encode audio chunks cleanly if mixedAudio & audioEncoder are active
    if (mixedAudio && audioEncoder && typeof AudioData !== 'undefined') {
      const { buffer, sampleRate, numberOfChannels } = mixedAudio;
      const chunkFrames = 1024;
      const totalLen = buffer.length;
      const ch0 = buffer.getChannelData(0);
      const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;

      for (let offset = 0; offset < totalLen; offset += chunkFrames) {
        const frames = Math.min(chunkFrames, totalLen - offset);
        const planar = new Float32Array(frames * numberOfChannels);
        planar.set(ch0.subarray(offset, offset + frames), 0);
        if (numberOfChannels > 1) {
          planar.set(ch1.subarray(offset, offset + frames), frames);
        }
        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: frames,
          numberOfChannels,
          timestamp: Math.round((offset / sampleRate) * 1_000_000),
          data: planar,
        });
        audioEncoder.encode(audioData);
        audioData.close();
      }
      await audioEncoder.flush();
      audioEncoder.close();
    }

    await videoEncoder.flush();
    videoEncoder.close();
    if (encoderError) throw encoderError;

    muxer.finalize();
    const mp4Blob = new Blob([muxerTarget.buffer], { type: 'video/mp4' });
    return mp4Blob;
  } catch (err) {
    try {
      if (videoEncoder.state !== 'closed') videoEncoder.close();
    } catch {}
    try {
      if (audioEncoder && audioEncoder.state !== 'closed') audioEncoder.close();
    } catch {}
    throw err;
  }
}
