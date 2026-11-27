import type { AppLang } from './i18n';
import {
  STORY_CATEGORIES,
  STORY_CATEGORY_GROUPS,
  getCategoryById,
  getCategoryGroup,
  type StoryCategory,
  type StoryCategoryGroupId,
} from './storyCategories';
import { GROUP_STORY_PATTERNS } from './storyCategoryContent';

export type GenreKey = 'thriller' | 'drama' | 'action' | 'folk' | 'scifi' | 'comedy' | 'ad';
export type DialogueMode = 'dynamic' | 'dialogue' | 'silent';

export interface StoryAngle {
  id: string;
  catKey?: GenreKey;
  categoryId?: string;
  categoryName?: string;
  categoryGroup?: StoryCategoryGroupId;
  visualStyle?: string;
  cameraFocus?: string;
  genre: string;
  title: string;
  mood: string;
  bgm?: string;
  continuity?: string;
  characters?: string;
  storySummary?: string;
  scenesPreview?: string[];
  beginning?: string;
  middle?: string;
  ending?: string;
  synopsis: string;
  scriptText: string;
}

export interface GeneratedShot {
  shotNumber: number;
  durationSeconds: number;
  timing: string;
  timeRange?: string;
  cameraAngle?: string;
  lightingCue?: string;
  categoryTag?: string;
  action: string;
  characters?: string[];
  bgm?: string;
  continuity?: string;
  malayalamDialogue: string;
  dialogueEnglish?: string;
  imagePrompt?: string;
  videoPrompt?: string;
  visualPrompt?: string;
}

export function hasExplicitDialogue(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (/["“”'‘’«»]/.test(trimmed)) return true;
  if (/(^|\n)\s*[^\d:\n]{2,24}\s*:\s*\S+/m.test(trimmed)) return true;

  const dialogueKeywords =
    /\b(dialogue|dialogues|says|said|asks|asked|speaks|spoke|talks|talking|conversation|whispers|shouts|replies|monologue|voiceover|narrates)\b|(ഡയലോഗ്|സംഭാഷണം|പറയുന്നു|പറഞ്ഞു|ചോദിക്കുന്നു|ചോദിച്ചു|സംസാരിക്കുന്നു|സംസാരിച്ചു|വിളിക്കുന്നു|മറുപടി|ശബ്ദത്തിൽ പറയുന്നു)|(संवाद|डायलॉग|कहता|कहती|कहा|पूछता|पूछा|बोलता|बोली|बातचीत)|(வசனம்|டயலாக்|பேசுகிறார்|பேசினார்|கேட்கிறார்|கேட்டார்|சொல்கிறார்|சொன்னார்|உரையாடல்)|(ಸಂಭಾಷಣೆ|ಡೈಲಾಗ್|ಹೇಳುತ್ತಾ|ಹೇಳಿದ|ಕೇಳುತ್ತಾ|ಮಾತನಾಡು|ಮಾತುಕತೆ)|(సంభాషణ|డైలాగ్|చెబుత|చెప్పా|అడుగుత|అడిగా|మాట్లాడుత|మాటలు)/i;

  return dialogueKeywords.test(trimmed);
}

export function isExplicitlySilent(text: string): boolean {
  if (!text) return false;
  return /\b(no dialogue|zero dialogue|without dialogue|silent film|silent movie|mute)\b|(ഡയലോഗ്\s*വേണ്ട|ഡയലോഗ്\s*ഇല്ലാതെ|സംഭാഷണമില്ല|ശബ്ദരഹിതം|निःशब्द|बिना संवाद|வசனம்\s*வேண்டாம்|ಮೌನ|డైలాగ్\s*వద్దు)/i.test(
    text
  );
}

export function extractDialogueIfPresent(beatText: string): string {
  if (!beatText) return '';
  const quoteMatch = beatText.match(/["“]([^"”]{2,180})["”]/);
  if (quoteMatch?.[1]) return quoteMatch[1].trim();

  const singleQuoteMatch = beatText.match(/['‘]([^'’]{2,180})['’]/);
  if (singleQuoteMatch?.[1]) return singleQuoteMatch[1].trim();

  const colonMatch = beatText.match(/(?:^|\n)\s*(?!Shot|Scene|Part|CHARACTERS|BGM|CONTINUITY|CATEGORY)[^\d:\n]{2,24}\s*:\s*([^\n]{2,180})/i);
  if (colonMatch?.[1]) return colonMatch[1].trim();

  return '';
}

export function mapGroupToGenreKey(groupId: StoryCategoryGroupId): GenreKey {
  switch (groupId) {
    case 'romance':
    case 'emotional':
    case 'family':
    case 'drama':
      return 'drama';
    case 'action':
    case 'youth':
      return 'action';
    case 'thriller':
    case 'mystery':
    case 'crime':
      return 'thriller';
    case 'horror':
    case 'fantasy':
      return 'folk';
    case 'scifi':
      return 'scifi';
    case 'comedy':
      return 'comedy';
    case 'commercial':
    default:
      return 'ad';
  }
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function splitStorySentences(text: string): string[] {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return [];

  const rawParts = normalized
    .split(/(?<=[.।!?])\s+|[;]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  if (rawParts.length >= 2) return rawParts;

  const commaParts = normalized
    .split(/,\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  return commaParts.length > 0 ? commaParts : [normalized];
}

export function inferCategoryFromScript(script: string): StoryCategory {
  const tagMatch = script.match(/\[CATEGORY_ID:\s*([^\]]+)\]/i);
  if (tagMatch?.[1]) {
    const exact = getCategoryById(tagMatch[1].trim());
    if (exact) return exact;
  }

  const lower = script.toLowerCase();
  if (/(romanc|love|couple|crush|date|kiss|valentine|പ്രണയ|കാമുക|प्यार|रोमांस|காதல்|ಪ್ರೇಮ|ప్రేమ)/.test(lower)) {
    return getCategoryById('rom-first-eye-contact') || STORY_CATEGORIES[0];
  }
  if (/(horror|ghost|haunt|spirit|attic|demon|ഭൂത|പ്രേത|ഹൊറർ|भूत|डरावना|பேய்|ದೆವ್ವ|దెయ్యం)/.test(lower)) {
    return getCategoryById('hor-attic-footsteps') || STORY_CATEGORIES[0];
  }
  if (/(action|fight|chase|ambush|rescue|gun|sword|ആക്ഷൻ|അടി|പോരാട്ടം|एक्शन|लड़ाई|சண்டை|ಸಾಹಸ|యాక్షన్)/.test(lower)) {
    return getCategoryById('act-alley-ambush') || STORY_CATEGORIES[0];
  }
  if (/(comedy|funny|laugh|joke|prank|comic|കോമഡി|തമാശ|ചിരി|कॉमेडी|हँसी|நகைச்சுவை|ಕಾಮಿಡಿ|కామెడీ)/.test(lower)) {
    return getCategoryById('com-awkward-first-date') || STORY_CATEGORIES[0];
  }
  if (/(sci[- ]?fi|time loop|robot|ai\b|alien|space|future|സയൻസ്|ടൈം|रोबोट|भविष्य|விண்வெளி|ರೋಬೋಟ್|రోబోట్)/.test(lower)) {
    return getCategoryById('sci-time-loop-cafe') || STORY_CATEGORIES[0];
  }
  if (/(mystery|detective|clue|diary|secret|മിസ്റ്ററി|രഹസ്യ|रहस्य|जासूस|மர்மம்|ನಿಗೂಢ|మిస్టరీ)/.test(lower)) {
    return getCategoryById('mys-locked-room-manor') || STORY_CATEGORIES[0];
  }
  if (/(crime|heist|mafia|vault|gang|smuggl|ക്രൈം|കവർച്ച|क्राइम|गिरोह|க்ரைம்|ಕ್ರೈಮ್|క్రైమ్)/.test(lower)) {
    return getCategoryById('cri-diamond-vault-blueprint') || STORY_CATEGORIES[0];
  }
  if (/(emotion|mother|father|cry|tear|sacrifice|hospital|വൈകാരിക|അമ്മ|അച്ഛൻ|माँ|भावुक|உணர்ச்சி|ಭಾವನಾತ್ಮಕ|భావోద్వేగ)/.test(lower)) {
    return getCategoryById('emo-mother-airport-tiffin') || STORY_CATEGORIES[0];
  }
  if (/(family|grandma|grandpa|kids|home|കുടുംബം|മുത്തശ്ശി|परिवार|குடும்பம்|ಕುಟುಂಬ|కుటుంబం)/.test(lower)) {
    return getCategoryById('fam-sunday-lunch-reunion') || STORY_CATEGORIES[0];
  }
  if (/(fantasy|magic|king|palace|dragon|sword|രാജ|മാന്ത്രിക|जादू|राजा|மாய|ಮಾಂತ್ರಿಕ|మాయ)/.test(lower)) {
    return getCategoryById('fan-enchanted-sword-shrine') || STORY_CATEGORIES[0];
  }
  if (/(campus|college|hostel|friends|roadtrip|trek|കോളേജ്|സൗഹൃദം|दोस्तों|कैंपस|கல்லூரி|ಕಾಲೇಜು|కళాశాల)/.test(lower)) {
    return getCategoryById('yth-college-canteen-banter') || STORY_CATEGORIES[0];
  }
  if (/(ad\b|brand|commercial|product|promo|reel|പരസ്യം|വിപണി|विज्ञापन|விளம்பரம்|ಜಾಹೀರಾತು|ప్రకటన)/.test(lower)) {
    return getCategoryById('comml-smart-tech-morning-save') || STORY_CATEGORIES[0];
  }
  if (/(thrill|suspect|spy|stalker|bomb|hostage|ത്രില്ലർ|സംശയ|थ्रिलर|திரில்லர்|ಥ್ರಿಲ್ಲರ್|థ్రిల్లರ್)/.test(lower)) {
    return getCategoryById('thr-interrogation-room') || STORY_CATEGORIES[0];
  }

  return getCategoryById('dra-unspoken-father-son') || STORY_CATEGORIES[0];
}

function getDirectionalModifiers(lang: AppLang) {
  const byLang: Record<AppLang, { tag: string; twistNote: string; moodAdd: string }[]> = {
    en: [
      { tag: 'Intimate Face-to-Face Focus', twistNote: 'Highlighting subtle eye contact and unspoken emotional tension', moodAdd: 'Intimate Character Study' },
      { tag: 'Atmospheric Visual Poetry', twistNote: 'Letting lighting, rain/shadow textures, and silence carry weight', moodAdd: 'Mood-Lit Cinema' },
      { tag: 'Unexpected Turning Point', twistNote: 'Introducing a sudden reveal that flips the characters’ dynamic', moodAdd: 'Sharp Plot Twist' },
      { tag: 'Escalating Tension & Pace', twistNote: 'Raising the stakes with rhythmic cuts and tight reactions', moodAdd: 'Dynamic Momentum' },
      { tag: 'Heart-First Emotional Arc', twistNote: 'Focusing on vulnerability, honesty, and lingering resonance', moodAdd: 'Deeply Felt Resonance' },
      { tag: 'Suspenseful Edge Cut', twistNote: 'Framing lingering glances and hidden motives behind calm gestures', moodAdd: 'Edge-of-Seat Subtext' },
      { tag: 'Playful Spark & Chemistry', twistNote: 'Blending witty timing and warm human spontaneity', moodAdd: 'Lively Chemistry' },
      { tag: 'Grand Finale Horizon', twistNote: 'Sweeping wide resolution leaving a memorable closing image', moodAdd: 'Signature Closing Frame' },
    ],
    ml: [
      { tag: 'നേർക്കുനേർ ഇന്റിമേറ്റ് ഫോക്കസ്', twistNote: 'കണ്ണുകളിലെ സൂക്ഷ്മഭാവങ്ങൾക്കും വികാരങ്ങൾക്കും മുൻഗണന നൽകുന്ന അവതരണം', moodAdd: 'Intimate Character Study' },
      { tag: 'അന്തരീക്ഷ ദൃശ്യഭംഗി', twistNote: 'വെളിച്ചവും നിഴലും പശ്ചാത്തല ശബ്ദങ്ങളും കഥ പറയുന്ന സിനിമാറ്റിക് ശൈലി', moodAdd: 'Mood-Lit Cinema' },
      { tag: 'അപ്രതീക്ഷിത വഴിത്തിരിവ്', twistNote: 'കഥാപാത്രങ്ങളുടെ ബന്ധം പെട്ടെന്ന് മാറ്റിമറിക്കുന്ന സർപ്രൈസ് ട്വിസ്റ്റ്', moodAdd: 'Sharp Plot Twist' },
      { tag: 'വേഗതയേറിയ ടെൻഷൻ കട്ട്', twistNote: 'ആകാംക്ഷയും വേഗതയും വർദ്ധിപ്പിക്കുന്ന ചടുലമായ ഷോട്ട് ക്രമീകരണം', moodAdd: 'Dynamic Momentum' },
      { tag: 'ഹൃദയസ്പർശിയായ ആഖ്യാനം', twistNote: 'ആഴത്തിലുള്ള വികാരങ്ങളും സത്യസന്ധമായ മറുപടികളും നിറഞ്ഞ രംഗം', moodAdd: 'Deeply Felt Resonance' },
      { tag: 'സസ്പെൻസ് സബ്-ടെക്സ്റ്റ്', twistNote: 'ശാന്തമായ വാക്കുകൾക്കുള്ളിൽ ഒളിഞ്ഞിരിക്കുന്ന രഹസ്യ സൂചനകൾ', moodAdd: 'Edge-of-Seat Subtext' },
      { tag: 'രസകരമായ കെമിസ്ട്രി', twistNote: 'സ്വാഭാവിക തമാശയും കൗതുകവും ചേർന്ന ആസ്വാദ്യകരമായ രംഗം', moodAdd: 'Lively Chemistry' },
      { tag: 'മറക്കാനാവാത്ത ക്ലൈമാക്സ് ഫ്രെയിം', twistNote: 'മനസ്സിൽ തങ്ങിനിൽക്കുന്ന വൈഡ് സിനിമാറ്റിക് അന്ത്യം', moodAdd: 'Signature Closing Frame' },
    ],
    hi: [
      { tag: 'आमने-सामने क्लोज़-अप फ़ोकस', twistNote: 'आँखों के भाव और अनकहे जज़्बातों पर केंद्रित प्रस्तुति', moodAdd: 'Intimate Character Study' },
      { tag: 'वातावरणीय दृश्य कविता', twistNote: 'रोशनी, परछाई और परिवेश की आवाज़ों से कहानी बुनने की शैली', moodAdd: 'Mood-Lit Cinema' },
      { tag: 'अप्रत्याशित मोड़ (ट्विस्ट)', twistNote: 'एक अचानक खुलासे से रिश्तों और स्थिति का पलटना', moodAdd: 'Sharp Plot Twist' },
      { tag: 'तेज़ गति और तनाव', twistNote: 'सधे हुए तेज़ कट्स और बढ़ती धड़कन के साथ प्रस्तुति', moodAdd: 'Dynamic Momentum' },
      { tag: 'दिल को छूने वाला भाव', twistNote: 'सच्चाई, संवेदनशीलता और गहरे जुड़ाव पर आधारित दृश्य', moodAdd: 'Deeply Felt Resonance' },
      { tag: 'रहस्यमयी सस्पेंस अंदाज़', twistNote: 'शांत मुस्कान के पीछे छुपी गहरी चालें और संकेत', moodAdd: 'Edge-of-Seat Subtext' },
      { tag: 'जीवंत केमिस्ट्री और चुटकुलापन', twistNote: 'हल्की-फुल्की नोकझोंक और सहज मानवीय प्रतिक्रियाएँ', moodAdd: 'Lively Chemistry' },
      { tag: 'यादगार ग्रैंड फिनाले', twistNote: 'प्रभावशाली वाइड फ्रेम में सार्थक और सुंदर समापन', moodAdd: 'Signature Closing Frame' },
    ],
    ta: [
      { tag: 'நேருக்கு நேர் உணர்வுக் கோணம்', twistNote: 'கண்களின் நுட்பமான பாவனைகளுக்கு முக்கியத்துவம் தரும் காட்சி', moodAdd: 'Intimate Character Study' },
      { tag: 'ஒளி-நிழல் காட்சி கவிதை', twistNote: 'இயற்கை ஒளியும் சூழலின் ஒலியும் கதை சொல்லும் பாணி', moodAdd: 'Mood-Lit Cinema' },
      { tag: 'எதிர்பாராத திருப்பம்', twistNote: 'சட்டென்று சூழலை மாற்றும் ஆச்சரியமான திருப்பம்', moodAdd: 'Sharp Plot Twist' },
      { tag: 'வேகமான பரபரப்பு நடை', twistNote: 'வேகமான கட்ஸ் மற்றும் உயரும் பதற்றத்துடன் நகரும் காட்சி', moodAdd: 'Dynamic Momentum' },
      { tag: 'இதயம் தொடும் நெகிழ்ச்சி', twistNote: 'உண்மையான உணர்வுகளும் ஆழமான அன்பும் நிறைந்த தருணம்', moodAdd: 'Deeply Felt Resonance' },
      { tag: 'மர்மம் கலந்த உள்நோக்கம்', twistNote: 'அமைதியான பேச்சுக்குள் மறைந்திருக்கும் ரகசியக் குறிப்புகள்', moodAdd: 'Edge-of-Seat Subtext' },
      { tag: 'கலகலப்பான கெமிஸ்ட்ரி', twistNote: 'சுவாரஸ்யமான உரையாடலும் இயல்பான நகைச்சுவையும்', moodAdd: 'Lively Chemistry' },
      { tag: 'நிறைவான சினிமாட்டிக் முடிவு', twistNote: 'மனதில் நிற்கும் அழகிய இறுதி காட்சி', moodAdd: 'Signature Closing Frame' },
    ],
    kn: [
      { tag: 'ಮುಖಾಮುಖಿ ಭಾವನಾತ್ಮಕ ಫೋಕಸ್', twistNote: 'ಕಣ್ಣಿನ ಸೂಕ್ಷ್ಮ ಭಾವನೆಗಳಿಗೆ ಒತ್ತು ನೀಡುವ ನಿರೂಪಣೆ', moodAdd: 'Intimate Character Study' },
      { tag: 'ದೃಶ್ಯ ಕಾವ್ಯ ಶೈಲಿ', twistNote: 'ಬೆಳಕು, ನೆರಳು ಮತ್ತು ಪರಿಸರದ ಧ್ವನಿಯಿಂದ ಕಥೆ ಹೇಳುವ ಶೈಲಿ', moodAdd: 'Mood-Lit Cinema' },
      { tag: 'ಅನಿರೀಕ್ಷಿತ ತಿರುವು', twistNote: 'ಪಾತ್ರಗಳ ನಡುವಿನ ಸಮೀಕರಣ ಬದಲಿಸುವ ದಿಢೀರ್ ಸತ್ಯ', moodAdd: 'Sharp Plot Twist' },
      { tag: 'ವೇಗದ ರೋಮಾಂಚಕ ಗತಿ', twistNote: 'ಚುರುಕಾದ ಕಟ್‌ಗಳು ಮತ್ತು ಹೆಚ್ಚುವ ಉದ್ವೇಗದ ನಿರೂಪಣೆ', moodAdd: 'Dynamic Momentum' },
      { tag: 'ಹೃದಯಸ್ಪರ್ಶಿ ಭಾವನೆ', twistNote: 'ಪ್ರಾಮಾಣಿಕತೆ ಮತ್ತು ಆಳವಾದ ಮಾನವೀಯ ಸ್ಪರ್ಶದ ದೃಶ್ಯ', moodAdd: 'Deeply Felt Resonance' },
      { tag: 'ರಹಸ್ಯಮಯ ಒಳಾರ್ಥ', twistNote: 'ಶಾಂತ ಮಾತಿನ ಹಿಂದೆ ಅಡಗಿರುವ ಕುತೂಹಲಕಾರಿ ಸುಳಿವು', moodAdd: 'Edge-of-Seat Subtext' },
      { tag: 'ಉತ್ಸಾಹದ ಕೆಮಿಸ್ಟ್ರಿ', twistNote: 'ಸಹಜ ಹಾಸ್ಯ ಮತ್ತು ಚುರುಕಾದ ಸಂಭಾಷಣೆಯ ಮಿಶ್ರಣ', moodAdd: 'Lively Chemistry' },
      { tag: 'ಅಮೋಘ ಕ್ಲೈಮ್ಯಾಕ್ಸ್ ಫ್ರೇಮ್', twistNote: 'ಮನಸ್ಸಿನಲ್ಲಿ ಉಳಿಯುವ ಭವ್ಯ ಅಂತಿಮ ದೃಶ್ಯ', moodAdd: 'Signature Closing Frame' },
    ],
    te: [
      { tag: 'ముఖాముఖి ఎమోషనల్ ఫోకస్', twistNote: 'కళ్ళలోని సూక్ష్మ భావాలకు ప్రాధాన్యత ఇచ్చే శైలి', moodAdd: 'Intimate Character Study' },
      { tag: 'అందమైన దృశ్య కావ్యం', twistNote: 'వెలుగు, నీడలు మరియు సహజ ధ్వనులతో కథ చెప్పే విధానం', moodAdd: 'Mood-Lit Cinema' },
      { tag: 'అనూహ్యమైన మలుపు', twistNote: 'పాత్రల మధ్య పరిస్థితిని ఒక్కసారిగా మార్చే ట్విస్ట్', moodAdd: 'Sharp Plot Twist' },
      { tag: 'వేగవంతమైన టెంపో', twistNote: 'పదునైన కట్స్ మరియు పెరుగుతున్న ఉత్కంఠతో సాగే శైలి', moodAdd: 'Dynamic Momentum' },
      { tag: 'హృదయానికి హత్తుకునే భావం', twistNote: 'నిజాయితీ మరియు లోతైన భావోద్వేగం నిండిన సన్నివేశం', moodAdd: 'Deeply Felt Resonance' },
      { tag: 'సస్పెన్స్ సబ్-టెక్స్ట్', twistNote: 'ప్రశాంతమైన మాటల వెనుక దాగి ఉన్న రహస్య సంకేతాలు', moodAdd: 'Edge-of-Seat Subtext' },
      { tag: 'సరదా కెమిస్ట్రీ', twistNote: 'సహజమైన హాస్యం మరియు చలాకీ సంభాషణలతో కూడిన శైలి', moodAdd: 'Lively Chemistry' },
      { tag: 'మర్చిపోలేని క్లైమాక్స్ ఫ్రేమ్', twistNote: 'మనసులో నిలిచిపోయే అద్భుతమైన ముగింపు దృశ్యం', moodAdd: 'Signature Closing Frame' },
    ],
  };
  return byLang[lang] || byLang.en;
}

function buildAngleSummaryText(
  lang: AppLang,
  seedOpening: string,
  cat: StoryCategory,
  beats: [string, string, string],
  lensNote: string,
  dialogueMode: DialogueMode
): string {
  const modeLineByLang: Record<AppLang, Record<DialogueMode, string>> = {
    en: {
      dialogue: `Auto-Dialogue Focus (${cat.dialogueStyle})`,
      silent: 'Pure Visual & Ambient Action (Zero Spoken Dialogue)',
      dynamic: 'Balanced Spoken Dialogue + Expressive Silent Reactions',
    },
    ml: {
      dialogue: `കഥയ്ക്ക് അനുയോജ്യമായ സ്വാഭാവിക സംഭാഷണങ്ങൾ (${cat.dialogueStyle})`,
      silent: 'സംഭാഷണങ്ങളില്ലാത്ത ശുദ്ധമായ ദൃശ്യാവിഷ്കാരം (Pure Visual)',
      dynamic: 'സംഭാഷണങ്ങളും നിശബ്ദ ഭാവങ്ങളും ചേർന്ന ശൈലി',
    },
    hi: {
      dialogue: `स्वाभाविक संवाद शैली (${cat.dialogueStyle})`,
      silent: 'बिना डायलॉग पूर्ण विज़ुअल कहानी (Pure Visual)',
      dynamic: 'संवाद और विज़ुअल भावों का संतुलित मेल',
    },
    ta: {
      dialogue: `இயல்பான வசன நடை (${cat.dialogueStyle})`,
      silent: 'வசனமில்லா முழு விஷுவல் காட்சி (Pure Visual)',
      dynamic: 'வசனமும் முகபாவமும் கலந்த நடை',
    },
    kn: {
      dialogue: `ಸಹಜ ಸಂಭಾಷಣೆ ಶೈಲಿ (${cat.dialogueStyle})`,
      silent: 'ಡೈಲಾಗ್ ಇಲ್ಲದ ಶುದ್ಧ ವಿಷುಯಲ್ ದೃಶ್ಯ (Pure Visual)',
      dynamic: 'ಸಂಭಾಷಣೆ ಮತ್ತು ವಿಷುಯಲ್ ಭಾವನೆಗಳ ಮಿಶ್ರಣ',
    },
    te: {
      dialogue: `సహజమైన డైలాగ్ శైలి (${cat.dialogueStyle})`,
      silent: 'డైలాగ్ లేని పూర్తి విజువల్ కథనం (Pure Visual)',
      dynamic: 'డైలాగులు మరియు విజువల్ భావాల కలయిక',
    },
  };

  const labelsByLang: Record<AppLang, { setting: string; camera: string; mode: string }> = {
    en: { setting: 'Setting & Look', camera: 'Camera & Style', mode: 'Script Audio' },
    ml: { setting: 'പശ്ചാത്തലവും ദൃശ്യവും', camera: 'ക്യാമറ ശൈലി', mode: 'ശബ്ദ/സംഭാഷണ രീതി' },
    hi: { setting: 'माहौल और दृश्य', camera: 'कैमरा शैली', mode: 'संवाद मोड' },
    ta: { setting: 'சூழல் & ஒளி', camera: 'கேமரா கோணம்', mode: 'வசன முறை' },
    kn: { setting: 'ಪರಿಸರ & ಬೆಳಕು', camera: 'ಕ್ಯಾಮೆರಾ ಶೈಲಿ', mode: 'ಸಂಭಾಷಣೆ ಶೈಲಿ' },
    te: { setting: 'సెట్టింగ్ & విజువల్స్', camera: 'కెమెరా స్టైల్', mode: 'డైలాగ్ విధానం' },
  };

  const lbl = labelsByLang[lang] || labelsByLang.en;
  const modeStr = (modeLineByLang[lang] || modeLineByLang.en)[dialogueMode];

  return [
    `${seedOpening}.`,
    `${beats[0]}. ${beats[1]}.`,
    `${beats[2]} (${lensNote}).`,
    `${lbl.setting}: ${cat.settingCue} — ${cat.visualStyle}.`,
    `${lbl.camera}: ${cat.cameraFocus} • ${lbl.mode}: ${modeStr}.`,
  ].join('\n');
}

export function generateStoryAnglesLocal(
  premise: string,
  lang: AppLang = 'ml',
  targetShotCount: number = 8,
  selectedCategoryId?: string,
  dialogueMode: DialogueMode = 'dialogue'
): StoryAngle[] {
  const baseText = premise.trim().replace(/\s+/g, ' ');
  const sentences = splitStorySentences(baseText);
  const rawSeed = sentences[0] || baseText;
  const seedOpening =
    rawSeed.length > 180 ? `${rawSeed.slice(0, 177).trim()}...` : rawSeed.replace(/[.।!?]+$/g, '').trim();

  const modifiers = getDirectionalModifiers(lang);
  const specificCat = selectedCategoryId && selectedCategoryId !== 'all' ? getCategoryById(selectedCategoryId) : undefined;

  const continuityPrefixByLang: Record<AppLang, string> = {
    en: `Exact facial continuity, wardrobe & prop lock across all ${targetShotCount} clips`,
    ml: `എല്ലാ ${targetShotCount} ഷോട്ടുകളിലും കഥാപാത്രങ്ങളുടെ മുഖവും വേഷവും പശ്ചാത്തലവും ഒരേപോലെ തുടരുന്നു`,
    hi: `सभी ${targetShotCount} शॉट्स में पात्रों के चेहरे, कपड़े और प्रॉप कंटिन्यूटी एक जैसी रहती है`,
    ta: `அனைத்து ${targetShotCount} காட்சிகளிலும் கதாபாத்திரங்களின் தோற்றமும் உடையும் தொடர்ச்சியாக இருக்கும்`,
    kn: `ಎಲ್ಲಾ ${targetShotCount} ಶಾಟ್‌ಗಳಲ್ಲಿ ಪಾತ್ರಗಳ ಮುಖ, ಉಡುಪು ಮತ್ತು ವಸ್ತುಗಳ ನಿರಂತರತೆ ಕಾಯ್ದುಕೊಳ್ಳಲಾಗುತ್ತದೆ`,
    te: `అన్ని ${targetShotCount} షాట్లలో పాత్రల ముఖం, దుస్తులు మరియు ప్రాప్ కంటిన్యుటీ స్థిరంగా ఉంటుంది`,
  };

  if (specificCat) {
    const pattern = GROUP_STORY_PATTERNS[specificCat.groupId];
    const grp = getCategoryGroup(specificCat.groupId);
    const groupLabel = grp.labels[lang] || grp.labels.en;
    const beats = pattern.plotBeats[lang] || pattern.plotBeats.en;
    const chars = pattern.characters[lang] || pattern.characters.en;

    return modifiers.map((mod, idx) => {
      const shiftedBeats: [string, string, string] = [
        beats[idx % 3],
        beats[(idx + 1) % 3],
        beats[(idx + 2) % 3],
      ];
      const summary = buildAngleSummaryText(
        lang,
        seedOpening,
        specificCat,
        shiftedBeats,
        mod.twistNote,
        dialogueMode
      );
      const bgmText = `${specificCat.bgmVibe} • ${specificCat.pacing}`;
      const continuity = `${continuityPrefixByLang[lang] || continuityPrefixByLang.en} (${specificCat.settingCue}).`;

      return {
        id: `angle-${idx + 1}`,
        catKey: mapGroupToGenreKey(specificCat.groupId),
        categoryId: specificCat.id,
        categoryName: specificCat.name,
        categoryGroup: specificCat.groupId,
        visualStyle: specificCat.visualStyle,
        cameraFocus: specificCat.cameraFocus,
        genre: `${grp.icon} ${groupLabel} · ${specificCat.name}`,
        title: `${specificCat.name} — ${mod.tag}`,
        mood: `${specificCat.tone} • ${mod.moodAdd}`,
        bgm: bgmText,
        continuity,
        characters: chars,
        storySummary: summary,
        scenesPreview: [seedOpening, ...shiftedBeats],
        beginning: seedOpening,
        middle: `${shiftedBeats[0]}. ${shiftedBeats[1]}.`,
        ending: shiftedBeats[2],
        synopsis: `${specificCat.name} (${mod.tag})`,
        scriptText: `${summary}\n\n[CATEGORY_ID: ${specificCat.id}]\n[CHARACTERS: ${chars}]\n[BGM STYLE: ${bgmText}]\n[CONTINUITY: ${continuity}]`,
      };
    });
  }

  // Diverse exploration mode: 2 distinct categories from each of all 14 category groups = 28 rich angles
  const seedHash = hashString(baseText);
  const inferredPrimary = inferCategoryFromScript(baseText);
  const orderedGroups = [...STORY_CATEGORY_GROUPS].sort((a, b) => {
    if (a.id === inferredPrimary.groupId) return -1;
    if (b.id === inferredPrimary.groupId) return 1;
    return 0;
  });

  const angles: StoryAngle[] = [];
  let counter = 1;

  for (const grp of orderedGroups) {
    const groupCats = STORY_CATEGORIES.filter((c) => c.groupId === grp.id);
    const pattern = GROUP_STORY_PATTERNS[grp.id];
    const beats = pattern.plotBeats[lang] || pattern.plotBeats.en;
    const chars = pattern.characters[lang] || pattern.characters.en;
    const groupLabel = grp.labels[lang] || grp.labels.en;

    for (let slot = 0; slot < 2; slot++) {
      const cat = groupCats[(seedHash + slot * 7) % groupCats.length] || groupCats[0];
      const mod = modifiers[(counter + slot) % modifiers.length];
      const shiftedBeats: [string, string, string] =
        slot === 0 ? beats : [beats[1], beats[2], beats[0]];

      const summary = buildAngleSummaryText(
        lang,
        seedOpening,
        cat,
        shiftedBeats,
        mod.twistNote,
        dialogueMode
      );
      const bgmText = `${cat.bgmVibe} • ${cat.pacing}`;
      const continuity = `${continuityPrefixByLang[lang] || continuityPrefixByLang.en} (${cat.settingCue}).`;

      angles.push({
        id: `angle-${counter}`,
        catKey: mapGroupToGenreKey(grp.id),
        categoryId: cat.id,
        categoryName: cat.name,
        categoryGroup: grp.id,
        visualStyle: cat.visualStyle,
        cameraFocus: cat.cameraFocus,
        genre: `${grp.icon} ${groupLabel} · ${cat.name}`,
        title: `${cat.name} — ${mod.tag}`,
        mood: `${cat.tone} • ${mod.moodAdd}`,
        bgm: bgmText,
        continuity,
        characters: chars,
        storySummary: summary,
        scenesPreview: [seedOpening, ...shiftedBeats],
        beginning: seedOpening,
        middle: `${shiftedBeats[0]}. ${shiftedBeats[1]}.`,
        ending: shiftedBeats[2],
        synopsis: `${cat.name} (${groupLabel})`,
        scriptText: `${summary}\n\n[CATEGORY_ID: ${cat.id}]\n[CHARACTERS: ${chars}]\n[BGM STYLE: ${bgmText}]\n[CONTINUITY: ${continuity}]`,
      });
      counter++;
    }
  }

  return angles;
}

const ORDERED_GENRE_KEYS: GenreKey[] = ['thriller', 'drama', 'action', 'folk', 'scifi', 'comedy', 'ad'];

function inferGenreKey(rawCat: string = '', rawGenre: string = ''): GenreKey | undefined {
  const combined = `${rawCat} ${rawGenre}`.toLowerCase();
  if (/(thriller|mystery|crime|ത്രില്ലർ|थ्रिलर|திரில்லர்|ಥ್ರಿಲ್ಲರ್|థ్రిల్లర్)/.test(combined)) return 'thriller';
  if (/(drama|romance|emotional|family|ഡ്രാമ|പ്രണയ|ड्रामा|டிராமா|ಡ್ರಾಮಾ|డ్రామా)/.test(combined)) return 'drama';
  if (/(action|youth|ആക്ഷൻ|एक्शन|ஆக்ஷன்|ಆಕ್ಷನ್|యాక్షన్)/.test(combined)) return 'action';
  if (/(folk|horror|fantasy|ഫോക്ക്|ഹൊറർ|लोक|நாட்டுப்புற|ಜಾನಪದ|జానపద)/.test(combined)) return 'folk';
  if (/(sci[- ]?fi|സയൻസ്|साइंस|சயின்ஸ்|ಸೈನ್ಸ್|సైన్స్)/.test(combined)) return 'scifi';
  if (/(comedy|കോമഡി|कॉमेडी|காமெடி|ಕಾಮಿಡಿ|కామెడీ|fun)/.test(combined)) return 'comedy';
  if (/(\bad\b|commercial|promo|reels|കൊമേഴ്സ്യൽ|പരസ്യം|विज्ञापन|விளம்பரம்|ಜಾಹೀರಾತು|ప్రకటన)/.test(combined)) return 'ad';
  return undefined;
}

export function mergeAnglesEnsuringAllCategories(
  aiAngles: StoryAngle[],
  fallbackAngles: StoryAngle[]
): StoryAngle[] {
  if (aiAngles.length >= 6) {
    return aiAngles.map((a, idx) => ({
      ...a,
      id: a.id || `angle-${idx + 1}`,
      catKey: a.catKey || inferGenreKey(a.categoryGroup || '', a.genre || '') || 'drama',
    }));
  }

  const grouped = new Map<GenreKey, StoryAngle[]>();
  ORDERED_GENRE_KEYS.forEach((k) => grouped.set(k, []));

  for (const angle of aiAngles) {
    const resolvedKey =
      (angle.catKey && ORDERED_GENRE_KEYS.includes(angle.catKey) ? angle.catKey : undefined) ||
      inferGenreKey(String(angle.catKey || ''), String(angle.genre || ''));
    if (resolvedKey) {
      grouped.get(resolvedKey)!.push({ ...angle, catKey: resolvedKey });
    }
  }

  const merged: StoryAngle[] = [];
  let idx = 1;
  for (const catKey of ORDERED_GENRE_KEYS) {
    const existing = (grouped.get(catKey) || []).slice(0, 2);
    const localForCat = fallbackAngles.filter((a) => a.catKey === catKey);
    const needed = Math.max(0, 2 - existing.length);
    const completedForCat = [...existing, ...localForCat.slice(0, needed)];
    for (const item of completedForCat) {
      merged.push({ ...item, id: `angle-${idx++}` });
    }
  }

  return merged;
}

function getCategoryDialogueLine(
  cat: StoryCategory,
  lang: AppLang,
  idx: number,
  usedDialogues: Set<string>
): string {
  const pattern = GROUP_STORY_PATTERNS[cat.groupId] || GROUP_STORY_PATTERNS.drama;
  const pool = pattern.dialogues[lang] || pattern.dialogues.en;
  const seedOffset = hashString(cat.id) % pool.length;

  for (let step = 0; step < pool.length; step++) {
    const candidate = pool[(idx + seedOffset + step) % pool.length];
    if (candidate && !usedDialogues.has(candidate.toLowerCase())) {
      usedDialogues.add(candidate.toLowerCase());
      return candidate;
    }
  }
  return pool[(idx + seedOffset) % pool.length];
}

function getVisualBeatStageMeta(
  lang: AppLang,
  idx: number,
  numShots: number
): { stageLabel: string; silentVisualCue: string; spokenBeatNote: string; shotFraming: string } {
  const stageIdx = numShots === 1 ? 0 : Math.min(5, Math.floor((idx * 6) / numShots));
  const stagesByLang: Record<
    AppLang,
    { stageLabel: string; silentVisualCue: string; spokenBeatNote: string; shotFraming: string }[]
  > = {
    en: [
      {
        stageLabel: 'Scene 1 — Opening Atmosphere & First Sight',
        silentVisualCue: 'Wide establishing entrance sliding smoothly into lingering eye contact, subtle breathing, and environmental detail — zero spoken words.',
        spokenBeatNote: 'Characters enter the frame naturally and break the initial silence with a grounded opening line.',
        shotFraming: 'Wide 35mm Establishing -> Gentle Push-In',
      },
      {
        stageLabel: 'Scene 2 — Closer Proximity & Subtext',
        silentVisualCue: 'Medium two-shot capturing shifting posture, micro-smiles/tension, and tactile hand interaction without dialogue.',
        spokenBeatNote: 'Camera moves closer as characters exchange a candid reaction line revealing true feelings.',
        shotFraming: 'Medium Two-Shot / Over-the-Shoulder',
      },
      {
        stageLabel: 'Scene 3 — Tactile Detail & Silent Turning Beat',
        silentVisualCue: 'Macro close-up on hands, key prop, or weather cue shifting the emotional weight silently.',
        spokenBeatNote: 'Brief key observation spoken softly over a meaningful prop or eye-line match.',
        shotFraming: 'Macro Insert -> Eye-Line Reaction Close-Up',
      },
      {
        stageLabel: 'Scene 4 — Escalating Twist / Unspoken Truth',
        silentVisualCue: 'Dynamic camera orbit catching stunned pause, sharp glance, or unexpected movement purely visually.',
        spokenBeatNote: 'Stakes escalate cleanly with a pivotal line that shifts the dynamic between characters.',
        shotFraming: 'Circling 50mm / Dynamic Contrast Angle',
      },
      {
        stageLabel: 'Scene 5 — Peak Climax Beat',
        silentVisualCue: 'Intimate 85mm close-up holding raw emotion, bold action, or dramatic confrontation through pure expression.',
        spokenBeatNote: 'Peak emotional or dramatic line delivered clearly within the clip window.',
        shotFraming: 'Tight 85mm Climax Close-Up',
      },
      {
        stageLabel: 'Scene 6 — Lingering Resolution & Final Frame',
        silentVisualCue: 'Graceful slow pull-back uniting silhouettes against evocative lighting for a wordless closing beat.',
        spokenBeatNote: 'Warm or punchy closing line lands cleanly before a smooth atmospheric pull-back.',
        shotFraming: 'Slow Pull-Back Wide Closing Frame',
      },
    ],
    ml: [
      {
        stageLabel: 'രംഗം 1 — തുടക്കവും ആദ്യ കാഴ്ചയും',
        silentVisualCue: 'യാതൊരു സംഭാഷണവുമില്ലാതെ ചുറ്റുപാടും കഥാപാത്രങ്ങളുടെ പ്രവേശനവും ആദ്യ നോട്ടവും ദൃശ്യങ്ങളിലൂടെ മാത്രം അവതരിപ്പിക്കുന്നു.',
        spokenBeatNote: 'കഥാപാത്രങ്ങൾ ഫ്രെയിമിലേക്ക് കടന്നുവരികയും സാഹചര്യത്തിന് ഇണങ്ങുന്ന സ്വാഭാവിക സംഭാഷണത്തോടെ രംഗം തുടങ്ങുകയും ചെയ്യുന്നു.',
        shotFraming: 'Wide 35mm Establishing -> Gentle Push-In',
      },
      {
        stageLabel: 'രംഗം 2 — അടുപ്പവും സൂക്ഷ്മ ഭാവങ്ങളും',
        silentVisualCue: 'മുഖഭാവങ്ങളും കൈകളുടെ ചലനവും കണ്ണിമ വെട്ടാത്ത നോട്ടവും മാത്രം ഉപയോഗിച്ചുള്ള നിശബ്ദ വിഷ്വൽ രംഗം.',
        spokenBeatNote: 'ക്യാമറ അടുക്കുമ്പോൾ ഉള്ളിലെ വികാരം വ്യക്തമാക്കുന്ന ഹൃദ്യമായ മറുപടി പറയുന്നു.',
        shotFraming: 'Medium Two-Shot / Over-the-Shoulder',
      },
      {
        stageLabel: 'രംഗം 3 — ക്ലോസ്-അപ്പ് സൂചനയും വഴിത്തിരിവും',
        silentVisualCue: 'കൈകൾ, പ്രധാന വസ്തു അല്ലെങ്കിൽ വെളിച്ചത്തിലുള്ള മാറ്റം വാക്കുകളില്ലാതെ കഥ മുന്നോട്ട് നയിക്കുന്നു.',
        spokenBeatNote: 'പ്രധാന സൂചനയോടൊപ്പം പ്രസക്തമായൊരു ചെറിയ സംഭാഷണം രംഗത്തിന് ആഴം നൽകുന്നു.',
        shotFraming: 'Macro Insert -> Eye-Line Reaction Close-Up',
      },
      {
        stageLabel: 'രംഗം 4 — തീവ്രത കൂടുന്ന നിമിഷം',
        silentVisualCue: 'വേഗതയുള്ള ക്യാമറാ ചലനവും ശക്തമായ മുഖഭാവങ്ങളും വാക്കുകളില്ലാതെ ആകാംക്ഷ ഉയർത്തുന്നു.',
        spokenBeatNote: 'കഥയുടെ ഗതി മാറ്റുന്ന നിർണ്ണായക സംഭാഷണം ഈ ഘട്ടത്തിൽ വരുന്നു.',
        shotFraming: 'Circling 50mm / Dynamic Contrast Angle',
      },
      {
        stageLabel: 'രംഗം 5 — ക്ലൈമാക്സ് മുഹൂർത്തം',
        silentVisualCue: 'പൂർണ്ണമായ വികാരവും ആക്ഷനും 85mm ക്ലോസ്-അപ്പിലൂടെ സംഭാഷണരഹിതമായി പകർത്തുന്നു.',
        spokenBeatNote: 'രംഗത്തിന്റെ ഉച്ചസ്ഥായിയിലുള്ള പ്രധാന സംഭാഷണം വ്യക്തമായി അവതരിപ്പിക്കുന്നു.',
        shotFraming: 'Tight 85mm Climax Close-Up',
      },
      {
        stageLabel: 'രംഗം 6 — ശാന്തമായ അന്ത്യം (Closing Frame)',
        silentVisualCue: 'മനോഹരമായ വെളിച്ചത്തിലേക്ക് ക്യാമറ സാവധാനം പിന്നോട്ട് നീങ്ങി വാക്കുകളില്ലാതെ പൂർത്തിയാകുന്നു.',
        spokenBeatNote: 'മനസ്സിൽ തങ്ങിനിൽക്കുന്ന അവസാന വരിയോടെ രംഗം ഭംഗിയായി അവസാനിക്കുന്നു.',
        shotFraming: 'Slow Pull-Back Wide Closing Frame',
      },
    ],
    hi: [
      {
        stageLabel: 'सीन 1 — शुरुआत और पहली नज़र',
        silentVisualCue: 'बिना किसी संवाद के माहौल, पात्रों के प्रवेश और पहली नज़र को विशुद्ध दृश्य भाषा में दिखाया गया है।',
        spokenBeatNote: 'पात्र फ्रेम में आते हैं और स्थिति के अनुरूप स्वाभाविक शुरुआती संवाद बोलते हैं।',
        shotFraming: 'Wide 35mm Establishing -> Gentle Push-In',
      },
      {
        stageLabel: 'सीन 2 — नज़दीकी और भावों का बदलाव',
        silentVisualCue: 'चेहरे के सूक्ष्म हावभाव और शारीरिक भाषा बिना शब्दों के कहानी आगे बढ़ाती है।',
        spokenBeatNote: 'कैमरा करीब आता है और पात्रों के बीच सहज संवाद स्थिति को गहरा करता है।',
        shotFraming: 'Medium Two-Shot / Over-the-Shoulder',
      },
      {
        stageLabel: 'सीन 3 — क्लोज़-अप सुराग और मोड़',
        silentVisualCue: 'हाथों या मुख्य वस्तु के क्लोज़-अप से बिना बोले अहम बदलाव महसूस होता है।',
        spokenBeatNote: 'एक संक्षिप्त सटीक पंक्ति दृश्य के मोड़ को उजागर करती है।',
        shotFraming: 'Macro Insert -> Eye-Line Reaction Close-Up',
      },
      {
        stageLabel: 'सीन 4 — बढ़ता तनाव और नया मोड़',
        silentVisualCue: 'तेज़ कैमरा मूवमेंट और गहरी प्रतिक्रिया बिना संवाद के तनाव बढ़ाती है।',
        spokenBeatNote: 'कहानी की दिशा बदलने वाला मुख्य संवाद बोला जाता है।',
        shotFraming: 'Circling 50mm / Dynamic Contrast Angle',
      },
      {
        stageLabel: 'सीन 5 — चरम क्लाइमेक्स पल',
        silentVisualCue: '85mm क्लोज़-अप में भावनाओं या एक्शन का चरम पूरी तरह विज़ुअल रूप में दिखता है।',
        spokenBeatNote: 'सीन का सबसे यादगार क्लाइमेक्स संवाद स्पष्ट रूप से सामने आता है।',
        shotFraming: 'Tight 85mm Climax Close-Up',
      },
      {
        stageLabel: 'सीन 6 — प्रभावशाली अंतिम फ्रेम',
        silentVisualCue: 'सुनहरी रोशनी में कैमरा धीरे-धीरे पीछे हटकर बिना शब्दों के सुंदर समापन करता है।',
        spokenBeatNote: 'एक यादगार अंतिम पंक्ति के साथ दृश्य पूर्ण होता है।',
        shotFraming: 'Slow Pull-Back Wide Closing Frame',
      },
    ],
    ta: [
      {
        stageLabel: 'காட்சி 1 — தொடக்கமும் முதல் பார்வையும்',
        silentVisualCue: 'வசனமே இன்றி சூழலும் முதல் பார்வையும் தூய காட்சி மொழியில் வெளிப்படுகிறது.',
        spokenBeatNote: 'கதாபாத்திரங்கள் தோன்றி சூழலுக்கு ஏற்ற இயல்பான தொடக்க வசனத்தைப் பேசுகிறார்கள்.',
        shotFraming: 'Wide 35mm Establishing -> Gentle Push-In',
      },
      {
        stageLabel: 'காட்சி 2 — நெருக்கமும் முகபாவமும்',
        silentVisualCue: 'முகபாவங்கள் மற்றும் அசைவுகள் வழியே சொல்லப்படாத உணர்வுகள் கடத்தப்படுகின்றன.',
        spokenBeatNote: 'கேமரா நெருங்கும்போது மன உணர்வை வெளிப்படுத்தும் வசனம் இடம்பெறுகிறது.',
        shotFraming: 'Medium Two-Shot / Over-the-Shoulder',
      },
      {
        stageLabel: 'காட்சி 3 — நுட்பமான க்ளோஸ்-அப் திருப்பம்',
        silentVisualCue: 'கைகள் அல்லது முக்கியப் பொருளின் மீது கவனம் சென்று வார்த்தையின்றி கதையை நகர்த்துகிறது.',
        spokenBeatNote: 'சிறிய கூர்மையான வசனம் காட்சியின் திருப்பத்தை உணர்த்துகிறது.',
        shotFraming: 'Macro Insert -> Eye-Line Reaction Close-Up',
      },
      {
        stageLabel: 'காட்சி 4 — உச்சத்தை நோக்கிய நகர்வு',
        silentVisualCue: 'சுழலும் கேமரா கோணம் பதற்றத்தையும் எதிர்பார்ப்பையும் வார்த்தையின்றி உயர்த்துகிறது.',
        spokenBeatNote: 'கதையைத் திருப்பும் முக்கிய உரையாடல் இங்கே இடம்பெறுகிறது.',
        shotFraming: 'Circling 50mm / Dynamic Contrast Angle',
      },
      {
        stageLabel: 'காட்சி 5 — கிளைமேக்ஸ் தருணம்',
        silentVisualCue: 'உணர்ச்சியின் உச்சம் 85mm க்ளோஸ்-அப்பில் மௌனமாகப் பதிவாகிறது.',
        spokenBeatNote: 'காட்சியின் உச்சகட்ட வசனம் தெளிவாகப் பேசப்படுகிறது.',
        shotFraming: 'Tight 85mm Climax Close-Up',
      },
      {
        stageLabel: 'காட்சி 6 — நிறைவான இறுதிக் காட்சி',
        silentVisualCue: 'கேமரா மெதுவாகப் பின்வாங்கி அழகிய ஒளியில் வசனமின்றி முடிகிறது.',
        spokenBeatNote: 'நெஞ்சில் நிற்கும் இறுதி வரியுடன் காட்சி நிறைவடைகிறது.',
        shotFraming: 'Slow Pull-Back Wide Closing Frame',
      },
    ],
    kn: [
      {
        stageLabel: 'ದೃಶ್ಯ 1 — ಆರಂಭ ಮತ್ತು ಮೊದಲ ನೋಟ',
        silentVisualCue: 'ಮಾತಿಲ್ಲದೆ ಪರಿಸರ, ಪಾತ್ರಗಳ ಪ್ರವೇಶ ಮತ್ತು ಮೊದಲ ನೋಟವನ್ನು ಶುದ್ಧ ದೃಶ್ಯ ಭಾಷೆಯಲ್ಲಿ ತೋರಿಸಲಾಗಿದೆ.',
        spokenBeatNote: 'ಪಾತ್ರಗಳು ಫ್ರೇಮ್ ಪ್ರವೇಶಿಸಿ ಸಂದರ್ಭಕ್ಕೆ ತಕ್ಕ ಸಹಜ ಆರಂಭಿಕ ಮಾತು ಆಡುತ್ತವೆ.',
        shotFraming: 'Wide 35mm Establishing -> Gentle Push-In',
      },
      {
        stageLabel: 'ದೃಶ್ಯ 2 — ಸನಿಹ ಮತ್ತು ಸೂಕ್ಷ್ಮ ಭಾವನೆ',
        silentVisualCue: 'ಮುಖಭಾವ ಮತ್ತು ದೇಹಭಾಷೆಯ ಮೂಲಕವೇ ಮಾತಿಲ್ಲದೆ ಭಾವನೆಗಳನ್ನು ವ್ಯಕ್ತಪಡಿಸಲಾಗುತ್ತದೆ.',
        spokenBeatNote: 'ಕ್ಯಾಮೆರಾ ಹತ್ತಿರವಾದಂತೆ ಮನದ ಭಾವನೆ ತಿಳಿಸುವ ಸಹಜ ಸಂಭಾಷಣೆ ಬರುತ್ತದೆ.',
        shotFraming: 'Medium Two-Shot / Over-the-Shoulder',
      },
      {
        stageLabel: 'ದೃಶ್ಯ 3 — ಕ್ಲೋಸ್-ಅಪ್ ತಿರುವು',
        silentVisualCue: 'ಕೈಗಳು ಅಥವಾ ಮುಖ್ಯ ವಸ್ತುವಿನ ಕ್ಲೋಸ್-ಅಪ್ ಮಾತಿಲ್ಲದೆ ಕಥೆಯನ್ನು ಮುಂದಕ್ಕೆ ಕೊಂಡೊಯ್ಯುತ್ತದೆ.',
        spokenBeatNote: 'ಒಂದು ಚಿಕ್ಕ ಮುಖ್ಯ ಸಾಲು ದೃಶ್ಯದ ತಿರುವನ್ನು ಸ್ಪಷ್ಟಪಡಿಸುತ್ತದೆ.',
        shotFraming: 'Macro Insert -> Eye-Line Reaction Close-Up',
      },
      {
        stageLabel: 'ದೃಶ್ಯ 4 — ತೀವ್ರತೆಯ ಹಂತ',
        silentVisualCue: 'ಚಲಿಸುವ ಕ್ಯಾಮೆರಾ ಕೋಣವು ಉದ್ವೇಗವನ್ನು ಶಬ್ದವಿಲ್ಲದೆ ಹೆಚ್ಚಿಸುತ್ತದೆ.',
        spokenBeatNote: 'ಕಥೆಯ ದಿಕ್ಕನ್ನು ಬದಲಿಸುವ ಪ್ರಮುಖ ಸಂಭಾಷಣೆ ನಡೆಯುತ್ತದೆ.',
        shotFraming: 'Circling 50mm / Dynamic Contrast Angle',
      },
      {
        stageLabel: 'ದೃಶ್ಯ 5 — ಕ್ಲೈಮ್ಯಾಕ್ಸ್ ಕ್ಷಣ',
        silentVisualCue: '85mm ಕ್ಲೋಸ್-ಅಪ್‌ನಲ್ಲಿ ಗರಿಷ್ಠ ಭಾವನೆ ಮಾತಿಲ್ಲದೆ ಸೆರೆಯಾಗುತ್ತದೆ.',
        spokenBeatNote: 'ದೃಶ್ಯದ ಅತ್ಯಂತ ಪ್ರಭಾವಶಾಲಿ ಕ್ಲೈಮ್ಯಾಕ್ಸ್ ಮಾತು ಹೊರಬರುತ್ತದೆ.',
        shotFraming: 'Tight 85mm Climax Close-Up',
      },
      {
        stageLabel: 'ದೃಶ್ಯ 6 — ಸ್ಮರಣೀಯ ಅಂತಿಮ ದೃಶ್ಯ',
        silentVisualCue: 'ಬೆಳಕಿನಲ್ಲಿ ಕ್ಯಾಮೆರಾ ನಿಧಾನವಾಗಿ ಹಿಂದೆ ಸರಿದು ಮೌನವಾಗಿ ಮುಕ್ತಾಯವಾಗುತ್ತದೆ.',
        spokenBeatNote: 'ಮನಸ್ಸಿನಲ್ಲಿ ಉಳಿಯುವ ಕೊನೆಯ ಮಾತಿನೊಂದಿಗೆ ದೃಶ್ಯ ಮುಗಿಯುತ್ತದೆ.',
        shotFraming: 'Slow Pull-Back Wide Closing Frame',
      },
    ],
    te: [
      {
        stageLabel: 'సీన్ 1 — ప్రారంభం మరియు తొలి చూపు',
        silentVisualCue: 'మాటలు లేకుండా వాతావరణం, పాత్రల ప్రవేశం మరియు తొలి చూపు పూర్తిగా విజువల్‌గా చూపబడుతుంది.',
        spokenBeatNote: 'పాత్రలు ఫ్రేమ్‌లోకి ప్రవేశించి సందర్భానికి తగ్గ సహజమైన తొలి మాటతో ప్రారంభిస్తాయి.',
        shotFraming: 'Wide 35mm Establishing -> Gentle Push-In',
      },
      {
        stageLabel: 'సీన్ 2 — సాన్నిహిత్యం మరియు హావభావాలు',
        silentVisualCue: 'ముఖ కవళికలు మరియు కదలికల ద్వారా మాటలు లేకుండా భావాలు వ్యక్తమవుతాయి.',
        spokenBeatNote: 'కెమెరా దగ్గరవుతుండగా మనసులోని భావాన్ని తెలిపే సహజ డైలాగ్ వస్తుంది.',
        shotFraming: 'Medium Two-Shot / Over-the-Shoulder',
      },
      {
        stageLabel: 'సీన్ 3 — క్లోజ్-అప్ మలుపు',
        silentVisualCue: 'చేతులు లేదా ముఖ్యమైన వస్తువుపై ఫోకస్ చేస్తూ మాటలు లేకుండా కథ ముందుకు సాగుతుంది.',
        spokenBeatNote: 'ఒక చిన్న పదునైన డైలాగ్ సన్నివేశంలోని మలుపును చూపుతుంది.',
        shotFraming: 'Macro Insert -> Eye-Line Reaction Close-Up',
      },
      {
        stageLabel: 'సీన్ 4 — పెరుగుతున్న ఉత్కంఠ',
        silentVisualCue: 'తిరిగే కెమెరా కోణం మాటలు లేకుండానే ఉద్రిక్తతను పెంచుతుంది.',
        spokenBeatNote: 'కథను మలుపు తిప్పే కీలకమైన సంభాషణ జరుగుతుంది.',
        shotFraming: 'Circling 50mm / Dynamic Contrast Angle',
      },
      {
        stageLabel: 'సీన్ 5 — క్లైమాక్స్ ఘట్టం',
        silentVisualCue: '85mm క్లోజ్-అప్‌లో భావోద్వేగం మాటలు లేకుండానే బలంగా కనిపిస్తుంది.',
        spokenBeatNote: 'సన్నివేశానికి ప్రాణమైన క్లైమాక్స్ డైలాగ్ స్పష్టంగా వస్తుంది.',
        shotFraming: 'Tight 85mm Climax Close-Up',
      },
      {
        stageLabel: 'సీన్ 6 — గుర్తుండిపోయే ముగింపు ఫ్రేమ్',
        silentVisualCue: 'వెలుగులో కెమెరా నెమ్మదిగా వెనక్కి తగ్గుతూ నిశ్శబ్దంగా ముగిస్తుంది.',
        spokenBeatNote: 'గుర్తుండిపోయే చివరి మాటతో సన్నివేశం అందంగా ముగుస్తుంది.',
        shotFraming: 'Slow Pull-Back Wide Closing Frame',
      },
    ],
  };

  const list = stagesByLang[lang] || stagesByLang.en;
  return list[stageIdx % list.length];
}

export function generateBreakdownLocal(
  script: string,
  preferredShotDuration: number = 8,
  characterPhotos: any[] = [],
  targetShotCount: number = 8,
  lang: AppLang = 'ml',
  dialogueMode: DialogueMode = 'dialogue',
  selectedCategoryId?: string
): { title: string; shots: GeneratedShot[] } {
  const numShots = Math.max(1, targetShotCount || 8);
  const rawScript = (script || '').trim();
  const cat: StoryCategory =
    (selectedCategoryId && selectedCategoryId !== 'all' ? getCategoryById(selectedCategoryId) : undefined) ||
    inferCategoryFromScript(rawScript);
  const grp = getCategoryGroup(cat.groupId);
  const pattern = GROUP_STORY_PATTERNS[cat.groupId] || GROUP_STORY_PATTERNS.drama;

  const charMatch = rawScript.match(/\[CHARACTERS:\s*([^\]]+)\]/i);
  const bgmMetaMatch = rawScript.match(/\[BGM STYLE:\s*([^\]]+)\]/i);
  const parsedCast = charMatch?.[1]
    ? charMatch[1]
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    : (pattern.characters[lang] || pattern.characters.en).split(',').map((s) => s.trim());

  const cleanScript = rawScript
    .replace(/\[CATEGORY_ID:[^\]]*\]/gi, '')
    .replace(/\[CHARACTERS:[^\]]*\]/gi, '')
    .replace(/\[BGM STYLE:[^\]]*\]/gi, '')
    .replace(/\[CONTINUITY:[^\]]*\]/gi, '')
    .trim();

  const storyBeats = splitStorySentences(cleanScript);
  const effectiveBeats =
    storyBeats.length > 0
      ? storyBeats
      : [cleanScript || cat.name, ...(pattern.plotBeats[lang] || pattern.plotBeats.en)];

  const effectiveMode: DialogueMode = isExplicitlySilent(cleanScript) ? 'silent' : dialogueMode;
  const hasPhotos = Array.isArray(characterPhotos) && characterPhotos.length > 0;
  const castContinuitySuffix = parsedCast.length > 0 ? ` (${parsedCast.join(', ')})` : '';
  const continuityTag = hasPhotos
    ? `Strict Character Face ID, Clothing, Prop & Lighting Continuity Locked to Reference Photo${castContinuitySuffix} · ${cat.settingCue}`
    : `Consistent Subject Face, Wardrobe, Props & Atmosphere from Shot 01${castContinuitySuffix} · ${cat.settingCue}`;

  const usedDialogues = new Set<string>();
  const singleClipThirds =
    numShots === 1 && preferredShotDuration >= 4
      ? ` [0:00–0:${Math.max(2, Math.floor(preferredShotDuration * 0.35))
          .toString()
          .padStart(2, '0')} Opening Look -> 0:${Math.max(2, Math.floor(preferredShotDuration * 0.35))
          .toString()
          .padStart(2, '0')}–0:${Math.max(4, Math.floor(preferredShotDuration * 0.72))
          .toString()
          .padStart(2, '0')} Core Beat -> 0:${Math.max(4, Math.floor(preferredShotDuration * 0.72))
          .toString()
          .padStart(2, '0')}–${formatClock(preferredShotDuration)} Closing Hold]`
      : '';

  const shots: GeneratedShot[] = Array.from({ length: numShots }, (_, idx) => {
    const shotNum = idx + 1;
    const padded = shotNum.toString().padStart(2, '0');
    const startSec = idx * preferredShotDuration;
    const endSec = (idx + 1) * preferredShotDuration;
    const timeRange = `${formatClock(startSec)} – ${formatClock(endSec)}`;

    const stageMeta = getVisualBeatStageMeta(lang, idx, numShots);
    const beatIndex = Math.min(effectiveBeats.length - 1, Math.floor((idx * effectiveBeats.length) / numShots));
    const rawBeat = effectiveBeats[beatIndex] || cleanScript;
    const beatText = rawBeat.replace(/[.।!?]+$/g, '').trim() || rawBeat;

    let dialogueLine = '';
    const isSilentBeatInMix = effectiveMode === 'dynamic' && idx % 3 === 2;
    if (effectiveMode === 'dialogue' || (effectiveMode === 'dynamic' && !isSilentBeatInMix)) {
      const extracted = extractDialogueIfPresent(beatText);
      if (extracted && !usedDialogues.has(extracted.toLowerCase())) {
        dialogueLine = extracted;
        usedDialogues.add(extracted.toLowerCase());
      } else {
        dialogueLine = getCategoryDialogueLine(cat, lang, idx, usedDialogues);
      }
    }

    const bgmCue = bgmMetaMatch?.[1]
      ? `${bgmMetaMatch[1]} | ${cat.bgmVibe}`
      : `${cat.bgmVibe} (${cat.pacing})`;

    const actionText = `${stageMeta.stageLabel}: ${beatText}. ${
      dialogueLine ? stageMeta.spokenBeatNote : stageMeta.silentVisualCue
    }${singleClipThirds}`;

    const activeCharacters =
      parsedCast.length > 0
        ? idx === 0
          ? parsedCast.slice(0, Math.min(2, parsedCast.length))
          : parsedCast.slice(0, Math.min(parsedCast.length, 2 + (idx % 2)))
        : ['Lead Characters'];

    const cameraLine = `${stageMeta.shotFraming} · ${cat.cameraFocus}`;
    const lightingLine = `${cat.visualStyle} · ${cat.tone}`;

    const imagePrompt = `[PHOTO KEYFRAME PROMPT — SHOT ${padded} (${timeRange})]: Photorealistic 35mm cinematic film still in "${cat.name}" (${grp.labels.en}) style. Situation: ${beatText}. Framing: ${cameraLine}. Setting & Lighting: ${cat.settingCue}; ${cat.visualStyle}. Characters: ${activeCharacters.join(', ')}. Continuity Lock: ${continuityTag}. 8k crisp lens detail, zero text overlays.`;

    const audioInstruction = dialogueLine
      ? `Spoken Dialogue (${lang.toUpperCase()} — ${cat.dialogueStyle}): "${dialogueLine}". Background Music & Foley: ${bgmCue}`
      : `NO DIALOGUE / PURE VISUAL SCENE: Zero spoken words — tell story purely through micro-expressions, blocking, and natural ambient SFX. Background Music & Foley: ${bgmCue}`;

    const videoPrompt = `[VIDEO MOTION PROMPT — SHOT ${padded} (${timeRange} · ${preferredShotDuration}s)]: Continuous 24fps motion${
      shotNum > 1 ? ` seamlessly continuing from Shot ${(shotNum - 1).toString().padStart(2, '0')}` : ''
    }. Genre/Category: ${cat.name} (${cat.tone}). Action & Pacing: ${beatText} — ${cat.pacing}. Camera Direction: ${cameraLine}. Visual Look: ${cat.visualStyle}. Continuity Lock: ${continuityTag}. ${audioInstruction}. Clip Length: ${preferredShotDuration}s.`;

    return {
      shotNumber: shotNum,
      durationSeconds: preferredShotDuration,
      timing: `Shot ${padded} · ${timeRange} (${preferredShotDuration}s)`,
      timeRange,
      cameraAngle: cameraLine,
      lightingCue: lightingLine,
      categoryTag: `${grp.icon} ${cat.name}`,
      action: actionText,
      characters: activeCharacters,
      bgm: bgmCue,
      continuity: continuityTag,
      malayalamDialogue: dialogueLine,
      dialogueEnglish: dialogueLine,
      imagePrompt,
      videoPrompt,
      visualPrompt: imagePrompt,
    };
  });

  return {
    title: `${cat.name} — Scene-by-Scene Script`,
    shots,
  };
}

export function expandShotsToTargetCount(
  coreShots: GeneratedShot[],
  targetShotCount: number,
  preferredShotDuration: number,
  allowDialogue: boolean,
  lang: AppLang = 'ml',
  dialogueMode: DialogueMode = 'dialogue',
  categoryId?: string
): GeneratedShot[] {
  if (!coreShots || coreShots.length === 0) return [];
  const total = Math.max(1, targetShotCount);
  const cat = (categoryId && categoryId !== 'all' ? getCategoryById(categoryId) : undefined) || STORY_CATEGORIES[0];
  const grp = getCategoryGroup(cat.groupId);
  const effectiveMode: DialogueMode = !allowDialogue ? 'silent' : dialogueMode;
  const seenDialogues = new Set<string>();

  if (coreShots.length >= total) {
    return coreShots.slice(0, total).map((shot, idx) => {
      const shotNum = idx + 1;
      const padded = shotNum.toString().padStart(2, '0');
      const timeRange = `${formatClock(idx * preferredShotDuration)} – ${formatClock(
        (idx + 1) * preferredShotDuration
      )}`;

      let cleanedDialogue = '';
      if (effectiveMode !== 'silent') {
        const raw = (shot.malayalamDialogue || '').trim();
        const isVisualSilentBeat = effectiveMode === 'dynamic' && raw.length === 0;
        if (!isVisualSilentBeat && raw && !seenDialogues.has(raw.toLowerCase())) {
          cleanedDialogue = raw;
          seenDialogues.add(raw.toLowerCase());
        } else if (effectiveMode === 'dialogue' && (!raw || seenDialogues.has(raw.toLowerCase()))) {
          cleanedDialogue = getCategoryDialogueLine(cat, lang, idx, seenDialogues);
        }
      }

      const bgmCue = shot.bgm || `${cat.bgmVibe} (${cat.pacing})`;
      const continuityLock =
        shot.continuity ||
        `Consistent face, wardrobe, props & environment continuous from Shot ${Math.max(1, idx).toString().padStart(2, '0')}`;

      const sanitizedVideo =
        cleanedDialogue.length === 0 && shot.videoPrompt
          ? shot.videoPrompt
              .replace(/Spoken Dialogue\s*\([^)]*\)\s*:\s*["“][^"”]*["”]\.?/gi, 'NO DIALOGUE / PURE VISUAL SCENE: Zero spoken words; ambient foley only.')
              .replace(/^\[VIDEO MOTION PROMPT[^\]]*\]:/i, `[VIDEO MOTION PROMPT — SHOT ${padded} (${timeRange})]:`)
          : shot.videoPrompt
          ? shot.videoPrompt.replace(/^\[VIDEO MOTION PROMPT[^\]]*\]:/i, `[VIDEO MOTION PROMPT — SHOT ${padded} (${timeRange})]:`)
          : undefined;

      const sanitizedImage = shot.imagePrompt
        ? shot.imagePrompt.replace(/^\[(?:PHOTO KEYFRAME PROMPT|IMAGE GENERATION PROMPT)[^\]]*\]:/i, `[PHOTO KEYFRAME PROMPT — SHOT ${padded} (${timeRange})]:`)
        : undefined;

      return {
        ...shot,
        shotNumber: shotNum,
        durationSeconds: preferredShotDuration,
        timing: `Shot ${padded} · ${timeRange} (${preferredShotDuration}s)`,
        timeRange,
        cameraAngle: shot.cameraAngle || cat.cameraFocus,
        lightingCue: shot.lightingCue || cat.visualStyle,
        categoryTag: shot.categoryTag || `${grp.icon} ${cat.name}`,
        bgm: bgmCue,
        continuity: continuityLock,
        malayalamDialogue: cleanedDialogue,
        dialogueEnglish: cleanedDialogue ? (shot.dialogueEnglish || cleanedDialogue) : '',
        imagePrompt: sanitizedImage || shot.imagePrompt,
        videoPrompt: sanitizedVideo || shot.videoPrompt,
      };
    });
  }

  return Array.from({ length: total }, (_, idx) => {
    const shotNum = idx + 1;
    const padded = shotNum.toString().padStart(2, '0');
    const timeRange = `${formatClock(idx * preferredShotDuration)} – ${formatClock(
      (idx + 1) * preferredShotDuration
    )}`;
    const coreIdx = Math.min(coreShots.length - 1, Math.floor((idx * coreShots.length) / total));
    const base = coreShots[coreIdx];
    const stageMeta = getVisualBeatStageMeta(lang, idx, total);

    const isPrimaryBeatClip =
      idx === 0 || Math.floor(((idx - 1) * coreShots.length) / total) !== coreIdx;

    let rawDialogue = '';
    if (effectiveMode !== 'silent') {
      const candidate = isPrimaryBeatClip ? (base.malayalamDialogue || '').trim() : '';
      if (candidate && !seenDialogues.has(candidate.toLowerCase())) {
        rawDialogue = candidate;
        seenDialogues.add(candidate.toLowerCase());
      } else if (effectiveMode === 'dialogue') {
        rawDialogue = getCategoryDialogueLine(cat, lang, idx, seenDialogues);
      }
    }

    const bgmCue = base.bgm || `${cat.bgmVibe} (${cat.pacing})`;
    const continuityLock =
      base.continuity ||
      `Consistent subject face, outfit, props & atmosphere continuous from Shot ${Math.max(1, idx).toString().padStart(2, '0')}`;

    const cleanBaseImage = (base.imagePrompt || '')
      .replace(/^\[(?:IMAGE GENERATION PROMPT|PHOTO KEYFRAME PROMPT)[^\]]*\]:\s*/i, '')
      .trim();
    const cleanBaseVideo = (
      effectiveMode === 'silent' || !rawDialogue
        ? (base.videoPrompt || '').replace(/Spoken Dialogue[^.]*\.?/gi, 'NO DIALOGUE / PURE VISUAL: Zero spoken words.')
        : base.videoPrompt || ''
    )
      .replace(/^\[(?:VIDEO GENERATION PROMPT|VIDEO MOTION PROMPT)[^\]]*\]:\s*/i, '')
      .trim();

    const stepLabel = isPrimaryBeatClip ? base.action : `${base.action} (${stageMeta.stageLabel})`;

    const imagePrompt =
      isPrimaryBeatClip && cleanBaseImage
        ? `[PHOTO KEYFRAME PROMPT — SHOT ${padded} (${timeRange})]: ${cleanBaseImage}`
        : `[PHOTO KEYFRAME PROMPT — SHOT ${padded} (${timeRange})]: Photorealistic 35mm film still (${cat.name}). Framing: ${stageMeta.shotFraming} · ${cat.cameraFocus}. Beat: ${base.action}. Look: ${cat.visualStyle}. Continuity Lock: ${continuityLock}.`;

    const videoPrompt =
      isPrimaryBeatClip && cleanBaseVideo
        ? `[VIDEO MOTION PROMPT — SHOT ${padded} (${timeRange})]: ${cleanBaseVideo}`
        : `[VIDEO MOTION PROMPT — SHOT ${padded} (${timeRange})]: Smooth 24fps sequence continuing Shot ${(shotNum - 1)
            .toString()
            .padStart(2, '0')}. Camera: ${stageMeta.shotFraming} · ${cat.cameraFocus}. Beat: ${base.action}. ${
            rawDialogue
              ? `Spoken Dialogue (${lang.toUpperCase()}): "${rawDialogue}".`
              : 'NO DIALOGUE / PURE VISUAL SCENE: Zero spoken words, natural foley only.'
          } BGM: ${bgmCue}. Duration: ${preferredShotDuration}s.`;

    return {
      shotNumber: shotNum,
      durationSeconds: preferredShotDuration,
      timing: `Shot ${padded} · ${timeRange} (${preferredShotDuration}s)`,
      timeRange,
      cameraAngle: base.cameraAngle || `${stageMeta.shotFraming} · ${cat.cameraFocus}`,
      lightingCue: base.lightingCue || cat.visualStyle,
      categoryTag: base.categoryTag || `${grp.icon} ${cat.name}`,
      action: stepLabel,
      characters: base.characters || [],
      bgm: bgmCue,
      continuity: continuityLock,
      malayalamDialogue: rawDialogue,
      dialogueEnglish: rawDialogue ? (base.dialogueEnglish || rawDialogue) : '',
      imagePrompt,
      videoPrompt,
      visualPrompt: imagePrompt,
    };
  });
}
