import type { AudioSynthKind } from './comedyAudioSynth';
import type {
  ChromaBgMode,
  ChromaKeyColorPreset,
  SplitLayoutType,
  TrailerCardAnimation,
  TrailerCardTheme,
} from './studioAdvancedFx';
import type { AudioItem } from '../components/videoStudioLibrary';

// Helper to combine 3 independent descriptor pools into >= 1,260 unique non-repetitive names
function buildUniqueCombinatorialPool(
  count: number,
  poolsA: string[],
  poolsB: string[],
  poolsC: string[],
  joiner: (a: string, b: string, c: string, idx: number) => string
): string[] {
  const out: string[] = [];
  const used = new Set<string>();
  const lenA = poolsA.length;
  const lenB = poolsB.length;
  const lenC = poolsC.length;
  const totalCombos = lenA * lenB * lenC;

  for (let i = 0; i < count; i += 1) {
    // Coprime stride walks all combinations evenly so adjacent items feel genuinely diverse
    const step = (i * 17 + Math.floor(i / lenA) * 5) % totalCombos;
    const ia = step % lenA;
    const ib = Math.floor(step / lenA) % lenB;
    const ic = Math.floor(step / (lenA * lenB)) % lenC;
    let label = joiner(poolsA[ia], poolsB[ib], poolsC[ic], i);
    if (used.has(label)) {
      label = `${poolsA[(ia + 3) % lenA]} ${poolsB[(ib + 5) % lenB]} · ${poolsC[(ic + 7) % lenC]}`;
    }
    if (used.has(label)) {
      label = `${label} (${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1})`;
    }
    used.add(label);
    out.push(label);
  }
  return out;
}

// =========================================================================
// 1. MEDIA & CLIP MOTION / SPEED / FRAMING PRESETS (1,260 Items)
// =========================================================================
export interface MediaMotionPreset {
  id: string;
  name: string;
  category: string;
  speed: number;
  zoomScale: number;
  panX: number;
  panY: number;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5' | '21:9' | '4:3';
  description: string;
}

export const MEDIA_MOTION_CATEGORIES = [
  'Speed Ramps',
  'Zoom & Ken Burns',
  'Crop & Framing',
  'Aspect Layouts',
  'Slow-Mo Cinema',
  'Action Fast-Cut',
  'Portrait & Reels',
  'Stabilize & Pan',
] as const;

const MOTION_TONES = [
  'Smooth',
  'Whip',
  'Cinematic',
  'Elastic',
  'Gradual',
  'Snap',
  'Dreamy',
  'Dynamic',
  'Steadicam',
  'Dolly',
  'Hyper',
  'Silky',
];

const MOTION_MOVES = [
  'Push-In',
  'Pull-Back',
  'Horizon Pan',
  'Tilt Sweep',
  'Drift',
  'Ramp Curve',
  'Punch Crop',
  'Center Lock',
  'Float Track',
  'Reveal',
  'Framing',
  'Glide',
];

const MOTION_CONTEXTS = [
  'Hero Shot',
  'Vlog Cut',
  'Trailer Beat',
  'B-Roll',
  'Action Scene',
  'Landscape',
  'Close-Up',
  'Montage',
  'Reels Frame',
  'Stage Clip',
];

const MOTION_NAMES = buildUniqueCombinatorialPool(
  1260,
  MOTION_TONES,
  MOTION_MOVES,
  MOTION_CONTEXTS,
  (a, b, c) => `${a} ${b} · ${c}`
);

export const MEDIA_MOTION_LIST: MediaMotionPreset[] = MOTION_NAMES.map((name, i) => {
  const cat = MEDIA_MOTION_CATEGORIES[i % MEDIA_MOTION_CATEGORIES.length];
  let speed = 1;
  let zoomScale = 1;
  let panX = 0;
  let panY = 0;
  let aspectRatio: MediaMotionPreset['aspectRatio'] | undefined;

  if (cat === 'Speed Ramps') {
    speed = [0.5, 0.75, 1.25, 1.5, 2, 2.5][i % 6];
  } else if (cat === 'Slow-Mo Cinema') {
    speed = [0.25, 0.5, 0.75][i % 3];
    zoomScale = Number((1.03 + (i % 5) * 0.03).toFixed(2));
  } else if (cat === 'Action Fast-Cut') {
    speed = [1.5, 1.75, 2, 2.5, 3][i % 5];
    zoomScale = Number((1.06 + (i % 4) * 0.04).toFixed(2));
  } else if (cat === 'Zoom & Ken Burns') {
    zoomScale = Number((1.08 + (i % 8) * 0.05).toFixed(2));
    panX = ((i % 5) - 2) * 0.04;
    panY = (((i >> 1) % 5) - 2) * 0.03;
  } else if (cat === 'Aspect Layouts') {
    aspectRatio = (['16:9', '9:16', '1:1', '4:5', '21:9', '4:3'] as const)[i % 6];
  } else if (cat === 'Portrait & Reels') {
    aspectRatio = i % 2 === 0 ? '9:16' : '4:5';
    zoomScale = Number((1.04 + (i % 4) * 0.03).toFixed(2));
  } else if (cat === 'Crop & Framing') {
    zoomScale = Number((1.05 + (i % 7) * 0.06).toFixed(2));
  } else {
    panX = ((i % 7) - 3) * 0.025;
    zoomScale = 1.04;
  }

  return {
    id: `mm_${i + 1}`,
    name,
    category: cat,
    speed,
    zoomScale,
    panX,
    panY,
    aspectRatio,
    description: `${cat} · ${speed}x speed · ${Math.round(zoomScale * 100)}% framing${aspectRatio ? ` · ${aspectRatio}` : ''}`,
  };
});

// =========================================================================
// 2. SOUND EFFECTS & FOLEY STUDIO (Audio 1 — 1,350 Diverse SFX Presets)
// =========================================================================
export const SFX_FOLEY_CATEGORIES = [
  'Comedy Stings',
  'Cat & Funny Animals',
  'Bird Calls & Nature',
  'Thunder, Rain & Storm',
  'Cartoon & Slapstick',
  'Meme & Viral SFX',
  'Action & Fight Foley',
  'UI, Glitch & Whooshes',
] as const;

interface RawSfxSeed {
  title: string;
  cat: (typeof SFX_FOLEY_CATEGORIES)[number];
  sec: number;
  bpm: number;
  mood: string;
  desc: string;
  synth: AudioSynthKind;
}

const RAW_SFX_SEEDS: RawSfxSeed[] = [
  // Comedy Stings
  { title: 'Sitcom Audience Laugh Burst', cat: 'Comedy Stings', sec: 5, bpm: 120, mood: 'Hilarious', desc: 'Crisp studio sitcom audience laugh reaction', synth: 'laugh_burst' },
  { title: 'Ba-Dum-Tss Rimshot Punchline', cat: 'Comedy Stings', sec: 3, bpm: 118, mood: 'Punchline', desc: 'Snare drum rimshot and cymbal sting after a joke', synth: 'comedy' },
  { title: 'Sad Trombone Wah-Wah Fail', cat: 'Comedy Stings', sec: 4, bpm: 92, mood: 'Fail', desc: 'Descending brass fail sting for awkward moments', synth: 'trombone_fail' },
  { title: 'Dramatic Sad Violin Solo', cat: 'Comedy Stings', sec: 8, bpm: 70, mood: 'Overdramatic', desc: 'Melodramatic crying violin for tiny mistakes', synth: 'sad_violin' },
  { title: 'Anime Wow Surprise Sparkle', cat: 'Comedy Stings', sec: 3, bpm: 115, mood: 'Amazed', desc: 'Bright comical surprise reveal chord', synth: 'upbeat' },
  { title: 'Dun-Dun-Dun Plot Twist Chord', cat: 'Comedy Stings', sec: 4, bpm: 88, mood: 'Shock', desc: 'Three-beat dramatic shock sting for funny twists', synth: 'trailer' },
  { title: 'Contagious Wheezing Giggle', cat: 'Comedy Stings', sec: 6, bpm: 126, mood: 'Giggle', desc: 'High-energy snickering chuckle burst', synth: 'giggle_chuckle' },
  { title: 'Correct Answer Quiz Ding', cat: 'Comedy Stings', sec: 2, bpm: 110, mood: 'Cheerful', desc: 'Bright game-show bell ping for win moments', synth: 'pop_cork' },

  // Cat & Funny Animals
  { title: 'Hungry House Cat Loud Meow', cat: 'Cat & Funny Animals', sec: 3, bpm: 105, mood: 'Cute Meow', desc: 'Expressive rising-falling house cat meow', synth: 'cat_meow' },
  { title: 'Crying Kitten Sad Meow Sob', cat: 'Cat & Funny Animals', sec: 5, bpm: 84, mood: 'Crying Cat', desc: 'Tremulous pleading kitten cry for funny sad edits', synth: 'cat_cry' },
  { title: 'Grumpy Cat Dramatic Yowl', cat: 'Cat & Funny Animals', sec: 4, bpm: 96, mood: 'Grumpy', desc: 'Low complain-yowl from an annoyed cat', synth: 'cat_cry' },
  { title: 'Happy Cat Cozy Purr Engine', cat: 'Cat & Funny Animals', sec: 12, bpm: 68, mood: 'Cozy Purr', desc: 'Rhythmic warm cat purr rumble', synth: 'cat_purr' },
  { title: 'Silly Puppy Excited Bark', cat: 'Cat & Funny Animals', sec: 4, bpm: 132, mood: 'Playful Dog', desc: 'Energetic double-triple puppy woof', synth: 'dog_bark' },
  { title: 'Pond Duck Quack Censor Gag', cat: 'Cat & Funny Animals', sec: 3, bpm: 126, mood: 'Quack', desc: 'Comedic pond duck quacks for funny censors', synth: 'duck_quack' },
  { title: 'Viral Screaming Goat Yell', cat: 'Cat & Funny Animals', sec: 4, bpm: 138, mood: 'Viral Scream', desc: 'Hilarious wobbling goat yell reaction', synth: 'goat_scream' },
  { title: 'Morning Farm Rooster Crow', cat: 'Cat & Funny Animals', sec: 4, bpm: 122, mood: 'Wakeup', desc: 'Cock-a-doodle-doo sunrise wake-up call', synth: 'rooster_crow' },
  { title: 'Swamp Frog Ribbit Croak', cat: 'Cat & Funny Animals', sec: 4, bpm: 98, mood: 'Swamp', desc: 'Deep comical pond frog ribbit croak', synth: 'frog_croak' },

  // Bird Calls & Nature
  { title: 'Morning Sparrow Cheerful Chirp', cat: 'Bird Calls & Nature', sec: 8, bpm: 128, mood: 'Morning', desc: 'Bright backyard songbird chirping calls', synth: 'bird_chirp' },
  { title: 'Midnight Forest Owl Hoot', cat: 'Bird Calls & Nature', sec: 6, bpm: 70, mood: 'Nocturnal', desc: 'Hollow spooky owl hoo-hoooo echo', synth: 'bird_owl' },
  { title: 'Spring Cuckoo Woodland Call', cat: 'Bird Calls & Nature', sec: 5, bpm: 100, mood: 'Cuckoo', desc: 'Crisp two-tone cuckoo call in woods', synth: 'bird_cuckoo' },
  { title: 'Sarcastic Crow Caw Silence', cat: 'Bird Calls & Nature', sec: 4, bpm: 94, mood: 'Dry Humor', desc: 'Raspy crow caws for awkward silence gags', synth: 'bird_crow' },
  { title: 'Tropical Jungle Birds Chorus', cat: 'Bird Calls & Nature', sec: 18, bpm: 118, mood: 'Jungle', desc: 'Lush multi-bird canopy chirps & trills', synth: 'bird_jungle' },
  { title: 'Dawn Garden Songbirds Bed', cat: 'Bird Calls & Nature', sec: 26, bpm: 108, mood: 'Peaceful', desc: 'Gentle sunrise bird calls and garden ambience', synth: 'bird_chirp' },

  // Thunder, Rain & Storm
  { title: 'Lightning Snap & Thunder Crack', cat: 'Thunder, Rain & Storm', sec: 5, bpm: 72, mood: 'Storm Hit', desc: 'Sharp lightning snap into rolling thunder boom', synth: 'thunder_crack' },
  { title: 'Heavy Monsoon Rain Downpour', cat: 'Thunder, Rain & Storm', sec: 30, bpm: 64, mood: 'Rainy Mood', desc: 'Steady rich tropical rain wash', synth: 'rain_downpour' },
  { title: 'Distant Valley Rolling Thunder', cat: 'Thunder, Rain & Storm', sec: 12, bpm: 60, mood: 'Rumble', desc: 'Deep low thunder rumble across hills', synth: 'thunder_crack' },
  { title: 'Howling Mountain Night Wind', cat: 'Thunder, Rain & Storm', sec: 18, bpm: 68, mood: 'Windy', desc: 'Sweeping gusty wind whistle ambience', synth: 'wind_howl' },
  { title: 'Tin Roof Cozy Rainfall Loop', cat: 'Thunder, Rain & Storm', sec: 45, bpm: 70, mood: 'Cozy Rain', desc: 'Long soothing tin-roof rainfall bed', synth: 'rain_downpour' },

  // Cartoon & Slapstick
  { title: 'Elastic Spring Boing Bounce', cat: 'Cartoon & Slapstick', sec: 2, bpm: 136, mood: 'Bouncy', desc: 'Classic wobbling cartoon spring boing', synth: 'cartoon_boing' },
  { title: 'Banana Peel Slide Whistle Fall', cat: 'Cartoon & Slapstick', sec: 3, bpm: 142, mood: 'Slapstick', desc: 'Up-and-down slide whistle slip effect', synth: 'cartoon_slip' },
  { title: 'Hollow Wooden Head Bonk', cat: 'Cartoon & Slapstick', sec: 2, bpm: 120, mood: 'Bonk', desc: 'Snappy hollow cartoon knock bonk', synth: 'cartoon_bonk' },
  { title: 'Circus Clown Horn Double Honk', cat: 'Cartoon & Slapstick', sec: 3, bpm: 132, mood: 'Circus', desc: 'Double rubber-bulb clown horn squeeze', synth: 'clown_horn' },
  { title: 'Cartoon Bubble Mouth Pop', cat: 'Cartoon & Slapstick', sec: 2, bpm: 124, mood: 'Pop', desc: 'Crisp bubbly mouth-pop sting', synth: 'pop_cork' },
  { title: 'Rubber Frying Pan Clang Bonk', cat: 'Cartoon & Slapstick', sec: 2, bpm: 128, mood: 'Knockout', desc: 'Punchy comic slapstick pan bonk', synth: 'cartoon_bonk' },

  // Meme & Viral SFX
  { title: 'Deep Vine Boom Shock Impact', cat: 'Meme & Viral SFX', sec: 3, bpm: 90, mood: 'Meme Boom', desc: 'Heavy sub-bass comedic zoom boom', synth: 'meme_boom' },
  { title: 'Deadpan Bruh Sub Thump', cat: 'Meme & Viral SFX', sec: 2, bpm: 95, mood: 'Deadpan', desc: 'Dry comedic pause thump', synth: 'meme_boom' },
  { title: 'Goofy Giggle Snort Reaction', cat: 'Meme & Viral SFX', sec: 4, bpm: 130, mood: 'Silly', desc: 'Playful goofy giggle for prank clips', synth: 'giggle_chuckle' },
  { title: 'Squeaky Toy Panic Chirp', cat: 'Meme & Viral SFX', sec: 2, bpm: 140, mood: 'Squeak', desc: 'Rubber squeak toy double chirp', synth: 'cartoon_boing' },
  { title: 'Champagne Cork Pop Surprise', cat: 'Meme & Viral SFX', sec: 2, bpm: 116, mood: 'Snappy', desc: 'Tight hollow pop for surprise reveals', synth: 'pop_cork' },

  // Action & Fight Foley
  { title: 'Window Glass Shatter Crash', cat: 'Action & Fight Foley', sec: 3, bpm: 122, mood: 'Shatter', desc: 'Sharp crystalline window break SFX', synth: 'sfx_glass_break' },
  { title: 'Heavy Chest Punch Thud', cat: 'Action & Fight Foley', sec: 2, bpm: 134, mood: 'Fight Hit', desc: 'Low-end body slam punch impact', synth: 'sfx_punch_impact' },
  { title: 'Pistol Shot + Canyon Echo', cat: 'Action & Fight Foley', sec: 3, bpm: 140, mood: 'Gunfire', desc: 'Sharp firearm crack with reverberant tail', synth: 'sfx_gunshot' },
  { title: 'Match Strike & Flame Roar', cat: 'Action & Fight Foley', sec: 4, bpm: 110, mood: 'Fire', desc: 'Sudden flame whoosh & crackling fire burn', synth: 'sfx_fire_burn' },
  { title: 'Mega Explosion Sub Blast', cat: 'Action & Fight Foley', sec: 4, bpm: 95, mood: 'Blast', desc: 'Deep earth-shaking explosion hit', synth: 'meme_boom' },

  // UI, Glitch & Whooshes
  { title: 'Fast Air Swipe Whoosh', cat: 'UI, Glitch & Whooshes', sec: 2, bpm: 130, mood: 'Transition', desc: 'Clean high-speed air whip for scene cuts', synth: 'sfx_whoosh' },
  { title: 'Ninja Blade Whip Swoosh', cat: 'UI, Glitch & Whooshes', sec: 2, bpm: 145, mood: 'Whip', desc: 'Tight rapid transition swoosh', synth: 'sfx_whoosh' },
  { title: 'Record Scratch Freeze Halt', cat: 'UI, Glitch & Whooshes', sec: 2, bpm: 120, mood: 'Stop', desc: 'Vinyl scratch halt for freeze-frame narration', synth: 'sfx_whoosh' },
  { title: 'Spark Glitch Cyber Zap', cat: 'UI, Glitch & Whooshes', sec: 2, bpm: 138, mood: 'Cyber', desc: 'Digital signal zip transition sound', synth: 'electronic' },
];

const SFX_MODIFIERS = [
  'Studio Dry',
  'Close Mic',
  'Reverb Hall',
  'Punchy Reels',
  'Short Snap',
  'Wide Stereo',
  'Warm Analog',
  'Crisp Digital',
  'Slow-Mo Pitch',
  'High-Energy',
  'Room Echo',
  'Heavy Sub',
  'Playful Bright',
  'Lo-Fi Tape',
  'Double Cue',
  'Extended Tail',
  'Stage Live',
  'Soft Bed',
  'Fast Cut',
  'Cartoon Pop',
  'Deep Bass',
  'Outdoor Open',
  'Indoor Tight',
  'Broadcast Mix',
  'Whisper Soft',
  'Dramatic Peak',
  'Vintage Mono',
  'Clear Podcast',
];

function formatDurationMMSS(sec: number): string {
  const safe = Math.max(1, Math.round(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const SFX_FOLEY_LIST: AudioItem[] = Array.from({ length: 1350 }, (_, i) => {
  const seed = RAW_SFX_SEEDS[i % RAW_SFX_SEEDS.length];
  const cycle = Math.floor(i / RAW_SFX_SEEDS.length);
  const mod = SFX_MODIFIERS[cycle % SFX_MODIFIERS.length];
  const variant = Math.floor(cycle / SFX_MODIFIERS.length);
  const durFactor = mod === 'Short Snap' ? 0.7 : mod === 'Extended Tail' ? 1.45 : 0.9 + (cycle % 5) * 0.1;
  const finalSec = Math.max(2, Math.min(90, Math.round(seed.sec * durFactor)));
  const title =
    cycle === 0
      ? seed.title
      : variant === 0
      ? `${seed.title} · ${mod}`
      : `${seed.title} · ${mod} (${['Take A', 'Take B', 'Take C'][variant % 3]})`;

  return {
    id: `sfx_${i + 1}`,
    title,
    category: seed.cat,
    duration: formatDurationMMSS(finalSec),
    durationSec: finalSec,
    bpm: Math.max(58, seed.bpm + ((cycle % 7) - 3) * 4),
    mood: seed.mood,
    description: `${seed.desc} · ${mod}`,
    synthPreset: seed.synth,
  };
});

// =========================================================================
// 3. BACKGROUND MUSIC & SCORES (Music Track — 1,350 Diverse Longer Tracks)
// =========================================================================
export const MUSIC_BGM_CATEGORIES = [
  'Funny & Comedy BGM',
  'Cinematic Epic Scores',
  'Lo-Fi & Chill Beats',
  'Upbeat Vlog & Travel',
  'Emotional & Piano',
  'Suspense & Thriller',
  'Electronic & Phonk',
  'Acoustic, Folk & World',
] as const;

interface RawMusicSeed {
  title: string;
  cat: (typeof MUSIC_BGM_CATEGORIES)[number];
  sec: number;
  bpm: number;
  mood: string;
  desc: string;
  synth: AudioSynthKind;
}

const RAW_MUSIC_SEEDS: RawMusicSeed[] = [
  // Funny & Comedy BGM
  { title: 'Crazy Slapstick Chase Saxophone', cat: 'Funny & Comedy BGM', sec: 120, bpm: 162, mood: 'Fast Chase', desc: 'High-speed comedic chase groove for pranks & fails', synth: 'comedy_chase' },
  { title: 'Sunny Ukulele & Whistle Vlog', cat: 'Funny & Comedy BGM', sec: 150, bpm: 122, mood: 'Cheerful', desc: 'Happy whistling comedy background bed', synth: 'comedy_whistle' },
  { title: 'Sneaky Tip-Toe Detective Loop', cat: 'Funny & Comedy BGM', sec: 135, bpm: 108, mood: 'Mischievous', desc: 'Playful tip-toe prank background theme', synth: 'comedy' },
  { title: 'Silent-Film Ragtime Slapstick', cat: 'Funny & Comedy BGM', sec: 180, bpm: 140, mood: 'Vintage Gag', desc: 'Bouncy vintage silent-comedy piano chase', synth: 'comedy_chase' },
  { title: 'Goofy Circus Parade Stroll', cat: 'Funny & Comedy BGM', sec: 110, bpm: 128, mood: 'Circus Fun', desc: 'Upbeat carnival background music for skits', synth: 'comedy_ukulele' },

  // Cinematic Epic Scores
  { title: 'IMAX Horizon Hero Overture', cat: 'Cinematic Epic Scores', sec: 185, bpm: 92, mood: 'Heroic', desc: 'Sweeping orchestral brass & pulsing cinema strings', synth: 'cinematic' },
  { title: 'Dawn Over Valleys Score', cat: 'Cinematic Epic Scores', sec: 210, bpm: 80, mood: 'Majestic', desc: 'Warm wide-screen emotional trailer underscore', synth: 'cinematic' },
  { title: 'Titan Final Stand Percussion', cat: 'Cinematic Epic Scores', sec: 145, bpm: 126, mood: 'Intense', desc: 'Driving taiko drums and dramatic trailer swells', synth: 'trailer' },
  { title: 'Blockbuster End Credits Theme', cat: 'Cinematic Epic Scores', sec: 195, bpm: 98, mood: 'Grand', desc: 'Rich theater finale chord progression', synth: 'cinematic' },

  // Lo-Fi & Chill Beats
  { title: 'Midnight Coffee Rain Lo-Fi', cat: 'Lo-Fi & Chill Beats', sec: 175, bpm: 82, mood: 'Cozy Chill', desc: 'Warm dusty Rhodes chords with gentle groove', synth: 'lofi' },
  { title: 'Deadpan Sarcastic Lo-Fi Bed', cat: 'Lo-Fi & Chill Beats', sec: 165, bpm: 86, mood: 'Relaxed', desc: 'Laid-back commentary & storytime beat', synth: 'lofi' },
  { title: 'Tokyo Rooftop Late Night', cat: 'Lo-Fi & Chill Beats', sec: 200, bpm: 78, mood: 'Dreamy', desc: 'Soft nostalgic chillhop background loop', synth: 'lofi' },
  { title: 'Sunday Sketchbook Groove', cat: 'Lo-Fi & Chill Beats', sec: 140, bpm: 88, mood: 'Mellow', desc: 'Warm acoustic-tinged chill beat for B-roll', synth: 'lofi' },

  // Upbeat Vlog & Travel
  { title: 'Tropical Island Sunrise Vlog', cat: 'Upbeat Vlog & Travel', sec: 140, bpm: 118, mood: 'Sunny', desc: 'Bright bouncy creator vlog underscore', synth: 'upbeat' },
  { title: 'Coastal Highway Drone Montage', cat: 'Upbeat Vlog & Travel', sec: 160, bpm: 124, mood: 'Refreshing', desc: 'Feel-good travel montage pop groove', synth: 'upbeat' },
  { title: 'Morning Market Street Bounce', cat: 'Upbeat Vlog & Travel', sec: 130, bpm: 116, mood: 'Playful', desc: 'Whistling & strummed vlog energy', synth: 'comedy_whistle' },

  // Emotional & Piano
  { title: 'Glass Window Memories Piano', cat: 'Emotional & Piano', sec: 190, bpm: 72, mood: 'Touching', desc: 'Delicate solo piano and warm pad swells', synth: 'sad_violin' },
  { title: 'Autumn Letter Farewell Theme', cat: 'Emotional & Piano', sec: 175, bpm: 68, mood: 'Nostalgic', desc: 'Slow expressive strings and gentle chords', synth: 'cinematic' },
  { title: 'First Light Hope Prelude', cat: 'Emotional & Piano', sec: 155, bpm: 76, mood: 'Inspiring', desc: 'Uplifting minimal film score progression', synth: 'cinematic' },

  // Suspense & Thriller
  { title: 'Dark Alley Surveillance Pulse', cat: 'Suspense & Thriller', sec: 150, bpm: 104, mood: 'Tense', desc: 'Stealthy ticking bass pulse & eerie tension', synth: 'trailer' },
  { title: 'Countdown Bomb Defuse Tension', cat: 'Suspense & Thriller', sec: 125, bpm: 132, mood: 'Urgent', desc: 'Rising synth riser and suspense hits', synth: 'trailer' },
  { title: 'Haunted Attic Mystery Bed', cat: 'Suspense & Thriller', sec: 170, bpm: 88, mood: 'Eerie', desc: 'Atmospheric mystery wind and low drone', synth: 'wind_howl' },

  // Electronic & Phonk
  { title: 'Neon Drift Night Phonk', cat: 'Electronic & Phonk', sec: 130, bpm: 142, mood: 'Driving', desc: 'Punchy bassline and retro synth arpeggios', synth: 'electronic' },
  { title: 'Cyber Arcade Boss Stage', cat: 'Electronic & Phonk', sec: 115, bpm: 136, mood: 'Arcade', desc: 'Energetic retro-electro montage theme', synth: 'electronic' },
  { title: 'Future Bass Highlight Reel', cat: 'Electronic & Phonk', sec: 140, bpm: 128, mood: 'Hype', desc: 'Clean modern electronic drop underscore', synth: 'electronic' },

  // Acoustic, Folk & World
  { title: 'Campfire Acoustic Guitar Walk', cat: 'Acoustic, Folk & World', sec: 165, bpm: 110, mood: 'Organic', desc: 'Warm strummed ukulele & acoustic rhythm', synth: 'comedy_ukulele' },
  { title: 'Forest Dawn Nature & Breeze', cat: 'Acoustic, Folk & World', sec: 210, bpm: 90, mood: 'Natural', desc: 'Peaceful outdoor birdsong and wind bed', synth: 'bird_jungle' },
  { title: 'Monsoon Rain Evening Ambience', cat: 'Acoustic, Folk & World', sec: 225, bpm: 64, mood: 'Stormy Calm', desc: 'Long continuous rain & distant thunder backdrop', synth: 'rain_downpour' },
];

const MUSIC_ARRANGEMENTS = [
  'Full Instrumental',
  'Radio Edit',
  'Extended Cut',
  'Underscore Mix',
  'Soft Background',
  'No-Drums Bed',
  'Bass & Groove',
  'Reels 30s Hook',
  'Podcast Intro',
  'Slow Burn',
  'Fast Montage',
  'Acoustic Version',
  'Night Drive Mix',
  'Director Cut',
  'Warm Vinyl Mix',
  'Orchestral Lift',
  'Minimal Edit',
  'Upbeat Bounce',
  'Late Night Mix',
  'Encore Version',
];

export const MUSIC_BGM_LIST: AudioItem[] = Array.from({ length: 1350 }, (_, i) => {
  const seed = RAW_MUSIC_SEEDS[i % RAW_MUSIC_SEEDS.length];
  const cycle = Math.floor(i / RAW_MUSIC_SEEDS.length);
  const arr = MUSIC_ARRANGEMENTS[cycle % MUSIC_ARRANGEMENTS.length];
  const chapter = Math.floor(cycle / MUSIC_ARRANGEMENTS.length);
  const durFactor =
    arr === 'Reels 30s Hook' ? 0.28 : arr === 'Extended Cut' || arr === 'Director Cut' ? 1.25 : 0.85 + (cycle % 5) * 0.1;
  const finalSec = Math.max(24, Math.min(240, Math.round(seed.sec * durFactor)));
  const title =
    cycle === 0
      ? seed.title
      : chapter === 0
      ? `${seed.title} · ${arr}`
      : `${seed.title} · ${arr} (${['Act I', 'Act II', 'Act III'][chapter % 3]})`;

  return {
    id: `bgm_${i + 1}`,
    title,
    category: seed.cat,
    duration: formatDurationMMSS(finalSec),
    durationSec: finalSec,
    bpm: Math.max(60, seed.bpm + ((cycle % 7) - 3) * 3),
    mood: seed.mood,
    description: `${seed.desc} · ${arr}`,
    synthPreset: seed.synth,
  };
});

// =========================================================================
// 4. DIALOGUES, VOICEOVERS & SUBTITLES (1,260 Diverse Dialogue Presets)
// =========================================================================
export interface DialoguePresetItem {
  id: string;
  name: string;
  category: string;
  speaker: string;
  line: string;
  durationSec: number;
  description: string;
}

export const DIALOGUE_PRESET_CATEGORIES = [
  'Hero & Action Lines',
  'Comedy & Roast Lines',
  'Narrator & Trailer Voice',
  'Suspense & Mystery',
  'Romantic & Emotional',
  'Podcast & Vlog Callouts',
  'Meme Reaction Captions',
  'Documentary Captions',
] as const;

const DIALOGUE_SEEDS: Array<{
  cat: (typeof DIALOGUE_PRESET_CATEGORIES)[number];
  speaker: string;
  line: string;
  dur: number;
}> = [
  { cat: 'Hero & Action Lines', speaker: 'Hero', line: 'This ends tonight. No turning back.', dur: 4 },
  { cat: 'Hero & Action Lines', speaker: 'Commander', line: 'Hold the line until the final signal!', dur: 4 },
  { cat: 'Hero & Action Lines', speaker: 'Agent', line: 'Target spotted on the north rooftop.', dur: 3 },
  { cat: 'Comedy & Roast Lines', speaker: 'Narrator', line: 'It was at this exact moment he knew he messed up.', dur: 5 },
  { cat: 'Comedy & Roast Lines', speaker: 'Friend', line: 'Wait… you actually thought that plan would work?', dur: 4 },
  { cat: 'Comedy & Roast Lines', speaker: 'Cat Inner Voice', line: 'Human, the bowl has been empty for three minutes.', dur: 5 },
  { cat: 'Narrator & Trailer Voice', speaker: 'Trailer Voice', line: 'In a world ruled by silence, one spark changes everything.', dur: 6 },
  { cat: 'Narrator & Trailer Voice', speaker: 'Storyteller', line: 'Every legend begins with a single impossible step.', dur: 5 },
  { cat: 'Suspense & Mystery', speaker: 'Detective', line: 'Someone wiped the footage ten minutes before midnight.', dur: 5 },
  { cat: 'Suspense & Mystery', speaker: 'Caller', line: 'Do not open that door. Keep walking.', dur: 4 },
  { cat: 'Romantic & Emotional', speaker: 'Maya', line: 'Even after all these miles, I still knew you would find me.', dur: 5 },
  { cat: 'Romantic & Emotional', speaker: 'Alex', line: 'Promise me we never forget this sunset.', dur: 4 },
  { cat: 'Podcast & Vlog Callouts', speaker: 'Host', line: 'Wait until you see what happened in the last ten seconds!', dur: 4 },
  { cat: 'Podcast & Vlog Callouts', speaker: 'Creator', line: 'Drop your guess in the comments before the reveal.', dur: 4 },
  { cat: 'Meme Reaction Captions', speaker: 'Brain', line: 'Me pretending I totally meant to do that.', dur: 3 },
  { cat: 'Meme Reaction Captions', speaker: 'Editor', line: 'Cue dramatic zoom and questionable life choices.', dur: 4 },
  { cat: 'Documentary Captions', speaker: 'Archive', line: 'Recorded on location · Dawn expedition log.', dur: 4 },
  { cat: 'Documentary Captions', speaker: 'Field Note', line: 'Monsoon clouds roll across the western ridge.', dur: 5 },
];

const DIALOGUE_ANGLES = [
  'Opening Hook',
  'Plot Twist',
  'Close-Up Beat',
  'Mid-Scene Cut',
  'Cliffhanger',
  'Cold Open',
  'Reaction Beat',
  'Post-Credit Gag',
  'Whisper Tone',
  'Bold Delivery',
  'Flashback Voice',
  'Final Line',
  'Sarcastic Cut',
  'Trailer Tag',
  'Slow-Mo Pause',
];

const DIALOGUE_SUFFIX_PHRASES = [
  'Stay sharp.',
  'Watch closely.',
  'Right on cue.',
  'Nobody saw that coming.',
  'Keep rolling.',
  'Wait for it.',
  'Zero regrets.',
  'Look again.',
  'Here we go.',
  'End of story.',
];

export const DIALOGUE_PRESETS_LIST: DialoguePresetItem[] = Array.from({ length: 1260 }, (_, i) => {
  const seed = DIALOGUE_SEEDS[i % DIALOGUE_SEEDS.length];
  const cycle = Math.floor(i / DIALOGUE_SEEDS.length);
  const angle = DIALOGUE_ANGLES[cycle % DIALOGUE_ANGLES.length];
  const tag = DIALOGUE_SUFFIX_PHRASES[Math.floor(cycle / DIALOGUE_ANGLES.length) % DIALOGUE_SUFFIX_PHRASES.length];
  const line =
    cycle === 0 ? seed.line : `${seed.line} ${tag}`;
  return {
    id: `dlgp_${i + 1}`,
    name: `${seed.speaker} · ${angle}`,
    category: seed.cat,
    speaker: seed.speaker,
    line,
    durationSec: Math.max(2, Math.min(12, seed.dur + (cycle % 3))),
    description: `${seed.cat} · ${angle}`,
  };
});

// =========================================================================
// 5. TRAILER CARDS, FRAMES & BORDERS (1,260 Presets)
// =========================================================================
export interface TrailerCardPresetItem {
  id: string;
  name: string;
  category: string;
  title: string;
  subtitle: string;
  badgeText: string;
  theme: TrailerCardTheme;
  animation: TrailerCardAnimation;
  durationSec: number;
  description: string;
}

export const TRAILER_CARD_CATEGORIES = [
  'Blockbuster Posters',
  'Film Borders',
  'Chapter Cards',
  'Festival Laurels',
  'VHS & Camcorder',
  'HUD Viewfinder',
  'Polaroid & Print',
  'End Credits Cards',
] as const;

const CARD_PREFIXES = [
  'THE LAST',
  'MIDNIGHT',
  'NEON',
  'CRIMSON',
  'GOLDEN',
  'SILENT',
  'BROKEN',
  'SHADOW',
  'INFINITE',
  'SOLAR',
  'FROZEN',
  'ELECTRIC',
];

const CARD_NOUNS = [
  'HORIZON',
  'PROTOCOL',
  'CHRONICLE',
  'VERDICT',
  'ODYSSEY',
  'RECKONING',
  'ECLIPSE',
  'SIGNAL',
  'LEGACY',
  'RUNNER',
  'MIRAGE',
  'CHAPTER',
];

const CARD_FRAMES = [
  'Anamorphic Frame',
  '35mm Border',
  'Gold Laurel Stamp',
  'REC Viewfinder',
  'Studio Title Slate',
  'Widescreen Matte',
  'Polaroid Card',
  'IMAX Credit Plate',
  'Spotlight Poster',
  'Neon Grid Frame',
];

const CARD_NAMES = buildUniqueCombinatorialPool(
  1260,
  CARD_PREFIXES,
  CARD_NOUNS,
  CARD_FRAMES,
  (a, b, c) => `${a} ${b} · ${c}`
);

const CARD_THEMES: TrailerCardTheme[] = [
  'blockbuster_gold',
  'action_flame',
  'scifi_holo',
  'noir_mystery',
  'hero_comic',
  'royal_premiere',
];
const CARD_ANIMS: TrailerCardAnimation[] = [
  'tilt_float',
  'slam_shake',
  'flip_reveal',
  'zoom_ken_burns',
  'slide_spotlight',
];

export const TRAILER_CARDS_LIST: TrailerCardPresetItem[] = CARD_NAMES.map((name, i) => {
  const cat = TRAILER_CARD_CATEGORIES[i % TRAILER_CARD_CATEGORIES.length];
  const [titlePart, framePart] = name.split(' · ');
  return {
    id: `tcard_${i + 1}`,
    name,
    category: cat,
    title: titlePart || name,
    subtitle: `${cat.toUpperCase()} · ${framePart || 'CINEMA EDITION'}`,
    badgeText: cat.split(' ')[0].toUpperCase(),
    theme: CARD_THEMES[i % CARD_THEMES.length],
    animation: CARD_ANIMS[(i >> 1) % CARD_ANIMS.length],
    durationSec: 3 + (i % 4),
    description: `${cat} · ${CARD_THEMES[i % CARD_THEMES.length].replace('_', ' ')} style`,
  };
});

// =========================================================================
// 6. BACKGROUNDS & CHROMA KEY PRESETS (1,260 Presets)
// =========================================================================
export interface ChromaPresetItem {
  id: string;
  name: string;
  category: string;
  colorPreset: ChromaKeyColorPreset;
  bgMode: ChromaBgMode;
  similarity: number;
  smoothness: number;
  swatchClass: string;
  description: string;
}

export const CHROMA_BG_CATEGORIES = [
  'Studio & Newsroom',
  'Neon Cyber Worlds',
  'Sunset & Skyscapes',
  'Nature & Forest',
  'Dark Cinema Backdrops',
  'Green Screen Keys',
  'Blue Screen Keys',
  'Spill & Edge Rescue',
] as const;

const BG_MOODS = [
  'Studio',
  'Midnight',
  'Golden',
  'Arctic',
  'Velvet',
  'Cyber',
  'Emerald',
  'Crimson',
  'Horizon',
  'Clean',
  'Broadcast',
  'Stage',
];

const BG_ENVIRONMENTS = [
  'Teal Wall',
  'Sunset Horizon',
  'Laser Grid',
  'Obsidian Void',
  'News Desk',
  'Neon Skyline',
  'Soft Bokeh',
  'Deep Key',
  'Matte Screen',
  'Stage Backdrop',
  'Cloud Deck',
  'Cinema Cyclorama',
];

const BG_TUNINGS = [
  'Tight Edge',
  'Soft Feather',
  'Hair Detail',
  'Low Spill',
  'Studio Light',
  'Outdoor Key',
  'Fast Motion',
  'Crisp Alpha',
  'Warm Rim',
  'Zero Halo',
];

const CHROMA_NAMES = buildUniqueCombinatorialPool(
  1260,
  BG_MOODS,
  BG_ENVIRONMENTS,
  BG_TUNINGS,
  (a, b, c) => `${a} ${b} · ${c}`
);

const BG_MODES: ChromaBgMode[] = ['studio_teal', 'sunset_gold', 'cyber_grid', 'black'];
const KEY_COLORS: ChromaKeyColorPreset[] = ['green', 'neon_green', 'blue', 'cyan'];

export const CHROMA_BACKGROUNDS_LIST: ChromaPresetItem[] = CHROMA_NAMES.map((name, i) => {
  const cat = CHROMA_BG_CATEGORIES[i % CHROMA_BG_CATEGORIES.length];
  const colorPreset: ChromaKeyColorPreset =
    cat === 'Blue Screen Keys'
      ? 'blue'
      : cat === 'Green Screen Keys'
      ? i % 2 === 0
        ? 'green'
        : 'neon_green'
      : KEY_COLORS[i % KEY_COLORS.length];
  const bgMode: ChromaBgMode =
    cat === 'Neon Cyber Worlds'
      ? 'cyber_grid'
      : cat === 'Sunset & Skyscapes'
      ? 'sunset_gold'
      : cat === 'Dark Cinema Backdrops'
      ? 'black'
      : BG_MODES[i % BG_MODES.length];
  const similarity = 32 + (i % 38);
  const smoothness = 12 + ((i * 3) % 28);
  const swatchClass =
    bgMode === 'sunset_gold'
      ? 'from-amber-500 to-rose-700'
      : bgMode === 'cyber_grid'
      ? 'from-fuchsia-600 to-cyan-500'
      : bgMode === 'black'
      ? 'from-zinc-800 to-black'
      : 'from-teal-600 to-slate-900';

  return {
    id: `chr_${i + 1}`,
    name,
    category: cat,
    colorPreset,
    bgMode,
    similarity,
    smoothness,
    swatchClass,
    description: `${cat} · Key ${colorPreset.replace('_', ' ')} · Sim ${similarity}%`,
  };
});

// =========================================================================
// 7. SPLIT SCREEN & MULTI-CAM LAYOUTS (1,260 Presets)
// =========================================================================
export interface SplitLayoutPresetItem {
  id: string;
  name: string;
  category: string;
  layout: SplitLayoutType;
  splitRatio: number;
  gapPx: number;
  description: string;
}

export const SPLIT_PRESET_CATEGORIES = [
  'Side-by-Side Duet',
  'Top & Bottom Stack',
  'Diagonal Action Cut',
  'Picture-in-Picture',
  'Before & After Compare',
  'Dual Cinema Cards',
  'Mirror Reflection',
  'Reaction Commentary',
] as const;

const SPLIT_STYLES = [
  'Balanced',
  'Hero Left',
  'Wide Right',
  'Razor Edge',
  'Framed',
  'Seamless',
  'Clean Border',
  'Cinema Twin',
  'Dynamic',
  'Commentary',
  'Spotlight',
  'Compact',
];

const SPLIT_FORMATS = [
  '50/50 Split',
  '60/40 Focus',
  '70/30 Accent',
  'Diagonal Slash',
  'Corner PiP',
  'Vertical Stack',
  'Mirror Axis',
  'Dual Card',
  'Comparison Bar',
  'Duet Frame',
];

const SPLIT_USES = [
  'Reaction',
  'Podcast',
  'Before/After',
  'Gaming',
  'Tutorial',
  'Dance Duet',
  'Trailer',
  'Vlog',
  'Review',
  'Music Collab',
];

const SPLIT_NAMES = buildUniqueCombinatorialPool(
  1260,
  SPLIT_STYLES,
  SPLIT_FORMATS,
  SPLIT_USES,
  (a, b, c) => `${a} ${b} · ${c}`
);

const SPLIT_LAYOUT_MAP: Record<(typeof SPLIT_PRESET_CATEGORIES)[number], SplitLayoutType> = {
  'Side-by-Side Duet': 'left_right',
  'Top & Bottom Stack': 'top_bottom',
  'Diagonal Action Cut': 'diagonal',
  'Picture-in-Picture': 'pip_bottom_right',
  'Before & After Compare': 'left_right',
  'Dual Cinema Cards': 'dual_cards',
  'Mirror Reflection': 'mirror_twin',
  'Reaction Commentary': 'pip_bottom_right',
};

export const SPLIT_PRESETS_LIST: SplitLayoutPresetItem[] = SPLIT_NAMES.map((name, i) => {
  const cat = SPLIT_PRESET_CATEGORIES[i % SPLIT_PRESET_CATEGORIES.length];
  const layout = SPLIT_LAYOUT_MAP[cat];
  const splitRatio = [50, 55, 60, 65, 45, 40, 70][i % 7];
  const gapPx = [0, 2, 4, 6, 8, 12][i % 6];
  return {
    id: `spl_${i + 1}`,
    name,
    category: cat,
    layout,
    splitRatio,
    gapPx,
    description: `${cat} · Ratio ${splitRatio}% · Gap ${gapPx}px`,
  };
});
