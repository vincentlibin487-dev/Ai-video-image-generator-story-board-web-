import type { AppLang } from './i18n';

export type GenreKey = 'thriller' | 'drama' | 'action' | 'folk' | 'scifi' | 'comedy' | 'ad';
export type DialogueMode = 'dynamic' | 'dialogue' | 'silent';

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

  if (/["“”'‘’«»]/.test(trimmed)) return true;
  if (/(^|\n)\s*[^\d:\n]{2,24}\s*:\s*\S+/m.test(trimmed)) return true;

  const dialogueKeywords =
    /\b(dialogue|dialogues|says|said|asks|asked|speaks|spoke|talks|talking|conversation|whispers|shouts|replies|monologue|voiceover|narrates)\b|(ഡയലോഗ്|സംഭാഷണം|പറയുന്നു|പറഞ്ഞു|ചോദിക്കുന്നു|ചോദിച്ചു|സംസാരിക്കുന്നു|സംസാരിച്ചു|വിളിക്കുന്നു|മറുപടി|ശബ്ദത്തിൽ പറയുന്നു)|(संवाद|डायलॉग|कहता|कहती|कहा|पूछता|पूछा|बोलता|बोली|बातचीत)|(வசனம்|டயலாக்|பேசுகிறார்|பேசினார்|கேட்கிறார்|கேட்டார்|சொல்கிறார்|சொன்னார்|உரையாடல்)|(ಸಂಭಾಷಣೆ|ಡೈಲಾಗ್|ಹೇಳುತ್ತಾ|ಹೇಳಿದ|ಕೇಳುತ್ತಾ|ಮಾತನಾಡು|ಮಾತುಕತೆ)|(సంభాషణ|డైలాగ్|చెబుత|చెప్పా|అడుగుత|అడిగా|మాట్లాడుత|మాటలు)/i;

  return dialogueKeywords.test(trimmed);
}

/**
 * Returns true ONLY if the user explicitly asks for a silent / zero-dialogue film.
 */
export function isExplicitlySilent(text: string): boolean {
  if (!text) return false;
  return /\b(no dialogue|zero dialogue|without dialogue|silent film|silent movie|mute)\b|(ഡയലോഗ്\s*വേണ്ട|ഡയലോഗ്\s*ഇല്ലാതെ|സംഭാഷണമില്ല|ശബ്ദരഹിതം|निःशब्द|बिना संवाद|வசனம்\s*வேண்டாம்|ಮೌನ|డైలాగ్\s*వద్దు)/i.test(
    text
  );
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
  const fallbackByLang: Record<AppLang, string> = {
    ml: 'കഥയിലെ പ്രധാന കഥാപാത്രങ്ങൾ',
    en: 'Central characters from your story',
    hi: 'कहानी के मुख्य पात्र',
    ta: 'கதையின் முக்கிய கதாபாத்திரங்கள்',
    kn: 'ಕಥೆಯ ಮುಖ್ಯ ಪಾತ್ರಗಳು',
    te: 'కథలోని ప్రధాన పాత్రలు',
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
        lensTitle: (c) => `${c} — നിശബ്ദ ദൃശ്യാവിഷ്കാരം`,
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

const SUB_BEAT_PHASES: Record<
  AppLang,
  { actionSuffix: (shotNum: number, total: number) => string; photoPose: string; videoMotion: string }[]
> = {
  ml: [
    {
      actionSuffix: () => 'രംഗത്തിന്റെ തുടക്കവും കഥാപാത്രത്തിന്റെ പ്രവേശനവും',
      photoPose: 'Character entering the scene calmly, crisp environmental establishing composition',
      videoMotion: 'Slow steady dolly-in establishing the character moving naturally into the environment',
    },
    {
      actionSuffix: () => 'ചുറ്റുപാടുകളോടുള്ള പ്രതികരണവും സൂക്ഷ്മ ഭാവങ്ങളും',
      photoPose: 'Alert facial expression catching subtle detail in the scene',
      videoMotion: 'Smooth medium tracking shot following the subtle head turn and eye focus',
    },
    {
      actionSuffix: () => 'കൈകളുടെയും പ്രധാന വസ്തുവിന്റെയും ക്ലോസ്-അപ്പ് വിശദാംശം',
      photoPose: 'Crisp close-up keyframe focused tightly on hands and central story object',
      videoMotion: 'Deliberate rack-focus motion highlighting tactile movement and ambient texture',
    },
    {
      actionSuffix: () => 'വൈകാരികമായ വഴിത്തിരിവും തീവ്രത കൂടുന്ന നിമിഷവും',
      photoPose: 'Dramatic tense posture framed cleanly from over-the-shoulder angle',
      videoMotion: 'Fluid push-in capturing rising emotion, natural breath, and meaningful eye contact',
    },
    {
      actionSuffix: () => 'അടുത്ത രംഗത്തിലേക്കുള്ള തുടർച്ചയും ചലനവും',
      photoPose: 'Dynamic three-quarter stance walking forward while maintaining exact wardrobe and props',
      videoMotion: 'Seamless Steadicam glide transitioning smoothly toward the next narrative beat',
    },
  ],
  en: [
    {
      actionSuffix: () => 'Opening setting & character entry into frame',
      photoPose: 'Character positioned cleanly inside the setting, clear establishing posture',
      videoMotion: 'Smooth slow dolly-in introducing the subject and surroundings seamlessly',
    },
    {
      actionSuffix: () => 'Observational reaction & subtle expression shift',
      photoPose: 'Natural mid-shot portrait showing focused expression and spatial awareness',
      videoMotion: 'Gentle tracking pan matching natural head turn and reactive body movement',
    },
    {
      actionSuffix: () => 'Close-up tactile detail on hands & key story prop',
      photoPose: 'Shallow depth-of-field macro keyframe isolating hands and crucial story object',
      videoMotion: 'Crisp subtle handheld micro-motion holding tension on the fine physical action',
    },
    {
      actionSuffix: () => 'Dramatic peak & emotional response',
      photoPose: 'Expressive dramatic framing highlighting emotional intensity and balanced lighting',
      videoMotion: 'Controlled emotional push-in capturing spoken line or silent expressive breath',
    },
    {
      actionSuffix: () => 'Continuous movement leading directly to the next shot',
      photoPose: 'Three-quarter directional stance preparing to move onward with identical wardrobe',
      videoMotion: 'Fluid Steadicam follow-through carrying momentum cleanly into the upcoming beat',
    },
  ],
  hi: [
    {
      actionSuffix: () => 'दृश्य की शुरुआत और पात्र का प्रवेश',
      photoPose: 'Character entering frame clearly, natural environment depth',
      videoMotion: 'Smooth slow dolly-in establishing setting and movement',
    },
    {
      actionSuffix: () => 'प्रतिक्रिया और चेहरे के सूक्ष्म भाव',
      photoPose: 'Focused medium portrait showing alert expression',
      videoMotion: 'Gentle tracking motion following reaction cleanly',
    },
    {
      actionSuffix: () => 'हाथों और मुख्य वस्तु का क्लोज़-अप',
      photoPose: 'Tight close-up keyframe on hands and central prop',
      videoMotion: 'Subtle rack focus motion accentuating action detail',
    },
    {
      actionSuffix: () => 'भावनात्मक मोड़ और मुख्य संवाद/प्रतिक्रिया',
      photoPose: 'Expressive over-the-shoulder keyframe with dramatic lighting',
      videoMotion: 'Slow dramatic push-in capturing emotion and speech',
    },
    {
      actionSuffix: () => 'अगले शॉट की ओर निरंतर गति',
      photoPose: 'Forward three-quarter stance locking exact wardrobe & prop',
      videoMotion: 'Seamless Steadicam follow motion into next shot',
    },
  ],
  ta: [
    {
      actionSuffix: () => 'காட்சித் தொடக்கமும் கதாபாத்திரத்தின் வருகையும்',
      photoPose: 'Character entering frame naturally in setting',
      videoMotion: 'Smooth establishing dolly-in motion',
    },
    {
      actionSuffix: () => 'எதிர்வினையும் முகபாவ மாற்றமும்',
      photoPose: 'Medium portrait capturing focused reaction',
      videoMotion: 'Gentle tracking camera following expression',
    },
    {
      actionSuffix: () => 'கைகள் மற்றும் முக்கிய பொருளின் க்ளோஸ்-அப்',
      photoPose: 'Tight close-up keyframe on crucial prop & hands',
      videoMotion: 'Rack focus motion revealing key detail',
    },
    {
      actionSuffix: () => 'உணர்ச்சிப்பூர்வ உச்சகட்டத் தருணம்',
      photoPose: 'Dramatic keyframe holding tense emotional posture',
      videoMotion: 'Smooth push-in capturing emotion or spoken dialogue',
    },
    {
      actionSuffix: () => 'அடுத்த காட்சிக்கான தொடர்ச்சியான நகர்வு',
      photoPose: 'Three-quarter forward stance preserving wardrobe & props',
      videoMotion: 'Steadicam follow-through into next beat',
    },
  ],
  kn: [
    {
      actionSuffix: () => 'ದೃಶ್ಯದ ಆರಂಭ ಮತ್ತು ಪಾತ್ರದ ಪ್ರವೇಶ',
      photoPose: 'Character framed cleanly entering the scene',
      videoMotion: 'Smooth slow establishing dolly-in',
    },
    {
      actionSuffix: () => 'ಸೂಕ್ಷ್ಮ ಭಾವನೆಗಳು ಮತ್ತು ಪ್ರತಿಕ್ರಿಯೆ',
      photoPose: 'Focused medium shot capturing reaction',
      videoMotion: 'Gentle tracking pan following expression',
    },
    {
      actionSuffix: () => 'ಕೈಗಳು ಮತ್ತು ಪ್ರಮುಖ ವಸ್ತುವಿನ ಕ್ಲೋಸ್-ಅಪ್',
      photoPose: 'Tight close-up keyframe on hands and story prop',
      videoMotion: 'Rack-focus motion highlighting fine action',
    },
    {
      actionSuffix: () => 'ಭಾವನಾತ್ಮಕ ತಿರುವು ಮತ್ತು ಮುಖ್ಯ ಕ್ಷಣ',
      photoPose: 'Expressive dramatic keyframe with balanced key light',
      videoMotion: 'Controlled push-in capturing emotion and dialogue',
    },
    {
      actionSuffix: () => 'ಮುಂದಿನ ಶಾಟ್‌ಗೆ ನಿರಂತರ ಚಲನೆ',
      photoPose: 'Directional stance locking exact wardrobe and continuity',
      videoMotion: 'Seamless Steadicam movement transitioning out',
    },
  ],
  te: [
    {
      actionSuffix: () => 'సన్నివేశం ప్రారంభం మరియు పాత్ర ప్రవేశం',
      photoPose: 'Character positioned clearly entering setting',
      videoMotion: 'Smooth slow dolly-in establishing the scene',
    },
    {
      actionSuffix: () => 'స్పందన మరియు ముఖ కవళికల మార్పు',
      photoPose: 'Focused medium shot capturing attentive expression',
      videoMotion: 'Gentle tracking shot following reaction',
    },
    {
      actionSuffix: () => 'చేతులు మరియు ప్రధాన వస్తువు క్లోజ్-అప్',
      photoPose: 'Tight close-up keyframe on hands and object',
      videoMotion: 'Rack-focus detail shot holding visual tension',
    },
    {
      actionSuffix: () => 'భావోద్వేగ మలుపు మరియు ప్రధాన క్షణం',
      photoPose: 'Expressive dramatic framing with cinematic lighting',
      videoMotion: 'Slow emotional push-in capturing dialogue and mood',
    },
    {
      actionSuffix: () => 'తదుపరి షాట్‌కు నిరంతర కదలిక',
      photoPose: 'Forward stance maintaining exact clothing & props',
      videoMotion: 'Seamless Steadicam glide transitioning forward',
    },
  ],
};

interface ArcBeatBlueprint {
  stageTag: string;
  sceneType: 'dialogue' | 'visual-comedy';
  situationLine: (beat: string) => string;
  cameraHint: string;
  visualMotion: string;
}

const EIGHT_PART_ARC_BEATS: Record<AppLang, ArcBeatBlueprint[]> = {
  ml: [
    {
      stageTag: 'ഭാഗം 1 — തുടക്കവും അപ്രതീക്ഷിത വരവും (Introduction)',
      sceneType: 'dialogue',
      situationLine: (b) => `${b} — കഥയുടെ തുടക്കത്തിൽ സ്വാഭാവികമായ ചുറ്റുപാടിലേക്ക് അപ്രതീക്ഷിതമായി പുതിയൊരു സാഹചര്യം കടന്നുവരുന്നു`,
      cameraHint: 'Wide establishing 35mm frame introducing characters, home/location & initial setup cleanly',
      visualMotion: 'Smooth dolly-in introducing the main character and setting the opening mood',
    },
    {
      stageTag: 'ഭാഗം 2 — ആദ്യത്തെ ചെറിയ ആശയക്കുഴപ്പം (First Problem)',
      sceneType: 'dialogue',
      situationLine: (b) => `ആദ്യ നിമിഷത്തെ ശാന്തത മാറി, "${b}" എന്നതുമായി ബന്ധപ്പെട്ട് ചെറിയൊരു തർക്കവും ആശയക്കുഴപ്പവും പൊട്ടിപ്പുറപ്പെടുന്നു`,
      cameraHint: 'Two-shot medium frame capturing surprised expressions and gesturing hands',
      visualMotion: 'Crisp pan between faces showing instant confusion and rising disagreement',
    },
    {
      stageTag: 'ഭാഗം 3 — നിശബ്ദ വിഷ്വൽ കോമഡി (No-Dialogue Visual Comedy)',
      sceneType: 'visual-comedy',
      situationLine: () => `സംഭാഷണങ്ങളില്ലാതെ പൂർണ്ണമായും മുഖഭാവങ്ങളും ശരീരചലനങ്ങളും കൊണ്ട് രസകരമായ കുഴപ്പങ്ങൾ സംഭവിക്കുന്നു — വീഴാൻ പോകുന്ന സാധനം പിടിക്കാനുള്ള തത്രപ്പാട്`,
      cameraHint: 'Dynamic medium-low physical comedy frame capturing exaggerated wide eyes, balance slip & prop motion',
      visualMotion: 'Whip-pan slapstick camera rhythm catching awkward leaps, slipping objects, and frozen reaction',
    },
    {
      stageTag: 'ഭാഗം 4 — പുറത്തുനിന്നുള്ള പുതിയ പ്രതിസന്ധി (Escalating Obstacle)',
      sceneType: 'dialogue',
      situationLine: () => `പ്രശ്നം പരിഹരിക്കുന്നതിനിടയിൽ അയൽക്കാരനോ വീട്ടിലെ മറ്റൊരാളോ അപ്രതീക്ഷിതമായി എത്തി സ്ഥിതി കൂടുതൽ വഷളാക്കുന്നു`,
      cameraHint: 'Over-the-shoulder doorway framing with nervous side-glances and hidden mess behind back',
      visualMotion: 'Steadicam push-in as character tries desperately to hide chaos while talking politely',
    },
    {
      stageTag: 'ഭാഗം 5 — തന്ത്രം പാളിപ്പോകുന്ന വഴിത്തിരിവ് (Backfired Plan / Visual Gag)',
      sceneType: 'visual-comedy',
      situationLine: () => `കുഴപ്പം മറയ്ക്കാൻ നടത്തിയ ബുദ്ധിപരമായ ശ്രമം വിപരീതഫലം നൽകുന്നു — മറ്റൊരു സാധനം തട്ടിമറിഞ്ഞ് രഹസ്യം പുറത്താകാൻ തുടങ്ങുന്നു`,
      cameraHint: 'Tight close-up insert cut on spilling prop followed by shocked deadpan reaction still',
      visualMotion: 'Fast rack-focus from tumbling object to silent jaw-drop close-up expression',
    },
    {
      stageTag: 'ഭാഗം 6 — ഏറ്റവും രസകരമായ ഉച്ചസ്ഥായി (Peak Comedic Chaos)',
      sceneType: 'dialogue',
      situationLine: () => `എല്ലാവരുടെയും തെറ്റിദ്ധാരണകൾ ഒന്നിച്ചു കൂട്ടിയിടിച്ച് വലിയ കോലാഹലവും വേഗതയേറിയ മറുപടികളും നിറഞ്ഞ ക്ലൈമാക്സ് നിമിഷം`,
      cameraHint: 'Energetic wide interior shot with multiple characters reacting in completely different directions',
      visualMotion: 'Rapid handheld tracking circling characters mid-argument with animated comedic timing',
    },
    {
      stageTag: 'ഭാഗം 7 — ഹൃദ്യമായ മാറ്റവും തിരിച്ചറിവും (Unexpected Turning Point)',
      sceneType: 'visual-comedy',
      situationLine: () => `ബഹളത്തിനിടയിൽ നിശബ്ദമായി സംഭവിക്കുന്നൊരു ചെറിയ നല്ല പ്രവൃത്തി അല്ലെങ്കിൽ അപ്രതീക്ഷിത തെളിവ് എല്ലാവരുടെയും മനസ്സ് മാറ്റുന്നു`,
      cameraHint: 'Soft golden close-up capturing gentle eye contact, small helpful gesture & warm atmospheric light',
      visualMotion: 'Slow gentle push-in dissolving tension into silent warmth and genuine smile',
    },
    {
      stageTag: 'ഭാഗം 8 — സന്തോഷകരമായ അന്ത്യം (Satisfying Conclusion)',
      sceneType: 'dialogue',
      situationLine: () => `എല്ലാ പ്രശ്നങ്ങളും ചിരിയോടും സ്നേഹത്തോടും കൂടി ഒത്തുതീർപ്പാകുന്നു — പുതിയ തുടക്കത്തോടെ മനോഹരമായ ഫൈനൽ പഞ്ച്‌ലൈൻ`,
      cameraHint: 'Warm wide pull-back framing everyone together comfortably in golden closing light',
      visualMotion: 'Smooth crane pull-out leaving the characters smiling warmly in harmonious closure',
    },
  ],
  en: [
    {
      stageTag: 'Part 1 — Introduction & Unexpected Arrival',
      sceneType: 'dialogue',
      situationLine: (b) => `${b} — Opening scene establishes the home/setting cleanly as an unexpected visitor or event arrives`,
      cameraHint: 'Wide 35mm establishing still showcasing characters, environment props & opening atmosphere',
      visualMotion: 'Smooth steady dolly-in introducing the lead character and spatial geography',
    },
    {
      stageTag: 'Part 2 — First Situational Mix-Up',
      sceneType: 'dialogue',
      situationLine: (b) => `Initial calm breaks immediately around "${b}" as an awkward misunderstanding sparks the first disagreement`,
      cameraHint: 'Medium two-shot keyframe capturing raised eyebrows and contrasting body language',
      visualMotion: 'Quick responsive pan between speakers highlighting comic disbelief',
    },
    {
      stageTag: 'Part 3 — Pure Visual Comedy Beat (Silent Gag)',
      sceneType: 'visual-comedy',
      situationLine: () => `Pure physical comedy with zero spoken words — a clumsy attempt to manage the situation turns into hilarious silent chaos`,
      cameraHint: 'Wide-angle physical comedy keyframe showing mid-air prop slip, awkward crouch & frozen panic',
      visualMotion: 'Zippy Steadicam follow with comic whip-pan catching silent pratfalls and wide-eyed glances',
    },
    {
      stageTag: 'Part 4 — Second Escalating Problem (Outsider Arrives)',
      sceneType: 'dialogue',
      situationLine: () => `Right as things look manageable, a neighbor, elder, or unexpected guest knocks at the worst possible second`,
      cameraHint: 'Over-the-shoulder doorway framing contrasting polite smile in front with hidden mess behind',
      visualMotion: 'Subtle push-in as protagonist nervously blocks view while improvising an excuse',
    },
    {
      stageTag: 'Part 5 — Clever Fix Backfires (Visual Twist)',
      sceneType: 'visual-comedy',
      situationLine: () => `A sneaky quick-fix backfires silently in front of everyone — a hidden detail or spilled object exposes the cover-up`,
      cameraHint: 'Macro close-up insert frame on collapsing prop shifting smoothly to deadpan reaction',
      visualMotion: 'Crisp rack-focus from falling prop directly to stunned silent facial close-up',
    },
    {
      stageTag: 'Part 6 — Peak Chaos & Cross-Talk Climax',
      sceneType: 'dialogue',
      situationLine: () => `Every misunderstanding collides at once into rapid-fire banter, mistaken assumptions, and peak comedic mayhem`,
      cameraHint: 'Dynamic ensemble wide frame capturing overlapping reactions across the room',
      visualMotion: 'Energetic handheld tracking weaving rapidly between gesturing characters',
    },
    {
      stageTag: 'Part 7 — Unexpected Heartwarming Turn (Silent Emotion)',
      sceneType: 'visual-comedy',
      situationLine: () => `In the quiet pause after the storm, a genuinely sweet or clever silent gesture wins everyone over completely`,
      cameraHint: 'Intimate warm close-up illuminated by soft side key light highlighting sincere expression',
      visualMotion: 'Slow emotional dolly-in melting tension into quiet tenderness and laughter',
    },
    {
      stageTag: 'Part 8 — Warm Resolution & Closing Punchline',
      sceneType: 'dialogue',
      situationLine: () => `All problems resolve happily with a charming final twist and memorable closing smile that ties back to Part 1`,
      cameraHint: 'Balanced wide closing keyframe uniting every character cleanly inside warm ambient light',
      visualMotion: 'Graceful pull-back tracking out as laughter settles into a satisfying ending beat',
    },
  ],
  hi: [
    {
      stageTag: 'भाग 1 — शुरुआत और अचानक प्रवेश',
      sceneType: 'dialogue',
      situationLine: (b) => `${b} — कहानी की स्पष्ट शुरुआत और मुख्य माहौल का परिचय`,
      cameraHint: 'Wide establishing 35mm frame introducing character and home setting',
      visualMotion: 'Smooth slow dolly-in establishing setting and movement',
    },
    {
      stageTag: 'भाग 2 — पहली गलतफहमी और उलझन',
      sceneType: 'dialogue',
      situationLine: (b) => `"${b}" को लेकर अचानक पहली मज़ेदार बहस और गलतफहमी शुरू होती है`,
      cameraHint: 'Medium two-shot showing puzzled expressions',
      visualMotion: 'Crisp pan capturing confused dialogue exchange',
    },
    {
      stageTag: 'भाग 3 — बिना डायलॉग विज़ुअल कॉमेडी',
      sceneType: 'visual-comedy',
      situationLine: () => `बिना एक शब्द बोले चेहरे के भाव और हरकतों से मज़ेदार भागदौड़ और चीज़ें गिरने का सिलसिला`,
      cameraHint: 'Dynamic physical comedy wide frame',
      visualMotion: 'Lively Steadicam chase catching slapstick reactions',
    },
    {
      stageTag: 'भाग 4 — नई मुसीबत और मेहमान की एंट्री',
      sceneType: 'dialogue',
      situationLine: () => `मुसीबत संभालते ही अचानक पड़ोसी या घर के किसी बड़े के आने से स्थिति और बिगड़ जाती है`,
      cameraHint: 'Doorway over-the-shoulder tense comic framing',
      visualMotion: 'Push-in while hiding chaos behind back politely',
    },
    {
      stageTag: 'भाग 5 — तरकीब उल्टी पड़ने वाला ट्विस्ट',
      sceneType: 'visual-comedy',
      situationLine: () => `हालात छुपाने की चालाकी चुपचाप उल्टी पड़ जाती है और राज़ सामने आने लगता है`,
      cameraHint: 'Tight close-up on falling prop and stunned reaction',
      visualMotion: 'Rack-focus from accident to silent wide-eyed shock',
    },
    {
      stageTag: 'भाग 6 — कॉमेडी का चरम और हंगामा',
      sceneType: 'dialogue',
      situationLine: () => `सारी गलतफहमियाँ एक साथ टकराती हैं और ज़ोरदार कॉमेडी हंगामा खड़ा होता है`,
      cameraHint: 'Energetic group wide frame with animated poses',
      visualMotion: 'Handheld tracking circling chaotic reactions',
    },
    {
      stageTag: 'भाग 7 — दिल छू लेने वाला मोड़',
      sceneType: 'visual-comedy',
      situationLine: () => `शोर थमते ही एक प्यारी और चुपचाप की गई अच्छी हरकत सबका दिल जीत लेती है`,
      cameraHint: 'Warm close-up in golden light showing gentle smile',
      visualMotion: 'Slow heartfelt push-in turning chaos to warmth',
    },
    {
      stageTag: 'भाग 8 — खुशनुमा अंत और पंचलाइन',
      sceneType: 'dialogue',
      situationLine: () => `सारी मुश्किलें हल होकर हंसी-खुशी के साथ कहानी मज़ेदार अंदाज़ में समाप्त होती है`,
      cameraHint: 'Warm closing wide shot together',
      visualMotion: 'Smooth pull-back ending on smiling faces',
    },
  ],
  ta: [
    { stageTag: 'பகுதி 1 — அறிமுகம் & திடீர் வருகை', sceneType: 'dialogue', situationLine: (b) => `${b} — கதை அமைதியான சூழலில் சுவாரஸ்யமாகத் தொடங்குகிறது`, cameraHint: 'Wide 35mm establishing still', visualMotion: 'Smooth slow dolly-in' },
    { stageTag: 'பகுதி 2 — முதல் குழப்பம்', sceneType: 'dialogue', situationLine: (b) => `"${b}" காரணமாக எதிர்பாராத சிறு வாக்குவாதமும் குழப்பமும் ஏற்படுகிறது`, cameraHint: 'Two-shot reaction framing', visualMotion: 'Responsive pan between faces' },
    { stageTag: 'பகுதி 3 — வசனமில்லா விஷுவல் காமெடி', sceneType: 'visual-comedy', situationLine: () => `வசனம் இன்றி முகபாவங்களும் உடல் அசைவுகளும் நிறைந்த நகைச்சுவை கலாட்டா`, cameraHint: 'Physical comedy wide still', visualMotion: 'Whip-pan slapstick tracking' },
    { stageTag: 'பகுதி 4 — புதிய சிக்கல் & விருந்தினர் வருகை', sceneType: 'dialogue', situationLine: () => `நிலைமையை சமாளிக்கும் நேரத்தில் அண்டை வீட்டாரின் திடீர் வருகையால் புதிய சிக்கல்`, cameraHint: 'Doorway over-the-shoulder frame', visualMotion: 'Tense comic push-in' },
    { stageTag: 'பகுதி 5 — திட்டம் சொதப்பும் திருப்பம்', sceneType: 'visual-comedy', situationLine: () => `ரகசியத்தை மறைக்க செய்த தந்திரம் அமைதியாக சொதப்பி மாட்டிக்கொள்ளும் தருணம்`, cameraHint: 'Tight macro detail + shock close-up', visualMotion: 'Rack-focus comedic reveal' },
    { stageTag: 'பகுதி 6 — உச்சகட்ட நகைச்சுவை குழப்பம்', sceneType: 'dialogue', situationLine: () => `அனைத்து குழப்பங்களும் ஒன்றாக மோதி உச்சகட்ட நகைச்சுவை கலாட்டா வெடிக்கிறது`, cameraHint: 'Ensemble room-wide reaction shot', visualMotion: 'Energetic handheld tracking' },
    { stageTag: 'பகுதி 7 — மனதை மாற்றும் நெகிழ்ச்சித் திருப்பம்', sceneType: 'visual-comedy', situationLine: () => `குழப்பத்திற்கு நடுவே நடக்கும் ஒரு அழகான செயலால் அனைவரின் மனமும் மாறுகிறது`, cameraHint: 'Warm close-up keyframe', visualMotion: 'Slow emotional dolly-in' },
    { stageTag: 'பகுதி 8 — இனிமையான முடிவு', sceneType: 'dialogue', situationLine: () => `சிக்கல்கள் எல்லாம் தீர்ந்து சிரிப்பும் மகிழ்ச்சியுமாக கதை நிறைவடைகிறது`, cameraHint: 'Warm wide pull-back closing shot', visualMotion: 'Graceful crane pull-out' },
  ],
  kn: [
    { stageTag: 'ಭಾಗ 1 — ಆರಂಭ ಮತ್ತು ಪ್ರವೇಶ', sceneType: 'dialogue', situationLine: (b) => `${b} — ಕಥೆಯ ಸ್ಪಷ್ಟ ಆರಂಭ ಮತ್ತು ಸನ್ನಿವೇಶದ ಪರಿಚಯ`, cameraHint: 'Wide 35mm establishing frame', visualMotion: 'Smooth dolly-in' },
    { stageTag: 'ಭಾಗ 2 — ಮೊದಲ ಗೊಂದಲ', sceneType: 'dialogue', situationLine: (b) => `"${b}" ಸುತ್ತ ಅನಿರೀಕ್ಷಿತ ಗೊಂದಲ ಮತ್ತು ತಮಾಷೆಯ ವಾದ ಶುರುವಾಗುತ್ತದೆ`, cameraHint: 'Medium two-shot reaction', visualMotion: 'Crisp face-to-face pan' },
    { stageTag: 'ಭಾಗ 3 — ಡೈಲಾಗ್ ಇಲ್ಲದ ವಿಷುಯಲ್ ಕಾಮಿಡಿ', sceneType: 'visual-comedy', situationLine: () => `ಮಾತಿಲ್ಲದೆ ಕೇವಲ ಮುಖಭಾವ ಮತ್ತು ದೇಹದ ಚಲನೆಯಿಂದ ನಡೆಯುವ ಹಾಸ್ಯಮಯ ಗಡಿಬಿಡಿ`, cameraHint: 'Dynamic slapstick wide shot', visualMotion: 'Zippy Steadicam tracking' },
    { stageTag: 'ಭಾಗ 4 — ಹೊಸ ತೊಂದರೆ ಮತ್ತು ಅತಿಥಿ', sceneType: 'dialogue', situationLine: () => `ಸಮಸ್ಯೆ ಬಗೆಹರಿಸುವಷ್ಟರಲ್ಲಿ ನೆರೆಯವರ ಅನಿರೀಕ್ಷಿತ ಆಗಮನದಿಂದ ಪರಿಸ್ಥಿತಿ ಇನ್ನಷ್ಟು ಜಟಿಲವಾಗುತ್ತದೆ`, cameraHint: 'Over-the-shoulder doorway shot', visualMotion: 'Subtle comic push-in' },
    { stageTag: 'ಭಾಗ 5 — ಉಪಾಯ ಉಲ್ಟಾ ಆಗುವ ತಿರುವು', sceneType: 'visual-comedy', situationLine: () => `ವಿಷಯ ಮರೆಮಾಚಲು ಮಾಡಿದ ಉಪಾಯ ಸದ್ದಿಲ್ಲದೆ ಉಲ್ಟಾ ಹೊಡೆದು ಹೊಸ ಕಿರಿಕಿರಿ ತರುತ್ತದೆ`, cameraHint: 'Close-up spilling prop + shock', visualMotion: 'Quick rack-focus reaction' },
    { stageTag: 'ಭಾಗ 6 — ಪೀಕ್ ಕಾಮಿಡಿ ಗದ್ದಲ', sceneType: 'dialogue', situationLine: () => `ಎಲ್ಲಾ ತಪ್ಪುಗ್ರಹಿಕೆಗಳು ಒಟ್ಟಿಗೆ ಸೇರಿ ದೊಡ್ಡ ಹಾಸ್ಯಮಯ ಗೊಂದಲ ಸೃಷ್ಟಿಯಾಗುತ್ತದೆ`, cameraHint: 'Ensemble room reaction wide frame', visualMotion: 'Handheld circling camera' },
    { stageTag: 'ಭಾಗ 7 — ಹೃದಯ ಸ್ಪರ್ಶಿಸುವ ತಿರುವು', sceneType: 'visual-comedy', situationLine: () => `ಗದ್ದಲದ ನಡುವೆ ನಡೆದ ಒಂದು ಸಿಹಿ ಘಟನೆ ಎಲ್ಲರ ಮನಸ್ಸನ್ನು ಗೆಲ್ಲುತ್ತದೆ`, cameraHint: 'Soft warm close-up portrait', visualMotion: 'Slow gentle dolly-in' },
    { stageTag: 'ಭಾಗ 8 — ಸಂತೋಷದ ಅಂತ್ಯ', sceneType: 'dialogue', situationLine: () => `ಎಲ್ಲಾ ಸಮಸ್ಯೆಗಳು ನಗುವಿನೊಂದಿಗೆ ಬಗೆಹರಿದು ಕಥೆ ಸುಂದರವಾಗಿ ಮುಕ್ತಾಯವಾಗುತ್ತದೆ`, cameraHint: 'Balanced warm wide finale', visualMotion: 'Smooth pull-back closing shot' },
  ],
  te: [
    { stageTag: 'భాగం 1 — పరిచయం & ఆకస్మిక ప్రవేశం', sceneType: 'dialogue', situationLine: (b) => `${b} — కథ స్పష్టమైన ప్రారంభంతో సహజ వాతావరణంలో మొదలవుతుంది`, cameraHint: 'Wide 35mm establishing frame', visualMotion: 'Smooth dolly-in' },
    { stageTag: 'భాగం 2 — మొదటి అపార్థం', sceneType: 'dialogue', situationLine: (b) => `"${b}" విషయంలో అనుకోని చిన్న అపార్థం తలెత్తి మొదటి గందరగోళం మొదలవుతుంది`, cameraHint: 'Medium two-shot frame', visualMotion: 'Quick pan between expressions' },
    { stageTag: 'భాగం 3 — డైలాగ్ లేని విజువల్ కామెడీ', sceneType: 'visual-comedy', situationLine: () => `మాటలు లేకుండా పూర్తిగా హావభావాలు, శరీర కదలికలతో నవ్వు తెప్పించే గందరగోళ సన్నివేశం`, cameraHint: 'Physical comedy wide angle', visualMotion: 'Whip-pan slapstick motion' },
    { stageTag: 'భాగం 4 — కొత్త చిక్కు & బయటి వ్యక్తి రాక', sceneType: 'dialogue', situationLine: () => `పరిస్థితి చక్కదిద్దేలోపే పొరుగింటి వారు అకస్మాత్తుగా రావడంతో సమస్య మరింత పెరుగుతుంది`, cameraHint: 'Doorway over-the-shoulder frame', visualMotion: 'Nervous push-in' },
    { stageTag: 'భాగం 5 — ప్లాన్ బెడిసికొట్టిన మలుపు', sceneType: 'visual-comedy', situationLine: () => `దాచడానికి చేసిన తెలివైన ప్రయత్నం నిశ్శబ్దంగా బెడిసికొట్టి అసలు విషయం బయటపడబోతుంది`, cameraHint: 'Tight close-up prop + shock still', visualMotion: 'Crisp rack-focus reveal' },
    { stageTag: 'భాగం 6 — క్లైమాక్స్ కామెడీ హంగామా', sceneType: 'dialogue', situationLine: () => `అన్ని అపార్థాలు ఒక్కసారిగా కలిసి సరదా గందరగోళం తారాస్థాయికి చేరుతుంది`, cameraHint: 'Ensemble wide room reaction', visualMotion: 'Energetic handheld tracking' },
    { stageTag: 'భాగం 7 — మనసు మార్చే మధురమైన మలుపు', sceneType: 'visual-comedy', situationLine: () => `అల్లరి మధ్యలో జరిగిన ఒక మంచి పని అందరి మనసులను హత్తుకుని నవ్వు తెప్పిస్తుంది`, cameraHint: 'Warm close-up keyframe', visualMotion: 'Slow tender dolly-in' },
    { stageTag: 'భాగం 8 — సంతోషకరమైన ముగింపు', sceneType: 'dialogue', situationLine: () => `సమస్యలన్నీ పరిష్కారమై అందరూ కలిసి నవ్వుతూ కథ ఆనందంగా ముగుస్తుంది`, cameraHint: 'Warm wide pull-back finale', visualMotion: 'Graceful closing pull-out' },
  ],
};

function defaultDialogueForBeat(lang: AppLang, idx: number): string {
  const byLang: Record<AppLang, string[]> = {
    ml: [
      'ഇതാരാ ഇപ്പോൾ ഇങ്ങോട്ട് വന്നത്... ഒരു നിമിഷം നിൽക്കൂ!',
      'ഞാൻ വിചാരിച്ച പോലെയല്ല കാര്യങ്ങൾ, ഇതാകെ മാറിപ്പോയല്ലോ!',
      'അയ്യോ, ആ മേശയുടെ അടുത്ത് തൊടല്ലേ... വേഗം പിടിക്ക്!',
      'ഹലോ... അകത്തേക്ക് വരൂ, പക്ഷേ അങ്ങോട്ട് മാത്രം നോക്കരുത്!',
      'ഇതെന്താ ഇവിടെ നടന്നത്? ഈ സാധനങ്ങളൊക്കെ ആരാ മറിച്ചിട്ടത്?!',
      'ഇതെല്ലാം നിങ്ങൾ കരുതുന്നത് പോലെയല്ല, സത്യം കേൾക്കൂ!',
      'ഒന്ന് സൂക്ഷിച്ചു നോക്കൂ... ഇവൻ നമ്മളെ സഹായിക്കാനാ വന്നതെന്ന് തോന്നുന്നു!',
      'ഒടുവിൽ ഇതൊരു അടിപൊളി തുടക്കമായല്ലോ... എല്ലാവർക്കും ചിരി വരുന്നു!',
    ],
    en: [
      'Hold on a second... where did that suddenly come from?!',
      'Wait, that is NOT what I thought was going to happen!',
      'Watch out—grab that before it knocks over the whole shelf!',
      'Oh hi! Come right in—just please do not look behind that couch!',
      'Wait a minute... how did my clever plan make things ten times worse?!',
      'Stop talking all at once—let me explain what actually happened!',
      'Hold everything... did you just see what he quietly brought back?',
      'Well, look at us now... honestly, I would not trade this chaos for anything.',
    ],
    hi: [
      'अरे रुको... यह अचानक अंदर कौन आ गया?!',
      'लगता है अब तो पूरी बात ही उलट गई!',
      'अरे संभालो! कहीं वह गुलदस्ता नीचे न गिर जाए!',
      'अरे आइए आइए... बस उधर कोने में मत देखिएगा!',
      'ये क्या गज़ब हो गया? मेरा आसान आइडिया उल्टा पड़ गया!',
      'सब एक साथ मत बोलो, पहले पूरी बात तो सुनो!',
      'एक मिनट रुकिए... ज़रा देखिए तो सही उसने क्या कमाल किया!',
      'आखिरकार सब ठीक हो गया... यह तो सबसे यादगार मोड़ बन गया!',
    ],
    ta: [
      'ஒரு நிமிஷம்... இது எப்படி இங்கே வந்தது?!',
      'நான் நினைத்த மாதிரி இல்லையே, நிலைமை மாறிவிட்டதே!',
      'ஐயோ, அதைப் பிடிங்க... கீழே விழுந்து உடைந்துவிடப் போகிறது!',
      'வாங்க வாங்க... ஆனால் அந்தப் பக்கம் மட்டும் பார்க்காதீங்க!',
      'என்ன நடக்குது இங்கே? நல்ல திட்டம் போட்டால் இப்படி சொதப்பிடுச்சே!',
      'எல்லாரும் ஒரே நேரத்தில் பேசாதீங்க, உண்மையைக் கேளுங்க!',
      'கொஞ்சம் அமைதியா பாருங்க... அவன் செய்த நல்ல காரியத்தைப் பாருங்க!',
      'கடைசியில் எல்லாம் நன்மைக்கே... செம கலகலப்பான முடிவு!',
    ],
    kn: [
      'ಒಂದು ನಿಮಿಷ... ಇದು ಅಚಾನಕ್ಕಾಗಿ ಎಲ್ಲಿಂದ ಬಂತು?!',
      'ನಾನು ಅಂದುಕೊಂಡಂತೆ ಆಗಲಿಲ್ಲ, ಎಲ್ಲವೂ ಬದಲಾಯಿತಲ್ಲ!',
      'ಅಯ್ಯೋ ಬೇಗ ಹಿಡಿ... ಆ ವಸ್ತು ಕೆಳಗೆ ಬಿದ್ದು ಹೋಗುತ್ತದೆ!',
      'ಬನ್ನಿ ಬನ್ನಿ... ಆದರೆ ಆ ಮೂಲೆಯ ಕಡೆ ಮಾತ್ರ ನೋಡಬೇಡಿ!',
      'ಇದೇನಾಯ್ತು ಇಲ್ಲಿ? ನನ್ನ ಉಪಾಯವೇ ಉಲ್ಟಾ ಹೊಡೆಯಿತಲ್ಲ!',
      'ಎಲ್ಲರೂ ಒಟ್ಟಿಗೆ ಮಾತನಾಡಬೇಡಿ, ನಿಜ ಏನೆಂದು ಕೇಳಿ!',
      'ಒಂದು ಕ್ಷಣ ನಿಲ್ಲಿ... ಅವನು ತಂದಿರುವುದನ್ನು ಸ್ವಲ್ಪ ನೋಡಿ!',
      'ಕೊನೆಗೂ ಎಲ್ಲವೂ ಚೆನ್ನಾಗಿ ಮುಗಿಯಿತು... ಅದ್ಭುತ ತಮಾಷೆಯ ಅನುಭವ!',
    ],
    te: [
      'ఒక్క నిమిషం... ఇది అకస్మాత్తుగా ఇక్కడికి ఎలా వచ్చింది?!',
      'నేను అనుకున్నట్టు జరగలేదు, మొత్తం తారుమారైందే!',
      'అయ్యో త్వరగా పట్టుకోండి... అది కింద పడిపోయేలా ఉంది!',
      'రండి రండి... కానీ ఆ మూల వైపు మాత్రం చూడకండి!',
      'ఇదేంటిలా జరిగింది? నా తెలివైన ప్లాన్ మొత్తం తిరగబడిందే!',
      'అందరూ ఒకేసారి మాట్లాడకండి, అసలు నిజం వినండి!',
      'ఒక్క నిమిషం ఆగండి... ఇతను ఏం చేశాడో గమనించండి!',
      'చివరికి అంతా మంచే జరిగింది... భలే సరదాగా ముగిసింది!',
    ],
  };
  const pool = byLang[lang] || byLang.ml;
  return pool[idx % pool.length];
}

export function generateBreakdownLocal(
  script: string,
  preferredShotDuration: number = 8,
  characterPhotos: any[] = [],
  targetShotCount: number = 8,
  lang: AppLang = 'ml',
  dialogueMode: DialogueMode = 'dynamic'
): { title: string; shots: GeneratedShot[] } {
  const numShots = Math.max(1, targetShotCount || 8);
  const pack = DYNAMIC_STORY_PACKS[lang] || DYNAMIC_STORY_PACKS.ml;
  const phasePool = SUB_BEAT_PHASES[lang] || SUB_BEAT_PHASES.ml;
  const arcBlueprints = EIGHT_PART_ARC_BEATS[lang] || EIGHT_PART_ARC_BEATS.ml;
  const cleanScript = (script || '').trim();
  const storyBeats = splitStorySentences(cleanScript);
  const effectiveBeats = storyBeats.length > 0 ? storyBeats : [cleanScript];

  const effectiveMode: DialogueMode = isExplicitlySilent(cleanScript) ? 'silent' : dialogueMode;
  const hasPhotos = Array.isArray(characterPhotos) && characterPhotos.length > 0;
  const continuityTag = hasPhotos
    ? 'Strict Character Face ID, Clothing, Prop & Lighting Continuity Locked to Reference Photo'
    : 'Exact Subject Face, Clothing, Key Props & Location Atmosphere Continuous From Shot 01';

  const lightingPhases = [
    'soft morning-warm directional key light with natural ambient depth',
    'balanced volumetric indoor light and crisp facial contrast',
    'bright energetic comedy fill light emphasizing physical movement & props',
    'doorway contrast rim light separating foreground tension from background',
    'dramatic shadow-play bounce highlighting sudden reaction beat',
    'vivid multi-point ensemble lighting keeping every character sharp',
    'warm golden sunset glow softening emotional atmosphere',
    'clean harmonious cinematic key light bringing story full circle',
  ];

  const usedDialogues = new Set<string>();

  const shots: GeneratedShot[] = Array.from({ length: numShots }, (_, idx) => {
    const shotNum = idx + 1;
    const arcIdx = Math.min(arcBlueprints.length - 1, Math.floor((idx * arcBlueprints.length) / numShots));
    const arc = arcBlueprints[arcIdx];
    const beatIndex = Math.min(effectiveBeats.length - 1, Math.floor((idx * effectiveBeats.length) / numShots));
    const rawBeat = effectiveBeats[beatIndex] || cleanScript;
    const beatText = rawBeat.replace(/[.।!?]+$/g, '').trim() || rawBeat;
    const subPhase = phasePool[idx % phasePool.length];
    const cameraStyle = pack.shotCameraFocus[idx % pack.shotCameraFocus.length];
    const lightStyle = lightingPhases[idx % lightingPhases.length];
    const bgmCue = buildShotBgmCue(beatText, idx, numShots);

    let dialogueLine = '';
    if (effectiveMode === 'dialogue') {
      const candidate = extractDialogueIfPresent(beatText) || defaultDialogueForBeat(lang, idx);
      if (candidate && !usedDialogues.has(candidate)) {
        dialogueLine = candidate;
        usedDialogues.add(candidate);
      } else {
        for (let offset = 1; offset <= 10; offset++) {
          const alt = defaultDialogueForBeat(lang, idx + offset);
          if (alt && !usedDialogues.has(alt)) {
            dialogueLine = alt;
            usedDialogues.add(alt);
            break;
          }
        }
      }
    } else if (effectiveMode === 'dynamic') {
      if (arc.sceneType === 'dialogue') {
        const candidate = extractDialogueIfPresent(beatText) || defaultDialogueForBeat(lang, idx);
        if (candidate && !usedDialogues.has(candidate)) {
          dialogueLine = candidate;
          usedDialogues.add(candidate);
        } else {
          for (let offset = 1; offset <= 10; offset++) {
            const alt = defaultDialogueForBeat(lang, idx + offset);
            if (alt && !usedDialogues.has(alt)) {
              dialogueLine = alt;
              usedDialogues.add(alt);
              break;
            }
          }
        }
      } else {
        // Explicit No-Dialogue / Visual Comedy scene!
        dialogueLine = '';
      }
    }

    const distinctAction = `${arc.stageTag}: ${arc.situationLine(beatText)}${
      idx >= arcBlueprints.length ? ` (${subPhase.actionSuffix(shotNum, numShots)})` : ''
    }`;

    const imagePrompt = `[PHOTO KEYFRAME PROMPT — SHOT ${shotNum.toString().padStart(2, '0')}]: Photorealistic 35mm static film frame (${arc.stageTag}). Framing: ${arc.cameraHint} (${cameraStyle}). Continuity Lock: ${continuityTag}. Lighting: ${lightStyle}, 8k crisp detail, no text overlays.`;

    const audioInstruction = dialogueLine
      ? `Spoken Dialogue (${lang.toUpperCase()}): "${dialogueLine}". Background Music & SFX: ${bgmCue}`
      : `NO DIALOGUE / VISUAL COMEDY BEAT: Express story purely through physical action, facial timing, and ambient SFX. Background Music & SFX: ${bgmCue}`;

    const videoPrompt = `[VIDEO MOTION PROMPT — SHOT ${shotNum.toString().padStart(2, '0')}]: Continuous 24fps sequence${
      shotNum > 1 ? ` seamlessly following Shot ${(shotNum - 1).toString().padStart(2, '0')}` : ''
    }. Visual Beat: ${arc.situationLine(beatText)}. Motion & Camera: ${arc.visualMotion}. Continuity Lock: ${continuityTag}. ${audioInstruction} Duration: ${preferredShotDuration}s.`;

    return {
      shotNumber: shotNum,
      durationSeconds: preferredShotDuration,
      timing: `Shot ${shotNum.toString().padStart(2, '0')} — ${preferredShotDuration}s`,
      action: distinctAction,
      characters: [deriveSubjectLabel(beatText, lang)],
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
    title: '8-Part Unique Variety Breakdown',
    shots,
  };
}

/**
 * Expands AI-generated core story shots cleanly while ensuring EVERY single shot
 * has distinct framing/action progression, zero repeated dialogue lines, separate photo vs video prompts,
 * locked continuity, BGM progression, and respects DialogueMode ('dynamic' | 'dialogue' | 'silent').
 */
export function expandShotsToTargetCount(
  coreShots: GeneratedShot[],
  targetShotCount: number,
  preferredShotDuration: number,
  allowDialogue: boolean,
  lang: AppLang = 'ml',
  dialogueMode: DialogueMode = 'dynamic'
): GeneratedShot[] {
  if (!coreShots || coreShots.length === 0) return [];
  const total = Math.max(1, targetShotCount);
  const pack = DYNAMIC_STORY_PACKS[lang] || DYNAMIC_STORY_PACKS.ml;
  const phasePool = SUB_BEAT_PHASES[lang] || SUB_BEAT_PHASES.ml;
  const effectiveMode: DialogueMode = !allowDialogue ? 'silent' : dialogueMode;
  const seenDialogues = new Set<string>();

  if (coreShots.length >= total) {
    return coreShots.slice(0, total).map((shot, idx) => {
      const shotNum = idx + 1;
      const padded = shotNum.toString().padStart(2, '0');
      let cleanedDialogue = '';
      if (effectiveMode !== 'silent') {
        const raw = (shot.malayalamDialogue || '').trim();
        const isVisualSilentBeat = effectiveMode === 'dynamic' && raw.length === 0;
        if (!isVisualSilentBeat && raw && !seenDialogues.has(raw.toLowerCase())) {
          cleanedDialogue = raw;
          seenDialogues.add(raw.toLowerCase());
        } else if (effectiveMode === 'dialogue' && (!raw || seenDialogues.has(raw.toLowerCase()))) {
          for (let offset = 0; offset <= 10; offset++) {
            const fresh = defaultDialogueForBeat(lang, idx + offset);
            if (fresh && !seenDialogues.has(fresh.toLowerCase())) {
              cleanedDialogue = fresh;
              seenDialogues.add(fresh.toLowerCase());
              break;
            }
          }
        }
      }

      const bgmCue = shot.bgm || buildShotBgmCue(shot.action || '', idx, total);
      const continuityLock =
        shot.continuity ||
        `Consistent face, clothing, props & environment light continuous from Shot ${Math.max(1, idx).toString().padStart(2, '0')}`;

      const sanitizedVideo =
        cleanedDialogue.length === 0 && shot.videoPrompt
          ? shot.videoPrompt
              .replace(/Spoken Dialogue\s*\([^)]*\)\s*:\s*["“][^"”]*["”]\.?/gi, `NO DIALOGUE / VISUAL COMEDY: ${pack.silentAudioNote}`)
              .replace(/^\[VIDEO MOTION PROMPT[^\]]*\]:/i, `[VIDEO MOTION PROMPT — SHOT ${padded}]:`)
          : shot.videoPrompt
          ? shot.videoPrompt.replace(/^\[VIDEO MOTION PROMPT[^\]]*\]:/i, `[VIDEO MOTION PROMPT — SHOT ${padded}]:`)
          : undefined;

      const sanitizedImage = shot.imagePrompt
        ? shot.imagePrompt.replace(/^\[(?:PHOTO KEYFRAME PROMPT|IMAGE GENERATION PROMPT)[^\]]*\]:/i, `[PHOTO KEYFRAME PROMPT — SHOT ${padded}]:`)
        : undefined;

      return {
        ...shot,
        shotNumber: shotNum,
        durationSeconds: preferredShotDuration,
        timing: `Shot ${padded} — ${preferredShotDuration}s`,
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
    const coreIdx = Math.min(coreShots.length - 1, Math.floor((idx * coreShots.length) / total));
    const base = coreShots[coreIdx];
    const subPhase = phasePool[idx % phasePool.length];
    const cameraVariant = pack.shotCameraFocus[(idx + coreIdx) % pack.shotCameraFocus.length];

    const isPrimaryBeatClip =
      idx === 0 || Math.floor(((idx - 1) * coreShots.length) / total) !== coreIdx;

    let rawDialogue = '';
    if (effectiveMode !== 'silent' && isPrimaryBeatClip) {
      const candidate = (base.malayalamDialogue || '').trim();
      if (candidate && !seenDialogues.has(candidate.toLowerCase())) {
        rawDialogue = candidate;
        seenDialogues.add(candidate.toLowerCase());
      }
    }

    const bgmCue =
      isPrimaryBeatClip && base.bgm
        ? base.bgm
        : buildShotBgmCue(base.action || '', idx, total);
    const continuityLock =
      base.continuity ||
      `Consistent subject face, outfit, props & atmosphere continuous from Shot ${Math.max(1, idx).toString().padStart(2, '0')}`;

    const cleanBaseImage = (base.imagePrompt || '')
      .replace(/^\[(?:IMAGE GENERATION PROMPT|PHOTO KEYFRAME PROMPT)[^\]]*\]:\s*/i, '')
      .trim();
    const cleanBaseVideo = (
      effectiveMode === 'silent' || !rawDialogue
        ? (base.videoPrompt || '').replace(/Spoken Dialogue[^.]*\.?/gi, pack.silentAudioNote)
        : base.videoPrompt || ''
    )
      .replace(/^\[(?:VIDEO GENERATION PROMPT|VIDEO MOTION PROMPT)[^\]]*\]:\s*/i, '')
      .trim();

    const stepLabel = isPrimaryBeatClip
      ? base.action
      : `${base.action} (${subPhase.actionSuffix(shotNum, total)})`;

    const imagePrompt = isPrimaryBeatClip && cleanBaseImage
      ? `[PHOTO KEYFRAME PROMPT — SHOT ${shotNum.toString().padStart(2, '0')}]: ${cleanBaseImage} Continuity Lock: ${continuityLock}.`
      : `[PHOTO KEYFRAME PROMPT — SHOT ${shotNum.toString().padStart(2, '0')}]: Photorealistic 35mm static film frame. Framing: ${cameraVariant}. Pose & Detail: ${subPhase.photoPose} during beat "${base.action}". Continuity Lock: ${continuityLock}. No text overlays.`;

    const videoPrompt = isPrimaryBeatClip && cleanBaseVideo
      ? `[VIDEO MOTION PROMPT — SHOT ${shotNum.toString().padStart(2, '0')}]: ${cleanBaseVideo}`
      : `[VIDEO MOTION PROMPT — SHOT ${shotNum.toString().padStart(2, '0')}]: Smooth 24fps continuous motion following Shot ${(shotNum - 1).toString().padStart(2, '0')}. Camera & Action: ${subPhase.videoMotion} (${cameraVariant}) depicting ${base.action}. Continuity Lock: ${continuityLock}. ${rawDialogue ? `Spoken Dialogue (${lang.toUpperCase()}): "${rawDialogue}".` : `NO DIALOGUE / VISUAL COMEDY: ${pack.silentAudioNote}`} Background Music & SFX: ${bgmCue} Duration: ${preferredShotDuration}s.`;

    return {
      shotNumber: shotNum,
      durationSeconds: preferredShotDuration,
      timing: `Shot ${shotNum.toString().padStart(2, '0')} — ${preferredShotDuration}s`,
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
