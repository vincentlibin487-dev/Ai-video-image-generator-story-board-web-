import { CharacterProfile, ShotItem } from '../types/director';

export interface SampleProjectTemplate {
  id: string;
  title: string;
  genre: string;
  targetLanguage: string;
  preferredShotDuration: number;
  cinematicStyle: string;
  script: string;
  characters: CharacterProfile[];
  sampleShots: ShotItem[];
}

export const SAMPLE_PROJECTS: SampleProjectTemplate[] = [
  {
    id: 'kochi-ferry',
    title: 'The Midnight Ferry (അർദ്ധരാത്രി ഫെറി)',
    genre: 'Malayalam Monsoon Neo-Noir Thriller',
    targetLanguage: 'Malayalam',
    preferredShotDuration: 8,
    cinematicStyle: 'Gritty Malayalam Neo-Noir, Kodak Vision3 500T, torrential Kerala rain, teal and sodium-amber lighting',
    script: `രാത്രി പന്ത്രണ്ടു മണി. കൊച്ചിയിലെ പഴയ ബോട്ട് ജെട്ടിയിൽ തോരാത്ത മഴ പെയ്യുന്നു. ഡിറ്റക്ടീവ് മോഹൻ പഴയ റെയിൻകോട്ടിന്റെ കോളർ ഉയർത്തി കടവിലേക്ക് നടക്കുന്നു. ഇരുട്ടിൽ ദൂരെ ഒരു ഇരുണ്ട ബോട്ടിൽ നിന്ന് ഒരാൾ കറുത്ത ബ്രീഫ്കേസുമായി ഇറങ്ങി വരുന്നു. അതൊരു കൊടുംകുറ്റവാളിയായ ആന്റണിയാണ്. മോഹൻ തോക്ക് എടുക്കുന്നു. ആന്റണി പെട്ടെന്ന് തിരിഞ്ഞു നോക്കി വെള്ളത്തിലേക്ക് എടുത്തു ചാടാൻ ശ്രമിക്കുന്നു. മോഹൻ വിളിച്ചു പറയുന്നു: "നിൽക്ക് അവിടെ, ആന്റണി! നിനക്ക് ഇനി രക്ഷപ്പെടാൻ വഴിയില്ല!"`,
    characters: [
      {
        id: 'char-1',
        name: 'Detective Mohan (ഡിറ്റക്ടീവ് മോഹൻ)',
        role: 'Protagonist / Kerala Crime Branch Inspector',
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
        age: '38 years old',
        ethnicity: 'South Indian Malayali',
        visualContinuityTags: 'Weathered 38yo South Indian Malayali man, sharp piercing dark brown eyes, dense 5-day salt-and-pepper trimmed beard, wet black hair plastered across forehead by rain, sharp jawline, wearing a heavy distressed olive-green trench rain jacket over a charcoal linen shirt',
        keyFeatures: [
          'Dense salt-and-pepper stubble beard',
          'Intense, tired deep-set eyes',
          'Heavy distressed olive trench raincoat',
          'Rain-soaked hair clings to forehead',
        ],
      },
      {
        id: 'char-2',
        name: 'Antony (ആന്റണി)',
        role: 'Antagonist / Fugitive Smuggler',
        photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
        age: '42 years old',
        ethnicity: 'South Indian Malayali',
        visualContinuityTags: '42yo South Indian man with intense paranoid stare, trimmed horseshoe mustache with grey streaks, buzz-cut damp hair, scar slicing across right cheek, wearing an oversized black hooded nylon windbreaker drenched with water, clutching an aluminum case',
        keyFeatures: [
          'Scar across right cheekbone',
          'Grey-streaked thick mustache',
          'Waterproof black hooded windbreaker',
          'Nervous darting eye movements',
        ],
      },
    ],
    sampleShots: [
      {
        id: 'shot-1',
        shotNumber: 1,
        durationSeconds: 8,
        sceneHeading: 'EXT. OLD KOCHI BOAT JETTY - NIGHT',
        scriptSegment: 'Torrential Kerala monsoon rain lashes against rusty corrugated iron sheds. The camera glides low over wet reflective asphalt showing distorted reflections of flickering sodium-amber dock lanterns.',
        charactersPresent: ['Detective Mohan (ഡിറ്റക്ടീവ് മോഹൻ)'],
        dialogue: {
          character: 'Detective Mohan (V.O.)',
          lineOriginal: 'കൊച്ചി ഉറങ്ങുമ്പോഴും... ചില രഹസ്യങ്ങൾ ഉണർന്നിരിക്കും.',
          lineRomanized: 'Kochi urangumpozhum... chila rahasyangal unarnnirikkum.',
          lineEnglish: 'Even when Kochi sleeps... some secrets stay wide awake.',
          audioEmotion: 'Deep, weary, low whisper over steady rainfall',
        },
        cameraDetails: {
          framing: 'Extreme Wide Shot to Low Angle Tracking',
          lens: '35mm Anamorphic Lens, f/2.0',
          movement: 'Slow tracking forward glide 6 inches above puddle reflections',
        },
        lightingColor: {
          lighting: 'Sodium-vapor amber streetlights mixed with deep cyan water reflections',
          colorGrade: 'Kodak Vision3 500T 5219 film stock, heavy grain, deep blacks and teal shadows',
          atmosphere: 'Torrential monsoon downpour, rising mist, heavy water ripples',
        },
        audioFoley: {
          sfx: 'Deafening tropical monsoon downpour hitting corrugated tin roof, distant harbor fog horn',
          musicCue: 'Ominous low-frequency synthesizer drone with melancholic solo violin notes',
        },
        generationPrompts: {
          masterCinematic: 'Cinematic wide film still of old Kochi boat jetty at midnight during torrential monsoon rain. Weathered 38yo South Indian Malayali man with dense stubble beard, wet black hair, wearing heavy olive-green rain jacket, walking into frame from shadows. Reflective wet ground with amber lantern reflections and deep cyan mist. Shot on 35mm Anamorphic lens, 8k, photorealistic, cinematic movie still, masterwork.',
          klingPrompt: 'A detective in olive raincoat walks forward through torrential Kerala rain at old Kochi boat jetty at night. Camera: Low angle slow dolly push in over water puddle reflections. Lighting: Atmospheric amber practical lamps and cyan monsoon mist. 4k resolution, hyper-realistic, 35mm film.',
          lumaPrompt: 'Heavy rain pouring over wooden harbor pier at night. Detective Mohan in olive trench coat turns collar up against wind, walking deliberately forward. Smooth forward cinematic camera push, shallow depth of field, anamorphic lens flare.',
          midjourneyPrompt: '/imagine prompt: cinematic still from Malayalam neo-noir crime thriller, old Kochi jetty, heavy monsoon downpour, 38yo South Indian man with dense salt-and-pepper stubble beard, olive trench coat, sodium amber lamps, cyan reflections, 35mm film photography --ar 16:9 --style raw --v 6.1',
          runwayPrompt: 'Camera: slow dolly push forward. South Indian detective in heavy olive rain jacket walking through pouring Kerala rain on wet asphalt pier at night, sodium amber lighting.',
        },
        characterContinuityTokens: [
          'Weathered 38yo South Indian Malayali man',
          'dense 5-day salt-and-pepper stubble beard',
          'wet black hair plastered across forehead',
          'heavy distressed olive-green trench rain jacket',
        ],
      },
      {
        id: 'shot-2',
        shotNumber: 2,
        durationSeconds: 8,
        sceneHeading: 'EXT. JETTY DOCK EDGE - NIGHT',
        scriptSegment: 'A battered wooden passenger ferry rocks violently against worn rubber tires. Antony emerges from the dark ferry cabin holding an aluminum briefcase, scanning the jetty with paranoid panic.',
        charactersPresent: ['Antony (ആന്റണി)'],
        dialogue: {
          character: 'Antony (ആന്റണി)',
          lineOriginal: 'സമയമായി... ഇനി തിരിഞ്ഞു നോക്കാൻ സമയമില്ല.',
          lineRomanized: 'Samayamaayi... ini thirinju nokkaan samayamilla.',
          lineEnglish: "It is time... there's no time to look back now.",
          audioEmotion: 'Panicked, rapid, tense breath',
        },
        cameraDetails: {
          framing: 'Medium Close-Up from low boat deck looking up',
          lens: '50mm Anamorphic Lens, f/1.4',
          movement: 'Handheld organic drift with boat sway, rack focus to briefcase',
        },
        lightingColor: {
          lighting: 'Harsh halogen boat spotlight casting deep rim light, gloomy shadows',
          colorGrade: 'Desaturated cold marine blue with punchy tungsten flare',
          atmosphere: 'Sea spray mixed with rain droplets hitting the camera lens',
        },
        audioFoley: {
          sfx: 'Wooden ferry creaking against jetty tires, churning boat motor idling low, water splashing',
          musicCue: 'Ticking metal percussion building tension with subterranean heartbeat pulse',
        },
        generationPrompts: {
          masterCinematic: 'Cinematic medium close-up of Antony, a 42yo South Indian fugitive with scar across right cheekbone, grey-streaked mustache, wet buzz-cut hair, wearing oversized black hooded nylon windbreaker, clutching silver briefcase stepping off rocking Kerala ferry at night in storm. Shot on Arri Alexa 65, 35mm anamorphic, hyper-detailed, film grain.',
          klingPrompt: 'Fugitive man with cheek scar in black hooded jacket steps cautiously off wooden ferry boat in dark storm holding briefcase. Camera: handheld slow tilt up from briefcase to his tense paranoid eyes. Lighting: cold blue marine night light and harsh boat halogen.',
          lumaPrompt: 'A panicked man with mustache and black raincoat steps onto rain-slick wooden dock clutching metal briefcase. Camera tracks horizontally with his hasty footsteps, motion blur on water splashes, dramatic cinematic lighting.',
          midjourneyPrompt: '/imagine prompt: cinematic movie still, 42yo South Indian man with right cheek scar and thick mustache, soaked black hooded windbreaker, clutching aluminum briefcase on rocking boat at midnight, Kerala harbor, intense fear in eyes, cinematic lighting, 8k --ar 16:9 --style raw --v 6.1',
          runwayPrompt: 'Camera: handheld tracking. Man with scar on cheek wearing black rain jacket steps off wet wooden ferry at night holding metal case, rain falling heavily.',
        },
        characterContinuityTokens: [
          '42yo South Indian man',
          'scar slicing across right cheek',
          'thick grey-streaked mustache',
          'black hooded nylon windbreaker',
        ],
      },
      {
        id: 'shot-3',
        shotNumber: 3,
        durationSeconds: 8,
        sceneHeading: 'EXT. OLD KOCHI BOAT JETTY - CONTINUOUS',
        scriptSegment: 'Detective Mohan steps out from behind a stack of rusted shipping containers, drawing his service revolver. Laser-sharp focus in his eyes as water drips from his brow.',
        charactersPresent: ['Detective Mohan (ഡിറ്റക്ടീവ് മോഹൻ)'],
        dialogue: {
          character: 'Detective Mohan (ഡിറ്റക്ടീവ് മോഹൻ)',
          lineOriginal: 'നിൽക്ക് അവിടെ, ആന്റണി! നിനക്ക് ഇനി രക്ഷപ്പെടാൻ വഴിയില്ല!',
          lineRomanized: 'Nilkk avide, Antony! Ninakku ini rakshappedaan vazhiyilla!',
          lineEnglish: 'Stand right there, Antony! You have no way out now!',
          audioEmotion: 'Commanding, firm, gravelly Kerala police officer roar cutting through the storm',
        },
        cameraDetails: {
          framing: 'Dutch Angle Medium Shot pushing in to Tight Close-Up',
          lens: '85mm Portrait Cine Lens, f/1.8',
          movement: 'Fast forward push-in stopping abruptly on gun hammer click',
        },
        lightingColor: {
          lighting: 'Hard silhouette backlight from approaching police cruiser headlights in background',
          colorGrade: 'High contrast neo-noir, deep ink blacks, crisp silver rain droplets',
          atmosphere: 'Volumetric headlight beams piercing through dense sheets of monsoon rain',
        },
        audioFoley: {
          sfx: 'Gun revolver hammer cocking sharply with loud metallic click, heavy boots splashing in puddle',
          musicCue: 'Sudden dissonant orchestral hit followed by high tension string tremolo',
        },
        generationPrompts: {
          masterCinematic: 'Cinematic tight medium shot of Detective Mohan, 38yo South Indian man with salt-and-pepper stubble beard, wet hair, heavy olive rain jacket, holding black service revolver with both hands aimed at camera. Rain pouring in dense backlit sheets, police vehicle headlights beam in background. Kodak 500T film grain, anamorphic cinematic framing.',
          klingPrompt: 'Detective in wet olive rain jacket steps forward and raises pistol aiming straight ahead into the rain. Camera: dramatic push-in to close up on his determined face. Lighting: powerful car headlights from behind creating rim lighting and glowing rain streaks.',
          lumaPrompt: 'Close up of intense South Indian detective raising revolver in rainstorm. Dramatic fast push-in, water droplets flying off his gun barrel, blinding car high-beams in the background creating anamorphic flares.',
          midjourneyPrompt: '/imagine prompt: cinematic still from Malayalam thriller, 38yo Malayali police inspector with dense stubble beard, drenched olive jacket, aiming black revolver into pouring night rain, blinding headlights behind him, high drama, film grain, directed by Lijo Jose Pellissery --ar 16:9 --style raw --v 6.1',
          runwayPrompt: 'Camera: fast dolly push in. Determined detective in olive jacket aiming handgun in heavy rain, bright car headlights glowing in background creating cinematic silhouette.',
        },
        characterContinuityTokens: [
          'Weathered 38yo South Indian Malayali man',
          'dense 5-day salt-and-pepper stubble beard',
          'heavy distressed olive-green trench rain jacket',
          'rain-soaked black hair',
        ],
      },
    ],
  },
  {
    id: 'banaras-mystery',
    title: 'The Banaras Shadows (काशी की छाया)',
    genre: 'Hindi Mythic Noir Mystery',
    targetLanguage: 'Hindi',
    preferredShotDuration: 8,
    cinematicStyle: 'A24 Arthouse Noir, incense smoke, flickering clay oil lamps, textured stone alleys of Varanasi',
    script: `शाम का समय। वाराणसी के मणिकर्णिका घाट की संकरी गलियों में धुंध और लोबान का धुआँ फैला है। प्रोफेसर कबीर पुराने तांबे के तावीज़ को हाथ में लिए तेजी से चल रहे हैं। पीछे से भारी कदमों की आवाज़ आती है। कबीर पलटते हैं। एक साधु के भेष में अघोरी खड़ा है। कबीर पूछते हैं: "तुम कौन हो? मेरा पीछा क्यों कर रहे हो?" अघोरी मुस्कुरा कर कहता है: "समय का पहिया घूम चुका है, कबीर।"`,
    characters: [
      {
        id: 'char-kabir',
        name: 'Prof. Kabir (प्रोफेसर कबीर)',
        role: 'Protagonist / Historian',
        photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
        age: '45 years old',
        ethnicity: 'North Indian',
        visualContinuityTags: '45yo North Indian intellectual man with wire-rimmed round glasses, silver-threaded thick beard, intelligent weary eyes, wearing a textured charcoal khadi kurta with maroon wool shawl draped over shoulder',
        keyFeatures: [
          'Wire-rimmed round spectacles',
          'Salt-and-pepper sculpted beard',
          'Charcoal khadi kurta with maroon wool shawl',
          'Holding ancient etched copper relic',
        ],
      },
    ],
    sampleShots: [],
  },
];
