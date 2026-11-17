import type { AppLang } from './i18n';

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
  | 'Horror & Dark'
  | 'Gunshots & Weapons'
  | 'Door & Key Locks'
  | 'Vehicles & Engine'
  | 'Thunder & Rain'
  | 'Combat & Fights'
  | 'Car Crash & Accidents'
  | 'Funny & Comedy Memes';

export type SfxRecipeType =
  | 'whoosh'
  | 'boom'
  | 'riser'
  | 'glitch'
  | 'pop'
  | 'thunder'
  | 'laser'
  | 'chime'
  | 'heartbeat'
  | 'siren'
  | 'door_knock'
  | 'door_open'
  | 'key_unlock'
  | 'car_start'
  | 'gunshot'
  | 'rain_thunder'
  | 'footstep'
  | 'glass_break'
  | 'sword_slash'
  | 'phone_ring'
  | 'clock_tick'
  | 'punch'
  | 'stick_hit'
  | 'knife_slash'
  | 'car_crash';

export interface SfxDefinition {
  id: string;
  name: string;
  category: SfxCategory;
  durationSec: number;
  recipe: SfxRecipeType;
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
  'Funny & Comedy Memes',
  'Combat & Fights',
  'Car Crash & Accidents',
  'Thunder & Rain',
  'Gunshots & Weapons',
  'Door & Key Locks',
  'Vehicles & Engine',
  'Foley & Action',
  'Whoosh & Transitions',
  'Cinematic Hits & Booms',
  'Crime & Thriller',
  'Horror & Dark',
  'UI & Glitch',
  'Comedy & Pop',
  'Nature & Ambience',
  'Sci-Fi & Laser',
  'Musical Stings',
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
  recipe: SfxRecipeType | ((i: number) => SfxRecipeType);
  names: string[];
  makeParams: (i: number) => Omit<SfxDefinition, 'id' | 'name' | 'category' | 'recipe'>;
}> = [
  {
    category: 'Funny & Comedy Memes',
    prefix: 'fn',
    recipe: (i) => (i % 4 === 0 ? 'pop' : i % 4 === 1 ? 'chime' : i % 4 === 2 ? 'whoosh' : 'glitch'),
    names: [
      'Cartoon Boing Spring', 'Slide Whistle Up', 'Fail Buzzer Horn', 'Mouth Pluck Pop',
      'Funny Slip Whistle', 'Prank Air Horn', 'Comic Slap Thwack', 'Silly Giggle Synth',
      'Rubber Duck Squeak', 'Ba Dum Tss Rimshot', 'Surprise Duck Quack', 'Funny Bonk Hit',
      'Jumping Spring Bounce', 'Meme Wow Sound', 'Troll Laugh Drop', 'Cheeky Plink Zing',
    ],
    makeParams: (i) => ({
      durationSec: Number((0.35 + (i % 4) * 0.18).toFixed(2)),
      baseFreq: 260 + (i % 6) * 85,
      endFreq: 740 + (i % 5) * 190,
      noiseMix: 0.12,
      pulseCount: 2 + (i % 3),
    }),
  },
  {
    category: 'Thunder & Rain',
    prefix: 'tr',
    recipe: (i) => (i % 3 === 1 ? 'rain_thunder' : 'thunder'),
    names: [
      'Lightning Bolt Crack', 'Heavy Monsoon Rain', 'Close Thunder Strike', 'Rolling Sky Thunder',
      'Rain on Tin Roof', 'Storm Wind Gust', 'Cloudburst Downpour', 'Distant Thunder Roll',
      'Midnight Rainstorm', 'Wet Street Splash', 'Mountain Storm Flash', 'Thunderclap Boom',
    ],
    makeParams: (i) => ({
      durationSec: Number((1.35 + (i % 4) * 0.45).toFixed(2)),
      baseFreq: 68 + (i % 5) * 32,
      endFreq: 38 + (i % 4) * 20,
      noiseMix: 0.88,
      pulseCount: 2 + (i % 3),
    }),
  },
  {
    category: 'Gunshots & Weapons',
    prefix: 'gn',
    recipe: (i) => (i % 4 === 3 ? 'sword_slash' : 'gunshot'),
    names: [
      '9mm Pistol Shot', 'Shotgun Heavy Blast', 'Assault Rifle Burst', 'Silenced Suppressed Shot',
      'Sniper Canyon Crack', 'Revolver Hammer Cock', 'Bullet Shell Drop', 'M4 Rapid Burst',
      'Gun Magazine Reload', 'Shotgun Pump Rack', 'Bullet Whiz Ricochet', 'Katana Sword Draw',
    ],
    makeParams: (i) => ({
      durationSec: Number((0.42 + (i % 4) * 0.22).toFixed(2)),
      baseFreq: 180 + (i % 5) * 60,
      endFreq: 42 + (i % 4) * 14,
      noiseMix: 0.86,
      pulseCount: i % 4 === 2 ? 3 : 1,
    }),
  },
  {
    category: 'Door & Key Locks',
    prefix: 'dk',
    recipe: (i) =>
      i % 3 === 0 ? 'door_knock' : i % 3 === 1 ? 'door_open' : 'key_unlock',
    names: [
      'Wood Door Knock 3x', 'Heavy Door Creak Open', 'Key Insert & Unlock', 'Urgent Door Knocking',
      'Car Door Open & Shut', 'Deadbolt Key Twist', 'Metal Gate Latch Open', 'House Door Knock Soft',
      'Padlock Key Open', 'Room Door Slam Shut', 'Front Door Knob Turn', 'Locker Key Jingle Open',
    ],
    makeParams: (i) => ({
      durationSec: Number((0.68 + (i % 4) * 0.24).toFixed(2)),
      baseFreq: i % 3 === 2 ? 1450 + (i % 4) * 240 : 145 + (i % 4) * 35,
      endFreq: i % 3 === 2 ? 2600 : 88 + (i % 3) * 25,
      noiseMix: 0.48,
      pulseCount: 3 + (i % 3),
    }),
  },
  {
    category: 'Vehicles & Engine',
    prefix: 'vh',
    recipe: 'car_start',
    names: [
      'Car Ignition Key Start', 'SUV Engine Start & Idle', 'Sports Car Crank & Rev', 'Bike Kick Start Roar',
      'Diesel Jeep Cold Start', 'Auto Rickshaw Start', 'Truck Engine Rumbling', 'Scooter Ignition Start',
      'Car Engine Accelerate', 'Highway Fast Car Pass', 'Tire Screech Brake', 'Horn & Ignition',
    ],
    makeParams: (i) => ({
      durationSec: Number((1.3 + (i % 4) * 0.35).toFixed(2)),
      baseFreq: 48 + (i % 5) * 14,
      endFreq: 118 + (i % 5) * 28,
      noiseMix: 0.35,
      pulseCount: 3 + (i % 3),
    }),
  },
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
    recipe: (i) => (i % 4 === 0 ? 'heartbeat' : i % 4 === 1 ? 'siren' : i % 4 === 2 ? 'clock_tick' : 'riser'),
    names: [
      'Heartbeat Fast', 'Police Siren Short', 'Suspense Clock Tick', 'Crime Riser', 'Mystery Drone',
      'Phone Ring Thriller', 'Dark Tension', 'Detective Reveal', 'Shadow Stalk', 'Emergency Alert',
      'Forensic Scan', 'Interrogation Hum', 'Chase Build', 'Panic Heart', 'Case Closed Hit',
    ],
    makeParams: (i) => ({
      durationSec: Number((1.1 + (i % 4) * 0.35).toFixed(2)),
      baseFreq: i % 4 === 1 ? 620 + (i % 4) * 80 : 62 + (i % 5) * 18,
      endFreq: i % 4 === 1 ? 880 + (i % 3) * 90 : 195 + (i % 5) * 65,
      noiseMix: 0.14,
      pulseCount: 3 + (i % 3),
    }),
  },
  {
    category: 'UI & Glitch',
    prefix: 'ui',
    recipe: (i) => (i % 5 === 4 ? 'phone_ring' : 'glitch'),
    names: [
      'Digital Glitch', 'Camera Shutter', 'Mouse Click', 'VHS Static', 'Classic Phone Ring',
      'Cyber Zap', 'Data Burst', 'Typewriter Key', 'Signal Drop', 'TV Static Cut',
      'Error Buzz', 'Notification Tap', 'Pixel Break', 'Neon Flicker', 'Scanner Beep',
    ],
    makeParams: (i) => ({
      durationSec: Number((0.28 + (i % 5) * 0.14).toFixed(2)),
      baseFreq: 380 + (i % 7) * 180,
      endFreq: 140 + (i % 5) * 260,
      noiseMix: 0.45,
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
    recipe: (i) => (i % 2 === 0 ? 'thunder' : 'rain_thunder'),
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
    recipe: (i) =>
      i % 4 === 0 ? 'sword_slash' : i % 4 === 1 ? 'footstep' : i % 4 === 2 ? 'glass_break' : 'door_knock',
    names: [
      'Sword Draw Slash', 'Running Footsteps', 'Glass Shatter Burst', 'Heavy Wood Knock',
      'Shoe Gravel Steps', 'Window Glass Break', 'Punch Impact Hit', 'Knife Swing Whoosh',
      'Mirror Crash Debris', 'Slow Suspense Steps', 'Rope Snap Whip', 'Leather Fight Hit',
      'Plate Drop Smash', 'Shield Block Metal', 'Door Lock Latch',
    ],
    makeParams: (i) => ({
      durationSec: Number((0.55 + (i % 4) * 0.22).toFixed(2)),
      baseFreq: 190 + (i % 6) * 110,
      endFreq: 85 + (i % 4) * 95,
      noiseMix: 0.65,
      pulseCount: 3 + (i % 3),
    }),
  },
  {
    category: 'Horror & Dark',
    prefix: 'hr',
    recipe: (i) => (i % 3 === 0 ? 'riser' : i % 3 === 1 ? 'heartbeat' : 'door_open'),
    names: [
      'Ghost Whisper', 'Creaky Door Open', 'Nightmare Drone', 'Basement Breath', 'Sudden Scare',
      'Cursed Bell', 'Haunted Wind', 'Dark Whisper', 'Shadow Screamer', 'Dead Silence Hum',
      'Dungeon Echo', 'Evil Pulse', 'Midnight Door Knock', 'Chill Spine', 'Graveyard Breeze',
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

// 190+ Curated Real WebAudio Synthesized Sound Effects
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

// Dynamic Localization Dictionary for SFX Categories & Foley Names
const CATEGORY_TRANSLATIONS: Record<string, Partial<Record<AppLang, string>>> = {
  All: { ml: 'എല്ലാം', hi: 'सभी', ta: 'அனைத்தும்', kn: 'ಎಲ್ಲಾ', te: 'అన్నీ' },
  'Funny & Comedy Memes': { ml: 'തമാശ & കോമഡി മീംസ് (റീൽസ്)', hi: 'मजेदार कॉमेडी मीम्स (रील्स)', ta: 'कॉमेडी मीम्स (ரீல்ஸ்)', kn: 'ಕಾಮಿಡಿ ಮೀಮ್ಸ್', te: 'కామెడీ మీమ్స్' },
  'Thunder & Rain': { ml: 'ഇടിമിന്നലും മഴയും', hi: 'गड़गड़ाहट व बारिश', ta: 'இடி & மழை', kn: 'ಗುಡುಗು ಮತ್ತು ಮಳೆ', te: 'ఉరుములు & వర్షం' },
  'Thunder, Lightning & Rain': { ml: 'ഇടിമിന്നലും മഴയും', hi: 'बिजली और बारिश', ta: 'இடி மின்னல் & மழை', kn: 'ಮಿಂಚು & ಮಳೆ', te: 'ఉరుములు మెరుపులు' },
  'Gunshots & Weapons': { ml: 'വെടിവെപ്പ് & തോക്ക്', hi: 'गोलियाँ और हथियार', ta: 'துப்பாக்கி சுடும் ஒலி', kn: 'ಗುಂಡು ಮತ್ತು ಆಯುಧ', te: 'తుపాకీ కాల్పులు' },
  'Gunshots & Reload': { ml: 'വെടിവെപ്പ് & റീലോഡ്', hi: 'गोली व रीलोड', ta: 'துப்பாக்கி & ரீலோட்', kn: 'ಗುಂಡು & ರೀಲೋಡ್', te: 'తుపాకీ రీలోడ్' },
  'Door & Key Locks': { ml: 'വാതിലും താക്കോലും', hi: 'दरवाज़ा व ताला-चाबी', ta: 'கதவு & சாவி ஒலி', kn: 'ಬಾಗಿಲು & ಕೀಲಿ', te: 'తలుపు & తాళం చెవి' },
  'Door Knock & Open': { ml: 'വാതിൽ തട്ടൽ & തുറക്കൽ', hi: 'दरवाज़ा खटखटाना व खोलना', ta: 'கதவு தட்டல் & திறத்தல்', kn: 'ಬಾಗಿಲು ಬಡಿಯುವುದು', te: 'తలుపు తట్టడం & తెరవడం' },
  'Keys & Lock Unlocking': { ml: 'താക്കോൽ തുറക്കുന്ന ശബ്ദം', hi: 'ताला-चाबी खोलना', ta: 'பூட்டு சாவி திறப்பு', kn: 'ಕೀಲಿ ತೆಗೆಯುವುದು', te: 'తాళం తీయడం' },
  'Vehicles & Engine': { ml: 'വണ്ടി സ്റ്റാർട്ട് & വാഹനം', hi: 'गाड़ी स्टार्ट व इंजन', ta: 'வாகனம் ஸ்டார்ட்', kn: 'ವಾಹನ ಸ್ಟಾರ್ಟ್', te: 'వాహనం స్టార్ట్' },
  'Car Start & Vehicle Foley': { ml: 'കാർ സ്റ്റാർട്ട് & വണ്ടി', hi: 'कार स्टार्ट व वाहन', ta: 'கார் ஸ்டார்ட் ஒலி', kn: 'ಕಾರ್ ಸ್ಟಾರ್ಟ್', te: 'కారు స్టార్ట్ శబ్దం' },
  'Foley & Action': { ml: 'ഫിലിം ഫോളി & ആക്ഷൻ', hi: 'फिल्म फोली व एक्शन', ta: 'பட ஃபோலி ஒலி', kn: 'ಫೋಲಿ ಮತ್ತು ಆಕ್ಷನ್', te: 'ఫోలీ & యాక్షన్' },
  'Footsteps & Body Move': { ml: 'കാൽപ്പെരുമാറ്റം (നടത്തം)', hi: 'कदमों की आवाज़', ta: 'காலடி சத்தம்', kn: 'ಹೆಜ್ಜೆ ಸಪ್ಪಳ', te: 'అడుగుల శబ్దం' },
  'Glass Break & Debris': { ml: 'ചില്ല് പൊട്ടുന്ന ശബ്ദം', hi: 'काँच टूटने की आवाज़', ta: 'கண்ணாடி உடைதல்', kn: 'ಗಾಜು ಒಡೆಯುವುದು', te: 'గాజు పగిలే శబ్దం' },
  'Sword & Action Hits': { ml: 'വാൾവീശൽ & ഇടി', hi: 'तलवार व मुक्का', ta: 'வாள் வீச்சு & அடி', kn: 'ಕತ್ತಿ ಮತ್ತು ಹೊಡೆತ', te: 'కత్తి & పోరాటం' },
  'Sword & Blood Impact': { ml: 'വാൾ & ആക്ഷൻ ഹിറ്റ്', hi: 'तलवार व फाइट', ta: 'வாள் சண்டை', kn: 'ಕತ್ತಿ ಕಾಳಗ', te: 'కత్తి పోరాటం' },
  'Phone Ring & Clock Tick': { ml: 'ഫോൺ ബെൽ & ക്ലോക്ക്', hi: 'फोन घंटी व घड़ी', ta: 'போன் & கடிகாரம்', kn: 'ಫೋನ್ & ಗಡಿಯಾರ', te: 'ఫోన్ & గడియారం' },
  'Whoosh & Transitions': { ml: 'വൂഷ് & ട്രാൻസിഷൻ', hi: 'वूश व ट्रांज़िशन', ta: 'வூஷ் ஒலி', kn: 'ವೂಶ್ ಶಬ್ದ', te: 'వూష్ & ట్రాన్సిషన్' },
  'Whoosh & Swipes': { ml: 'വൂഷ് & സ്വൈപ്പ്', hi: 'वूश व स्वाइप', ta: 'வூஷ் ஸ்வைப்', kn: 'ವೂಶ್ ಸ್ವೈಪ್', te: 'వూష్ స్వైప్' },
  'Cinematic Hits & Booms': { ml: 'സിനിമ ഹിറ്റ് & ബൂം', hi: 'सिनेमा धमाका व बूम', ta: 'சினிமா பாம் & ஹிட்', kn: 'ಸಿನಿಮಾ ಬೂಮ್', te: 'సినిమా బూమ్ హిట్' },
  'Sub Bass Booms & Sirens': { ml: 'സബ് ബൂം & സൈറൺ', hi: 'सब बेस व सायरन', ta: 'பாம் & சைரன்', kn: 'ಬೂಮ್ ಮತ್ತು ಸೈರನ್', te: 'బూమ్ & సైరన్' },
  'Crime & Thriller': { ml: 'ക്രൈം & ത്രില്ലർ', hi: 'क्राइम व थ्रिलर', ta: 'கிரைம் த்ரில்லர்', kn: 'ಕ್ರೈಂ ಥ್ರಿಲ್ಲರ್', te: 'క్రైమ్ థ్రిల్లర్' },
  'Horror & Dark': { ml: 'ഹൊറർ & പ്രേത ശബ്ദം', hi: 'हॉरर व डरावना', ta: 'திகில் ஒலி', kn: 'ಹಾರರ್ ಶಬ್ದ', te: 'హారర్ శబ్దం' },
  'Horror, Suspense & Sci-Fi': { ml: 'സസ്പെൻസ്, ഹൊറർ & സയൻസ് ഫിക്ഷൻ', hi: 'सस्पेंस व हॉरर', ta: 'சஸ்பென்ஸ் & திகில்', kn: 'ಸಸ್ಪೆನ್ಸ್ & ಹಾರರ್', te: 'సస్పెన్స్ & హారర్' },
  'UI & Glitch': { ml: 'ഗ്ലിച്ച് & ക്ലിക്ക്', hi: 'ग्लिच व क्लिक', ta: 'கிளிட்ச் ஒலி', kn: 'ಗ್ಲಿಚ್ ಶಬ್ದ', te: 'గ్లిచ్ & క్లిక్' },
  'Comedy & Pop': { ml: 'കോമഡി & പോപ്പ്', hi: 'कॉमेडी व पॉप', ta: 'காமெடி ஒலி', kn: 'ಕಾಮಿಡಿ ಶಬ್ದ', te: 'కామెడీ పాప్' },
  'Nature & Ambience': { ml: 'പ്രകൃതി & മഴ', hi: 'प्रकृति व हवा', ta: 'இயற்கை ஒலி', kn: 'ಪ್ರಕೃತಿ ಶಬ್ದ', te: 'ప్రకృతి శబ్దం' },
  'Sci-Fi & Laser': { ml: 'ലേസർ & സയൻസ് ഫിക്ഷൻ', hi: 'लेज़र व स्पेस', ta: 'லேசர் ஒலி', kn: 'ಲೇಸರ್ ಶಬ್ದ', te: 'లేజర్ శబ్దం' },
  'Musical Stings': { ml: 'മ്യൂസിക് ബെൽ & സ്റ്റിംഗ്', hi: 'म्यूज़िक घंटी', ta: 'இசை மணி', kn: 'ಸಂಗೀತ ಗಂಟೆ', te: 'మ్యూజిక్ బెల్' },
};

const EXACT_SFX_NAME_MAP: Record<string, Partial<Record<AppLang, string>>> = {
  'Lightning Bolt Crack': { ml: 'മിന്നൽ ഇടിവെട്ട് ശബ്ദം', hi: 'बिजली कड़कने की आवाज़', ta: 'மின்னல் இடி ஒலி' },
  'Heavy Monsoon Rain': { ml: 'പെരുമഴ പെയ്യുന്ന ശബ്ദം', hi: 'तेज़ मॉनसून बारिश', ta: 'கனமழை ஒலி' },
  'Close Thunder Strike': { ml: 'അടുത്തുള്ള വലിയ ഇടിമിന്നൽ', hi: 'ज़ोरदार बादल गरजना', ta: 'அருகில் இடி முழக்கம்' },
  'Rolling Sky Thunder': { ml: 'ആകാശത്ത് ഉരുണ്ടുകൂടുന്ന ഇടി', hi: 'गड़गड़ाता बादल', ta: 'உருளும் இடி' },
  '9mm Pistol Shot': { ml: 'പിസ്റ്റൾ വെടിവെപ്പ് ശബ്ദം', hi: 'पिस्तौल गोली की आवाज़', ta: 'பிஸ்டல் துப்பாக்கி ஒலி' },
  'Shotgun Heavy Blast': { ml: 'വലിയ തോക്ക് വെടിശബ്ദം', hi: 'शॉटगन धमाका', ta: 'ஷாட்கன் வெடி ஒலி' },
  'Assault Rifle Burst': { ml: 'തുടർച്ചയായ വെടിവെപ്പ് (Rifle)', hi: 'राइफल लगातार फायर', ta: 'ரைபிள் சுடும் ஒலி' },
  'Silenced Suppressed Shot': { ml: 'സൈലൻസർ വെടിശബ്ദം', hi: 'साइलेंसर गन शॉट', ta: 'சைலன்சர் துப்பாக்கி' },
  'Wood Door Knock 3x': { ml: 'തടി വാതിലിൽ തട്ടുന്ന ശബ്ദം (3x)', hi: 'दरवाज़े पर 3 बार दस्तक', ta: 'மரக் கதவு தட்டும் ஒலி' },
  'Heavy Door Creak Open': { ml: 'വാതിൽ തുറക്കുന്ന ശബ്ദം (Creak)', hi: 'दरवाज़ा खुलने की आवाज़', ta: 'கதவு திறக்கும் ஒலி' },
  'Key Insert & Unlock': { ml: 'താക്കോൽ ഇട്ട് പൂട്ട് തുറക്കുന്ന ശബ്ദം', hi: 'चाबी से ताला खोलने की आवाज़', ta: 'சாவி போட்டு திறக்கும் ஒலி' },
  'Urgent Door Knocking': { ml: 'വേഗത്തിൽ വാതിലിൽ മുട്ടുന്ന ശബ്ദം', hi: 'तेज़ दरवाज़ा खटखटाना', ta: 'அவசர கதவு தட்டல்' },
  'Car Door Open & Shut': { ml: 'കാർ വാതിൽ തുറന്നു അടയ്ക്കുന്ന ശബ്ദം', hi: 'कार दरवाज़ा बंद होना', ta: 'கார் கதவு திறப்பு' },
  'Deadbolt Key Twist': { ml: 'താക്കോൽ തിരിച്ച് ലോക്ക് തുറക്കൽ', hi: 'चाबी घुमाकर लॉक खोलना', ta: 'சாவி திருப்பும் ஒலி' },
  'Car Ignition Key Start': { ml: 'കാർ കീ ഇട്ട് സ്റ്റാർട്ട് ചെയ്യുന്ന ശബ്ദം', hi: 'कार चाबी से स्टार्ट करना', ta: 'கார் ஸ்டார்ட் ஆகும் ஒலி' },
  'SUV Engine Start & Idle': { ml: 'ജീപ്പ്/വണ്ടി എൻജിൻ സ്റ്റാർട്ട് ശബ്ദം', hi: 'एसयूवी इंजन स्टार्ट', ta: 'வண்டி எஞ்சின் ஸ்டார்ட்' },
  'Sports Car Crank & Rev': { ml: 'സ്പോർട്സ് കാർ സ്റ്റാർട്ട് & റേസ്', hi: 'स्पोर्ट्स कार रेस', ta: 'ஸ்போர்ட்ஸ் கார் ரேஸ்' },
  'Bike Kick Start Roar': { ml: 'ബൈക്ക് സ്റ്റാർട്ട് ശബ്ദം', hi: 'बाइक स्टार्ट आवाज़', ta: 'பைக் ஸ்டார்ட் ஒலி' },
  'Sword Draw Slash': { ml: 'വാൾ ഉറയിൽ നിന്നെടുത്ത് വീശൽ', hi: 'तलवार निकालने की आवाज़', ta: 'வாள் உருவும் ஒலி' },
  'Running Footsteps': { ml: 'ഓടുന്ന കാൽപ്പെരുമാറ്റം', hi: 'दौड़ते कदमों की आवाज़', ta: 'ஓடும் காலடி சத்தம்' },
  'Glass Shatter Burst': { ml: 'ചില്ല് തകർന്നു വീഴുന്ന ശബ്ദം', hi: 'काँच चकनाचूर होना', ta: 'கண்ணாடி உடைதல்' },
  'Classic Phone Ring': { ml: 'ഫോൺ റിംഗ് ചെയ്യുന്ന ശബ്ദം', hi: 'फोन की घंटी', ta: 'தொலைபேசி மணி' },
  'Suspense Clock Tick': { ml: 'ക്ലോക്ക് ടിക്-ടിക് ശബ്ദം', hi: 'घड़ी टिक-टिक आवाज़', ta: 'கடிகார டிக்-டிக்' },
};

const RECIPE_NOUN_MAP: Record<string, Partial<Record<AppLang, string>>> = {
  thunder: { ml: 'ഇടിമിന്നൽ ശബ്ദം', hi: 'बिजली व गड़गड़ाहट', ta: 'இடி மின்னல் ஒலி', kn: 'ಗುಡುಗು ಶಬ್ದ', te: 'ఉరుము శబ్దం' },
  rain_thunder: { ml: 'മഴയും ഇടിമിന്നലും', hi: 'बारिश और गड़गड़ाहट', ta: 'மழை & இடி', kn: 'ಮಳೆ ಮತ್ತು ಗುಡುಗು', te: 'వర్షం & ఉరుము' },
  gunshot: { ml: 'തോക്ക് വെടിവെപ്പ് ശബ്ദം', hi: 'गोली चलने की आवाज़', ta: 'துப்பாக்கி வெடி ஒலி', kn: 'ಗುಂಡು ಹಾರುವ ಶಬ್ದ', te: 'తుపాకీ కాల్పు శబ్దం' },
  door_knock: { ml: 'വാതിലിൽ തട്ടുന്ന ശബ്ദം', hi: 'दरवाज़ा खटखटाना', ta: 'கதவு தட்டும் ஒலி', kn: 'ಬಾಗಿಲು ಬಡಿಯುವ ಶಬ್ದ', te: 'తలుపు తట్టే శబ్దం' },
  door_open: { ml: 'വാതിൽ തുറക്കുന്ന ശബ്ദം', hi: 'दरवाज़ा खुलने की आवाज़', ta: 'கதவு திறக்கும் ஒலி', kn: 'ಬಾಗಿಲು ತೆರೆಯುವ ಶಬ್ದ', te: 'తలుపు తెరిచే శబ్దం' },
  key_unlock: { ml: 'താക്കോൽ തുറക്കുന്ന ശബ്ദം', hi: 'चाबी से ताला खोलना', ta: 'சாவி பூட்டு திறக்கும் ஒலி', kn: 'ಕೀಲಿ ತೆರೆಯುವ ಶಬ್ದ', te: 'తాళం తీసే శబ్దం' },
  car_start: { ml: 'വണ്ടി സ്റ്റാർട്ട് ശബ്ദം', hi: 'गाड़ी स्टार्ट आवाज़', ta: 'வண்டி ஸ்டார்ட் ஒலி', kn: 'ವಾಹನ ಸ್ಟಾರ್ಟ್ ಶಬ್ದ', te: 'వాహనం స్టార్ట్ శబ్దం' },
  footstep: { ml: 'കാൽപ്പെരുമാറ്റ ശബ്ദം', hi: 'कदमों की आवाज़', ta: 'காலடி சத்தம்', kn: 'ಹೆಜ್ಜೆ ಸಪ್ಪಳ', te: 'అడుగుల శబ్దం' },
  glass_break: { ml: 'ചില്ല് പൊട്ടുന്ന ശബ്ദം', hi: 'काँच टूटने की आवाज़', ta: 'கண்ணாடி உடைதல்', kn: 'ಗಾಜು ಒಡೆಯುವ ಶಬ್ದ', te: 'గాజు పగిలే శబ్దం' },
  sword_slash: { ml: 'വാൾ വെട്ടുന്ന ശബ്ദം', hi: 'तलवार वार आवाज़', ta: 'வாள் வெட்டு ஒலி', kn: 'ಕತ್ತಿ ಬೀಸುವ ಶಬ್ದ', te: 'కత్తి వేటు శబ్దం' },
  phone_ring: { ml: 'ഫോൺ റിംഗ് ശബ്ദം', hi: 'फोन घंटी आवाज़', ta: 'போன் மணி ஒலி', kn: 'ಫೋನ್ ರಿಂಗ್ ಶಬ್ದ', te: 'ఫోన్ రింగ్ శబ్దం' },
  clock_tick: { ml: 'ക്ലോക്ക് ടിക് ശബ്ദം', hi: 'घड़ी टिक आवाज़', ta: 'கடிகார டிக்', kn: 'ಗಡಿಯಾರ ಟಿಕ್', te: 'గడియారం టిక్' },
  whoosh: { ml: 'വൂഷ് കാറ്റ് ശബ്ദം', hi: 'तेज़ हवा वूश', ta: 'வூஷ் காற்று ஒலி', kn: 'ವೂಶ್ ಗಾಳಿ', te: 'వూష్ గాలి' },
  boom: { ml: 'വലിയ ഇടി/ബൂം ശബ്ദം', hi: 'गहरा धमाका बूम', ta: 'பெரிய பாம் ஒலி', kn: 'ಭಾರಿ ಬೂಮ್', te: 'భారీ బూమ్' },
  siren: { ml: 'പോലീസ് സൈറൺ ശബ്ദം', hi: 'पुलिस सायरन', ta: 'போலீஸ் சைரன்', kn: 'ಪೊಲೀಸ್ ಸೈರನ್', te: 'పోలీస్ సైరన్' },
  heartbeat: { ml: 'ഹൃദയമിടിപ്പ് ശബ്ദം', hi: 'दिल की धड़कन', ta: 'இதயத்துடிப்பு', kn: 'ಹೃದಯ ಬಡಿತ', te: 'గుండె చప్పుడు' },
  riser: { ml: 'സസ്പെൻസ് റൈസർ ശബ്ദം', hi: 'सस्पेंस राइज़र', ta: 'சஸ்பென்ஸ் ஒலி', kn: 'ಸಸ್ಪೆನ್ಸ್ ರೈಸರ್', te: 'సస్పెన్స్ రైజర్' },
  laser: { ml: 'ലേസർ ശബ്ദം', hi: 'लेज़र आवाज़', ta: 'லேசர் ஒலி', kn: 'ಲೇಸರ್ ಶಬ್ದ', te: 'లేజర్ శబ్దం' },
  glitch: { ml: 'ഡിജിറ്റൽ ഗ്ലിച്ച്', hi: 'डिजिटल ग्लिच', ta: 'டிஜிட்டல் கிளிட்ச்', kn: 'ಗ್ಲಿಚ್ ಶಬ್ದ', te: 'డిజిటల్ గ్లిచ్' },
  chime: { ml: 'ബെൽ / മ്യൂസിക് ടോൺ', hi: 'संगीत घंटी', ta: 'மணி ஒலி', kn: 'ಸಂಗೀತ ಗಂಟೆ', te: 'మ్యూజిక్ బెల్' },
  pop: { ml: 'കോമഡി പോപ്പ് ശബ്ദം', hi: 'कॉमेडी पॉप', ta: 'காமெடி பாப்', kn: 'ಕಾಮಿಡಿ ಪಾಪ್', te: 'కామెడీ పాప్' },
};

export function localizeSfxCategory(cat: string, lang: AppLang): string {
  if (lang === 'en') return cat;
  return CATEGORY_TRANSLATIONS[cat]?.[lang] || cat;
}

export function localizeSfxName(
  rawName: string,
  recipeOrCategory: string,
  lang: AppLang,
  numTag?: number
): string {
  if (lang === 'en') return rawName;
  const exact = EXACT_SFX_NAME_MAP[rawName]?.[lang];
  if (exact) return exact;
  const fromRecipe = RECIPE_NOUN_MAP[recipeOrCategory]?.[lang];
  if (fromRecipe) return numTag ? `${fromRecipe} #${numTag}` : fromRecipe;
  const fromCat = CATEGORY_TRANSLATIONS[recipeOrCategory]?.[lang];
  if (fromCat) return numTag ? `${fromCat} #${numTag}` : fromCat;
  return rawName;
}

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

function createNoiseBuffer(ctx: BaseAudioContext, durSec: number): AudioBuffer {
  const bufSize = Math.max(1, Math.floor(ctx.sampleRate * durSec));
  const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function synthesizeIntoContext(
  ctx: BaseAudioContext,
  sfx: SfxDefinition,
  offsetSec = 0
): void {
  const dur = Math.max(0.2, sfx.durationSec);
  const now = ctx.currentTime + offsetSec;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.001, now);
  master.gain.linearRampToValueAtTime(0.85, now + Math.min(0.03, dur * 0.1));
  master.gain.setValueAtTime(0.85, now + Math.max(0.05, dur * 0.75));
  master.gain.exponentialRampToValueAtTime(0.001, now + dur);
  master.connect(ctx.destination);

  // Authentic Foley Synthesis Recipes!
  if (sfx.recipe === 'gunshot') {
    const shots = Math.min(4, sfx.pulseCount || 1);
    const step = shots > 1 ? Math.min(0.14, dur / (shots + 1)) : 0;
    for (let s = 0; s < shots; s++) {
      const t = now + s * step;
      // Razor transient crack + low punch + room tail
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = createNoiseBuffer(ctx, 0.42);
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.setValueAtTime(1900, t);
      hp.frequency.exponentialRampToValueAtTime(240, t + 0.35);
      hp.Q.value = 0.7;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(1.0, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      nSrc.connect(hp);
      hp.connect(ng);
      ng.connect(master);
      nSrc.start(t);
      nSrc.stop(t + 0.4);

      const punch = ctx.createOscillator();
      const pg = ctx.createGain();
      punch.type = 'sine';
      punch.frequency.setValueAtTime(170, t);
      punch.frequency.exponentialRampToValueAtTime(34, t + 0.14);
      pg.gain.setValueAtTime(0.95, t);
      pg.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      punch.connect(pg);
      pg.connect(master);
      punch.start(t);
      punch.stop(t + 0.17);
    }
    return;
  }

  if (sfx.recipe === 'door_knock') {
    const knocks = Math.min(5, Math.max(2, sfx.pulseCount || 3));
    const step = Math.min(0.24, (dur - 0.15) / knocks);
    for (let k = 0; k < knocks; k++) {
      const t = now + k * step;
      const wood = ctx.createOscillator();
      const wg = ctx.createGain();
      wood.type = 'triangle';
      wood.frequency.setValueAtTime(155 + (k % 2) * 18, t);
      wood.frequency.exponentialRampToValueAtTime(68, t + 0.09);
      wg.gain.setValueAtTime(0.95, t);
      wg.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      wood.connect(wg);
      wg.connect(master);
      wood.start(t);
      wood.stop(t + 0.12);

      const tapN = ctx.createBufferSource();
      tapN.buffer = createNoiseBuffer(ctx, 0.05);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900;
      const tng = ctx.createGain();
      tng.gain.setValueAtTime(0.55, t);
      tng.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      tapN.connect(bp);
      bp.connect(tng);
      tng.connect(master);
      tapN.start(t);
      tapN.stop(t + 0.045);
    }
    return;
  }

  if (sfx.recipe === 'door_open') {
    // Latch click + wooden hinge creak + air push
    const latch = ctx.createOscillator();
    const lg = ctx.createGain();
    latch.type = 'square';
    latch.frequency.setValueAtTime(640, now);
    latch.frequency.exponentialRampToValueAtTime(140, now + 0.04);
    lg.gain.setValueAtTime(0.5, now);
    lg.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    latch.connect(lg);
    lg.connect(master);
    latch.start(now);
    latch.stop(now + 0.06);

    const creak = ctx.createOscillator();
    const cFilt = ctx.createBiquadFilter();
    const cg = ctx.createGain();
    creak.type = 'sawtooth';
    cFilt.type = 'bandpass';
    cFilt.Q.value = 6.5;
    cFilt.frequency.setValueAtTime(420, now + 0.08);
    cFilt.frequency.linearRampToValueAtTime(680, now + dur * 0.6);
    creak.frequency.setValueAtTime(115, now + 0.08);
    creak.frequency.linearRampToValueAtTime(175, now + dur * 0.5);
    creak.frequency.linearRampToValueAtTime(92, now + dur * 0.9);
    cg.gain.setValueAtTime(0.001, now + 0.08);
    cg.gain.linearRampToValueAtTime(0.45, now + 0.22);
    cg.gain.exponentialRampToValueAtTime(0.001, now + dur);
    creak.connect(cFilt);
    cFilt.connect(cg);
    cg.connect(master);
    creak.start(now + 0.08);
    creak.stop(now + dur);
    return;
  }

  if (sfx.recipe === 'key_unlock') {
    // Metallic jingle + tumbler slide + crisp deadbolt clunk
    const jingles = [0, 0.08, 0.18, 0.34, 0.44];
    jingles.forEach((off, idx) => {
      if (off >= dur) return;
      const t = now + off;
      const metal = ctx.createOscillator();
      const mg = ctx.createGain();
      metal.type = idx >= 3 ? 'square' : 'sine';
      metal.frequency.setValueAtTime(idx >= 3 ? 850 : 2800 + idx * 650, t);
      metal.frequency.exponentialRampToValueAtTime(idx >= 3 ? 210 : 1900, t + 0.07);
      mg.gain.setValueAtTime(idx >= 3 ? 0.65 : 0.35, t);
      mg.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
      metal.connect(mg);
      mg.connect(master);
      metal.start(t);
      metal.stop(t + 0.09);
    });
    const clunk = ctx.createOscillator();
    const cg = ctx.createGain();
    clunk.type = 'triangle';
    clunk.frequency.setValueAtTime(240, now + Math.min(0.42, dur * 0.55));
    clunk.frequency.exponentialRampToValueAtTime(75, now + Math.min(0.58, dur * 0.85));
    cg.gain.setValueAtTime(0.8, now + Math.min(0.42, dur * 0.55));
    cg.gain.exponentialRampToValueAtTime(0.001, now + dur);
    clunk.connect(cg);
    cg.connect(master);
    clunk.start(now + Math.min(0.42, dur * 0.55));
    clunk.stop(now + dur);
    return;
  }

  if (sfx.recipe === 'car_start') {
    // Starter solenoid cranking pulses (0..0.55s) -> Engine catch roar & idle rumble!
    const cranks = 3;
    for (let c = 0; c < cranks; c++) {
      const t = now + c * 0.17;
      const starter = ctx.createOscillator();
      const sg = ctx.createGain();
      starter.type = 'sawtooth';
      starter.frequency.setValueAtTime(110, t);
      starter.frequency.linearRampToValueAtTime(72, t + 0.13);
      sg.gain.setValueAtTime(0.45, t);
      sg.gain.exponentialRampToValueAtTime(0.05, t + 0.15);
      starter.connect(sg);
      sg.connect(master);
      starter.start(t);
      starter.stop(t + 0.16);
    }
    const catchAt = now + 0.5;
    const eng = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const eg = ctx.createGain();
    eng.type = 'sawtooth';
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(380, catchAt);
    lp.frequency.linearRampToValueAtTime(160, now + dur);
    eng.frequency.setValueAtTime(42, catchAt);
    eng.frequency.linearRampToValueAtTime(105, catchAt + 0.25);
    eng.frequency.linearRampToValueAtTime(48, now + dur);
    eg.gain.setValueAtTime(0.01, catchAt);
    eg.gain.linearRampToValueAtTime(0.85, catchAt + 0.18);
    eg.gain.exponentialRampToValueAtTime(0.001, now + dur);
    eng.connect(lp);
    lp.connect(eg);
    eg.connect(master);
    eng.start(catchAt);
    eng.stop(now + dur);
    return;
  }

  if (sfx.recipe === 'rain_thunder') {
    const rain = ctx.createBufferSource();
    rain.buffer = createNoiseBuffer(ctx, dur);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1850;
    bp.Q.value = 0.6;
    const rg = ctx.createGain();
    rg.gain.value = 0.42;
    rain.connect(bp);
    bp.connect(rg);
    rg.connect(master);
    rain.start(now);
    rain.stop(now + dur);

    // Sharp lightning crack + rolling thunder tail
    const boomN = ctx.createBufferSource();
    boomN.buffer = createNoiseBuffer(ctx, dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(950, now + 0.08);
    lp.frequency.exponentialRampToValueAtTime(68, now + dur);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.01, now + 0.08);
    bg.gain.linearRampToValueAtTime(0.95, now + 0.14);
    bg.gain.exponentialRampToValueAtTime(0.001, now + dur);
    boomN.connect(lp);
    lp.connect(bg);
    bg.connect(master);
    boomN.start(now + 0.08);
    boomN.stop(now + dur);
    return;
  }

  if (sfx.recipe === 'footstep') {
    const steps = Math.min(6, Math.max(2, sfx.pulseCount || 4));
    const stepGap = (dur - 0.12) / steps;
    for (let i = 0; i < steps; i++) {
      const t = now + i * stepGap;
      const thud = ctx.createOscillator();
      const tg = ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(115 + (i % 2) * 18, t);
      thud.frequency.exponentialRampToValueAtTime(38, t + 0.08);
      tg.gain.setValueAtTime(0.8, t);
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      thud.connect(tg);
      tg.connect(master);
      thud.start(t);
      thud.stop(t + 0.11);

      const grit = ctx.createBufferSource();
      grit.buffer = createNoiseBuffer(ctx, 0.08);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400;
      const gg = ctx.createGain();
      gg.gain.setValueAtTime(0.35, t);
      gg.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      grit.connect(bp);
      bp.connect(gg);
      gg.connect(master);
      grit.start(t);
      grit.stop(t + 0.08);
    }
    return;
  }

  if (sfx.recipe === 'glass_break') {
    const crash = ctx.createBufferSource();
    crash.buffer = createNoiseBuffer(ctx, dur);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2600;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.8, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + dur);
    crash.connect(hp);
    hp.connect(cg);
    cg.connect(master);
    crash.start(now);
    crash.stop(now + dur);

    [2200, 3150, 4400, 5800].forEach((f, idx) => {
      const t = now + idx * 0.045;
      const shard = ctx.createOscillator();
      const sg = ctx.createGain();
      shard.type = 'sine';
      shard.frequency.setValueAtTime(f, t);
      sg.gain.setValueAtTime(0.35, t);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      shard.connect(sg);
      sg.connect(master);
      shard.start(t);
      shard.stop(t + 0.26);
    });
    return;
  }

  if (sfx.recipe === 'sword_slash') {
    const swish = ctx.createBufferSource();
    swish.buffer = createNoiseBuffer(ctx, dur);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 4.2;
    bp.frequency.setValueAtTime(420, now);
    bp.frequency.exponentialRampToValueAtTime(3400, now + dur * 0.5);
    bp.frequency.exponentialRampToValueAtTime(650, now + dur);
    const sg = ctx.createGain();
    sg.gain.value = 0.85;
    swish.connect(bp);
    bp.connect(sg);
    sg.connect(master);
    swish.start(now);
    swish.stop(now + dur);

    const ring = ctx.createOscillator();
    const rg = ctx.createGain();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(2150, now + 0.05);
    ring.frequency.exponentialRampToValueAtTime(1650, now + dur);
    rg.gain.setValueAtTime(0.28, now + 0.05);
    rg.gain.exponentialRampToValueAtTime(0.001, now + dur);
    ring.connect(rg);
    rg.connect(master);
    ring.start(now + 0.05);
    ring.stop(now + dur);
    return;
  }

  if (sfx.recipe === 'phone_ring') {
    const pulses = 6;
    const step = dur / pulses;
    for (let i = 0; i < pulses; i++) {
      const t = now + i * step;
      const bell = ctx.createOscillator();
      const bg = ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(i % 2 === 0 ? 1318 : 1568, t);
      bg.gain.setValueAtTime(0.55, t);
      bg.gain.exponentialRampToValueAtTime(0.01, t + step * 0.8);
      bell.connect(bg);
      bg.connect(master);
      bell.start(t);
      bell.stop(t + step * 0.85);
    }
    return;
  }

  if (sfx.recipe === 'clock_tick') {
    const ticks = Math.min(6, Math.max(2, sfx.pulseCount || 4));
    const step = dur / ticks;
    for (let i = 0; i < ticks; i++) {
      const t = now + i * step;
      const clk = ctx.createOscillator();
      const cg = ctx.createGain();
      clk.type = 'triangle';
      clk.frequency.setValueAtTime(i % 2 === 0 ? 2200 : 1750, t);
      clk.frequency.exponentialRampToValueAtTime(420, t + 0.025);
      cg.gain.setValueAtTime(0.75, t);
      cg.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      clk.connect(cg);
      cg.connect(master);
      clk.start(t);
      clk.stop(t + 0.035);
    }
    return;
  }

  if (sfx.noiseMix > 0.05) {
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = createNoiseBuffer(ctx, dur);

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
    synthesizeIntoContext(livePreviewCtx, sfx, 0);
  } catch {}
}

export async function previewJoinedSfxChain(
  chain: Array<{ sfx: SfxDefinition; gapSec?: number }>
): Promise<void> {
  if (chain.length === 0) return;
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!livePreviewCtx || livePreviewCtx.state === 'closed') {
      livePreviewCtx = new Ctx();
    }
    if (livePreviewCtx.state === 'suspended') {
      await livePreviewCtx.resume();
    }
    let cursor = 0;
    for (const node of chain) {
      synthesizeIntoContext(livePreviewCtx, node.sfx, cursor);
      cursor += Math.max(0.2, node.sfx.durationSec) + (node.gapSec ?? 0.12);
    }
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
  synthesizeIntoContext(offline, sfx, 0);
  const rendered = await offline.startRendering();
  const wavBlob = audioBufferToWavBlob(rendered);
  return {
    url: URL.createObjectURL(wavBlob),
    duration: rendered.duration,
  };
}

export async function renderJoinedSfxChainToWavUrl(
  chain: Array<{ sfx: SfxDefinition; gapSec?: number }>
): Promise<{ url: string; duration: number }> {
  const sampleRate = 44100;
  const totalDur = Math.max(
    0.5,
    chain.reduce((sum, node) => sum + Math.max(0.2, node.sfx.durationSec) + (node.gapSec ?? 0.12), 0)
  );
  const length = Math.ceil(sampleRate * totalDur);
  const offline = new OfflineAudioContext(1, length, sampleRate);
  let cursor = 0;
  for (const node of chain) {
    synthesizeIntoContext(offline, node.sfx, cursor);
    cursor += Math.max(0.2, node.sfx.durationSec) + (node.gapSec ?? 0.12);
  }
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
