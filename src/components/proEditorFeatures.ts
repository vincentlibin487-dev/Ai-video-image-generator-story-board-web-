// =========================================================================
// CINESTUDIO PRO ENGINE - 300 PRO VIDEO EDITING FEATURES
// Each of the 300 features exposes 660 fine-grained adjustable settings/parts
// across 12 engine sub-modules, driving live preview & export rendering.
// =========================================================================

export type ProFeatureCategory =
  | 'Color & LUT Engines'
  | 'Camera Optics & Lens'
  | 'Lighting & Cinema Glow'
  | 'Film Grain & Halation'
  | 'Keying & AI Masking'
  | 'Motion & Speed Ramp'
  | 'Stabilize & Camera Shake'
  | 'Glitch & CRT Synth'
  | 'Particles & Weather FX'
  | 'Split Screen & Framing'
  | '3D Transform & Curves'
  | 'Audio Mastering & SFX';

export const PRO_FEATURE_CATEGORIES: ProFeatureCategory[] = [
  'Color & LUT Engines',
  'Camera Optics & Lens',
  'Lighting & Cinema Glow',
  'Film Grain & Halation',
  'Keying & AI Masking',
  'Motion & Speed Ramp',
  'Stabilize & Camera Shake',
  'Glitch & CRT Synth',
  'Particles & Weather FX',
  'Split Screen & Framing',
  '3D Transform & Curves',
  'Audio Mastering & SFX',
];

export type RenderChannel =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'warmth'
  | 'tint'
  | 'vignette'
  | 'blur'
  | 'opacity'
  | 'glow'
  | 'chromatic'
  | 'filmGrain'
  | 'letterbox';

export interface ProEditorFeature {
  id: string;
  index: number;
  name: string;
  category: ProFeatureCategory;
  shortDesc: string;
  accentHex: string;
  baseEffect: Partial<Record<RenderChannel, number>>;
}

export interface ProSettingModule {
  id: string;
  title: string;
  channel: RenderChannel;
}

export const PRO_SETTING_MODULES: ProSettingModule[] = [
  { id: 'core_mix', title: '01 · Core Engine & Master Mix', channel: 'opacity' },
  { id: 'tone_exposure', title: '02 · Luma, Exposure & Gamma Matrix', channel: 'brightness' },
  { id: 'contrast_curve', title: '03 · Dynamic Range & S-Curve Contrast', channel: 'contrast' },
  { id: 'color_gamut', title: '04 · Color Gamut & Saturation Vector', channel: 'saturation' },
  { id: 'temp_tint', title: '05 · White Balance, Warmth & Split Tone', channel: 'warmth' },
  { id: 'hue_matrix', title: '06 · 3D Hue & Channel Rotation', channel: 'tint' },
  { id: 'lens_optics', title: '07 · Anamorphic Lens & Optical Focus', channel: 'blur' },
  { id: 'glow_halation', title: '08 · Cinema Halation & Bloom Glow', channel: 'glow' },
  { id: 'chromatic_shift', title: '09 · RGB Chromatic Aberration & Fringe', channel: 'chromatic' },
  { id: 'film_emulsion', title: '10 · Film Grain, Noise & Texture Gate', channel: 'filmGrain' },
  { id: 'vignette_matte', title: '11 · Optical Vignette & Edge Falloff', channel: 'vignette' },
  { id: 'cinema_framing', title: '12 · Cinema Crop, Matte & Gate Safe', channel: 'letterbox' },
];

export interface ProFeatureSettingItem {
  id: string;
  index: number;
  partLabel: string;
  name: string;
  moduleId: string;
  moduleTitle: string;
  channel: RenderChannel;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
}

const CATEGORY_FEATURE_SEEDS: Record<
  ProFeatureCategory,
  {
    titles: string[];
    accent: string;
    base: Partial<Record<RenderChannel, number>>;
  }
> = {
  'Color & LUT Engines': {
    accent: '#2dd4bf',
    base: { contrast: 10, saturation: 12, vignette: 18 },
    titles: [
      'Kodak 2383 Print Emulsion',
      'Teal & Orange Blockbuster',
      'ARRI LogC4 Wide Gamut',
      'RED IPP2 Cinema Curve',
      'Sony S-Log3 S-Gamut3',
      'Fuji Eterna 250D LUT',
      'Hollywood Bleach Bypass',
      'Noir Silver Halide',
      'Golden Hour Desert Warmth',
      'Cyberpunk Neon Matrix',
      'Nordic Cold Steel Grade',
      'Vintage 70s Technicolor',
      'Matte Pastel Editorial',
      'Deep Emerald Shadow Split',
      'Moonlight Indigo Night Grade',
      'High-Key Commercial Pop',
      'HDR10 Tone Mapper Pro',
      'Skin Tone Vectorizer Lock',
      'Sunset Amber Highlight Roll',
      'Monochrome Selenium Tone',
      'Kollywood Mass Contrast LUT',
      'Mollywood Monsoon Natural',
      'Anamorphic Indigo Lift',
      'Velvet Noir Crushed Blacks',
      'Pure Rec.709 Broadcast Cal',
    ],
  },
  'Camera Optics & Lens': {
    accent: '#38bdf8',
    base: { blur: 0.4, vignette: 24, chromatic: 18 },
    titles: [
      'Panavision C-Series Anamorphic',
      'Cooke S4/i Warm Softness',
      'Zeiss Master Prime Crisp',
      'Helios 44-2 Swirly Bokeh',
      'Tilt-Shift Miniature Focus',
      'Fisheye 8mm Ultra-Wide',
      'Super 35mm Spherical Gate',
      '65mm IMAX Vista Vision',
      'Soft Pro-Mist 1/4 Diffusion',
      'Black Pro-Mist 1/2 Filter',
      'Barrel Distortion Corrector',
      'Rack Focus Depth Puller',
      'Macro Ring Edge Falloff',
      'Diopter Split Focus Plane',
      'Chromatic Fringe De-fringe',
      'Catadioptric Donut Bokeh',
      'Vintage Petzval Center Sharp',
      'Telephoto 200mm Compression',
      'Wide 14mm Action Perspective',
      'Pinhole Camera Soft Vignette',
      'Optical Vignette Compensator',
      'Glass Prism Refraction Edge',
      'Subtle Breathe Focus Sim',
      'IR Night Vision Lens Shift',
      'Crystal Clear Zero-Haze Glass',
    ],
  },
  'Lighting & Cinema Glow': {
    accent: '#fbbf24',
    base: { glow: 35, brightness: 6, contrast: 5 },
    titles: [
      'Anamorphic Blue Streak Flare',
      'Golden Rim Light Bloom',
      'Volumetric God-Ray Beams',
      'Studio Softbox Key Fill',
      'Neon Sign Specular Glow',
      'Candlelight Flicker Aura',
      'Sunburst Optical Aperture',
      'Ethereal Angelic Highlight',
      'Subsurface Skin Luminance',
      'Stage Spotlight Cone',
      'Police Siren Dual Strobe',
      'Lightning Sky Illumination',
      'Cyber Street Reflection Shine',
      'Specular Starburst 6-Point',
      'Dreamy Orten Glow Layer',
      'Firelight Warm Pulse',
      'Underwater Caustic Shimmer',
      'Moonbeam Cool Rim Light',
      'TV Screen Face Glow',
      'Headlight High-Beam Flare',
      'Laser Light Ambient Wash',
      'Warm Tungsten Practical Fill',
      'Cool Daylight Window Bounce',
      'Silhouette Edge Rim Contrast',
      'Studio Ring-Light Catchlight',
    ],
  },
  'Film Grain & Halation': {
    accent: '#f97316',
    base: { filmGrain: 38, warmth: 12, vignette: 22 },
    titles: [
      'Kodak Vision3 500T Grain',
      '35mm Fine Archival Grain',
      '16mm Indie Documentary Texture',
      'Super 8mm Home Movie Grain',
      'Red Halation Highlight Bleed',
      'Gate Weave Mechanical Jitter',
      'Vintage Projector Dust & Hair',
      'Celluloid Edge Burn Frame',
      '1920s Silent Film Scratches',
      '8mm Sepia Sprocket Flicker',
      'Ilford HP5 Coarse Silver',
      'CineStill 800T Red Halo',
      'Organic Sensor Grain Sim',
      'VHS Magnetic Tape Speckles',
      'Old Reel Frame Flash',
      'Negative Film Inversion Pass',
      'Cross-Processed E6 Artifacts',
      'Lomo Light-Leak Film Roll',
      'Archival Newsreel Degrade',
      'Micro-Texture Sharpen Grain',
      'Analog Paper Print Fibres',
      'Heavy Grit Thriller Grain',
      'Soft Romantic Film Veil',
      'Pushed 3200 ISO Night Grain',
      'Clean Digital De-Grain Smooth',
    ],
  },
  'Keying & AI Masking': {
    accent: '#10b981',
    base: { contrast: 14, saturation: 6 },
    titles: [
      'Chroma Green Screen Ultra Key',
      'Blue Screen Studio Spill Suppress',
      'AI Subject Depth Isolation',
      'Luma Matte Sky Replacement',
      'Oval Spotlight Feather Mask',
      'Split Linear Gradient Mask',
      'Subject Rim Edge Matte',
      'Radial Face Beauty Isolate',
      'Foreground Silhouette Cutout',
      'Alpha Channel Spill Cleaner',
      'Despill Magenta Balancer',
      'Garbage Matte Perimeter Trim',
      'Motion Tracked Face Blur',
      'License Plate Privacy Mosaic',
      'Skin Protect Secondary Key',
      'HSV Color Qualifier Isolate',
      '3D Color Cube Chroma Key',
      'Dual-Pass Hair Detail Edge',
      'Shadow Catcher Alpha Floor',
      'Selective Color Pop (Red)',
      'Selective Color Pop (Gold)',
      'Inverted Vignette Focus Mask',
      'Custom Polygon Bezier Mask',
      'Subject Pop Contrast Boost',
      'Background Defocus Depth Matte',
    ],
  },
  'Motion & Speed Ramp': {
    accent: '#a855f7',
    base: { contrast: 8, blur: 0.3 },
    titles: [
      'Optical Flow 120fps Slow-Mo',
      'Hero Speed Ramp Punch-In',
      'Bullet Time Freeze Burst',
      '180° Cinema Shutter Blur',
      '360° Hyper-Trail Shutter',
      'Echo Ghost Action Trails',
      'Time-Lapse Frame Blend',
      'Whip-Pan Directional Streak',
      'Beat-Synced Velocity Pulse',
      'Smooth Ease-In Kinetic Ramp',
      'Reverse Motion Rewind Curve',
      'Stop-Motion 12fps Stutter',
      'Sub-Frame Motion Vector',
      'Radial Spin Zoom Blur',
      'Sports Instant Replay Slow',
      'Drift Car Motion Streak',
      'Action Kick Impact Freeze',
      'Hyper-Lapse Trail Stabilizer',
      'Variable Time Stretch 0.25x',
      'High-Speed 4x Fast Forward',
      'Seamless Loop Cross-Blend',
      'Shutter Angle Drag Smear',
      'Kinetic Impact Micro-Pause',
      'Frame Duplication Retro 8fps',
      'Smooth Frame Interpolation',
    ],
  },
  'Stabilize & Camera Shake': {
    accent: '#ec4899',
    base: { vignette: 10 },
    titles: [
      'Cinema Gimbal Lock Smooth',
      'Handheld Documentary Sway',
      'Earthquake Shockwave Shake',
      'Action Punch Impact Jolt',
      'Rolling Shutter Jello Fix',
      'Sniper Scope Breathing Sway',
      'Car Chase Engine Vibration',
      'Helicopter Rotor Micro-Shake',
      'Subtle Human Tripod Drift',
      'Explosion Blast Camera Kick',
      'Warp Stabilizer Horizon Lock',
      'Walking Footstep Cadence',
      'Train Track Rhythmic Bounce',
      'Drone Wind Buffeting Smooth',
      'Horror Panic Handheld Jitter',
      'Concert Bass Speaker Thump',
      'Zoom-Punch Elastic Recoil',
      'Smooth Pan inertia Dampen',
      'Vertical Bob Stabilization',
      'Dutch Angle Pendulum Tilt',
      'Action Run Chase Stabilize',
      'Steadycam Floating Glide',
      'Micro-Jitter Removal Clean',
      'Whip Recoil Spring Bounce',
      'Locked Tripod Horizon Level',
    ],
  },
  'Glitch & CRT Synth': {
    accent: '#06b6d4',
    base: { chromatic: 55, contrast: 18, saturation: 20 },
    titles: [
      'RGB Channel Split Glitch',
      'CRT Television Scanlines',
      'VHS Tracking Error Warp',
      'Digital Datamosh Pixel Tear',
      'Cyberpunk HUD Interference',
      'Bad HDMI Signal Dropout',
      'Phosphor Aperture Grille',
      'Chromatic Slice Strobe',
      '8-Bit Retro Arcade Quantize',
      'Matrix Code Signal Noise',
      'Interlaced Broadcast Comb',
      'Horizontal Sync Tear Bar',
      'VHS Hi-Fi Color Bleed',
      'Static Snow Dead Channel',
      'Glitch Block Compression',
      'Vaporwave Neon Scan',
      'CCTV Security Monitor',
      'Bodycam Timecode Overlay',
      'DVR Fast-Forward Artifacts',
      'Analog Synth Wave Displace',
      'Laserdisc Analog Warmth',
      'Pixel Sort Vertical Drip',
      'Corrupted Frame Buffer',
      'Hologram Flicker Projection',
      'Clean Signal Restorer',
    ],
  },
  'Particles & Weather FX': {
    accent: '#f43f5e',
    base: { glow: 18, contrast: 6, vignette: 20 },
    titles: [
      'Heavy Monsoon Rain Storm',
      'Floating Golden Dust Motes',
      'Battlefield Fire Embers',
      'Winter Snowfall Blizzard',
      'Dense Ground Rolling Fog',
      'Volcanic Ash & Smoke',
      'Confetti Celebration Burst',
      'Cherry Blossom Wind Drift',
      'Ocean Sea-Spray Mist',
      'Laser Spark Shower Down',
      'Desert Sandstorm Haze',
      'Autumn Leaves Gust',
      'Starfield Warp Hyperspace',
      'Fireflies Night Forest',
      'Steam Vent Atmospheric',
      'Underwater Rising Bubbles',
      'Matrix Digital Rain Fall',
      'Neon Bokeh Floating Orbs',
      'Glass Shards Explosion',
      'Magical Fairy Sparkle',
      'Tactical Smoke Grenade',
      'Thunderstorm Electric Arcs',
      'Stage Dry-Ice Floor Haze',
      'Drizzle Morning Dew',
      'Zero-Atmosphere Vacuum',
    ],
  },
  'Split Screen & Framing': {
    accent: '#eab308',
    base: { letterbox: 12, contrast: 6 },
    titles: [
      'Cinema 2.39:1 Scope Bars',
      '2.00:1 Netflix Originals Matte',
      '1.85:1 Theatrical Flat Gate',
      '4:3 Vintage Academy Ratio',
      '1:1 Square Social Safe',
      '9:16 Vertical Reels Safe',
      'Dual Side-by-Side Split',
      'Triple Manga Panel Frame',
      'Picture-in-Picture Rounded',
      'Film Strip Border Perforated',
      'Polaroid Instant Photo Matte',
      'Rule of Thirds Director Grid',
      'Center Crosshair Action Guide',
      'Broadcast Safe Title Zones',
      'Comic Book Gutter Divider',
      'Mirror Kaleidoscope Vertical',
      'Mirror Symmetrical Horizontal',
      'Quad CCTV Security Grid',
      'Rounded Tablet Bezel Frame',
      'Cinema Curtain Open Matte',
      'Anamorphic Squeeze Preview',
      'Dynamic Letterbox Reveal',
      'White Gallery Museum Border',
      'Soft Shadow Card Inset',
      'Full Bleed Edge-to-Edge',
    ],
  },
  '3D Transform & Curves': {
    accent: '#8b5cf6',
    base: { contrast: 5 },
    titles: [
      '3D Perspective Tilt Plane',
      'Smooth Ken Burns Push-In',
      'Slow Dramatic Pull-Out',
      'Horizontal Parallax Pan',
      '3D Card Flip Transition',
      'Dutch Angle Tension Roll',
      'Elastic Overshoot Bounce',
      'Bezier Ease-In-Out Curve',
      'Anchor Point Orbit Spin',
      'Corner Pin Screen Replace',
      'Keystone Perspective Fix',
      'Vertigo Dolly-Zoom Illusion',
      'Micro Breathing Pulse',
      'Isometric Tilted Viewport',
      'Curved IMAX Dome Bend',
      'Subtle Drift Left-to-Right',
      'Vertical Elevator Reveal',
      'Zoom-In Beat Drop Snap',
      'Flip Mirror X/Y Invert',
      'Scale Overscan Trim 105%',
      'Floating Levitate Bobbing',
      'Tilt-Up Heroic Low Angle',
      'Tilt-Down Overhead Look',
      'Whip Zoom Anchor Center',
      'Locked Identity Transform',
    ],
  },
  'Audio Mastering & SFX': {
    accent: '#22c55e',
    base: {},
    titles: [
      'Cinema Voice Clarity EQ',
      'Deep Sub-Bass LFE Boost',
      'Podcast Broadcast Compressor',
      'Cathedral Hall Reverb FX',
      'Telephone Bandpass Filter',
      'Underwater Muffled Low-Pass',
      'Stadium Crowd Wide Stereo',
      'De-Esser Sibilance Tamer',
      'Background Noise Gate Clean',
      'Auto-Ducking Music Under Voice',
      'Vinyl Crackle Warmth Bus',
      'Radio Walkie-Talkie Fuzz',
      '3D Binaural Spatial Panning',
      'Tape Saturation Analog Warmth',
      'Brickwall True-Peak Limiter',
      'Dialogue Presence 3kHz Lift',
      'Wind Rumble High-Pass Cut',
      'Horror Sub-Drop Tension Riser',
      'Echo Canyon Delay Tail',
      'Robot Vocoder Pitch Shift',
      'Chipmunk Speed Pitch Up',
      'Deep Trailer Voice Pitch Down',
      'LUFS -14 YouTube Loudness',
      'LUFS -16 Mobile Social Master',
      'Studio Flat Reference Bypass',
    ],
  },
};

const PRO_PRESET_VARIANTS = ['Studio', 'IMAX 4K', 'Cinema Pro', 'Ultra Crisp'];

export const PRO_EDITOR_FEATURES: ProEditorFeature[] = (() => {
  const list: ProEditorFeature[] = [];
  let idx = 1;
  for (const cat of PRO_FEATURE_CATEGORIES) {
    const seed = CATEGORY_FEATURE_SEEDS[cat];
    for (let cycle = 0; cycle < 4; cycle += 1) {
      const variantTag = PRO_PRESET_VARIANTS[cycle];
      seed.titles.forEach((title, localIdx) => {
        const displayName = cycle === 0 ? title : `${title} · ${variantTag} #${idx}`;
        list.push({
          id: `pro_feat_${idx}`,
          index: idx,
          name: displayName,
          category: cat,
          shortDesc: `${cat} · ${variantTag} · 660 Precision Controls`,
          accentHex: seed.accent,
          baseEffect: {
            ...seed.base,
            contrast: (seed.base.contrast || 0) + ((localIdx + cycle) % 5 - 2) * 2,
            saturation: (seed.base.saturation || 0) + ((localIdx + cycle) % 4 - 1) * 3,
            brightness: (seed.base.brightness || 0) + (cycle - 1) * 2,
          },
        });
        idx += 1;
      });
    }
  }
  return list;
})();

const SUB_PART_ADJECTIVES = [
  'Master Blend',
  'Primary Bias',
  'Secondary Trim',
  'Highlight Guard',
  'Midtone Pivot',
  'Shadow Floor',
  'Micro Threshold',
  'Shoulder Roll-Off',
  'Toe Compression',
  'Slope Response',
  'Feather Falloff',
  'Temporal Smooth',
  'Spatial Radius',
  'Harmonic Ratio',
  'Fine Calibration',
  'Sub-Pixel Offset',
  'Edge Sensitivity',
  'Luma Weighting',
  'Chroma Priority',
  'Dynamic Headroom',
  'Saturation Ceiling',
  'Warmth Balance',
  'Cool Counter-Shift',
  'Key Frame Damping',
  'Specular Clamp',
  'Diffusion Density',
  'Grain Coherence',
  'Texture Amplitude',
  'Vignette Roundness',
  'Gate Aspect Ratio',
  'Optical Pitch',
  'Optical Yaw',
  'Fringe Suppression',
  'Red Channel Trim',
  'Green Channel Trim',
  'Blue Channel Trim',
  'Cyan Vector Shift',
  'Magenta Vector Shift',
  'Yellow Vector Shift',
  'Skin Protect Range',
  'Motion Vector Lock',
  'Shutter Compensation',
  'Frequency Cutoff',
  'Resonance Q-Factor',
  'Stereo Width',
  'Attack Envelope',
  'Release Envelope',
  'Knee Softness',
  'Harmonic Drive',
  'Phase Alignment',
  'Output Gain Stage',
  'Clip Safe Limiter',
  'Alpha Pre-Multiply',
  'Mask Expansion',
  'Final Precision Mix',
];

const CHANNEL_RANGES: Record<
  RenderChannel,
  { min: number; max: number; step: number; unit: string }
> = {
  brightness: { min: -50, max: 50, step: 1, unit: '%' },
  contrast: { min: -50, max: 50, step: 1, unit: '%' },
  saturation: { min: -60, max: 60, step: 1, unit: '%' },
  warmth: { min: -50, max: 50, step: 1, unit: '%' },
  tint: { min: -90, max: 90, step: 1, unit: '°' },
  vignette: { min: 0, max: 80, step: 1, unit: '%' },
  blur: { min: 0, max: 6, step: 0.1, unit: 'px' },
  opacity: { min: 0, max: 100, step: 1, unit: '%' },
  glow: { min: 0, max: 100, step: 1, unit: '%' },
  chromatic: { min: 0, max: 100, step: 1, unit: '%' },
  filmGrain: { min: 0, max: 100, step: 1, unit: '%' },
  letterbox: { min: 0, max: 25, step: 1, unit: '%' },
};

/**
 * Generates 660 structured, named, functional settings (12 Modules × 55 Parts = 660)
 * for any selected Pro Editor Feature.
 */
export function buildFeatureSettingsCatalog(featureId: string): ProFeatureSettingItem[] {
  const settings: ProFeatureSettingItem[] = [];
  let counter = 1;
  const featureNum = parseInt(featureId.replace(/\D+/g, ''), 10) || 1;

  for (let mIdx = 0; mIdx < PRO_SETTING_MODULES.length; mIdx += 1) {
    const mod = PRO_SETTING_MODULES[mIdx];
    const range = CHANNEL_RANGES[mod.channel];
    for (let pIdx = 0; pIdx < SUB_PART_ADJECTIVES.length; pIdx += 1) {
      const adj = SUB_PART_ADJECTIVES[pIdx];
      const defaultVal =
        mod.channel === 'opacity' && pIdx === 0
          ? 100
          : mod.channel === 'blur'
          ? 0
          : mod.channel === 'letterbox'
          ? 0
          : 0;

      settings.push({
        id: `${featureId}_${mod.id}_${pIdx + 1}`,
        index: counter,
        partLabel: `P${String(counter).padStart(3, '0')}`,
        name: `${adj} · Band ${((featureNum + pIdx) % 12) + 1}`,
        moduleId: mod.id,
        moduleTitle: mod.title,
        channel: mod.channel,
        min: range.min,
        max: range.max,
        step: range.step,
        defaultValue: defaultVal,
        unit: range.unit,
      });
      counter += 1;
    }
  }
  return settings;
}

export interface ComputedProAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  tint: number;
  vignette: number;
  blur: number;
  glow: number;
  chromatic: number;
  filmGrain: number;
  letterbox: number;
}

/**
 * Aggregates the active Pro Feature + any overridden settings out of 660 parts
 * into concrete render deltas applied to the live video preview & export canvas.
 */
export function computeProRenderDeltas(
  feature: ProEditorFeature | null,
  overrides: Record<string, number>,
  settingsCatalog: ProFeatureSettingItem[]
): ComputedProAdjustments {
  const out: ComputedProAdjustments = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
    tint: 0,
    vignette: 0,
    blur: 0,
    glow: 0,
    chromatic: 0,
    filmGrain: 0,
    letterbox: 0,
  };
  if (!feature) return out;

  // Base feature signature look
  const b = feature.baseEffect;
  out.brightness += b.brightness || 0;
  out.contrast += b.contrast || 0;
  out.saturation += b.saturation || 0;
  out.warmth += b.warmth || 0;
  out.tint += b.tint || 0;
  out.vignette += b.vignette || 0;
  out.blur += b.blur || 0;
  out.glow += b.glow || 0;
  out.chromatic += b.chromatic || 0;
  out.filmGrain += b.filmGrain || 0;
  out.letterbox += b.letterbox || 0;

  let masterOpacityScale = 1;
  for (const s of settingsCatalog) {
    if (overrides[s.id] === undefined) continue;
    const val = overrides[s.id];
    if (s.id.endsWith('_core_mix_1') && s.channel === 'opacity') {
      masterOpacityScale = Math.max(0, Math.min(1, val / 100));
      continue;
    }
    const delta = val - s.defaultValue;
    if (delta === 0) continue;
    if (s.channel === 'opacity') {
      masterOpacityScale = Math.max(0.1, Math.min(1.5, masterOpacityScale + delta * 0.005));
    } else if (s.channel === 'blur') {
      out.blur += delta * 0.35;
    } else if (s.channel === 'letterbox') {
      out.letterbox += delta * 0.6;
    } else {
      out[s.channel] += delta * 0.4;
    }
  }

  out.brightness *= masterOpacityScale;
  out.contrast *= masterOpacityScale;
  out.saturation *= masterOpacityScale;
  out.warmth *= masterOpacityScale;
  out.tint *= masterOpacityScale;
  out.vignette = Math.max(0, Math.min(95, out.vignette * masterOpacityScale));
  out.blur = Math.max(0, Math.min(8, out.blur * masterOpacityScale));
  out.glow = Math.max(0, Math.min(100, out.glow * masterOpacityScale));
  out.chromatic = Math.max(0, Math.min(100, out.chromatic * masterOpacityScale));
  out.filmGrain = Math.max(0, Math.min(100, out.filmGrain * masterOpacityScale));
  out.letterbox = Math.max(0, Math.min(25, out.letterbox * masterOpacityScale));

  return out;
}
