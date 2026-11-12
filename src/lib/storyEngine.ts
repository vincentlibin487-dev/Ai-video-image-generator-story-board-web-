import type { AppLang } from './i18n';

export type GenreKey = 'thriller' | 'drama' | 'action' | 'folk' | 'scifi' | 'comedy' | 'ad';

export interface StoryAngle {
  id: string;
  catKey?: GenreKey;
  genre: string;
  title: string;
  mood: string;
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
  malayalamDialogue: string;
  dialogueEnglish?: string;
  imagePrompt?: string;
  videoPrompt?: string;
  visualPrompt?: string;
}

interface LocalizedStoryPack {
  categories: { catKey: GenreKey; baseGenre: string; baseTitle: string }[];
  subModifiers: { partLabel: string; suffix: string; mood: string }[];
  characters: string;
  buildSummary: (baseText: string, genre: string, title: string, suffix: string) => string;
  variationLabel: (genre: string, num: number) => string;
  shotBeats: { action: string; dialogue: string; loc: string; act: string }[];
}

const LOCALIZED_STORY_PACKS: Record<AppLang, LocalizedStoryPack> = {
  ml: {
    categories: [
      { catKey: 'thriller', baseGenre: '🕵️ മിസ്റ്ററി & ത്രില്ലർ', baseTitle: 'രഹസ്യങ്ങളുടെ നിഴൽ' },
      { catKey: 'drama', baseGenre: '🎭 ഇമോഷണൽ ഡ്രാമ', baseTitle: 'ഓർമ്മകളുടെ തറവാട്' },
      { catKey: 'action', baseGenre: '💥 ആക്ഷൻ & മാസ് ത്രില്ലർ', baseTitle: 'പ്രതികാരത്തിന്റെ പാത' },
      { catKey: 'folk', baseGenre: '🌿 നാടൻ ഫോക്ക് & ഹൊറർ', baseTitle: 'യക്ഷിക്കാവും നിഗൂഢ കാവും' },
      { catKey: 'scifi', baseGenre: '⏳ സയൻസ് ഫിക്ഷൻ', baseTitle: 'ഓഗസ്റ്റ് 15-ലെ ലൂപ്പ്' },
      { catKey: 'comedy', baseGenre: '😂 കോമഡി & ഫൺ', baseTitle: 'അബദ്ധങ്ങളുടെ തമ്പുരാൻ' },
      { catKey: 'ad', baseGenre: '📢 കൊമേഴ്സ്യൽ പരസ്യം', baseTitle: 'ബ്രാൻഡ് ലഞ്ച് പരസ്യം' },
    ],
    subModifiers: [
      { partLabel: 'പാർട്ട് 1', suffix: 'തുടക്കത്തിന്റെ നിഗൂഢത', mood: 'Dark Suspense • Monologue' },
      { partLabel: 'പാർട്ട് 2', suffix: 'അപ്രതീക്ഷിത വഴിതിരിവ്', mood: 'Intense Twist • High Tension' },
      { partLabel: 'പാർട്ട് 3', suffix: 'രാത്രിയിലെ രഹസ്യ യാത്ര', mood: 'Rain & Shadows • Cinematic' },
      { partLabel: 'പാർട്ട് 4', suffix: 'ശത്രുക്കളുടെ മുഖംമൂടി', mood: 'Action Packed • Fast Paced' },
      { partLabel: 'പാർട്ട് 5', suffix: 'പഴയകാല ഓർമ്മകളുടെ തിരിഞ്ഞുനോട്ടം', mood: 'Emotional • Melancholic' },
      { partLabel: 'പാർട്ട് 6', suffix: 'മിന്നുന്ന പ്രഭാതത്തിലെ സത്യം', mood: 'Golden Hour • Revelation' },
      { partLabel: 'പാർട്ട് 7', suffix: 'വില്ലന്റെ മാസ്റ്റർ പ്ലാൻ', mood: 'Strategic • Dangerous Game' },
      { partLabel: 'പാർട്ട് 8', suffix: 'അവസാന പോരാട്ടത്തിന്റെ നിമിഷങ്ങൾ', mood: 'Climax Battle • High Stakes' },
      { partLabel: 'പാർട്ട് 9', suffix: 'അണിയറയിലെ സത്യങ്ങൾ', mood: 'Investigation • Mystery Solved' },
      { partLabel: 'പാർട്ട് 10', suffix: 'അന്തിമ വിജയവും പുതിയ തുടക്കവും', mood: 'Victorious • Inspiring Ending' },
    ],
    characters: 'രാജീവ്, രാഘവൻ, മുഖംമൂടിധാരിയായ വില്ലൻ, വിശ്വസ്തരായ സഹായികൾ',
    buildSummary: (baseText, genre, title, suffix) =>
      `${baseText} ഈ രംഗം ${genre} വിഭാഗത്തിൽ ഉൾപ്പെടുത്തി ${title} എന്ന തലക്കെട്ടിൽ വികസിപ്പിച്ചിരിക്കുന്നു. ${suffix}. രാജീവ് തന്റെ ലക്ഷ്യത്തിലേക്ക് നീങ്ങുന്നതിനിടയിൽ അപ്രതീക്ഷിതമായി പുതിയ വെല്ലുവിളികളെയും പ്രതിസന്ധികളെയും നേരിടുന്നു. പഴയകാല ഓർമ്മകളും രഹസ്യങ്ങളും ഓരോന്നായി ചുരുളഴിയുമ്പോൾ കഥയിൽ ആകാംക്ഷ വർദ്ധിക്കുന്നു. രാത്രിയുടെ ശാന്തതയെ ഭേദിച്ചുകൊണ്ട് കടന്നുവരുന്ന അജ്ഞാതനായ എതിരാളിയെ രാജീവ് തന്റെ ബുദ്ധിസാധുതയാൽ നേരിടുന്നു. വിശ്വസ്തരായ സുഹൃത്തുക്കളുടെ പിന്തുണയും കൃത്യസമയത്തെ ഇടപെടലും കഥയെ നിർണ്ണായക വഴിത്തിരിവിലേക്ക് നയിക്കുന്നു. പ്രതിസന്ധികൾക്കൊടുവിൽ സത്യം പുറത്തുവരികയും നായകൻ വിജയം കൈവരിക്കുകയും ചെയ്യുന്നു. പുതിയൊരു പ്രഭാതത്തിന്റെ വെളിച്ചത്തിൽ കഥ സുന്ദരമായ പര്യവസാനത്തിലേക്ക് എത്തുന്നു.`,
    variationLabel: (genre, num) => `${genre} - വേരിയേഷൻ ${num}`,
    shotBeats: [
      { action: 'നാട്ടിലെ പഴയ ചായക്കടയിൽ കടക്കാരനുമായി സംസാരിച്ച് ചൂടുചായ കുടിക്കുന്നു.', dialogue: 'കടേട്ടാ... ഇന്നത്തെ വിശേഷങ്ങൾ എന്തൊക്കെയാണ്?', loc: 'rustic traditional tea shop with wooden benches', act: 'sitting at a wooden table holding a teacup and talking' },
      { action: 'ചായ ഗ്ലാസ് താഴെ വെച്ച് ബെഞ്ചിൽ നിന്നെണീറ്റ് ഗ്രാമത്തിലെ വഴിയിലേക്ക് ഇറങ്ങുന്നു.', dialogue: 'ഞാൻ എന്നാൽ അങ്ങോട്ട് ഇറങ്ങട്ടെ...', loc: 'scenic village street with green palms', act: 'standing up and walking towards the gravel road' },
      { action: 'ഇരുളുന്ന സായാഹ്ന വെളിച്ചത്തിൽ ഗ്രാമവീഥിയിലൂടെ സാവധാനം നടന്നു നീങ്ങുന്നു.', dialogue: 'മനസ്സിലെ ചിന്തകൾക്ക് ഇന്ന് വലിയ ഭാരമുണ്ട്...', loc: 'narrow village path surrounded by lush trees', act: 'walking purposefully carrying a small shoulder bag' },
      { action: 'തറവാട്ടു പറമ്പിലെ വലിയ ഗേറ്റിന് മുന്നിലെത്തി മുറ്റത്തേക്ക് പ്രവേശിക്കുന്നു.', dialogue: 'ഇവിടെ തന്നെയാണ് എല്ലാം തുടങ്ങിയത്...', loc: 'traditional ancestral house courtyard under large trees', act: 'entering through an arched carved wooden gate' },
      { action: 'വീടിന്റെ ഉമ്മറപ്പടിയിലേക്ക് കയറി പഴയൊരു ചുവരു ചിത്രം നോക്കി ആലോചനയിൽ മുഴുകുന്നു.', dialogue: 'കഴിഞ്ഞുപോയ കാലത്തെ രഹസ്യങ്ങൾ ഇന്നും ഇവിടെയുണ്ട്.', loc: 'carved wooden veranda with warm antique lighting', act: 'sitting in a wooden armchair, staring deeply ahead' },
      { action: 'പെട്ടെന്ന് അകത്തളത്തിൽ നിന്ന് അജ്ഞാതമായ ഒരു ശബ്ദം കേട്ട് ശ്രദ്ധിക്കുന്നു.', dialogue: 'ആരാണ് അവിടെ? മുന്നോട്ട് വരൂ!', loc: 'dark interior corridor with golden candlelight', act: 'turning head quickly with heightened suspicion' },
      { action: 'നിഗൂഢമായ പഴയ മരപ്പെട്ടി തുറന്ന് അതിനുള്ളിലുണ്ടായിരുന്ന രേഖകൾ കൈയിലെടുക്കുന്നു.', dialogue: 'ഈ തെളിവുകൾ ഇനി ആർക്കും മറച്ചുവെക്കാൻ കഴിയില്ല!', loc: 'antique storeroom with brass lamps and old chests', act: 'opening an ancient wooden box and pulling out documents' },
      { action: 'സൂര്യോദയ വെളിച്ചത്തിൽ പ്രതിസന്ധികളെല്ലാം തരണം ചെയ്ത് രാജീവ് അന്തിമ വിജയം നേടുന്നു.', dialogue: 'ഇത് നീതിയുടെ വിജയമാണ്!', loc: 'epic wide shot overlooking misty backwaters at dawn', act: 'standing victorious looking toward the rising sun' },
    ],
  },
  en: {
    categories: [
      { catKey: 'thriller', baseGenre: '🕵️ Mystery & Thriller', baseTitle: 'Shadow of Secrets' },
      { catKey: 'drama', baseGenre: '🎭 Emotional Drama', baseTitle: 'Echoes of Home' },
      { catKey: 'action', baseGenre: '💥 Action & Mass Thriller', baseTitle: 'Path of Vengeance' },
      { catKey: 'folk', baseGenre: '🌿 Folk & Horror', baseTitle: 'Whispers of the Sacred Grove' },
      { catKey: 'scifi', baseGenre: '⏳ Sci-Fi & Time Loop', baseTitle: 'The August 15 Loop' },
      { catKey: 'comedy', baseGenre: '😂 Comedy & Fun', baseTitle: 'The Comedy of Errors' },
      { catKey: 'ad', baseGenre: '📢 Commercial Ad', baseTitle: 'Signature Brand Spot' },
    ],
    subModifiers: [
      { partLabel: 'Part 1', suffix: 'The Opening Mystery', mood: 'Dark Suspense • Monologue' },
      { partLabel: 'Part 2', suffix: 'Unexpected Turning Point', mood: 'Intense Twist • High Tension' },
      { partLabel: 'Part 3', suffix: 'Midnight Secret Journey', mood: 'Rain & Shadows • Cinematic' },
      { partLabel: 'Part 4', suffix: 'Unmasking the Enemies', mood: 'Action Packed • Fast Paced' },
      { partLabel: 'Part 5', suffix: 'Flashback of Old Memories', mood: 'Emotional • Melancholic' },
      { partLabel: 'Part 6', suffix: 'Truth at Golden Dawn', mood: 'Golden Hour • Revelation' },
      { partLabel: 'Part 7', suffix: 'The Mastermind’s Trap', mood: 'Strategic • Dangerous Game' },
      { partLabel: 'Part 8', suffix: 'Final Confrontation', mood: 'Climax Battle • High Stakes' },
      { partLabel: 'Part 9', suffix: 'Behind the Scenes Truth', mood: 'Investigation • Mystery Solved' },
      { partLabel: 'Part 10', suffix: 'Final Victory & New Dawn', mood: 'Victorious • Inspiring Ending' },
    ],
    characters: 'Rajeev, Raghavan, Masked Antagonist, Loyal Allies',
    buildSummary: (baseText, genre, title, suffix) =>
      `${baseText} This narrative unfolds under ${genre} with the title "${title}" — ${suffix}. As Rajeev moves forward toward his goal, he encounters unexpected twists and hidden dangers waiting around every corner. Long-buried memories and secret documents slowly surface, heightening the suspense across rural and urban backdrops. When a mysterious rival emerges through the quiet night rain, Rajeev relies on sharp wit and courage to confront the threat. With timely support from trusted friends, the plot shifts dramatically toward a decisive confrontation. Every deception unravels in the final act as truth triumphs over chaos, ending on an inspiring new dawn.`,
    variationLabel: (genre, num) => `${genre} - Variation ${num}`,
    shotBeats: [
      { action: 'Rajeev sits at the rustic village tea shop chatting warmly while sipping hot tea.', dialogue: 'What is the latest news around the village today?', loc: 'rustic traditional tea shop with wooden benches', act: 'sitting at a wooden table holding a teacup and talking' },
      { action: 'Setting down his glass, he rises from the bench and steps out onto the quiet street.', dialogue: 'Alright then, I better head out now.', loc: 'scenic village street lined with green trees', act: 'standing up and walking toward the gravel road' },
      { action: 'Under the fading golden evening light, he walks steadily down the narrow lane.', dialogue: 'My thoughts feel heavier than usual tonight.', loc: 'narrow village path surrounded by trees', act: 'walking purposefully carrying a small shoulder bag' },
      { action: 'He reaches the carved wooden gate of the old ancestral estate and enters the courtyard.', dialogue: 'This is exactly where everything began years ago.', loc: 'traditional ancestral house courtyard under large trees', act: 'entering through an arched carved wooden gate' },
      { action: 'Stepping onto the wooden veranda, he pauses before an old framed wall portrait.', dialogue: 'The secrets of the past are still breathing inside these walls.', loc: 'carved wooden veranda with warm antique lighting', act: 'sitting in a wooden armchair, staring deeply ahead' },
      { action: 'Suddenly, a faint metallic sound echoes from the dark inner corridor, alerting him.', dialogue: 'Who is there? Step into the light!', loc: 'dark interior corridor with soft golden candlelight', act: 'turning head quickly with heightened suspicion' },
      { action: 'He unlocks an ancient wooden chest and pulls out crucial hidden manuscripts.', dialogue: 'Nobody can bury this truth any longer!', loc: 'antique storeroom with brass lamps and old chests', act: 'opening an ancient wooden box and pulling out documents' },
      { action: 'As golden sunrise breaks across the misty horizon, Rajeev stands victorious.', dialogue: 'This is not just my win—this is the victory of truth.', loc: 'epic wide shot overlooking misty waters at dawn', act: 'standing victorious looking toward the rising sun' },
    ],
  },
  hi: {
    categories: [
      { catKey: 'thriller', baseGenre: '🕵️ मिस्ट्री और थ्रिलर', baseTitle: 'रहस्यों का साया' },
      { catKey: 'drama', baseGenre: '🎭 इमोशनल ड्रामा', baseTitle: 'यादों की हवेली' },
      { catKey: 'action', baseGenre: '💥 एक्शन और मास थ्रिलर', baseTitle: 'प्रतिशोध की राह' },
      { catKey: 'folk', baseGenre: '🌿 लोककथा और हॉरर', baseTitle: 'रहस्यमय जंगल का शाप' },
      { catKey: 'scifi', baseGenre: '⏳ साइंस फिक्शन', baseTitle: '15 अगस्त का टाइम लूप' },
      { catKey: 'comedy', baseGenre: '😂 कॉमेडी और मस्ती', baseTitle: 'गड़बड़ियों का बादशाह' },
      { catKey: 'ad', baseGenre: '📢 कमर्शियल विज्ञापन', baseTitle: 'ब्रांड लॉन्च विज्ञापन' },
    ],
    subModifiers: [
      { partLabel: 'भाग 1', suffix: 'शुरुआत का रहस्य', mood: 'Dark Suspense • Monologue' },
      { partLabel: 'भाग 2', suffix: 'अप्रत्याशित मोड़', mood: 'Intense Twist • High Tension' },
      { partLabel: 'भाग 3', suffix: 'रात का गुप्त सफ़र', mood: 'Rain & Shadows • Cinematic' },
      { partLabel: 'भाग 4', suffix: 'दुश्मनों का नकाब', mood: 'Action Packed • Fast Paced' },
      { partLabel: 'भाग 5', suffix: 'पुरानी यादों की झलक', mood: 'Emotional • Melancholic' },
      { partLabel: 'भाग 6', suffix: 'सुनहरी सुबह का सच', mood: 'Golden Hour • Revelation' },
      { partLabel: 'भाग 7', suffix: 'खलनायक की चाल', mood: 'Strategic • Dangerous Game' },
      { partLabel: 'भाग 8', suffix: 'आखिरी टकराव', mood: 'Climax Battle • High Stakes' },
      { partLabel: 'भाग 9', suffix: 'पर्दे के पीछे का सच', mood: 'Investigation • Mystery Solved' },
      { partLabel: 'भाग 10', suffix: 'अंतिम जीत और नई शुरुआत', mood: 'Victorious • Inspiring Ending' },
    ],
    characters: 'राजीव, राघवन, नकाबपोश खलनायक, भरोसेमंद साथी',
    buildSummary: (baseText, genre, title, suffix) =>
      `${baseText} यह कहानी ${genre} शैली में "${title}" शीर्षक के साथ आगे बढ़ती है — ${suffix}। राजीव जब अपने लक्ष्य की ओर बढ़ता है, तो उसे रास्ते में कई अनचाही चुनौतियों और खतरनाक मोड़ों का सामना करना पड़ता है। पुरानी यादें और छिपे हुए राज़ एक-एक करके खुलने लगते हैं, जिससे कहानी में रोमांच और गहराता जाता है। रात के सन्नाटे और बारिश के बीच जब एक रहस्यमयी विरोधी सामने आता है, तो राजीव अपनी सूझबूझ और साहस से स्थिति को संभालता है। वफादार दोस्तों के सही समय पर मिलने वाले साथ से पूरी बाज़ी पलट जाती है। अंत में सभी झूठ बेनकाब होते हैं और सच की जीत के साथ एक नई सुबह की शुरुआत होती है।`,
    variationLabel: (genre, num) => `${genre} - भाग ${num}`,
    shotBeats: [
      { action: 'राजीव गांव की पुरानी चाय की दुकान पर बैठकर दुकानदार से बात करते हुए गरम चाय पीता है।', dialogue: 'भाई साहब... आज गांव में क्या नया चल रहा है?', loc: 'rustic traditional tea shop with wooden benches', act: 'sitting at a wooden table holding a teacup and talking' },
      { action: 'चाय का गिलास रखकर वह बेंच से उठता है और गांव की सड़क की ओर चल पड़ता है।', dialogue: 'चलिए, अब मुझे आगे निकलना होगा...', loc: 'scenic village street lined with green trees', act: 'standing up and walking toward the gravel road' },
      { action: 'ढलती शाम की सुनहरी रोशनी में वह पगडंडी से होते हुए धीरे-धीरे आगे बढ़ता है।', dialogue: 'आज मन में कई पुराने सवाल घूम रहे हैं...', loc: 'narrow village path surrounded by trees', act: 'walking purposefully carrying a small shoulder bag' },
      { action: 'पुश्तैनी घर के बड़े लकड़ी के दरवाज़े पर पहुँचकर वह आंगन में प्रवेश करता है।', dialogue: 'यहीं से तो सारी कहानी शुरू हुई थी...', loc: 'traditional ancestral house courtyard under large trees', act: 'entering through an arched carved wooden gate' },
      { action: 'बरामदे में बैठकर वह दीवार पर लगी पुरानी तस्वीर को गहराई से देखता है।', dialogue: 'बीते वक़्त के राज़ आज भी इन दीवारों में दफ़न हैं।', loc: 'carved wooden veranda with warm antique lighting', act: 'sitting in a wooden armchair, staring deeply ahead' },
      { action: 'अचानक अंदर के अंधेरे कमरे से एक अजीब आवाज़ सुनकर वह चौंक जाता है।', dialogue: 'वहाँ कौन है? सामने आओ!', loc: 'dark interior corridor with golden candlelight', act: 'turning head quickly with heightened suspicion' },
      { action: 'वह पुराना लकड़ी का संदूक खोलता है और उसमें छिपे अहम दस्तावेज़ बाहर निकालता है।', dialogue: 'अब इस सच्चाई को कोई नहीं छुपा पाएगा!', loc: 'antique storeroom with brass lamps and old chests', act: 'opening an ancient wooden box and pulling out documents' },
      { action: 'सुबह की पहली किरण के साथ सारी मुश्किलों को पार कर राजीव जीत हासिल करता है।', dialogue: 'यह मेरी नहीं, सच्चाई की जीत है!', loc: 'epic wide shot overlooking misty waters at dawn', act: 'standing victorious looking toward the rising sun' },
    ],
  },
  ta: {
    categories: [
      { catKey: 'thriller', baseGenre: '🕵️ மர்மம் & திரில்லர்', baseTitle: 'ரகசியங்களின் நிழல்' },
      { catKey: 'drama', baseGenre: '🎭 உணர்ச்சிபூர்வ டிராமா', baseTitle: 'நினைவுகளின் இல்லம்' },
      { catKey: 'action', baseGenre: '💥 ஆக்ஷன் & மாஸ் திரில்லர்', baseTitle: 'பழிவாங்கும் பாதை' },
      { catKey: 'folk', baseGenre: '🌿 நாட்டுப்புறம் & திகில்', baseTitle: 'மர்மக் காட்டின் சாபம்' },
      { catKey: 'scifi', baseGenre: '⏳ சயின்ஸ் பிக்ஷன்', baseTitle: 'ஆகஸ்ட் 15 கால வளையம்' },
      { catKey: 'comedy', baseGenre: '😂 காமெடி & ஃபன்', baseTitle: 'கலாட்டா நாயகன்' },
      { catKey: 'ad', baseGenre: '📢 வணிக விளம்பரம்', baseTitle: 'பிராண்ட் அறிமுக விளம்பரம்' },
    ],
    subModifiers: [
      { partLabel: 'பாகம் 1', suffix: 'தொடக்கத்தின் மர்மம்', mood: 'Dark Suspense • Monologue' },
      { partLabel: 'பாகம் 2', suffix: 'எதிர்பாராத திருப்பம்', mood: 'Intense Twist • High Tension' },
      { partLabel: 'பாகம் 3', suffix: 'இரவின் ரகசியப் பயணம்', mood: 'Rain & Shadows • Cinematic' },
      { partLabel: 'பாகம் 4', suffix: 'எதிரிகளின் முகமூடி', mood: 'Action Packed • Fast Paced' },
      { partLabel: 'பாகம் 5', suffix: 'பழைய நினைவுகளின் மீட்டல்', mood: 'Emotional • Melancholic' },
      { partLabel: 'பாகம் 6', suffix: 'விடியலின் உண்மை', mood: 'Golden Hour • Revelation' },
      { partLabel: 'பாகம் 7', suffix: 'வில்லனின் சதித்திட்டம்', mood: 'Strategic • Dangerous Game' },
      { partLabel: 'பாகம் 8', suffix: 'இறுதிப் போராட்டம்', mood: 'Climax Battle • High Stakes' },
      { partLabel: 'பாகம் 9', suffix: 'திரைக்குப் பின்னால் உண்மை', mood: 'Investigation • Mystery Solved' },
      { partLabel: 'பாகம் 10', suffix: 'இறுதி வெற்றியும் புதிய தொடக்கமும்', mood: 'Victorious • Inspiring Ending' },
    ],
    characters: 'ராஜீவ், ராகவன், முகமூடி வில்லன், நம்பிக்கையான நண்பர்கள்',
    buildSummary: (baseText, genre, title, suffix) =>
      `${baseText} இந்தக் கதை ${genre} வகையிலான "${title}" என்ற தலைப்பில் விரிகிறது — ${suffix}. ராஜீவ் தனது இலக்கை நோக்கிச் செல்லும்போது எதிர்பாராத சவால்களையும் மர்மமான திருப்பங்களையும் எதிர்கொள்கிறார். பழைய நினைவுகளும் மறைக்கப்பட்ட ரகசியங்களும் ஒவ்வொன்றாக வெளிவரும்போது கதையில் விறுவிறுப்பு கூடுகிறது. இரவின் அமைதியையும் மழையையும் கிழித்து வரும் எதிரியை ராஜீவ் தனது அறிவாலும் துணிச்சலாலும் சமாளிக்கிறார். நண்பர்களின் சரியான நேரத்து உதவியால் கதை புதிய திசையில் பயணிக்கிறது. இறுதியில் அனைத்து சதிகளும் முறியடிக்கப்பட்டு உண்மை வெல்வதுடன், புதிய விடியலுடன் கதை இனிமையாக முடிகிறது.`,
    variationLabel: (genre, num) => `${genre} - வடிவம் ${num}`,
    shotBeats: [
      { action: 'ராஜீவ் கிராமத்து டீக்கடையில் அமர்ந்து கடைக்காரருடன் பேசிக்கொண்டே சூடான தேநீர் குடிக்கிறார்.', dialogue: 'அண்ணே... ஊரில் இன்று என்ன விசேஷம்?', loc: 'rustic traditional tea shop with wooden benches', act: 'sitting at a wooden table holding a teacup and talking' },
      { action: 'தேநீர் டம்ளரை வைத்துவிட்டு பெஞ்சிலிருந்து எழுந்து கிராமத்துச் சாலையில் நடக்கிறார்.', dialogue: 'சரி, நான் கிளம்புகிறேன்...', loc: 'scenic village street lined with green trees', act: 'standing up and walking toward the gravel road' },
      { action: 'மாலைப் பொழுதின் மஞ்சள் வெளிச்சத்தில் சிறிய பாதையில் ஆழ்ந்த சிந்தனையுடன் நடக்கிறார்.', dialogue: 'இன்று மனதில் ஏதோ ஒரு பாரம் இருக்கிறது...', loc: 'narrow village path surrounded by trees', act: 'walking purposefully carrying a small shoulder bag' },
      { action: 'பழமையான பூர்வீக வீட்டின் பெரிய மரக் கதவைத் தாண்டி முற்றத்திற்குள் நுழைகிறார்.', dialogue: 'இங்கேதான் எல்லாம் ஆரம்பித்தது...', loc: 'traditional ancestral house courtyard under large trees', act: 'entering through an arched carved wooden gate' },
      { action: 'வீட்டின் திண்ணையில் அமர்ந்து பழைய சுவர் ஓவியத்தைப் பார்த்து யோசனையில் ஆழ்கிறார்.', dialogue: 'கடந்த கால ரகசியங்கள் இன்னும் இங்கே உயிரோடு இருக்கின்றன.', loc: 'carved wooden veranda with warm antique lighting', act: 'sitting in a wooden armchair, staring deeply ahead' },
      { action: 'திடீரென்று வீட்டின் உள்பகுதியில் இருந்து மர்மமான சத்தம் கேட்டுத் திரும்புகிறார்.', dialogue: 'அங்கே யார்? வெளியே வாருங்கள்!', loc: 'dark interior corridor with golden candlelight', act: 'turning head quickly with heightened suspicion' },
      { action: 'பழைய மரப்பெட்டியைத் திறந்து அதிலிருந்த முக்கிய ஆவணங்களைக் கையில் எடுக்கிறார்.', dialogue: 'இந்த ஆதாரங்களை இனி யாராலும் மறைக்க முடியாது!', loc: 'antique storeroom with brass lamps and old chests', act: 'opening an ancient wooden box and pulling out documents' },
      { action: 'புதிய சூரிய உதயத்தில் அனைத்துத் தடைகளையும் தாண்டி ராஜீவ் வெற்றி பெறுகிறார்.', dialogue: 'இது நீதியின் வெற்றி!', loc: 'epic wide shot overlooking misty waters at dawn', act: 'standing victorious looking toward the rising sun' },
    ],
  },
  kn: {
    categories: [
      { catKey: 'thriller', baseGenre: '🕵️ ಮಿಸ್ಟರಿ &  thriller', baseTitle: 'ರಹಸ್ಯಗಳ ನೆರಳು' },
      { catKey: 'drama', baseGenre: '🎭 ಎಮೋಷನಲ್ ಡ್ರಾಮಾ', baseTitle: 'ನೆನಪುಗಳ ಮನೆ' },
      { catKey: 'action', baseGenre: '💥 ಆಕ್ಷನ್ & ಮಾಸ್ ಥ್ರಿಲ್ಲರ್', baseTitle: 'ಪ್ರತೀಕಾರದ ಹಾದಿ' },
      { catKey: 'folk', baseGenre: '🌿 ಜಾನಪದ & ಹಾರರ್', baseTitle: 'ನಿಗೂಢ ಕಾಡಿನ ಶಾಪ' },
      { catKey: 'scifi', baseGenre: '⏳ ಸೈನ್ಸ್ ಫಿಕ್ಷನ್', baseTitle: 'ಆಗಸ್ಟ್ 15ರ ಟೈಮ್ ಲೂಪ್' },
      { catKey: 'comedy', baseGenre: '😂 ಕಾಮಿಡಿ & ಫನ್', baseTitle: 'ಗೊಂದಲಗಳ ಸರದಾರ' },
      { catKey: 'ad', baseGenre: '📢 ಜಾಹೀರಾತು (Ads)', baseTitle: 'ಬ್ರ್ಯಾಂಡ್ ಲಾಂಚ್ ಜಾಹೀರಾತು' },
    ],
    subModifiers: [
      { partLabel: 'ಭಾಗ 1', suffix: 'ಆರಂಭದ ನಿಗೂಢತೆ', mood: 'Dark Suspense • Monologue' },
      { partLabel: 'ಭಾಗ 2', suffix: 'ಅನಿರೀಕ್ಷಿತ ತಿರುವು', mood: 'Intense Twist • High Tension' },
      { partLabel: 'ಭಾಗ 3', suffix: 'ರಾತ್ರಿಯ ರಹಸ್ಯ ಪಯಣ', mood: 'Rain & Shadows • Cinematic' },
      { partLabel: 'ಭಾಗ 4', suffix: 'ಶತ್ರುಗಳ ಮುಖವಾಡ', mood: 'Action Packed • Fast Paced' },
      { partLabel: 'ಭಾಗ 5', suffix: 'ಹಳೆಯ ನೆನಪುಗಳ ಮೆಲುಕು', mood: 'Emotional • Melancholic' },
      { partLabel: 'ಭಾಗ 6', suffix: 'ಮುಂಜಾನೆಯ ಸತ್ಯ', mood: 'Golden Hour • Revelation' },
      { partLabel: 'ಭಾಗ 7', suffix: 'ಖಳನಾಯಕನ ಸಂಚು', mood: 'Strategic • Dangerous Game' },
      { partLabel: 'ಭಾಗ 8', suffix: 'ಅಂತಿಮ ಹೋರಾಟ', mood: 'Climax Battle • High Stakes' },
      { partLabel: 'ಭಾಗ 9', suffix: 'ತೆರೆಯ ಹಿಂದಿನ ಸತ್ಯ', mood: 'Investigation • Mystery Solved' },
      { partLabel: 'ಭಾಗ 10', suffix: 'ಅಂತಿಮ ಜಯ ಮತ್ತು ಹೊಸ ಆರಂಭ', mood: 'Victorious • Inspiring Ending' },
    ],
    characters: 'ರಾಜೀವ್, ರಾಘವನ್, ಮುಖವಾಡದ ವಿಲನ್, ನಂಬಿಕಸ್ತ ಸ್ನೇಹಿತರು',
    buildSummary: (baseText, genre, title, suffix) =>
      `${baseText} ಈ ಕಥೆಯು ${genre} ಶೈಲಿಯಲ್ಲಿ "${title}" ಶೀರ್ಷಿಕೆಯೊಂದಿಗೆ ಸಾಗುತ್ತದೆ — ${suffix}. ರಾಜೀವ್ ತನ್ನ ಗುರಿಯತ್ತ ಸಾಗುತ್ತಿದ್ದಂತೆ ಅನಿರೀಕ್ಷಿತ ಸವಾಲುಗಳು ಮತ್ತು ರಹಸ್ಯ ತಿರುವುಗಳನ್ನು ಎದುರಿಸುತ್ತಾನೆ. ಹಳೆಯ ನೆನಪುಗಳು ಮತ್ತು ಬಚ್ಚಿಟ್ಟ ಸತ್ಯಗಳು ಒಂದೊಂದಾಗಿ ಹೊರಬಂದಂತೆ ಕಥೆಯಲ್ಲಿ ಕುತೂಹಲ ಹೆಚ್ಚಾಗುತ್ತದೆ. ರಾತ್ರಿಯ ಮಳೆ ಮತ್ತು ಮೌನದ ನಡುವೆ ಎದುರಾಗುವ ಅಪರಿಚಿತ ಶತ್ರುವನ್ನು ರಾಜೀವ್ ತನ್ನ ಬುದ್ಧಿವಂತಿಕೆ ಮತ್ತು ಧೈರ್ಯದಿಂದ ಎದುರಿಸುತ್ತಾನೆ. ಆಪ್ತ ಸ್ನೇಹಿತರ ಸಮಯೋಚಿತ ನೆರವಿನಿಂದ ಕಥೆ ನಿರ್ಣಾಯಕ ಹಂತವನ್ನು ತಲುಪುತ್ತದೆ. ಕೊನೆಯಲ್ಲಿ ಎಲ್ಲಾ ಮೋಸಗಳು ಬಯಲಾಗಿ ಸತ್ಯಕ್ಕೆ ಜಯ ಸಿಗುವುದರೊಂದಿಗೆ ಹೊಸ ಬೆಳಕಿನಲ್ಲಿ ಕಥೆ ಸುಖಾಂತ್ಯ ಕಾಣುತ್ತದೆ.`,
    variationLabel: (genre, num) => `${genre} - ಆವೃತ್ತಿ ${num}`,
    shotBeats: [
      { action: 'ರಾಜೀವ್ ಹಳ್ಳಿಯ ಚಹಾ ಅಂಗಡಿಯಲ್ಲಿ ಕುಳಿತು ಮಾತನಾಡುತ್ತಾ ಬಿಸಿ ಚಹಾ ಕುಡಿಯುತ್ತಾನೆ.', dialogue: 'ಅಣ್ಣಾ... ಇಂದು ಊರಿನ ವಿಶೇಷ ಏನು?', loc: 'rustic traditional tea shop with wooden benches', act: 'sitting at a wooden table holding a teacup and talking' },
      { action: 'ಚಹಾ ಗ್ಲಾಸ್ ಕೆಳಗಿಟ್ಟು ಬೆಂಚ್‌ನಿಂದ ಎದ್ದು ಹಳ್ಳಿಯ ರಸ್ತೆಯ ಕಡೆಗೆ ನಡೆಯುತ್ತಾನೆ.', dialogue: 'ಸರಿ, ನಾನು ಈಗ ಹೊರಡುತ್ತೇನೆ...', loc: 'scenic village street lined with green trees', act: 'standing up and walking toward the gravel road' },
      { action: 'ಸಂಜೆಯ ಹೊಂಬೆಳಕಿನಲ್ಲಿ ಹಳ್ಳಿಯ ದಾರಿಯಲ್ಲಿ ಆಳವಾದ ಆಲೋಚನೆಯೊಂದಿಗೆ ಸಾಗುತ್ತಾನೆ.', dialogue: 'ಇಂದು ಮನಸ್ಸಿನಲ್ಲಿ ಹಲವು ಪ್ರಶ್ನೆಗಳು ಕಾಡುತ್ತಿವೆ...', loc: 'narrow village path surrounded by trees', act: 'walking purposefully carrying a small shoulder bag' },
      { action: 'ಪೂರ್ವಜರ ಮನೆಯ ದೊಡ್ಡ ಮರದ ಬಾಗಿಲನ್ನು ದಾಟಿ ಅಂಗಳಕ್ಕೆ ಪ್ರವೇಶಿಸುತ್ತಾನೆ.', dialogue: 'ಇಲ್ಲಿಂದಲೇ ಎಲ್ಲವೂ ಶುರುವಾಗಿದ್ದು...', loc: 'traditional ancestral house courtyard under large trees', act: 'entering through an arched carved wooden gate' },
      { action: 'ಮನೆಯ ಜಗಲಿಯ ಮೇಲೆ ಕುಳಿತು ಹಳೆಯ ಗೋಡೆಯ ಚಿತ್ರವನ್ನು ನೋಡುತ್ತಾ ಯೋಚಿಸುತ್ತಾನೆ.', dialogue: 'ಹಳೆಯ ಕಾಲದ ರಹಸ್ಯಗಳು ಇನ್ನೂ ಇಲ್ಲಿ ಜೀವಂತವಾಗಿವೆ.', loc: 'carved wooden veranda with warm antique lighting', act: 'sitting in a wooden armchair, staring deeply ahead' },
      { action: 'ಇದ್ದಕ್ಕಿದ್ದಂತೆ ಮನೆಯ ಒಳಭಾಗದಿಂದ ನಿಗೂಢ ಶಬ್ದ ಕೇಳಿ ಎಚ್ಚರಗೊಳ್ಳುತ್ತಾನೆ.', dialogue: 'ಅಲ್ಲಿ ಯಾರಿದ್ದೀರಿ? ಹೊರಗೆ ಬನ್ನಿ!', loc: 'dark interior corridor with golden candlelight', act: 'turning head quickly with heightened suspicion' },
      { action: 'ಹಳೆಯ ಮರದ ಪೆಟ್ಟಿಗೆಯನ್ನು ತೆರೆದು ಅದರಲ್ಲಿದ್ದ ಮಹತ್ವದ ದಾಖಲೆಗಳನ್ನು ಕೈಗೆತ್ತಿಕೊಳ್ಳುತ್ತಾನೆ.', dialogue: 'ಈ ಸತ್ಯವನ್ನು ಇನ್ನು ಯಾರೂ ಮುಚ್ಚಿಡಲು ಸಾಧ್ಯವಿಲ್ಲ!', loc: 'antique storeroom with brass lamps and old chests', act: 'opening an ancient wooden box and pulling out documents' },
      { action: 'ಮುಂಜಾನೆಯ ಸೂರ್ಯೋದಯದ ಬೆಳಕಿನಲ್ಲಿ ಎಲ್ಲಾ ಅಡೆತಡೆಗಳನ್ನು ದಾಟಿ ರಾಜೀವ್ ಜಯಗಳಿಸುತ್ತಾನೆ.', dialogue: 'ಇದು ನ್ಯಾಯದ ಗೆಲುವು!', loc: 'epic wide shot overlooking misty waters at dawn', act: 'standing victorious looking toward the rising sun' },
    ],
  },
  te: {
    categories: [
      { catKey: 'thriller', baseGenre: '🕵️ మిస్టరీ & థ్రిల్లర్', baseTitle: 'రహస్యాల నీడ' },
      { catKey: 'drama', baseGenre: '🎭 ఎమోషనల్ డ్రామా', baseTitle: 'జ్ఞాపకాల లోగిలి' },
      { catKey: 'action', baseGenre: '💥 యాక్షన్ & మాస్ థ్రిల్లర్', baseTitle: 'ప్రతీకార మార్గం' },
      { catKey: 'folk', baseGenre: '🌿 జానపద & హారర్', baseTitle: 'నిగూఢ వన శాపం' },
      { catKey: 'scifi', baseGenre: '⏳ సైన్స్ ఫిక్షన్', baseTitle: 'ఆగస్టు 15 టైమ్ లూప్' },
      { catKey: 'comedy', baseGenre: '😂 కామెడీ & ఫన్', baseTitle: 'అల్లరి రాయుడు' },
      { catKey: 'ad', baseGenre: '📢 వాణిజ్య ప్రకటన', baseTitle: 'బ్రాండ్ లాంచ్ యాడ్' },
    ],
    subModifiers: [
      { partLabel: 'భాగం 1', suffix: 'ఆరంభ రహస్యం', mood: 'Dark Suspense • Monologue' },
      { partLabel: 'భాగం 2', suffix: 'అనూహ్య మలుపు', mood: 'Intense Twist • High Tension' },
      { partLabel: 'భాగం 3', suffix: 'రాత్రి రహస్య ప్రయాణం', mood: 'Rain & Shadows • Cinematic' },
      { partLabel: 'భాగం 4', suffix: 'శత్రువుల ముసుగు', mood: 'Action Packed • Fast Paced' },
      { partLabel: 'భాగం 5', suffix: 'పాత జ్ఞాపకాల నెమరువేత', mood: 'Emotional • Melancholic' },
      { partLabel: 'భాగం 6', suffix: 'వేకువజాము నిజం', mood: 'Golden Hour • Revelation' },
      { partLabel: 'భాగం 7', suffix: 'విలన్ మాస్టర్ ప్లాన్', mood: 'Strategic • Dangerous Game' },
      { partLabel: 'భాగం 8', suffix: 'తుది పోరాటం', mood: 'Climax Battle • High Stakes' },
      { partLabel: 'భాగం 9', suffix: 'తెర వెనుక నిజాలు', mood: 'Investigation • Mystery Solved' },
      { partLabel: 'భాగం 10', suffix: 'తుది విజయం & కొత్త ఆరంభం', mood: 'Victorious • Inspiring Ending' },
    ],
    characters: 'రాజీవ్, రాఘవన్, ముసుగు విలన్, నమ్మకమైన మిత్రులు',
    buildSummary: (baseText, genre, title, suffix) =>
      `${baseText} ఈ కథ ${genre} విభాగంలో "${title}" అనే శీర్షికతో సాగుతుంది — ${suffix}. రాజీవ్ తన లక్ష్యం వైపు అడుగులు వేస్తున్నప్పుడు ఊహించని సవాళ్లు మరియు ఉత్కంఠభరితమైన మలుపులు ఎదురవుతాయి. పాత జ్ఞాపకాలు మరియు దాగి ఉన్న రహస్యాలు ఒక్కొక్కటిగా బయటపడటంతో కథలో ఆసక్తి మరింత పెరుగుతుంది. రాత్రి వర్షంలో అకస్మాత్తుగా ఎదురయ్యే అజ్ఞాత శత్రువును రాజీవ్ తన తెలివితేటలతో ధైర్యంగా ఎదుర్కొంటాడు. నమ్మకమైన స్నేహితుల సమయోచిత సహాయంతో కథ కీలక దశకు చేరుకుంటుంది. చివరికి అన్ని మోసాలు బయటపడి సత్యం గెలవడంతో కొత్త వెలుగులో కథ శుభప్రదంగా ముగుస్తుంది.`,
    variationLabel: (genre, num) => `${genre} - భాగం ${num}`,
    shotBeats: [
      { action: 'రాజీవ్ ఊరిలోని పాత టీ కొట్టులో కూర్చుని మాట్లాడుతూ వేడి టీ తాగుతున్నాడు.', dialogue: 'అన్నా... ఈరోజు ఊరి విశేషాలు ఏంటి?', loc: 'rustic traditional tea shop with wooden benches', act: 'sitting at a wooden table holding a teacup and talking' },
      { action: 'టీ గ్లాస్ కింద పెట్టి బెంచ్‌పై నుండి లేచి గ్రామ రోడ్డుపైకి నడుస్తాడు.', dialogue: 'సరే, నేను ఇక బయలుదేరుతాను...', loc: 'scenic village street lined with green trees', act: 'standing up and walking toward the gravel road' },
      { action: 'సాయంత్రపు బంగారు వెలుగులో ఆలోచనలతో నిండిన మనసుతో దారిలో నడుస్తాడు.', dialogue: 'ఈరోజు మనసులో ఏదో తెలియని బరువు ఉంది...', loc: 'narrow village path surrounded by trees', act: 'walking purposefully carrying a small shoulder bag' },
      { action: 'పూర్వీకుల ఇంటి పెద్ద చెక్క గేటు దాటి ఆవరణలోకి అడుగుపెడతాడు.', dialogue: 'ఇక్కడి నుండే కథ అంతా మొదలైంది...', loc: 'traditional ancestral house courtyard under large trees', act: 'entering through an arched carved wooden gate' },
      { action: 'వరండాలో కూర్చుని గోడపై ఉన్న పాత చిత్రాన్ని చూస్తూ ఆలోచనలో మునిగిపోతాడు.', dialogue: 'గత కాలపు రహస్యాలు ఇంకా ఈ గోడలలో దాగి ఉన్నాయి.', loc: 'carved wooden veranda with warm antique lighting', act: 'sitting in a wooden armchair, staring deeply ahead' },
      { action: 'అకస్మాత్తుగా ఇంటి లోపలి నుండి వింత శబ్దం విని అప్రమత్తమవుతాడు.', dialogue: 'అక్కడ ఎవరు? బయటకు రండి!', loc: 'dark interior corridor with golden candlelight', act: 'turning head quickly with heightened suspicion' },
      { action: 'పాత చెక్క పెట్టెను తెరిచి అందులో ఉన్న ముఖ్యమైన పత్రాలను బయటకు తీస్తాడు.', dialogue: 'ఈ నిజాన్ని ఇక ఎవరూ దాచలేరు!', loc: 'antique storeroom with brass lamps and old chests', act: 'opening an ancient wooden box and pulling out documents' },
      { action: 'ఉదయపు సూర్యకాంతిలో అన్ని అడ్డంకులను దాటి రాజీవ్ విజయం సాధిస్తాడు.', dialogue: 'ఇది న్యాయం సాధించిన విజయం!', loc: 'epic wide shot overlooking misty waters at dawn', act: 'standing victorious looking toward the rising sun' },
    ],
  },
};

export function generateStoryAnglesLocal(premise: string, lang: AppLang = 'ml'): StoryAngle[] {
  const baseText = premise.trim();
  const pack = LOCALIZED_STORY_PACKS[lang] || LOCALIZED_STORY_PACKS.ml;

  const allAngles: StoryAngle[] = [];
  let counter = 1;

  pack.categories.forEach((cat) => {
    pack.subModifiers.forEach((mod, modIdx) => {
      allAngles.push({
        id: `angle-${counter}`,
        catKey: cat.catKey,
        genre: `${cat.baseGenre} (${modIdx + 1})`,
        title: `${cat.baseTitle} - ${mod.partLabel}`,
        mood: mod.mood,
        characters: pack.characters,
        storySummary: pack.buildSummary(baseText, cat.baseGenre, cat.baseTitle, `${mod.partLabel}: ${mod.suffix}`),
        beginning: `${mod.partLabel}: ${mod.suffix}`,
        middle: mod.mood,
        ending: pack.subModifiers[9].suffix,
        synopsis: pack.variationLabel(cat.baseGenre, modIdx + 1),
        scriptText: `${baseText} — (${pack.variationLabel(cat.baseGenre, modIdx + 1)})`,
      });
      counter++;
    });
  });

  return allAngles;
}

export function parseScriptSituation(beatText: string, shotNum: number) {
  const text = beatText.toLowerCase();

  let locationEng = 'a picturesque cinematic village film set';
  let actionEng = 'performing cinematic dramatic action';
  let cameraAngle = '35mm anamorphic eye-level tracking shot';

  if (text.includes('ചായ') || text.includes('tea') || text.includes('चाय') || text.includes('டீ') || text.includes('ಚಹಾ') || text.includes('టీ')) {
    locationEng = 'a rustic traditional village tea shop with wooden benches and glass teacups';
  } else if (text.includes('വീട്') || text.includes('ഉമ്മറം') || text.includes('home') || text.includes('house') || text.includes('हवेली') || text.includes('बरामदे') || text.includes('வீட்') || text.includes('ಮನೆ') || text.includes('ఇంటి')) {
    locationEng = 'inside a traditional ancestral home veranda with carved wooden armchairs and warm ambient light';
  } else if (text.includes('റോഡ്') || text.includes('street') || text.includes('lane') || text.includes('सड़क') || text.includes('சாலையில்') || text.includes('ರಸ್ತೆ') || text.includes('రోడ్డు')) {
    locationEng = 'on a scenic rural village road surrounded by lush green trees';
  }

  if (shotNum % 3 === 1) cameraAngle = 'Medium shot, shallow depth of field, natural cinematic lighting';
  else if (shotNum % 3 === 2) cameraAngle = 'Close-up camera angle, dramatic lighting, sharp focus';
  else cameraAngle = 'Wide angle establishing shot, rich environmental detail';

  return { locationEng, actionEng, cameraAngle };
}

export function generateBreakdownLocal(
  _script: string,
  preferredShotDuration: number = 8,
  characterPhotos: any[] = [],
  targetShotCount: number = 8,
  lang: AppLang = 'ml'
): { title: string; shots: GeneratedShot[] } {
  const numShots = Math.max(1, targetShotCount || 8);
  const pack = LOCALIZED_STORY_PACKS[lang] || LOCALIZED_STORY_PACKS.ml;
  const templates = pack.shotBeats;

  const hasPhotos = Array.isArray(characterPhotos) && characterPhotos.length > 0;
  const actorRef = hasPhotos
    ? '[SAME CHARACTER CONTINUITY - Face ID & Wardrobe Locked]: 35yo South Asian man with exact facial features, short dark hair, trimmed beard, and matching clothing from reference photo'
    : '[SAME CHARACTER CONTINUITY]: Weathered 35yo lead actor with dense trimmed beard and expressive eyes';

  const shots: GeneratedShot[] = Array.from({ length: numShots }, (_, idx) => {
    const shotNum = idx + 1;
    const template = templates[idx % templates.length];
    const situation = parseScriptSituation(template.action, shotNum);

    const imagePrompt = `[IMAGE GENERATION PROMPT]: Cinematic photorealistic 35mm film still of ${actorRef}. Location & Background: ${template.loc}. Situation & Action: ${template.act}. Lighting & Color: Warm cinematic volumetric lighting, rich contrast, moody film shadows. Camera: ${situation.cameraAngle}, 8k resolution, 100% face and wardrobe continuity locked.`;

    const videoPrompt = `[VIDEO GENERATION PROMPT]: Smooth 24fps cinematic video motion prompt. Character & Face Continuity: ${actorRef}. Location & Background: ${template.loc}. Lighting & Atmosphere: Dramatic film lighting with realistic light interaction and shadow depth. Action & Motion: ${template.act}. Spoken Dialogue/Voiceover (${lang.toUpperCase()}): "${template.dialogue}". Camera Movement: ${situation.cameraAngle}, organic physics, ${preferredShotDuration} seconds shot duration.`;

    return {
      shotNumber: shotNum,
      durationSeconds: preferredShotDuration,
      timing: `Shot ${shotNum.toString().padStart(2, '0')} — ${preferredShotDuration}s`,
      action: template.action,
      characters: ['Main Character'],
      malayalamDialogue: template.dialogue,
      dialogueEnglish: template.dialogue,
      imagePrompt,
      videoPrompt,
      visualPrompt: imagePrompt,
    };
  });

  return {
    title: 'Cinematic Full Feature Breakdown',
    shots,
  };
}
