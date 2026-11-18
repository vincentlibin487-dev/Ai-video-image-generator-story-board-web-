// =========================================================================
// CINESTUDIO 4K - EXPANDED CREATIVE ASSETS LIBRARY (600 ITEMS PER CATEGORY)
// 600 Filters, 600 Background Music & SFX, 600 Transitions, 600 Effects,
// 600 Titles, 600 Templates, 600 Stickers, and 600 Color Grading LUTs.
// Every item includes full detail descriptions & real-time render metadata.
// =========================================================================

export interface FilterItem {
  id: string;
  name: string;
  category: string;
  cssFilter: string;
  thumbnail: string;
  description: string;
}

export interface AudioItem {
  id: string;
  title: string;
  category: string;
  duration: string;
  durationSec: number;
  bpm: number;
  mood: string;
  description: string;
  synthPreset: 'comedy' | 'meme_boom' | 'cinematic' | 'lofi' | 'trailer' | 'electronic' | 'upbeat' | 'sfx_whoosh';
  url?: string;
}

export type TransitionEffectType =
  | 'dissolve'
  | 'zoom'
  | 'flash'
  | 'glitch'
  | 'slide'
  | 'cube3d'
  | 'wipe'
  | 'whip';

export interface TransitionItem {
  id: string;
  name: string;
  category: string;
  icon: string;
  effectType: TransitionEffectType;
  durationSec: number;
  description: string;
}

export type VfxEffectType =
  | 'light_leak'
  | 'particles'
  | 'grain'
  | 'glitch'
  | 'mist'
  | 'prism'
  | 'neon'
  | 'halftone';

export interface EffectItem {
  id: string;
  name: string;
  category: string;
  overlayClass: string;
  effectType: VfxEffectType;
  accentColor: string;
  description: string;
}

export interface TitleItem {
  id: string;
  name: string;
  category: string;
  titleText: string;
  subtitleText: string;
  styleClass: string;
  description: string;
}

export interface TemplateItem {
  id: string;
  title: string;
  duration: string;
  durationSec: number;
  category: string;
  thumbnail: string;
  movieTitle: string;
  subtitle: string;
  director: string;
  bgUrl: string;
  description: string;
}

export interface MediaItem {
  id: string;
  title: string;
  type: 'video' | 'photo';
  duration: string;
  durationSec: number;
  url: string;
  thumbnailUrl?: string;
  category?: string;
}

export interface StickerItem {
  id: string;
  name: string;
  category: string;
  badgeText: string;
  emoji: string;
  colorClass: string;
  description: string;
}

export interface ColorGradePreset {
  id: string;
  name: string;
  category: string;
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  warmth: number;
  tint: number;
  highlights: number;
  shadows: number;
  vignette: number;
  swatchGradient: string;
  description: string;
}

export type CinemaVfxKind =
  | 'bullet_tracer'
  | 'muzzle_flash'
  | 'blood_splatter'
  | 'explosion'
  | 'fireball'
  | 'sparks'
  | 'smoke'
  | 'lightning'
  | 'laser_beam'
  | 'sword_slash'
  | 'glass_shatter'
  | 'shockwave'
  | 'portal'
  | 'rain_storm';

export interface CinemaVfxItem {
  id: string;
  name: string;
  category: string;
  kind: CinemaVfxKind;
  hasMotionRoute: boolean;
  primaryColor: string;
  secondaryColor: string;
  defaultDurationSec: number;
  emoji: string;
  description: string;
}

// Curated thumbnail images for previews
const FILTER_THUMBS = [
  'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=200&q=80',
];

// -------------------------------------------------------------------------
// 1. FILTERS & LUTS LIBRARY (600 Cinematic Color Filters)
// -------------------------------------------------------------------------
const FILTER_CATEGORIES = [
  'Cinematic',
  'Retro',
  'Portrait',
  'Nature',
  'Black & White',
  'Sci-Fi',
  'Moody',
  'Vivid',
  'Anime & Pastel',
  'Sunset Gold',
];

const RAW_FILTER_DEFINITIONS = [
  { name: 'Teal & Orange Hollywood', cat: 'Cinematic', css: 'contrast(125%) saturate(145%) hue-rotate(-15deg)', desc: 'Cool teal shadows with warm skin highlights for blockbuster look' },
  { name: 'Cyberpunk Tokyo Neon', cat: 'Cinematic', css: 'contrast(135%) saturate(175%) hue-rotate(45deg)', desc: 'Electric cyan & magenta night neon contrast boost' },
  { name: 'Blade Runner Amber Glow', cat: 'Cinematic', css: 'sepia(50%) contrast(130%) brightness(95%) hue-rotate(-20deg)', desc: 'Rich dystopian amber warmth with deep atmospheric shadows' },
  { name: 'Oppenheimer 70mm Rich Film', cat: 'Cinematic', css: 'contrast(130%) saturate(120%) brightness(98%)', desc: 'High-clarity IMAX 70mm film density and balanced midtones' },
  { name: 'Interstellar Deep Space Slate', cat: 'Cinematic', css: 'contrast(140%) brightness(90%) hue-rotate(185deg) saturate(90%)', desc: 'Crisp cold slate-blue space tone with sharp contrast' },
  { name: 'The Matrix Cyber Green', cat: 'Cinematic', css: 'hue-rotate(85deg) contrast(125%) saturate(160%)', desc: 'Iconic emerald green digital tint with deep blacks' },
  { name: 'Dune Arrakis Desert Warm', cat: 'Cinematic', css: 'sepia(65%) contrast(115%) saturate(140%) brightness(105%)', desc: 'Golden sand warmth with sun-bleached desert highlights' },
  { name: 'Batman Gotham Shadow Noir', cat: 'Cinematic', css: 'contrast(160%) brightness(78%) saturate(70%)', desc: 'Dark moody shadows and muted desaturated grit' },
  { name: 'La La Land Sunset Purple', cat: 'Cinematic', css: 'hue-rotate(290deg) saturate(155%) contrast(120%)', desc: 'Dreamy twilight violet and magenta romance palette' },
  { name: 'Mad Max Fury High Contrast', cat: 'Cinematic', css: 'contrast(170%) saturate(180%) sepia(25%)', desc: 'Punchy extreme contrast and blazing orange saturation' },
  { name: 'Inception Cold Dream Cyan', cat: 'Cinematic', css: 'hue-rotate(170deg) contrast(125%) saturate(110%)', desc: 'Cool architectural blue-grey dream tone' },
  { name: 'Gladiator Roman Gold Sunset', cat: 'Cinematic', css: 'sepia(45%) saturate(160%) contrast(118%) brightness(102%)', desc: 'Epic warm wheatfield golden hour glow' },
  { name: 'Avatar Pandora Biolum Forest', cat: 'Cinematic', css: 'hue-rotate(120deg) saturate(180%) contrast(130%)', desc: 'Lush glowing turquoise & emerald forest bioluminescence' },
  { name: 'Kodachrome 64 Vivid Slide', cat: 'Retro', css: 'contrast(130%) saturate(140%) sepia(15%)', desc: 'Classic 1960s film slide richness with warm reds' },
  { name: 'Super 8mm Warm Grain Wash', cat: 'Retro', css: 'sepia(40%) contrast(115%) brightness(105%) saturate(120%)', desc: 'Nostalgic home-movie amber wash and soft contrast' },
  { name: 'Polaroid 600 Soft Pastel Fade', cat: 'Retro', css: 'contrast(95%) brightness(108%) sepia(25%) saturate(110%)', desc: 'Lifted creamy shadows with instant film pastel tint' },
  { name: 'VHS Camcorder 1994 CRT', cat: 'Retro', css: 'contrast(115%) brightness(110%) saturate(130%) hue-rotate(10deg)', desc: '90s camcorder tape warmth and vibrant analog color' },
  { name: 'Kodak Portra 400 Soft Tone', cat: 'Portrait', css: 'contrast(108%) saturate(112%) brightness(104%) sepia(10%)', desc: 'Natural flattering skin tones and soft highlight rolloff' },
  { name: 'Classic Silver Gelatin 1940', cat: 'Black & White', css: 'grayscale(100%) contrast(140%) brightness(96%)', desc: 'True darkroom silver-halide monochrome contrast' },
  { name: 'Hard Shadow Detective Noir', cat: 'Black & White', css: 'grayscale(100%) contrast(175%) brightness(80%)', desc: 'Chiaroscuro high-contrast black and white thriller look' },
  { name: 'Warm Sepia Monochrome', cat: 'Black & White', css: 'grayscale(100%) sepia(30%) contrast(120%)', desc: 'Archival warm sepia-toned black and white print' },
  { name: 'Ultra Vivid Cinema Pop', cat: 'Vivid', css: 'saturate(170%) contrast(125%) brightness(102%)', desc: 'High-impact commercial vivid colors for reels & promos' },
  { name: 'HDR Hyper Dynamic Range', cat: 'Vivid', css: 'contrast(135%) saturate(150%) brightness(105%)', desc: 'Crisp detail pop across shadows and bright skies' },
  { name: 'Anime Pastel Sky Bloom', cat: 'Anime & Pastel', css: 'brightness(112%) saturate(145%) contrast(105%) hue-rotate(12deg)', desc: 'Bright airy sky blues and soft anime color harmony' },
  { name: 'Golden Sunset Rim Glow', cat: 'Sunset Gold', css: 'sepia(35%) saturate(165%) brightness(105%) contrast(115%)', desc: 'Warm sunset amber light ideal for outdoor portraits' },
];

export const FILTERS_LIST: FilterItem[] = [
  {
    id: 'f_none',
    name: 'Original Raw',
    category: 'Standard',
    cssFilter: 'none',
    thumbnail: FILTER_THUMBS[0],
    description: 'Unfiltered original video & photo colors with zero LUT adjustment.',
  },
  ...Array.from({ length: 599 }, (_, idx) => {
    const base = RAW_FILTER_DEFINITIONS[idx % RAW_FILTER_DEFINITIONS.length];
    const cat = FILTER_CATEGORIES[idx % FILTER_CATEGORIES.length];
    const factor = 0.88 + (idx % 6) * 0.06;
    const tier = Math.floor(idx / RAW_FILTER_DEFINITIONS.length) + 1;
    return {
      id: `flt_${idx + 1}`,
      name: idx < RAW_FILTER_DEFINITIONS.length ? base.name : `${base.name} LUT v${tier}.${(idx % 9) + 1}`,
      category: cat,
      cssFilter: base.css.replace(/(\d+)%/g, (_, n) => `${Math.round(Number(n) * factor)}%`),
      thumbnail: FILTER_THUMBS[idx % FILTER_THUMBS.length],
      description: `${base.desc} · Intensity ${Math.round(factor * 100)}% (${cat})`,
    };
  }),
];

// -------------------------------------------------------------------------
// 2. AUDIO & BACKGROUND MUSIC LIBRARY (600 Tracks + Funny/Meme SFX)
// -------------------------------------------------------------------------
const RAW_FUNNY_MEME_SFX: Array<{
  title: string;
  cat: string;
  dur: string;
  sec: number;
  bpm: number;
  mood: string;
  desc: string;
  synth: AudioItem['synthPreset'];
}> = [
  { title: '😂 Meme Laugh Track (HaHaHa Comedy)', cat: 'Funny & Meme SFX', dur: '00:06', sec: 6, bpm: 120, mood: 'Hilarious', desc: 'Classic audience laugh burst for comic punchlines', synth: 'comedy' },
  { title: '🤣 Wheezing Laugh Out Loud (Meme Guy)', cat: 'Funny & Meme SFX', dur: '00:08', sec: 8, bpm: 128, mood: 'Viral Meme', desc: 'Infectious wheezing laugh track for reaction edits', synth: 'comedy' },
  { title: '🎵 Sad Violin Meme (Crying Moment)', cat: 'Funny & Meme SFX', dur: '00:15', sec: 15, bpm: 72, mood: 'Dramatic Sad', desc: 'Melodramatic slow violin cue for funny fail moments', synth: 'lofi' },
  { title: '🤭 Oh No No No Laugh Meme', cat: 'Funny & Meme SFX', dur: '00:12', sec: 12, bpm: 130, mood: 'Prank', desc: 'Viral prank buildup before unexpected twist', synth: 'comedy' },
  { title: '🗿 Bruh Sound Effect #2 Bass Boosted', cat: 'Funny & Meme SFX', dur: '00:03', sec: 3, bpm: 95, mood: 'Deadpan', desc: 'Deep bass-boosted comedic pause hit', synth: 'meme_boom' },
  { title: '🍌 Cartoon Banana Slip & Fall', cat: 'Funny & Meme SFX', dur: '00:04', sec: 4, bpm: 140, mood: 'Slapstick', desc: 'Slide whistle upward + cartoon thud impact', synth: 'sfx_whoosh' },
  { title: '🔨 Bonk Sound (Comic Hit)', cat: 'Funny & Meme SFX', dur: '00:02', sec: 2, bpm: 110, mood: 'Comic', desc: 'Crisp wooden bonk hit for meme edits', synth: 'meme_boom' },
  { title: '📉 Funny Whistle Slide Down (Fail Drop)', cat: 'Funny & Meme SFX', dur: '00:04', sec: 4, bpm: 100, mood: 'Fail', desc: 'Descending slide whistle for comic fails', synth: 'sfx_whoosh' },
  { title: '🥁 Ba-Dum-Tss Comedy Standup Kick', cat: 'Funny & Meme SFX', dur: '00:03', sec: 3, bpm: 115, mood: 'Punchline', desc: 'Snare rimshot & cymbal sting after jokes', synth: 'comedy' },
  { title: '🦆 Funny Quack Duck Comic Sound', cat: 'Funny & Meme SFX', dur: '00:03', sec: 3, bpm: 125, mood: 'Silly', desc: 'Playful double duck quack censor/reaction SFX', synth: 'comedy' },
  { title: '🎺 Clown Horn Honk Honk', cat: 'Funny & Meme SFX', dur: '00:03', sec: 3, bpm: 132, mood: 'Circus', desc: 'Classic circus horn double honk cue', synth: 'comedy' },
  { title: '😮 Anime Wow Reaction Sound', cat: 'Funny & Meme SFX', dur: '00:03', sec: 3, bpm: 110, mood: 'Amazed', desc: 'Sparkling reaction sting for surprise reveals', synth: 'upbeat' },
  { title: '💿 DJ Record Scratch Freeze Frame', cat: 'Funny & Meme SFX', dur: '00:03', sec: 3, bpm: 120, mood: 'Freeze', desc: 'Vinyl record stop scratch for freeze-frame narration', synth: 'sfx_whoosh' },
  { title: '😱 Suspense Dun-Dun-Dun Dramatic Sting', cat: 'Funny & Meme SFX', dur: '00:05', sec: 5, bpm: 88, mood: 'Shock', desc: 'Three-note dramatic shock chord for plot twists', synth: 'trailer' },
  { title: '💥 Vine Boom Deep Shock Sound', cat: 'Funny & Meme SFX', dur: '00:03', sec: 3, bpm: 90, mood: 'Impact', desc: 'Heavy sub-bass cinematic meme boom hit', synth: 'meme_boom' },
  { title: '🎷 Benny Hill Crazy Chase Saxophone', cat: 'Comedy Tracks', dur: '00:25', sec: 25, bpm: 165, mood: 'Fast Chase', desc: 'High-speed comical chase sax melody for fast-forward clips', synth: 'comedy' },
  { title: '🕵️ Sneaky Cartoon Detective Marimba', cat: 'Comedy Tracks', dur: '00:24', sec: 24, bpm: 108, mood: 'Sneaky', desc: 'Tip-toe pizzicato marimba groove for stealth & pranks', synth: 'comedy' },
  { title: '🪕 Quirky Ukulele Whistling Comedy', cat: 'Comedy Tracks', dur: '00:22', sec: 22, bpm: 124, mood: 'Cheerful', desc: 'Upbeat acoustic ukulele with playful whistling lead', synth: 'upbeat' },
  { title: '🎹 Funny Ragtime Saloon Piano', cat: 'Comedy Tracks', dur: '00:20', sec: 20, bpm: 138, mood: 'Slapstick', desc: 'Bouncy silent-film era slapstick piano loop', synth: 'comedy' },
  { title: '🎮 8-Bit Retro Game Over Fail', cat: 'Comedy Tracks', dur: '00:16', sec: 16, bpm: 116, mood: 'Retro', desc: 'Chiptune retro game melody for gaming & meme clips', synth: 'electronic' },
];

const RAW_CINEMATIC_AUDIO: typeof RAW_FUNNY_MEME_SFX = [
  { title: 'Cinematic Trailer Score (Stereo 48kHz)', cat: 'Cinematic Score', dur: '00:21', sec: 21, bpm: 92, mood: 'Epic', desc: 'Sweeping strings & brass trailer score with rising climax', synth: 'cinematic' },
  { title: 'Epic Orchestral Rising Symphony', cat: 'Cinematic Score', dur: '00:30', sec: 30, bpm: 96, mood: 'Heroic', desc: 'Full symphony orchestra swell for movie openers', synth: 'cinematic' },
  { title: 'Interstellar Organ Horizon', cat: 'Cinematic Score', dur: '00:32', sec: 32, bpm: 78, mood: 'Emotional', desc: 'Deep cathedral pipe organ & cosmic synth pad', synth: 'cinematic' },
  { title: 'Oppenheimer Countdown Ticking', cat: 'Cinematic Score', dur: '00:22', sec: 22, bpm: 126, mood: 'Tense', desc: 'Accelerating string pulse & clockwork tension', synth: 'trailer' },
  { title: 'Dramatic Action Impact Hits', cat: 'Trailer Hits', dur: '00:15', sec: 15, bpm: 110, mood: 'Power', desc: 'Heavy percussion hits & low brass booms for action cuts', synth: 'trailer' },
  { title: 'Heavy Taiko War Drum Barrage', cat: 'Trailer Hits', dur: '00:18', sec: 18, bpm: 132, mood: 'Intense', desc: 'Tribal taiko drum cadence for fast montage edits', synth: 'trailer' },
  { title: 'Golden Morning Acoustic Travel', cat: 'Background Music', dur: '00:28', sec: 28, bpm: 105, mood: 'Warm', desc: 'Soft acoustic guitar & warm pad for travel vlogs', synth: 'upbeat' },
  { title: 'Emotional Piano Memory BGM', cat: 'Background Music', dur: '00:34', sec: 34, bpm: 70, mood: 'Touching', desc: 'Gentle felt piano arpeggios for storytelling & reels', synth: 'lofi' },
  { title: 'Peaceful Flute & Rain Ambience', cat: 'Background Music', dur: '00:30', sec: 30, bpm: 68, mood: 'Calm', desc: 'Serene bansuri flute over gentle monsoon rain', synth: 'lofi' },
  { title: 'Summer Funk Island Groove', cat: 'Upbeat Beat', dur: '00:24', sec: 24, bpm: 118, mood: 'Energetic', desc: 'Bright bassline and tropical claps for lifestyle reels', synth: 'upbeat' },
  { title: 'Rain on Window Lo-Fi Study', cat: 'Lo-Fi Chill', dur: '00:30', sec: 30, bpm: 80, mood: 'Chill', desc: 'Warm vinyl crackle Rhodes chords and relaxed beat', synth: 'lofi' },
  { title: 'Dark Synthwave 80s Pulse', cat: 'Electronic', dur: '00:24', sec: 24, bpm: 122, mood: 'Cyber', desc: 'Analog arpeggio bass & neon synth lead', synth: 'electronic' },
  { title: 'Subtle Cinematic Whoosh / Swish', cat: 'Sound Effects', dur: '00:03', sec: 3, bpm: 100, mood: 'Transition', desc: 'Clean air whoosh ideal for slide & whip transitions', synth: 'sfx_whoosh' },
  { title: 'Thunderstorm & Rain Ambience', cat: 'Sound Effects', dur: '00:14', sec: 14, bpm: 65, mood: 'Atmosphere', desc: 'Deep rolling thunder rumble for moody night scenes', synth: 'meme_boom' },
];

const ALL_RAW_AUDIO = [...RAW_FUNNY_MEME_SFX, ...RAW_CINEMATIC_AUDIO];
const AUDIO_STYLE_TAGS = ['Studio Master', 'Reels Cut', 'Dolby Mix', 'Bass Boost', 'Acoustic', 'Extended', 'Vlog Edit', '4K Surround'];

export const AUDIO_LIST: AudioItem[] = Array.from({ length: 600 }, (_, i) => {
  const base = ALL_RAW_AUDIO[i % ALL_RAW_AUDIO.length];
  const cycle = Math.floor(i / ALL_RAW_AUDIO.length);
  const tag = AUDIO_STYLE_TAGS[i % AUDIO_STYLE_TAGS.length];
  return {
    id: `aud_${i + 1}`,
    title: cycle === 0 ? base.title : `${base.title} · ${tag} #${i + 1}`,
    category: base.cat,
    duration: base.dur,
    durationSec: base.sec,
    bpm: base.bpm + (i % 7) - 3,
    mood: base.mood,
    description: `${base.desc} (${base.bpm} BPM · ${base.mood})`,
    synthPreset: base.synth,
  };
});

// -------------------------------------------------------------------------
// 3. TRANSITIONS LIBRARY (600 Live-Rendered Visual Transitions)
// -------------------------------------------------------------------------
const TRANSITION_DEFS: Array<{
  cat: string;
  effectType: TransitionEffectType;
  names: string[];
  desc: string;
}> = [
  {
    cat: 'Dissolve',
    effectType: 'dissolve',
    names: ['Cross Dissolve DI12', 'Film Dissolve FD01', 'Dreamy Glow Dissolve', 'Soft Dip to Black', 'Warm Dip to Amber', 'Atmospheric Haze Fade', 'Velvet Crossfade', 'Luma Fade Smooth'],
    desc: 'Smoothly blends the outgoing clip into the incoming clip with progressive opacity crossfade.',
  },
  {
    cat: 'Dynamic Zoom',
    effectType: 'zoom',
    names: ['Hyper Zoom In ZO01', 'Crash Zoom Out ZO02', 'Swirl Spin Zoom', 'Lens Punch Zoom', 'Warp Tunnel Zoom', 'Macro Pull Back', 'Dolly Zoom Vertigo', 'Bounce Zoom Pop'],
    desc: 'Accelerates scale and optical zoom smoothly across the cut boundary between two clips.',
  },
  {
    cat: 'Flash & Light',
    effectType: 'flash',
    names: ['White Exposure Flash FL04', 'Camera Shutter Flash', 'Solar Flare Burn', 'Golden Light Leak Sweep', 'Anamorphic Flare Flash', 'Strobe White Cut', 'Neon Bloom Flash', 'Cinema Projector Flash'],
    desc: 'Fires a bright exposure burst / light-leak flash right across the seam to energize cuts.',
  },
  {
    cat: 'Glitch & Warp',
    effectType: 'glitch',
    names: ['Digital Glitch Warp GL02', 'RGB Chromatic Tear', 'VHS Tracking Static', 'Cyber Scanline Split', 'Signal Drop Distortion', 'Pixel Slice Jitter', 'Neon Arc Glitch', 'Data Mosh Shift'],
    desc: 'Splits horizontal scanlines & RGB color channels dynamically across the transition frame.',
  },
  {
    cat: 'Slide & Push',
    effectType: 'slide',
    names: ['Push Slide Left SL01', 'Push Slide Right SL02', 'Slide Up Reveal', 'Slide Down Drop', 'Diagonal Push Cut', 'Split Shutter Slide', 'Parallax Glide', 'Smooth Whip Push'],
    desc: 'Physically pushes the first clip off-screen while sliding the next clip seamlessly into frame.',
  },
  {
    cat: '3D & Cube',
    effectType: 'cube3d',
    names: ['3D Cube Spin Left', '3D Cube Spin Right', '3D Card Flip Axis', 'Origami Fold 3D', 'Book Page Turn', 'Revolving Door 3D', 'Sphere Perspective Flip', 'Tilt Box Rotate'],
    desc: 'Rotates the outgoing and incoming clips with 3D perspective compression across the seam.',
  },
  {
    cat: 'Wipe & Shapes',
    effectType: 'wipe',
    names: ['Circle Iris Open', 'Clock Radial Wipe CW01', 'Diamond Center Wipe', 'Diagonal Curtain Wipe', 'Venetian Blinds Cut', 'Starburst Reveal', 'Horizontal Split Open', 'Soft Barn Doors'],
    desc: 'Reveals the incoming video through an expanding geometric mask or radial iris sweep.',
  },
  {
    cat: 'Whip Pan',
    effectType: 'whip',
    names: ['Whip Pan Left Speed', 'Whip Pan Right Blur', 'Fast 360 Spin Blur', 'Swish Pan Vertical', 'Action Motion Blur Cut', 'Pendulum Swing Cut', 'Snap Rotate Whip', 'Hyper Velocity Pan'],
    desc: 'Rapid directional pan with motion-streaked horizontal glide into the next scene.',
  },
];

export const TRANSITIONS_LIST: TransitionItem[] = Array.from({ length: 600 }, (_, i) => {
  const def = TRANSITION_DEFS[i % TRANSITION_DEFS.length];
  const baseName = def.names[Math.floor(i / TRANSITION_DEFS.length) % def.names.length];
  const vol = Math.floor(i / (TRANSITION_DEFS.length * def.names.length)) + 1;
  const code = `TR${String(i + 1).padStart(3, '0')}`;
  const dur = Number((0.6 + (i % 5) * 0.15).toFixed(2));
  return {
    id: `tr_${i + 1}`,
    name: vol === 1 ? baseName : `${baseName} Pro v${vol}`,
    category: def.cat,
    icon: code,
    effectType: def.effectType,
    durationSec: dur,
    description: `${def.desc} (${dur}s duration · ${def.cat})`,
  };
});

// -------------------------------------------------------------------------
// 4. EFFECTS & VFX OVERLAYS LIBRARY (600 Live Canvas VFX Overlays)
// -------------------------------------------------------------------------
const EFFECT_DEFS: Array<{
  cat: string;
  effectType: VfxEffectType;
  accent: string;
  names: string[];
  desc: string;
}> = [
  {
    cat: 'Light Leaks',
    effectType: 'light_leak',
    accent: '#f59e0b',
    names: ['Anamorphic Lens Flare Cyan', 'Sunset Amber Light Leak', 'Vintage 35mm Solar Flare', 'Warm Corner Burn Leak', 'Golden Ribbon Flare', 'Ruby Edge Burn'],
    desc: 'Adds warm moving optical light leaks and glowing edge flares over your footage.',
  },
  {
    cat: 'Particles & Dust',
    effectType: 'particles',
    accent: '#fde68a',
    names: ['Floating Dust Motes', 'Golden Embers Sparks', 'Winter Snowflakes 4K', 'Firefly Forest Bokeh', 'Magic Stardust Shimmer', 'Confetti Celebration'],
    desc: 'Renders animated floating particles, glowing embers, or drifting snow across the frame.',
  },
  {
    cat: 'Film Grain',
    effectType: 'grain',
    accent: '#a1a1aa',
    names: ['Vintage 35mm Fine Grain', '16mm Rough Celluloid', '8mm Projector Scratch', 'Archival Cinema Dust', 'Super 8 Gate Weave', 'Kodak Texture Grain'],
    desc: 'Applies authentic analog film texture, subtle vertical scratches, and organic grain.',
  },
  {
    cat: 'Distortion',
    effectType: 'glitch',
    accent: '#ef4444',
    names: ['Chromatic RGB Glitch', 'VHS Tracking Jitter', 'Cyber Scanline Tear', 'Digital Signal Ripple', 'Hologram Flicker', 'Static Interference'],
    desc: 'Injects rhythmic RGB color split, scanlines, and electronic signal distortion.',
  },
  {
    cat: 'Atmosphere',
    effectType: 'mist',
    accent: '#94a3b8',
    names: ['Cinematic Stage Smoke', 'Morning Valley Mist', 'Dense Pine Forest Fog', 'Soft Dream Bloom Haze', 'Thunderstorm Cloud Mist', 'Dry Ice Floor Fog'],
    desc: 'Wraps the scene in drifting atmospheric fog, stage haze, and moody soft bloom.',
  },
  {
    cat: 'Prism & Glow',
    effectType: 'prism',
    accent: '#c084fc',
    names: ['Crystal Prism Rainbow', 'Diamond Edge Bokeh', 'Soft Halation Bloom', 'Ethereal Angel Glow', 'Spectrum Glass Refract', 'Moonlight Aura'],
    desc: 'Casts prismatic rainbow light refractions and dreamy specular highlight halos.',
  },
  {
    cat: 'Cyber & Neon',
    effectType: 'neon',
    accent: '#22d3ee',
    names: ['Tron Neon Frame Pulse', 'Cyberpunk Laser Grid', 'Ultraviolet Edge Glow', 'Electric Magenta Border', 'Synthwave Horizon Rays', 'Arcade Neon Pulse'],
    desc: 'Frames the canvas with animated neon laser glow and futuristic HUD accents.',
  },
  {
    cat: 'Retro Halftone',
    effectType: 'halftone',
    accent: '#fb7185',
    names: ['CRT Television Scanlines', 'Comic Book Halftone Grid', 'Arcade Phosphor Dots', '90s Broadcast Vignette', 'Retro Monitor Grille', 'Pop Art Matrix'],
    desc: 'Overlays crisp retro CRT scanlines and stylized halftone texture dots.',
  },
];

export const EFFECTS_LIST: EffectItem[] = Array.from({ length: 600 }, (_, i) => {
  const def = EFFECT_DEFS[i % EFFECT_DEFS.length];
  const baseName = def.names[Math.floor(i / EFFECT_DEFS.length) % def.names.length];
  const tier = Math.floor(i / (EFFECT_DEFS.length * def.names.length)) + 1;
  return {
    id: `eff_${i + 1}`,
    name: tier === 1 ? baseName : `${baseName} FX #${i + 1}`,
    category: def.cat,
    overlayClass: 'mix-blend-screen opacity-80 pointer-events-none',
    effectType: def.effectType,
    accentColor: def.accent,
    description: `${def.desc} (Layer: ${def.cat})`,
  };
});

// -------------------------------------------------------------------------
// 5. TITLES & TYPOGRAPHY LIBRARY (600 Lower Thirds & Openers)
// -------------------------------------------------------------------------
const TITLE_CATEGORIES = [
  'Cinematic Openers',
  'Neon 3D',
  'Lower Thirds',
  'Minimal Titles',
  'Social & Vlog',
  'Retro & Movie',
];

const BASE_TITLES = [
  { name: 'IMPACT HOLLYWOOD OPENER', sub: 'SUMMER BLOCKBUSTER 2026', style: 'font-black tracking-widest text-white uppercase', desc: 'Bold widescreen theatrical movie opener title' },
  { name: 'CYBERPUNK NEON GLOW 3D', sub: 'NIGHT CITY ADVENTURE', style: 'font-mono text-cyan-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.9)]', desc: 'Glowing cyan neon monospace cyber title card' },
  { name: 'MINIMAL MODERN LOWER THIRD', sub: 'DIRECTOR & CINEMATOGRAPHER', style: 'font-semibold tracking-wide text-zinc-100 text-sm', desc: 'Clean documentary lower-third name & role plate' },
  { name: 'ELEGANT GOLDEN SCRIPT', sub: 'A CINEMATIC MASTERPIECE', style: 'font-serif italic text-amber-300 drop-shadow', desc: 'Luxury serif golden title for weddings & drama' },
  { name: 'YOUTUBE BOLD VLOG TITLE', sub: 'DON’T FORGET TO SUBSCRIBE', style: 'font-black text-amber-400 bg-black/60 px-2 rounded', desc: 'High-retention creator callout banner' },
  { name: 'RETRO 80S SYNTHWAVE TITLE', sub: 'OUTRUN RETROGRADE', style: 'font-extrabold text-pink-500 drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]', desc: 'Vibrant 80s neon pink synthwave headline' },
  { name: 'BREAKING NEWS TICKER', sub: 'LIVE EXCLUSIVE UPDATE', style: 'font-black text-rose-400 uppercase tracking-wider', desc: 'Broadcast headline bar for news & commentary' },
  { name: 'DOCUMENTARY CHAPTER', sub: 'PART I · THE BEGINNING', style: 'font-serif tracking-[0.25em] text-zinc-200 uppercase', desc: 'Wide-tracked cinematic chapter divider' },
];

export const TITLES_LIST: TitleItem[] = Array.from({ length: 600 }, (_, i) => {
  const base = BASE_TITLES[i % BASE_TITLES.length];
  const cat = TITLE_CATEGORIES[i % TITLE_CATEGORIES.length];
  return {
    id: `title_${i + 1}`,
    name: `${base.name.slice(0, 20)} #${i + 1}`,
    category: cat,
    titleText: i < BASE_TITLES.length ? base.name : `${base.name} ${Math.floor(i / BASE_TITLES.length) + 1}`,
    subtitleText: base.sub,
    styleClass: base.style,
    description: `${base.desc} (${cat})`,
  };
});

// -------------------------------------------------------------------------
// 6. VIDEO TEMPLATES LIBRARY (600 Motion Templates)
// -------------------------------------------------------------------------
const TEMPLATE_CATEGORIES = [
  'Cinematic Intro',
  'Action Trailer',
  'YouTube Vlog',
  'Business Promo',
  'Social Reels',
  'Gaming Esports',
  'Travel Nature',
  'Comedy & Meme',
];

export const TEMPLATES_LIST: TemplateItem[] = Array.from({ length: 600 }, (_, i) => {
  const cat = TEMPLATE_CATEGORIES[i % TEMPLATE_CATEGORIES.length];
  const dur = 10 + (i % 25);
  const ss = String(dur).padStart(2, '0');
  const thumb = FILTER_THUMBS[i % FILTER_THUMBS.length];
  return {
    id: `tpl_${i + 1}`,
    title: `${cat} Pack #${i + 1}`,
    duration: `00:${ss}`,
    durationSec: dur,
    category: cat,
    thumbnail: thumb,
    movieTitle: `${cat.toUpperCase()} #${i + 1}`,
    subtitle: `PRODUCE | CineStudio 4K · ${cat}`,
    director: `DIRECTOR | CineStudio Pro`,
    bgUrl: thumb.replace('w=200', 'w=1280'),
    description: `Applies pre-styled ${cat} title typography, subtitle & director credits (${dur}s layout).`,
  };
});

// -------------------------------------------------------------------------
// 7. MEDIA GALLERY INITIAL (Empty by default; user uploads only)
// -------------------------------------------------------------------------
export const INITIAL_MEDIA_GALLERY: MediaItem[] = [];

// -------------------------------------------------------------------------
// 8. STICKERS & BADGES LIBRARY (600 Graphic Canvas Stickers)
// -------------------------------------------------------------------------
const STICKER_CATEGORIES = [
  'Subscribe & Social',
  'Badges & Seals',
  'Arrows & Pointers',
  'Cinema Icons',
  'Emoji & Reactions',
  'Meme & Comedy Stickers',
  'Gaming & Stream',
];

const RAW_STICKERS = [
  { name: 'YouTube Subscribe', cat: 'Subscribe & Social', badge: 'SUBSCRIBE', emoji: '🔴', color: 'bg-red-600 text-white', desc: 'Red subscribe call-to-action pill badge' },
  { name: 'Bell Notification', cat: 'Subscribe & Social', badge: 'NOTIFY ME', emoji: '🔔', color: 'bg-amber-500 text-black', desc: 'Golden bell reminder badge for viewers' },
  { name: 'Like Thumbs Up', cat: 'Subscribe & Social', badge: 'LIKE', emoji: '👍', color: 'bg-blue-600 text-white', desc: 'Blue thumbs-up engagement sticker' },
  { name: 'Instagram Heart', cat: 'Subscribe & Social', badge: 'LOVE', emoji: '❤️', color: 'bg-pink-600 text-white', desc: 'Heart reaction overlay badge' },
  { name: 'Follow Music Note', cat: 'Subscribe & Social', badge: 'FOLLOW', emoji: '🎵', color: 'bg-cyan-500 text-black', desc: 'Reels & shorts follow prompt sticker' },
  { name: 'Share Arrow', cat: 'Arrows & Pointers', badge: 'SHARE NOW', emoji: '↗️', color: 'bg-emerald-600 text-white', desc: 'Pointing share prompt graphic' },
  { name: '4K Ultra HD Badge', cat: 'Badges & Seals', badge: '4K ULTRA HD', emoji: '🎬', color: 'bg-amber-400 text-black font-black', desc: 'Cinema 4K resolution corner seal' },
  { name: 'Top Rated Trophy', cat: 'Badges & Seals', badge: 'TOP RATED', emoji: '🏆', color: 'bg-emerald-400 text-black font-bold', desc: 'Gold award ribbon badge' },
  { name: 'Pro VIP Crown', cat: 'Badges & Seals', badge: 'PRO VIP', emoji: '👑', color: 'bg-yellow-500 text-black font-extrabold', desc: 'Royal crown premium stamp' },
  { name: 'Laughing Doge Meme', cat: 'Meme & Comedy Stickers', badge: 'MUCH WOW', emoji: '🐕', color: 'bg-yellow-400 text-black font-black', desc: 'Classic viral doge comedy sticker' },
  { name: 'Gigachad Stare', cat: 'Meme & Comedy Stickers', badge: 'BASED', emoji: '🗿', color: 'bg-zinc-800 text-teal-300 font-bold', desc: 'Moai stone face meme reaction stamp' },
  { name: 'Crying Laughing Emoji', cat: 'Meme & Comedy Stickers', badge: 'LMAO', emoji: '🤣', color: 'bg-amber-400 text-black', desc: 'Comedy highlight reaction badge' },
  { name: 'Cat Vibing Jam', cat: 'Meme & Comedy Stickers', badge: 'VIBING', emoji: '🐱', color: 'bg-purple-600 text-white', desc: 'Music beat vibing cat overlay' },
  { name: 'Popcat Open Mouth', cat: 'Meme & Comedy Stickers', badge: 'POP!', emoji: '😺', color: 'bg-rose-500 text-white', desc: 'Surprised comedy popcat sticker' },
  { name: 'Fire Flame Lit', cat: 'Emoji & Reactions', badge: 'FIRE!', emoji: '🔥', color: 'bg-orange-500 text-white', desc: 'Hype flame reaction sticker' },
  { name: 'Mind Blown Explode', cat: 'Emoji & Reactions', badge: 'MIND BLOWN', emoji: '🤯', color: 'bg-purple-600 text-white', desc: 'Shock plot-twist reaction sticker' },
  { name: '100 Percent Score', cat: 'Emoji & Reactions', badge: '100%', emoji: '💯', color: 'bg-red-600 text-white', desc: 'Perfect score stamp overlay' },
  { name: 'Cool Sunglasses Swag', cat: 'Gaming & Stream', badge: 'GG EZ', emoji: '😎', color: 'bg-zinc-800 text-white', desc: 'Cool sunglasses gaming win badge' },
];

export const STICKERS_LIST: StickerItem[] = Array.from({ length: 600 }, (_, i) => {
  const base = RAW_STICKERS[i % RAW_STICKERS.length];
  const cat = STICKER_CATEGORIES[i % STICKER_CATEGORIES.length];
  return {
    id: `stk_${i + 1}`,
    name: `${base.name} #${i + 1}`,
    category: cat,
    badgeText: base.badge,
    emoji: base.emoji,
    colorClass: base.color,
    description: `${base.desc} · Click to show/hide on preview screen`,
  };
});

// -------------------------------------------------------------------------
// 9. COLOR GRADING LUT PRESETS (600 Presets for Color Grading Inspector)
// -------------------------------------------------------------------------
const COLOR_GRADE_CATEGORIES = [
  'Hollywood Film',
  'Warm & Golden',
  'Cool & Moody',
  'High Contrast',
  'Skin & Portrait',
  'Neon & Cyber',
  'Vintage Print',
  'Monochrome',
];

const RAW_COLOR_GRADES = [
  { name: 'Blockbuster Teal & Orange', cat: 'Hollywood Film', b: 2, c: 22, s: 24, ex: 5, w: 12, t: -12, hi: 10, sh: -15, v: 35, grad: 'from-teal-500 to-orange-500', desc: 'Deep teal shadows balanced with rich golden orange skin tones' },
  { name: 'IMAX 70mm Neutral Film', cat: 'Hollywood Film', b: 0, c: 18, s: 12, ex: 4, w: 6, t: 0, hi: 8, sh: -10, v: 28, grad: 'from-zinc-700 to-amber-500', desc: 'Balanced theater print curve with crisp dynamic range' },
  { name: 'Golden Sunset Glow', cat: 'Warm & Golden', b: 8, c: 14, s: 28, ex: 10, w: 42, t: -6, hi: 15, sh: 5, v: 25, grad: 'from-amber-400 to-rose-500', desc: 'Warm sunset light boost with rich golden saturation' },
  { name: 'Nordic Ice Slate', cat: 'Cool & Moody', b: -6, c: 25, s: -18, ex: -5, w: 0, t: 185, hi: -10, sh: -20, v: 45, grad: 'from-sky-700 to-slate-900', desc: 'Cool desaturated blue shadows ideal for thriller & drama' },
  { name: 'Gotham Dark Contrast', cat: 'High Contrast', b: -12, c: 42, s: -15, ex: -8, w: 0, t: 15, hi: -5, sh: -35, v: 60, grad: 'from-zinc-900 to-indigo-900', desc: 'Crushed dark blacks & dramatic edge vignette' },
  { name: 'Silky Portrait Glow', cat: 'Skin & Portrait', b: 10, c: 6, s: 10, ex: 8, w: 18, t: -4, hi: 12, sh: 15, v: 18, grad: 'from-rose-300 to-amber-200', desc: 'Lifts facial shadows softly with natural warm highlights' },
  { name: 'Tokyo Cyberpunk Magenta', cat: 'Neon & Cyber', b: 4, c: 32, s: 48, ex: 5, w: 0, t: 285, hi: 20, sh: -15, v: 40, grad: 'from-fuchsia-600 to-cyan-400', desc: 'Electric neon saturation & violet-cyan color shift' },
  { name: 'Kodak Vintage 1978', cat: 'Vintage Print', b: 5, c: 10, s: 15, ex: 0, w: 35, t: -8, hi: -5, sh: 10, v: 32, grad: 'from-yellow-600 to-stone-700', desc: 'Retro warm print tint with softened contrast' },
  { name: 'Silver Noir Monochrome', cat: 'Monochrome', b: -4, c: 45, s: -100, ex: 0, w: 0, t: 0, hi: 15, sh: -25, v: 55, grad: 'from-zinc-200 to-zinc-950', desc: 'Zero saturation true black & white cinema grade' },
];

export const COLOR_GRADES_LIST: ColorGradePreset[] = Array.from({ length: 600 }, (_, i) => {
  const base = RAW_COLOR_GRADES[i % RAW_COLOR_GRADES.length];
  const cat = COLOR_GRADE_CATEGORIES[i % COLOR_GRADE_CATEGORIES.length];
  const delta = (i % 7) - 3;
  const tier = Math.floor(i / RAW_COLOR_GRADES.length) + 1;
  return {
    id: `cg_${i + 1}`,
    name: tier === 1 ? base.name : `${base.name} Grade #${i + 1}`,
    category: cat,
    brightness: Math.max(-60, Math.min(60, base.b + delta * 2)),
    contrast: Math.max(-50, Math.min(80, base.c + delta * 3)),
    saturation: base.s === -100 ? -100 : Math.max(-90, Math.min(90, base.s + delta * 4)),
    exposure: Math.max(-50, Math.min(50, base.ex + delta)),
    warmth: Math.max(0, Math.min(90, base.w + Math.max(0, delta * 3))),
    tint: base.t,
    highlights: base.hi,
    shadows: base.sh,
    vignette: Math.max(0, Math.min(85, base.v + delta * 2)),
    swatchGradient: base.grad,
    description: `${base.desc} · C:${base.c + delta * 3}% S:${base.s}%`,
  };
});

// -------------------------------------------------------------------------
// 10. HOLLYWOOD CINEMA VFX LIBRARY (1,200 Action, Gun, Blood, Blast & Sci-Fi VFX)
// -------------------------------------------------------------------------
export const VFX_CATEGORIES = [
  'Gunfire & Bullet Path',
  'Blood & Body Hit',
  'Explosions & Bombs',
  'Muzzle Flash',
  'Sparks & Ricochet',
  'Fire & Smoke',
  'Lightning & Storm',
  'Laser & Sci-Fi',
  'Sword & Martial Arts',
  'Glass & Shockwaves',
] as const;

const RAW_CINEMA_VFX: Array<{
  name: string;
  cat: (typeof VFX_CATEGORIES)[number];
  kind: CinemaVfxKind;
  route: boolean;
  c1: string;
  c2: string;
  dur: number;
  emoji: string;
  desc: string;
}> = [
  {
    name: '9mm Bullet Tracer → Body Blood Hit',
    cat: 'Gunfire & Bullet Path',
    kind: 'bullet_tracer',
    route: true,
    c1: '#fbbf24',
    c2: '#dc2626',
    dur: 1.6,
    emoji: '🔫',
    desc: 'തോക്കിൽ നിന്ന് ഉണ്ട പാഞ്ഞ് ശരീരത്തിൽ കയറി രക്തം തെറിക്കുന്ന ആക്ഷൻ VFX (Start Gun → Hit Body)',
  },
  {
    name: 'AK-47 Heavy Tracer Bullet + Impact',
    cat: 'Gunfire & Bullet Path',
    kind: 'bullet_tracer',
    route: true,
    c1: '#f97316',
    c2: '#ef4444',
    dur: 1.4,
    emoji: '💥',
    desc: 'അതിവേഗ റൈഫിൾ ബുള്ളറ്റ് ട്രെയിൽ + മസിൽ ഫ്ലാഷ് + ബോഡി ഇംപാക്ട് ബ്ലഡ്',
  },
  {
    name: 'Sniper Slow-Motion Bullet Trajectory',
    cat: 'Gunfire & Bullet Path',
    kind: 'bullet_tracer',
    route: true,
    c1: '#fde047',
    c2: '#b91c1c',
    dur: 2.5,
    emoji: '🎯',
    desc: 'സ്ലോ മോഷൻ സ്നൈപ്പർ ഷോട്ട് ഷോക്ക്‌വേവ് റിംഗുകളോടെ ലക്ഷ്യത്തിലേക്ക് പായുന്നു',
  },
  {
    name: 'Chest Shot Arterial Blood Splatter',
    cat: 'Blood & Body Hit',
    kind: 'blood_splatter',
    route: true,
    c1: '#dc2626',
    c2: '#7f1d1d',
    dur: 1.8,
    emoji: '🩸',
    desc: 'വെടിയേറ്റ ഭാഗത്ത് നിന്ന് തെറിക്കുന്ന റിയലിസ്റ്റിക് സിനിമാറ്റിക് രക്തം തെറിക്കൽ VFX',
  },
  {
    name: 'Headshot / Exit Wound Blood Mist',
    cat: 'Blood & Body Hit',
    kind: 'blood_splatter',
    route: true,
    c1: '#b91c1c',
    c2: '#450a0a',
    dur: 1.6,
    emoji: '💉',
    desc: 'ഉണ്ട ശരീരത്തിൽ തറയ്ക്കുമ്പോൾ പുറത്തേക്ക് തെറിക്കുന്ന രക്തത്തുള്ളികളും മിസ്റ്റും',
  },
  {
    name: 'Pistol Front Muzzle Flash Blast',
    cat: 'Muzzle Flash',
    kind: 'muzzle_flash',
    route: false,
    c1: '#fef08a',
    c2: '#ea580c',
    dur: 0.7,
    emoji: '🔥',
    desc: 'തോക്കിന്റെ കുഴലിൽ നിന്ന് തീയും പുകയും പുറത്തേക്ക് തെറിക്കുന്ന വെടിയൊച്ച ഫ്ലാഷ്',
  },
  {
    name: 'Shotgun Heavy Blast + Gunsmoke',
    cat: 'Muzzle Flash',
    kind: 'muzzle_flash',
    route: false,
    c1: '#fb923c',
    c2: '#9a3412',
    dur: 0.9,
    emoji: '🧨',
    desc: 'ഷോട്ട്ഗൺ ഫയർ സ്റ്റാർ ഫ്ലാഷും കട്ടിയുള്ള വെടിപ്പുകയും',
  },
  {
    name: 'Hollywood C4 Bomb Explosion',
    cat: 'Explosions & Bombs',
    kind: 'explosion',
    route: false,
    c1: '#fef08a',
    c2: '#dc2626',
    dur: 2.4,
    emoji: '💣',
    desc: 'വലിയ ബോംബ് സ്ഫോടനവും തീഗോളവും ഷോക്ക്‌വേവ് പുകയും',
  },
  {
    name: 'Car Crash Inferno Fireball',
    cat: 'Explosions & Bombs',
    kind: 'fireball',
    route: true,
    c1: '#fde047',
    c2: '#ea580c',
    dur: 2.2,
    emoji: '🔥',
    desc: 'തീഗോളവും പുകയും ആക്ഷൻ രംഗങ്ങളിൽ ചേർക്കാം',
  },
  {
    name: 'Bullet Metal Ricochet Sparks',
    cat: 'Sparks & Ricochet',
    kind: 'sparks',
    route: true,
    c1: '#fef9c3',
    c2: '#f59e0b',
    dur: 1.4,
    emoji: '✨',
    desc: 'ഇരുമ്പിലും ചുവരിലും വെടിയുണ്ട തട്ടി തെറിക്കുന്ന തീപ്പൊരി ചിതറൽ',
  },
  {
    name: 'Dense Battlefield Gunsmoke Drift',
    cat: 'Fire & Smoke',
    kind: 'smoke',
    route: false,
    c1: '#e2e8f0',
    c2: '#64748b',
    dur: 3.0,
    emoji: '💨',
    desc: 'വെടിവെപ്പിനും സ്ഫോടനത്തിനും ശേഷമുള്ള റിയലിസ്റ്റിക് പുക പടലങ്ങൾ',
  },
  {
    name: 'Thor Sky Lightning Strike Bolt',
    cat: 'Lightning & Storm',
    kind: 'lightning',
    route: true,
    c1: '#e0f2fe',
    c2: '#38bdf8',
    dur: 1.5,
    emoji: '⚡',
    desc: 'ആകാശത്തുനിന്നോ കൈകളിൽ നിന്നോ ലക്ഷ്യത്തിലേക്ക് പതിക്കുന്ന ശക്തമായ മിന്നൽ പിണർ',
  },
  {
    name: 'Monsoon Storm Heavy Rain & Flash',
    cat: 'Lightning & Storm',
    kind: 'rain_storm',
    route: false,
    c1: '#bae6fd',
    c2: '#0284c7',
    dur: 4.0,
    emoji: '🌧️',
    desc: 'സിനിമാറ്റിക് പേമാരിയും ഇടിമിന്നൽ വെളിച്ചവും',
  },
  {
    name: 'Sci-Fi Plasma Laser Beam',
    cat: 'Laser & Sci-Fi',
    kind: 'laser_beam',
    route: true,
    c1: '#a5f3fc',
    c2: '#ec4899',
    dur: 1.8,
    emoji: '🛸',
    desc: 'തോക്കിൽ നിന്നോ കണ്ണിൽ നിന്നോ നേർരേഖയിൽ പായുന്ന സയൻസ് ഫിക്ഷൻ ലേസർ കിരണം',
  },
  {
    name: 'Mystic Doctor Portal Ring',
    cat: 'Laser & Sci-Fi',
    kind: 'portal',
    route: false,
    c1: '#fde047',
    c2: '#f97316',
    dur: 3.0,
    emoji: '🌀',
    desc: 'കറങ്ങുന്ന തീപ്പൊരി മാജിക് പോർട്ടൽ വലയം',
  },
  {
    name: 'Katana Blood Sword Slash Arc',
    cat: 'Sword & Martial Arts',
    kind: 'sword_slash',
    route: true,
    c1: '#f8fafc',
    c2: '#dc2626',
    dur: 1.2,
    emoji: '⚔️',
    desc: 'വാളുകൊണ്ടോ കത്തികൊണ്ടോ വെട്ടുമ്പോൾ ഉണ്ടാകുന്ന വേഗത്തിലുള്ള ആർക്കും രക്തവും',
  },
  {
    name: 'Window Glass Shatter Debris',
    cat: 'Glass & Shockwaves',
    kind: 'glass_shatter',
    route: false,
    c1: '#f0f9ff',
    c2: '#7dd3fc',
    dur: 1.6,
    emoji: '🪟',
    desc: 'വെടിയുണ്ടയോ ഇടിയോ ഏറ്റ് ചില്ല് പൊട്ടിത്തെറിക്കുന്ന കഷണങ്ങൾ',
  },
  {
    name: 'Super Punch Sonic Shockwave',
    cat: 'Glass & Shockwaves',
    kind: 'shockwave',
    route: false,
    c1: '#ffffff',
    c2: '#2dd4bf',
    dur: 1.3,
    emoji: '💫',
    desc: 'ആക്ഷൻ പഞ്ചിലും ലാൻഡിംഗിലും വൃത്താകൃതിയിൽ പടരുന്ന ഷോക്ക്‌വേവ് തരംഗം',
  },
];

const VFX_VARIANTS = [
  'Pro',
  'IMAX 4K',
  'Slow-Mo',
  'Heavy',
  'Ultra Crisp',
  'Dark Noir',
  'High Velocity',
  'Raw Action',
  'Close-Up',
  'Wide Shot',
];

export const VFX_LIST: CinemaVfxItem[] = Array.from({ length: 1200 }, (_, i) => {
  const base = RAW_CINEMA_VFX[i % RAW_CINEMA_VFX.length];
  const variant = VFX_VARIANTS[Math.floor(i / RAW_CINEMA_VFX.length) % VFX_VARIANTS.length];
  const tier = Math.floor(i / (RAW_CINEMA_VFX.length * VFX_VARIANTS.length)) + 1;
  const durMod = Number((base.dur + (i % 5) * 0.25).toFixed(2));
  return {
    id: `cvfx_${i + 1}`,
    name: i < RAW_CINEMA_VFX.length ? base.name : `${base.name} (${variant} #${i + 1})`,
    category: base.cat,
    kind: base.kind,
    hasMotionRoute: base.route,
    primaryColor: base.c1,
    secondaryColor: base.c2,
    defaultDurationSec: durMod,
    emoji: base.emoji,
    description: `${base.desc} · Variant: ${variant} (Set ${tier}) · Duration ${durMod}s`,
  };
});

