export type AppLang = 'ml' | 'en' | 'hi' | 'ta' | 'kn' | 'te';

export interface LangOption {
  code: AppLang;
  label: string;
  nativeName: string;
  ttsLang: string;
  ttsVoice: string;
  geminiLangName: string;
}

export const LANGUAGE_OPTIONS: LangOption[] = [
  { code: 'ml', label: 'Malayalam', nativeName: 'മലയാളം', ttsLang: 'ml-IN', ttsVoice: 'ml-IN-MidhunNeural', geminiLangName: 'Malayalam (മലയാളം)' },
  { code: 'en', label: 'English', nativeName: 'English', ttsLang: 'en-IN', ttsVoice: 'en-IN-PrabhatNeural', geminiLangName: 'English' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', ttsLang: 'hi-IN', ttsVoice: 'hi-IN-MadhurNeural', geminiLangName: 'Hindi (हिन्दी)' },
  { code: 'ta', label: 'Tamil', nativeName: 'தமிழ்', ttsLang: 'ta-IN', ttsVoice: 'ta-IN-ValluvarNeural', geminiLangName: 'Tamil (தமிழ்)' },
  { code: 'kn', label: 'Kannada', nativeName: 'ಕನ್ನಡ', ttsLang: 'kn-IN', ttsVoice: 'kn-IN-GaganNeural', geminiLangName: 'Kannada (ಕನ್ನಡ)' },
  { code: 'te', label: 'Telugu', nativeName: 'తెలుగు', ttsLang: 'te-IN', ttsVoice: 'te-IN-MohanNeural', geminiLangName: 'Telugu (తెలుగు)' },
];

export function getLangConfig(code?: string): LangOption {
  return LANGUAGE_OPTIONS.find((l) => l.code === code) || LANGUAGE_OPTIONS[0];
}

export type VoicePace = 'story' | 'narrator' | 'calm';

export const VOICE_PACE_SETTINGS: Record<
  VoicePace,
  { edgeRate: string; edgePitch: string; audioPlaybackRate: number; webRate: number; pauseMs: number }
> = {
  story: { edgeRate: '-6%', edgePitch: '+0Hz', audioPlaybackRate: 1.0, webRate: 0.90, pauseMs: 240 },
  narrator: { edgeRate: '-8%', edgePitch: '-1Hz', audioPlaybackRate: 1.0, webRate: 0.88, pauseMs: 280 },
  calm: { edgeRate: '-15%', edgePitch: '+0Hz', audioPlaybackRate: 1.0, webRate: 0.82, pauseMs: 360 },
};

const ML_TERM_MAP: [RegExp, string][] = [
  [/\bthriller\b/gi, 'ത്രില്ലർ'],
  [/\bmystery\b/gi, 'മിസ്റ്ററി'],
  [/\bdrama\b/gi, 'ഡ്രാമ'],
  [/\bemotional\b/gi, 'വൈകാരികം'],
  [/\baction\b/gi, 'ആക്ഷൻ'],
  [/\bcomedy\b/gi, 'കോമഡി'],
  [/\bfun\b/gi, 'തമാശ'],
  [/\bsci[- ]?fi\b/gi, 'സയൻസ് ഫിക്ഷൻ'],
  [/\bfolk\b/gi, 'നാടോടി'],
  [/\bhorror\b/gi, 'ഹൊറർ'],
  [/\bcommercial\b/gi, 'പരസ്യം'],
  [/\bads?\b/gi, 'പരസ്യം'],
  [/\bpromo\b/gi, 'പ്രൊമോ'],
  [/\bbgm\b/gi, 'പശ്ചാത്തല സംഗീതം'],
  [/\bsfx\b/gi, 'ശബ്ദവിന്യാസം'],
  [/\bcontinuity\b/gi, 'തുടർച്ച'],
  [/\bscene\b/gi, 'രംഗം'],
  [/\bshot\b/gi, 'ഷോട്ട്'],
  [/\btwist\b/gi, 'വഴിത്തിരിവ്'],
  [/\bclimax\b/gi, 'ക്ലൈമാക്സ്'],
  [/\bsuspense(ful)?\b/gi, 'ആകാംക്ഷ'],
  [/\bmass\b/gi, 'മാസ്'],
  [/\bai\b/gi, 'എ ഐ'],
];

/**
 * Cleans emojis/symbols and removes foreign Latin fragments on non-English languages
 * so neural TTS speaks with crisp native pronunciation (അക്ഷരസ്ഫുടത).
 */
export function cleanTextForSpeech(rawText: string, lang: AppLang = 'ml'): string {
  const andConnector =
    lang === 'en' ? ' and ' : lang === 'hi' ? ' और ' : ', ';

  let cleaned = rawText
    // Remove bracketed studio metadata e.g. [BGM STYLE: ...]
    .replace(/\[[^\]]*\]/g, ' ')
    // Strip emojis, pictographs, variation selectors, zero-width joiners
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, ' ')
    // Replace ampersands and bullets/dashes with natural connectors
    .replace(/\s*&\s*/g, andConnector)
    .replace(/\s*[•●▪▫■□★☆✦✧→➔➡🎬🎙️⏹️]+\s*/g, ', ')
    .replace(/\s*[—–/]+\s*/g, ', ')
    .replace(/[()[\]{}]/g, ', ')
    .replace(/["'“”‘’#*]/g, ' ');

  if (lang === 'ml') {
    for (const [pattern, replacement] of ML_TERM_MAP) {
      cleaned = cleaned.replace(pattern, replacement);
    }
  }

  // For non-English Indian languages, strip stray English words & Arabic digits that break accent
  if (lang !== 'en') {
    cleaned = cleaned.replace(/\b[A-Za-z0-9_-]+\b/g, ' ');
  }

  return cleaned
    .replace(/\s*,\s*/g, ', ')
    .replace(/(,\s*){2,}/g, ', ')
    .replace(/,\s*\./g, '.')
    .replace(/([.।!?])\s+/g, '$1 ')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function buildCardNarrationText({
  title,
  summary,
  lang,
}: {
  title: string;
  genre?: string;
  characters?: string;
  summary: string;
  lang: AppLang;
}): string {
  const parts = [
    title ? `${title}.` : '',
    summary || '',
  ].filter(Boolean);

  return cleanTextForSpeech(parts.join('\n'), lang);
}

export interface UiStrings {
  appTitle: string;
  languageLabel: string;
  page1Subtitle: string;
  page2Subtitle: (count: number) => string;
  page3Subtitle: (dur: string, clips: number) => string;
  step1: string;
  step2: (count: number) => string;
  step3: string;
  samplePremise: string;
  premiseLabel: string;
  clearBtn: string;
  premisePlaceholder: string;
  premiseRequiredError: string;
  durationLabel: string;
  unitSecond: string;
  unitMinute: string;
  unitHour: string;
  unitSecondsFull: string;
  unitMinutesFull: string;
  unitHoursFull: string;
  typeCustomDuration: string;
  clipDurationLabel: string;
  selectedTotalTime: string;
  requiredClips: (clips: number, sec: number) => string;
  clipsWord: string;
  generatingAngles: string;
  generateAnglesBtn: (count: number, dur: string, clips: number) => string;
  backToInput: string;
  selectedTimeLabel: string;
  selectStoryTitle: (count: number) => string;
  selectStoryDesc: (count: number, dur: string, clips: number) => string;
  filterAll: (count: number) => string;
  filterThriller: string;
  filterAction: string;
  filterDrama: string;
  filterComedy: string;
  filterScifi: string;
  filterFolk: string;
  filterAd: string;
  charactersLabel: string;
  storyOverviewLabel: string;
  bgmLabel: string;
  continuityLabel: string;
  shotBgmLabel: string;
  shotDialogueLabel: string;
  dialogueModeLabel: string;
  dialogueModeDynamic: string;
  dialogueModeDialogue: string;
  dialogueModeSilent: string;
  voiceLoadingStop: string;
  voiceStop: string;
  voicePlay: string;
  voicePaceLabel: string;
  paceVerySlow: string;
  paceSlow: string;
  paceNormal: string;
  selectThisStory: (clips: number) => string;
  backToAngles: string;
  preparingPrompts: (dur: string, clips: number) => string;
  breakdownTitle: string;
  breakdownEditHint: string;
  totalSceneClips: (count: number, dur: string) => string;
  copiedVideoPromptBtn: string;
  copyVideoPromptBtn: string;
  shotActionLabel: string;
  videoPromptHeading: string;
  copiedVideoShort: string;
  copyVideoWithDialogue: string;
  imagePromptHeading: string;
  copiedImageShort: string;
  copyImageShort: string;
  masterBlockDesc: string;
  masterCopied: string;
  masterCopyBoth: string;
  loadMorePrompts: (shown: number, total: number) => string;
  editShotBtn: string;
  doneEditingBtn: string;
  viewAllShotsBtn: string;
  viewSingleShotBtn: string;
  prevShotBtn: string;
  nextShotBtn: string;
  shotOfTotal: (curr: number, total: number) => string;
  angleErrorFallback: string;
  breakdownErrorFallback: string;
  categorySelectorLabel: string;
  categorySearchPlaceholder: string;
  allCategoriesLabel: string;
  categoriesCountBadge: (count: number) => string;
  cameraAngleLabel: string;
  lightingCueLabel: string;
  pureVisualBadge: string;
  offlineFallbackBtn: string;
}

export const UI_TRANSLATIONS: Record<AppLang, UiStrings> = {
  ml: {
    appTitle: 'AI സിനിമാറ്റിക് സ്റ്റോറി & പ്രോംപ്റ്റ് സ്റ്റുഡിയോ',
    languageLabel: 'ഭാഷ തിരഞ്ഞെടുക്കുക',
    page1Subtitle: 'പേജ് 1: കഥയുടെ ആമുഖവും ആകെ സിനിമ ദൈർഘ്യവും',
    page2Subtitle: (c) => `പേജ് 2: ${c} വ്യത്യസ്ത കഥാ രൂപങ്ങൾ തിരഞ്ഞെടുക്കുക`,
    page3Subtitle: (d, clips) => `പേജ് 3: പ്രോംപ്റ്റുകൾ — ${d} (${clips} ക്ലിപ്പുകൾ)`,
    step1: '1. ആമുഖം',
    step2: (c) => `2. കഥകൾ (${c})`,
    step3: '3. പ്രോംപ്റ്റുകൾ',
    samplePremise: 'രാജീവ് വൈകുന്നേരം നാട്ടിലെ ചായക്കടയിലിരുന്ന് ഗ്ലാസിൽ ചൂടുചായ കുടിക്കുന്നു. ചായ കുടിച്ചു കഴിഞ്ഞ് ബെഞ്ചിൽ നിന്ന് എണീറ്റ് റോഡിലേക്ക് ഇറങ്ങി നടക്കുന്നു. വൈകുന്നേരത്തെ വെളിച്ചത്തിൽ തറവാട്ടു വീട്ടിനുള്ളിലേക്ക് കയറിച്ചെല്ലുന്നു.',
    premiseLabel: '1. കഥയുടെ ആമുഖം ടൈപ്പ് ചെയ്യുക (Story Concept Input)',
    clearBtn: 'ക്ലിയർ ചെയ്യുക ✕',
    premisePlaceholder: 'നിങ്ങളുടെ കഥയുടെ ചുരുങ്ങിയ ആമുഖം അല്ലെങ്കിൽ കോൺസെപ്റ്റ് ഇവിടെ ടൈപ്പ് ചെയ്യുക...',
    premiseRequiredError: 'ദയവായി കഥയുടെ ഒരു ആമുഖം അല്ലെങ്കിൽ ആശയം നൽകുക.',
    durationLabel: '2. ആകെ സിനിമ / വീഡിയോ ദൈർഘ്യം',
    unitSecond: 'സെക്കൻഡ്',
    unitMinute: 'മിനിറ്റ്',
    unitHour: 'മണിക്കൂർ',
    unitSecondsFull: 'സെക്കൻഡ് (Seconds)',
    unitMinutesFull: 'മിനിറ്റ് (Minutes)',
    unitHoursFull: 'മണിക്കൂർ (Hours)',
    typeCustomDuration: 'അല്ലെങ്കിൽ ദൈർഘ്യം ടൈപ്പ് ചെയ്യുക:',
    clipDurationLabel: 'ക്ലിപ്പ് ദൈർഘ്യം:',
    selectedTotalTime: '🎬 തിരഞ്ഞെടുത്തിരിക്കുന്ന ആകെ സിനിമ സമയം:',
    requiredClips: (clips, sec) => `ആവശ്യമായ ക്ലിപ്പുകൾ: ${clips} ക്ലിപ്പുകൾ (${clips} x ${sec}s പ്രോംപ്റ്റുകൾ)`,
    clipsWord: 'ക്ലിപ്പുകൾ',
    generatingAngles: 'കഥാ ശൈലികൾ നിർമ്മിക്കുന്നു...',
    generateAnglesBtn: (c, d, clips) => `${c} കഥാ രൂപങ്ങൾ നിർമ്മിക്കുക (${d} / ${clips} ക്ലിപ്പുകൾ) ➔`,
    backToInput: '← ബാക്ക് (ആമുഖത്തിലേക്കും സമയം തിരുത്തലിലേക്കും പോകുക)',
    selectedTimeLabel: 'തിരഞ്ഞെടുത്ത സമയം:',
    selectStoryTitle: (c) => `${c} കഥാ ശൈലികളിൽ നിന്നു നിങ്ങളുടെ കഥ തിരഞ്ഞെടുക്കുക`,
    selectStoryDesc: (c, d, clips) => `താഴെ നൽകിയിരിക്കുന്ന ${c} സിനിമ കഥകളിൽ ഒന്ന് തിരഞ്ഞെടുത്താൽ അടുത്ത പേജിൽ ${d} നീളമുള്ള സിനിമയ്ക്ക് ആവശ്യമായ ${clips} പ്രോംപ്റ്റുകൾ ലഭിക്കും.`,
    filterAll: (c) => `എല്ലാ കഥകളും (${c})`,
    filterThriller: '🕵️ ത്രില്ലർ & ക്രൈം',
    filterAction: '💥 ആക്ഷൻ & മാസ്',
    filterDrama: '🎭 ഡ്രാമ & ഇമോഷണൽ',
    filterComedy: '😂 കോമഡി & ഫൺ',
    filterScifi: '⏳ സയൻസ് ഫിക്ഷൻ',
    filterFolk: '🌿 ഫോക്ക് & ഹൊറർ',
    filterAd: '📢 കൊമേഴ്സ്യൽ പരസ്യം (Ads)',
    charactersLabel: 'പ്രധാന കഥാപാത്രങ്ങൾ:',
    storyOverviewLabel: 'കഥാ ചുരുക്കം (Story Overview):',
    bgmLabel: '🎵 ബാക്ക്ഗ്രൗണ്ട് മ്യൂസിക് (BGM):',
    continuityLabel: '🎬 വിഷ്വൽ കണ്ടിന്യൂയിറ്റി (Continuity):',
    shotBgmLabel: '🎵 ബാക്ക്ഗ്രൗണ്ട് മ്യൂസിക് & സൗണ്ട് (BGM - എഡിറ്റ് ചെയ്യാം)',
    shotDialogueLabel: '💬 സീൻ സംഭാഷണം / ഡയലോഗ് (എഡിറ്റ് ചെയ്യാം)',
    dialogueModeLabel: 'സംഭാഷണ നിയന്ത്രണം (Dialogue Toggle):',
    dialogueModeDynamic: '🎭 മിക്സ് (സംഭാഷണം + വിഷ്വൽ)',
    dialogueModeDialogue: '💬 ഡയലോഗ് ON (സ്വയം സംഭാഷണം)',
    dialogueModeSilent: '🤫 ഡയലോഗ് OFF (വിഷ്വൽ മാത്രം)',
    voiceLoadingStop: 'ലോഡ് ചെയ്യുന്നു... (Stop)',
    voiceStop: 'നിർത്തുക (Stop)',
    voicePlay: 'വോയിസ് കേൾക്കുക',
    voicePaceLabel: 'വോയിസ് ശൈലി:',
    paceVerySlow: 'കഥ പറച്ചിൽ (സംഭാഷണം)',
    paceSlow: 'സിനിമാറ്റിക് നറേറ്റർ',
    paceNormal: 'ശാന്തം & വ്യക്തം',
    selectThisStory: (clips) => `ഈ കഥ തിരഞ്ഞെടുക്കുക (${clips} ക്ലിപ്പുകൾ) ➔`,
    backToAngles: '← കഥാ രൂപങ്ങളിലേക്ക് തിരികെ പോകുക',
    preparingPrompts: (d, clips) => `${d} നീളമുള്ള സിനിമയ്ക്ക് ആവശ്യമായ ${clips} സീൻ പ്രോംപ്റ്റുകൾ തയ്യാറാക്കുന്നു...`,
    breakdownTitle: 'സീൻ ബ്രേക്ക്ഡൗൺ പ്രോംപ്റ്റുകൾ (Sequential Shot Prompts)',
    breakdownEditHint: 'വേണ്ട മാറ്റങ്ങൾ ബോക്സിൽ നേരിട്ട് ടൈപ്പ് ചെയ്ത് എഡിറ്റ് ചെയ്യാവുന്നത്!',
    totalSceneClips: (c, d) => `ആകെ ${c} സീൻ ക്ലിപ്പുകൾ (${d})`,
    copiedVideoPromptBtn: 'വീഡിയോ പ്രോംപ്റ്റ് കോപ്പി ചെയ്തു!',
    copyVideoPromptBtn: 'വീഡിയോ പ്രോംപ്റ്റ് കോപ്പി ചെയ്യുക',
    shotActionLabel: 'സീൻ വിവരണം (എഡിറ്റ് ചെയ്യാവുന്നത്)',
    videoPromptHeading: '1. വീഡിയോ ജനറേഷൻ പ്രോംപ്റ്റ് (Video Prompt + Dialogue + Lighting)',
    copiedVideoShort: 'കോപ്പി ചെയ്തു!',
    copyVideoWithDialogue: 'ഡയലോഗ് അടക്കം കോപ്പി ചെയ്യുക',
    imagePromptHeading: '2. ഇമേജ് ജനറേഷൻ പ്രോംപ്റ്റ് (Face & Clothing Continuity)',
    copiedImageShort: 'കോപ്പി ചെയ്തു',
    copyImageShort: 'ഇമേജ് പ്രോംപ്റ്റ് കോപ്പി',
    masterBlockDesc: 'മാസ്റ്റർ ബ്ലോക്ക് (വീഡിയോ + ഇമേജ് പ്രോംപ്റ്റുകൾ ഒന്നിച്ച്)',
    masterCopied: 'മൊത്തം കോപ്പി ചെയ്തു!',
    masterCopyBoth: 'രണ്ടും ഒന്നിച്ച് കോപ്പി ചെയ്യുക',
    loadMorePrompts: (shown, total) => `കൂടുതൽ പ്രോംപ്റ്റുകൾ കാണുക (${shown} / ${total} - അടുത്ത 25 എണ്ണം)`,
    editShotBtn: '✏️ എഡിറ്റ്',
    doneEditingBtn: '✓ സേവ് / പൂർത്തിയായി',
    viewAllShotsBtn: '📜 എല്ലാം സ്ക്രോൾ ചെയ്ത് കാണുക',
    viewSingleShotBtn: '📖 ഓരോന്നായി ഫുൾ സ്ക്രീനിൽ കാണുക',
    prevShotBtn: '← മുൻ ഷോട്ട്',
    nextShotBtn: 'അടുത്ത ഷോട്ട് →',
    shotOfTotal: (curr, total) => `ഷോട്ട് ${curr} / ${total}`,
    angleErrorFallback: 'കഥയുടെ വേരിയേഷനുകൾ നിർമ്മിക്കുന്നതിൽ പിഴവ് സംഭവിച്ചു.',
    breakdownErrorFallback: 'പ്രോംപ്റ്റുകൾ തരംതിരിക്കുന്നതിൽ പിഴവ് സംഭവിച്ചു.',
    categorySelectorLabel: 'കഥാ കാറ്റഗറി തിരഞ്ഞെടുക്കുക (366 വിഭാഗങ്ങൾ)',
    categorySearchPlaceholder: 'ഉദാ: റൊമാൻസ്, ആക്ഷൻ, ഹൊറർ, ത്രില്ലർ, കോമഡി...',
    allCategoriesLabel: 'എല്ലാ കാറ്റഗറികളും (14 വിഭാഗങ്ങൾ Explore ചെയ്യുക)',
    categoriesCountBadge: (c) => `${c}+ കാറ്റഗറികൾ`,
    cameraAngleLabel: '🎥 ക്യാമറ ആംഗിൾ & ഫ്രെയിമിംഗ്',
    lightingCueLabel: '💡 ലൈറ്റിംഗ് & വിഷ്വൽ മൂഡ്',
    pureVisualBadge: '🤫 ഡയലോഗ് ഇല്ല — പൂർണ്ണ വിഷ്വൽ / ആക്ഷൻ സ്ക്രിപ്റ്റ്',
    offlineFallbackBtn: '⚡ ഓഫ്‌ലൈൻ സ്ക്രിപ്റ്റ് എൻജിൻ ഉപയോഗിച്ച് നിർമ്മിക്കുക',
  },
  en: {
    appTitle: 'CineStoryboard AI · Masterpiece Script & Prompt Studio',
    languageLabel: 'Language',
    page1Subtitle: 'Act I: Premise Concept & Total Production Duration',
    page2Subtitle: (c) => `Act II: Choose from ${c} Curated Cinematic Story Arcs`,
    page3Subtitle: (d, clips) => `Act III: Sequence Breakdown — ${d} (${clips} Professional Clips)`,
    step1: '1. Concept',
    step2: (c) => `2. Story Arcs (${c})`,
    step3: '3. Prompts',
    samplePremise: 'Rajeev sits at the village tea shop in the evening, sipping hot tea from a glass. After finishing his tea, he stands up from the wooden bench and walks onto the road. In the golden evening light, he steps inside his ancestral home.',
    premiseLabel: '1. Enter Your Story Concept or Opening Scene Premise',
    clearBtn: 'Clear ✕',
    premisePlaceholder: 'Type your cinematic story concept, premise, or opening scene details here...',
    premiseRequiredError: 'Please enter a valid story premise or concept to begin.',
    durationLabel: '2. Select or Define Total Film Production Duration',
    unitSecond: 'Seconds',
    unitMinute: 'Minutes',
    unitHour: 'Hours',
    unitSecondsFull: 'Seconds',
    unitMinutesFull: 'Minutes',
    unitHoursFull: 'Hours',
    typeCustomDuration: 'Custom Duration:',
    clipDurationLabel: 'Per-Clip Duration:',
    selectedTotalTime: '🎬 Selected Production Duration:',
    requiredClips: (clips, sec) => `Production Breakdown: ${clips} Clips (${clips} × ${sec}s Keyframes)`,
    clipsWord: 'Clips',
    generatingAngles: 'Synthesizing Cinematic Story Arcs...',
    generateAnglesBtn: (c, d, clips) => `Generate ${c} Story Arcs (${d} · ${clips} Clips) ➔`,
    backToInput: '← Back to Premise & Duration',
    selectedTimeLabel: 'Production Duration:',
    selectStoryTitle: (c) => `Select Your Masterpiece Story from ${c} Cinematic Variations`,
    selectStoryDesc: (c, d, clips) => `Explore ${c} expertly crafted narrative arcs designed for your ${d} production, complete with ${clips} synchronized sequence prompts.`,
    filterAll: (c) => `All Arcs (${c})`,
    filterThriller: '🕵️ Thriller & Mystery',
    filterAction: '💥 Action & Energy',
    filterDrama: '🎭 Dramatic & Emotional',
    filterComedy: '😂 Comedy & Entertainment',
    filterScifi: '⏳ Sci-Fi & Speculative',
    filterFolk: '🌿 Folk & Eerie Mystery',
    filterAd: '📢 Commercial & Promo',
    charactersLabel: 'Principal Characters:',
    storyOverviewLabel: 'Synopsis & Narrative Arc:',
    bgmLabel: '🎵 Cinematic Score & Soundscape (BGM):',
    continuityLabel: '🎬 Visual Continuity & Face Lock:',
    shotBgmLabel: '🎵 Shot Sound Cue & Atmosphere (Editable)',
    shotDialogueLabel: '💬 Sequence Dialogue / Voiceover (Editable)',
    dialogueModeLabel: 'Dialogue Toggle (With Dialogue vs No Dialogue):',
    dialogueModeDynamic: '🎭 Smart Mix (Dialogue + Visual)',
    dialogueModeDialogue: '💬 With Dialogue ON (Auto Lines)',
    dialogueModeSilent: '🤫 No Dialogue OFF (Pure Visual)',
    voiceLoadingStop: 'Synthesizing... (Stop)',
    voiceStop: 'Stop Voiceover',
    voicePlay: 'Preview Narration',
    voicePaceLabel: 'Narration Pace:',
    paceVerySlow: 'Cinematic Storytelling',
    paceSlow: 'Authoritative Narrator',
    paceNormal: 'Calm & Articulate',
    selectThisStory: (clips) => `Select Story Arc (${clips} Clips) ➔`,
    backToAngles: '← Back to Story Arcs',
    preparingPrompts: (d, clips) => `Assembling ${clips} sequential shot prompts for your ${d} masterpiece...`,
    breakdownTitle: 'Master Sequence Breakdown (Sequential Shot Prompts)',
    breakdownEditHint: 'You can directly edit any action, dialogue, or prompt field below in real time!',
    totalSceneClips: (c, d) => `Total ${c} Production Clips (${d})`,
    copiedVideoPromptBtn: 'Motion Prompt Copied!',
    copyVideoPromptBtn: 'Copy Motion Prompt',
    shotActionLabel: 'Shot Action & Direction (Editable)',
    videoPromptHeading: '1. Video Generation Motion Prompt (Camera + Dialogue + Lighting)',
    copiedVideoShort: 'Copied!',
    copyVideoWithDialogue: 'Copy with Spoken Dialogue',
    imagePromptHeading: '2. Keyframe Photo Prompt (Face, Wardrobe & Lighting Continuity)',
    copiedImageShort: 'Copied',
    copyImageShort: 'Copy Keyframe Prompt',
    masterBlockDesc: 'Master Production Block (Combined Motion & Keyframe Prompts)',
    masterCopied: 'Master Block Copied!',
    masterCopyBoth: 'Copy Master Package',
    loadMorePrompts: (shown, total) => `Load Additional Prompts (${shown} / ${total} - Next 25)`,
    editShotBtn: '✏️ Edit',
    doneEditingBtn: '✓ Save & Done',
    viewAllShotsBtn: '📜 Scroll All Shots',
    viewSingleShotBtn: '📖 Full-Screen Single Shot View',
    prevShotBtn: '← Previous Shot',
    nextShotBtn: 'Next Shot →',
    shotOfTotal: (curr, total) => `Shot ${curr} of ${total}`,
    angleErrorFallback: 'Failed to synthesize story arcs.',
    breakdownErrorFallback: 'Failed to synthesize sequence breakdown.',
    categorySelectorLabel: 'Category & Genre Style (366 Curated Categories)',
    categorySearchPlaceholder: 'Search romantic, horror, action, thriller, sci-fi, comedy...',
    allCategoriesLabel: 'All 366 Categories (Explore Diverse Genres)',
    categoriesCountBadge: (c) => `${c}+ Categories`,
    cameraAngleLabel: '🎥 Camera & Lens Framing',
    lightingCueLabel: '💡 Lighting & Visual Palette',
    pureVisualBadge: '🤫 No Dialogue — Pure Visual & Action Script',
    offlineFallbackBtn: '⚡ Generate Using Offline Script Engine',
  },
  hi: {
    appTitle: 'एआई सिनेमैटिक स्टोरी एंड प्रॉम्प्ट स्टूडियो',
    languageLabel: 'भाषा चुनें',
    page1Subtitle: 'पेज 1: कहानी की भूमिका और कुल वीडियो अवधि',
    page2Subtitle: (c) => `पेज 2: ${c} अलग-अलग कहानियों में से चुनें`,
    page3Subtitle: (d, clips) => `पेज 3: प्रॉम्प्ट्स — ${d} (${clips} क्लिप्स)`,
    step1: '1. भूमिका',
    step2: (c) => `2. कहानियाँ (${c})`,
    step3: '3. प्रॉम्प्ट्स',
    samplePremise: 'राजीव शाम को गांव की चाय की दुकान पर बैठकर गिलास में गरम चाय पीता है। चाय पीने के बाद वह बेंच से उठकर सड़क की ओर निकल पड़ता है। शाम की सुनहरी रोशनी में वह अपने पुश्तैनी घर के अंदर प्रवेश करता है।',
    premiseLabel: '1. अपनी कहानी की भूमिका लिखें (Story Concept Input)',
    clearBtn: 'साफ़ करें ✕',
    premisePlaceholder: 'अपनी कहानी का संक्षिप्त विचार या शुरुआती दृश्य यहाँ लिखें...',
    premiseRequiredError: 'कृपया कहानी की भूमिका या विचार दर्ज करें।',
    durationLabel: '2. कुल फिल्म / वीडियो की अवधि चुनें या लिखें',
    unitSecond: 'सेकंड',
    unitMinute: 'मिनट',
    unitHour: 'घंटा',
    unitSecondsFull: 'सेकंड (Seconds)',
    unitMinutesFull: 'मिनट (Minutes)',
    unitHoursFull: 'घंटा (Hours)',
    typeCustomDuration: 'या समय टाइप करें:',
    clipDurationLabel: 'क्लिप अवधि:',
    selectedTotalTime: '🎬 चयनित कुल वीडियो समय:',
    requiredClips: (clips, sec) => `आवश्यक क्लिप्स: ${clips} क्लिप्स (${clips} x ${sec}s प्रॉम्प्ट्स)`,
    clipsWord: 'क्लिप्स',
    generatingAngles: 'कहानियाँ तैयार की जा रही हैं...',
    generateAnglesBtn: (c, d, clips) => `${c} कहानियाँ बनाएँ (${d} / ${clips} क्लिप्स) ➔`,
    backToInput: '← वापस (भूमिका और समय बदलें)',
    selectedTimeLabel: 'चयनित समय:',
    selectStoryTitle: (c) => `${c} अलग-अलग शैलियों में से अपनी कहानी चुनें`,
    selectStoryDesc: (c, d, clips) => `नीचे दी गई ${c} कहानियों में से एक चुनें, अगले पेज पर ${d} की फिल्म के लिए ${clips} प्रॉम्प्ट्स मिलेंगे।`,
    filterAll: (c) => `सभी कहानियाँ (${c})`,
    filterThriller: '🕵️ थ्रिलर और क्राइम',
    filterAction: '💥 एक्शन और मास',
    filterDrama: '🎭 ड्रामा और इमोशनल',
    filterComedy: '😂 कॉमेडी और फन',
    filterScifi: '⏳ साइंस फिक्शन',
    filterFolk: '🌿 लोककथा और हॉरर',
    filterAd: '📢 विज्ञापन (Ads)',
    charactersLabel: 'मुख्य पात्र:',
    storyOverviewLabel: 'कहानी का सारांश (Story Overview):',
    bgmLabel: '🎵 बैकग्राउंड म्यूज़िक (BGM):',
    continuityLabel: '🎬 विज़ुअल कंटिन्यूटी (Continuity):',
    shotBgmLabel: '🎵 बैकग्राउंड म्यूज़िक और साउंड (BGM - संपादन योग्य)',
    shotDialogueLabel: '💬 इस शॉट का संवाद / डायलॉग (संपादन योग्य)',
    dialogueModeLabel: 'संवाद टॉगल (Dialogue ON / OFF):',
    dialogueModeDynamic: '🎭 स्मार्ट मिक्स (डायलॉग + विज़ुअल)',
    dialogueModeDialogue: '💬 संवाद ON (ऑटो डायलॉग)',
    dialogueModeSilent: '🤫 बिना संवाद OFF (शुद्ध विज़ुअल)',
    voiceLoadingStop: 'लोड हो रहा है... (रोकें)',
    voiceStop: 'रोकें (Stop)',
    voicePlay: 'आवाज़ सुनें',
    voicePaceLabel: 'आवाज़ शैली:',
    paceVerySlow: 'कहानी बातचीत (फील)',
    paceSlow: 'सिनेमैटिक नैरेटर',
    paceNormal: 'शांत और स्पष्ट',
    selectThisStory: (clips) => `यह कहानी चुनें (${clips} क्लिप्स) ➔`,
    backToAngles: '← कहानियों पर वापस जाएं',
    preparingPrompts: (d, clips) => `${d} की फिल्म के लिए ${clips} सीन प्रॉम्प्ट्स तैयार किए जा रहे हैं...`,
    breakdownTitle: 'सीन ब्रेकडाउन प्रॉम्प्ट्स (Sequential Shot Prompts)',
    breakdownEditHint: 'आप किसी भी बॉक्स में सीधे टाइप करके बदलाव कर सकते हैं!',
    totalSceneClips: (c, d) => `कुल ${c} सीन क्लिप्स (${d})`,
    copiedVideoPromptBtn: 'वीडियो प्रॉम्प्ट कॉपी हो गया!',
    copyVideoPromptBtn: 'वीडियो प्रॉम्प्ट कॉपी करें',
    shotActionLabel: 'सीन विवरण (संपादन योग्य)',
    videoPromptHeading: '1. वीडियो जनरेशन प्रॉम्प्ट (Video Prompt + Dialogue + Lighting)',
    copiedVideoShort: 'कॉपी किया गया!',
    copyVideoWithDialogue: 'डायलॉग सहित कॉपी करें',
    imagePromptHeading: '2. इमेज जनरेशन प्रॉम्प्ट (Face & Clothing Continuity)',
    copiedImageShort: 'कॉपी किया गया',
    copyImageShort: 'इमेज प्रॉम्प्ट कॉपी करें',
    masterBlockDesc: 'मास्टर ब्लॉक (वीडियो + इमेज प्रॉम्प्ट्स एक साथ)',
    masterCopied: 'मास्टर ब्लॉक कॉपी हो गया!',
    masterCopyBoth: 'दोनों एक साथ कॉपी करें',
    loadMorePrompts: (shown, total) => `और प्रॉम्प्ट्स देखें (${shown} / ${total} - अगले 25 लोड करें)`,
    editShotBtn: '✏️ एडिट',
    doneEditingBtn: '✓ सेव करें',
    viewAllShotsBtn: '📜 सभी शॉट्स स्क्रॉल करें',
    viewSingleShotBtn: '📖 एक-एक करके फुल स्क्रीन देखें',
    prevShotBtn: '← पिछला शॉट',
    nextShotBtn: 'अगला शॉट →',
    shotOfTotal: (curr, total) => `शॉट ${curr} / ${total}`,
    angleErrorFallback: 'कहानियाँ बनाने में समस्या आई।',
    breakdownErrorFallback: 'शॉट प्रॉम्प्ट्स बनाने में समस्या आई।',
    categorySelectorLabel: 'श्रेणी चुनें (366 फ़िल्म श्रेणियाँ)',
    categorySearchPlaceholder: 'रोमांस, एक्शन, थ्रिलर, कॉमेडी, हॉरर खोजें...',
    allCategoriesLabel: 'सभी श्रेणियाँ (विभिन्न शैलियाँ एक्सप्लोर करें)',
    categoriesCountBadge: (c) => `${c}+ श्रेणियाँ`,
    cameraAngleLabel: '🎥 कैमरा एंगल और फ़्रेमिंग',
    lightingCueLabel: '💡 लाइटिंग और विज़ुअल मूड',
    pureVisualBadge: '🤫 बिना संवाद — शुद्ध विज़ुअल और एक्शन स्क्रिप्ट',
    offlineFallbackBtn: '⚡ ऑफ़लाइन स्क्रिप्ट इंजन से बनाएँ',
  },
  ta: {
    appTitle: 'ஏஐ சினிமாடிக் கதை & ப்ராம்ப்ட் ஸ்டுடியோ',
    languageLabel: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    page1Subtitle: 'பக்கம் 1: கதையின் அறிமுகம் மற்றும் மொத்த வீடியோ நேரம்',
    page2Subtitle: (c) => `பக்கம் 2: ${c} வெவ்வேறு கதை வடிவங்களில் ஒன்றைத் தேர்ந்தெடுக்கவும்`,
    page3Subtitle: (d, clips) => `பக்கம் 3: ப்ராம்ப்ட்கள் — ${d} (${clips} கிளிப்புகள்)`,
    step1: '1. அறிமுகம்',
    step2: (c) => `2. கதைகள் (${c})`,
    step3: '3. ப்ராம்ப்ட்கள்',
    samplePremise: 'ராஜீவ் மாலை நேரத்தில் கிராமத்து டீக்கடையில் அமர்ந்து கண்ணாடி டம்ளரில் சூடான தேநீர் குடிக்கிறார். தேநீர் குடித்த பிறகு பெஞ்சிலிருந்து எழுந்து சாலையில் நடக்கத் தொடங்குகிறார். மாலை வெளிச்சத்தில் தனது பூர்வீக வீட்டிற்குள் நுழைகிறார்.',
    premiseLabel: '1. உங்கள் கதையின் அறிமுகத்தை உள்ளிடவும்',
    clearBtn: 'அழிக்கவும் ✕',
    premisePlaceholder: 'உங்கள் கதையின் சுருக்கமான கருத்தை இங்கே தட்டச்சு செய்யவும்...',
    premiseRequiredError: 'தயவுசெய்து கதையின் அறிமுகத்தை உள்ளிடவும்.',
    durationLabel: '2. மொத்த திரைப்படம் / வீடியோ நேரத்தைத் தேர்ந்தெடுக்கவும்',
    unitSecond: 'வினாடிகள்',
    unitMinute: 'நிமிடங்கள்',
    unitHour: 'மணி நேரம்',
    unitSecondsFull: 'வினாடிகள் (Seconds)',
    unitMinutesFull: 'நிமிடங்கள் (Minutes)',
    unitHoursFull: 'மணி நேரம் (Hours)',
    typeCustomDuration: 'அல்லது நேரத்தைத் தட்டச்சு செய்யவும்:',
    clipDurationLabel: 'கிளிப் நேரம்:',
    selectedTotalTime: '🎬 தேர்ந்தெடுக்கப்பட்ட மொத்த நேரம்:',
    requiredClips: (clips, sec) => `தேவையான கிளிப்புகள்: ${clips} கிளிப்புகள் (${clips} x ${sec}s ப்ராம்ப்ட்கள்)`,
    clipsWord: 'கிளிப்புகள்',
    generatingAngles: 'கதைகள் உருவாக்கப்படுகின்றன...',
    generateAnglesBtn: (c, d, clips) => `${c} கதைகளை உருவாக்கு (${d} / ${clips} கிளிப்புகள்) ➔`,
    backToInput: '← பின்செல் (கதை & நேரத்தை மாற்ற)',
    selectedTimeLabel: 'தேர்ந்தெடுத்த நேரம்:',
    selectStoryTitle: (c) => `${c} கதை வடிவங்களில் இருந்து உங்கள் கதையைத் தேர்ந்தெடுக்கவும்`,
    selectStoryDesc: (c, d, clips) => `கீழே உள்ள ${c} கதைகளில் ஒன்றைத் தேர்ந்தெடுத்தால் அடுத்த பக்கத்தில் ${d} படத்திற்குத் தேவையான ${clips} ப்ராம்ப்ட்கள் கிடைக்கும்.`,
    filterAll: (c) => `அனைத்துக் கதைகளும் (${c})`,
    filterThriller: '🕵️ திரில்லர் & கிரைம்',
    filterAction: '💥 ஆக்ஷன் & மாஸ்',
    filterDrama: '🎭 டிராமா & எமோஷனல்',
    filterComedy: '😂 காமெடி & ஃபன்',
    filterScifi: '⏳ சயின்ஸ் ஃபிக்ஷன்',
    filterFolk: '🌿 நாட்டுப்புறம் & திகில்',
    filterAd: '📢 விளம்பரம் (Ads)',
    charactersLabel: 'முக்கிய கதாபாத்திரங்கள்:',
    storyOverviewLabel: 'கதைச் சுருக்கம் (Story Overview):',
    bgmLabel: '🎵 பின்னணி இசை (BGM):',
    continuityLabel: '🎬 காட்சித் தொடர்ச்சி (Continuity):',
    shotBgmLabel: '🎵 பின்னணி இசை & ஒலி (BGM - திருத்தலாம்)',
    shotDialogueLabel: '💬 காட்சி வசனம் / டயலாக் (திருத்தலாம்)',
    dialogueModeLabel: 'வசன நிலை (Dialogue ON / OFF):',
    dialogueModeDynamic: '🎭 கலப்பு (வசனம் + விஷுவல்)',
    dialogueModeDialogue: '💬 வசனம் ON (தானியங்கி வசனம்)',
    dialogueModeSilent: '🤫 வசனம் OFF (காட்சி மட்டும்)',
    voiceLoadingStop: 'ஏற்றுகிறது... (நிறுத்து)',
    voiceStop: 'நிறுத்து (Stop)',
    voicePlay: 'குரலில் கேட்க',
    voicePaceLabel: 'குரல் பாணி:',
    paceVerySlow: 'கதை உரையாடல்',
    paceSlow: 'சினிமாட்டிக் குரல்',
    paceNormal: 'அமைதி & தெளிவு',
    selectThisStory: (clips) => `இந்தக் கதையைத் தேர்ந்தெடு (${clips} கிளிப்புகள்) ➔`,
    backToAngles: '← கதைகளுக்குத் திரும்பு',
    preparingPrompts: (d, clips) => `${d} படத்திற்கான ${clips} காட்சி ப்ராம்ப்ட்கள் தயாராகின்றன...`,
    breakdownTitle: 'காட்சி ப்ராம்ப்ட்கள் (Sequential Shot Prompts)',
    breakdownEditHint: 'தேவையான மாற்றங்களைப் பெட்டியில் நேரடியாகத் தட்டச்சு செய்து திருத்தலாம்!',
    totalSceneClips: (c, d) => `மொத்தம் ${c} காட்சி கிளிப்புகள் (${d})`,
    copiedVideoPromptBtn: 'வீடியோ ப்ராம்ப்ட் நகலெடுக்கப்பட்டது!',
    copyVideoPromptBtn: 'வீடியோ ப்ராம்ப்டை நகலெடு',
    shotActionLabel: 'காட்சி விவரம் (திருத்தக்கூடியது)',
    videoPromptHeading: '1. வீடியோ உருவாக்க ப்ராம்ப்ட் (Motion + Dialogue + Lighting)',
    copiedVideoShort: 'நகலெடுக்கப்பட்டது!',
    copyVideoWithDialogue: 'வசனத்துடன் நகலெடு',
    imagePromptHeading: '2. பட உருவாக்க ப்ராம்ப்ட் (Face & Wardrobe Continuity)',
    copiedImageShort: 'நகலெடுக்கப்பட்டது',
    copyImageShort: 'பட ப்ராம்ப்டை நகலெடு',
    masterBlockDesc: 'மாஸ்டர் பிளாக் (வீடியோ + பட ப்ராம்ப்ட்கள் ஒன்றாக)',
    masterCopied: 'முழுவதும் நகலெடுக்கப்பட்டது!',
    masterCopyBoth: 'இரண்டையும் ஒன்றாக நகலெடு',
    loadMorePrompts: (shown, total) => `மேலும் பார்க்க (${shown} / ${total} - அடுத்த 25 கிளிப்புகள்)`,
    editShotBtn: '✏️ திருத்து',
    doneEditingBtn: '✓ முடிந்தது',
    viewAllShotsBtn: '📜 அனைத்தையும் ஸ்க்ரோல் செய்',
    viewSingleShotBtn: '📖 ஒன்றன்பின் ஒன்றாக முழுத் திரையில் பார்',
    prevShotBtn: '← முந்தைய ஷாட்',
    nextShotBtn: 'அடுத்த ஷாட் →',
    shotOfTotal: (curr, total) => `ஷாட் ${curr} / ${total}`,
    angleErrorFallback: 'கதைகளை உருவாக்குவதில் பிழை ஏற்பட்டது.',
    breakdownErrorFallback: 'காட்சி ப்ராம்ப்ட்களை உருவாக்குவதில் பிழை ஏற்பட்டது.',
    categorySelectorLabel: 'வகையைத் தேர்ந்தெடுக்கவும் (366 வகைகள்)',
    categorySearchPlaceholder: 'காதல், ஆக்ஷன், திகில், திரில்லர், காமெடி தேடு...',
    allCategoriesLabel: 'அனைத்து வகைகளும் (பல வகைகளில் உருவாக்கு)',
    categoriesCountBadge: (c) => `${c}+ வகைகள்`,
    cameraAngleLabel: '🎥 கேமரா கோணம் & ஃபிரேமிங்',
    lightingCueLabel: '💡 ஒளி & காட்சித் தளம்',
    pureVisualBadge: '🤫 வசனம் இல்லை — தூய காட்சி & ஆக்ஷன் திரைக்கதை',
    offlineFallbackBtn: '⚡ ஆஃப்லைன் ஸ்கிரிப்ட் மூலம் உருவாக்கு',
  },
  kn: {
    appTitle: 'ಎಐ ಸಿನಿಮಾಟಿಕ್ ಸ್ಟೋರಿ & ಪ್ರಾಂಪ್ಟ್ ಸ್ಟುಡಿಯೋ',
    languageLabel: 'ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    page1Subtitle: 'ಪುಟ 1: ಕಥೆಯ ಪರಿಚಯ ಮತ್ತು ಒಟ್ಟು ವೀಡಿಯೊ ಅವಧಿ',
    page2Subtitle: (c) => `ಪುಟ 2: ${c} ವಿಭಿನ್ನ ಕಥಾ ಶೈಲಿಗಳಲ್ಲಿ ಒಂದನ್ನು ಆಯ್ಕೆಮಾಡಿ`,
    page3Subtitle: (d, clips) => `ಪುಟ 3: ಪ್ರಾಂಪ್ಟ್‌ಗಳು — ${d} (${clips} ಕ್ಲಿಪ್‌ಗಳು)`,
    step1: '1. ಪರಿಚಯ',
    step2: (c) => `2. ಕಥೆಗಳು (${c})`,
    step3: '3. ಪ್ರಾಂಪ್ಟ್‌ಗಳು',
    samplePremise: 'ರಾಜೀವ್ ಸಂಜೆ ಹಳ್ಳಿಯ ಚಹಾ ಅಂಗಡಿಯಲ್ಲಿ ಕುಳಿತು ಗ್ಲಾಸ್‌ನಲ್ಲಿ ಬಿಸಿ ಚಹಾ ಕುಡಿಯುತ್ತಾನೆ. ಚಹಾ ಕುಡಿದ ನಂತರ ಬೆಂಚ್‌ನಿಂದ ಎದ್ದು ರಸ್ತೆಯ ಕಡೆಗೆ ನಡೆಯುತ್ತಾನೆ. ಸಂಜೆಯ ಹೊಂಬೆಳಕಿನಲ್ಲಿ ತನ್ನ ಪೂರ್ವಜರ ಮನೆಯೊಳಗೆ ಪ್ರವೇಶಿಸುತ್ತಾನೆ.',
    premiseLabel: '1. ನಿಮ್ಮ ಕಥೆಯ ಪರಿಚಯವನ್ನು ಟೈಪ್ ಮಾಡಿ',
    clearBtn: 'ತೆರವುಗೊಳಿಸಿ ✕',
    premisePlaceholder: 'ನಿಮ್ಮ ಕಥೆಯ ಕಿರು ಪರಿಚಯ ಅಥವಾ ದೃಶ್ಯವನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ...',
    premiseRequiredError: 'ದಯವಿಟ್ಟು ಕಥೆಯ ಪರಿಚಯವನ್ನು ನಮೂದಿಸಿ.',
    durationLabel: '2. ಒಟ್ಟು ಸಿನಿಮಾ / ವೀಡಿಯೊ ಅವಧಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    unitSecond: 'ಸೆಕೆಂಡ್',
    unitMinute: 'ನಿಮಿಷ',
    unitHour: 'ಗಂಟೆ',
    unitSecondsFull: 'ಸೆಕೆಂಡ್ (Seconds)',
    unitMinutesFull: 'ನಿಮಿಷ (Minutes)',
    unitHoursFull: 'ಗಂಟೆ (Hours)',
    typeCustomDuration: 'ಅಥವಾ ಅವಧಿಯನ್ನು ಟೈಪ್ ಮಾಡಿ:',
    clipDurationLabel: 'ಕ್ಲಿಪ್ ಅವಧಿ:',
    selectedTotalTime: '🎬 ಆಯ್ಕೆಮಾಡಿದ ಒಟ್ಟು ಸಮಯ:',
    requiredClips: (clips, sec) => `ಅಗತ್ಯವಿರುವ ಕ್ಲಿಪ್‌ಗಳು: ${clips} ಕ್ಲಿಪ್‌ಗಳು (${clips} x ${sec}s ಪ್ರಾಂಪ್ಟ್‌ಗಳು)`,
    clipsWord: 'ಕ್ಲಿಪ್‌ಗಳು',
    generatingAngles: 'ಕಥೆಗಳನ್ನು ರಚಿಸಲಾಗುತ್ತಿದೆ...',
    generateAnglesBtn: (c, d, clips) => `${c} ಕಥೆಗಳನ್ನು ರಚಿಸಿ (${d} / ${clips} ಕ್ಲಿಪ್‌ಗಳು) ➔`,
    backToInput: '← ಹಿಂದಕ್ಕೆ (ಪರಿಚಯ ಮತ್ತು ಸಮಯ ಬದಲಿಸಿ)',
    selectedTimeLabel: 'ಆಯ್ಕೆಮಾಡಿದ ಸಮಯ:',
    selectStoryTitle: (c) => `${c} ಕಥಾ ಶೈಲಿಗಳಿಂದ ನಿಮ್ಮ ಕಥೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ`,
    selectStoryDesc: (c, d, clips) => `ಕೆಳಗಿನ ${c} ಕಥೆಗಳಲ್ಲಿ ಒಂದನ್ನು ಆಯ್ಕೆಮಾಡಿದರೆ ಮುಂದಿನ ಪುಟದಲ್ಲಿ ${d} ಸಿನಿಮಾಕ್ಕೆ ${clips} ಪ್ರಾಂಪ್ಟ್‌ಗಳು ಸಿಗುತ್ತವೆ.`,
    filterAll: (c) => `ಎಲ್ಲಾ ಕಥೆಗಳು (${c})`,
    filterThriller: '🕵️ ಥ್ರಿಲ್ಲರ್ & ಕ್ರೈಮ್',
    filterAction: '💥 ಆಕ್ಷನ್ & ಮಾಸ್',
    filterDrama: '🎭 ಡ್ರಾಮಾ & ಎಮೋಷನಲ್',
    filterComedy: '😂 ಕಾಮಿಡಿ & ಫನ್',
    filterScifi: '⏳ ಸೈನ್ಸ್ ಫಿಕ್ಷನ್',
    filterFolk: '🌿 ಜಾನಪದ & ಹಾರರ್',
    filterAd: '📢 ಜಾಹೀರಾತು (Ads)',
    charactersLabel: 'ಮುಖ್ಯ ಪಾತ್ರಗಳು:',
    storyOverviewLabel: 'ಕಥಾ ಸಾರಾಂಶ (Story Overview):',
    bgmLabel: '🎵 ಹಿನ್ನೆಲೆ ಸಂಗೀತ (BGM):',
    continuityLabel: '🎬 ದೃಶ್ಯ ನಿರಂತರತೆ (Continuity):',
    shotBgmLabel: '🎵 ಹಿನ್ನೆಲೆ ಸಂಗೀತ & ಧ್ವನಿ (BGM - ಸಂಪಾದಿಸಬಹುದು)',
    shotDialogueLabel: '💬 ದೃಶ್ಯದ ಸಂಭಾಷಣೆ / ಡೈಲಾಗ್ (ಸಂಪಾದಿಸಬಹುದು)',
    dialogueModeLabel: 'ಸಂಭಾಷಣೆ ಟಾಗಲ್ (Dialogue ON / OFF):',
    dialogueModeDynamic: '🎭 ಸ್ಮಾರ್ಟ್ ಮಿಕ್ಸ್ (ಡೈಲಾಗ್ + ವಿಷುಯಲ್)',
    dialogueModeDialogue: '💬 ಸಂಭಾಷಣೆ ON (ಆಟೋ ಡೈಲಾಗ್)',
    dialogueModeSilent: '🤫 ಸಂಭಾಷಣೆ OFF (ದೃಶ್ಯ ಮಾತ್ರ)',
    voiceLoadingStop: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ... (ನಿಲ್ಲಿಸಿ)',
    voiceStop: 'ನಿಲ್ಲಿಸಿ (Stop)',
    voicePlay: 'ಧ್ವನಿ ಕೇಳಿ',
    voicePaceLabel: 'ಧ್ವನಿ ಶೈಲಿ:',
    paceVerySlow: 'ಕಥಾ ಸಂಭಾಷಣೆ',
    paceSlow: 'ಸಿನಿಮಾಟಿಕ್ ನಿರೂಪಕ',
    paceNormal: 'ಶಾಂತ & ಸ್ಪಷ್ಟ',
    selectThisStory: (clips) => `ಈ ಕಥೆ ಆಯ್ಕೆಮಾಡಿ (${clips} ಕ್ಲಿಪ್‌ಗಳು) ➔`,
    backToAngles: '← ಕಥೆಗಳಿಗೆ ಹಿಂತಿರುಗಿ',
    preparingPrompts: (d, clips) => `${d} ಚಿತ್ರಕ್ಕಾಗಿ ${clips} ದೃಶ್ಯ ಪ್ರಾಂಪ್ಟ್‌ಗಳನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ...`,
    breakdownTitle: 'ದೃಶ್ಯ ವಿವರಣೆ ಪ್ರಾಂಪ್ಟ್‌ಗಳು (Sequential Shot Prompts)',
    breakdownEditHint: 'ನೀವು ಬಾಕ್ಸ್‌ನಲ್ಲಿ ನೇರವಾಗಿ ಟೈಪ್ ಮಾಡಿ ಬದಲಾವಣೆಗಳನ್ನು ಮಾಡಬಹುದು!',
    totalSceneClips: (c, d) => `ಒಟ್ಟು ${c} ದೃಶ್ಯ ಕ್ಲಿಪ್‌ಗಳು (${d})`,
    copiedVideoPromptBtn: 'ವೀಡಿಯೊ ಪ್ರಾಂಪ್ಟ್ ಕಾಪಿ ಆಗಿದೆ!',
    copyVideoPromptBtn: 'ವೀಡಿಯೊ ಪ್ರಾಂಪ್ಟ್ ಕಾಪಿ ಮಾಡಿ',
    shotActionLabel: 'ದೃಶ್ಯ ವಿವರಣೆ (ಸಂಪಾದಿಸಬಹುದು)',
    videoPromptHeading: '1. ವೀಡಿಯೊ ಜನರೇಷನ್ ಪ್ರಾಂಪ್ಟ್ (Motion + Dialogue + Lighting)',
    copiedVideoShort: 'ಕಾಪಿ ಆಗಿದೆ!',
    copyVideoWithDialogue: 'ಸಂಭಾಷಣೆಯೊಂದಿಗೆ ಕಾಪಿ ಮಾಡಿ',
    imagePromptHeading: '2. ಇಮೇಜ್ ಜನರೇಷನ್ ಪ್ರಾಂಪ್ಟ್ (Face & Clothing Continuity)',
    copiedImageShort: 'ಕಾಪಿ ಆಗಿದೆ',
    copyImageShort: 'ಇಮೇಜ್ ಪ್ರಾಂಪ್ಟ್ ಕಾಪಿ',
    masterBlockDesc: 'ಮಾಸ್ಟರ್ ಬ್ಲಾಕ್ (ವೀಡಿಯೊ + ಇಮೇಜ್ ಪ್ರಾಂಪ್ಟ್‌ಗಳು ಒಟ್ಟಿಗೆ)',
    masterCopied: 'ಪೂರ್ಣ ಕಾಪಿ ಆಗಿದೆ!',
    masterCopyBoth: 'ಎರಡನ್ನೂ ಒಟ್ಟಿಗೆ ಕಾಪಿ ಮಾಡಿ',
    loadMorePrompts: (shown, total) => `ಹೆಚ್ಚು ಪ್ರಾಂಪ್ಟ್‌ಗಳನ್ನು ನೋಡಿ (${shown} / ${total} - ಮುಂದಿನ 25)`,
    editShotBtn: '✏️ ಎಡಿಟ್',
    doneEditingBtn: '✓ ಮುಗಿದಿದೆ',
    viewAllShotsBtn: '📜 ಎಲ್ಲವನ್ನೂ ಸ್ಕ್ರೋಲ್ ಮಾಡಿ',
    viewSingleShotBtn: '📖 ಒಂದೊಂದಾಗಿ ಪೂರ್ಣ ಪರದೆಯಲ್ಲಿ ನೋಡಿ',
    prevShotBtn: '← ಹಿಂದಿನ ಶಾಟ್',
    nextShotBtn: 'ಮುಂದಿನ ಶಾಟ್ →',
    shotOfTotal: (curr, total) => `ಶಾಟ್ ${curr} / ${total}`,
    angleErrorFallback: 'ಕಥೆಗಳನ್ನು ರಚಿಸುವುದರಲ್ಲಿ ದೋಷ ಸಂಭವಿಸಿದೆ.',
    breakdownErrorFallback: 'ಪ್ರಾಂಪ್ಟ್‌ಗಳನ್ನು ರಚಿಸುವುದರಲ್ಲಿ ದೋಷ ಸಂಭವಿಸಿದೆ.',
    categorySelectorLabel: 'ವರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ (366 ವರ್ಗಗಳು)',
    categorySearchPlaceholder: 'ರೋಮ್ಯಾನ್ಸ್, ಆಕ್ಷನ್, ಥ್ರಿಲ್ಲರ್, ಹಾರರ್ ಹುಡುಕಿ...',
    allCategoriesLabel: 'ಎಲ್ಲಾ ವರ್ಗಗಳು (ವಿವಿಧ ಶೈಲಿಗಳನ್ನು ನೋಡಿ)',
    categoriesCountBadge: (c) => `${c}+ ವರ್ಗಗಳು`,
    cameraAngleLabel: '🎥 ಕ್ಯಾಮೆರಾ ಕೋನ ಮತ್ತು ಫ್ರೇಮಿಂಗ್',
    lightingCueLabel: '💡 ಬೆಳಕು ಮತ್ತು ದೃಶ್ಯ ಶೈಲಿ',
    pureVisualBadge: '🤫 ಸಂಭಾಷಣೆ ಇಲ್ಲ — ಶುದ್ಧ ದೃಶ್ಯ ಮತ್ತು ಆಕ್ಷನ್ ಸ್ಕ್ರಿಪ್ಟ್',
    offlineFallbackBtn: '⚡ ಆಫ್‌ಲೈನ್ ಸ್ಕ್ರಿಪ್ಟ್ ಎಂಜಿನ್ ಬಳಸಿ',
  },
  te: {
    appTitle: 'ఏఐ సినిమాటిక్ స్టోరీ & ప్రాంప్ట్ స్టూడియో',
    languageLabel: 'భాషను ఎంచుకోండి',
    page1Subtitle: 'పేజీ 1: కథ పరిచయం మరియు మొత్తం వీడియో నిడివి',
    page2Subtitle: (c) => `పేజీ 2: ${c} విభిన్న కథా రూపాలలో ఒకదాన్ని ఎంచుకోండి`,
    page3Subtitle: (d, clips) => `పేజీ 3: ప్రాంప్ట్‌లు — ${d} (${clips} క్లిప్‌లు)`,
    step1: '1. పరిచయం',
    step2: (c) => `2. కథలు (${c})`,
    step3: '3. ప్రాంప్ట్‌లు',
    samplePremise: 'రాజీవ్ సాయంత్రం గ్రామంలోని టీ కొట్టులో కూర్చుని గ్లాసులో వేడి టీ తాగుతున్నాడు. టీ తాగిన తర్వాత బెంచ్‌పై నుండి లేచి రోడ్డుపైకి నడుస్తాడు. సాయంత్రపు వెలుగులో తన పూర్వీకుల ఇంట్లోకి అడుగుపెడతాడు.',
    premiseLabel: '1. మీ కథ పరిచయాన్ని టైప్ చేయండి',
    clearBtn: 'క్లియర్ ✕',
    premisePlaceholder: 'మీ కథ యొక్క చిన్న పరిచయం లేదా ఆలోచనను ఇక్కడ టైప్ చేయండి...',
    premiseRequiredError: 'దయచేసి కథ పరిచయాన్ని నమోదు చేయండి.',
    durationLabel: '2. మొత్తం సినిమా / వీడియో నిడివిని ఎంచుకోండి',
    unitSecond: 'సెకన్లు',
    unitMinute: 'నిమిషాలు',
    unitHour: 'గంటలు',
    unitSecondsFull: 'సెకన్లు (Seconds)',
    unitMinutesFull: 'నిమిషాలు (Minutes)',
    unitHoursFull: 'గంటలు (Hours)',
    typeCustomDuration: 'లేదా సమయాన్ని టైప్ చేయండి:',
    clipDurationLabel: 'క్లిప్ నిడివి:',
    selectedTotalTime: '🎬 ఎంచుకున్న మొత్తం సమయం:',
    requiredClips: (clips, sec) => `అవసరమైన క్లిప్‌లు: ${clips} క్లిప్‌లు (${clips} x ${sec}s ప్రాంప్ట్‌లు)`,
    clipsWord: 'క్లిప్‌లు',
    generatingAngles: 'కథలు తయారవుతున్నాయి...',
    generateAnglesBtn: (c, d, clips) => `${c} కథలను సృష్టించండి (${d} / ${clips} క్లిప్‌లు) ➔`,
    backToInput: '← వెనుకకు (పరిచయం & సమయం మార్చండి)',
    selectedTimeLabel: 'ఎంచుకున్న సమయం:',
    selectStoryTitle: (c) => `${c} కథా శైలుల నుండి మీ కథను ఎంచుకోండి`,
    selectStoryDesc: (c, d, clips) => `కింద ఉన్న ${c} కథలలో ఒకదాన్ని ఎంచుకుంటే, తదుపరి పేజీలో ${d} సినిమా కోసం ${clips} ప్రాంప్ట్‌లు వస్తాయి.`,
    filterAll: (c) => `అన్ని కథలు (${c})`,
    filterThriller: '🕵️ థ్రిల్లర్ & క్రైమ్',
    filterAction: '💥 యాక్షన్ & మాస్',
    filterDrama: '🎭 డ్రామా & ఎమోషనల్',
    filterComedy: '😂 కామెడీ & ఫన్',
    filterScifi: '⏳ సైన్స్ ఫిక్షన్',
    filterFolk: '🌿 జానపద & హారర్',
    filterAd: '📢 వాణిజ్య ప్రకటన (Ads)',
    charactersLabel: 'ప్రధాన పాత్రలు:',
    storyOverviewLabel: 'కథా సారాంశం (Story Overview):',
    bgmLabel: '🎵 బ్యాక్‌గ్రౌండ్ మ్యూజిక్ (BGM):',
    continuityLabel: '🎬 విజువల్ కంటిన్యుటీ (Continuity):',
    shotBgmLabel: '🎵 బ్యాక్‌గ్రౌండ్ మ్యూజిక్ & సౌండ్ (BGM - సవరించవచ్చు)',
    shotDialogueLabel: '💬 సన్నివేశం సంభాషణ / డైలాగ్ (సవరించవచ్చు)',
    dialogueModeLabel: 'డైలాగ్ టోగుల్ (Dialogue ON / OFF):',
    dialogueModeDynamic: '🎭 స్మార్ట్ మిక్స్ (డైలాగ్ + విజువల్)',
    dialogueModeDialogue: '💬 డైలాగ్ ON (ఆటో డైలాగులు)',
    dialogueModeSilent: '🤫 డైలాగ్ OFF (విజువల్ మాత్రమే)',
    voiceLoadingStop: 'లోడ్ అవుతోంది... (ఆపు)',
    voiceStop: 'ఆపు (Stop)',
    voicePlay: 'వాయిస్ వినండి',
    voicePaceLabel: 'వాయిస్ శైలి:',
    paceVerySlow: 'కథా సంభాషణ (ఫీల్)',
    paceSlow: 'సినిమాటిక్ నరేటర్',
    paceNormal: 'శాంతం & స్పష్టం',
    selectThisStory: (clips) => `ఈ కథను ఎంచుకోండి (${clips} క్లిప్‌లు) ➔`,
    backToAngles: '← కథలకు తిరిగి వెళ్ళండి',
    preparingPrompts: (d, clips) => `${d} సినిమా కోసం ${clips} సీన్ ప్రాంప్ట్‌లు సిద్ధమవుతున్నాయి...`,
    breakdownTitle: 'సీన్ బ్రేక్‌డౌన్ ప్రాంప్ట్‌లు (Sequential Shot Prompts)',
    breakdownEditHint: 'మీరు బాక్స్‌లో నేరుగా టైప్ చేసి మార్పులు చేసుకోవచ్చు!',
    totalSceneClips: (c, d) => `మొత్తం ${c} సీన్ క్లిప్‌లు (${d})`,
    copiedVideoPromptBtn: 'వీడియో ప్రాంప్ట్ కాపీ అయింది!',
    copyVideoPromptBtn: 'వీడియో ప్రాంప్ట్ కాపీ చేయండి',
    shotActionLabel: 'సీన్ వివరణ (సవరించవచ్చు)',
    videoPromptHeading: '1. వీడియో జనరేషన్ ప్రాంప్ట్ (Motion + Dialogue + Lighting)',
    copiedVideoShort: 'కాపీ అయింది!',
    copyVideoWithDialogue: 'డైలాగ్‌తో కాపీ చేయండి',
    imagePromptHeading: '2. ఇమేజ్ జనరేషన్ ప్రాంప్ట్ (Face & Clothing Continuity)',
    copiedImageShort: 'కాపీ అయింది',
    copyImageShort: 'ఇమేజ్ ప్రాంప్ట్ కాపీ',
    masterBlockDesc: 'మాస్టర్ బ్లాక్ (వీడియో + ఇమేజ్ ప్రాంప్ట్‌లు కలిపి)',
    masterCopied: 'మొత్తం కాపీ అయింది!',
    masterCopyBoth: 'రెండూ కలిపి కాపీ చేయండి',
    loadMorePrompts: (shown, total) => `మరిన్ని ప్రాంప్ట్‌లు చూడండి (${shown} / ${total} - తదుపరి 25)`,
    editShotBtn: '✏️ ఎడిట్',
    doneEditingBtn: '✓ పూర్తయింది',
    viewAllShotsBtn: '📜 అన్నీ స్క్రోల్ చేయండి',
    viewSingleShotBtn: '📖 ఒక్కొక్కటిగా పూర్తి స్క్రీన్‌లో చూడండి',
    prevShotBtn: '← మునుపటి షాట్',
    nextShotBtn: 'తదుపరి షాట్ →',
    shotOfTotal: (curr, total) => `షాట్ ${curr} / ${total}`,
    angleErrorFallback: 'కథలను సృష్టించడంలో లోపం జరిగింది.',
    breakdownErrorFallback: 'ప్రాంప్ట్‌లను సృష్టించడంలో లోపం జరిగింది.',
    categorySelectorLabel: 'కేటగిరీ ఎంచుకోండి (366 కేటగిరీలు)',
    categorySearchPlaceholder: 'రొమాన్స్, యాక్షన్, థ్రిల్లర్, హారర్ వెతకండి...',
    allCategoriesLabel: 'అన్ని కేటగిరీలు (విభిన్న శైలులు చూడండి)',
    categoriesCountBadge: (c) => `${c}+ కేటగిరీలు`,
    cameraAngleLabel: '🎥 కెమెరా యాంగిల్ & ఫ్రేమింగ్',
    lightingCueLabel: '💡 లైటింగ్ & విజువల్ మూడ్',
    pureVisualBadge: '🤫 డైలాగ్ లేదు — పూర్తి విజువల్ & యాక్షన్ స్క్రిప్ట్',
    offlineFallbackBtn: '⚡ ఆఫ్‌లైన్ స్క్రిప్ట్ ఇంజిన్‌తో రూపొందించండి',
  },
};
