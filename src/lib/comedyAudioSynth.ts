// ============================================================================
// COMEDY, ANIMAL, BIRD, NATURE & CINEMA WEB AUDIO SYNTHESIZER
// Generates crisp, expressive audio buffers & cached WAV blobs for instant
// preview, timeline playback sync, and MP4 export muxing.
// ============================================================================

export type AudioSynthKind =
  | 'comedy'
  | 'comedy_chase'
  | 'comedy_ukulele'
  | 'comedy_whistle'
  | 'meme_boom'
  | 'sad_violin'
  | 'laugh_burst'
  | 'giggle_chuckle'
  | 'cat_meow'
  | 'cat_cry'
  | 'cat_purr'
  | 'dog_bark'
  | 'duck_quack'
  | 'goat_scream'
  | 'rooster_crow'
  | 'frog_croak'
  | 'bird_chirp'
  | 'bird_owl'
  | 'bird_cuckoo'
  | 'bird_crow'
  | 'bird_jungle'
  | 'thunder_crack'
  | 'rain_downpour'
  | 'wind_howl'
  | 'cartoon_boing'
  | 'cartoon_slip'
  | 'cartoon_bonk'
  | 'clown_horn'
  | 'trombone_fail'
  | 'pop_cork'
  | 'cinematic'
  | 'lofi'
  | 'trailer'
  | 'electronic'
  | 'upbeat'
  | 'music_horror'
  | 'music_romance'
  | 'music_malayalam'
  | 'music_birthday'
  | 'music_action_brass'
  | 'music_hiphop'
  | 'sfx_whoosh'
  | 'sfx_glass_break'
  | 'sfx_fire_burn'
  | 'sfx_punch_impact'
  | 'sfx_gunshot';

function createNoiseBuffer(ctx: BaseAudioContext, durSec: number): AudioBuffer {
  const sr = ctx.sampleRate || 44100;
  const len = Math.max(256, Math.floor(sr * durSec));
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i += 1) {
    const white = Math.random() * 2 - 1;
    // Slight pink-ish smoothing
    last = (last + 0.08 * white) / 1.08;
    data[i] = white * 0.55 + last * 1.4;
  }
  return buf;
}

/**
 * Schedules expressive synthesis onto any BaseAudioContext (AudioContext or OfflineAudioContext).
 * Returns the scheduled clip duration in seconds.
 */
export function scheduleSynthPreset(
  ctx: BaseAudioContext,
  dest: AudioNode,
  preset: AudioSynthKind,
  requestedDurSec: number,
  seed = 0,
  startAt = 0
): number {
  const dur = Math.max(0.8, Math.min(12, requestedDurSec));
  const pitchShift = 1 + (((seed % 7) - 3) * 0.035);
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.85, startAt);
  master.connect(dest);

  const osc = (type: OscillatorType, freq: number, t0: number, t1: number, gainAmt = 0.25) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(24, freq * pitchShift), t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gainAmt), t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, Math.max(t0 + 0.04, t1));
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t1 + 0.02);
    return { o, g };
  };

  switch (preset) {
    case 'cat_meow':
    case 'cat_cry': {
      const count = preset === 'cat_cry' ? 3 : 2;
      const step = Math.min(1.4, dur / count);
      for (let i = 0; i < count; i += 1) {
        const t = startAt + i * step;
        const o = ctx.createOscillator();
        const filt = ctx.createBiquadFilter();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        const baseF = (preset === 'cat_cry' ? 520 : 410) * pitchShift;
        o.frequency.setValueAtTime(baseF * 0.85, t);
        o.frequency.exponentialRampToValueAtTime(baseF * 1.55, t + step * 0.28);
        o.frequency.exponentialRampToValueAtTime(baseF * (preset === 'cat_cry' ? 0.68 : 0.78), t + step * 0.9);
        filt.type = 'bandpass';
        filt.Q.value = 3.2;
        filt.frequency.setValueAtTime(900, t);
        filt.frequency.exponentialRampToValueAtTime(1650, t + step * 0.3);
        filt.frequency.exponentialRampToValueAtTime(750, t + step * 0.9);

        if (preset === 'cat_cry') {
          const lfo = ctx.createOscillator();
          const lfoG = ctx.createGain();
          lfo.frequency.value = 9.5;
          lfoG.gain.value = 26;
          lfo.connect(lfoG);
          lfoG.connect(o.frequency);
          lfo.start(t);
          lfo.stop(t + step);
        }

        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.32, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t + step * 0.94);
        o.connect(filt);
        filt.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + step);
      }
      return dur;
    }

    case 'cat_purr': {
      const o = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = 28 * pitchShift;
      lfo.type = 'sine';
      lfo.frequency.value = 25;
      lfoG.gain.value = 0.14;
      g.gain.value = 0.22;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      o.connect(g);
      g.connect(master);
      o.start(startAt);
      lfo.start(startAt);
      o.stop(startAt + dur);
      lfo.stop(startAt + dur);
      return dur;
    }

    case 'dog_bark': {
      const barks = Math.max(2, Math.min(4, Math.floor(dur / 0.45)));
      for (let i = 0; i < barks; i += 1) {
        const t = startAt + i * 0.42;
        const { o } = osc('sawtooth', 260, t, t + 0.19, 0.32);
        o.frequency.exponentialRampToValueAtTime(115 * pitchShift, t + 0.18);
      }
      return dur;
    }

    case 'duck_quack': {
      const qCount = Math.max(2, Math.min(5, Math.floor(dur / 0.35)));
      for (let i = 0; i < qCount; i += 1) {
        const t = startAt + i * 0.32;
        const o = ctx.createOscillator();
        const filt = ctx.createBiquadFilter();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(360 * pitchShift, t);
        o.frequency.exponentialRampToValueAtTime(280 * pitchShift, t + 0.16);
        filt.type = 'bandpass';
        filt.frequency.value = 1150;
        filt.Q.value = 4.5;
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.36, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.connect(filt);
        filt.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + 0.2);
      }
      return dur;
    }

    case 'goat_scream': {
      const o = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      const filt = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(420 * pitchShift, startAt);
      o.frequency.linearRampToValueAtTime(510 * pitchShift, startAt + dur * 0.3);
      o.frequency.linearRampToValueAtTime(340 * pitchShift, startAt + dur);
      lfo.frequency.value = 17;
      lfoG.gain.value = 45;
      lfo.connect(lfoG);
      lfoG.connect(o.frequency);
      filt.type = 'bandpass';
      filt.frequency.value = 1300;
      filt.Q.value = 2.4;
      g.gain.setValueAtTime(0.001, startAt);
      g.gain.exponentialRampToValueAtTime(0.34, startAt + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, startAt + dur * 0.95);
      o.connect(filt);
      filt.connect(g);
      g.connect(master);
      o.start(startAt);
      lfo.start(startAt);
      o.stop(startAt + dur);
      lfo.stop(startAt + dur);
      return dur;
    }

    case 'rooster_crow': {
      const notes = [520, 660, 790, 740, 620];
      notes.forEach((f, idx) => {
        const t = startAt + idx * 0.26;
        const len = idx === notes.length - 1 ? 0.55 : 0.2;
        osc('sawtooth', f, t, t + len, 0.22);
      });
      return dur;
    }

    case 'frog_croak': {
      const hops = Math.max(2, Math.floor(dur / 0.5));
      for (let i = 0; i < hops; i += 1) {
        const t = startAt + i * 0.5;
        const { o } = osc('square', 95, t, t + 0.16, 0.2);
        o.frequency.exponentialRampToValueAtTime(165 * pitchShift, t + 0.14);
      }
      return dur;
    }

    case 'bird_chirp':
    case 'bird_jungle': {
      const chirps = Math.max(4, Math.floor(dur * 3));
      for (let i = 0; i < chirps; i += 1) {
        const t = startAt + (i * dur) / chirps;
        const base = (1900 + ((i * 370 + seed * 130) % 1600)) * pitchShift;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(base, t);
        o.frequency.exponentialRampToValueAtTime(base * 1.45, t + 0.05);
        o.frequency.exponentialRampToValueAtTime(base * 0.92, t + 0.12);
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + 0.14);
      }
      return dur;
    }

    case 'bird_cuckoo': {
      const pairs = Math.max(1, Math.floor(dur / 1.1));
      for (let i = 0; i < pairs; i += 1) {
        const t = startAt + i * 1.1;
        osc('sine', 698, t, t + 0.16, 0.26);
        osc('sine', 554, t + 0.22, t + 0.45, 0.28);
      }
      return dur;
    }

    case 'bird_owl': {
      const calls = Math.max(1, Math.floor(dur / 1.4));
      for (let i = 0; i < calls; i += 1) {
        const t = startAt + i * 1.4;
        osc('sine', 380, t, t + 0.22, 0.25);
        osc('sine', 350, t + 0.34, t + 0.85, 0.28);
      }
      return dur;
    }

    case 'bird_crow': {
      const caws = Math.max(2, Math.floor(dur / 0.7));
      for (let i = 0; i < caws; i += 1) {
        const t = startAt + i * 0.68;
        const { o } = osc('sawtooth', 480, t, t + 0.32, 0.22);
        o.frequency.linearRampToValueAtTime(340 * pitchShift, t + 0.3);
      }
      return dur;
    }

    case 'thunder_crack':
    case 'rain_downpour':
    case 'wind_howl': {
      const nBuf = createNoiseBuffer(ctx, dur);
      const src = ctx.createBufferSource();
      src.buffer = nBuf;
      const filt = ctx.createBiquadFilter();
      const g = ctx.createGain();
      if (preset === 'thunder_crack') {
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(1600, startAt);
        filt.frequency.exponentialRampToValueAtTime(110, startAt + Math.min(2.2, dur));
        g.gain.setValueAtTime(0.65, startAt);
        g.gain.exponentialRampToValueAtTime(0.05, startAt + dur);
        // Sub-bass boom
        const { o } = osc('sine', 90, startAt, startAt + Math.min(1.6, dur), 0.55);
        o.frequency.exponentialRampToValueAtTime(32, startAt + Math.min(1.5, dur));
      } else if (preset === 'rain_downpour') {
        filt.type = 'bandpass';
        filt.frequency.value = 1400 * pitchShift;
        filt.Q.value = 0.65;
        g.gain.setValueAtTime(0.001, startAt);
        g.gain.linearRampToValueAtTime(0.28, startAt + 0.3);
        g.gain.setValueAtTime(0.26, startAt + Math.max(0.35, dur - 0.3));
        g.gain.linearRampToValueAtTime(0.001, startAt + dur);
      } else {
        filt.type = 'bandpass';
        filt.Q.value = 3.6;
        filt.frequency.setValueAtTime(320, startAt);
        filt.frequency.linearRampToValueAtTime(760, startAt + dur * 0.45);
        filt.frequency.linearRampToValueAtTime(260, startAt + dur);
        g.gain.setValueAtTime(0.001, startAt);
        g.gain.linearRampToValueAtTime(0.32, startAt + 0.35);
        g.gain.linearRampToValueAtTime(0.001, startAt + dur);
      }
      src.connect(filt);
      filt.connect(g);
      g.connect(master);
      src.start(startAt);
      src.stop(startAt + dur);
      return dur;
    }

    case 'cartoon_boing': {
      const o = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(180 * pitchShift, startAt);
      o.frequency.exponentialRampToValueAtTime(640 * pitchShift, startAt + 0.22);
      o.frequency.exponentialRampToValueAtTime(280 * pitchShift, startAt + dur * 0.9);
      lfo.frequency.value = 18;
      lfoG.gain.value = 65;
      lfo.connect(lfoG);
      lfoG.connect(o.frequency);
      g.gain.setValueAtTime(0.001, startAt);
      g.gain.exponentialRampToValueAtTime(0.36, startAt + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, startAt + Math.min(1.4, dur));
      o.connect(g);
      g.connect(master);
      o.start(startAt);
      lfo.start(startAt);
      o.stop(startAt + dur);
      lfo.stop(startAt + dur);
      return dur;
    }

    case 'cartoon_slip': {
      const { o } = osc('sine', 380, startAt, startAt + Math.min(1.1, dur), 0.32);
      o.frequency.exponentialRampToValueAtTime(1450 * pitchShift, startAt + 0.35);
      o.frequency.exponentialRampToValueAtTime(190 * pitchShift, startAt + Math.min(0.95, dur));
      return dur;
    }

    case 'cartoon_bonk': {
      const { o } = osc('triangle', 320, startAt, startAt + 0.28, 0.5);
      o.frequency.exponentialRampToValueAtTime(125 * pitchShift, startAt + 0.14);
      osc('sine', 520, startAt, startAt + 0.12, 0.25);
      return dur;
    }

    case 'clown_horn': {
      [0, 0.28].forEach((off) => {
        const t = startAt + off;
        osc('sawtooth', 392, t, t + 0.2, 0.24);
        osc('sawtooth', 494, t, t + 0.2, 0.18);
      });
      return dur;
    }

    case 'trombone_fail': {
      const seq = [
        { f: 293.66, d: 0.36 },
        { f: 277.18, d: 0.36 },
        { f: 261.63, d: 0.36 },
        { f: 246.94, d: 0.95 },
      ];
      let cur = startAt;
      seq.forEach((n, idx) => {
        const { o } = osc('sawtooth', n.f, cur, cur + n.d, 0.22);
        if (idx === 3) {
          o.frequency.linearRampToValueAtTime(n.f * 0.88 * pitchShift, cur + n.d);
        }
        cur += n.d + 0.04;
      });
      return dur;
    }

    case 'pop_cork': {
      const { o } = osc('sine', 240, startAt, startAt + 0.14, 0.45);
      o.frequency.exponentialRampToValueAtTime(920 * pitchShift, startAt + 0.08);
      return dur;
    }

    case 'sad_violin': {
      const notes = [440, 415.3, 392, 349.23];
      const step = Math.min(0.95, dur / notes.length);
      notes.forEach((f, idx) => {
        const t = startAt + idx * step;
        const o = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoG = ctx.createGain();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = f * pitchShift;
        lfo.frequency.value = 6.2;
        lfoG.gain.value = 7;
        lfo.connect(lfoG);
        lfoG.connect(o.frequency);
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.2, t + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + step * 0.95);
        o.connect(g);
        g.connect(master);
        o.start(t);
        lfo.start(t);
        o.stop(t + step);
        lfo.stop(t + step);
      });
      return dur;
    }

    case 'laugh_burst':
    case 'giggle_chuckle': {
      const bursts = preset === 'giggle_chuckle' ? 6 : 5;
      const step = Math.min(0.24, dur / bursts);
      for (let i = 0; i < bursts; i += 1) {
        const t = startAt + i * step;
        const f = (preset === 'giggle_chuckle' ? 540 : 340) - i * 18;
        osc('sawtooth', f, t, t + step * 0.65, 0.2);
      }
      return dur;
    }

    case 'meme_boom':
    case 'sfx_punch_impact': {
      const { o } = osc('sine', 150, startAt, startAt + Math.min(1.4, dur), 0.65);
      o.frequency.exponentialRampToValueAtTime(34, startAt + 0.45);
      return dur;
    }

    case 'sfx_glass_break':
    case 'sfx_gunshot':
    case 'sfx_fire_burn':
    case 'sfx_whoosh': {
      const nBuf = createNoiseBuffer(ctx, dur);
      const src = ctx.createBufferSource();
      src.buffer = nBuf;
      const filt = ctx.createBiquadFilter();
      const g = ctx.createGain();
      if (preset === 'sfx_glass_break') {
        filt.type = 'highpass';
        filt.frequency.value = 2200;
        g.gain.setValueAtTime(0.5, startAt);
        g.gain.exponentialRampToValueAtTime(0.001, startAt + Math.min(1.1, dur));
        [2400, 3150, 4100].forEach((f, idx) => osc('sine', f, startAt + idx * 0.04, startAt + 0.4, 0.16));
      } else if (preset === 'sfx_gunshot') {
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(3500, startAt);
        filt.frequency.exponentialRampToValueAtTime(180, startAt + 0.35);
        g.gain.setValueAtTime(0.7, startAt);
        g.gain.exponentialRampToValueAtTime(0.001, startAt + Math.min(0.8, dur));
      } else if (preset === 'sfx_fire_burn') {
        filt.type = 'bandpass';
        filt.frequency.value = 680;
        filt.Q.value = 0.8;
        g.gain.setValueAtTime(0.28, startAt);
        g.gain.exponentialRampToValueAtTime(0.02, startAt + dur);
      } else {
        filt.type = 'bandpass';
        filt.frequency.setValueAtTime(280, startAt);
        filt.frequency.exponentialRampToValueAtTime(1800, startAt + dur * 0.45);
        filt.frequency.exponentialRampToValueAtTime(220, startAt + dur);
        g.gain.setValueAtTime(0.01, startAt);
        g.gain.exponentialRampToValueAtTime(0.4, startAt + dur * 0.4);
        g.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
      }
      src.connect(filt);
      filt.connect(g);
      g.connect(master);
      src.start(startAt);
      src.stop(startAt + dur);
      return dur;
    }

    case 'music_horror': {
      // Eerie sub-bass drone + dissonant tritone strings + slow heartbeat pulse + high ghost chime
      osc('sine', 55, startAt, startAt + dur, 0.34);
      osc('sawtooth', 77.78, startAt, startAt + dur, 0.09); // dissonant minor/tritone tension
      const beats = Math.max(2, Math.floor(dur / 0.9));
      for (let i = 0; i < beats; i += 1) {
        const t = startAt + i * 0.9;
        const { o: thump } = osc('sine', 95, t, t + 0.25, 0.42);
        thump.frequency.exponentialRampToValueAtTime(34, t + 0.22);
        if (i % 2 === 1) {
          osc('sine', 1318.5 + (seed % 5) * 40, t + 0.15, t + 0.75, 0.08);
        }
      }
      return dur;
    }

    case 'music_romance': {
      // Lush cinematic piano/pad arpeggio progression (Cmaj7 -> Am7 -> Fmaj7 -> G6)
      const chords = [
        [261.63, 329.63, 392.0, 493.88],
        [220.0, 261.63, 329.63, 392.0],
        [174.61, 220.0, 261.63, 329.63],
        [196.0, 246.94, 293.66, 329.63],
      ];
      const step = 0.28;
      const steps = Math.max(4, Math.floor(dur / step));
      for (let i = 0; i < steps; i += 1) {
        const t = startAt + i * step;
        const ch = chords[Math.floor(i / 4) % chords.length];
        const note = ch[i % ch.length];
        osc('sine', note, t, t + 0.65, 0.2);
        if (i % 4 === 0) {
          osc('triangle', ch[0] * 0.5, t, t + 1.1, 0.18);
        }
      }
      return dur;
    }

    case 'music_malayalam': {
      // Energetic South-Indian mass rhythm + soaring pentatonic brass/synth hook
      const melody = [293.66, 349.23, 392.0, 440.0, 523.25, 440.0, 392.0, 349.23];
      const step = 0.19;
      const steps = Math.max(4, Math.floor(dur / step));
      for (let i = 0; i < steps; i += 1) {
        const t = startAt + i * step;
        if (i % 2 === 0) {
          const { o: drum } = osc('sine', 135, t, t + 0.14, 0.4);
          drum.frequency.exponentialRampToValueAtTime(46, t + 0.12);
        }
        const f = melody[(i + seed) % melody.length];
        osc('sawtooth', f, t, t + step * 0.85, 0.16);
        osc('triangle', f * 0.5, t, t + step * 0.9, 0.14);
      }
      return dur;
    }

    case 'music_birthday': {
      // Joyful Happy Birthday celebration melody + sparkling bell chimes
      const notes = [261.63, 261.63, 293.66, 261.63, 349.23, 329.63, 261.63, 261.63, 293.66, 261.63, 392.0, 349.23];
      const step = 0.34;
      const steps = Math.max(4, Math.floor(dur / step));
      for (let i = 0; i < steps; i += 1) {
        const t = startAt + i * step;
        const f = notes[i % notes.length];
        osc('triangle', f, t, t + step * 0.9, 0.24);
        osc('sine', f * 2, t, t + step * 0.45, 0.09);
      }
      return dur;
    }

    case 'music_action_brass':
    case 'trailer': {
      // Epic trailer impact drums + deep octave brass stabs
      const step = 0.25;
      const steps = Math.max(4, Math.floor(dur / step));
      const rootNotes = [110, 110, 130.81, 146.83, 110, 164.81, 146.83, 130.81];
      for (let i = 0; i < steps; i += 1) {
        const t = startAt + i * step;
        const f = rootNotes[(i + seed) % rootNotes.length];
        osc('sawtooth', f, t, t + step * 0.88, 0.2);
        osc('sawtooth', f * 1.5, t, t + step * 0.8, 0.12);
        if (i % 4 === 0) {
          const { o: boom } = osc('sine', 120, t, t + 0.32, 0.48);
          boom.frequency.exponentialRampToValueAtTime(34, t + 0.28);
        }
      }
      return dur;
    }

    case 'music_hiphop': {
      // Punchy 808 kick + hi-hat snap + dark trap synth progression
      const step = 0.22;
      const steps = Math.max(4, Math.floor(dur / step));
      const trapNotes = [196.0, 233.08, 261.63, 293.66, 233.08, 196.0];
      for (let i = 0; i < steps; i += 1) {
        const t = startAt + i * step;
        if (i % 4 === 0 || i % 8 === 5) {
          const { o: kick } = osc('sine', 110, t, t + 0.22, 0.46);
          kick.frequency.exponentialRampToValueAtTime(38, t + 0.18);
        }
        if (i % 2 === 1) {
          osc('square', 6400, t, t + 0.04, 0.05);
        }
        if (i % 2 === 0) {
          osc('triangle', trapNotes[(i + seed) % trapNotes.length], t, t + 0.36, 0.18);
        }
      }
      return dur;
    }

    case 'comedy':
    case 'comedy_chase':
    case 'comedy_ukulele':
    case 'comedy_whistle':
    case 'upbeat':
    default: {
      // Rhythmic bouncy comedy/upbeat/cinema loop
      const melody =
        preset === 'comedy_chase'
          ? [392, 440, 493.88, 523.25, 587.33, 523.25, 493.88, 440]
          : preset === 'comedy_whistle'
          ? [523.25, 659.25, 587.33, 783.99, 659.25, 523.25]
          : preset === 'lofi' || preset === 'cinematic'
          ? [220, 261.63, 329.63, 293.66, 246.94]
          : [261.63, 329.63, 392, 329.63, 440, 392, 349.23, 293.66];
      const step = preset === 'comedy_chase' ? 0.14 : preset === 'lofi' || preset === 'cinematic' ? 0.46 : 0.24;
      const steps = Math.max(4, Math.floor(dur / step));
      const wave: OscillatorType =
        preset === 'comedy_whistle' || preset === 'lofi'
          ? 'sine'
          : preset === 'electronic'
          ? 'sawtooth'
          : 'triangle';
      for (let i = 0; i < steps; i += 1) {
        const t = startAt + i * step;
        const f = melody[(i + seed) % melody.length];
        osc(wave, f, t, t + step * 0.85, 0.2);
        if (i % 4 === 0 && (preset === 'cinematic' || preset === 'lofi' || preset === 'upbeat')) {
          osc('sine', f * 0.5, t, t + step * 1.8, 0.15);
        }
      }
      return dur;
    }
  }
}

function encodeAudioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numCh = Math.min(2, buffer.numberOfChannels);
  const sr = buffer.sampleRate;
  const len = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const dataSize = len * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);

  const writeStr = (off: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(off + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < len; i += 1) {
    for (let ch = 0; ch < numCh; ch += 1) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([ab], { type: 'audio/wav' });
}

const presetWavUrlCache = new Map<string, string>();

/**
 * Renders and caches a real playable WAV blob URL for any AudioItem preset so it plays
 * seamlessly during timeline playback and mixes into WebCodecs MP4 export.
 */
export async function getOrRenderPresetWavUrl(
  preset: AudioSynthKind,
  durSec: number,
  seed = 0
): Promise<string | undefined> {
  if (typeof OfflineAudioContext === 'undefined') return undefined;
  const renderDur = Math.max(1.2, Math.min(8, durSec));
  const cacheKey = `${preset}:${renderDur.toFixed(1)}:${seed % 11}`;
  const existing = presetWavUrlCache.get(cacheKey);
  if (existing) return existing;

  try {
    const sr = 24000;
    const offline = new OfflineAudioContext(1, Math.ceil(sr * renderDur), sr);
    scheduleSynthPreset(offline, offline.destination, preset, renderDur, seed, 0);
    const rendered = await offline.startRendering();
    const blob = encodeAudioBufferToWavBlob(rendered);
    const url = URL.createObjectURL(blob);
    presetWavUrlCache.set(cacheKey, url);
    return url;
  } catch {
    return undefined;
  }
}
