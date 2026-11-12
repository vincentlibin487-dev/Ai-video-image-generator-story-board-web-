import type { AppLang } from './i18n';

export type GenreKey = 'thriller' | 'drama' | 'action' | 'folk' | 'scifi' | 'comedy' | 'ad';

export interface StoryAngle {
  id: string;
  catKey?: GenreKey;
  genre: string;
  title: string;
  mood: string;
  bgm?: string;
  continuity?: string;
  characters?: string;
  storySummary?: string;
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

/**
 * Checks whether a story or beat explicitly asks for or contains spoken dialogue.
 * Purely visual/action descriptions return false so no unwanted dialogue is invented.
 */
export function hasExplicitDialogue(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();

  // Quoted speech anywhere in the text
  if (/["“”'‘’«»]/.test(trimmed)) return true;

  // Script dialogue format e.g. "Character: Hello" (ignore URLs or timestamps like 10:30)
  if (/(^|\n)\s*[^\d:\n]{2,24}\s*:\s*\S+/m.test(trimmed)) return true;

  // Explicit speech/dialogue/conversation verbs & keywords across supported languages
  const dialogueKeywords =
    /\b(dialogue|dialogues|says|said|asks|asked|speaks|spoke|talks|talking|conversation|whispers|shouts|replies|monologue|voiceover|narrates)\b|(ഡയലോഗ്|സംഭാഷണം|പറയുന്നു|പറഞ്ഞു|ചോദിക്കുന്നു|ചോദിച്ചു|സംസാരിക്കുന്നു|സംസാരിച്ചു|വിളിക്കുന്നു|മറുപടി|ശബ്ദത്തിൽ പറയുന്നു)|(संवाद|डायलॉग|कहता|कहती|कहा|पूछता|पूछा|बोलता|बोली|बातचीत)|(வசனம்|டயலாக்|பேசுகிறார்|பேசினார்|கேட்கிறார்|கேட்டார்|சொல்கிறார்|சொன்னார்|உரையாடல்)|(ಸಂಭಾಷಣೆ|ಡೈಲಾಗ್|ಹೇಳುತ್ತಾ|ಹೇಳಿದ|ಕೇಳುತ್ತಾ|ಮಾತನಾಡು|ಮಾತುಕತೆ)|(సంభాషణ|డైలాగ్|చెబుత|చెప్పా|అడుగుత|అడిగా|మాట్లాడుత|మాటలు)/i;

  return dialogueKeywords.test(trimmed);
}

/**
 * Extracts quoted dialogue text if present in a line/beat, or returns empty string.
 */
export function extractDialogueIfPresent(beatText: string): string {
  if (!beatText) return '';
  const quoteMatch = beatText.match(/["“]([^"”]{2,180})["”]/);
  if (quoteMatch?.[1]) return quoteMatch[1].trim();

  const singleQuoteMatch = beatText.match(/['‘]([^'’]{2,180})['’]/);
  if (singleQuoteMatch?.[1]) return singleQuoteMatch[1].trim();

  const colonMatch = beatText.match(/(?:^|\n)\s*[^\d:\n]{2,24}\s*:\s*([^\n]{2,180})/);
  if (colonMatch?.[1]) return colonMatch[1].trim();

  return '';
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

  // If single long sentence, break along commas or natural conjunctions
  const commaParts = normalized
    .split(/,\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  return commaParts.length > 0 ? commaParts : [normalized];
}

function deriveSubjectLabel(premise: string, lang: AppLang): string {
  // Try picking first non-punctuation word that looks like a subject or fallback neutrally
  const clean = premise.replace(/["“”'‘’.,!?()]/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const firstWord = words[0] || '';

  const fallbackByLang: Record<AppLang, string> = {
    ml: firstWord ? `${firstWord} ഉൾപ്പെടുന്ന പ്രധാന കഥാപാത്രങ്ങൾ` : 'കഥയിലെ പ്രധാന കഥാപാത്രങ്ങൾ',
    en: firstWord ? `Main characters connected to "${firstWord}"` : 'Central characters from your story',
    hi: firstWord ? `"${firstWord}" से जुड़े मुख्य पात्र` : 'कहानी के मुख्य पात्र',
    ta: firstWord ? `"${firstWord}" தொடர்புடைய முக்கிய கதாபாத்திரங்கள்` : 'கதையின் முக்கிய கதாபாத்திரங்கள்',
    kn: firstWord ? `"${firstWord}" ಗೆ ಸಂಬಂಧಿಸಿದ ಮುಖ್ಯ ಪಾತ್ರಗಳು` : 'ಕಥೆಯ ಮುಖ್ಯ ಪಾತ್ರಗಳು',
    te: firstWord ? `"${firstWord}" కి సంబంధించిన ప్రధాన పాత్రలు` : 'కథలోని ప్రధాన పాత్రలు',
  };

  return fallbackByLang[lang] || fallbackByLang.ml;
}

interface GenreTemplatePack {
  categories: { catKey: GenreKey; label: string; styleTag: string }[];
  lenses: {
    partLabel: string;
    lensTitle: (core: string) => string;
    mood: string;
    twistBuilder: (parts: { lead: string; mid: string; end: string }, genreLabel: string, idx: number) => {
      beginning: string;
      middle: string;
      ending: string;
      summary: string;
    };
  }[];
  shotCameraFocus: string[];
  silentAudioNote: string;
  variationLabel: (genre: string, num: number) => string;
}

const DYNAMIC_STORY_PACKS: Record<AppLang, GenreTemplatePack> = {
  ml: {
    categories: [
      { catKey: 'thriller', label: '🕵️ മിസ്റ്ററി & ത്രില്ലർ', styleTag: 'ത്രില്ലർ' },
      { catKey: 'drama', label: '🎭 ഇമോഷണൽ ഡ്രാമ', styleTag: 'ഡ്രാമ' },
      { catKey: 'action', label: '💥 ആക്ഷൻ & മാസ്', styleTag: 'ആക്ഷൻ' },
      { catKey: 'folk', label: '🌿 ഫോക്ക് & നിഗൂഢത', styleTag: 'ഫോക്ക്' },
      { catKey: 'scifi', label: '⏳ സയൻസ് ഫിക്ഷൻ', styleTag: 'സയൻസ് ഫിക്ഷൻ' },
      { catKey: 'comedy', label: '😂 കോമഡി & ഫൺ', styleTag: 'കോമഡി' },
      { catKey: 'ad', label: '📢 കൊമേഴ്സ്യൽ / പ്രൊമോ', styleTag: 'കൊമേഴ്സ്യൽ' },
    ],
    lenses: [
      {
        partLabel: 'മോഡൽ 1',
        lensTitle: (c) => `${c} — നേരിട്ടുള്ള സിനിമാറ്റിക് അവതരണം`,
        mood: 'Naturalistic • Observational • True to Premise',
        twistBuilder: (p, _g, _i) => ({
          beginning: p.lead,
          middle: `${p.mid} എന്ന ഘട്ടത്തിൽ അന്തരീക്ഷം കൂടുതൽ ഗൗരവവും ആകാംക്ഷയും നിറഞ്ഞതാകുന്നു.`,
          ending: `${p.end} എന്നതിലൂടെ തുടക്കത്തിലെ ആശയം സ്വാഭാവികമായി പൂർണ്ണതയിലെത്തുന്നു.`,
          summary: `${p.lead}. തുടർന്ന് ദൃശ്യങ്ങൾ സാവധാനം കഥയുടെ ഹൃദയഭാഗത്തേക്ക് കടക്കുന്നു: ${p.mid}. ചെറിയ ചലനങ്ങളും പശ്ചാത്തല ശബ്ദങ്ങളും രംഗത്തിന്റെ തീവ്രത വർദ്ധിപ്പിക്കുന്നു. അവസാന നിമിഷങ്ങളിൽ ${p.end} എന്ന സന്ദർഭത്തിലൂടെ ഈ കഥ സ്വാഭാവികമായും ഹൃദ്യമായും അവസാനിക്കുന്നു.`,
        }),
      },
      {
        partLabel: 'മോഡൽ 2',
        lensTitle: (c) => `${c} — അപ്രതീക്ഷിത വഴിത്തിരിവ്`,
        mood: 'Suspenseful Twist • Tension Build',
        twistBuilder: (p, g, i) => ({
          beginning: `${p.lead} എന്നിടത്ത് നിഗൂഢമായ ഒരു സൂചനയോടുകൂടി കഥ തുടങ്ങുന്നു.`,
          middle: `${p.mid} എന്നതിനിടയിൽ ഇതുവരെ മറഞ്ഞിരുന്ന ഒരു പുതിയ വശം വെളിപ്പെടുന്നു (${g} ഭാവം ${i + 1}).`,
          ending: `${p.end} എന്ന സംഭവം കഥയ്ക്ക് തികച്ചും വ്യത്യസ്തവും ഞെട്ടിക്കുന്നതുമായ അന്ത്യം നൽകുന്നു.`,
          summary: `${p.lead}. എന്നാൽ കാണുന്ന കാഴ്ചയ്ക്കപ്പുറം മറ്റൊരു രഹസ്യം ഒളിഞ്ഞിരിക്കുന്നു. ${p.mid} എന്ന ഘട്ടമെത്തുമ്പോൾ അപ്രതീക്ഷിതമായൊരു മാറ്റം സംഭവിക്കുന്നു. കഥയിലെ ഓരോ വിശദാംശവും പ്രേക്ഷകരിൽ ആകാംക്ഷ നിറയ്ക്കുകയും ഒടുവിൽ ${p.end} എന്നതിലൂടെ വലിയൊരു വഴിത്തിരിവിൽ എത്തുകയും ചെയ്യുന്നു.`,
        }),
      },
      {
        partLabel: 'മോഡൽ 3',
        lensTitle: (c) => `${c} — രാത്രിയുടെയും നിഴലുകളുടെയും പശ്ചാത്തലം`,
        mood: 'Atmospheric Night • Moody Lighting',
        twistBuilder: (p) => ({
          beginning: `രാത്രിയുടെ മങ്ങിയ വെളിച്ചത്തിലും ശാന്തതയിലും ${p.lead}.`,
          middle: `ഇരുട്ടും നിഴലുകളും നിറഞ്ഞ ചുറ്റുപാടിലൂടെ ${p.mid} എന്ന ഭാഗം വികസിക്കുന്നു.`,
          ending: `പുലർച്ചെയോട് അടുക്കുന്ന വെളിച്ചത്തിൽ ${p.end} എന്ന ദൃശ്യത്തോടെ സമാപനം.`,
          summary: `മങ്ങിയ വെളിച്ചവും നിശബ്ദതയും നിറഞ്ഞ പശ്ചാത്തലത്തിൽ ${p.lead}. കാറ്റിന്റെയോ ചുറ്റുപാടുകളുടെയോ ചെറിയ ശബ്ദങ്ങൾക്കിടയിലൂടെ ${p.mid} എന്ന രംഗം വികസിക്കുന്നു. ദൃശ്യഭംഗിക്കും വൈകാരിക ഭാവങ്ങൾക്കും പ്രാധാന്യം നൽകിക്കൊണ്ട് ${p.end} എന്ന സന്ദർഭത്തിൽ കഥ ശക്തമായി അവസാനിക്കുന്നു.`,
        }),
      },
      {
        partLabel: 'മോഡൽ 4',
        lensTitle: (c) => `${c} — വേഗതയേറിയ ആക്ഷൻ ശൈലി`,
        mood: 'Dynamic Pacing • High Energy Cuts',
        twistBuilder: (p) => ({
          beginning: `വേഗതയുള്ള ക്യാമറാ ചലനങ്ങളോടെ ${p.lead}.`,
          middle: `തുടർച്ചയായ കട്ടുകളിലും ക്ലോസ്-അപ്പ് ഷോട്ടുകളിലും ${p.mid} തീവ്രമായി അവതരിപ്പിക്കുന്നു.`,
          ending: `ഊർജ്ജസ്വലമായ ക്ലൈമാക്സോടെ ${p.end} പൂർത്തിയാകുന്നു.`,
          summary: `ആദ്യ ഫ്രെയിം മുതൽ ഉദ്വേഗം നിറച്ച് ${p.lead}. ചടുലമായ ചലനങ്ങളിലൂടെയും കൃത്യമായ ടൈമിംഗിലൂടെയും ${p.mid} എന്ന ഘട്ടം മുന്നോട്ട് നീങ്ങുന്നു. സമയത്തോടുള്ള പോരാട്ടം പോലെ വേഗത കൈവരിക്കുന്ന ഈ ശൈലി ${p.end} എന്ന ആവേശകരമായ നിമിഷത്തിൽ സമാപിക്കുന്നു.`,
        }),
      },
      {
        partLabel: 'മോഡൽ 5',
        lensTitle: (c) => `${c} — വൈകാരിക ക്ലോസ്-അപ്പ് ആവിഷ്കാരം`,
        mood: 'Intimate • Heartfelt & Poetic',
        twistBuilder: (p) => ({
          beginning: `വൈകാരികമായ ആഴത്തോടെയും സൂക്ഷ്മ ഭാവങ്ങളോടെയും ${p.lead}.`,
          middle: `കണ്ണുകളിലും ചലനങ്ങളിലുമുള്ള ചെറിയ മാറ്റങ്ങളിലൂടെ ${p.mid} ഹൃദയസ്പർശിയായി മാറുന്നു.`,
          ending: `മനസ്സിൽ തങ്ങിനിൽക്കുന്ന ശാന്തമായൊരു അന്ത്യമായി ${p.end}.`,
          summary: `സൂക്ഷ്മമായ വികാരങ്ങൾക്കും മുഖഭാവങ്ങൾക്കും മുൻഗണന നൽകിക്കൊണ്ട് ${p.lead}. പഴയ ഓർമ്മകളെയും ഉള്ളിലെ ചിന്തകളെയും തൊട്ടുണർത്തി ${p.mid} എന്ന സന്ദർഭം രൂപപ്പെടുന്നു. പ്രേക്ഷകരുടെ മനസ്സിനെ സ്പർശിക്കുന്ന രീതിയിൽ ${p.end} എന്നതിലൂടെ കഥ പര്യവസാനിക്കുന്നു.`,
        }),
      },
      {
        partLabel: 'മോഡൽ 6',
        lensTitle: (c) => `${c} — സുവർണ്ണ പ്രഭാതത്തിലെ ദൃശ്യവിരുന്ന്`,
        mood: 'Golden Hour • Warm & Visually Rich',
        twistBuilder: (p) => ({
          beginning: `ഗോൾഡൻ അവർ വെളിച്ചത്തിൽ മനോഹരമായി ${p.lead}.`,
          middle: `പ്രകൃതിയുടെ വെളിച്ചവും നിറങ്ങളും ചേർന്ന് ${p.mid} എന്ന ഭാഗം ദൃശ്യവൽക്കരിക്കുന്നു.`,
          ending: `പ്രത്യാശയുടെ പുതിയ വെളിച്ചത്തിൽ ${p.end}.`,
          summary: `തിളങ്ങുന്ന പ്രഭാത വെളിച്ചത്തിന്റെയോ സായാഹ്ന ശോഭയുടെയോ പശ്ചാത്തലത്തിൽ ${p.lead}. 35mm ഫിലിം ഭംഗിയിൽ ${p.mid} എന്ന ഭാഗം ഓരോ ഷോട്ടിലും വ്യക്തമായി തെളിയുന്നു. നിറങ്ങളുടെയും വെളിച്ചത്തിന്റെയും മനോഹരമായ സംയോജനത്തോടെ ${p.end} എന്ന ശുഭകരമായ ഫ്രെയിമിൽ കഥ അവസാനിക്കുന്നു.`,
        }),
      },
      {
        partLabel: 'മോഡൽ 7',
        lensTitle: (c) => `${c} — കൗതുകവും തമാശയും കലർന്ന ശൈലി`,
        mood: 'Playful • Witty & Lighthearted',
        twistBuilder: (p) => ({
          beginning: `രസകരമായൊരു കാഴ്ചപ്പാടിലൂടെ ${p.lead}.`,
          middle: `ചെറിയ അബദ്ധങ്ങളും കൗതുകമുണർത്തുന്ന സാഹചര്യങ്ങളും ചേർന്ന് ${p.mid} രസകരമാകുന്നു.`,
          ending: `ചെറുപുഞ്ചിരി സമ്മാനിച്ചുകൊണ്ട് ${p.end}.`,
          summary: `ഗൗരവമില്ലാത്തതും രസകരവുമായ രീതിയിൽ ${p.lead}. പ്രതീക്ഷിക്കാത്ത ചെറിയ തമാശകളും സ്വാഭാവികമായ പെരുമാറ്റങ്ങളും കാരണം ${p.mid} എന്ന ഭാഗം കൂടുതൽ ആസ്വാദ്യകരമാകുന്നു. പ്രേക്ഷകരിൽ ചിരിയും കൗതുകവും ഉണർത്തി ${p.end} എന്ന രസകരമായ ക്ലൈമാക്സിൽ കഥ അവസാനിക്കുന്നു.`,
        }),
      },
      {
        partLabel: 'മോഡൽ 8',
        lensTitle: (c) => `${c} — അണിയറ രഹസ്യങ്ങളുടെ തിരനോട്ടം`,
        mood: 'Investigative • Clues & Details',
        twistBuilder: (p) => ({
          beginning: `ചെറിയൊരു തെളിവിലോ നിരീക്ഷണത്തിലോ ഊന്നി ${p.lead}.`,
          middle: `ഓരോ സൂചനയും കൂട്ടിച്ചേർക്കുമ്പോൾ ${p.mid} എന്നതിന്റെ യഥാർത്ഥ അർത്ഥം തെളിയുന്നു.`,
          ending: `എല്ലാ സംശയങ്ങളും നീങ്ങി ${p.end} എന്ന സത്യം വെളിപ്പെടുന്നു.`,
          summary: `ഒരു ചെറിയ വിശദാംശത്തിലേക്ക് ക്യാമറ സൂം ചെയ്തുകൊണ്ട് ${p.lead}. ഒളിഞ്ഞിരിക്കുന്ന കാരണങ്ങൾ തേടിയുള്ള യാത്രയിൽ ${p.mid} നിർണ്ണായകമായൊരു വഴിത്തിരിവാകുന്നു. യുക്തിപരമായി എല്ലാ ചോദ്യങ്ങൾക്കും ഉത്തരം നൽകിക്കൊണ്ട് ${p.end} എന്നതിലൂടെ കഥ പൂർണ്ണമാകുന്നു.`,
        }),
      },
      {
        partLabel: 'മോഡൽ 9',
        lensTitle: (c) => `${c} — ശബ്ദരഹിത ദൃശ്യഭാഷ (Silent Visual Montage)`,
        mood: 'Pure Visual • Sound Design Focus',
        twistBuilder: (p) => ({
          beginning: `യാതൊരു സംഭാഷണവുമില്ലാതെ ശുദ്ധമായ ദൃശ്യങ്ങളിലൂടെ ${p.lead}.`,
          middle: `കാഴ്ചയും ചുറ്റുപാടിലെ സ്വാഭാവിക ശബ്ദങ്ങളും മാത്രം ചേർന്ന് ${p.mid} വിവരിക്കുന്നു.`,
          ending: `വാക്കുകൾക്കതീതമായൊരു ദൃശ്യശിൽപ്പമായി ${p.end}.`,
          summary: `സംഭാഷണങ്ങളുടെ സഹായമില്ലാതെ പൂർണ്ണമായും ക്യാമറയുടെ ഭാഷയിലൂടെ ${p.lead}. ചലനങ്ങളും നിഴലുകളും വസ്തുക്കളുടെ ക്ലോസ്-അപ്പുകളും ഉപയോഗിച്ച് ${p.mid} എന്ന ഭാഗം മനോഹരമായി അവതരിപ്പിക്കുന്നു. പ്രേക്ഷകന് സ്വയം അർത്ഥം കണ്ടെത്താവുന്ന രീതിയിൽ ${p.end} എന്ന ദൃശ്യത്തോടെ സമാപിക്കുന്നു.`,
        }),
      },
      {
        partLabel: 'മോഡൽ 10',
        lensTitle: (c) => `${c} — ഇതിഹാസ തുല്യമായ ക്ലൈമാക്സ് പതിപ്പ്`,
        mood: 'Grand Scale • Epic Finale',
        twistBuilder: (p) => ({
          beginning: `വിശാലമായ വൈഡ് ഷോട്ടിലൂടെ ഗംഭീരമായി ${p.lead}.`,
          middle: `കഥയിലെ ഓരോ ഘടകവും വളർന്ന് ${p.mid} എന്ന ഉച്ചസ്ഥായിയിൽ എത്തുന്നു.`,
          ending: `വലിയൊരു സിനിമാറ്റിക് ക്യാൻവാസിൽ ${p.end} പൂർണ്ണമാകുന്നു.`,
          summary: `വലിയ സ്ക്രീൻ അനുഭവം സമ്മാനിക്കുന്ന രീതിയിൽ ${p.lead}. വികാരങ്ങളും സംഘർഷവും പടിപടിയായി ഉയർന്ന് ${p.mid} എന്ന പ്രധാന മുഹൂർത്തത്തിലേക്ക് എത്തുന്നു. അവിസ്മരണീയമായ ദൃശ്യഭംഗിയോടെ ${p.end} എന്ന ശക്തമായ ഫ്രെയിമിൽ ഈ പതിപ്പ് അവസാനിക്കുന്നു.`,
        }),
      },
    ],
    shotCameraFocus: [
      'Wide Establishing Shot capturing the entire setting and atmosphere from your story',
      'Medium Tracking Shot following the main movement smoothly',
      'Detailed Close-Up Shot highlighting subtle expressions, hands, or key objects in frame',
      'Over-the-Shoulder Cinematic Angle showing spatial perspective and depth',
      'Low-Angle Dynamic Shot enhancing visual presence and dramatic scale',
      'Side-Profile Steadicam Motion moving parallel with the ongoing action',
      'Tight Macro/Insert Shot focusing on crucial visual texture and environment details',
      'Elevated Wide Closing Frame resolving the beat cleanly',
    ],
    silentAudioNote: 'NO DIALOGUE — Pure visual action with realistic ambient environment audio and foley only.',
    variationLabel: (genre, num) => `${genre} - മോഡൽ ${num}`,
  },
  en: {
    categories: [
      { catKey: 'thriller', label: '🕵️ Mystery & Thriller', styleTag: 'Thriller' },
      { catKey: 'drama', label: '🎭 Emotional Drama', styleTag: 'Drama' },
      { catKey: 'action', label: '💥 Action & Energy', styleTag: 'Action' },
      { catKey: 'folk', label: '🌿 Folk & Eerie Mystery', styleTag: 'Folk' },
      { catKey: 'scifi', label: '⏳ Sci-Fi Perspective', styleTag: 'Sci-Fi' },
      { catKey: 'comedy', label: '😂 Comedy & Playful', styleTag: 'Comedy' },
      { catKey: 'ad', label: '📢 Commercial / Promo', styleTag: 'Commercial' },
    ],
    lenses: [
      {
        partLabel: 'Style 1',
        lensTitle: (c) => `${c} — Faithful Realistic Adaptation`,
        mood: 'Grounded • Authentic Visual Storytelling',
        twistBuilder: (p) => ({
          beginning: p.lead,
          middle: `The visual narrative deepens smoothly around: ${p.mid}.`,
          ending: `Concludes organically with: ${p.end}.`,
          summary: `${p.lead}. Following your exact premise faithfully, the scene transitions into: ${p.mid}. Subtle framing, natural lighting, and environmental textures carry the emotion cleanly to the closing moment where ${p.end}.`,
        }),
      },
      {
        partLabel: 'Style 2',
        lensTitle: (c) => `${c} — Unexpected Turning Point`,
        mood: 'Suspense • Hidden Twist',
        twistBuilder: (p, g, i) => ({
          beginning: `${p.lead}, framed with an intriguing quiet clue.`,
          middle: `As ${p.mid} unfolds, an unexpected hidden layer emerges (${g} angle ${i + 1}).`,
          ending: `Reaches a surprising turn right at: ${p.end}.`,
          summary: `${p.lead}. Beneath the surface calm, subtle details hint at something unseen. During ${p.mid}, tension shifts sharply toward a revealing moment, leading directly into an impactful twist at ${p.end}.`,
        }),
      },
      {
        partLabel: 'Style 3',
        lensTitle: (c) => `${c} — Nocturnal Shadows & Mood`,
        mood: 'Low-Key Lighting • Atmospheric Night',
        twistBuilder: (p) => ({
          beginning: `Under dim evening or night light, ${p.lead}.`,
          middle: `Shadows and rich reflections accentuate ${p.mid}.`,
          ending: `Quietly resolves as dawn light meets ${p.end}.`,
          summary: `Bathed in atmospheric shadows and warm practical highlights, ${p.lead}. Every frame of ${p.mid} emphasizes texture, silence, and visual mood before arriving at ${p.end}.`,
        }),
      },
      {
        partLabel: 'Style 4',
        lensTitle: (c) => `${c} — Fast Kinetic Cuts`,
        mood: 'Energetic • Dynamic Camera Motion',
        twistBuilder: (p) => ({
          beginning: `Dynamic kinetic framing launches right into ${p.lead}.`,
          middle: `Tight motion cuts heighten momentum through ${p.mid}.`,
          ending: `Snappy payoff built around ${p.end}.`,
          summary: `Designed with brisk movement and kinetic rhythm, ${p.lead}. Sharp transitions drive ${p.mid} forward seamlessly until a crisp climax lands on ${p.end}.`,
        }),
      },
      {
        partLabel: 'Style 5',
        lensTitle: (c) => `${c} — Intimate Close-Up Study`,
        mood: 'Poetic • Character & Detail Driven',
        twistBuilder: (p) => ({
          beginning: `An intimate close lens captures ${p.lead}.`,
          middle: `Quiet details and shallow depth of field linger on ${p.mid}.`,
          ending: `Leaves an emotional resonance at ${p.end}.`,
          summary: `Shot with shallow depth of field and delicate framing, ${p.lead}. Focusing closely on human presence and quiet moments, ${p.mid} unfolds gently toward ${p.end}.`,
        }),
      },
      {
        partLabel: 'Style 6',
        lensTitle: (c) => `${c} — Golden Hour Cinema`,
        mood: 'Warm Sunlight • 35mm Rich Color',
        twistBuilder: (p) => ({
          beginning: `Bathed in golden sunlight, ${p.lead}.`,
          middle: `Warm volumetric rays illuminate ${p.mid}.`,
          ending: `Ends in luminous warm framing with ${p.end}.`,
          summary: `Framed in radiant golden hour light, ${p.lead}. Rich film contrast highlights every movement within ${p.mid}, closing gracefully on ${p.end}.`,
        }),
      },
      {
        partLabel: 'Style 7',
        lensTitle: (c) => `${c} — Lighthearted & Playful Spin`,
        mood: 'Witty • Charming Visual Humor',
        twistBuilder: (p) => ({
          beginning: `With cheerful timing and visual charm, ${p.lead}.`,
          middle: `Playful coincidences turn ${p.mid} into an amusing sequence.`,
          ending: `Wraps up with a warm smile at ${p.end}.`,
          summary: `Approached with lighthearted energy, ${p.lead}. Unexpected comedic beats give ${p.mid} effortless charm, concluding playfully at ${p.end}.`,
        }),
      },
      {
        partLabel: 'Style 8',
        lensTitle: (c) => `${c} — Observational Mystery`,
        mood: 'Clue-Driven • Sharp Focus',
        twistBuilder: (p) => ({
          beginning: `Opening on a tiny visual detail connected to ${p.lead}.`,
          middle: `Observational shots piece together ${p.mid}.`,
          ending: `Everything clicks clearly into place at ${p.end}.`,
          summary: `Told like a visual puzzle, ${p.lead}. Carefullly composed inserts around ${p.mid} invite the audience to notice every clue before ${p.end} brings clarity.`,
        }),
      },
      {
        partLabel: 'Style 9',
        lensTitle: (c) => `${c} — Pure Silent Visual Montage`,
        mood: 'Zero Dialogue • Soundscape & Motion',
        twistBuilder: (p) => ({
          beginning: `Told strictly without dialogue as ${p.lead}.`,
          middle: `Visual rhythm and natural foley guide ${p.mid}.`,
          ending: `Rests peacefully on a purely visual final image: ${p.end}.`,
          summary: `Crafted entirely through silent visual storytelling, ${p.lead}. Expressive framing and crisp ambient soundscapes carry ${p.mid} smoothly into the closing shot of ${p.end}.`,
        }),
      },
      {
        partLabel: 'Style 10',
        lensTitle: (c) => `${c} — Grand Wide-Screen Canvas`,
        mood: 'Epic Scale • Anamorphic Scope',
        twistBuilder: (p) => ({
          beginning: `Anamorphic wide lenses establish ${p.lead}.`,
          middle: `The visual scale expands dramatically across ${p.mid}.`,
          ending: `Concludes with sweeping cinematic scope at ${p.end}.`,
          summary: `Presented on a grand anamorphic canvas, ${p.lead}. Sweeping camera arcs elevate ${p.mid} into a monumental visual sequence culminating at ${p.end}.`,
        }),
      },
    ],
    shotCameraFocus: [
      'Wide Establishing Shot capturing the full environment and subject from the story',
      'Smooth Medium Tracking Shot following the movement naturally',
      'Detailed Close-Up highlighting fine physical details, posture, or objects',
      'Over-the-Shoulder Framing adding spatial depth',
      'Low-Angle Cinematic Perspective elevating visual presence',
      'Parallel Steadicam Shot maintaining continuous flow',
      'Tight Insert Shot capturing key textures and visual cues',
      'Wide Scenic Closing Shot bringing calm resolution',
    ],
    silentAudioNote: 'NO DIALOGUE — Pure visual action with realistic ambient sounds and natural foley only.',
    variationLabel: (genre, num) => `${genre} - Model ${num}`,
  },
  hi: {
    categories: [
      { catKey: 'thriller', label: '🕵️ मिस्ट्री और थ्रिलर', styleTag: 'थ्रिलर' },
      { catKey: 'drama', label: '🎭 इमोशनल ड्रामा', styleTag: 'ड्रामा' },
      { catKey: 'action', label: '💥 एक्शन और ऊर्जा', styleTag: 'एक्शन' },
      { catKey: 'folk', label: '🌿 लोककथा और रहस्य', styleTag: 'लोककथा' },
      { catKey: 'scifi', label: '⏳ साइंस फिक्शन', styleTag: 'साइंस फिक्शन' },
      { catKey: 'comedy', label: '😂 कॉमेडी और मस्ती', styleTag: 'कॉमेडी' },
      { catKey: 'ad', label: '📢 कमर्शियल / प्रोमो', styleTag: 'विज्ञापन' },
    ],
    lenses: Array.from({ length: 10 }, (_, idx) => ({
      partLabel: `मॉडल ${idx + 1}`,
      lensTitle: (c: string) => `${c} — विशेष सिनेमाई रूप ${idx + 1}`,
      mood: idx % 2 === 0 ? 'True to Story • Cinematic' : 'Atmospheric • Focused Visuals',
      twistBuilder: (p: { lead: string; mid: string; end: string }, genre: string, modIdx: number) => ({
        beginning: p.lead,
        middle: `${genre} अंदाज़ में (${modIdx + 1}) ${p.mid} का दृश्य गहराई से उभरता है।`,
        ending: `${p.end} के साथ कहानी प्रभावी रूप से समाप्त होती है।`,
        summary: `${p.lead}। आपकी मूल कहानी पर आधारित रहते हुए, ${genre} शैली के साथ ${p.mid} आगे बढ़ता है। स्वाभाविक रोशनी, सटीक फ्रेमिंग और स्पष्ट दृश्यों के ज़रिए यह क्रम ${p.end} पर सार्थक रूप से पूरा होता है।`,
      }),
    })),
    shotCameraFocus: [
      'Wide Establishing Shot capturing the environment described in your story',
      'Smooth Medium Tracking Shot following the action cleanly',
      'Detailed Close-Up highlighting key visual elements',
      'Over-the-Shoulder Cinematic Angle for spatial continuity',
      'Low-Angle Dynamic Shot for dramatic emphasis',
      'Steadicam Side-Tracking Shot maintaining flow',
      'Macro Insert Shot on crucial scene details',
      'Wide Closing Frame resolving the sequence',
    ],
    silentAudioNote: 'NO DIALOGUE — Pure visual action with realistic ambient soundscape only.',
    variationLabel: (genre, num) => `${genre} - मॉडल ${num}`,
  },
  ta: {
    categories: [
      { catKey: 'thriller', label: '🕵️ மர்மம் & திரில்லர்', styleTag: 'திரில்லர்' },
      { catKey: 'drama', label: '🎭 உணர்ச்சிபூர்வ டிராமா', styleTag: 'டிராமா' },
      { catKey: 'action', label: '💥 ஆக்ஷன் & வேகம்', styleTag: 'ஆக்ஷன்' },
      { catKey: 'folk', label: '🌿 நாட்டுப்புற மர்மம்', styleTag: 'நாட்டுப்புறம்' },
      { catKey: 'scifi', label: '⏳ சயின்ஸ் பிக்ஷன்', styleTag: 'சயின்ஸ் பிக்ஷன்' },
      { catKey: 'comedy', label: '😂 காமெடி & ஃபன்', styleTag: 'காமெடி' },
      { catKey: 'ad', label: '📢 வணிக விளம்பரம்', styleTag: 'விளம்பரம்' },
    ],
    lenses: Array.from({ length: 10 }, (_, idx) => ({
      partLabel: `வடிவம் ${idx + 1}`,
      lensTitle: (c: string) => `${c} — சினிமாட்டிக் வடிவம் ${idx + 1}`,
      mood: idx % 2 === 0 ? 'True to Story • Cinematic' : 'Atmospheric • Focused Visuals',
      twistBuilder: (p: { lead: string; mid: string; end: string }, genre: string, modIdx: number) => ({
        beginning: p.lead,
        middle: `${genre} பாணியில் (${modIdx + 1}) ${p.mid} காட்சியாக விரிகிறது.`,
        ending: `${p.end} என்ற காட்சியுடன் கதை நிறைவடைகிறது.`,
        summary: `${p.lead}. உங்கள் கதையின் அடிப்படை கருத்தை மாற்றாமல் ${genre} பாணியில் ${p.mid} தொடர்ந்து நகர்கிறது. இயல்பான ஒளியமைப்பும் காட்சித் தெளிவும் இணைந்து ${p.end} என்ற இறுதிக்காட்சியில் அழகாக முடிகிறது.`,
      }),
    })),
    shotCameraFocus: [
      'Wide Establishing Shot capturing the environment described in your story',
      'Smooth Medium Tracking Shot following the action cleanly',
      'Detailed Close-Up highlighting key visual elements',
      'Over-the-Shoulder Cinematic Angle for spatial continuity',
      'Low-Angle Dynamic Shot for dramatic emphasis',
      'Steadicam Side-Tracking Shot maintaining flow',
      'Macro Insert Shot on crucial scene details',
      'Wide Closing Frame resolving the sequence',
    ],
    silentAudioNote: 'NO DIALOGUE — Pure visual action with realistic ambient soundscape only.',
    variationLabel: (genre, num) => `${genre} - வடிவம் ${num}`,
  },
  kn: {
    categories: [
      { catKey: 'thriller', label: '🕵️ ಮಿಸ್ಟರಿ & ಥ್ರಿಲ್ಲರ್', styleTag: 'ಥ್ರಿಲ್ಲರ್' },
      { catKey: 'drama', label: '🎭 ಎಮೋಷನಲ್ ಡ್ರಾಮಾ', styleTag: 'ಡ್ರಾಮಾ' },
      { catKey: 'action', label: '💥 ಆಕ್ಷನ್ & ವೇಗ', styleTag: 'ಆಕ್ಷನ್' },
      { catKey: 'folk', label: '🌿 ಜಾನಪದ ರಹಸ್ಯ', styleTag: 'ಜಾನಪದ' },
      { catKey: 'scifi', label: '⏳ ಸೈನ್ಸ್ ಫಿಕ್ಷನ್', styleTag: 'ಸೈನ್ಸ್ ಫಿಕ್ಷನ್' },
      { catKey: 'comedy', label: '😂 ಕಾಮಿಡಿ & ಫನ್', styleTag: 'ಕಾಮಿಡಿ' },
      { catKey: 'ad', label: '📢 ವಾಣಿಜ್ಯ ಜಾಹೀರಾತು', styleTag: 'ಜಾಹೀರಾತು' },
    ],
    lenses: Array.from({ length: 10 }, (_, idx) => ({
      partLabel: `ಶೈಲಿ ${idx + 1}`,
      lensTitle: (c: string) => `${c} — ಸಿನಿಮಾಟಿಕ್ ಶೈಲಿ ${idx + 1}`,
      mood: idx % 2 === 0 ? 'True to Story • Cinematic' : 'Atmospheric • Focused Visuals',
      twistBuilder: (p: { lead: string; mid: string; end: string }, genre: string, modIdx: number) => ({
        beginning: p.lead,
        middle: `${genre} ಶೈಲಿಯಲ್ಲಿ (${modIdx + 1}) ${p.mid} ದೃಶ್ಯವು ಮೂಡಿಬರುತ್ತದೆ.`,
        ending: `${p.end} ಮೂಲಕ ಕಥೆ ಸ್ಪಷ್ಟವಾಗಿ ಪೂರ್ಣಗೊಳ್ಳುತ್ತದೆ.`,
        summary: `${p.lead}. ನಿಮ್ಮ ಮೂಲ ಕಥೆಗೆ ಸಂಪೂರ್ಣ ನಿಷ್ಠವಾಗಿ ${genre} ಶೈಲಿಯಲ್ಲಿ ${p.mid} ಮುಂದುವರಿಯುತ್ತದೆ. ಸಹಜ ಬೆಳಕು ಮತ್ತು ದೃಶ್ಯ ಸಂಯೋಜನೆಯೊಂದಿಗೆ ${p.end} ಹಂತದಲ್ಲಿ ಕಥೆ ಸುಂದರವಾಗಿ ಮುಕ್ತಾಯವಾಗುತ್ತದೆ.`,
      }),
    })),
    shotCameraFocus: [
      'Wide Establishing Shot capturing the environment described in your story',
      'Smooth Medium Tracking Shot following the action cleanly',
      'Detailed Close-Up highlighting key visual elements',
      'Over-the-Shoulder Cinematic Angle for spatial continuity',
      'Low-Angle Dynamic Shot for dramatic emphasis',
      'Steadicam Side-Tracking Shot maintaining flow',
      'Macro Insert Shot on crucial scene details',
      'Wide Closing Frame resolving the sequence',
    ],
    silentAudioNote: 'NO DIALOGUE — Pure visual action with realistic ambient soundscape only.',
    variationLabel: (genre, num) => `${genre} - ಶೈಲಿ ${num}`,
  },
  te: {
    categories: [
      { catKey: 'thriller', label: '🕵️ మిస్టరీ & థ్రిల్లర్', styleTag: 'థ్రిల్లర్' },
      { catKey: 'drama', label: '🎭 ఎమోషనల్ డ్రామా', styleTag: 'డ్రామా' },
      { catKey: 'action', label: '💥 యాక్షన్ & వేగం', styleTag: 'యాక్షన్' },
      { catKey: 'folk', label: '🌿 జానపద రహస్యం', styleTag: 'జానపదం' },
      { catKey: 'scifi', label: '⏳ సైన్స్ ఫిక్షన్', styleTag: 'సైన్స్ ఫిక్షన్' },
      { catKey: 'comedy', label: '😂 కామెడీ & ఫన్', styleTag: 'కామెడీ' },
      { catKey: 'ad', label: '📢 వాణిజ్య ప్రకటన', styleTag: 'ప్రకటన' },
    ],
    lenses: Array.from({ length: 10 }, (_, idx) => ({
      partLabel: `మోడల్ ${idx + 1}`,
      lensTitle: (c: string) => `${c} — సినిమాటిక్ శైలి ${idx + 1}`,
      mood: idx % 2 === 0 ? 'True to Story • Cinematic' : 'Atmospheric • Focused Visuals',
      twistBuilder: (p: { lead: string; mid: string; end: string }, genre: string, modIdx: number) => ({
        beginning: p.lead,
        middle: `${genre} శైలిలో (${modIdx + 1}) ${p.mid} దృశ్యరూపం దాల్చుతుంది.`,
        ending: `${p.end} తో ఈ కథ సహజంగా ముగుస్తుంది.`,
        summary: `${p.lead}. మీరు ఇచ్చిన అసలు కథ ఆధారంగానే ${genre} శైలిలో ${p.mid} ముందుకు సాగుతుంది. సహజమైన లైటింగ్ మరియు స్పష్టమైన దృశ్యాలతో ${p.end} వద్ద ఈ కథ చక్కగా ముగుస్తుంది.`,
      }),
    })),
    shotCameraFocus: [
      'Wide Establishing Shot capturing the full environment described in your story',
      'Smooth Medium Tracking Shot following the action cleanly',
      'Detailed Close-Up highlighting key visual elements',
      'Over-the-Shoulder Cinematic Angle for spatial continuity',
      'Low-Angle Dynamic Shot for dramatic emphasis',
      'Steadicam Side-Tracking Shot maintaining flow',
      'Macro Insert Shot on crucial scene details',
      'Wide Closing Frame resolving the sequence',
    ],
    silentAudioNote: 'NO DIALOGUE — Pure visual action with realistic ambient soundscape only.',
    variationLabel: (genre, num) => `${genre} - మోడల్ ${num}`,
  },
};

export function generateStoryAnglesLocal(premise: string, lang: AppLang = 'ml'): StoryAngle[] {
  const baseText = premise.trim();
  const pack = DYNAMIC_STORY_PACKS[lang] || DYNAMIC_STORY_PACKS.ml;
  const sentences = splitStorySentences(baseText);

  const lead = sentences[0] || baseText;
  const mid = sentences.length >= 3 ? sentences.slice(1, -1).join('. ') : sentences[1] || lead;
  const end = sentences.length >= 2 ? sentences[sentences.length - 1] : lead;

  const shortTitleCore = lead.length > 36 ? `${lead.slice(0, 36).trim()}...` : lead;
  const derivedCharacters = deriveSubjectLabel(baseText, lang);

  const bgmByGenre: Record<GenreKey, Record<AppLang, string>> = {
    thriller: {
      ml: 'മിസ്റ്ററി ത്രില്ലർ: ലോ ബാസ് പൾസ്, മൃദുവായ സ്ട്രിങ് ടെൻഷൻ & അന്തരീക്ഷ നിശബ്ദത',
      en: 'Mystery Thriller: Tense low bass pulse, delicate eerie strings & subtle heartbeat percussion',
      hi: 'मिस्ट्री थ्रिलर: हल्का लो-बेस पल्स, सस्पेंस स्ट्रिंग्स और रहस्यमयी साउंडस्केप',
      ta: 'மர்ம திரில்லர்: ஆழமான பேஸ் தாளம், மெல்லிய சஸ்பென்ஸ் வயலின் & இயற்கை ஒலிகள்',
      kn: 'ಮಿಸ್ಟರಿ ಥ್ರಿಲ್ಲರ್: ಆಳವಾದ ಲೋ-ಬೇಸ್ ಪಲ್ಸ್ ಮತ್ತು ಸಸ್ಪೆನ್ಸ್ ಸ್ಟ್ರಿಂಗ್ಸ್',
      te: 'మిస్టరీ థ్రిల్లర్: లో-బేస్ పల్స్ మరియు సస్పెన్స్ స్ట్రింగ్స్ మ్యూజిక్',
    },
    drama: {
      ml: 'ഇമോഷണൽ ഡ്രാമ: ഹൃദ്യമായ പിയാനോ മെലഡി, മൃദുവായ വയലിൻ & സ്വാഭാവിക അന്തരീക്ഷ ശബ്ദം',
      en: 'Emotional Drama: Soulful warm piano keys, soft solo cello & natural ambient foley',
      hi: 'इमोशनल ड्रामा: भावुक पियानो धुन, मुलायम वायलिन और प्राकृतिक परिवेश ध्वनि',
      ta: 'உணர்ச்சி டிராமா: மென்மையான பியானோ, இதமான செல்லோ இசை & இயற்கை ஒலி',
      kn: 'ಎಮೋಷನಲ್ ಡ್ರಾಮಾ: ಹಿತವಾದ ಪಿಯಾನೋ ಮತ್ತು ಭಾವನಾತ್ಮಕ ವಯಲಿನ್ ಹಿನ್ನೆಲೆ ಸಂಗೀತ',
      te: 'ఎమోషనల్ డ్రామా: మృదువైన పియానో మరియు హృదయానికి హత్తుకునే వయోలిన్ సంగీతం',
    },
    action: {
      ml: 'ആക്ഷൻ: വേഗതയുള്ള പെർക്കഷൻ, ഡ്രൈവിംഗ് സിന്ത് റിഥം & ഉയരുന്ന ഓർക്കസ്ട്ര ബിൽഡ്',
      en: 'Action Energy: Driving percussive rhythm, crisp cinematic hits & rising orchestral pulse',
      hi: 'एक्शन ऊर्जा: तेज़ रिदम, दमदार ड्रम बीट्स और रोमांचक ऑर्केस्ट्रा बिल्ड',
      ta: 'ஆக்ஷன் வேகம்: வேகமான தாளம், சினிமாட்டிக் டிரம்ஸ் மற்றும் உயரும் இசை',
      kn: 'ಆಕ್ಷನ್ ವೇಗ: ವೇಗದ ಪರ್ಕಷನ್ ಬೀಟ್ಸ್ ಮತ್ತು ರೋಮಾಂಚಕ ಆರ್ಕೆಸ್ಟ್ರಾ ಪಲ್ಸ್',
      te: 'యాక్షన్ ఎనర్జీ: వేగవంతమైన డ్రమ్ బీట్స్ మరియు హై-టెంపో ఆర్కెస్ట్రా మ్యూజిక్',
    },
    folk: {
      ml: 'ഫോക്ക് & നിഗൂഢത: പരമ്പരാഗത ഓടക്കുഴൽ/തന്ത്രി വാദ്യം & കാറ്റിന്റെ നിഗൂഢ ശബ്ദം',
      en: 'Folk & Eerie: Haunting bamboo flute melody, ethnic percussion & atmospheric wind texture',
      hi: 'लोक और रहस्य: गूंजती बांसुरी की धुन, लोक वाद्य और हवा का रहस्यमय स्वर',
      ta: 'நாட்டுப்புற மர்மம்: மயக்கும் புல்லாங்குழல், பாரம்பரிய தாளம் & காற்றின் ஒலி',
      kn: 'ಜಾನಪದ ರಹಸ್ಯ: ಕೊಳಲಿನ ನಿಗೂಢ ನಾದ, ಜಾನಪದ ವಾದ್ಯಗಳು ಮತ್ತು ಗಾಳಿಯ ಶಬ್ದ',
      te: 'జానపద మిస్టరీ: వేణువు నాదం, జానపద వాయిద్యాలు మరియు గాలి ధ్వనులు',
    },
    scifi: {
      ml: 'സയൻസ് ഫിക്ഷൻ: ആംബിയന്റ് അനലോഗ് സിന്ത് പാഡ്, സ്പേഷ്യൽ ഇക്കോ & ഫ്യൂച്ചറിസ്റ്റിക് ഹം',
      en: 'Sci-Fi Atmospheric: Deep analog synth pads, crystalline arpeggios & resonant spatial echo',
      hi: 'साइंस फिक्शन: डीप एनालॉग सिंथ पैड, क्रिस्टल आर्पेगियो और स्पेस एम्बिएंस',
      ta: 'சயின்ஸ் பிக்ஷன்: ஆழமான சின்த் அலைகள் & எதிரொலிக்கும் விண்வெளி இசை',
      kn: 'ಸೈನ್ಸ್ ಫಿಕ್ಷನ್: ಡೀಪ್ ಅನಲಾಗ್ ಸಿಂಥ್ ಪ್ಯಾಡ್ ಮತ್ತು ಫ್ಯೂಚರಿಸ್ಟಿಕ್ ಎಕೋ',
      te: 'సైన్స్ ఫిక్షన్: డీప్ సింథ్ ప్యాడ్స్ మరియు ఫ్యూచరిస్టిక్ స్పేషియల్ మ్యూజిక్',
    },
    comedy: {
      ml: 'കോമഡി & ഫൺ: ഉല്ലാസഭരിതമായ അക്കൗസ്റ്റിക് ഗിറ്റാർ, മരിംബ & രസകരമായ റിഥം',
      en: 'Comedy & Fun: Bouncy pizzicato strings, playful marimba & upbeat acoustic guitar',
      hi: 'कॉमेडी और मस्ती: हल्का-फुल्का एकॉस्टिक गिटार, मज़ेदार प्लक्ड स्ट्रिंग्स और चंचल लय',
      ta: 'காமெடி & ஃபன்: துள்ளலான அகவுஸ்டிக் கிட்டார் & நகைச்சுவை தாள இசை',
      kn: 'ಕಾಮಿಡಿ & ಫನ್: ಚುರುಕಾದ ಅಕೌಸ್ಟಿಕ್ ಗಿಟಾರ್ ಮತ್ತು ಹಾಸ್ಯಮಯ ತಾಳ',
      te: 'కామెడీ & ఫన్: ఉల్లాసమైన అకౌస్టిక్ గిటార్ మరియు సరదా మ్యూజిక్ బీట్',
    },
    ad: {
      ml: 'കൊമേഴ്സ്യൽ / പ്രൊമോ: ആകർഷകമായ മോഡേൺ ഇലക്ട്രോ-അക്കൗസ്റ്റിക് ബീറ്റ് & ക്ലീൻ സൗണ്ട് ഡിസൈൻ',
      en: 'Commercial Polish: Uplifting modern electro-acoustic groove with crisp signature swells',
      hi: 'कमर्शियल प्रोमो: आधुनिक अपलिफ्टिंग बीट और आकर्षक ब्रांड साउंड डिज़ाइन',
      ta: 'விளம்பரம்: நவீன உற்சாகமான மெல்லிசை மற்றும் தெளிவான சவுண்ட் டிசைன்',
      kn: 'ಕಮರ್ಷಿಯಲ್: ಆಧುನಿಕ ಆಕರ್ಷಕ ಬೀಟ್ ಮತ್ತು ಶುದ್ಧ ಸೌಂಡ್ ಡಿಸೈನ್',
      te: 'కమర్షియల్ యాడ్: ఆకర్షణీయమైన మోడరన్ గ్రూవ్ మరియు క్రిస్ప్ సౌండ్ డిజైన్',
    },
  };

  const continuityNote =
    lang === 'ml'
      ? `നിങ്ങളുടെ കഥയിലെ യഥാർത്ഥ കഥാപാത്രങ്ങൾ, വേഷവിധാനം, ചുറ്റുപാടുകൾ, പ്രകാശം എന്നിവ എല്ലാ ഷോട്ടിലും മാറ്റമില്ലാതെ നിലനിർത്തുന്നു ("${lead.slice(0, 48)}...").`
      : `Lock exact character faces, wardrobe, props, lighting, and location atmosphere directly from your story across all sequential clips.`;

  const allAngles: StoryAngle[] = [];
  let counter = 1;

  // Use 2 unique lenses per category rotating across all 10 lenses (14 varied cards total across 7 genres)
  pack.categories.forEach((cat, catIdx) => {
    for (let lensIdx = 0; lensIdx < 2; lensIdx++) {
      const rotatedLens = pack.lenses[(catIdx * 2 + lensIdx) % pack.lenses.length];
      const built = rotatedLens.twistBuilder({ lead, mid, end }, cat.styleTag, counter - 1);
      const bgmText = (bgmByGenre[cat.catKey] && bgmByGenre[cat.catKey][lang]) || bgmByGenre[cat.catKey].en;
      allAngles.push({
        id: `angle-${counter}`,
        catKey: cat.catKey,
        genre: `${cat.label} (${lensIdx + 1})`,
        title: `${cat.styleTag}: ${rotatedLens.lensTitle(shortTitleCore)}`,
        mood: rotatedLens.mood,
        bgm: bgmText,
        continuity: continuityNote,
        characters: derivedCharacters,
        storySummary: built.summary,
        beginning: built.beginning,
        middle: built.middle,
        ending: built.ending,
        synopsis: pack.variationLabel(cat.label, lensIdx + 1),
        scriptText: `${baseText}\n\n${built.summary}\n\n[BGM STYLE: ${bgmText}]`,
      });
      counter++;
    }
  });

  return allAngles;
}

function buildShotBgmCue(beatText: string, shotIndex: number, totalShots: number): string {
  const lower = beatText.toLowerCase();
  const phase =
    shotIndex === 0
      ? 'Gentle atmospheric intro fade-in'
      : shotIndex >= totalShots - 1
      ? 'Resonant emotional resolution swell & soft sustain fade-out'
      : shotIndex % 2 === 0
      ? 'Gradual rhythmic underscore building subtle tension'
      : 'Warm ambient pad blended with delicate acoustic accent';

  if (lower.includes('മഴ') || lower.includes('rain') || lower.includes('बारिश') || lower.includes('மழை')) {
    return `${phase}; layered with soft ambient rainfall patter, distant thunder warmth, and light piano notes.`;
  }
  if (lower.includes('കടൽ') || lower.includes('beach') || lower.includes('ocean') || lower.includes('sea') || lower.includes('समुद्र')) {
    return `${phase}; layered with gentle coastal ocean waves, coastal breeze texture, and airy acoustic chords.`;
  }
  return `${phase}; tailored organically to the visual mood and natural ambient foley of the scene.`;
}

export function generateBreakdownLocal(
  script: string,
  preferredShotDuration: number = 8,
  characterPhotos: any[] = [],
  targetShotCount: number = 8,
  lang: AppLang = 'ml'
): { title: string; shots: GeneratedShot[] } {
  const numShots = Math.max(1, targetShotCount || 8);
  const pack = DYNAMIC_STORY_PACKS[lang] || DYNAMIC_STORY_PACKS.ml;
  const cleanScript = (script || '').trim();
  const storyBeats = splitStorySentences(cleanScript);
  const effectiveBeats = storyBeats.length > 0 ? storyBeats : [cleanScript];

  // Strictly check whether the user's story contains dialogue
  const scriptAllowsDialogue = hasExplicitDialogue(cleanScript);

  const hasPhotos = Array.isArray(characterPhotos) && characterPhotos.length > 0;
  const continuityTag = hasPhotos
    ? 'Strict Character Face ID, Clothing, Prop & Lighting Continuity Locked to Reference Photo'
    : 'Strict Subject Appearance, Wardrobe, Prop & Environmental Continuity Locked Across Sequence';

  const lightingPhases = [
    'soft directional key light with natural depth',
    'balanced volumetric shadows and rich color fidelity',
    'dramatic rim lighting emphasizing motion and form',
    'atmospheric chiaroscuro contrast matching environment mood',
    'golden natural bounce light with crisp textural detail',
  ];

  const shots: GeneratedShot[] = Array.from({ length: numShots }, (_, idx) => {
    const shotNum = idx + 1;
    const beatIndex = Math.min(
      effectiveBeats.length - 1,
      Math.floor((idx * effectiveBeats.length) / numShots)
    );
    const beatText = effectiveBeats[beatIndex] || cleanScript;
    const cameraStyle = pack.shotCameraFocus[idx % pack.shotCameraFocus.length];
    const lightStyle = lightingPhases[idx % lightingPhases.length];
    const bgmCue = buildShotBgmCue(beatText, idx, numShots);

    // Only keep/extract dialogue when the user's story beat explicitly involves speech/quotes
    const beatHasDialogue = scriptAllowsDialogue && hasExplicitDialogue(beatText);
    const extractedSpeech = beatHasDialogue ? extractDialogueIfPresent(beatText) : '';

    const imagePrompt = `[IMAGE GENERATION PROMPT — SHOT ${shotNum.toString().padStart(2, '0')}]: Photorealistic 35mm film still depicting story beat: "${beatText}". Continuity: ${continuityTag}. Framing: ${cameraStyle}. Lighting: ${lightStyle}, ultra-detailed 8k realism.`;

    const audioInstruction =
      beatHasDialogue && extractedSpeech
        ? `Spoken Dialogue (${lang.toUpperCase()}): "${extractedSpeech}". Background Music & SFX: ${bgmCue}`
        : `${pack.silentAudioNote} Background Music & SFX: ${bgmCue}`;

    const videoPrompt = `[VIDEO GENERATION PROMPT — SHOT ${shotNum.toString().padStart(2, '0')}]: Smooth 24fps cinematic sequence directly visualizing: "${beatText}". Continuity: ${continuityTag}. Camera Movement: ${cameraStyle}, organic natural motion. ${audioInstruction} Duration: ${preferredShotDuration} seconds.`;

    return {
      shotNumber: shotNum,
      durationSeconds: preferredShotDuration,
      timing: `Shot ${shotNum.toString().padStart(2, '0')} — ${preferredShotDuration}s`,
      action: beatText,
      characters: [deriveSubjectLabel(beatText, lang)],
      bgm: bgmCue,
      continuity: continuityTag,
      malayalamDialogue: extractedSpeech,
      dialogueEnglish: extractedSpeech,
      imagePrompt,
      videoPrompt,
      visualPrompt: imagePrompt,
    };
  });

  return {
    title: 'Story-Matched Sequential Breakdown',
    shots,
  };
}

/**
 * Expands AI-generated core story shots cleanly while preserving BGM, visual continuity,
 * and strict zero-dialogue rules.
 */
export function expandShotsToTargetCount(
  coreShots: GeneratedShot[],
  targetShotCount: number,
  preferredShotDuration: number,
  allowDialogue: boolean,
  lang: AppLang = 'ml'
): GeneratedShot[] {
  if (!coreShots || coreShots.length === 0) return [];
  const total = Math.max(1, targetShotCount);
  const pack = DYNAMIC_STORY_PACKS[lang] || DYNAMIC_STORY_PACKS.ml;

  if (coreShots.length >= total) {
    return coreShots.slice(0, total).map((shot, idx) => {
      const cleanedDialogue = allowDialogue ? (shot.malayalamDialogue || '') : '';
      const bgmCue = shot.bgm || buildShotBgmCue(shot.action || '', idx, total);
      return {
        ...shot,
        shotNumber: idx + 1,
        durationSeconds: preferredShotDuration,
        timing: `Shot ${(idx + 1).toString().padStart(2, '0')} — ${preferredShotDuration}s`,
        bgm: bgmCue,
        continuity:
          shot.continuity || 'Consistent character appearance, wardrobe, props & environmental lighting',
        malayalamDialogue: cleanedDialogue,
        dialogueEnglish: allowDialogue ? (shot.dialogueEnglish || cleanedDialogue) : '',
      };
    });
  }

  return Array.from({ length: total }, (_, idx) => {
    const coreIdx = Math.min(coreShots.length - 1, Math.floor((idx * coreShots.length) / total));
    const base = coreShots[coreIdx];
    const subRepeatIndex = idx % 3;
    const cameraVariant = pack.shotCameraFocus[(idx + coreIdx) % pack.shotCameraFocus.length];

    const isPrimaryBeatClip =
      idx === 0 || Math.floor(((idx - 1) * coreShots.length) / total) !== coreIdx;

    const rawDialogue = allowDialogue && isPrimaryBeatClip ? (base.malayalamDialogue || '') : '';
    const bgmCue = base.bgm || buildShotBgmCue(base.action || '', idx, total);
    const continuityLock =
      base.continuity || 'Same exact subject features, wardrobe, lighting & prop continuity maintained';

    const cleanedVideoPrompt = !allowDialogue
      ? (base.videoPrompt || '').replace(/Spoken Dialogue[^.]*\.?/gi, pack.silentAudioNote)
      : base.videoPrompt || '';

    const suffixTag = subRepeatIndex === 0 ? '' : ` [${cameraVariant}]`;

    return {
      shotNumber: idx + 1,
      durationSeconds: preferredShotDuration,
      timing: `Shot ${(idx + 1).toString().padStart(2, '0')} — ${preferredShotDuration}s`,
      action: `${base.action}${suffixTag}`,
      characters: base.characters || [],
      bgm: bgmCue,
      continuity: continuityLock,
      malayalamDialogue: rawDialogue,
      dialogueEnglish: allowDialogue && isPrimaryBeatClip ? (base.dialogueEnglish || rawDialogue) : '',
      imagePrompt: base.imagePrompt
        ? `${base.imagePrompt}${suffixTag} [Continuity: ${continuityLock}]`
        : `[IMAGE GENERATION PROMPT]: Cinematic 35mm still: ${base.action}${suffixTag}. Continuity: ${continuityLock}.`,
      videoPrompt: cleanedVideoPrompt
        ? `${cleanedVideoPrompt}${suffixTag} [BGM: ${bgmCue}] [Continuity: ${continuityLock}]`
        : `[VIDEO GENERATION PROMPT]: 24fps motion shot: ${base.action}${suffixTag}. Continuity: ${continuityLock}. ${rawDialogue ? `Spoken Dialogue: "${rawDialogue}".` : pack.silentAudioNote} BGM: ${bgmCue}`,
      visualPrompt: base.visualPrompt || base.imagePrompt,
    };
  });
}
