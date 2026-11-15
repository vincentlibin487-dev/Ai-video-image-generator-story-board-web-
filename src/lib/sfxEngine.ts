export type SfxCategory =
  | 'Whoosh & Transitions'
  | 'Cinematic Hits & Booms'
  | 'Crime & Thriller'
  | 'UI & Glitch'
  | 'Comedy & Pop'
  | 'Nature & Ambience'
  | 'Sci-Fi & Laser'
  | 'Musical Stings'
  | 'Foley & Action'
  | 'Horror & Dark';

export interface SfxDefinition {
  id: string;
  name: string;
  category: SfxCategory;
  durationSec: number;
  recipe:
    | 'whoosh'
    | 'boom'
    | 'riser'
    | 'glitch'
    | 'pop'
    | 'thunder'
    | 'laser'
    | 'chime'
    | 'heartbeat'
    | 'siren';
  baseFreq: number;
  endFreq: number;
  noiseMix: number;
  pulseCount?: number;
}

export type MusicCategory =
  | 'Cinema & Drama'
  | 'Thriller & Crime'
  | 'Reels & Upbeat'
  | 'Ambient & Calm';

export interface FreeMusicTrack {
  id: string;
  name: string;
  category: MusicCategory;
  bpm: number;
  durationSec: number;
  rootFreq: number;
  scaleIntervals: number[];
  mood: 'warm' | 'tense' | 'upbeat' | 'ambient';
}

export const SFX_CATEGORIES: Array<'All' | SfxCategory> = [
  'All',
  'Whoosh & Transitions',
  'Cinematic Hits & Booms',
  'Crime & Thriller',
  'UI & Glitch',
  'Comedy & Pop',
  'Nature & Ambience',
  'Sci-Fi & Laser',
  'Musical Stings',
  'Foley & Action',
  'Horror & Dark',
];

export const MUSIC_CATEGORIES: Array<'All' | MusicCategory> = [
  'All',
  'Cinema & Drama',
  'Thriller & Crime',
  'Reels & Upbeat',
  'Ambient & Calm',
];

const SFX_RECIPES: Array<{
  category: SfxCategory;
  prefix: string;
  recipe: SfxDefinition['recipe'] | ((i: number) => SfxDefinition['recipe']);
  names: string[];
  makeParams: (i: number) => Omit<SfxDefinition, 'id' | 'name' | 'category' | 'recipe'>;
}> = [
  {
    category: 'Whoosh & Transitions',
    prefix: 'wh',
    recipe: 'whoosh',
    names: [
      'Fast Air Whoosh', 'Deep Wind Swipe', 'Cinematic Whip', 'Silk Transition', 'Reverse Swoop',
      'Rocket Pass', 'Soft Slide', 'Turbo Whoosh', 'Knife Swish', 'Page Turn',
      'Phantom Pass', 'Heavy Swell', 'Air Cut', 'Quick Pan', 'Flash Swipe',
    ],
    makeParams: (i) => ({
      durationSec: Number((0.45 + (i % 5) * 0.18).toFixed(2)),
      baseFreq: 160 + (i % 6) * 90,
      endFreq: 950 + (i % 5) * 320,
      noiseMix: 0.78,
    }),
  },
  {
    category: 'Cinematic Hits & Booms',
    prefix: 'bm',
    recipe: 'boom',
    names: [
      'Sub Bass Boom', 'Trailer Impact', 'Mega Punch', 'Earthquake Drop', 'Metal Slam',
      'War Drum Hit', 'Deep Thud', 'Cinema Slam', 'Heavy Knock', 'Explosion Core',
      'Sub Drop 808', 'Dark Thump', 'Boss Arrival', 'Steel Gate', 'Titan Impact',
    ],
    makeParams: (i) => ({
      durationSec: Number((0.75 + (i % 4) * 0.28).toFixed(2)),
      baseFreq: 135 + (i % 5) * 28,
      endFreq: 32 + (i % 4) * 8,
      noiseMix: 0.35 + (i % 3) * 0.12,
    }),
  },
  {
    category: 'Crime & Thriller',
    prefix: 'cr',
    recipe: (i: number) => (i % 3 === 0 ? 'heartbeat' : i % 3 === 1 ? 'siren' : 'riser'),
    names: [
      'Heartbeat Fast', 'Tense Pulse', 'Police Siren Short', 'Crime Riser', 'Mystery Drone',
      'Clock Suspense', 'Dark Tension', 'Detective Reveal', 'Shadow Stalk', 'Emergency Alert',
      'Forensic Scan', 'Interrogation Hum', 'Chase Build', 'Panic Heart', 'Case Closed Hit',
    ],
    makeParams: (i) => ({
      durationSec: Number((1.1 + (i % 4) * 0.35).toFixed(2)),
      baseFreq: i % 3 === 1 ? 620 + (i % 4) * 80 : 58 + (i % 5) * 16,
      endFreq: i % 3 === 1 ? 880 + (i % 3) * 90 : 190 + (i % 5) * 65,
      noiseMix: 0.12,
      pulseCount: 2 + (i % 3),
    }),
  },
  {
    category: 'UI & Glitch',
    prefix: 'ui',
    recipe: 'glitch',
    names: [
      'Digital Glitch', 'Camera Shutter', 'Mouse Click', 'VHS Static', 'Cyber Zap',
      'Data Burst', 'Typewriter Key', 'Signal Drop', 'TV Static Cut', 'Error Buzz',
      'Notification Tap', 'Pixel Break', 'Neon Flicker', 'Tech Lock', 'Scanner Beep',
    ],
    makeParams: (i) => ({
      durationSec: Number((0.25 + (i % 5) * 0.12).toFixed(2)),
      baseFreq: 380 + (i % 7) * 180,
      endFreq: 120 + (i % 5) * 260,
      noiseMix: 0.48,
      pulseCount: 2 + (i % 4),
    }),
  },
  {
    category: 'Comedy & Pop',
    prefix: 'cp',
    recipe: 'pop',
    names: [
      'Bubble Pop', 'Cartoon Boing', 'Mouth Pluck', 'Happy Blip', 'Spring Bounce',
      'Rubber Squeak', 'Comic Jump', 'Slide Whistle', 'Sparkle Pop', 'Cheeky Plink',
      'Toy Horn', 'Snap Pop', 'Cork Pull', 'Bloop Up', 'Giggle Synth',
    ],
    makeParams: (i) => ({
      durationSec: Number((0.28 + (i % 4) * 0.12).toFixed(2)),
      baseFreq: 240 + (i % 6) * 75,
      endFreq: 720 + (i % 5) * 190,
      noiseMix: 0.06,
    }),
  },
  {
    category: 'Nature & Ambience',
    prefix: 'nt',
    recipe: 'thunder',
    names: [
      'Thunder Rumble', 'Heavy Monsoon Rain', 'Storm Gust', 'Ocean Wave', 'Forest Wind',
      'Night Crickets', 'Cave Echo', 'Waterfall Mist', 'Fire Crackle', 'Desert Breeze',
      'Distant Thunder', 'Mountain Gust', 'Rain Drops', 'Dark Storm', 'Midnight Breeze',
    ],
    makeParams: (i) => ({
      durationSec: Number((1.4 + (i % 4) * 0.4).toFixed(2)),
      baseFreq: 75 + (i % 5) * 35,
      endFreq: 42 + (i % 4) * 25,
      noiseMix: 0.85,
    }),
  },
  {
    category: 'Sci-Fi & Laser',
    prefix: 'sf',
    recipe: 'laser',
    names: [
      'Laser Blast', 'Space Warp', 'Reactor Charge', 'Teleport Beam', 'Alien Signal',
      'Holo Open', 'Hyperdrive', 'Plasma Shot', 'Drone Hum', 'Shield Up',
      'Quantum Zip', 'Matrix Sweep', 'Starship Pass', 'Cyber Shield', 'Neon Beam',
    ],
    makeParams: (i) => ({
      durationSec: Number((0.45 + (i % 5) * 0.18).toFixed(2)),
      baseFreq: 1100 + (i % 6) * 240,
      endFreq: 140 + (i % 4) * 90,
      noiseMix: 0.15,
    }),
  },
  {
    category: 'Musical Stings',
    prefix: 'ms',
    recipe: 'chime',
    names: [
      'Golden Chime', 'Success Ding', 'Level Up Chord', 'Cinema Piano Note', 'Bell Ring',
      'Trophy Sparkle', 'News Intro Sting', 'Dramatic Chord', 'Soft Harp', 'Crystal Ping',
      'Spotlight Swell', 'Award Fanfare', 'Magic Spark', 'Ending Chime', 'Sunrise Tone',
    ],
    makeParams: (i) => ({
      durationSec: Number((0.8 + (i % 4) * 0.3).toFixed(2)),
      baseFreq: 440 + (i % 8) * 65,
      endFreq: 660 + (i % 6) * 95,
      noiseMix: 0.02,
      pulseCount: 2 + (i % 2),
    }),
  },
  {
    category: 'Foley & Action',
    prefix: 'fl',
    recipe: (i: number) => (i % 2 === 0 ? 'whoosh' : 'boom'),
    names: [
      'Sword Draw', 'Cloth Rustle', 'Heavy Footstep', 'Door Slam', 'Glass Shatter Burst',
      'Car Engine Pass', 'Punch Whip', 'Gravel Step', 'Metal Clink', 'Rope Snap',
      'Paper Flip', 'Leather Hit', 'Wood Knock', 'Chain Drop', 'Shield Block',
    ],
    makeParams: (i) => ({
      durationSec: Number((0.4 + (i % 5) * 0.15).toFixed(2)),
      baseFreq: 210 + (i % 6) * 110,
      endFreq: 90 + (i % 4) * 120,
      noiseMix: 0.65,
    }),
  },
  {
    category: 'Horror & Dark',
    prefix: 'hr',
    recipe: (i: number) => (i % 2 === 0 ? 'riser' : 'heartbeat'),
    names: [
      'Ghost Whisper', 'Creepy Violin Slide', 'Nightmare Drone', 'Basement Breath', 'Sudden Scare',
      'Cursed Bell', 'Haunted Wind', 'Dark Whisper', 'Shadow Screamer', 'Dead Silence Hum',
      'Dungeon Echo', 'Evil Pulse', 'Midnight Knock', 'Chill Spine', 'Graveyard Breeze',
    ],
    makeParams: (i) => ({
      durationSec: Number((1.2 + (i % 4) * 0.35).toFixed(2)),
      baseFreq: 65 + (i % 5) * 32,
      endFreq: 310 + (i % 5) * 140,
      noiseMix: 0.42,
      pulseCount: 3,
    }),
  },
];

// 150 Built-in Real WebAudio Synthesized Sound Effects
export const SFX_LIBRARY: SfxDefinition[] = SFX_RECIPES.flatMap((group) =>
  group.names.map((name, idx) => {
    const resolvedRecipe =
      typeof group.recipe === 'function' ? group.recipe(idx) : group.recipe;
    return {
      id: `${group.prefix}_${idx + 1}`,
      name,
      category: group.category,
      recipe: resolvedRecipe,
      ...group.makeParams(idx),
    };
  })
);

// 24 Free Built-In Royalty-Free Background Music Scores (14s - 20s rich synth tracks!)
export const FREE_MUSIC_LIBRARY: FreeMusicTrack[] = [
  { id: 'bg_1', name: 'Kochi Rain Piano', category: 'Cinema & Drama', bpm: 78, durationSec: 16, rootFreq: 220, scaleIntervals: [0, 3, 7, 10, 12], mood: 'warm' },
  { id: 'bg_2', name: 'Mollywood Emotional Strings', category: 'Cinema & Drama', bpm: 72, durationSec: 18, rootFreq: 196, scaleIntervals: [0, 4, 7, 11, 14], mood: 'warm' },
  { id: 'bg_3', name: 'Sunset Love Ballad', category: 'Cinema & Drama', bpm: 84, durationSec: 16, rootFreq: 261.6, scaleIntervals: [0, 4, 7, 9, 12], mood: 'warm' },
  { id: 'bg_4', name: 'Director Story Theme', category: 'Cinema & Drama', bpm: 90, durationSec: 18, rootFreq: 246.9, scaleIntervals: [0, 3, 7, 12, 15], mood: 'warm' },
  { id: 'bg_5', name: 'Golden Hope Score', category: 'Cinema & Drama', bpm: 88, durationSec: 16, rootFreq: 293.6, scaleIntervals: [0, 4, 7, 11, 12], mood: 'warm' },
  { id: 'bg_6', name: 'Family Memories Keys', category: 'Cinema & Drama', bpm: 76, durationSec: 18, rootFreq: 174.6, scaleIntervals: [0, 4, 7, 9, 14], mood: 'warm' },

  { id: 'bg_7', name: 'Midnight Crime Tension', category: 'Thriller & Crime', bpm: 108, durationSec: 16, rootFreq: 110, scaleIntervals: [0, 1, 6, 7, 12], mood: 'tense' },
  { id: 'bg_8', name: 'Detective Chase Pulse', category: 'Thriller & Crime', bpm: 124, durationSec: 14, rootFreq: 130.8, scaleIntervals: [0, 3, 6, 10, 12], mood: 'tense' },
  { id: 'bg_9', name: 'Dark Alley Mystery', category: 'Thriller & Crime', bpm: 96, durationSec: 16, rootFreq: 98, scaleIntervals: [0, 2, 3, 7, 11], mood: 'tense' },
  { id: 'bg_10', name: 'Courtroom Countdown', category: 'Thriller & Crime', bpm: 116, durationSec: 15, rootFreq: 123.5, scaleIntervals: [0, 1, 5, 7, 12], mood: 'tense' },
  { id: 'bg_11', name: 'Forensic Suspense Bass', category: 'Thriller & Crime', bpm: 102, durationSec: 16, rootFreq: 116.5, scaleIntervals: [0, 3, 7, 8, 12], mood: 'tense' },
  { id: 'bg_12', name: 'Investigation Clock', category: 'Thriller & Crime', bpm: 120, durationSec: 14, rootFreq: 146.8, scaleIntervals: [0, 3, 6, 7, 12], mood: 'tense' },

  { id: 'bg_13', name: 'Viral Reels Synth Beat', category: 'Reels & Upbeat', bpm: 126, durationSec: 14, rootFreq: 261.6, scaleIntervals: [0, 4, 7, 10, 12], mood: 'upbeat' },
  { id: 'bg_14', name: 'Travel Vlog Groove', category: 'Reels & Upbeat', bpm: 118, durationSec: 15, rootFreq: 293.6, scaleIntervals: [0, 2, 4, 7, 9], mood: 'upbeat' },
  { id: 'bg_15', name: 'Lo-Fi Chill Hop', category: 'Reels & Upbeat', bpm: 92, durationSec: 16, rootFreq: 220, scaleIntervals: [0, 3, 5, 7, 10], mood: 'upbeat' },
  { id: 'bg_16', name: 'Neon Synthwave Run', category: 'Reels & Upbeat', bpm: 128, durationSec: 14, rootFreq: 196, scaleIntervals: [0, 3, 7, 10, 14], mood: 'upbeat' },
  { id: 'bg_17', name: 'Festival Celebration', category: 'Reels & Upbeat', bpm: 130, durationSec: 14, rootFreq: 329.6, scaleIntervals: [0, 4, 7, 12, 16], mood: 'upbeat' },
  { id: 'bg_18', name: 'Morning Fresh Pop', category: 'Reels & Upbeat', bpm: 114, durationSec: 15, rootFreq: 246.9, scaleIntervals: [0, 4, 7, 9, 12], mood: 'upbeat' },

  { id: 'bg_19', name: 'Idukki Mist Ambient', category: 'Ambient & Calm', bpm: 64, durationSec: 18, rootFreq: 196, scaleIntervals: [0, 5, 7, 12, 14], mood: 'ambient' },
  { id: 'bg_20', name: 'Peaceful Flute Breeze', category: 'Ambient & Calm', bpm: 68, durationSec: 18, rootFreq: 261.6, scaleIntervals: [0, 2, 7, 9, 12], mood: 'ambient' },
  { id: 'bg_21', name: 'Space Horizon Drone', category: 'Ambient & Calm', bpm: 60, durationSec: 20, rootFreq: 146.8, scaleIntervals: [0, 7, 12, 14, 19], mood: 'ambient' },
  { id: 'bg_22', name: 'Ocean Sunset Calm', category: 'Ambient & Calm', bpm: 66, durationSec: 18, rootFreq: 220, scaleIntervals: [0, 4, 7, 11, 12], mood: 'ambient' },
  { id: 'bg_23', name: 'Forest Meditation Pad', category: 'Ambient & Calm', bpm: 62, durationSec: 20, rootFreq: 174.6, scaleIntervals: [0, 5, 7, 9, 12], mood: 'ambient' },
  { id: 'bg_24', name: 'Night Sky Lo-Fi Pad', category: 'Ambient & Calm', bpm: 70, durationSec: 18, rootFreq: 233.1, scaleIntervals: [0, 3, 7, 10, 14], mood: 'ambient' },
];

function synthesizeIntoContext(ctx: BaseAudioContext, sfx: SfxDefinition): void {
  const dur = Math.max(0.2, sfx.durationSec);
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.001, now);
  master.gain.exponentialRampToValueAtTime(0.75, now + Math.min(0.05, dur * 0.15));
  master.gain.exponentialRampToValueAtTime(0.001, now + dur);
  master.connect(ctx.destination);

  if (sfx.noiseMix > 0.05) {
    const bufSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = sfx.recipe === 'thunder' ? 'lowpass' : 'bandpass';
    filter.Q.value = sfx.recipe === 'whoosh' ? 2.4 : 1.1;
    filter.frequency.setValueAtTime(Math.max(40, sfx.baseFreq), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, sfx.endFreq), now + dur);

    const nGain = ctx.createGain();
    nGain.gain.value = sfx.noiseMix;

    noiseSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(master);
    noiseSrc.start(now);
    noiseSrc.stop(now + dur);
  }

  const oscGain = ctx.createGain();
  oscGain.gain.value = Math.max(0.2, 1 - sfx.noiseMix * 0.7);
  oscGain.connect(master);

  if (sfx.recipe === 'heartbeat') {
    const beats = sfx.pulseCount || 2;
    const step = dur / beats;
    for (let b = 0; b < beats; b++) {
      const t = now + b * step;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(88, t);
      osc.frequency.exponentialRampToValueAtTime(34, t + 0.18);
      g.gain.setValueAtTime(0.95, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 0.24);
    }
    return;
  }

  if (sfx.recipe === 'chime') {
    const partials = [1, 1.25, 1.5, 2];
    partials.forEach((mult, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(sfx.baseFreq * mult, now + idx * 0.03);
      g.gain.setValueAtTime(0.32 / (idx + 1), now + idx * 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(now + idx * 0.03);
      osc.stop(now + dur);
    });
    return;
  }

  const osc = ctx.createOscillator();
  osc.type =
    sfx.recipe === 'laser' || sfx.recipe === 'siren'
      ? 'sawtooth'
      : sfx.recipe === 'glitch'
      ? 'square'
      : sfx.recipe === 'boom'
      ? 'sine'
      : 'triangle';

  osc.frequency.setValueAtTime(Math.max(25, sfx.baseFreq), now);
  if (sfx.recipe === 'siren') {
    osc.frequency.linearRampToValueAtTime(sfx.endFreq, now + dur * 0.5);
    osc.frequency.linearRampToValueAtTime(sfx.baseFreq, now + dur);
  } else {
    osc.frequency.exponentialRampToValueAtTime(Math.max(25, sfx.endFreq), now + dur);
  }

  osc.connect(oscGain);
  osc.start(now);
  osc.stop(now + dur);
}

function synthesizeMusicIntoContext(ctx: BaseAudioContext, track: FreeMusicTrack, maxDurSec?: number): void {
  const dur = maxDurSec || track.durationSec;
  const now = ctx.currentTime;
  const beatSec = 60 / track.bpm;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.001, now);
  master.gain.linearRampToValueAtTime(0.5, now + 0.35);
  master.gain.setValueAtTime(0.5, now + Math.max(0.4, dur - 0.6));
  master.gain.exponentialRampToValueAtTime(0.001, now + dur);
  master.connect(ctx.destination);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = track.mood === 'tense' ? 950 : track.mood === 'upbeat' ? 2800 : 1800;
  filter.connect(master);

  const steps = Math.floor(dur / (beatSec / 2));
  const chordRoots = [1, 0.89, 1.12, 0.75];

  for (let s = 0; s < steps; s++) {
    const t = now + s * (beatSec / 2);
    const bar = Math.floor(s / 8) % chordRoots.length;
    const root = track.rootFreq * chordRoots[bar];
    const semi = track.scaleIntervals[s % track.scaleIntervals.length];
    const freq = root * Math.pow(2, semi / 12);

    // Lead / Arpeggio voice
    if (track.mood !== 'ambient' || s % 4 === 0) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = track.mood === 'tense' ? 'sawtooth' : track.mood === 'upbeat' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(track.mood === 'ambient' ? 0.16 : 0.22, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + beatSec * (track.mood === 'ambient' ? 2.4 : 0.9));
      osc.connect(g);
      g.connect(filter);
      osc.start(t);
      osc.stop(t + beatSec * (track.mood === 'ambient' ? 2.6 : 1));
    }

    // Sub Bass / Pad on bar beats
    if (s % 4 === 0) {
      const bass = ctx.createOscillator();
      const bg = ctx.createGain();
      bass.type = track.mood === 'tense' ? 'triangle' : 'sine';
      bass.frequency.setValueAtTime(root * 0.5, t);
      bg.gain.setValueAtTime(0.001, t);
      bg.gain.linearRampToValueAtTime(0.28, t + 0.06);
      bg.gain.exponentialRampToValueAtTime(0.001, t + beatSec * 1.9);
      bass.connect(bg);
      bg.connect(filter);
      bass.start(t);
      bass.stop(t + beatSec * 2);
    }

    // Soft Kick / Pulse for Reels & Thriller
    if ((track.mood === 'upbeat' || track.mood === 'tense') && s % 2 === 0) {
      const kick = ctx.createOscillator();
      const kg = ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(track.mood === 'tense' ? 95 : 130, t);
      kick.frequency.exponentialRampToValueAtTime(36, t + 0.14);
      kg.gain.setValueAtTime(track.mood === 'tense' ? 0.35 : 0.42, t);
      kg.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      kick.connect(kg);
      kg.connect(master);
      kick.start(t);
      kick.stop(t + 0.18);
    }
  }
}

let livePreviewCtx: AudioContext | null = null;
let musicStopHandle: (() => void) | null = null;

export async function previewSfx(sfx: SfxDefinition): Promise<void> {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!livePreviewCtx || livePreviewCtx.state === 'closed') {
      livePreviewCtx = new Ctx();
    }
    if (livePreviewCtx.state === 'suspended') {
      await livePreviewCtx.resume();
    }
    synthesizeIntoContext(livePreviewCtx, sfx);
  } catch {}
}

export async function previewFreeMusic(track: FreeMusicTrack): Promise<void> {
  try {
    if (musicStopHandle) musicStopHandle();
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    await ctx.resume();
    synthesizeMusicIntoContext(ctx, track, 4.5);
    const timer = window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 4700);
    musicStopHandle = () => {
      window.clearTimeout(timer);
      ctx.close().catch(() => {});
      musicStopHandle = null;
    };
  } catch {}
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, length, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export async function renderSfxToWavUrl(sfx: SfxDefinition): Promise<{ url: string; duration: number }> {
  const sampleRate = 44100;
  const length = Math.max(sampleRate * 0.25, Math.ceil(sampleRate * sfx.durationSec));
  const offline = new OfflineAudioContext(1, length, sampleRate);
  synthesizeIntoContext(offline, sfx);
  const rendered = await offline.startRendering();
  const wavBlob = audioBufferToWavBlob(rendered);
  return {
    url: URL.createObjectURL(wavBlob),
    duration: rendered.duration,
  };
}

export async function renderFreeMusicToWavUrl(
  track: FreeMusicTrack
): Promise<{ url: string; duration: number }> {
  const sampleRate = 44100;
  const length = Math.ceil(sampleRate * track.durationSec);
  const offline = new OfflineAudioContext(1, length, sampleRate);
  synthesizeMusicIntoContext(offline, track);
  const rendered = await offline.startRendering();
  const wavBlob = audioBufferToWavBlob(rendered);
  return {
    url: URL.createObjectURL(wavBlob),
    duration: rendered.duration,
  };
}
