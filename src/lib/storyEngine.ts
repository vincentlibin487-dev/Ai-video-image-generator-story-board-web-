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

interface GenreExpansionArc {
  titleTag: string;
  mood: string;
  characters: string;
  situation1: string;
  situation2: string;
  climaxEnding: string;
}

type ExpansionPackByGenre = Record<GenreKey, [GenreExpansionArc, GenreExpansionArc]>;

const STORY_EXPANSION_BLUEPRINTS: Record<AppLang, ExpansionPackByGenre> = {
  ml: {
    thriller: [
      {
        titleTag: 'രഹസ്യ ഡയറിയും പിന്തുടരലും',
        mood: 'Suspenseful Mystery • Clues & Tension',
        characters: 'പ്രധാന കഥാപാത്രം, ദുരൂഹ യാത്രികൻ കാർത്തിക്, സബ് ഇൻസ്പെക്ടർ അർജുൻ',
        situation1: 'പരിഭ്രമത്തിനിടയിൽ മുന്നിൽ നിന്ന അജ്ഞാതനായ കാർത്തിക് പെട്ടെന്ന് ഒരു പഴയ ലോക്ക് ചെയ്ത ഡയറിയും താക്കോലും താഴെയിട്ട് ഇരുട്ടിലേക്ക് ഓടിമറയുന്നു.',
        situation2: 'അത് തിരികെ കൊടുക്കാനായി പിന്നാലെ പോകുമ്പോൾ ഇൻസ്പെക്ടർ അർജുനും കറുത്ത വാനിൽ എത്തുന്ന ഒരു അക്രമി സംഘവും അതേ സാധനത്തിനായി തിരച്ചിൽ നടത്തുന്നതായി മനസ്സിലാകുന്നു.',
        climaxEnding: 'ഒടുവിൽ ചതിക്കുഴികൾ മറികടന്ന് ഡയറിയിലെ തെളിവ് പോലീസിന് കൈമാറുന്നതോടെ വലിയൊരു ക്രിമിനൽ സംഘം കുടുങ്ങുകയും എല്ലാവരും സുരക്ഷിതരാവുകയും ചെയ്യുന്നു.',
      },
      {
        titleTag: 'അവസാന ബസിലെ നിഗൂഢത',
        mood: 'Psychological Thriller • Hidden Truth',
        characters: 'പ്രധാന കഥാപാത്രം, അയൽക്കാരി ലത, പുരാവസ്തു ഗവേഷകൻ ഡോ. മേനോൻ',
        situation1: 'ഭയത്തോടെ മാറിനിൽക്കുന്നതിനിടയിൽ അയൽക്കാരിയായ ലത വിളിച്ചുപറയുന്ന ഒരു അടിയന്തര മുന്നറിയിപ്പ് കാര്യങ്ങൾ കൂടുതൽ സങ്കീർണ്ണമാക്കുന്നു.',
        situation2: 'ഡോ. മേനോൻ സൂക്ഷിച്ചിരുന്ന പഴയ നാണയപ്പെട്ടിയും രാത്രിയിലെ വൈദ്യുതി മുടക്കവും കൂടി എത്തുന്നതോടെ ആ സ്ഥലത്ത് മറ്റൊരാൾ കൂടി ഒളിച്ചിരിപ്പുണ്ടെന്ന് വ്യക്തമാകുന്നു.',
        climaxEnding: 'ധൈര്യം സംഭരിച്ച് വിളക്ക് തെളിയിക്കുമ്പോൾ വർഷങ്ങൾ പഴക്കമുള്ളൊരു തെറ്റിദ്ധാരണയുടെ ചുരുളഴിയുകയും യഥാർത്ഥ കുറ്റവാളിയെ പിടികൂടുകയും ചെയ്യുന്നു.',
      },
    ],
    drama: [
      {
        titleTag: 'മറന്നുപോയ കത്തും കൂടിച്ചേരലും',
        mood: 'Heartfelt Emotional • Family Ties',
        characters: 'പ്രധാന കഥാപാത്രം, വൃദ്ധനായ പോസ്റ്റ്മാൻ രാഘവൻ, സഹോദരി ദേവിക',
        situation1: 'ആദ്യത്തെ അമ്പരപ്പ് മാറുമ്പോൾ മുന്നിൽ നിൽക്കുന്നത് വർഷങ്ങളായി കാണാതിരുന്ന പോസ്റ്റ്മാൻ രാഘവനാണെന്നും അദ്ദേഹത്തിന്റെ കയ്യിൽ ദേവികയുടെ ഒരു പഴയ കത്തുണ്ടെന്നും തിരിച്ചറിയുന്നു.',
        situation2: 'കുടുംബത്തിലെ പഴയ പിണക്കങ്ങളും സാമ്പത്തിക ബുദ്ധിമുട്ടുകളും കാരണം ഇത്രയും കാലം കൈമാറാതെ പോയ ആ സത്യം തുറന്നുപറയുമ്പോൾ വൈകാരികമായ ഒരു പ്രതിസന്ധി ഉടലെടുക്കുന്നു.',
        climaxEnding: 'കണ്ണീരിനിടയിലും എല്ലാവരും പരസ്പരം മാപ്പ് നൽകുകയും തകർന്നുപോയ ആ കുടുംബബന്ധം വീണ്ടും സ്നേഹത്തോടെ ഒന്നിക്കുകയും ചെയ്യുന്നു.',
      },
      {
        titleTag: 'മഴക്കാലത്തെ വാഗ്ദാനം',
        mood: 'Touching Drama • Quiet Sacrifice',
        characters: 'പ്രധാന കഥാപാത്രം, അമ്മ ലക്ഷ്മി, ബാല്യകാല സുഹൃത്ത് രോഹൻ',
        situation1: 'പ്രശ്നത്തിൽ നിന്ന് ഒഴിഞ്ഞുമാറാൻ ശ്രമിക്കുന്നതിനിടയിൽ അമ്മ ലക്ഷ്മിയുടെ ആരോഗ്യവാർത്തയും സുഹൃത്ത് രോഹന്റെ അപ്രതീക്ഷിത വരവും പുതിയൊരു ഉത്തരവാദിത്തം ഏൽപ്പിക്കുന്നു.',
        situation2: 'സ്വന്തം സ്വപ്നവും കുടുംബത്തിന്റെ ആവശ്യവും തമ്മിലുള്ള വലിയൊരു ആത്മസംഘർഷത്തിനൊടുവിൽ കടുത്തൊരു തീരുമാനം എടുക്കേണ്ടി വരുന്നു.',
        climaxEnding: 'സ്വന്തം കഴിവ് ഉപയോഗിച്ച് പ്രതിസന്ധി മറികടക്കുമ്പോൾ അമ്മയുടെ മുഖത്ത് അഭിമാനവും പ്രത്യാശയും നിറയുന്ന ഹൃദ്യമായൊരു അന്ത്യമാകുന്നു.',
      },
    ],
    action: [
      {
        titleTag: 'രാത്രിയിലെ ഹൈ-സ്പീഡ് രക്ഷപ്പെടൽ',
        mood: 'High-Octane Action • Adrenaline Chase',
        characters: 'പ്രധാന കഥാപാത്രം, രഹസ്യ ഏജന്റ് വിക്രം, ഹാക്കർ പ്രിയ',
        situation1: 'പ്രശ്നം തുടങ്ങിയ തൊട്ടടുത്ത നിമിഷം പരിക്കേറ്റ ഏജന്റ് വിക്രം രഹസ്യ ചിപ്പ് കൈമാറി ബൈക്കിൽ വരുന്ന അക്രമികളിൽ നിന്ന് രക്ഷപ്പെടാൻ സഹായം തേടുന്നു.',
        situation2: 'തകർന്ന പാലത്തിലൂടെയും തിരക്കേറിയ മാർക്കറ്റിലൂടെയും പ്രിയയുടെ ഫോൺ നിർദ്ദേശങ്ങൾ പിന്തുടർന്ന് സാഹസികമായൊരു ഓട്ടവും ചെറുത്തുനിൽപ്പും നടക്കുന്നു.',
        climaxEnding: 'അവസാന പോരാട്ടത്തിൽ ശത്രുക്കളെ കീഴടക്കി രഹസ്യ വിവരങ്ങൾ സുരക്ഷിത കേന്ദ്രത്തിൽ എത്തിക്കുന്നതോടെ മിഷൻ വിജയിക്കുന്നു.',
      },
      {
        titleTag: 'അവസാന ചെക്ക്പോസ്റ്റ്',
        mood: 'Mass Action • Heroic Defense',
        characters: 'പ്രധാന കഥാപാത്രം, ഫോറസ്റ്റ് ഗൈഡ് ശങ്കർ, കള്ളക്കടത്തു സംഘം',
        situation1: 'പ്രതിസന്ധിയിൽ പതറാതെ നിൽക്കുമ്പോൾ പരിചയസമ്പന്നനായ ഗൈഡ് ശങ്കർ അപകടമേഖലയിലേക്കുള്ള കുറുക്കുവഴി അടയ്ക്കാൻ കൂടെച്ചേരുന്നു.',
        situation2: 'ജീപ്പിന്റെ ബ്രേക്ക് നഷ്ടപ്പെടുകയും കള്ളക്കടത്തുകാർ വഴി തടയുകയും ചെയ്യുമ്പോൾ ആയുധങ്ങളില്ലാതെ ചുറ്റുമുള്ള വസ്തുക്കൾ ഉപയോഗിച്ച് നേരിടേണ്ടി വരുന്നു.',
        climaxEnding: 'പുലർച്ചെയോടെ ശത്രുക്കളെയെല്ലാം തകർത്ത് നാട്ടുകാർക്ക് മുന്നിൽ യഥാർത്ഥ ഹീറോയായി തിരിച്ചെത്തുന്നു.',
      },
    ],
    folk: [
      {
        titleTag: 'കാവിലെ മൺചിരാതിന്റെ രഹസ്യം',
        mood: 'Atmospheric Folk • Eerie Mystery',
        characters: 'പ്രധാന കഥാപാത്രം, കാവിലെ കാവൽക്കാരൻ കേളുപ്പണിക്കർ, ഗവേഷക അനന്യ',
        situation1: 'ഭയന്ന് പിന്തിരിഞ്ഞ നിമിഷം കയ്യിലൊരു പഴയ ഓട്ടുവിളക്കുമായി കാവൽക്കാരൻ കേളുപ്പണിക്കർ പ്രത്യക്ഷപ്പെട്ട് ആൽമരത്തിനപ്പുറത്തേക്ക് പോകരുതെന്ന് മുന്നറിയിപ്പ് നൽകുന്നു.',
        situation2: 'ചരിത്ര ഗവേഷക അനന്യയോടൊപ്പം പഴയ ശിലാലിഖിതങ്ങൾ പരിശോധിക്കുമ്പോൾ നൂറ്റാണ്ടുകൾക്ക് മുൻപ് മറച്ചുവെച്ചൊരു നിധിശാപത്തിന്റെ സൂചന ലഭിക്കുന്നു.',
        climaxEnding: 'അർദ്ധരാത്രിയിലെ ആചാരപ്പുകയ്ക്കിടയിലൂടെ യഥാർത്ഥ രഹസ്യം കണ്ടെത്തുന്നതോടെ ഗ്രാമത്തെ വിഴുങ്ങിയ ഭയം എന്നെന്നേക്കുമായി നീങ്ങുന്നു.',
      },
      {
        titleTag: 'പഴയ നാലുകെട്ടിലെ നിഴൽ',
        mood: 'Supernatural Mystery • Midnight Chills',
        characters: 'പ്രധാന കഥാപാത്രം, കാര്യസ്ഥൻ കുട്ടൻ, ഫോട്ടോഗ്രാഫർ നന്ദൻ',
        situation1: 'കാറ്റിന്റെ ശബ്ദത്തിനിടയിൽ അടഞ്ഞുകിടന്ന മുകൾനിലയിലെ വാതിൽ തനിയെ തുറക്കുകയും കാര്യസ്ഥൻ കുട്ടൻ വിളറിവെളുത്ത് അങ്ങോട്ട് ചൂണ്ടിക്കാണിക്കുകയും ചെയ്യുന്നു.',
        situation2: 'നന്ദൻ ക്യാമറയിൽ പകർത്തിയ ചിത്രങ്ങളിൽ സാധാരണ കണ്ണുകൾക്ക് കാണാത്തൊരു നിഴൽ രൂപവും പഴയൊരു താക്കോൽക്കൂട്ടവും തെളിയുന്നു.',
        climaxEnding: 'നിലവറയിലെ പഴയ പെട്ടി തുറന്ന് സത്യം പുറത്തുകൊണ്ടുവരുമ്പോൾ പ്രതീക്ഷിക്കാത്തൊരു ക്ലൈമാക്സ് കാത്തിരിക്കുന്നു.',
      },
    ],
    scifi: [
      {
        titleTag: 'ടൈം ലൂപ്പിലെ പത്താമത്തെ മിനിറ്റ്',
        mood: 'Mind-Bending Sci-Fi • Time Paradox',
        characters: 'പ്രധാന കഥാപാത്രം, ശാസ്ത്രജ്ഞ ഡോ. താര, അയൽവാസി സഞ്ജയ്',
        situation1: 'ആദ്യത്തെ ഞെട്ടലിനിടയിൽ മുന്നിൽ എത്തിയ ഡോ. താരയുടെ കയ്യിലെ വാച്ചിൽ സമയം പുറകോട്ട് ഓടുന്നത് കാണുകയും ഇതേ സംഭവം മുൻപും നടന്നതായി തിരിച്ചറിയുകയും ചെയ്യുന്നു.',
        situation2: 'സഞ്ജയ്‌യുടെ ലാബിൽ നിന്നുള്ള സിഗ്നൽ തകരാർ കാരണം ഓരോ പത്ത് മിനിറ്റിലും അതേ നിമിഷത്തിലേക്ക് വീണ്ടും വീണ്ടും കുടുങ്ങുന്ന പ്രതിസന്ധി ഉണ്ടാകുന്നു.',
        climaxEnding: 'അവസാന സെക്കൻഡിൽ ടൈം ഫ്രീക്വൻസി ശരിയാക്കി ടൈം ലൂപ്പ് തകർക്കുന്നതോടെ പുതിയൊരു പ്രഭാതത്തിലേക്ക് കടക്കുന്നു.',
      },
      {
        titleTag: 'മറുലോകത്തു നിന്നൊരു സന്ദേശം',
        mood: 'Futuristic Mystery • Parallel World',
        characters: 'പ്രധാന കഥാപാത്രം, റേഡിയോ എൻജിനീയർ കിരൺ, എ.ഐ സഹായി നോവ',
        situation1: 'സാഹചര്യം വഷളാകുമ്പോൾ പോക്കറ്റിലെ ഫോണിൽ ഭാവിയിൽ നിന്നുള്ളൊരു അടിയന്തര ശബ്ദസന്ദേശം എത്തുകയും കിരൺ സഹായത്തിന് എത്തുകയും ചെയ്യുന്നു.',
        situation2: 'അദൃശ്യമായൊരു എനർജി മതിൽ വഴി തടയുമ്പോൾ നോവയുടെ ഡാറ്റാ മാപ്പ് ഉപയോഗിച്ച് പ്രപഞ്ച വാതിൽ അടയ്ക്കാൻ ശ്രമം നടത്തുന്നു.',
        climaxEnding: 'ഊർജ്ജ പ്രവാഹത്തെ മറികടന്ന് സന്ദേശം ഡീകോഡ് ചെയ്യുമ്പോൾ വരാനിരുന്ന വലിയൊരു അപകടം ഒഴിവാകുന്നു.',
      },
    ],
    comedy: [
      {
        titleTag: 'കല്യാണപ്പന്തലിലെ കൂട്ടക്കുഴപ്പം',
        mood: 'Laugh-Out-Loud Comedy • Situational Chaos',
        characters: 'പ്രധാന കഥാപാത്രം, പരിഭ്രാന്തനായ വരൻ സുകു, കർക്കശക്കാരൻ അമ്മാവൻ മാധവൻ, ചായക്കടക്കാരൻ ബാബു',
        situation1: 'പേടിച്ചോടിയതിനു തൊട്ടുപിന്നാലെ മുണ്ടും മടക്കിക്കുത്തി പായുന്ന വരൻ സുകു മുന്നിലേക്ക് ചാടിവീഴുകയും കല്യാണത്തിന് വഴിതെറ്റിയെന്ന് അലറുകയും ചെയ്യുന്നു.',
        situation2: 'പിന്നാലെ ലഡു ട്രേയുമായി എത്തുന്ന അമ്മാവൻ മാധവനും തമാശക്കാരനായ ബാബുവും ചേർന്ന് ആളുമാറി മറ്റൊരു സ്കൂട്ടറിൽ കയറുന്നതോടെ അബദ്ധങ്ങളുടെ ഘോഷയാത്ര തുടങ്ങുന്നു.',
        climaxEnding: 'വലിയ കോലാഹലത്തിനൊടുവിൽ അമ്മാവൻ ചെളിയിൽ വീഴുകയും എല്ലാ തെറ്റിദ്ധാരണകളും മാറി കൂട്ടച്ചിരിയോടെ കല്യാണവേദിയിലെത്തുകയും ചെയ്യുന്നു.',
      },
      {
        titleTag: 'അയൽക്കാരന്റെ കുരുക്ക്',
        mood: 'Playful Family Fun • Visual Gags',
        characters: 'പ്രധാന കഥാപാത്രം, അയൽക്കാരൻ വർഗീസ് അങ്കിൾ, കുസൃതിക്കുട്ടി ചിന്നു',
        situation1: 'വിവരം അറിയാതെ ഓടിമാറുമ്പോൾ വർഗീസ് അങ്കിളിന്റെ പുതിയ കുടയും പാൽപ്പാത്രവും തട്ടിമറിഞ്ഞ് വലിയൊരു ബഹളത്തിന് തുടക്കമാകുന്നു.',
        situation2: 'തെറ്റ് മറയ്ക്കാൻ ചിന്നുവിനൊപ്പം ചേർന്ന് നടത്തുന്ന ഓരോ തന്ത്രവും വിപരീതഫലമായി അടുക്കളയിലും മുറ്റത്തും രസകരമായ കുഴപ്പങ്ങൾ ഉണ്ടാക്കുന്നു.',
        climaxEnding: 'സത്യം പുറത്തായ നിമിഷം അങ്കിളിന് ചിരി അടക്കാൻ കഴിയാതെ വരികയും എല്ലാവരും ചേർന്ന് ചായ കുടിച്ച് പിരിയുകയും ചെയ്യുന്നു.',
      },
    ],
    ad: [
      {
        titleTag: 'വിശ്വാസത്തിന്റെ പുതിയ വെളിച്ചം',
        mood: 'Warm Commercial • Brand Hero Moment',
        characters: 'പ്രധാന കഥാപാത്രം, കരുതലുള്ള അച്ഛൻ, ചിരിച്ചെത്തുന്ന സുഹൃത്തുക്കൾ',
        situation1: 'ചെറിയൊരു ആശയക്കുഴപ്പവും ഇരുട്ടും നിറഞ്ഞ നിമിഷത്തിൽ വിശ്വസ്തമായ ആ സ്മാർട്ട് ഉൽപ്പന്നം ഓൺ ആകുന്നതോടെ പരിസരം പകൽ പോലെ തിളങ്ങുന്നു.',
        situation2: 'പ്രയാസകരമായ സാഹചര്യം നിമിഷനേരം കൊണ്ട് ലളിതവും സുരക്ഷിതവുമാകുന്നത് കണ്ട് ചുറ്റുമുള്ളവർ അത്ഭുതപ്പെടുന്നു.',
        climaxEnding: 'കുടുംബത്തിന്റെ പുഞ്ചിരിയും ഹൃദ്യമായൊരു ബ്രാൻഡ് സന്ദേശവും ചേർന്ന് മനസ്സിൽ തങ്ങിനിൽക്കുന്ന പരസ്യമായി മാറുന്നു.',
      },
      {
        titleTag: 'നാടൻ രുചിയുടെ സന്തോഷം',
        mood: 'Energetic Promo • Feel-Good Connect',
        characters: 'പ്രധാന കഥാപാത്രം, മുത്തശ്ശി കല്യാണി, അയൽവീട്ടിലെ കുട്ടികൾ',
        situation1: 'ആദ്യത്തെ അമ്പരപ്പിന് പിന്നാലെ മുത്തശ്ശി കല്യാണിയുടെ അടുക്കളയിൽ നിന്ന് ഉയരുന്ന മനോഹരമായ സുഗന്ധം എല്ലാവരുടെയും ശ്രദ്ധ മാറ്റുന്നു.',
        situation2: 'തിടുക്കത്തിൽ എത്തിയ കുട്ടികളും അതിഥികളും ഒരുമിച്ചിരുന്ന് രുചികരമായ വിഭവം പങ്കിടുമ്പോൾ ക്ഷീണമെല്ലാം മാറി ആഘോഷമാകുന്നു.',
        climaxEnding: 'മനോഹരമായൊരു ടാഗ്‌ലൈൻ ഷോട്ടോടെ പ്രേക്ഷകരിൽ ഉൽപ്പന്നത്തോട് പ്രിയം വളർത്തുന്ന ഫിനാലെ.',
      },
    ],
  },
  en: {
    thriller: [
      {
        titleTag: 'The Dropped Encrypted Diary',
        mood: 'Suspenseful Mystery • Clues & Tension',
        characters: 'Lead Character, Mysterious Courier Karthik, Sub-Inspector Arjun',
        situation1: 'Mid-panic, the mysterious stranger Karthik drops a locked metal diary and key on the ground before vanishing into the dark alley.',
        situation2: 'When the protagonist tries to turn it in, Inspector Arjun warns that armed men in a black van are hunting anyone holding that exact diary.',
        climaxEnding: 'Outsmarting an ambush near the old bridge, the protagonist delivers the diary proof to police and exposes the entire syndicate.',
      },
      {
        titleTag: 'Shadows at the Last Bus Stop',
        mood: 'Psychological Thriller • Hidden Truth',
        characters: 'Lead Character, Neighbor Latha, Archivist Dr. Menon',
        situation1: 'Stepping back in fear, neighbor Latha yells an urgent warning from across the street, revealing someone has been watching the house all week.',
        situation2: 'A sudden power outage and Dr. Menon’s missing antique coin box expose footprints leading straight into the locked basement.',
        climaxEnding: 'Shining a flashlight inside uncovers a shocking impersonator and brings the years-old neighborhood mystery to a gripping close.',
      },
    ],
    drama: [
      {
        titleTag: 'The Unsent Letter & Reunion',
        mood: 'Heartfelt Emotional • Family Ties',
        characters: 'Lead Character, Elderly Postman Raghavan, Sister Devika',
        situation1: 'As the initial shock fades, the figure turns out to be retired postman Raghavan carrying a torn envelope written by sister Devika years ago.',
        situation2: 'Reading the confession sparks a tender emotional struggle over old family pride, financial hardship, and lost years apart.',
        climaxEnding: 'Tears give way to forgiveness as both siblings reunite warmly on the porch in soft golden light.',
      },
      {
        titleTag: 'A Promise in the Rain',
        mood: 'Touching Drama • Quiet Sacrifice',
        characters: 'Lead Character, Mother Lakshmi, Childhood Friend Rohan',
        situation1: 'Following the tense encounter, urgent news about mother Lakshmi’s hospital bill collides with childhood friend Rohan arriving with an unexpected offer.',
        situation2: 'Choosing between a dream job departure and staying behind creates an agonizing turning point at the railway junction.',
        climaxEnding: 'A courageous compromise heals both worlds and ends with mother Lakshmi smiling proudly at the doorstep.',
      },
    ],
    action: [
      {
        titleTag: 'Midnight High-Speed Escape',
        mood: 'High-Octane Action • Adrenaline Chase',
        characters: 'Lead Character, Undercover Agent Vikram, Tech Hacker Priya',
        situation1: 'Seconds later, injured agent Vikram slips a micro-drive into the protagonist’s bag as ruthless bikers roar down the lane in pursuit.',
        situation2: 'Guided over earbuds by hacker Priya, a breathless chase weaves across narrow rooftops, market stalls, and a stalled railway crossing.',
        climaxEnding: 'A daring leap disables the lead pursuer and hands the encrypted drive safely to the extraction team.',
      },
      {
        titleTag: 'Stand at the Old Checkpost',
        mood: 'Mass Action • Heroic Defense',
        characters: 'Lead Character, Ranger Shankar, Smuggler Crew',
        situation1: 'Standing ground, veteran forest ranger Shankar locks the checkpost gate and points to an approaching convoy of smugglers.',
        situation2: 'With communications jammed and an injured bystander to protect, everyday tools become clever weapons in the mist.',
        climaxEnding: 'By dawn, the convoy is neutralized and reinforcements arrive to applaud the fearless stand.',
      },
    ],
    folk: [
      {
        titleTag: 'Lantern of the Sacred Grove',
        mood: 'Atmospheric Folk • Eerie Mystery',
        characters: 'Lead Character, Temple Keeper Kelu, Researcher Ananya',
        situation1: 'Swinging an ancient brass lantern through the fog, keeper Kelu warns them never to step past the banyan stone after midnight.',
        situation2: 'Alongside researcher Ananya, strange whispered chants lead them to hidden carvings revealing an old ancestral pact.',
        climaxEnding: 'Returning the sacred bell to the altar lifts the eerie fog and leaves a chilling final mystery.',
      },
      {
        titleTag: 'Footsteps in the Manor',
        mood: 'Supernatural Mystery • Midnight Chills',
        characters: 'Lead Character, Caretaker Kuttan, Photographer Nandan',
        situation1: 'An upstairs shutter bangs open by itself while frightened caretaker Kuttan points toward muddy footprints leading nowhere.',
        situation2: 'Photographer Nandan’s camera flash captures a ghostly silhouette holding an old brass key in the mirror reflection.',
        climaxEnding: 'Opening the sealed attic chest reveals an emotional family secret nobody expected.',
      },
    ],
    scifi: [
      {
        titleTag: 'The 10-Minute Time Loop',
        mood: 'Mind-Bending Sci-Fi • Time Paradox',
        characters: 'Lead Character, Physicist Dr. Tara, Neighbor Sanjay',
        situation1: 'Physicist Dr. Tara rushes up showing a flickering chronometer counting backwards, proving this exact street encounter has looped 12 times.',
        situation2: 'A malfunctioning antenna in Sanjay’s garage tears a glowing blue rift across the evening sky, threatening to trap the town forever.',
        climaxEnding: 'Syncing their wrist beacons with three seconds left shatters the time loop into a peaceful sunrise.',
      },
      {
        titleTag: 'Signal from Tomorrow',
        mood: 'Futuristic Mystery • Parallel World',
        characters: 'Lead Character, Radio Engineer Kiran, AI Companion Nova',
        situation1: 'Radio engineer Kiran intercepts an urgent distress voice from tomorrow coming through a static-filled phone call.',
        situation2: 'Following AI Nova’s holographic coordinates leads them through a shimmering energy barrier hovering over the intersection.',
        climaxEnding: 'Flipping the master relay prevents a city-wide blackout before the portal vanishes.',
      },
    ],
    comedy: [
      {
        titleTag: 'The Runaway Groom Mix-Up',
        mood: 'Laugh-Out-Loud Comedy • Situational Chaos',
        characters: 'Lead Character, Panicked Groom Suku, Strict Uncle Madhavan, Tea Seller Babu',
        situation1: 'Turns out the terrifying figure is actually panicked groom Suku tripping over his mundu after losing the wedding hall address.',
        situation2: 'Strict uncle Madhavan arrives carrying a towering tray of laddoos while tea seller Babu accidentally swaps everyone onto the wrong scooter.',
        climaxEnding: 'A hilarious chase through puddles lands the whole crew at the wedding stage just in time for laughs all around.',
      },
      {
        titleTag: 'Neighborhood Cover-Up Chaos',
        mood: 'Playful Family Fun • Visual Gags',
        characters: 'Lead Character, Nosy Uncle Varghese, Mischievous Kid Chinnu',
        situation1: 'Startled into spilling groceries, kid Chinnu accidentally sends Uncle Varghese’s prized umbrella rolling into a freshly painted bench.',
        situation2: 'Every frantic attempt to hide the smudge makes the mess funnier as neighbors keep ringing the doorbell.',
        climaxEnding: 'Uncle Varghese spots the paint-stained hat, bursts out laughing, and turns the disaster into an afternoon snack party.',
      },
    ],
    ad: [
      {
        titleTag: 'Brighter Together Moments',
        mood: 'Warm Commercial • Everyday Hero',
        characters: 'Lead Character, Caring Father, Smiling Family',
        situation1: 'Just when darkness and worry freeze the moment, clicking on the sleek smart device floods the scene with crisp reassuring light.',
        situation2: 'A tricky everyday hurdle transforms effortlessly into warmth, confidence, and safety within seconds.',
        climaxEnding: 'The family shares relieved smiles beside a clean, memorable brand tagline finish.',
      },
      {
        titleTag: 'Signature Taste Surprise',
        mood: 'Energetic Promo • Feel-Good Connect',
        characters: 'Lead Character, Grandmother Kalyani, Neighborhood Kids',
        situation1: 'Grandmother Kalyani steps out with a steaming signature treat whose rich aroma melts all tension instantly.',
        situation2: 'Busy neighbors and playful kids gather around as a tense evening becomes an impromptu neighborhood celebration.',
        climaxEnding: 'Closes on a crisp slow-motion taste reveal and cheerful brand punchline.',
      },
    ],
  },
  hi: {
    thriller: [
      {
        titleTag: 'रहस्यमयी डायरी की दौड़',
        mood: 'Suspenseful Mystery • Clues & Tension',
        characters: 'मुख्य पात्र, अजनबी यात्री कार्तिक, सब-इंस्पेक्टर अर्जुन',
        situation1: 'घबराहट के बीच सामने खड़ा अजनबी कार्तिक अचानक एक बंद डायरी ज़मीन पर गिराकर अंधेरे में गायब हो जाता है।',
        situation2: 'इंस्पेक्टर अर्जुन से संपर्क करने पर पता चलता है कि काली वैन में कुछ खतरनाक लोग उसी डायरी की तलाश में हैं।',
        climaxEnding: 'पुराने पुल के पास जाल बिछाकर पुलिस को सबूत सौंपने के साथ पूरे गिरोह का पर्दाफाश होता है।',
      },
      {
        titleTag: 'अधूरी रात का सुराग',
        mood: 'Psychological Thriller • Hidden Truth',
        characters: 'मुख्य पात्र, पड़ोसी लता, डॉ. मेनन',
        situation1: 'पड़ोसी लता की अचानक चेतावनी बताती है कि घर के आसपास कोई पिछले कई दिनों से नज़र रख रहा था।',
        situation2: 'बिजली गुल होने और डॉ. मेनन के गायब संदूक से तहखाने का छुपा दरवाज़ा सामने आता है।',
        climaxEnding: 'टॉर्च की रोशनी में असली अपराधी बेनकाब होता है और वर्षों पुराना रहस्य सुलझ जाता है।',
      },
    ],
    drama: [
      {
        titleTag: 'अनकही चिट्ठी और मिलन',
        mood: 'Heartfelt Emotional • Family Ties',
        characters: 'मुख्य पात्र, बुजुर्ग डाकिया राघव, बहन देविका',
        situation1: 'डर हटने पर सामने बुजुर्ग डाकिया राघव दिखते हैं जिनके हाथ में बहन देविका की वर्षों पुरानी चिट्ठी है।',
        situation2: 'चिट्ठी पढ़ते ही पुराने पारिवारिक मतभेद और अनकहे दर्द का भावुक सच सामने आता है।',
        climaxEnding: 'आँसुओं के साथ सारी गलतफहमियाँ मिटती हैं और टूटा परिवार फिर से गले मिल जाता है।',
      },
      {
        titleTag: 'बारिश में निभाया वादा',
        mood: 'Touching Drama • Quiet Sacrifice',
        characters: 'मुख्य पात्र, माँ लक्ष्मी, बचपन का दोस्त रोहन',
        situation1: 'अचानक माँ की तबीयत और दोस्त रोहन के आए मौके के बीच कठिन चुनाव की घड़ी आ जाती है।',
        situation2: 'सपनों और जिम्मेदारी के बीच दिल को छू लेने वाला संघर्ष कहानी को गहराई देता है।',
        climaxEnding: 'साहस भरे फैसले से दोनों राहें संवरती हैं और माँ की मुस्कान के साथ कहानी पूरी होती है।',
      },
    ],
    action: [
      {
        titleTag: 'आधी रात का मिशन',
        mood: 'High-Octane Action • Chase',
        characters: 'मुख्य पात्र, एजेंट विक्रम, हैकर प्रिया',
        situation1: 'घायल एजेंट विक्रम एक गुप्त चिप थमाकर मदद मांगता है जबकि बाइक सवार गुंडे पीछे पड़ जाते हैं।',
        situation2: 'प्रिया के निर्देशों पर बाज़ार और तंग गलियों से होते हुए ज़बरदस्त पीछा और मुकाबला चलता है।',
        climaxEnding: 'आखिरी छलांग के साथ दुश्मनों को मात देकर मिशन सुरक्षित पूरा होता है।',
      },
      {
        titleTag: 'चेकपोस्ट पर टक्कर',
        mood: 'Mass Action • Defense',
        characters: 'मुख्य पात्र, रेंजर शंकर, तस्कर गिरोह',
        situation1: 'रेंजर शंकर रास्ते का फाटक बंद कर खतरे का सामना करने के लिए तैयार हो जाते हैं।',
        situation2: 'नेटवर्क जाम होने के बीच सूझबूझ और फुर्ती से हमलावरों को रोका जाता है।',
        climaxEnding: 'सुबह की रोशनी में पूरा गिरोह पकड़ा जाता है और गाँव राहत की सांस लेता है।',
      },
    ],
    folk: [
      {
        titleTag: 'पीपल के पेड़ का रहस्य',
        mood: 'Atmospheric Folk • Eerie',
        characters: 'मुख्य पात्र, पुजारी केलु, शोधकर्ता अनन्या',
        situation1: 'पीतल की लालटेन लिए केलु काका चेतावनी देते हैं कि आधी रात के बाद पुराने पत्थर के पार मत जाना।',
        situation2: 'अनन्या के साथ प्राचीन शिलालेख देखने पर सदियों पुराने रहस्य की परतें खुलती हैं।',
        climaxEnding: 'पवित्र घंटी लौटते ही धुंध छंटती है और रहस्यमयी शांति लौट आती है।',
      },
      {
        titleTag: 'पुरानी हवेली की परछाई',
        mood: 'Supernatural Mystery',
        characters: 'मुख्य पात्र, केयरटेकर कुट्टन, फोटोग्राफर नंदन',
        situation1: 'ऊपरी कमरे का बंद दरवाज़ा अचानक खुलता है और गीले पैरों के निशान दिखाई देते हैं।',
        situation2: 'नंदन के कैमरे की तस्वीर में शीशे के भीतर एक पुरानी चाबी थामे परछाई दिखती है।',
        climaxEnding: 'ताला खुलने पर हवेली का अनसुना सच सबको चौंका देता है।',
      },
    ],
    scifi: [
      {
        titleTag: 'दस मिनट का टाइम लूप',
        mood: 'Mind-Bending Sci-Fi',
        characters: 'मुख्य पात्र, वैज्ञानिक डॉ. तारा, संजय',
        situation1: 'डॉ. तारा की उल्टी चलती घड़ी बताती है कि यह exact मुलाकात पहले भी कई बार दोहराई जा चुकी है।',
        situation2: 'संजय की लैब के सिग्नल से आसमान में नीला टाइम-र‍िफ्ट खुलने लगता है।',
        climaxEnding: 'अंतिम तीन सेकंड में फ्रीक्वेंसी जोड़कर टाइम लूप हमेशा के लिए टूट जाता है।',
      },
      {
        titleTag: 'भविष्य से आई कॉल',
        mood: 'Futuristic Mystery',
        characters: 'मुख्य पात्र, इंजीनियर किरण, एआई नोवा',
        situation1: 'फोन पर कल से आई चेतावनी भरी आवाज़ सुनकर किरण तुरंत मदद के लिए पहुँचते हैं।',
        situation2: 'एआई नोवा के नक्शे की मदद से अदृश्य ऊर्जा दीवार पार करने की दौड़ शुरू होती है।',
        climaxEnding: 'मुख्य स्विच पलटते ही बड़ा हादसा टल जाता है।',
      },
    ],
    comedy: [
      {
        titleTag: 'शादी मंडप की भागदौड़',
        mood: 'Laugh-Out-Loud Comedy',
        characters: 'मुख्य पात्र, घबराया दूल्हा सुकू, सख्त मामा माधवन, चायवाला बाबू',
        situation1: 'डर के पीछे असली वजह निकला दूल्हा सुकू जो शादी हॉल का रास्ता भूलकर धोती संभालते दौड़ रहा था।',
        situation2: 'मामा माधवन लड्डू का थाल लेकर और बाबू गलत स्कूटर पर बैठकर पूरा मोहल्ला सिर पर उठा लेते हैं।',
        climaxEnding: 'कीचड़ में फिसलने के बाद ठहाकों के बीच सब समय पर मंडप पहुँच जाते हैं।',
      },
      {
        titleTag: 'पड़ोसी की मज़ेदार आफत',
        mood: 'Playful Family Fun',
        characters: 'मुख्य पात्र, वर्गीस अंकल, नटखट बच्चा चिन्नू',
        situation1: 'अचानक हुए धक्के से वर्गीस अंकल का छाता ताज़ा पेंट की बेंच पर जा गिरता है।',
        situation2: 'निशान छुपाने के चक्कर में चिन्नू और दोस्त मिलकर घर में और मज़ेदार रायता फैला देते हैं।',
        climaxEnding: 'अंकल सब देखकर खुद हंस पड़ते हैं और गरम चाय के साथ मामला शांत होता है।',
      },
    ],
    ad: [
      {
        titleTag: 'भरोसे की नई रोशनी',
        mood: 'Warm Commercial',
        characters: 'मुख्य पात्र, पिता, मुस्कुराता परिवार',
        situation1: 'अंधेरे और उलझन के पल में स्मार्ट प्रोडक्ट ऑन होते ही पूरा रास्ता दिन की तरह चमक उठता है।',
        situation2: 'मुश्किल काम पल भर में आसान और सुरक्षित हो जाता है।',
        climaxEnding: 'परिवार की मुस्कान और दमदार ब्रांड टैगलाइन के साथ यादगार समापन।',
      },
      {
        titleTag: 'स्वाद का सरप्राइज़',
        mood: 'Energetic Promo',
        characters: 'मुख्य पात्र, दादी कल्याणी, मोहल्ले के बच्चे',
        situation1: 'दादी की रसोई से उठती खुशबू सारा तनाव पल भर में खुशी में बदल देती है।',
        situation2: 'सब मिलकर स्वाद का आनंद लेते हुए शाम को जश्न में बदल देते हैं।',
        climaxEnding: 'ताज़ा टैगलाइन के साथ खुशनुमा फिनिश।',
      },
    ],
  },
  ta: {
    thriller: [
      { titleTag: 'ரகசிய டைரியின் மர்மம்', mood: 'Suspense Thriller', characters: 'முதன்மை பாத்திரம், கார்த்திக், இன்ஸ்பெக்டர் அர்ஜுன்', situation1: 'பதற்றத்தில் நின்ற கார்த்திக் ஒரு பூட்டிய டைரியை நழுவவிட்டு இருட்டில் மறைகிறார்.', situation2: 'இன்ஸ்பெக்டர் அர்ஜுன் எச்சரித்த கருப்பு வேன் கும்பல் அதே டைரியைத் தேடித் துரத்துகிறது.', climaxEnding: 'பழைய பாலத்தில் தந்திரமாக சிக்கவைத்து உண்மையை போலீசிடம் ஒப்படைப்பதோடு கதை முடிகிறது.' },
      { titleTag: 'கடைசி பேருந்து நிறுத்த மர்மம்', mood: 'Psychological Thriller', characters: 'முதன்மை பாத்திரம், லதா, டாக்டர் மேனன்', situation1: 'அண்டை வீட்டு லதா யாரோ வீட்டைக் கண்காணிப்பதாக எச்சரிக்கிறார்.', situation2: 'மின்சாரத் துண்டிப்புக்கு நடுவே நிலவறையில் பழைய தடயங்கள் தெரிகின்றன.', climaxEnding: 'உண்மையான குற்றவாளி சிக்கி பல ஆண்டு மர்மம் விலகுகிறது.' },
    ],
    drama: [
      { titleTag: 'மறந்த கடிதமும் சந்திப்பும்', mood: 'Emotional Drama', characters: 'முதன்மை பாத்திரம், தபால்காரர் ராகவன், சகோதரி தேவிகா', situation1: 'முன்னால் நின்றவர் பழைய கடிதத்தைக் கொண்டு வந்த தபால்காரர் ராகவன் எனத் தெரிகிறது.', situation2: 'பழைய குடும்பப் பிரிவுக்கான உண்மை வெளியாகி உணர்ச்சிப் போராட்டம் உருவாகிறது.', climaxEnding: 'மன்னிப்பும் கண்ணீரும் சேர்ந்து குடும்பம் மீண்டும் இணைகிறது.' },
      { titleTag: 'மழைக்கால வாக்குறுதி', mood: 'Touching Drama', characters: 'முதன்மை பாத்திரம், அம்மா லட்சுமி, நண்பன் ரோகன்', situation1: 'அம்மாவின் மருத்துவச் செலவும் ரோகனின் திடீர் உதவியும் நெருக்கடி தருகின்றன.', situation2: 'கனவுக்கும் கடமைக்கும் இடையிலான போராட்டம் தீவிரமாகிறது.', climaxEnding: 'துணிச்சலான முடிவால் குடும்பம் புன்னகையுடன் மீண்டு வருகிறது.' },
    ],
    action: [
      { titleTag: 'நள்ளிரவுத் துரத்தல்', mood: 'High Action', characters: 'முதன்மை பாத்திரம், ஏஜென்ட் விக்ரம், ஹேக்கர் பிரியா', situation1: 'காயமடைந்த விக்ரம் ரகசிய சிப்பைக் கொடுத்து தப்பிக்க உதவுமாறு கேட்கிறார்.', situation2: 'பிரியாவின் வழிகாட்டுதலில் சந்தை வழியாக வேகமான சேஸிங் நடக்கிறது.', climaxEnding: 'எதிரிகளை வீழ்த்தி ரகசியம் பாதுகாக்கப்படுகிறது.' },
      { titleTag: 'சோதனைச் சாவடிப் போர்', mood: 'Mass Action', characters: 'முதன்மை பாத்திரம், ரேஞ்சர் சங்கர், கடத்தல் கும்பல்', situation1: 'ரேஞ்சர் சங்கர் கதவைப் பூட்டி கும்பலை எதிர்கொள்ளத் தயாராகிறார்.', situation2: 'சிக்னல் இல்லாத இடத்தில் சுற்றியிருந்த பொருட்களால் சண்டை நடக்கிறது.', climaxEnding: 'விடியற்காலையில் கும்பல் கைது செய்யப்படுகிறது.' },
    ],
    folk: [
      { titleTag: 'காவலின் விளக்கு ரகசியம்', mood: 'Folk Mystery', characters: 'முதன்மை பாத்திரம், காவலர் கேளு, ஆராய்ச்சியாளர் அனன்யா', situation1: 'பழைய விளக்குடன் வந்த கேளு ஆலமரத்தைத் தாண்ட வேண்டாம் என்கிறார்.', situation2: 'அனன்யாவுடன் பழைய கல்வெட்டில் மறைந்த உண்மையைப் படிக்கிறார்கள்.', climaxEnding: 'பழைய சாபம் நீங்கி அமைதி திரும்புகிறது.' },
      { titleTag: 'பழைய மாளிகை நிழல்', mood: 'Supernatural Mystery', characters: 'முதன்மை பாத்திரம், குட்டன், நந்தன்', situation1: 'மேல் மாடி கதவு தானாகத் திறந்து ஈர காலடித் தடங்கள் தெரிகின்றன.', situation2: 'நந்தன் எடுத்த புகைப்படத்தில் கண்ணாடியில் ஒரு உருவம் தெரிகிறது.', climaxEnding: 'பழைய பெட்டியைத் திறக்கும்போது அதிர்ச்சி உண்மை வெளிவருகிறது.' },
    ],
    scifi: [
      { titleTag: '10 நிமிட டைம் லூப்', mood: 'Sci-Fi Paradox', characters: 'முதன்மை பாத்திரம், டாக்டர் தாரா, சஞ்சய்', situation1: 'டாக்டர் தாராவின் பின்னோக்கி ஓடும் கடிகாரம் இந்தச் சம்பவம் திரும்பத் திரும்ப நடப்பதைக் காட்டுகிறது.', situation2: 'சஞ்சயின் லேப் சிக்னலால் வானில் நீலப் பிளவு உருவாகிறது.', climaxEnding: 'கடைசி நொடியில் டைம் லூப் உடைக்கப்படுகிறது.' },
      { titleTag: 'எதிர்கால அழைப்பு', mood: 'Futuristic Mystery', characters: 'முதன்மை பாத்திரம், கிரண், ஏஐ நோவா', situation1: 'நாளையிலிருந்து வரும் எச்சரிக்கை அழைப்பை கிரண் பிடிக்கிறார்.', situation2: 'ஏஐ நோவா உதவியுடன் ஆற்றல் சுவரைத் தாண்டுகிறார்கள்.', climaxEnding: 'பெரிய விபத்து தவிர்க்கப்படுகிறது.' },
    ],
    comedy: [
      { titleTag: 'கல்யாண மண்டபக் கலாட்டா', mood: 'Laugh-Out Comedy', characters: 'முதன்மை பாத்திரம், மணமகன் சுகு, மாமா மாதவன், பாபு', situation1: 'பயந்ததற்குக் காரணம் வழிதவறி ஓடிவந்த மணமகன் சுகு என்பது தெரிகிறது.', situation2: 'மாதவன் மாமாவும் பாபுவும் தவறான ஸ்கூட்டரில் ஏறி குழப்பத்தைக் கூட்டுகிறார்கள்.', climaxEnding: 'எல்லோரும் சிரித்துக்கொண்டே மண்டபம் சேர்கிறார்கள்.' },
      { titleTag: 'அண்டை வீட்டுக் குழப்பம்', mood: 'Family Fun', characters: 'முதன்மை பாத்திரம், வர்கீஸ் அங்கிள், சின்னு', situation1: 'அங்கிளின் குடை புதிய பெயிண்ட் பெஞ்சில் விழுந்து கலாட்டா தொடங்குகிறது.', situation2: 'மறைக்கச் செய்த தந்திரங்கள் எல்லாம் தலைகீழாக மாறுகின்றன.', climaxEnding: 'அங்கிளும் சிரித்து தேநீர் விருந்து வைக்கிறார்.' },
    ],
    ad: [
      { titleTag: 'நம்பிக்கையின் வெளிச்சம்', mood: 'Warm Commercial', characters: 'முதன்மை பாத்திரம், தந்தை, குடும்பம்', situation1: 'இருளும் குழப்பமும் விலகி ஸ்மார்ட் சாதனம் ஒளிர்கிறது.', situation2: 'சிக்கலான நேரம் நொடியில் எளிதாகிறது.', climaxEnding: 'குடும்பப் புன்னகையுடன் பிராண்ட் முடிவு.' },
      { titleTag: 'பாரம்பரிய சுவை', mood: 'Energetic Promo', characters: 'முதன்மை பாத்திரம், பாட்டி கல்யாணி, குழந்தைகள்', situation1: 'பாட்டியின் சமையல் வாசனை எல்லோரையும் ஈர்க்கிறது.', situation2: 'குழந்தைகளும் பெரியவர்களும் மகிழ்ச்சியுடன் பகிர்கிறார்கள்.', climaxEnding: 'சுவையான விளம்பர முடிவு.' },
    ],
  },
  kn: {
    thriller: [
      { titleTag: 'ರಹಸ್ಯ ಡೈರಿಯ ಬೆನ್ನಟ್ಟುವಿಕೆ', mood: 'Suspense Thriller', characters: 'ಮುಖ್ಯ ಪಾತ್ರ, ಕಾರ್ತಿಕ್, ಇನ್‌ಸ್ಪೆಕ್ಟರ್ ಅರ್ಜುನ್', situation1: 'ಗಾಬರಿಯಲ್ಲಿದ್ದ ಕಾರ್ತಿಕ್ ಲಾಕ್ ಮಾಡಿದ ಡೈರಿಯನ್ನು ಬೀಳಿಸಿ ಕತ್ತಲೆಯಲ್ಲಿ ಕಣ್ಮರೆಯಾಗುತ್ತಾನೆ.', situation2: 'ಕಪ್ಪು ವ್ಯಾನ್ ಗ್ಯಾಂಗ್ ಅದೇ ಡೈರಿಗಾಗಿ ಹುಡುಕುತ್ತಿರುವುದಾಗಿ ಅರ್ಜುನ್ ಎಚ್ಚರಿಸುತ್ತಾರೆ.', climaxEnding: 'ಸೇತುವೆಯ ಬಳಿ ಗ್ಯಾಂಗ್ ಅನ್ನು ಹಿಡಿದು ಸತ್ಯವನ್ನು ಹೊರತರಲಾಗುತ್ತದೆ.' },
      { titleTag: 'ಕೊನೆಯ ಬಸ್ ನಿಲ್ದಾಣದ ರಹಸ್ಯ', mood: 'Psychological Thriller', characters: 'ಮುಖ್ಯ ಪಾತ್ರ, ನೆರೆಯ ಲತಾ, ಡಾ. ಮೆನನ್', situation1: 'ಲತಾ ಮನೆಯ ಸುತ್ತ ಯಾರೋ ಗಮನಿಸುತ್ತಿದ್ದಾರೆ ಎಂದು ಎಚ್ಚರಿಸುತ್ತಾರೆ.', situation2: 'ವಿದ್ಯುತ್ ಕಡಿತದ ನಡುವೆ ನೆಲಮಾಳಿಗೆಯ ಹೆಜ್ಜೆ ಗುರುತುಗಳು ಕಾಣುತ್ತವೆ.', climaxEnding: 'ಅಸಲಿ ದೋಷಿ ಸಿಕ್ಕಿ ಹಳೆಯ ರಹಸ್ಯ ಬಗೆಹರಿಯುತ್ತದೆ.' },
    ],
    drama: [
      { titleTag: 'ಮರೆತ ಪತ್ರ ಮತ್ತು ಮಿಲನ', mood: 'Emotional Drama', characters: 'ಮುಖ್ಯ ಪಾತ್ರ, ಪೋಸ್ಟ್‌ಮ್ಯಾನ್ ರಾಘವ್, ಸಹೋದರಿ ದೇವಿಕಾ', situation1: 'ಮುಂದೆ ನಿಂತಿದ್ದವರು ಹಳೆಯ ಪತ್ರ ತಂದ ಪೋಸ್ಟ್‌ಮ್ಯಾನ್ ರಾಘವ್ ಎಂದು ತಿಳಿಯುತ್ತದೆ.', situation2: 'ಹಳೆಯ ಕುಟುಂಬದ ನೋವು ಮತ್ತು ಸತ್ಯ ಭಾವನಾತ್ಮಕವಾಗಿ ಹೊರಬರುತ್ತದೆ.', climaxEnding: 'ಕ್ಷಮೆಯೊಂದಿಗೆ ಕುಟುಂಬ ಮತ್ತೆ ಒಂದಾಗುತ್ತದೆ.' },
      { titleTag: 'ಮಳೆಯಲ್ಲಿ ನೀಡಿದ ಮಾತು', mood: 'Touching Drama', characters: 'ಮುಖ್ಯ ಪಾತ್ರ, ತಾಯಿ ಲಕ್ಷ್ಮಿ, ಗೆಳೆಯ ರೋಹನ್', situation1: 'ತಾಯಿಯ ಚಿಕಿತ್ಸೆ ಮತ್ತು ರೋಹನ್ ತಂದ ಅವಕಾಶದ ನಡುವೆ ಗೊಂದಲ ಮೂಡುತ್ತದೆ.', situation2: 'ಕನಸು ಮತ್ತು ಜವಾಬ್ದಾರಿಯ ನಡುವೆ ದೊಡ್ಡ ನಿರ್ಧಾರ ತೆಗೆದುಕೊಳ್ಳಬೇಕಾಗುತ್ತದೆ.', climaxEnding: 'ಧೈರ್ಯದ ಹೆಜ್ಜೆಯಿಂದ ತಾಯಿಯ ಮುಖದಲ್ಲಿ ನಗು ಮೂಡುತ್ತದೆ.' },
    ],
    action: [
      { titleTag: 'ಮಧ್ಯರಾತ್ರಿಯ ರೋಚಕ ಪಾರು', mood: 'High Action', characters: 'ಮುಖ್ಯ ಪಾತ್ರ, ಏಜೆಂಟ್ ವಿಕ್ರಮ್, ಹ್ಯಾಕರ್ ಪ್ರಿಯಾ', situation1: 'ಗಾಯಗೊಂಡ ವಿಕ್ರಮ್ ರಹಸ್ಯ ಚಿಪ್ ನೀಡಿ ಬೈಕ್ ಗ್ಯಾಂಗ್‌ನಿಂದ ತಪ್ಪಿಸಿಕೊಳ್ಳಲು ಕೇಳುತ್ತಾರೆ.', situation2: 'ಪ್ರಿಯಾ ಮಾರ್ಗದರ್ಶನದಲ್ಲಿ ಮಾರುಕಟ್ಟೆಯ ಮೂಲಕ ಸಾಹಸಮಯ ಚೇಸ್ ನಡೆಯುತ್ತದೆ.', climaxEnding: 'ಶತ್ರುಗಳನ್ನು ಸೋಲಿಸಿ ಮಾಹಿತಿ ಸುರಕ್ಷಿತವಾಗಿ ತಲುಪುತ್ತದೆ.' },
      { titleTag: 'ಚೆಕ್‌ಪೋಸ್ಟ್ ಹೋರಾಟ', mood: 'Mass Action', characters: 'ಮುಖ್ಯ ಪಾತ್ರ, ರೇಂಜರ್ ಶಂಕರ್, ಕಳ್ಳಸಾಗಣೆ ಗ್ಯಾಂಗ್', situation1: 'ಶಂಕರ್ ಗೇಟ್ ಮುಚ್ಚಿ ಗ್ಯಾಂಗ್ ತಡೆಯಲು ಸಜ್ಜಾಗುತ್ತಾರೆ.', situation2: 'ಸಿಗ್ನಲ್ ಇಲ್ಲದ ಜಾಗದಲ್ಲಿ ಸುತ್ತಮುತ್ತಲ ವಸ್ತುಗಳಿಂದ ಎದುರಿಸುತ್ತಾರೆ.', climaxEnding: 'ಬೆಳಗಿನ ಜಾವ ಗ್ಯಾಂಗ್ ಸೆರೆಯಾಗುತ್ತದೆ.' },
    ],
    folk: [
      { titleTag: 'ಪವಿತ್ರ ವನದ ದೀಪದ ರಹಸ್ಯ', mood: 'Folk Mystery', characters: 'ಮುಖ್ಯ ಪಾತ್ರ, ಕಾವಲುಗಾರ ಕೇಲು, ಸಂಶೋಧಕಿ ಅನನ್ಯಾ', situation1: 'ಕೇಲು ಅಜ್ಜ ಆಲದ ಮರದ ಆಚೆ ಹೋಗದಂತೆ ಎಚ್ಚರಿಕೆ ನೀಡುತ್ತಾರೆ.', situation2: 'ಅನನ್ಯಾ ಜೊತೆ ಹಳೆಯ ಶಾಸನದ ಅರ್ಥ ಬಿಡಿಸುತ್ತಾರೆ.', climaxEnding: 'ಹಳೆಯ ಭಯ ದೂರವಾಗಿ ಶಾಂತಿ ನೆಲೆಸುತ್ತದೆ.' },
      { titleTag: 'ಹಳೆಯ ಮನೆಯ ನೆರಳು', mood: 'Supernatural Mystery', characters: 'ಮುಖ್ಯ ಪಾತ್ರ, ಕುಟ್ಟನ್, ಫೋಟೋಗ್ರಾಫರ್ ನಂದನ್', situation1: 'ಮೇಲಿನ ಬಾಗಿಲು ತಾನಾಗಿಯೇ ತೆರೆದು ಒದ್ದೆ ಹೆಜ್ಜೆಗಳು ಕಾಣುತ್ತವೆ.', situation2: 'ನಂದನ್ ಕ್ಯಾಮೆರಾದಲ್ಲಿ ಕನ್ನಡಿಯೊಳಗಿನ ನೆರಳು ಕಾಣಿಸುತ್ತದೆ.', climaxEnding: 'ಪೆಟ್ಟಿಗೆ ತೆರೆದಾಗ ಅಚ್ಚರಿಯ ಸತ್ಯ ಹೊರಬರುತ್ತದೆ.' },
    ],
    scifi: [
      { titleTag: '10 ನಿಮಿಷಗಳ ಟೈಮ್ ಲೂಪ್', mood: 'Sci-Fi Paradox', characters: 'ಮುಖ್ಯ ಪಾತ್ರ, ಡಾ. ತಾರಾ, ಸಂಜಯ್', situation1: 'ಡಾ. ತಾರಾ ಅವರ ಗಡಿಯಾರ ಹಿಂದಕ್ಕೆ ತಿರುಗುತ್ತಾ ಟೈಮ್ ಲೂಪ್ ತೋರಿಸುತ್ತದೆ.', situation2: 'ಸಂಜಯ್ ಲ್ಯಾಬ್‌ನ ಸಿಗ್ನಲ್‌ನಿಂದ ಆಕಾಶದಲ್ಲಿ ನೀಲಿ ಬಿರುಕು ಮೂಡುತ್ತದೆ.', climaxEnding: 'ಕೊನೆಯ ಕ್ಷಣದಲ್ಲಿ ಟೈಮ್ ಲೂಪ್ ಮುರಿಯುತ್ತದೆ.' },
      { titleTag: 'ಭವಿಷ್ಯದ ಕರೆ', mood: 'Futuristic Mystery', characters: 'ಮುಖ್ಯ ಪಾತ್ರ, ಕಿರಣ್, ಎಐ ನೋವಾ', situation1: 'ನಾಳೆಯಿಂದ ಬಂದ ಎಚ್ಚರಿಕೆ ಕರೆಯನ್ನು ಕಿರಣ್ ಪತ್ತೆಹಚ್ಚುತ್ತಾರೆ.', situation2: 'ಎಐ ನೋವಾ ಸಹಾಯದಿಂದ ಎನರ್ಜಿ ಗೋಡೆ ದಾಟುತ್ತಾರೆ.', climaxEnding: 'ದೊಡ್ಡ ಅಪಾಯ ತಪ್ಪುತ್ತದೆ.' },
    ],
    comedy: [
      { titleTag: 'ಮದುವೆ ಮನೆಯ ಗೊಂದಲ', mood: 'Laugh-Out Comedy', characters: 'ಮುಖ್ಯ ಪಾತ್ರ, ವರ ಸುಕು, ಮಾವ ಮಾಧವನ್, ಬಾಬು', situation1: 'ಓಡಿಬಂದಿದ್ದು ದಾರಿ ತಪ್ಪಿದ ವರ ಸುಕು ಎಂದು ತಿಳಿದು ಅಚ್ಚರಿಯಾಗುತ್ತದೆ.', situation2: 'ಮಾಧವನ್ ಮಾವ ಮತ್ತು ಬಾಬು ತಪ್ಪು ಸ್ಕೂಟರ್ ಏರಿ ಹಾಸ್ಯದ ಗದ್ದಲ ಸೃಷ್ಟಿಸುತ್ತಾರೆ.', climaxEnding: 'ನಗುವಿನೊಂದಿಗೆ ಎಲ್ಲರೂ ಮದುವೆ ಮಂಟಪ ತಲುಪುತ್ತಾರೆ.' },
      { titleTag: 'ನೆರೆಯವರ ತಮಾಷೆ ತೊಂದರೆ', mood: 'Family Fun', characters: 'ಮುಖ್ಯ ಪಾತ್ರ, ವರ್ಗೀಸ್ ಅಂಕಲ್, ಚಿನ್ನು', situation1: 'ಅಂಕಲ್ ಕೊಡೆ ಹೊಸ ಪೇಂಟ್ ಬೆಂಚ್ ಮೇಲೆ ಬಿದ್ದು ಗಲಾಟೆ ಶುರುವಾಗುತ್ತದೆ.', situation2: 'ಮುಚ್ಚಿಡಲು ಮಾಡಿದ ಉಪಾಯವೆಲ್ಲಾ ಇನ್ನಷ್ಟು ತಮಾಷೆಯಾಗುತ್ತದೆ.', climaxEnding: 'ಅಂಕಲ್ ನಕ್ಕು ಎಲ್ಲರಿಗೂ ಚಹಾ ಕೊಡಿಸುತ್ತಾರೆ.' },
    ],
    ad: [
      { titleTag: 'ನಂಬಿಕೆಯ ಹೊಸ ಬೆಳಕು', mood: 'Warm Commercial', characters: 'ಮುಖ್ಯ ಪಾತ್ರ, ತಂದೆ, ಕುಟುಂಬ', situation1: 'ಕತ್ತಲೆ ಮತ್ತು ಗೊಂದಲದ ನಡುವೆ ಸ್ಮಾರ್ಟ್ ಸಾಧನ ಬೆಳಕು ಚೆಲ್ಲುತ್ತದೆ.', situation2: 'ಕಷ್ಟದ ಕೆಲಸ ಕ್ಷಣದಲ್ಲಿ ಸುಲಭವಾಗುತ್ತದೆ.', climaxEnding: 'ನಗುವಿನೊಂದಿಗೆ ಬ್ರ್ಯಾಂಡ್ ಸಂದೇಶ.' },
      { titleTag: 'ಮನೆಯ ರುಚಿಯ ಸಂಭ್ರಮ', mood: 'Energetic Promo', characters: 'ಮುಖ್ಯ ಪಾತ್ರ, ಅಜ್ಜಿ ಕಲ್ಯಾಣಿ, ಮಕ್ಕಳು', situation1: 'ಅಜ್ಜಿಯ ಅಡುಗೆ ಸುವಾಸನೆ ಎಲ್ಲರನ್ನೂ ಆಕರ್ಷಿಸುತ್ತದೆ.', situation2: 'ಎಲ್ಲರೂ ಒಟ್ಟಿಗೆ ರುಚಿ ಸವಿಯುತ್ತಾರೆ.', climaxEnding: 'ಸಂತೋಷದ ಜಾಹೀರಾತು ಮುಕ್ತಾಯ.' },
    ],
  },
  te: {
    thriller: [
      { titleTag: 'రహస్య డైరీ వేట', mood: 'Suspense Thriller', characters: 'ప్రధాన పాత్ర, కార్తీక్, ఇన్‌స్పెక్టర్ అర్జున్', situation1: 'కంగారులో ఉన్న కార్తీక్ ఒక లాక్ చేసిన డైరీని కింద పడేసి చీకటిలో మాయమవుతాడు.', situation2: 'నల్ల వ్యాన్ ముఠా అదే డైరీ కోసం వెతుకుతోందని అర్జున్ హెచ్చరిస్తారు.', climaxEnding: 'పాత వంతెన వద్ద ముఠాను పట్టించి నిజం బయటపెట్టడంతో కథ ముగుస్తుంది.' },
      { titleTag: 'చివరి బస్టాప్ రహస్యం', mood: 'Psychological Thriller', characters: 'ప్రధాన పాత్ర, పొరుగింటి లత, డా. మీనన్', situation1: 'లత ఎవరో ఇంటిని గమనిస్తున్నారని హెచ్చరిస్తుంది.', situation2: 'కరెంట్ పోయిన సమయంలో నేలమాళిగలో కొత్త ఆధారాలు దొరుకుతాయి.', climaxEnding: 'నిజమైన దోషి దొరికి పాత మిస్టరీ వీడుతుంది.' },
    ],
    drama: [
      { titleTag: 'మరచిపోయిన ఉత్తరం', mood: 'Emotional Drama', characters: 'ప్రధాన పాత్ర, పోస్ట్‌మ్యాన్ రాఘవన్, సోదరి దేవిక', situation1: 'ఎదురుగా ఉన్నది పాత ఉత్తరం తెచ్చిన రాఘవన్ అని తెలుస్తుంది.', situation2: 'పాత కుటుంబ బాధలు, నిజాలు బయటకు వచ్చి భావోద్వేగం పెరుగుతుంది.', climaxEnding: 'క్షమాపణతో కుటుంబం మళ్ళీ కలుస్తుంది.' },
      { titleTag: 'వానలో ఇచ్చిన మాట', mood: 'Touching Drama', characters: 'ప్రధాన పాత్ర, అమ్మ లక్ష్మి, స్నేహితుడు రోహన్', situation1: 'అమ్మ ఆరోగ్యం మరియు రోహన్ తెచ్చిన అవకాశం మధ్య సంఘర్షణ మొదలవుతుంది.', situation2: 'బాధ్యతకు, కలకు మధ్య కీలక నిర్ణయం తీసుకోవాల్సి వస్తుంది.', climaxEnding: 'ధైర్యవంతమైన అడుగుతో అమ్మ కళ్ళలో ఆనందం వెలుగుతుంది.' },
    ],
    action: [
      { titleTag: 'అర్ధరాత్రి ఛేజ్', mood: 'High Action', characters: 'ప్రధాన పాత్ర, ఏజెంట్ విక్రమ్, హ్యాకర్ ప్రియ', situation1: 'గాయపడిన విక్రమ్ సీక్రెట్ చిప్ ఇచ్చి బైక్ ముఠా నుండి తప్పించుకోవాలని కోరతాడు.', situation2: 'ప్రియ సూచనలతో మార్కెట్ గుండా ఉత్కంఠభరిత ఛేజ్ సాగుతుంది.', climaxEnding: 'శత్రువులను ఓడించి మిషన్ విజయవంతమవుతుంది.' },
      { titleTag: 'చెక్‌పోస్ట్ పోరాటం', mood: 'Mass Action', characters: 'ప్రధాన పాత్ర, రేంజర్ శంకర్, స్మగ్లర్ ముఠా', situation1: 'శంకర్ గేటు మూసి ముఠాను అడ్డుకోవడానికి సిద్ధమవుతారు.', situation2: 'సిగ్నల్ లేని చోట చుట్టుపక్కల వస్తువులతో పోరాటం జరుగుతుంది.', climaxEnding: 'తెల్లవారేసరికి ముఠా పట్టుబడుతుంది.' },
    ],
    folk: [
      { titleTag: 'అడవి దీపం రహస్యం', mood: 'Folk Mystery', characters: 'ప్రధాన పాత్ర, కాపలాదారు కేలు, పరిశోధకురాలు అనన్య', situation1: 'కేలు తాత మర్రి చెట్టు దాటి వెళ్ళవద్దని హెచ్చరిస్తారు.', situation2: 'అనన్యతో కలిసి పురాతన శాసనంలోని రహస్యాన్ని చదువుతారు.', climaxEnding: 'భయం తొలగి గ్రామానికి శాంతి తిరిగి వస్తుంది.' },
      { titleTag: 'పాత బంగ్లా నీడ', mood: 'Supernatural Mystery', characters: 'ప్రధాన పాత్ర, కుట్టన్, ఫోటోగ్రాఫర్ నందన్', situation1: 'పై గది తలుపు తనంతట తాను తెరుచుకుని తడి అడుగులు కనిపిస్తాయి.', situation2: 'నందన్ కెమెరా ఫోటోలో అద్దంలో ఒక నీడ కనిపిస్తుంది.', climaxEnding: 'పాత పెట్టె తెరవగానే ఊహించని నిజం బయటపడుతుంది.' },
    ],
    scifi: [
      { titleTag: '10 నిమిషాల టైమ్ లూప్', mood: 'Sci-Fi Paradox', characters: 'ప్రధాన పాత్ర, డా. తార, సంజయ్', situation1: 'డా. తార చేతిలోని గడియారం వెనక్కి తిరుగుతూ టైమ్ లూప్‌ను చూపిస్తుంది.', situation2: 'సంజయ్ ల్యాబ్ సిగ్నల్ వల్ల ఆకాశంలో నీలి చీలిక ఏర్పడుతుంది.', climaxEnding: 'చివరి క్షణంలో టైమ్ లూప్ బద్దలవుతుంది.' },
      { titleTag: 'భవిష్యత్తు నుండి కాల్', mood: 'Futuristic Mystery', characters: 'ప్రధాన పాత్ర, కిరణ్, ఏఐ నోవా', situation1: 'రేపటి నుండి వచ్చిన హెచ్చరిక కాల్‌ను కిరణ్ పట్టుకుంటారు.', situation2: 'ఏఐ నోవా సహాయంతో ఎనర్జీ గోడను దాటుతారు.', climaxEnding: 'పెద్ద ప్రమాదం తప్పుతుంది.' },
    ],
    comedy: [
      { titleTag: 'పెళ్ళి మండపం గందరగోళం', mood: 'Laugh-Out Comedy', characters: 'ప్రధాన పాత్ర, పెళ్ళికొడుకు సుకు, మామ మాధవన్, బాబు', situation1: 'దారి తప్పి పరుగెత్తుతూ వచ్చిన పెళ్ళికొడుకు సుకు అని తెలిసి నవ్వు వస్తుంది.', situation2: 'మాధవన్ మామ, బాబు తప్పు స్కూటర్ ఎక్కి కొత్త అయోమయం సృష్టిస్తారు.', climaxEnding: 'నవ్వులతో అందరూ సమయానికి మండపానికి చేరుకుంటారు.' },
      { titleTag: 'పొరుగింటి సరదా తంటా', mood: 'Family Fun', characters: 'ప్రధాన పాత్ర, వర్గీస్ అంకుల్, చిన్నూ', situation1: 'అంకుల్ గొడుగు కొత్త పెయింట్ బెంచ్‌పై పడి గొడవ మొదలవుతుంది.', situation2: 'దాచడానికి చేసిన ప్రయత్నాలన్నీ మరింత నవ్వు తెప్పిస్తాయి.', climaxEnding: 'అంకుల్ నవ్వేసి అందరికీ టీ ఇస్తారు.' },
    ],
    ad: [
      { titleTag: 'నమ్మకమైన కొత్త వెలుగు', mood: 'Warm Commercial', characters: 'ప్రధాన పాత్ర, తండ్రి, కుటుంబం', situation1: 'చీకటిలో స్మార్ట్ ఉత్పత్తి ఆన్ అవ్వగానే అంతా వెలుగుతో నిండిపోతుంది.', situation2: 'కష్టం క్షణంలో సులభంగా మారుతుంది.', climaxEnding: 'నవ్వులతో బ్రాండ్ సందేశం.' },
      { titleTag: 'అసలైన రుచి ఆనందం', mood: 'Energetic Promo', characters: 'ప్రధాన పాత్ర, నానమ్మ కళ్యాణి, పిల్లలు', situation1: 'నానమ్మ వంట వాసన అందరినీ కట్టిపడేస్తుంది.', situation2: 'అందరూ కలిసి ఆనందంగా పంచుకుంటారు.', climaxEnding: 'ఆకర్షణీయమైన ప్రకటన ముగింపు.' },
    ],
  },
};

export function generateStoryAnglesLocal(
  premise: string,
  lang: AppLang = 'ml',
  targetShotCount: number = 8
): StoryAngle[] {
  const baseText = premise.trim().replace(/\s+/g, ' ');
  const pack = DYNAMIC_STORY_PACKS[lang] || DYNAMIC_STORY_PACKS.ml;
  const expansionPack = STORY_EXPANSION_BLUEPRINTS[lang] || STORY_EXPANSION_BLUEPRINTS.ml;
  const sentences = splitStorySentences(baseText);

  // Extract ONLY a concise 1-sentence opening seed and NEVER repeat it in Middle or Ending
  const rawSeed = sentences[0] || baseText;
  const seedOpening =
    rawSeed.length > 160 ? `${rawSeed.slice(0, 157).trim()}...` : rawSeed.replace(/[.।!?]+$/g, '').trim();

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
      ? `തുടക്കം മുതൽ ഒടുക്കം വരെ എല്ലാ കഥാപാത്രങ്ങളുടെയും വേഷവും പശ്ചാത്തലവും എല്ലാ ${targetShotCount} ഷോട്ടിലും ഒരേപോലെ തുടരുന്നു.`
      : `Lock exact character faces, added supporting cast wardrobe, key props & atmosphere seamlessly across all ${targetShotCount} clips.`;

  const allAngles: StoryAngle[] = [];
  let counter = 1;

  pack.categories.forEach((cat) => {
    const pair = expansionPack[cat.catKey];
    pair.forEach((arc, lensIdx) => {
      const bgmText = (bgmByGenre[cat.catKey] && bgmByGenre[cat.catKey][lang]) || bgmByGenre[cat.catKey].en;
      // Clean 4-part flowing story where the user's seed appears ONCE at the beginning and NEVER repeats
      const storySummary = `${seedOpening}. ${arc.situation1} ${arc.situation2} ${arc.climaxEnding}`;

      allAngles.push({
        id: `angle-${counter}`,
        catKey: cat.catKey,
        genre: `${cat.label} (${lensIdx + 1})`,
        title: `${cat.styleTag}: ${arc.titleTag}`,
        mood: arc.mood,
        bgm: bgmText,
        continuity: continuityNote,
        characters: arc.characters,
        storySummary,
        beginning: seedOpening,
        middle: `${arc.situation1} ${arc.situation2}`,
        ending: arc.climaxEnding,
        synopsis: pack.variationLabel(cat.label, lensIdx + 1),
        scriptText: `${seedOpening}.\n${arc.situation1}\n${arc.situation2}\n${arc.climaxEnding}\n\n[CHARACTERS: ${arc.characters}]\n[BGM STYLE: ${bgmText}]`,
      });
      counter++;
    });
  });

  return allAngles;
}

const ORDERED_GENRE_KEYS: GenreKey[] = ['thriller', 'drama', 'action', 'folk', 'scifi', 'comedy', 'ad'];

function inferGenreKey(rawCat: string = '', rawGenre: string = ''): GenreKey | undefined {
  const combined = `${rawCat} ${rawGenre}`.toLowerCase();
  if (/(thriller|ത്രില്ലർ|थ्रिलर|திரில்லர்|ಥ್ರಿಲ್ಲರ್|థ్రిల్లర్|mystery)/.test(combined)) return 'thriller';
  if (/(drama|ഡ്രാമ|ड्रामा|டிராமா|ಡ್ರಾಮಾ|డ్రామా)/.test(combined)) return 'drama';
  if (/(action|ആക്ഷൻ|एक्शन|ஆக்ஷன்|ಆಕ್ಷನ್|యాక్షన్)/.test(combined)) return 'action';
  if (/(folk|ഫോക്ക്|लोक|நாட்டுப்புற|ಜಾನಪದ|జానపద)/.test(combined)) return 'folk';
  if (/(sci[- ]?fi|സയൻസ്|साइंस|சயின்ஸ்|ಸೈನ್ಸ್|సైన్స్)/.test(combined)) return 'scifi';
  if (/(comedy|കോമഡി|कॉमेडी|காமெடி|ಕಾಮಿಡಿ|కామెడీ|fun)/.test(combined)) return 'comedy';
  if (/(\bad\b|commercial|promo|കൊമേഴ്സ്യൽ|പരസ്യം|विज्ञापन|விளம்பரம்|ಜಾಹೀರಾತು|ప్రకటన)/.test(combined)) return 'ad';
  return undefined;
}

export function mergeAnglesEnsuringAllCategories(
  aiAngles: StoryAngle[],
  fallbackAngles: StoryAngle[]
): StoryAngle[] {
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
      stageTag: 'ഭാഗം 3 — നിശബ്ദ വിഷ്വൽ നിമിഷം (Visual Beat)',
      sceneType: 'visual-comedy',
      situationLine: (b) => `${b} — സംഭാഷണങ്ങളില്ലാതെ മുഖഭാവങ്ങളും സൂക്ഷ്മ ചലനങ്ങളും കൊണ്ട് ഈ സാഹചര്യത്തിന്റെ തീവ്രത പൂർണ്ണമായും ദൃശ്യവൽക്കരിക്കുന്നു`,
      cameraHint: 'Dynamic medium-low visual frame capturing expressive wide eyes, sudden movement & prop detail',
      visualMotion: 'Whip-pan camera rhythm catching sudden reaction, swift movement, and tense stillness',
    },
    {
      stageTag: 'ഭാഗം 4 — പുതിയ വഴിത്തിരിവ് (Escalating Obstacle)',
      sceneType: 'dialogue',
      situationLine: (b) => `${b} — പുതിയ കഥാപാത്രത്തിന്റെയോ അപ്രതീക്ഷിത സാഹചര്യത്തിന്റെയോ വരവോടെ കഥ കൂടുതൽ സങ്കീർണ്ണമാകുന്നു`,
      cameraHint: 'Over-the-shoulder framing with sharp foreground focus and tense background arrival',
      visualMotion: 'Steadicam push-in as characters confront the sudden turning point face-to-face',
    },
    {
      stageTag: 'ഭാഗം 5 — പ്രതിസന്ധിയുടെ നിർണ്ണായക ഘട്ടം (Visual Twist)',
      sceneType: 'visual-comedy',
      situationLine: (b) => `${b} — പ്രധാന വിവരമോ തെളിവോ അപ്രതീക്ഷിതമായി വെളിപ്പെടുന്ന നിശബ്ദ വിഷ്വൽ വഴിത്തിരിവ്`,
      cameraHint: 'Tight close-up insert cut on crucial prop followed by stunned reaction still',
      visualMotion: 'Fast rack-focus from key clue directly to silent wide-eyed close-up expression',
    },
    {
      stageTag: 'ഭാഗം 6 — ഉച്ചസ്ഥായിയിലെ സംഘർഷം (Peak Climax)',
      sceneType: 'dialogue',
      situationLine: (b) => `${b} — എല്ലാ സംഭവങ്ങളും ഒന്നിച്ച് കൂട്ടിയിടിച്ച് വേഗതയേറിയ മറുപടികളും ആവേശവും നിറഞ്ഞ ക്ലൈമാക്സ് നിമിഷം`,
      cameraHint: 'Energetic wide shot with multiple characters reacting dynamically across the scene',
      visualMotion: 'Rapid handheld tracking circling characters through the peak dramatic/comedic clash',
    },
    {
      stageTag: 'ഭാഗം 7 — ഹൃദ്യമായ മാറ്റവും തിരിച്ചറിവും (Unexpected Turning Point)',
      sceneType: 'visual-comedy',
      situationLine: (b) => `${b} — നിർണ്ണായക നിമിഷത്തിൽ സത്യം തെളിയുകയും എല്ലാവരുടെയും ഭാവം മാറുകയും ചെയ്യുന്നു`,
      cameraHint: 'Soft golden close-up capturing sincere eye contact, decisive gesture & warm atmospheric light',
      visualMotion: 'Slow gentle push-in dissolving high tension into quiet clarity and relief',
    },
    {
      stageTag: 'ഭാഗം 8 — പൂർണ്ണമായ അന്ത്യം (Satisfying Conclusion)',
      sceneType: 'dialogue',
      situationLine: (b) => `${b} — തുടക്കത്തിലെ പ്രശ്നങ്ങളെല്ലാം മനോഹരമായി പരിഹരിക്കപ്പെട്ട് വ്യക്തമായ ഫൈനൽ അന്ത്യത്തിലെത്തുന്നു`,
      cameraHint: 'Warm wide pull-back framing all key characters together cleanly in golden closing light',
      visualMotion: 'Smooth crane pull-out leaving the characters together in harmonious story closure',
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
      stageTag: 'Part 3 — Pure Visual Beat (No Dialogue)',
      sceneType: 'visual-comedy',
      situationLine: (b) => `${b} — Told purely through expressive faces, prop details, and physical motion without spoken words`,
      cameraHint: 'Wide-angle visual storytelling keyframe highlighting sudden movement, prop focus & sharp reaction',
      visualMotion: 'Zippy Steadicam follow with whip-pan catching physical reaction and wide-eyed glances',
    },
    {
      stageTag: 'Part 4 — Escalating Twist & New Character Entry',
      sceneType: 'dialogue',
      situationLine: (b) => `${b} — The newly introduced character raises the stakes with a fresh obstacle`,
      cameraHint: 'Over-the-shoulder two-character framing contrasting tension and unfolding conflict',
      visualMotion: 'Controlled push-in as characters confront the unexpected new situation directly',
    },
    {
      stageTag: 'Part 5 — Crucial Turning Reveal (Visual Twist)',
      sceneType: 'visual-comedy',
      situationLine: (b) => `${b} — Silent visual reveal spotlights a hidden clue or sudden reversal`,
      cameraHint: 'Macro close-up insert frame on key object shifting smoothly to stunned reaction',
      visualMotion: 'Crisp rack-focus from decisive detail straight into close-up expression',
    },
    {
      stageTag: 'Part 6 — Peak Confrontation / Climax Action',
      sceneType: 'dialogue',
      situationLine: (b) => `${b} — All story threads collide in high-stakes rapid exchanges and peak energy`,
      cameraHint: 'Dynamic ensemble wide frame capturing colliding reactions across the scene',
      visualMotion: 'Energetic handheld tracking weaving rapidly between central and supporting characters',
    },
    {
      stageTag: 'Part 7 — Unexpected Heart & Resolution Shift',
      sceneType: 'visual-comedy',
      situationLine: (b) => `${b} — A quiet decisive action shifts momentum toward the climax outcome`,
      cameraHint: 'Intimate warm close-up illuminated by balanced key light highlighting sincere emotion',
      visualMotion: 'Slow emotional dolly-in dissolving high tension into quiet clarity',
    },
    {
      stageTag: 'Part 8 — Warm Resolution & Closing Beat',
      sceneType: 'dialogue',
      situationLine: (b) => `${b} — Closing moment wraps up every character arc back to the opening hook cleanly`,
      cameraHint: 'Balanced wide closing keyframe uniting key characters cleanly in warm ambient light',
      visualMotion: 'Graceful pull-back tracking out as music resolves into a memorable ending beat',
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
      stageTag: 'भाग 3 — बिना डायलॉग विज़ुअल मोड़',
      sceneType: 'visual-comedy',
      situationLine: (b) => `${b} — बिना शब्दों के चेहरे के भाव और हरकतों से इस स्थिति को प्रभावशाली रूप से दिखाया जाता है`,
      cameraHint: 'Dynamic visual frame capturing sudden reaction and prop movement',
      visualMotion: 'Lively Steadicam chase catching expressive reactions',
    },
    {
      stageTag: 'भाग 4 — नई मुसीबत और नया पात्र',
      sceneType: 'dialogue',
      situationLine: (b) => `${b} — नए पात्र के आने से कहानी में नया मोड़ और संघर्ष जुड़ता है`,
      cameraHint: 'Over-the-shoulder two-character framing highlighting tension',
      visualMotion: 'Push-in while characters confront the unexpected situation',
    },
    {
      stageTag: 'भाग 5 — निर्णायक मोड़ (विज़ुअल ट्विस्ट)',
      sceneType: 'visual-comedy',
      situationLine: (b) => `${b} — एक अहम सुराग या अचानक पलटाव चुपचाप सामने आता है`,
      cameraHint: 'Tight close-up on key prop followed by stunned reaction',
      visualMotion: 'Rack-focus from crucial detail to silent wide-eyed expression',
    },
    {
      stageTag: 'भाग 6 — कहानी का चरम (क्लाइमेक्स)',
      sceneType: 'dialogue',
      situationLine: (b) => `${b} — सभी घटनाएँ और पात्र एक साथ टकराकर क्लाइमेक्स रचते हैं`,
      cameraHint: 'Energetic group wide frame with dynamic poses',
      visualMotion: 'Handheld tracking circling dramatic/comedic reactions',
    },
    {
      stageTag: 'भाग 7 — दिल छू लेने वाला बदलाव',
      sceneType: 'visual-comedy',
      situationLine: (b) => `${b} — अंतिम सच सामने आते ही पूरा माहौल बदल जाता है`,
      cameraHint: 'Warm close-up in golden light showing genuine emotion',
      visualMotion: 'Slow heartfelt push-in shifting tension to clarity',
    },
    {
      stageTag: 'भाग 8 — पूर्ण और यादगार अंत',
      sceneType: 'dialogue',
      situationLine: (b) => `${b} — सारी उलझनें सुलझकर कहानी सार्थक और संतोषजनक अंत पर पहुँचती है`,
      cameraHint: 'Warm closing wide shot together',
      visualMotion: 'Smooth pull-back ending on resolved expressions',
    },
  ],
  ta: [
    { stageTag: 'பகுதி 1 — அறிமுகம் & திடீர் வருகை', sceneType: 'dialogue', situationLine: (b) => `${b} — கதை அமைதியான சூழலில் சுவாரஸ்யமாகத் தொடங்குகிறது`, cameraHint: 'Wide 35mm establishing still', visualMotion: 'Smooth slow dolly-in' },
    { stageTag: 'பகுதி 2 — முதல் சிக்கல்', sceneType: 'dialogue', situationLine: (b) => `${b} — புதிய திருப்பத்தால் முதல் சவாலும் குழப்பமும் ஏற்படுகிறது`, cameraHint: 'Two-shot reaction framing', visualMotion: 'Responsive pan between faces' },
    { stageTag: 'பகுதி 3 — வசனமில்லா விஷுவல் காட்சி', sceneType: 'visual-comedy', situationLine: (b) => `${b} — வசனம் இன்றி முகபாவங்களும் உடல் அசைவுகளும் கதையை நகர்த்துகின்றன`, cameraHint: 'Dynamic visual wide still', visualMotion: 'Whip-pan expressive tracking' },
    { stageTag: 'பகுதி 4 — புதிய கதாபாத்திரத்தின் வருகை', sceneType: 'dialogue', situationLine: (b) => `${b} — புதிய கதாபாத்திரத்தின் வருகையால் நிலைமை மேலும் தீவிரமாகிறது`, cameraHint: 'Over-the-shoulder two-shot frame', visualMotion: 'Tense push-in' },
    { stageTag: 'பகுதி 5 — முக்கியத் திருப்பம்', sceneType: 'visual-comedy', situationLine: (b) => `${b} — மறைந்திருந்த உண்மை அல்லது முக்கியத் தடயம் வெளிப்படும் தருணம்`, cameraHint: 'Tight macro detail + shock close-up', visualMotion: 'Rack-focus reveal' },
    { stageTag: 'பகுதி 6 — உச்சகட்ட கிளைமேக்ஸ்', sceneType: 'dialogue', situationLine: (b) => `${b} — அனைத்துச் சூழல்களும் ஒன்றிணைந்து உச்சகட்டக் காட்சி நடக்கிறது`, cameraHint: 'Ensemble room-wide reaction shot', visualMotion: 'Energetic handheld tracking' },
    { stageTag: 'பகுதி 7 — மனதை மாற்றும் நெகிழ்ச்சி', sceneType: 'visual-comedy', situationLine: (b) => `${b} — தீர்மானமான செயலால் அனைவரின் நிலையும் மாறுகிறது`, cameraHint: 'Warm close-up keyframe', visualMotion: 'Slow emotional dolly-in' },
    { stageTag: 'பகுதி 8 — இனிமையான முடிவு', sceneType: 'dialogue', situationLine: (b) => `${b} — சிக்கல்கள் எல்லாம் தீர்ந்து கதை முழுமையாக நிறைவடைகிறது`, cameraHint: 'Warm wide pull-back closing shot', visualMotion: 'Graceful crane pull-out' },
  ],
  kn: [
    { stageTag: 'ಭಾಗ 1 — ಆರಂಭ ಮತ್ತು ಪ್ರವೇಶ', sceneType: 'dialogue', situationLine: (b) => `${b} — ಕಥೆಯ ಸ್ಪಷ್ಟ ಆರಂಭ ಮತ್ತು ಸನ್ನಿವೇಶದ ಪರಿಚಯ`, cameraHint: 'Wide 35mm establishing frame', visualMotion: 'Smooth dolly-in' },
    { stageTag: 'ಭಾಗ 2 — ಮೊದಲ ಗೊಂದಲ', sceneType: 'dialogue', situationLine: (b) => `${b} — ಅನಿರೀಕ್ಷಿತ ತಿರುವಿನಿಂದ ಮೊದಲ ಸಮಸ್ಯೆ ಶುರುವಾಗುತ್ತದೆ`, cameraHint: 'Medium two-shot reaction', visualMotion: 'Crisp face-to-face pan' },
    { stageTag: 'ಭಾಗ 3 — ಡೈಲಾಗ್ ಇಲ್ಲದ ವಿಷುಯಲ್ ಕ್ಷಣ', sceneType: 'visual-comedy', situationLine: (b) => `${b} — ಮಾತಿಲ್ಲದೆ ಕೇವಲ ಮುಖಭಾವ ಮತ್ತು ಚಲನೆಯಿಂದ ಸನ್ನಿವೇಶ ತೆರೆದುಕೊಳ್ಳುತ್ತದೆ`, cameraHint: 'Dynamic expressive wide shot', visualMotion: 'Zippy Steadicam tracking' },
    { stageTag: 'ಭಾಗ 4 — ಹೊಸ ಪಾತ್ರ ಮತ್ತು ತಿರುವು', sceneType: 'dialogue', situationLine: (b) => `${b} — ಹೊಸ ಪಾತ್ರದ ಪ್ರವೇಶದಿಂದ ಪರಿಸ್ಥಿತಿ ಇನ್ನಷ್ಟು ಕುತೂಹಲಕಾರಿಯಾಗುತ್ತದೆ`, cameraHint: 'Over-the-shoulder doorway shot', visualMotion: 'Subtle push-in' },
    { stageTag: 'ಭಾಗ 5 — ರಹಸ್ಯ ಬಯಲಾಗುವ ತಿರುವು', sceneType: 'visual-comedy', situationLine: (b) => `${b} — ಮುಖ್ಯ ಸುಳಿವು ಸದ್ದಿಲ್ಲದೆ ಬಯಲಾಗುವ ನಿರ್ಣಾಯಕ ಕ್ಷಣ`, cameraHint: 'Close-up key prop + shock', visualMotion: 'Quick rack-focus reaction' },
    { stageTag: 'ಭಾಗ 6 — ಕ್ಲೈಮ್ಯಾಕ್ಸ್ ಹಂತ', sceneType: 'dialogue', situationLine: (b) => `${b} — ಎಲ್ಲಾ ಘಟನೆಗಳು ಒಟ್ಟಾಗಿ ಸೇರಿ ಕ್ಲೈಮ್ಯಾಕ್ಸ್ ತಲುಪುತ್ತದೆ`, cameraHint: 'Ensemble reaction wide frame', visualMotion: 'Handheld circling camera' },
    { stageTag: 'ಭಾಗ 7 — ಹೃದಯ ಸ್ಪರ್ಶಿಸುವ ಬದಲಾವಣೆ', sceneType: 'visual-comedy', situationLine: (b) => `${b} — ನಿರ್ಣಾಯಕ ಘಟನೆ ಎಲ್ಲರ ಮನಸ್ಸನ್ನು ಗೆಲ್ಲುತ್ತದೆ`, cameraHint: 'Soft warm close-up portrait', visualMotion: 'Slow gentle dolly-in' },
    { stageTag: 'ಭಾಗ 8 — ಸಂತೋಷದ ಅಂತ್ಯ', sceneType: 'dialogue', situationLine: (b) => `${b} — ಎಲ್ಲಾ ಸಮಸ್ಯೆಗಳು ಬಗೆಹರಿದು ಕಥೆ ಸುಂದರವಾಗಿ ಮುಕ್ತಾಯವಾಗುತ್ತದೆ`, cameraHint: 'Balanced warm wide finale', visualMotion: 'Smooth pull-back closing shot' },
  ],
  te: [
    { stageTag: 'భాగం 1 — పరిచయం & ఆకస్మిక ప్రవేశం', sceneType: 'dialogue', situationLine: (b) => `${b} — కథ స్పష్టమైన ప్రారంభంతో సహజ వాతావరణంలో మొదలవుతుంది`, cameraHint: 'Wide 35mm establishing frame', visualMotion: 'Smooth dolly-in' },
    { stageTag: 'భాగం 2 — మొదటి మలుపు', sceneType: 'dialogue', situationLine: (b) => `${b} — అనుకోని సంఘటనతో మొదటి సమస్య మొదలవుతుంది`, cameraHint: 'Medium two-shot frame', visualMotion: 'Quick pan between expressions' },
    { stageTag: 'భాగం 3 — డైలాగ్ లేని విజువల్ సన్నివేశం', sceneType: 'visual-comedy', situationLine: (b) => `${b} — మాటలు లేకుండా హావభావాలు, శరీర కదలికలతో కథ ముందుకు సాగుతుంది`, cameraHint: 'Expressive wide angle frame', visualMotion: 'Whip-pan expressive motion' },
    { stageTag: 'భాగం 4 — కొత్త పాత్ర రాక & చిక్కు', sceneType: 'dialogue', situationLine: (b) => `${b} — కొత్త పాత్ర రాకతో కథ మరింత ఉత్కంఠభరితంగా మారుతుంది`, cameraHint: 'Over-the-shoulder character frame', visualMotion: 'Nervous push-in' },
    { stageTag: 'భాగం 5 — కీలక మలుపు', sceneType: 'visual-comedy', situationLine: (b) => `${b} — ముఖ్యమైన ఆధారం నిశ్శబ్దంగా బయటపడే కీలక క్షణం`, cameraHint: 'Tight close-up prop + shock still', visualMotion: 'Crisp rack-focus reveal' },
    { stageTag: 'భాగం 6 — క్లైమాక్స్ ఘట్టం', sceneType: 'dialogue', situationLine: (b) => `${b} — అన్ని సంఘటనలు ఒక్కసారిగా కలిసి క్లైమాక్స్ తారాస్థాయికి చేరుతుంది`, cameraHint: 'Ensemble wide reaction frame', visualMotion: 'Energetic handheld tracking' },
    { stageTag: 'భాగం 7 — మనసు మార్చే మలుపు', sceneType: 'visual-comedy', situationLine: (b) => `${b} — కీలక నిర్ణయం అందరి మనసులను హత్తుకుంటుంది`, cameraHint: 'Warm close-up keyframe', visualMotion: 'Slow tender dolly-in' },
    { stageTag: 'భాగం 8 — సంతోషకరమైన ముగింపు', sceneType: 'dialogue', situationLine: (b) => `${b} — సమస్యలన్నీ పరిష్కారమై కథ ఆనందంగా ముగుస్తుంది`, cameraHint: 'Warm wide pull-back finale', visualMotion: 'Graceful closing pull-out' },
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
  const rawScript = (script || '').trim();
  const charMatch = rawScript.match(/\[CHARACTERS:\s*([^\]]+)\]/i);
  const bgmMetaMatch = rawScript.match(/\[BGM STYLE:\s*([^\]]+)\]/i);
  const parsedCast = charMatch?.[1]
    ? charMatch[1]
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    : [];
  const cleanScript = rawScript
    .replace(/\[CHARACTERS:[^\]]*\]/gi, '')
    .replace(/\[BGM STYLE:[^\]]*\]/gi, '')
    .replace(/\[CONTINUITY:[^\]]*\]/gi, '')
    .trim();
  const storyBeats = splitStorySentences(cleanScript);
  const effectiveBeats = storyBeats.length > 0 ? storyBeats : [cleanScript || rawScript];

  const effectiveMode: DialogueMode = isExplicitlySilent(cleanScript) ? 'silent' : dialogueMode;
  const hasPhotos = Array.isArray(characterPhotos) && characterPhotos.length > 0;
  const castContinuitySuffix = parsedCast.length > 0 ? ` (${parsedCast.join(', ')})` : '';
  const continuityTag = hasPhotos
    ? `Strict Character Face ID, Clothing, Prop & Lighting Continuity Locked to Reference Photo${castContinuitySuffix}`
    : `Exact Subject Face, Clothing, Key Props & Location Atmosphere Continuous From Shot 01${castContinuitySuffix}`;

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
    const bgmCue = bgmMetaMatch?.[1]
      ? `${bgmMetaMatch[1]} — ${buildShotBgmCue(beatText, idx, numShots)}`
      : buildShotBgmCue(beatText, idx, numShots);

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
        // Explicit No-Dialogue / Visual scene!
        dialogueLine = '';
      }
    }

    const distinctAction = `${arc.stageTag}: ${arc.situationLine(beatText)}${
      idx >= arcBlueprints.length ? ` (${subPhase.actionSuffix(shotNum, numShots)})` : ''
    }`;

    const activeCharacters =
      parsedCast.length > 0
        ? idx === 0
          ? [parsedCast[0]]
          : parsedCast.slice(0, Math.min(parsedCast.length, 2 + (idx % 2)))
        : [deriveSubjectLabel(beatText, lang)];

    const imagePrompt = `[PHOTO KEYFRAME PROMPT — SHOT ${shotNum.toString().padStart(2, '0')}]: Photorealistic 35mm static film frame (${arc.stageTag}). Scene: ${beatText}. Characters: ${activeCharacters.join(', ')}. Framing: ${arc.cameraHint} (${cameraStyle}). Continuity Lock: ${continuityTag}. Lighting: ${lightStyle}, 8k crisp detail, no text overlays.`;

    const audioInstruction = dialogueLine
      ? `Spoken Dialogue (${lang.toUpperCase()}): "${dialogueLine}". Background Music & SFX: ${bgmCue}`
      : `NO DIALOGUE / VISUAL BEAT: Express story purely through physical action, facial timing, and ambient SFX. Background Music & SFX: ${bgmCue}`;

    const videoPrompt = `[VIDEO MOTION PROMPT — SHOT ${shotNum.toString().padStart(2, '0')}]: Continuous 24fps sequence${
      shotNum > 1 ? ` seamlessly following Shot ${(shotNum - 1).toString().padStart(2, '0')}` : ''
    }. Visual Beat: ${arc.situationLine(beatText)}. Active Characters: ${activeCharacters.join(', ')}. Motion & Camera: ${arc.visualMotion}. Continuity Lock: ${continuityTag}. ${audioInstruction} Duration: ${preferredShotDuration}s.`;

    return {
      shotNumber: shotNum,
      durationSeconds: preferredShotDuration,
      timing: `Shot ${shotNum.toString().padStart(2, '0')} — ${preferredShotDuration}s`,
      action: distinctAction,
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
