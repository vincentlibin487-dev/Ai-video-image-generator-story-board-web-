export type AspectRatioId = '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '4:5' | '2.35:1';
export type ExportResolutionId = '4k' | '1080p' | '720p' | '480p';
export type ExportFormatId = 'auto' | 'mp4' | 'webm';

export type MotionPresetId =
  | 'none'
  | 'push_in'
  | 'pull_out'
  | 'pan_left'
  | 'pan_right'
  | 'breathe'
  | 'tilt_up'
  | 'tilt_down'
  | 'drift'
  | 'pulse_beat';

export type TitleTemplateId =
  | 'lower_third'
  | 'imax_hero'
  | 'neon_pop'
  | 'doc_badge'
  | 'typewriter'
  | 'gold_frame'
  | 'vhs_stamp'
  | 'minimal_whisper'
  | 'split_dual'
  | 'glitch_thriller'
  | 'chapter_card'
  | 'slide_up'
  | 'news_ticker'
  | 'cinema_credits'
  | 'vlog_pill'
  | 'quote_block';

export interface FilterDefinition {
  id: string;
  name: string;
  category: string;
  css: string;
  swatch: string;
}

export interface TransitionDefinition {
  id: string;
  name: string;
  category: string;
}

export interface MotionDefinition {
  id: MotionPresetId;
  name: string;
  sub: string;
}

export interface TitleTemplateDefinition {
  id: TitleTemplateId;
  name: string;
  tag: string;
  defaultColor: string;
  defaultPos: 'top' | 'center' | 'bottom';
  fontStyle: 'cinema' | 'bold' | 'mono';
}

export const ASPECT_RATIO_OPTIONS: Array<{
  id: AspectRatioId;
  label: string;
  ratio: number;
  dims: Record<ExportResolutionId, { width: number; height: number }>;
}> = [
  {
    id: '16:9',
    label: '16:9',
    ratio: 16 / 9,
    dims: {
      '4k': { width: 3840, height: 2160 },
      '1080p': { width: 1920, height: 1080 },
      '720p': { width: 1280, height: 720 },
      '480p': { width: 854, height: 480 },
    },
  },
  {
    id: '9:16',
    label: '9:16',
    ratio: 9 / 16,
    dims: {
      '4k': { width: 2160, height: 3840 },
      '1080p': { width: 1080, height: 1920 },
      '720p': { width: 720, height: 1280 },
      '480p': { width: 480, height: 854 },
    },
  },
  {
    id: '1:1',
    label: '1:1',
    ratio: 1,
    dims: {
      '4k': { width: 2160, height: 2160 },
      '1080p': { width: 1080, height: 1080 },
      '720p': { width: 720, height: 720 },
      '480p': { width: 480, height: 480 },
    },
  },
  {
    id: '4:3',
    label: '4:3',
    ratio: 4 / 3,
    dims: {
      '4k': { width: 2880, height: 2160 },
      '1080p': { width: 1440, height: 1080 },
      '720p': { width: 960, height: 720 },
      '480p': { width: 640, height: 480 },
    },
  },
  {
    id: '3:4',
    label: '3:4',
    ratio: 3 / 4,
    dims: {
      '4k': { width: 2160, height: 2880 },
      '1080p': { width: 1080, height: 1440 },
      '720p': { width: 720, height: 960 },
      '480p': { width: 480, height: 640 },
    },
  },
  {
    id: '4:5',
    label: '4:5',
    ratio: 4 / 5,
    dims: {
      '4k': { width: 2160, height: 2700 },
      '1080p': { width: 1080, height: 1350 },
      '720p': { width: 720, height: 900 },
      '480p': { width: 480, height: 600 },
    },
  },
  {
    id: '2.35:1',
    label: '2.35:1',
    ratio: 2.35,
    dims: {
      '4k': { width: 3840, height: 1634 },
      '1080p': { width: 1920, height: 816 },
      '720p': { width: 1280, height: 544 },
      '480p': { width: 854, height: 364 },
    },
  },
];

const RAW_CATEGORY_NAMES = [
  'Mollywood Blockbuster', 'OTT Streaming 4K', 'Kochi Rain LUT', 'Thrillers Dark', 'Romantic Golden',
  'Retro 90s', 'Cyberpunk Neon', 'Vivid Travel', 'Matte Pastel', 'Noir Detective',
  'Epic IMAX', 'Dusk Moody', 'Vintage 8mm', 'Neon City', 'Royal Gold',
  'Sunset Glow', 'Ocean Breeze', 'Midnight Chase', 'Festival Joy', 'Vlog Clean',
  'Moody Drama', 'Action Grit', 'Documentary Real', 'Vintage Film', 'HDR Pop',
  'Silver Screen', 'Soft Portrait', 'Warm Hearth', 'Cold Frost', 'Cyber Matrix',
  'Vintage Sepia', 'Neon Night', 'Pastel Cream', 'Deep Forest', 'Desert Storm',
  'Monsoon Haze', 'Urban Glow', 'Retro Disco', 'Minimal White', 'Dark Ambient',
  'Cinematic Teal', 'Golden Age', 'Classic Noir', 'Hyper Pop', 'Soft Dream',
  'Tech Glow', 'Royal Velvet', 'Vintage Print', 'Cyber Neon', 'Warm Memories',
  'Cool Breeze', 'Midnight Mystery', 'Sunset Glow', 'Emerald Forest', 'Ruby Drama',
  'Sapphire Blue', 'Amber Gold', 'Silver Mono', 'Charcoal Dark', 'Ivory Soft',
  'Pearl White', 'Obsidian Black', 'Titanium Steel', 'Bronze Metal', 'Copper Rust',
  'Platinum Shine', 'Diamond Spark', 'Crystal Clear', 'Neon Laser', 'Plasma Purple',
  'Electric Blue', 'Solar Flare', 'Cosmic Nebula', 'Galaxy Deep', 'Starlight Glow',
  'Aurora Borealis', 'Volcanic Ash', 'Glacier Ice', 'Tidal Wave', 'Storm Cloud',
];

export const FILTER_CATEGORIES: string[] = ['All', ...RAW_CATEGORY_NAMES];

const BASE_FILTERS: FilterDefinition[] = [
  { id: 'none', name: 'Original', category: 'Basic', css: '', swatch: 'from-zinc-600 to-zinc-900' },
  { id: 'b_bright1', name: 'Bright +1', category: 'Basic', css: 'brightness(1.1)', swatch: 'from-zinc-300 to-zinc-700' },
  { id: 'b_bright2', name: 'Bright +2', category: 'Basic', css: 'brightness(1.22) contrast(1.04)', swatch: 'from-white to-zinc-600' },
  { id: 'b_contrast1', name: 'Crisp HD', category: 'Basic', css: 'contrast(1.22) saturate(1.08)', swatch: 'from-zinc-400 to-zinc-950' },
  { id: 'b_sat1', name: 'Rich Color', category: 'Basic', css: 'saturate(1.35)', swatch: 'from-rose-500 to-amber-500' },
];

export const FILTER_LIBRARY: FilterDefinition[] = [
  ...BASE_FILTERS,
  ...RAW_CATEGORY_NAMES.flatMap((catName, catIdx) => {
    const prefix = `f${catIdx + 1}`;
    const swatches = [
      'from-amber-600 to-zinc-900',
      'from-emerald-600 to-teal-950',
      'from-fuchsia-600 to-indigo-950',
      'from-rose-600 to-amber-950',
      'from-sky-600 to-slate-950',
    ];
    const swatch = swatches[catIdx % swatches.length];
    const items: FilterDefinition[] = [];
    for (let i = 1; i <= 150; i++) {
      items.push({
        id: `${prefix}_${i}`,
        name: `${catName} #${i}`,
        category: catName,
        css: `contrast(${(1.0 + (i % 5) * 0.04).toFixed(2)}) saturate(${(0.85 + (i % 6) * 0.05).toFixed(2)}) brightness(${(0.95 + (i % 4) * 0.03).toFixed(2)}) hue-rotate(${((i % 7) - 3) * 5}deg)`,
        swatch,
      });
    }
    return items;
  }),
];

export const MOTION_PRESETS: MotionDefinition[] = [
  { id: 'none', name: 'Static', sub: 'No motion' },
  { id: 'push_in', name: 'Push In', sub: 'Slow zoom in' },
  { id: 'pull_out', name: 'Pull Out', sub: 'Smooth zoom out' },
  { id: 'pan_left', name: 'Pan Left', sub: 'Cinema pan left' },
  { id: 'pan_right', name: 'Pan Right', sub: 'Smooth pan right' },
  { id: 'breathe', name: 'Handheld', sub: 'Live breath' },
  { id: 'tilt_up', name: 'Tilt Up', sub: 'Reveal climb' },
  { id: 'tilt_down', name: 'Tilt Down', sub: 'Slow drop' },
  { id: 'drift', name: 'Float Drift', sub: 'Dreamy drift' },
  { id: 'pulse_beat', name: 'Beat Pulse', sub: 'Rhythmic zoom' },
];

export const TITLE_TEMPLATES: TitleTemplateDefinition[] = [
  { id: 'lower_third', name: 'Netflix Lower 3rd', tag: 'CINEMA', defaultColor: '#f59e0b', defaultPos: 'bottom', fontStyle: 'bold' },
  { id: 'imax_hero', name: 'IMAX Opening', tag: 'EPIC', defaultColor: '#ffffff', defaultPos: 'center', fontStyle: 'cinema' },
  { id: 'neon_pop', name: 'Reels Neon Pop', tag: 'VIRAL', defaultColor: '#f43f5e', defaultPos: 'center', fontStyle: 'bold' },
  { id: 'doc_badge', name: 'Documentary Tag', tag: 'NEWS', defaultColor: '#38bdf8', defaultPos: 'top', fontStyle: 'mono' },
  { id: 'typewriter', name: 'Story Typewriter', tag: 'STORY', defaultColor: '#e4e4e7', defaultPos: 'bottom', fontStyle: 'mono' },
  { id: 'gold_frame', name: 'Gold Cinema Box', tag: 'LUXURY', defaultColor: '#fbbf24', defaultPos: 'center', fontStyle: 'cinema' },
  { id: 'vhs_stamp', name: 'Retro VHS Date', tag: '90s', defaultColor: '#22d3ee', defaultPos: 'top', fontStyle: 'mono' },
  { id: 'minimal_whisper', name: 'Soft Whisper', tag: 'CLEAN', defaultColor: '#ffffff', defaultPos: 'bottom', fontStyle: 'bold' },
  { id: 'split_dual', name: 'Dual Line Card', tag: 'TRAILER', defaultColor: '#ffffff', defaultPos: 'center', fontStyle: 'cinema' },
  { id: 'glitch_thriller', name: 'Glitch Thriller', tag: 'DARK', defaultColor: '#ef4444', defaultPos: 'center', fontStyle: 'mono' },
  { id: 'chapter_card', name: 'Chapter Card', tag: 'SCENE', defaultColor: '#fde68a', defaultPos: 'center', fontStyle: 'cinema' },
  { id: 'slide_up', name: 'Slide-Up Credits', tag: 'OUTRO', defaultColor: '#ffffff', defaultPos: 'bottom', fontStyle: 'bold' },
  { id: 'news_ticker', name: 'Breaking Banner', tag: 'LIVE', defaultColor: '#dc2626', defaultPos: 'bottom', fontStyle: 'bold' },
  { id: 'cinema_credits', name: 'End Roll Title', tag: 'END', defaultColor: '#d4d4d8', defaultPos: 'center', fontStyle: 'cinema' },
  { id: 'vlog_pill', name: 'Vlog White Pill', tag: 'VLOG', defaultColor: '#10b981', defaultPos: 'top', fontStyle: 'bold' },
  { id: 'quote_block', name: 'Story Quote Bar', tag: 'QUOTE', defaultColor: '#f59e0b', defaultPos: 'center', fontStyle: 'cinema' },
];

export const TRANSITION_LIBRARY: TransitionDefinition[] = [
  { id: 'zoom_flow', name: 'Smooth Zoom Flow', category: 'Continuity' },
  { id: 'zoom_match_out', name: 'Match Zoom Pull', category: 'Continuity' },
  { id: 'whip_pan_left', name: 'Whip Pan Left', category: 'Continuity' },
  { id: 'whip_pan_right', name: 'Whip Pan Right', category: 'Continuity' },
  { id: 'light_leak', name: 'Cinema Light Leak', category: 'Continuity' },
  { id: 'focus_pull', name: 'Focus Blur Blend', category: 'Continuity' },
  { id: 'whip_pan_up', name: 'Whip Pan Up', category: 'Continuity' },
  { id: 'whip_pan_down', name: 'Whip Pan Down', category: 'Continuity' },
  { id: 'fade', name: 'Cross Dissolve', category: 'Classic' },
  { id: 'black', name: 'Fade Through Black', category: 'Classic' },
  { id: 'white', name: 'Flash White', category: 'Classic' },
  { id: 'dip_amber', name: 'Film Burn Gold', category: 'Cinema' },
  { id: 'slide_left', name: 'Slide Left', category: 'Slide' },
  { id: 'slide_right', name: 'Slide Right', category: 'Slide' },
  { id: 'slide_up', name: 'Slide Up', category: 'Slide' },
  { id: 'slide_down', name: 'Slide Down', category: 'Slide' },
  { id: 'wipe_left', name: 'Wipe Left', category: 'Slide' },
  { id: 'wipe_right', name: 'Wipe Right', category: 'Slide' },
  { id: 'wipe_up', name: 'Wipe Up', category: 'Slide' },
  { id: 'wipe_down', name: 'Wipe Down', category: 'Slide' },
  { id: 'split_v', name: 'Vertical Split Open', category: 'Cinema' },
  { id: 'split_h', name: 'Cinema Curtain Open', category: 'Cinema' },
  { id: 'zoom_in', name: 'Zoom Punch In', category: 'Zoom' },
  { id: 'zoom_out', name: 'Zoom Pull Out', category: 'Zoom' },
  { id: 'circle_open', name: 'Iris Circle Open', category: 'Cinema' },
  { id: 'spin_in', name: 'Whip Rotate', category: 'Zoom' },
  { id: 'blur_fade', name: 'Dream Blur Fade', category: 'Cinema' },
  { id: 'glitch_flash', name: 'Glitch Flash', category: 'Cinema' },
  { id: 'diagonal_wipe', name: 'Diagonal Wipe', category: 'Slide' },
  { id: 'none', name: 'Hard Cut (Direct)', category: 'Classic' },
];

export function getFilterCssById(filterId: string): string {
  return FILTER_LIBRARY.find((f) => f.id === filterId)?.css || '';
}

export type VfxKind =
  | 'none'
  | 'light_leak'
  | 'sparks'
  | 'glitch'
  | 'weather'
  | 'film_grain'
  | 'neon_glow'
  | 'action_shake'
  | 'bokeh'
  | 'magic_orbs'
  | 'noir_shadow';

export interface VfxDefinition {
  id: string;
  name: string;
  category: string;
  kind: VfxKind;
  sub: string;
  swatch: string;
}

export const VFX_CATEGORIES = [
  'All',
  'Light Leaks & Flares',
  'Sparks & Fire',
  'Cyber Glitch & VHS',
  'Monsoon Rain & Storm',
  'Vintage Film & Grain',
  'Neon Glow & Halation',
  'Action Shakes & Impacts',
  'Optical Bokeh & Prisms',
  'Magic Orbs & Cosmic',
  'Dark Noir & Shadows',
] as const;

const RAW_VFX_GROUPS: Array<{
  category: string;
  kind: VfxKind;
  swatch: string;
  names: string[];
}> = [
  {
    category: 'Light Leaks & Flares',
    kind: 'light_leak',
    swatch: 'from-amber-400 via-orange-500 to-rose-600',
    names: [
      'Golden Sunburst', 'Anamorphic Cyan Streak', 'Sunset Horizon Leak', 'Prism Rainbow Band',
      'Solar Corona Burst', 'Warm 35mm Burn', 'Amber Edge Leak', 'Soft Morning Ray',
      'Neon Pink Glow Streak', 'Ultra Violet Lens Flash', 'Vintage 70s Flare', 'Dreamy Top Leak',
      'Side Burn Gold', 'Diagonal Crystal Beam', 'Double Prism Split', 'Crimson Sunset Leak',
      'Sky Blue Halation Flare', 'Golden Hour Sweep', 'Arc Lens Rainbow', 'Warm Tungsten Bleed',
      'Kochi Coast Sunlight', 'Festival Laser Leak', 'Super 8mm Edge Light', 'Cine Gold Beam',
      'Teal & Orange Leak', 'Soft Pastel Haze', 'Radiant Halo Flare', 'Cinematic Flash Burst',
      'Horizon Anamorphic Flare', 'Pure White Glow Leak'
    ],
  },
  {
    category: 'Sparks & Fire',
    kind: 'sparks',
    swatch: 'from-red-600 via-amber-500 to-yellow-400',
    names: [
      'Mollywood Fire Embers', 'Gold Spark Shower', 'Volcanic Ash Drift', 'Campfire Floating Sparks',
      'Dragon Breath Ash', 'Welding Iron Sparks', 'Magma Ember Rise', 'Bonfire Night Sparks',
      'Fiery Particle Storm', 'Golden Stardust Embers', 'Cinema Action Debris', 'Hot Charcoal Glow',
      'Inferno Flame Spores', 'Molten Copper Sparks', 'Electric Spark Burst', 'Floating Amber Dust',
      'Phoenix Feather Embers', 'Night Sky Flare Sparks', 'Explosive Shock Embers', 'Subtle Campfire Ash',
      'Glittering Fire Sparks', 'Lava Spark Float', 'Cinematic Hearth Glow', 'Blazing Comet Embers',
      'Sparks Whirlwind', 'Warm Ember Haze', 'Ruby Fire Crystals', 'Burning Silk Embers',
      'Heavy Forge Sparks', 'Gentle Firefly Glow'
    ],
  },
  {
    category: 'Cyber Glitch & VHS',
    kind: 'glitch',
    swatch: 'from-fuchsia-600 via-cyan-500 to-blue-600',
    names: [
      'RGB Split Aberration', 'CRT TV Scanlines 4K', 'VHS 1995 Tape Static', 'Datamosh Glitch Wave',
      'Cyber Matrix Rain', 'Hologram Interference', 'Digital Artifact Slice', 'VCR Pause Tracking',
      'Pixel Shift Glitch', 'Cyberpunk Neon Noise', 'Corrupt Data Block', 'Electromagnetic Pulse',
      'Analog Tape Grain', 'Glitch Strobe Beat', 'Subtle TV Static', 'RGB Line Jitter',
      'Cyber Sensor Glitch', 'Fast Frame Tear', 'Magnetic Distortion', 'Retro Camcorder OSD',
      'Matrix Code Drift', 'Terminal phosphor Glow', 'Heavy Tape Noise', 'Neon RGB Twitch',
      'Interlaced Field Shift', 'Cyberpunk HUD Grid', 'Digital Chromatic Tear', 'Quantum Glitch Echo',
      'Analog Rewind Strip', 'Deep Web Static'
    ],
  },
  {
    category: 'Monsoon Rain & Storm',
    kind: 'weather',
    swatch: 'from-blue-600 via-sky-400 to-indigo-900',
    names: [
      'Kochi Heavy Monsoon', 'Thunder Lightning Flash', 'Misty Rain Drizzle', 'Dense Highland Fog',
      'Cinematic Ocean Spray', 'Storm Wind Torrent', 'Gentle Night Rain', 'Thundercloud Darkening',
      'Underwater Light Rays', 'Winter Snow Blizzard', 'Soft Cloud Haze', 'Rapid Monsoon Squall',
      'Deep Sea Blue Mist', 'Rain on Lens Droplets', 'Electric Thunder Strike', 'Monsoon Street Reflection',
      'Cold Mountain Mist', 'Kerala Coastal Squall', 'Tropical Shower', 'Water Caustics Ripple',
      'Heavy Hail Torrent', 'Night Fog Atmosphere', 'Breezy Mist Particles', 'Storm Surge Lightning',
      'Atmospheric Haze 4K', 'Dew Drop Shimmer', 'Monsoon Cloudbreak', 'Ethereal Mist Veil',
      'Raindrop Streaks Pro', 'Cinematic Storm Ambience'
    ],
  },
  {
    category: 'Vintage Film & Grain',
    kind: 'film_grain',
    swatch: 'from-stone-600 via-amber-700 to-zinc-900',
    names: [
      '16mm Vintage Dirt & Hair', '8mm Projector Flicker', 'Cine Gate Weave Jitter', 'Fine 35mm Silver Grain',
      'Sepia Archive Burn', 'Film Sprocket Artifact', 'Vintage Cinema Dust', 'Technicolor 1950 Film',
      'Archival Film Scratches', 'Dust & Scratches Pro', 'Old Cinema Reel Haze', 'Super 8 Jitter Glow',
      'Nitrate Film Degradation', 'Silent Era Black Flicker', 'Rough Cinema Matte', 'Celluloid Burn Pulse',
      'Vintage Slide Projector', 'Retro Polarized Texture', 'Kodak Cine Grain 500T', 'Fuji Superia Film Haze',
      'Film Edge Frame Bleed', 'Micro Scratch Texture', 'Classic Cine Sepia Dust', 'Damaged Tape Scratches',
      '1920s Vignette Grain', 'Analog Print Weave', 'Authentic Celluloid Drift', 'Golden Film Sprockets',
      'Retro Home Video 8mm', 'Documentary Film Grain'
    ],
  },
  {
    category: 'Neon Glow & Halation',
    kind: 'neon_glow',
    swatch: 'from-fuchsia-500 via-purple-600 to-pink-500',
    names: [
      'Cyberpunk Neon Bloom', 'Red Halation Cinema Glow', 'Dreamy Soft Mist Halation', 'Electric Blue Aura',
      'Ultraviolet Glow Wave', 'Neon Magenta Edge Glow', 'Golden Radiant Halo', 'Emerald Neon Pulse',
      'Warm Vintage Halation', 'Deep Purple Night Glow', 'Cyan Edge Lighting', 'Soft Moonlight Aura',
      'Prismatic Glow Diffuse', 'Retro Synthwave Glow', 'Vivid Neon Outline', 'Starlight Aura Bloom',
      'Cyber City Neon Mist', 'Golden Silk Halation', 'Ethereal Dream Aura', 'Cosmic Neon Flare',
      'Laser Beam Glow Ring', 'Infrared Glow Filter', 'Liquid Neon Radiance', 'Mollywood Studio Halo',
      'Pastel Dream Diffusion', 'Vibrant Edge Bleed', 'Tokyo Night Halation', 'High Key Soft Glow',
      'Amber Cinema Bloom', 'Radiant Cyber Flare'
    ],
  },
  {
    category: 'Action Shakes & Impacts',
    kind: 'action_shake',
    swatch: 'from-amber-500 via-red-600 to-zinc-900',
    names: [
      'Kinetic Impact Shake', 'Radial Speed Lines 4K', 'Shockwave Expansion Ring', 'Bass Drop Cinema Thump',
      'Camera Stumble Shake', 'High-Speed Action Zoom', 'Screen Shake Rumble', 'Double Flash Impact',
      'Quake Tremor Vibration', 'Explosive Pulse Wave', 'Bullet Time Motion Warp', 'Slam Cut Flash Pulse',
      'Heavy Bass Vibration', 'Cinematic Gunshot Flash', 'Car Chase Handheld Jolt', 'Whip Camera Impact',
      'Radial Motion Streaks', 'Strobe Action Blink', 'Subtle Earth Tremor', 'High Energy Punch',
      'Fighter Jet Speed Zoom', 'Action Film Rumble', 'Shockwave Air Blur', 'Sudden Impact Jolt',
      'Dynamic Speed Spoke', 'Adrenaline Camera Pulse', 'Subwoofer Frame Shake', 'Explosive Shock Ring',
      'Frenetic Action Blur', 'Ultimate Knockout Impact'
    ],
  },
  {
    category: 'Optical Bokeh & Prisms',
    kind: 'bokeh',
    swatch: 'from-emerald-400 via-teal-500 to-cyan-600',
    names: [
      'Floating Golden Bokeh', 'Hexagon Cine Light Discs', 'Anamorphic Oval Circles', 'Crystal Prism Shards',
      'Rainbow Diffraction Rings', 'Soft Pastel Floating Orbs', 'Night City Traffic Bokeh', 'Emerald Forest Bokeh',
      'Festive Fairy Light Discs', 'Diamond Star Bokeh', 'Water Droplet Bokeh', 'Deep Blue Ambient Discs',
      'Rose Quartz Floating Bokeh', 'Sunlight Canopy Circles', 'Warm Candlelight Bokeh', 'Double Aperture Rings',
      'Swirling Optical Discs', 'Cinema Prime Bokeh 50mm', 'Macro Lens Light Bubbles', 'Sunset Golden Discs',
      'Silver Shimmer Bokeh', 'Ethereal Floating Rings', 'Prism Flare Dispersion', 'Kaleidoscope Light Hex',
      'Twinkling Starlight Bokeh', 'Vintage Glass Aberration', 'Soft Focus Circle Haze', 'Floating Lens Bubbles',
      'Champagne Bubble Bokeh', 'Pure Optical Sphere Glow'
    ],
  },
  {
    category: 'Magic Orbs & Cosmic',
    kind: 'magic_orbs',
    swatch: 'from-violet-500 via-indigo-600 to-purple-800',
    names: [
      'Stardust Particle Shimmer', 'Cosmic Nebula Cloud', 'Fairy Dust Floating Glow', 'Arcane Energy Sparkles',
      'Galaxy Spiral Starlight', 'Aurora Borealis Curtain', 'Magic Spell Orbs', 'Floating Plasma Spirits',
      'Mystic Rune Particles', 'Celestial Star Cascade', 'Ethereal Wisp Drift', 'Supernova Core Glow',
      'Bioluminescent Spores', 'Dreamscape Star Clouds', 'Golden Holy Aura Orbs', 'Dark Magic Purple Wisps',
      'Cosmic Ray Streamers', 'Fairy Tale Sparkle Trail', 'Interstellar Dust Haze', 'Luminous Spirit Orbs',
      'Milky Way Star Density', 'Shimmering Starlight Web', 'Astral Projection Glow', 'Whimsical Fireflies',
      'Quantum Particle Float', 'Time Warp Sparkle Field', 'Glimmering Crystal Orbs', 'Enchanted Forest Wisps',
      'Heavenly Light Beams', 'Infinity Cosmic Spark'
    ],
  },
  {
    category: 'Dark Noir & Shadows',
    kind: 'noir_shadow',
    swatch: 'from-zinc-900 via-stone-800 to-black',
    names: [
      'Deep Cinema Vignette', 'Venetian Blind Shadows', 'Night Vision Infrared Green', 'Red Alert Emergency Strobe',
      'Noir Smoke Tendrils', 'Dramatic Spot Shadow', 'Horror Flash Flicker', 'Sinister Edge Darkness',
      'Dark Whispers Ambient', 'Cyberpunk Shadow Bars', 'Detective Window Shadow', 'Creepy Static Vignette',
      'Midnight Fog Obscurity', 'Pulsing Danger Red', 'Gothic Shadow Veil', 'Old Warehouse Spotlight',
      'Ghostly Shadow Pass', 'Darkroom Red Safelight', 'Surveillance Monitor Haze', 'Heavy Moody Vignette',
      'Cinematic Noir Contrast', 'Thriller Shadow Silhouettes', 'Abyssal Deep Shadows', 'Night Watch Green Grain',
      'Subtle Breathing Shadow', 'Clandestine Light Slits', 'Eerie Cold Vignette', 'Noir Alley Light Beam',
      'Underground Tunnel Shade', 'Ultimate Darkness Fall'
    ],
  },
];

export const VFX_LIBRARY: VfxDefinition[] = [
  {
    id: 'none',
    name: 'Original (No VFX)',
    category: 'Basic',
    kind: 'none',
    sub: 'Clear footage',
    swatch: 'from-zinc-700 to-zinc-900',
  },
  ...RAW_VFX_GROUPS.flatMap((group, gIdx) => {
    return group.names.map((name, nIdx) => ({
      id: `vfx_${gIdx + 1}_${nIdx + 1}`,
      name,
      category: group.category,
      kind: group.kind,
      sub: `${group.category.split(' ')[0]} #${nIdx + 1}`,
      swatch: group.swatch,
    }));
  }),
];

export function getVfxById(id: string): VfxDefinition | undefined {
  return VFX_LIBRARY.find((v) => v.id === id);
}

export interface ColorLutPreset {
  id: string;
  name: string;
  sub: string;
  category: string;
  swatch: string;
  css: string;
}

export const COLOR_LUT_LIBRARY: ColorLutPreset[] = [
  { id: 'none', name: 'None (Rec.709)', sub: 'Standard dynamic range', category: 'Standard', swatch: 'from-zinc-700 to-zinc-900', css: '' },
  { id: 'arri_alexa', name: 'Arri Alexa 709 Pro', sub: 'Organic film curve & skin tones', category: 'Cinema', swatch: 'from-amber-600 to-stone-900', css: 'contrast(1.14) saturate(1.1) brightness(0.98) sepia(5%)' },
  { id: 'davinci_film', name: 'DaVinci Kodak 2383', sub: 'Classic 35mm Hollywood film stock', category: 'Cinema', swatch: 'from-amber-500 via-rose-700 to-zinc-950', css: 'contrast(1.22) saturate(1.15) brightness(0.96) hue-rotate(-3deg)' },
  { id: 'red_komodo', name: 'Red Komodo Cine', sub: 'Punchy commercial contrast', category: 'Cinema', swatch: 'from-red-600 to-zinc-900', css: 'contrast(1.28) saturate(1.18) brightness(1.02)' },
  { id: 'sony_slog3', name: 'Sony S-Log3 to 709', sub: 'Clean digital cinema conversion', category: 'Cinema', swatch: 'from-sky-600 to-slate-900', css: 'contrast(1.1) saturate(0.95) brightness(1.02)' },
  { id: 'teal_orange_pro', name: 'Teal & Orange Pro', sub: 'Maximum cinematic color separation', category: 'Blockbuster', swatch: 'from-teal-500 to-orange-600', css: 'contrast(1.24) saturate(1.3) hue-rotate(-6deg)' },
  { id: 'mollywood_golden', name: 'Mollywood Golden 35mm', sub: 'Warm Kerala sunlight & lush tones', category: 'Blockbuster', swatch: 'from-yellow-500 via-amber-600 to-emerald-950', css: 'contrast(1.16) saturate(1.22) sepia(12%) hue-rotate(4deg)' },
  { id: 'fuji_eterna', name: 'Fuji Eterna 250D', sub: 'Soft pastel documentary look', category: 'Vintage', swatch: 'from-emerald-700 to-stone-800', css: 'contrast(0.98) saturate(0.9) brightness(1.04) sepia(4%)' },
  { id: 'kodak_5207', name: 'Kodak Vision3 5207', sub: 'Rich shadows and golden highlights', category: 'Vintage', swatch: 'from-amber-600 to-stone-950', css: 'contrast(1.18) saturate(1.12) sepia(8%)' },
  { id: 'film_noir_pro', name: 'Noir 35mm High Contrast', sub: 'Dramatic silver halide monochrome', category: 'Monochrome', swatch: 'from-zinc-200 via-zinc-600 to-black', css: 'grayscale(100%) contrast(1.42) brightness(0.94)' },
  { id: 'bleach_bypass', name: 'Bleach Bypass Action', sub: 'Silver retention gritty contrast', category: 'Cinema', swatch: 'from-stone-500 to-zinc-900', css: 'contrast(1.35) saturate(0.55) brightness(1.02)' },
  { id: 'cyberpunk_tokyo', name: 'Cyberpunk Tokyo Neon', sub: 'Intense cyan & purple split', category: 'Stylized', swatch: 'from-fuchsia-600 to-cyan-500', css: 'contrast(1.26) saturate(1.35) hue-rotate(25deg)' },
  { id: 'kochi_monsoon_lut', name: 'Kochi Monsoon Moody', sub: 'Cool blue shadows & vivid greens', category: 'Blockbuster', swatch: 'from-blue-600 to-emerald-700', css: 'contrast(1.15) saturate(1.18) hue-rotate(-12deg)' },
  { id: 'technicolor_1950', name: 'Technicolor 3-Strip', sub: 'Hyper saturated vintage cinema', category: 'Vintage', swatch: 'from-red-500 via-green-500 to-blue-600', css: 'contrast(1.22) saturate(1.45) brightness(1.02)' },
  { id: 'desert_amber', name: 'Desert Dune Amber', sub: 'Sunbaked warmth & golden air', category: 'Stylized', swatch: 'from-amber-400 to-yellow-700', css: 'contrast(1.18) saturate(1.15) sepia(22%)' },
  { id: 'vlog_natural', name: 'Natural Clean 4K', sub: 'Crisp true-to-life vibrant beauty', category: 'Standard', swatch: 'from-rose-400 to-teal-500', css: 'contrast(1.08) saturate(1.12) brightness(1.02)' },
];

export function getLutById(id: string): ColorLutPreset | undefined {
  return COLOR_LUT_LIBRARY.find((l) => l.id === id);
}


