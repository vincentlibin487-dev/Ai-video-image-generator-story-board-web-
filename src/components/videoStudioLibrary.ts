// =========================================================================
// CINESTUDIO 4K - EXPANDED CREATIVE ASSETS LIBRARY (1,200 ITEMS PER CATEGORY)
// 1,200 Filters, 1,200 Audio/SFX, 1,200 Transitions, 1,200 Effects,
// 1,200 Titles, 1,200 Templates, 1,200 Stickers, 1,200 Color LUTs, 1,200 VFX.
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
  synthPreset:
    | 'comedy'
    | 'meme_boom'
    | 'cinematic'
    | 'lofi'
    | 'trailer'
    | 'electronic'
    | 'upbeat'
    | 'sfx_whoosh'
    | 'sfx_glass_break'
    | 'sfx_fire_burn'
    | 'sfx_punch_impact'
    | 'sfx_gunshot';
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
  | 'rain_storm'
  | 'building_inferno'
  | 'person_ablaze'
  | 'matchstick_strike'
  | 'fire_tornado';

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

// Local inline SVG cinematic artwork thumbnails (zero external network dependency / never broken)
const makeCinemaThumbSvg = (topHex: string, midHex: string, botHex: string, sunHex: string, silHex: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${topHex}"/><stop offset="55%" stop-color="${midHex}"/><stop offset="100%" stop-color="${botHex}"/></linearGradient></defs><rect width="320" height="180" fill="url(#g)"/><circle cx="225" cy="54" r="32" fill="${sunHex}" opacity="0.88"/><path d="M0 132 L65 88 L128 118 L205 74 L275 112 L320 96 L320 180 L0 180 Z" fill="${silHex}" opacity="0.85"/><path d="M0 148 L95 124 L175 144 L250 116 L320 140 L320 180 L0 180 Z" fill="#090c10" opacity="0.92"/><rect x="14" y="14" width="46" height="14" rx="4" fill="#000" opacity="0.45"/><circle cx="26" cy="21" r="3.5" fill="${sunHex}"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const FILTER_THUMBS = [
  makeCinemaThumbSvg('#0f172a', '#134e4a', '#9a3412', '#fbbf24', '#0f172a'),
  makeCinemaThumbSvg('#311042', '#9d174d', '#0f172a', '#22d3ee', '#1e1b4b'),
  makeCinemaThumbSvg('#451a03', '#b45309', '#1c1917', '#fef08a', '#292524'),
  makeCinemaThumbSvg('#090d16', '#1e293b', '#0f172a', '#e2e8f0', '#020617'),
  makeCinemaThumbSvg('#064e3b', '#047857', '#022c22', '#a7f3d0', '#064e3b'),
  makeCinemaThumbSvg('#7c2d12', '#ea580c', '#450a0a', '#fde047', '#270909'),
  makeCinemaThumbSvg('#1e1b4b', '#4338ca', '#09090b', '#f472b6', '#0f172a'),
  makeCinemaThumbSvg('#27272a', '#52525b', '#09090b', '#fafafa', '#18181b'),
  makeCinemaThumbSvg('#0c4a6e', '#0284c7', '#172554', '#7dd3fc', '#082f49'),
  makeCinemaThumbSvg('#701a75', '#c026d3', '#1e1b4b', '#facc15', '#2e1065'),
  makeCinemaThumbSvg('#14532d', '#16a34a', '#052e16', '#fde047', '#052e16'),
  makeCinemaThumbSvg('#4c0519', '#be123c', '#09090b', '#fda4af', '#18181b'),
];

// -------------------------------------------------------------------------
// 1. FILTERS & LUTS LIBRARY (300 Curated Cinematic Filters Across 11 Categories)
// -------------------------------------------------------------------------
export const FILTER_CATEGORIES = [
  'Cinematic',
  'Teal & Orange',
  'Vintage',
  'Warm',
  'Cool',
  'Vivid',
  'Contrast',
  'Fade',
  'Monochrome',
  'Portrait',
  'Retro',
] as const;

const RAW_FILTER_DEFINITIONS: Array<{
  name: string;
  cat: (typeof FILTER_CATEGORIES)[number];
  css: string;
  desc: string;
  thumbIdx: number;
}> = [
  // Cinematic
  { name: 'Blockbuster 70mm IMAX', cat: 'Cinematic', css: 'contrast(128%) saturate(122%) brightness(98%)', desc: 'High-clarity theatrical 70mm film density and balanced midtones', thumbIdx: 0 },
  { name: 'Cyberpunk Tokyo Neon', cat: 'Cinematic', css: 'contrast(136%) saturate(170%) hue-rotate(42deg)', desc: 'Electric cyan & magenta night neon contrast boost', thumbIdx: 1 },
  { name: 'Dune Arrakis Gold', cat: 'Cinematic', css: 'sepia(55%) contrast(118%) saturate(138%) brightness(103%)', desc: 'Golden sand warmth with sun-bleached desert highlights', thumbIdx: 2 },
  { name: 'Gotham Shadow Noir', cat: 'Cinematic', css: 'contrast(152%) brightness(84%) saturate(74%)', desc: 'Dark moody shadows and muted thriller grit', thumbIdx: 3 },
  { name: 'Pandora Forest Glow', cat: 'Cinematic', css: 'hue-rotate(115deg) saturate(165%) contrast(125%)', desc: 'Lush glowing emerald & cyan forest tone', thumbIdx: 4 },

  // Teal & Orange
  { name: 'Teal & Orange Hollywood', cat: 'Teal & Orange', css: 'contrast(126%) saturate(145%) hue-rotate(-14deg)', desc: 'Cool teal shadows paired with warm golden skin highlights', thumbIdx: 0 },
  { name: 'Teal & Orange Harbor', cat: 'Teal & Orange', css: 'contrast(132%) saturate(152%) sepia(18%) hue-rotate(-18deg)', desc: 'Punchy coastal orange sunsets against deep cyan shadows', thumbIdx: 0 },
  { name: 'Teal & Orange Thriller', cat: 'Teal & Orange', css: 'contrast(142%) brightness(94%) saturate(135%) hue-rotate(-12deg)', desc: 'Dramatic teal low-key shadows with amber street highlights', thumbIdx: 8 },
  { name: 'Teal & Orange Action', cat: 'Teal & Orange', css: 'contrast(138%) saturate(160%) sepia(14%) hue-rotate(-16deg)', desc: 'High-energy blockbuster teal & fire contrast curve', thumbIdx: 5 },
  { name: 'Teal & Orange Clean Vlog', cat: 'Teal & Orange', css: 'contrast(118%) brightness(104%) saturate(132%) hue-rotate(-10deg)', desc: 'Crisp natural skin warmth with subtle teal shadow tint', thumbIdx: 0 },

  // Vintage
  { name: 'Vintage Kodachrome 64', cat: 'Vintage', css: 'contrast(126%) saturate(134%) sepia(22%)', desc: 'Classic 1960s slide film richness with warm reds', thumbIdx: 2 },
  { name: 'Super 8mm Amber Wash', cat: 'Vintage', css: 'sepia(42%) contrast(114%) brightness(104%) saturate(118%)', desc: 'Nostalgic home-movie amber wash and soft contrast', thumbIdx: 2 },
  { name: '1970s Celluloid Print', cat: 'Vintage', css: 'sepia(34%) contrast(112%) brightness(98%) saturate(108%)', desc: 'Authentic analog projection density and warm shadows', thumbIdx: 5 },
  { name: 'Antique Espresso Print', cat: 'Vintage', css: 'sepia(58%) contrast(116%) brightness(96%) saturate(92%)', desc: 'Deep coffee-toned heritage archive film print', thumbIdx: 2 },
  { name: 'Warm Fuji Velvia 1988', cat: 'Vintage', css: 'sepia(24%) saturate(128%) contrast(120%) brightness(101%)', desc: 'Velvety vintage travel film saturation', thumbIdx: 10 },

  // Warm
  { name: 'Golden Sunset Rim Glow', cat: 'Warm', css: 'sepia(34%) saturate(158%) brightness(105%) contrast(114%)', desc: 'Warm sunset amber light ideal for outdoor shots', thumbIdx: 5 },
  { name: 'Summer Honey Breeze', cat: 'Warm', css: 'sepia(26%) brightness(108%) saturate(136%) contrast(106%)', desc: 'Soft honey sunlight glow with gentle warmth', thumbIdx: 2 },
  { name: 'Desert Amber Heat', cat: 'Warm', css: 'sepia(46%) saturate(152%) contrast(122%) brightness(102%)', desc: 'Blazing amber sun tones and rich copper midtones', thumbIdx: 5 },
  { name: 'Candlelight Romance', cat: 'Warm', css: 'sepia(38%) brightness(97%) contrast(118%) saturate(126%)', desc: 'Intimate warm indoor tungsten evening tone', thumbIdx: 11 },
  { name: 'Tropical Saffron Pop', cat: 'Warm', css: 'sepia(20%) saturate(162%) contrast(116%) brightness(104%)', desc: 'Vibrant warm coastal sunlight and golden skin', thumbIdx: 5 },

  // Cool
  { name: 'Nordic Ice Slate', cat: 'Cool', css: 'contrast(124%) brightness(95%) saturate(88%) hue-rotate(185deg)', desc: 'Crisp icy blue-grey shadows for winter & thriller scenes', thumbIdx: 8 },
  { name: 'Midnight Arctic Blue', cat: 'Cool', css: 'contrast(132%) brightness(88%) saturate(105%) hue-rotate(195deg)', desc: 'Deep nocturnal steel-blue moonlight atmosphere', thumbIdx: 3 },
  { name: 'Ocean Breeze Cyan', cat: 'Cool', css: 'contrast(114%) brightness(103%) saturate(122%) hue-rotate(165deg)', desc: 'Clean refreshing coastal blue-cyan highlights', thumbIdx: 8 },
  { name: 'Steel Rainstorm Mist', cat: 'Cool', css: 'contrast(120%) brightness(94%) saturate(78%) hue-rotate(175deg)', desc: 'Cool slate overcast tone with cinematic rain atmosphere', thumbIdx: 3 },
  { name: 'Glacier Crystal Sharp', cat: 'Cool', css: 'contrast(128%) brightness(106%) saturate(112%) hue-rotate(170deg)', desc: 'Bright crisp glacier clarity and pure cool whites', thumbIdx: 8 },

  // Vivid
  { name: 'Ultra Vivid Cinema Pop', cat: 'Vivid', css: 'saturate(170%) contrast(124%) brightness(102%)', desc: 'High-impact commercial vivid colors for reels & promos', thumbIdx: 9 },
  { name: 'HDR Hyper Dynamic', cat: 'Vivid', css: 'contrast(136%) saturate(155%) brightness(105%)', desc: 'Crisp detail pop across shadows and bright skies', thumbIdx: 10 },
  { name: 'Festival Neon Punch', cat: 'Vivid', css: 'saturate(185%) contrast(130%) brightness(104%)', desc: 'Electric festival color boost with luminous reds & blues', thumbIdx: 1 },
  { name: 'Emerald & Crimson Boost', cat: 'Vivid', css: 'saturate(165%) contrast(128%) brightness(101%)', desc: 'Rich vibrant foliage and bold dramatic reds', thumbIdx: 4 },
  { name: 'Daylight Commercial 4K', cat: 'Vivid', css: 'saturate(148%) contrast(120%) brightness(106%)', desc: 'Clean punchy commercial look with bright highlights', thumbIdx: 8 },

  // Contrast
  { name: 'Mad Max High Contrast', cat: 'Contrast', css: 'contrast(172%) saturate(155%) sepia(18%)', desc: 'Punchy extreme contrast and dramatic edge definition', thumbIdx: 5 },
  { name: 'Deep Crush Onyx', cat: 'Contrast', css: 'contrast(164%) brightness(90%) saturate(112%)', desc: 'Crushed ink blacks with crisp luminous midtones', thumbIdx: 3 },
  { name: 'Action Stunt Punch', cat: 'Contrast', css: 'contrast(154%) saturate(135%) brightness(96%)', desc: 'Hard action-movie micro-contrast for fight scenes', thumbIdx: 0 },
  { name: 'Stage Spotlight Hard', cat: 'Contrast', css: 'contrast(158%) brightness(98%) saturate(118%)', desc: 'High-separation spotlight drama and rich shadows', thumbIdx: 11 },
  { name: 'Dark Urban Gritty', cat: 'Contrast', css: 'contrast(148%) brightness(88%) saturate(85%)', desc: 'Street documentary punch with deep gritty shadows', thumbIdx: 7 },

  // Fade
  { name: 'Pastel Matte Fade', cat: 'Fade', css: 'contrast(86%) brightness(110%) saturate(92%)', desc: 'Lifted matte shadows with soft low-contrast film haze', thumbIdx: 6 },
  { name: 'Polaroid Creamy Fade', cat: 'Fade', css: 'contrast(90%) brightness(108%) sepia(20%) saturate(102%)', desc: 'Soft lifted blacks with instant film pastel tint', thumbIdx: 2 },
  { name: 'Morning Fog Wash', cat: 'Fade', css: 'contrast(84%) brightness(112%) saturate(84%)', desc: 'Airy milky fade ideal for dreamy memory flashbacks', thumbIdx: 3 },
  { name: 'Indie Matte Warmth', cat: 'Fade', css: 'contrast(88%) brightness(106%) sepia(16%) saturate(96%)', desc: 'Gentle indie-cinema matte shadow lift and warm midtones', thumbIdx: 2 },
  { name: 'Velvet Lilac Fade', cat: 'Fade', css: 'contrast(90%) brightness(107%) hue-rotate(290deg) saturate(110%)', desc: 'Dreamy muted pastel violet lift across dark areas', thumbIdx: 9 },

  // Monochrome
  { name: 'Classic Silver Gelatin', cat: 'Monochrome', css: 'grayscale(100%) contrast(138%) brightness(96%)', desc: 'True darkroom silver-halide monochrome contrast', thumbIdx: 7 },
  { name: 'Hard Shadow Detective', cat: 'Monochrome', css: 'grayscale(100%) contrast(172%) brightness(84%)', desc: 'Chiaroscuro high-contrast black and white thriller look', thumbIdx: 7 },
  { name: 'Soft Matte B&W Portrait', cat: 'Monochrome', css: 'grayscale(100%) contrast(108%) brightness(106%)', desc: 'Gentle low-contrast black & white editorial portrait look', thumbIdx: 7 },
  { name: 'Warm Archival Sepia B&W', cat: 'Monochrome', css: 'grayscale(100%) sepia(28%) contrast(122%)', desc: 'Archival warm sepia-tinted black and white print', thumbIdx: 2 },
  { name: 'Chrome Charcoal 35mm', cat: 'Monochrome', css: 'grayscale(100%) contrast(150%) brightness(94%)', desc: 'Sharp metallic charcoal blacks with clean highlights', thumbIdx: 7 },

  // Portrait
  { name: 'Kodak Portra 400 Soft', cat: 'Portrait', css: 'contrast(106%) saturate(112%) brightness(104%) sepia(10%)', desc: 'Natural flattering skin tones and soft highlight rolloff', thumbIdx: 11 },
  { name: 'Silky Beauty Glow', cat: 'Portrait', css: 'brightness(108%) contrast(102%) saturate(114%) sepia(8%)', desc: 'Luminous soft facial highlights with balanced warmth', thumbIdx: 11 },
  { name: 'Studio Editorial Skin', cat: 'Portrait', css: 'contrast(114%) brightness(103%) saturate(108%)', desc: 'Clean commercial studio skin balance with neutral whites', thumbIdx: 6 },
  { name: 'Golden Hour Portrait', cat: 'Portrait', css: 'sepia(22%) brightness(106%) saturate(124%) contrast(108%)', desc: 'Warm sunset skin glow with soft golden rim ambience', thumbIdx: 5 },
  { name: 'Wedding Ivory Silk', cat: 'Portrait', css: 'brightness(109%) contrast(104%) saturate(106%) sepia(6%)', desc: 'Airy clean ivory whites and romantic natural skin tones', thumbIdx: 11 },

  // Retro
  { name: 'VHS Camcorder 1994', cat: 'Retro', css: 'contrast(115%) brightness(108%) saturate(130%) hue-rotate(10deg)', desc: '90s camcorder tape warmth and vibrant analog color', thumbIdx: 9 },
  { name: '1980s Synthwave Neon', cat: 'Retro', css: 'hue-rotate(290deg) saturate(155%) contrast(124%)', desc: 'Electric 80s violet-magenta arcade retro aesthetic', thumbIdx: 9 },
  { name: 'Cinema Projector 1955', cat: 'Retro', css: 'sepia(32%) contrast(122%) brightness(95%) saturate(104%)', desc: 'Technicolor-inspired mid-century theatrical warmth', thumbIdx: 5 },
  { name: 'Arcade CRT Phosphor', cat: 'Retro', css: 'contrast(128%) saturate(148%) hue-rotate(20deg)', desc: 'Punchy CRT glow with heightened phosphor colors', thumbIdx: 1 },
  { name: 'Disco 70s Sunset Film', cat: 'Retro', css: 'sepia(28%) saturate(144%) contrast(116%) brightness(103%)', desc: 'Groovy 70s warm flare film tone for music edits', thumbIdx: 2 },
];

const FILTER_TIER_NAMES = [
  'I',
  'II',
  'Soft',
  'Deep',
  'Pro',
  'Studio',
  'Cinema',
  'IMAX',
  'HDR',
  'Matte',
  '4K',
  'Master',
  'Filmic',
  'Prime',
  'Anamorphic',
  'Grade',
  'Tone',
  'Ultra',
  'Pure',
  'Plus',
  'Elite',
  'Director',
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
  ...Array.from({ length: 1199 }, (_, idx) => {
    const base = RAW_FILTER_DEFINITIONS[idx % RAW_FILTER_DEFINITIONS.length];
    const cycle = Math.floor(idx / RAW_FILTER_DEFINITIONS.length);
    const factor = 0.84 + (cycle % 10) * 0.04;
    const tierTag = FILTER_TIER_NAMES[cycle % FILTER_TIER_NAMES.length];
    return {
      id: `flt_${idx + 1}`,
      name: cycle === 0 ? base.name : `${base.name} · ${tierTag} ${cycle + 1}`,
      category: base.cat,
      cssFilter: base.css.replace(/(\d+)%/g, (_, n) => `${Math.round(Number(n) * factor)}%`),
      thumbnail: FILTER_THUMBS[base.thumbIdx % FILTER_THUMBS.length],
      description: `${base.desc} · ${Math.round(factor * 100)}% (${base.cat})`,
    };
  }),
];

export const AUDIO_CATEGORIES = [
  'Funny & Meme SFX',
  'Comedy Tracks',
  'Cinematic Score',
  'Trailer Hits',
  'Background Music',
  'Upbeat Beat',
  'Lo-Fi Chill',
  'Electronic',
  'Sound Effects',
] as const;

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
  { title: '🪟 Window Glass Shatter & Crash (ചില്ല് പൊട്ടുന്ന ശബ്ദം)', cat: 'Sound Effects', dur: '00:03', sec: 3, bpm: 120, mood: 'Action Impact', desc: 'Crisp high-frequency glass crash & tumbling crystal shards SFX', synth: 'sfx_glass_break' },
  { title: '🪞 Mirror Shatter & Hammer Smash SFX', cat: 'Sound Effects', dur: '00:03', sec: 3, bpm: 118, mood: 'Thrill Impact', desc: 'Heavy glass crack + scattering shards for action & horror scenes', synth: 'sfx_glass_break' },
  { title: '🍾 Bottle Crash Shatter SFX', cat: 'Sound Effects', dur: '00:02', sec: 2, bpm: 125, mood: 'Smash', desc: 'Sharp glass bottle smash & floor ring impact sound', synth: 'sfx_glass_break' },
  { title: '🔥 Matchstick Strike & Ignite Burst (തീപ്പെട്ടി ഉരയ്ക്കുന്ന ശബ്ദം)', cat: 'Sound Effects', dur: '00:04', sec: 4, bpm: 110, mood: 'Ignition', desc: 'Friction match strike followed by sudden flame ignition roar', synth: 'sfx_fire_burn' },
  { title: '🏚️ Building Inferno Fire Roar & Crackle', cat: 'Sound Effects', dur: '00:10', sec: 10, bpm: 92, mood: 'Inferno', desc: 'Towering building fire blaze crackle and deep flame roar', synth: 'sfx_fire_burn' },
  { title: '🥊 Heavy Action Punch & Crash Impact', cat: 'Sound Effects', dur: '00:02', sec: 2, bpm: 130, mood: 'Fight', desc: 'Deep chest thud + sonic crack for fight choreography', synth: 'sfx_punch_impact' },
  { title: '🔫 Pistol Gunshot & Echo Tail SFX', cat: 'Sound Effects', dur: '00:03', sec: 3, bpm: 140, mood: 'Gunfire', desc: 'Sharp 9mm gunshot crack with metallic echo tail', synth: 'sfx_gunshot' },
  { title: 'Thunderstorm & Rain Ambience', cat: 'Sound Effects', dur: '00:14', sec: 14, bpm: 65, mood: 'Atmosphere', desc: 'Deep rolling thunder rumble for moody night scenes', synth: 'meme_boom' },
];

const ALL_RAW_AUDIO = [...RAW_FUNNY_MEME_SFX, ...RAW_CINEMATIC_AUDIO];
const AUDIO_STYLE_TAGS = ['Studio Master', 'Reels Cut', 'Dolby Mix', 'Bass Boost', 'Acoustic', 'Extended', 'Vlog Edit', '4K Surround'];

export const AUDIO_LIST: AudioItem[] = Array.from({ length: 1200 }, (_, i) => {
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

export const TRANSITION_CATEGORIES = TRANSITION_DEFS.map((d) => d.cat);

export const TRANSITIONS_LIST: TransitionItem[] = Array.from({ length: 1200 }, (_, i) => {
  const def = TRANSITION_DEFS[i % TRANSITION_DEFS.length];
  const baseName = def.names[Math.floor(i / TRANSITION_DEFS.length) % def.names.length];
  const vol = Math.floor(i / (TRANSITION_DEFS.length * def.names.length)) + 1;
  const code = `TR${String(i + 1).padStart(4, '0')}`;
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

export const EFFECT_CATEGORIES = EFFECT_DEFS.map((d) => d.cat);

export const EFFECTS_LIST: EffectItem[] = Array.from({ length: 1200 }, (_, i) => {
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
export const TITLE_CATEGORIES = [
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

export const TITLES_LIST: TitleItem[] = Array.from({ length: 1200 }, (_, i) => {
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
// 6. VIDEO TEMPLATES LIBRARY (1,200 Motion Templates)
// -------------------------------------------------------------------------
export const TEMPLATE_CATEGORIES = [
  'Cinematic Intro',
  'Action Trailer',
  'YouTube Vlog',
  'Business Promo',
  'Social Reels',
  'Gaming Esports',
  'Travel Nature',
  'Comedy & Meme',
];

export const TEMPLATES_LIST: TemplateItem[] = Array.from({ length: 1200 }, (_, i) => {
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
    bgUrl: thumb,
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
export const STICKER_CATEGORIES = [
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

export const STICKERS_LIST: StickerItem[] = Array.from({ length: 1200 }, (_, i) => {
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
// 9. COLOR GRADING LUT PRESETS (300 Presets Across 9 Core Grading Styles)
// -------------------------------------------------------------------------
export const COLOR_GRADE_CATEGORIES = [
  'Cinematic',
  'Teal & Orange',
  'Warm',
  'Cool',
  'Vintage',
  'Contrast',
  'Fade',
  'Vivid',
  'Monochrome',
] as const;

const RAW_COLOR_GRADES: Array<{
  name: string;
  cat: (typeof COLOR_GRADE_CATEGORIES)[number];
  b: number;
  c: number;
  s: number;
  ex: number;
  w: number;
  t: number;
  hi: number;
  sh: number;
  v: number;
  grad: string;
  desc: string;
}> = [
  // Cinematic
  { name: 'IMAX 70mm Neutral Film', cat: 'Cinematic', b: 0, c: 18, s: 12, ex: 4, w: 6, t: 0, hi: 8, sh: -10, v: 26, grad: 'from-zinc-700 to-amber-500', desc: 'Balanced theater print curve with crisp dynamic range' },
  { name: 'Tokyo Cyberpunk Magenta', cat: 'Cinematic', b: 4, c: 30, s: 44, ex: 5, w: 0, t: 285, hi: 18, sh: -14, v: 36, grad: 'from-fuchsia-600 to-cyan-400', desc: 'Electric neon saturation & violet-cyan color shift' },
  { name: 'Epic Drama Rich Shadow', cat: 'Cinematic', b: -4, c: 26, s: 8, ex: 0, w: 8, t: -4, hi: 10, sh: -20, v: 34, grad: 'from-slate-800 to-amber-600', desc: 'Deep sculpted midtones with warm specular highlights' },
  { name: 'Anamorphic Night Scene', cat: 'Cinematic', b: -6, c: 28, s: 18, ex: -4, w: 0, t: 195, hi: 14, sh: -22, v: 38, grad: 'from-cyan-800 to-indigo-950', desc: 'Sleek cool night shadows with bright neon reflections' },

  // Teal & Orange
  { name: 'Blockbuster Teal & Orange', cat: 'Teal & Orange', b: 2, c: 22, s: 24, ex: 5, w: 14, t: -12, hi: 10, sh: -15, v: 32, grad: 'from-teal-500 to-orange-500', desc: 'Deep teal shadows balanced with rich golden orange skin tones' },
  { name: 'Miami Coast Teal Amber', cat: 'Teal & Orange', b: 6, c: 18, s: 30, ex: 6, w: 20, t: -16, hi: 12, sh: -10, v: 22, grad: 'from-cyan-400 to-amber-500', desc: 'Sunlit ocean teal shadows and warm sunset skin punch' },
  { name: 'Action Stunt Teal Crush', cat: 'Teal & Orange', b: -4, c: 34, s: 28, ex: 2, w: 12, t: -14, hi: 14, sh: -24, v: 42, grad: 'from-teal-700 to-orange-600', desc: 'High-impact thriller shadows with blazing orange highlights' },
  { name: 'Vlog Clean Teal & Gold', cat: 'Teal & Orange', b: 5, c: 14, s: 18, ex: 5, w: 10, t: -9, hi: 8, sh: 4, v: 16, grad: 'from-emerald-500 to-amber-400', desc: 'Natural flattering vlogger grade with crisp color separation' },

  // Warm
  { name: 'Golden Sunset Glow', cat: 'Warm', b: 8, c: 14, s: 26, ex: 8, w: 38, t: -6, hi: 14, sh: 6, v: 22, grad: 'from-amber-400 to-rose-500', desc: 'Warm sunset light boost with rich golden saturation' },
  { name: 'Desert Amber Sun', cat: 'Warm', b: 4, c: 20, s: 22, ex: 6, w: 46, t: -8, hi: 10, sh: -6, v: 28, grad: 'from-orange-500 to-yellow-500', desc: 'Radiant golden warmth ideal for travel & outdoor epics' },
  { name: 'Silky Portrait Warmth', cat: 'Warm', b: 10, c: 6, s: 12, ex: 8, w: 22, t: -4, hi: 12, sh: 14, v: 15, grad: 'from-rose-300 to-amber-200', desc: 'Lifts facial shadows softly with natural warm highlights' },

  // Cool
  { name: 'Nordic Ice Slate', cat: 'Cool', b: -6, c: 24, s: -16, ex: -4, w: 0, t: 185, hi: -8, sh: -18, v: 38, grad: 'from-sky-700 to-slate-900', desc: 'Cool desaturated blue shadows ideal for thriller & drama' },
  { name: 'Moonlight Sapphire', cat: 'Cool', b: -8, c: 28, s: 12, ex: -6, w: 0, t: 205, hi: 8, sh: -24, v: 42, grad: 'from-blue-600 to-slate-950', desc: 'Rich blue nocturnal moonlight look with deep contrast' },
  { name: 'Crisp Morning Steel', cat: 'Cool', b: 4, c: 16, s: -8, ex: 4, w: 0, t: 170, hi: 6, sh: 4, v: 18, grad: 'from-cyan-500 to-slate-700', desc: 'Clean airy cool tone for modern tech & architectural shots' },

  // Vintage
  { name: 'Kodak Vintage 1978', cat: 'Vintage', b: 4, c: 10, s: 14, ex: 0, w: 34, t: -8, hi: -6, sh: 10, v: 30, grad: 'from-yellow-600 to-stone-700', desc: 'Retro warm print tint with softened contrast' },
  { name: 'Super 8 Heritage', cat: 'Vintage', b: 2, c: 12, s: 8, ex: -2, w: 42, t: -5, hi: -10, sh: 12, v: 36, grad: 'from-amber-700 to-stone-800', desc: 'Warm archival home film grade with gentle shadow rolloff' },
  { name: 'Retro Fade Polaroid', cat: 'Vintage', b: 8, c: -8, s: 6, ex: 6, w: 28, t: -4, hi: -8, sh: 18, v: 20, grad: 'from-amber-300 to-stone-600', desc: 'Creamy lifted shadows with nostalgic vintage tint' },

  // Contrast
  { name: 'Gotham Dark Contrast', cat: 'Contrast', b: -10, c: 42, s: -12, ex: -6, w: 0, t: 12, hi: -4, sh: -32, v: 52, grad: 'from-zinc-900 to-indigo-900', desc: 'Crushed dark blacks & dramatic edge vignette' },
  { name: 'Fury Action Hard Punch', cat: 'Contrast', b: -2, c: 46, s: 32, ex: 4, w: 16, t: -6, hi: 16, sh: -28, v: 40, grad: 'from-orange-600 to-zinc-950', desc: 'Extreme punchy highlight & shadow contrast for trailers' },
  { name: 'Onyx Studio Sharp', cat: 'Contrast', b: -4, c: 36, s: 10, ex: 2, w: 4, t: 0, hi: 12, sh: -26, v: 34, grad: 'from-zinc-700 to-black', desc: 'Clean high-contrast studio separation with pure whites' },

  // Fade
  { name: 'Soft Matte Dream', cat: 'Fade', b: 10, c: -18, s: -10, ex: 6, w: 10, t: 0, hi: -12, sh: 26, v: 12, grad: 'from-slate-400 to-zinc-600', desc: 'Lifted matte blacks for dreamy indie film flashbacks' },
  { name: 'Pastel Haze Film', cat: 'Fade', b: 12, c: -14, s: 8, ex: 8, w: 14, t: -6, hi: -8, sh: 24, v: 10, grad: 'from-rose-300 to-sky-300', desc: 'Soft lifted pastel shadow balance for gentle reels' },
  { name: 'Velvet Evening Fade', cat: 'Fade', b: 6, c: -12, s: -18, ex: 2, w: 18, t: 295, hi: -10, sh: 22, v: 22, grad: 'from-purple-400 to-stone-700', desc: 'Moody muted twilight fade with lifted dark areas' },

  // Vivid
  { name: 'Commercial Vivid 4K', cat: 'Vivid', b: 6, c: 20, s: 46, ex: 6, w: 8, t: 0, hi: 14, sh: 4, v: 14, grad: 'from-emerald-400 to-cyan-500', desc: 'High-saturation broadcast pop for crisp outdoor footage' },
  { name: 'Tropical Color Burst', cat: 'Vivid', b: 8, c: 16, s: 52, ex: 8, w: 18, t: -6, hi: 16, sh: 6, v: 12, grad: 'from-yellow-400 to-pink-500', desc: 'Electric summer vibrance across greens, blues & skin tones' },
  { name: 'HDR Cinema Pop', cat: 'Vivid', b: 2, c: 28, s: 38, ex: 4, w: 6, t: 0, hi: 18, sh: -12, v: 24, grad: 'from-sky-400 to-rose-500', desc: 'Deep contrast with vivid saturated primary colors' },

  // Monochrome
  { name: 'Silver Noir Monochrome', cat: 'Monochrome', b: -4, c: 44, s: -100, ex: 0, w: 0, t: 0, hi: 15, sh: -24, v: 48, grad: 'from-zinc-200 to-zinc-950', desc: 'Zero saturation true black & white cinema grade' },
  { name: 'Soft Editorial B&W', cat: 'Monochrome', b: 6, c: 14, s: -100, ex: 4, w: 0, t: 0, hi: 6, sh: 10, v: 18, grad: 'from-zinc-300 to-zinc-700', desc: 'Gentle tonal grayscale print for portraits & documentaries' },
  { name: 'Archival Sepia Noir', cat: 'Monochrome', b: 0, c: 28, s: -100, ex: 0, w: 28, t: 0, hi: 8, sh: -14, v: 36, grad: 'from-amber-200 to-stone-900', desc: 'Warm antique silver-sepia monochrome grade' },
];

export const COLOR_GRADES_LIST: ColorGradePreset[] = Array.from({ length: 1200 }, (_, i) => {
  const base = RAW_COLOR_GRADES[i % RAW_COLOR_GRADES.length];
  const cycle = Math.floor(i / RAW_COLOR_GRADES.length);
  const delta = (cycle % 11) - 5;
  return {
    id: `cg_${i + 1}`,
    name: cycle === 0 ? base.name : `${base.name} · v${cycle + 1}`,
    category: base.cat,
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
    name: 'Burning Building Full Inferno (തീപിടിച്ച കെട്ടിടം)',
    cat: 'Fire & Smoke',
    kind: 'building_inferno',
    route: false,
    c1: '#fef08a',
    c2: '#ea580c',
    dur: 3.5,
    emoji: '🏚️',
    desc: 'ബിൽഡിങ്ങും ജനലുകളും തീ ആളിക്കത്തി വലിയ പുകയും തീപ്പൊരിയും ഉയരുന്ന ആക്ഷൻ ഫയർ VFX',
  },
  {
    name: 'Full-Body Human Fire Aura (ശരീരം കത്തുന്ന തീ VFX)',
    cat: 'Fire & Smoke',
    kind: 'person_ablaze',
    route: false,
    c1: '#fde047',
    c2: '#dc2626',
    dur: 3.0,
    emoji: '🔥',
    desc: 'മനുഷ്യന്റെ ശരീരത്തിൽ വെയ്ക്കാൻ സാധിക്കുന്ന ആളിക്കത്തുന്ന തീയും തീജ്വാലയും',
  },
  {
    name: 'Matchstick Strike & Spinning Fire Throw',
    cat: 'Fire & Smoke',
    kind: 'matchstick_strike',
    route: true,
    c1: '#fef9c3',
    c2: '#f97316',
    dur: 2.2,
    emoji: '🧨',
    desc: 'തീപ്പെട്ടി ഉരസി തീ പിടിക്കുകയും വട്ടത്തിൽ കറങ്ങി തീപ്പൊരി വിതറി പറക്കുകയും ചെയ്യുന്ന ആക്ഷൻ VFX',
  },
  {
    name: 'Swirling Fire Tornado Vortex',
    cat: 'Fire & Smoke',
    kind: 'fire_tornado',
    route: true,
    c1: '#fef08a',
    c2: '#ef4444',
    dur: 2.8,
    emoji: '🌪️',
    desc: 'ചുഴറ്റിയടിക്കുന്ന തീക്കൊടുങ്കാറ്റും തീപ്പൊരി ചിതറലും',
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

