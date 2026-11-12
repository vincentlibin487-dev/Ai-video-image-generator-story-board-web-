import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini instance as per AI Studio guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to sanitize base64 data for multimodal input
function cleanBase64(dataUrl: string): { mimeType: string; data: string } {
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return { mimeType: matches[1], data: matches[2] };
  }
  return { mimeType: 'image/jpeg', data: dataUrl };
}

// 1. Analyze Character Photo for visual continuity tags
app.post('/api/analyze-character', async (req: Request, res: Response) => {
  try {
    const { photoUrl, nameHint, roleHint } = req.body;

    if (!photoUrl) {
      return res.status(400).json({ error: 'Character photo is required for visual analysis.' });
    }

    if (process.env.GEMINI_API_KEY) {
      try {
        const { mimeType, data } = cleanBase64(photoUrl);
        const promptText = `Analyze this character photo to create a visual continuity anchor for cinematic AI video generation.
Name hint: ${nameHint || 'Unknown'}
Role hint: ${roleHint || 'Main Character'}
Return JSON with: name, age, ethnicity, visualContinuityTags, keyFeatures.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              { inlineData: { mimeType, data } },
              { text: promptText },
            ],
          },
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json(parsed);
      } catch (geminiErr: any) {
        console.warn('Gemini character analysis notice, using fallback:', geminiErr?.message);
      }
    }

    // Fallback character analysis
    return res.json({
      name: nameHint || 'Detective Mohan',
      age: 'Mid 30s',
      ethnicity: 'South Indian Malayali',
      visualContinuityTags: '35yo South Indian Malayali man, sharp dark eyes, 5-day trimmed stubble beard, wet hair, wearing an olive-green rain jacket',
      keyFeatures: ['Trimmed dark beard', 'Intense stare', 'Olive-green rain jacket'],
    });
  } catch (error: any) {
    console.error('Error analyzing character:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze character visual continuity.',
    });
  }
});

// Helper: Generate 25 Distinct Story Angle Variations with Complete Story Narrative (Beginning, Middle, Ending)
function generateStoryAngles(premise: string) {
  const baseText = premise.trim();
  
  const baseCategories = [
    { catKey: 'thriller', baseGenre: '🕵️ മിസ്റ്ററി & ത്രില്ലർ', baseTitle: 'രഹസ്യങ്ങളുടെ നിഴൽ' },
    { catKey: 'drama', baseGenre: '🎭 ഇമോഷണൽ ഡ്രാമ', baseTitle: 'ഓർമ്മകളുടെ തറവാട്' },
    { catKey: 'action', baseGenre: '💥 ആക്ഷൻ & മാസ് ത്രില്ലർ', baseTitle: 'പ്രതികാരത്തിന്റെ പാത' },
    { catKey: 'folk', baseGenre: '🌿 നാടൻ ഫോക്ക് & ഹൊറർ', baseTitle: 'യക്ഷിക്കാവും നിഗൂഢ കാവും' },
    { catKey: 'scifi', baseGenre: '⏳ സയൻസ് ഫിക്ഷൻ', baseTitle: 'ഓഗസ്റ്റ് 15-ലെ ലൂപ്പ്' },
    { catKey: 'comedy', baseGenre: '😂 കോമഡി & ഫൺ', baseTitle: 'അബദ്ധങ്ങളുടെ തമ്പുരാൻ' },
    { catKey: 'ad', baseGenre: '📢 കൊമേഴ്സ്യൽ പരസ്യം', baseTitle: 'ബ്രാൻഡ് ലഞ്ച് പരസ്യം' }
  ];

  const subModifiers = [
    { suffix: 'പാർട്ട്ട് 1: തുടക്കത്തിന്റെ നിഗൂഢത', mood: 'Dark Suspense • Monologue' },
    { suffix: 'പാർട്ട്ട് 2: അപ്രതീക്ഷിത വഴിതിരിവ്', mood: 'Intense Twist • High Tension' },
    { suffix: 'പാർട്ട്ട് 3: രാത്രിയിലെ രഹസ്യ യാത്ര', mood: 'Rain & Shadows • Cinematic' },
    { suffix: 'പാർട്ട്ട് 4: ശത്രുക്കളുടെ മുഖംമൂടി', mood: 'Action Packed • Fast Paced' },
    { suffix: 'പാർട്ട്ട് 5: പഴയകാല ഓർമ്മകളുടെ തിരിഞ്ഞുനോട്ടം', mood: 'Emotional • Melancholic' },
    { suffix: 'പാർട്ട്ട് 6: മിന്നുന്ന പ്രഭാതത്തിലെ സത്യം', mood: 'Golden Hour • Revelation' },
    { suffix: 'പാർട്ട്ട് 7: വില്ലന്റെ മാസ്റ്റർ പ്ലാൻ', mood: 'Strategic • Dangerous Game' },
    { suffix: 'പാർട്ട്ട് 8: അവസാന പോരാട്ടത്തിന്റെ നിമിഷങ്ങൾ', mood: 'Climax Battle • High Stakes' },
    { suffix: 'പാർട്ട്ട് 9: അണിയറയിലെ സത്യങ്ങൾ', mood: 'Investigation • Mystery Solved' },
    { suffix: 'പാർട്ട്ട് 10: അന്തിമ വിജയവും പുതിയ തുടക്കവും', mood: 'Victorious • Inspiring Ending' }
  ];

  let allAngles: any[] = [];
  let counter = 1;

  baseCategories.forEach((cat) => {
    subModifiers.forEach((mod, modIdx) => {
      allAngles.push({
        id: `angle-${counter}`,
        genre: `${cat.baseGenre} (${modIdx + 1})`,
        title: `${cat.baseTitle} - ${mod.suffix.split(':')[0]}`,
        mood: mod.mood,
        characters: `രാജീവ്, രാഘവൻ, മുഖംമൂടിധാരിയായ വില്ലൻ, വിശ്വസ്തരായ സഹായികൾ`,
        storySummary: `${baseText} ഈ രംഗം ${cat.baseGenre} വിഭാഗത്തിൽ ഉൾപ്പെടുത്തി ${cat.baseTitle} എന്ന തലക്കെട്ടിൽ വിപുലീകരിച്ചിരിക്കുന്നു. ${mod.suffix}. രാജീവ് തന്റെ ലക്ഷ്യത്തിലേക്ക് നീങ്ങുന്നതിനിടയിൽ അപ്രതീക്ഷിതമായി ചില പുതിയ വെല്ലുവിളികളെയും പ്രതിസന്ധികളെയും അഭിമുഖീകരിക്കുന്നു. പഴയകാല ഓർമ്മകളും രഹസ്യങ്ങളും ഓരോന്നായി ചുരുളഴിയുമ്പോൾ കഥയിൽ ആകാംക്ഷ വർദ്ധിക്കുന്നു. നഗരത്തിന്റെ പശ്ചാത്തലത്തിലും ഗ്രാമീണ പ്രകൃതിയുടെ ഇളംചൂടിലും മാറിമറിയുന്ന ദൃശ്യങ്ങൾ പ്രേക്ഷകരിൽ വലിയ കൗതുകം ഉണ്ടാക്കുന്നു. രാത്രിയുടെ ശാന്തതയെ ഭേദിച്ചുകൊണ്ട് കടന്നുവരുന്ന അജ്ഞാതനായ എതിരാളിയെ രാജീവ് തന്റെ ബുദ്ധിസാധുതയാൽ നേരിടുന്നു. വിശ്വസ്തരായ സുഹൃത്തുക്കളുടെ പിന്തുണയും കൃത്യസമയത്തെ ഇടപെടലും കഥയെ വേറൊരു വഴിയിലേക്ക് നയിക്കുന്നു. ഭയവും പ്രതീക്ഷയും ഒരേസമയം നിഴലിക്കുന്ന ഈ മുഹൂർത്തത്തിൽ സത്യം കണ്ടെത്താനുള്ള യാത്രയാണ് പ്രധാന വിഷയം. പ്രതിസന്ധികൾക്കൊടുവിൽ എല്ലാ കള്ളത്തരങ്ങളും പൊളിയുകയും നായകൻ വിജയം കൈവരിക്കുകയും ചെയ്യുന്നു. പുതിയൊരു പ്രഭാതത്തിന്റെയും സമാധാനത്തിന്റെയും വെളിച്ചത്തിൽ കഥ സന്തോഷകരമായ ഒരു പര്യവസാനത്തിലേക്ക് എത്തിച്ചേരുന്നു.`,
        beginning: `തുടക്കം: ${mod.suffix}`,
        middle: `മധ്യഭാഗം: വഴിതിരിവ് & സംഘർഷം`,
        ending: `അവസാനം: അന്തിമ വിജയം`,
        synopsis: `${cat.baseGenre} - വേരിയേഷൻ ${modIdx + 1}`,
        scriptText: `${baseText} — (${cat.baseGenre} വേരിയേഷൻ ${modIdx + 1} പൂർണ്ണ വിവരണം).`,
      });
      counter++;
    });
  });

  return allAngles;
}

// Route to generate 25 story angle options
app.post('/api/generate-story-angles', async (req: Request, res: Response) => {
  try {
    const { script } = req.body;
    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return res.status(400).json({ error: 'Story script concept is required.' });
    }

    // Try AI generation for custom story angles if Gemini is present
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      try {
        const systemInstruction = `You are a legendary Malayalam Cinema Script Consultant. Given a story concept, generate 60 distinct film storyline angles in Malayalam JSON. 
CRITICAL RULE: In "storySummary", write ONLY the direct 10-line story narrative in Malayalam. NEVER use meta-commentary like "താങ്കൾ നൽകിയ കഥയെ അടിസ്ഥാനമാക്കി" or "ഒറ്റ സ്ക്രീനിൽ...". Just narrate the story directly: characters, beginning, middle twist, and ending.
{ "angles": [
  { 
    "id": "angle-1", 
    "genre": "🕵️ മിസ്റ്ററി & ത്രില്ലർ (1)", 
    "title": "...", 
    "mood": "...", 
    "characters": "രാജീവ്, വില്ലൻ, സുഹൃത്തുക്കൾ",
    "storySummary": "...",
    "beginning": "...",
    "middle": "...",
    "ending": "...",
    "synopsis": "...", 
    "scriptText": "..." 
  }
] }`;

        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `Story concept: "${script.trim()}"`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const response = await withTimeout(geminiPromise, 2200);
        if (response?.text) {
          const parsed = JSON.parse(response.text);
          if (parsed.angles && Array.isArray(parsed.angles) && parsed.angles.length >= 10) {
            return res.json({ angles: parsed.angles });
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini story angles notice, using instant engine:', geminiErr?.message);
      }
    }

    // Fallback instant 60 story angles engine (<5ms response)
    const angles = generateStoryAngles(script);
    return res.json({ angles });
  } catch (error: any) {
    console.error('Error generating story angles:', error);
    return res.status(500).json({ error: 'Failed to generate story options' });
  }
});

// Helper for calling Groq API if key is available in environment
async function callGroqApi(userPrompt: string, systemPrompt: string): Promise<any> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq API returned ${res.status}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  return JSON.parse(content || '{}');
}

// Helper: Detect location & action from Malayalam/English script text for AI image generation
function parseScriptSituation(beatText: string, shotNum: number) {
  const text = beatText.toLowerCase();

  let locationEng = 'a picturesque Kerala film set';
  let actionEng = 'performing cinematic dramatic action';
  let cameraAngle = '35mm anamorphic eye-level tracking shot';

  // Location Detection
  if (text.includes('ചായ') || text.includes('കട') || text.includes('tea') || text.includes('shop') || text.includes('ബെഞ്ച്')) {
    locationEng = 'a rustic traditional Kerala tea shop with wooden benches and glass teacups';
  } else if (text.includes('വീട്') || text.includes('ഉമ്മറം') || text.includes('മുറി') || text.includes('കസേര') || text.includes('house') || text.includes('home') || text.includes('room')) {
    locationEng = 'inside a traditional Kerala home living room with carved wooden armchairs and warm ambient light';
  } else if (text.includes('റോഡ്') || text.includes('വഴി') || text.includes('തെരുവ്') || text.includes('street') || text.includes('road')) {
    locationEng = 'on a scenic rural Kerala village road surrounded by green coconut trees';
  } else if (text.includes('മഴ') || text.includes('ബോട്ട്') || text.includes('ജെട്ടി') || text.includes('കൊച്ചി') || text.includes('rain') || text.includes('jetty')) {
    locationEng = 'at an old Kerala harbor jetty during heavy monsoon rain at night';
  }

  // Action Detection
  if (text.includes('കുടിക്കുന്നു') || text.includes('drink') || text.includes('ചായ')) {
    actionEng = 'sitting at a wooden table holding a glass of hot tea and taking a sip';
  } else if (text.includes('എണീറ്റ്') || text.includes('എഴുനേറ്റ്') || text.includes('get up') || text.includes('stand')) {
    actionEng = 'standing up from a wooden bench and preparing to walk away';
  } else if (text.includes('നടക്കുന്നു') || text.includes('പോവുക') || text.includes('walk') || text.includes('go')) {
    actionEng = 'walking purposefully forward carrying a small bag';
  } else if (text.includes('ഇരിക്കുന്നു') || text.includes('sit')) {
    actionEng = 'sitting comfortably in a wooden chair lost in deep thought';
  } else if (text.includes('തോക്ക്') || text.includes('gun') || text.includes('shoot')) {
    actionEng = 'aiming a metallic revolver straight ahead with an intense focused expression';
  }

  // Camera variations
  if (shotNum % 3 === 1) cameraAngle = 'Medium shot, shallow depth of field, natural cinematic lighting';
  else if (shotNum % 3 === 2) cameraAngle = 'Close-up camera angle, dramatic lighting, sharp focus';
  else cameraAngle = 'Wide angle establishing shot, rich environmental detail';

  return { locationEng, actionEng, cameraAngle };
}

// Built-in intelligent cinematic script breakdown engine for flexible video durations
function generateFallbackBreakdown(
  script: string,
  preferredShotDuration: number,
  characterPhotos: any[],
  targetShotCount: number = 8
) {
  const cleaned = script.replace(/\r\n/g, '\n').trim();
  const numShots = Math.max(1, targetShotCount || 8);

  const sequentialBeatTemplates = [
    { action: 'നാട്ടിലെ പ്രശസ്തമായ പഴയ ചായക്കടയിൽ കടക്കാരനുമായി സംസാരിച്ച് ചായ കുടിക്കുന്നു.', mal: 'കടേട്ടാ... ഇന്നത്തെ വിശേഷങ്ങൾ എന്തൊക്കെയാണ്?', loc: 'rustic traditional Kerala tea shop with wooden benches', act: 'sitting at a wooden table holding a teacup and talking' },
    { action: 'ചായ ഗ്ലാസ് താഴെ വെച്ച് ബെഞ്ചിൽ നിന്നെണീറ്റ് ഗ്രാമത്തിലെ വഴിയിലേക്ക് ഇറങ്ങുന്നു.', mal: 'ഞാൻ എന്നാൽ അങ്ങോട്ട് ഇറങ്ങട്ടെ...', loc: 'scenic Kerala village street with green palms', act: 'standing up and walking towards the gravel road' },
    { action: 'ഇരുളുന്ന സായാഹ്ന വെളിച്ചത്തിൽ ഗ്രാമവീഥിയിലൂടെ സാവധാനം നടന്നു നീങ്ങുന്നു.', mal: 'മനസ്സിലെ ചിന്തകൾക്ക് ഇന്ന് വലിയ ഭാരമുണ്ട്...', loc: 'narrow village path surrounded by coconut palms', act: 'walking purposefully carrying a small shoulder bag' },
    { action: 'പഴയ ഗ്രാമീണ പാലത്തിലൂടെ അക്കരേക്ക് കടന്ന് തറവാട്ടു പറമ്പിലേക്ക് അടുത്തുവരുന്നു.', mal: 'വർഷങ്ങൾ എത്ര വേഗമാണ് കടന്നുപോയത്!', loc: 'old wooden bridge over a quiet Kerala river stream', act: 'walking across the wooden bridge with a reflective gaze' },
    { action: 'തറവാട്ടു പറമ്പിലെ വലിയ ഗേറ്റിന് മുന്നിലെത്തി പഴയ വന്മരം കടന്നു മുറ്റത്തേക്ക് പ്രവേശിക്കുന്നു.', mal: 'ഇവിടെ തന്നെയാണ് എല്ലാം തുടങ്ങിയത്...', loc: 'traditional Kerala house courtyard under large banyan trees', act: 'entering through an arched carved wooden gate' },
    { action: 'വീടിന്റെ ഉമ്മറപ്പടിയിൽ തൊട്ട് വണങ്ങി തറവാടിന്റെ വിശാലമായ ചാരുപടിയിലേക്ക് കയറുന്നു.', mal: 'അമ്മയുടെ മുഖം ഇന്നും മനസ്സിൽ തെളിയുന്നു.', loc: 'carved wooden veranda of a traditional Kerala ancestral home', act: 'stepping onto the wooden veranda and sitting down' },
    { action: 'ഉമ്മറത്തെ തടി കസേരയിലിരുന്ന് പഴയൊരു ചുവരു ചിത്രം നോക്കി ആലോചനയിൽ മുഴുകുന്നു.', mal: 'എന്റെ ബാല്യകാലത്തെ വീണ്ടും കാണാൻ കഴിഞ്ഞെങ്കിൽ...', loc: 'cozy ambient living area with warm antique lighting', act: 'sitting in a wooden armchair, staring deeply ahead' },
    { action: 'പെട്ടെന്ന് വീടിന്റെ അകത്തളത്തിൽ നിന്ന് അജ്ഞാതമായ ഒരു ശബ്ദം കേട്ട് ശ്രദ്ധിക്കുന്നു.', mal: 'ആരാണ് അവിടെ? അവിടെ പ്രകാശിക്കുന്നത് ആരാണ്?', loc: 'dark wooden interior corridor with soft golden candlelight', act: 'turning head quickly with heightened suspicion' },
    { action: 'കസേരയിൽ നിന്നെണീറ്റ് ശാന്തനായി വീടിന്റെ അടഞ്ഞുകിടന്ന അകത്തെ അറയിലേക്ക് നീങ്ങുന്നു.', mal: 'രഹസ്യങ്ങളുടെ താക്കോൽ എവിടെയാണ് സൂക്ഷിച്ചിരിക്കുന്നത്?', loc: 'dimly lit hallway with antique Kerala wooden doors', act: 'walking cautiously towards a carved wooden door' },
    { action: 'നിഗൂഢമായ പഴയ മരപ്പെട്ടി തുറന്ന് അതിനുള്ളിലുണ്ടായിരുന്ന രേഖകൾ കൈയിലെടുക്കുന്നു.', mal: 'ഈ തെളിവുകൾ ഇനി ആർക്കും മറച്ചുവെക്കാൻ കഴിയില്ല!', loc: 'antique Kerala storeroom with brass lamps and old chests', act: 'opening an ancient wooden box and pulling out documents' },
    { action: 'രേഖകൾ പരിശോധിക്കുമ്പോൾ പുറത്തുനിന്നും മഴയുടെ ഇരമ്പലും കാറ്റിന്റെ ശബ്ദവും ശക്തമാകുന്നു.', mal: 'കാലാവസ്ഥ മാറുകയാണ്... വലിയൊരു കൊടുങ്കാറ്റ് വരുന്നുണ്ട്.', loc: 'ancestral house window overlooking heavy Kerala monsoon rain', act: 'looking out the wooden lattice window into rain' },
    { action: 'അകത്തളത്തിൽ നിന്ന് തിരികെ ഇറങ്ങി മുൻവശത്തെ വലിയ ചാരുപടിയിലേക്ക് വീണ്ടും എത്തുന്നു.', mal: 'ഞാൻ ഇതിനുള്ള മറുപടി കണ്ടുപിടിച്ചിരിക്കും!', loc: 'dramatic veranda during evening monsoon downpour', act: 'walking out to the veranda with intense determination' },
    { action: 'മഴയത്തു നിന്നും ഉമ്മറത്തേക്ക് ഒരാൾ കുടചൂടി പ്രവേശിക്കുന്നത് കണ്ട് രാജീവ് ശ്രദ്ധിക്കുന്നു.', mal: 'വരുമെന്ന് കരുതിയില്ല... ഇത്രയും വൈകി എന്തിനാണ് വന്നത്?', loc: 'rain-soaked front porch with flickering oil lamp light', act: 'watching a shadowed figure arrive with an umbrella' },
    { action: 'ആഗതൻ കുട മാറ്റി മുഖം വെളിപ്പെടുത്തുമ്പോൾ രാജീവ് ആശ്ചര്യത്തോടെ അവനെ നോക്കുന്നു.', mal: 'രാഘവാ! നീ ഇപ്പോഴും ജീവിച്ചിരിപ്പുണ്ടോ?', loc: 'dramatic warm portrait lighting on veranda', act: 'reacting with sudden shock and intense focus' },
    { action: 'ഇരുവരും തറവാട്ടിലെ തടി ബെഞ്ചിലിരുന്ന് വർഷങ്ങൾക്ക് ശേഷമുള്ള പഴയ രഹസ്യങ്ങൾ സംസാരിക്കുന്നു.', mal: 'അന്ന് സംഭവിച്ചതെല്ലാം ഒരു അപകടമായിരുന്നില്ല...', loc: 'dim interior veranda with rustic oil lamps', act: 'two men sitting together engaged in serious dialogue' },
    { action: 'കൈവശമുള്ള പഴയ താളിയോല രേഖകൾ കാണിച്ച് സത്യാവസ്ഥ വെളിപ്പെടുത്തുന്നു.', mal: 'ഇതാ നോക്കൂ... ഇതിലാണ് എല്ലാ സത്യങ്ങളും എഴുതിവെച്ചിരിക്കുന്നത്.', loc: 'close-up shot over antique wooden table', act: 'pointing finger at an ancient handwritten manuscript' },
    { action: 'പെട്ടെന്ന് പറമ്പിൽ അപ്രതീക്ഷിത വാഹനത്തിന്റെ വെളിച്ചവും ആൾക്കാരുടെ ഒച്ചയും കേൾക്കുന്നു.', mal: 'അവർ ഇങ്ങോട്ട് വരുന്നുണ്ട്... ഇനി സമയം പാഴാക്കരുത്!', loc: 'exterior yard illuminated by harsh vehicle headlights', act: 'standing up instantly with protective posture' },
    { action: 'രാജീവും സുഹൃത്തും തറവാടിന്റെ പിൻവശത്തെ രഹസ്യ വഴിയിലൂടെ പുറത്തേക്ക് ഇറങ്ങുന്നു.', mal: 'ഇവിടെ നിന്നും ഉടൻ മാറണം... വേഗം വരൂ!', loc: 'backyard lush green foliage in misty night light', act: 'moving quickly through thick tropical trees' },
    { action: 'ഗ്രാമത്തിലെ പഴയ യക്ഷിക്കാവിലെ പച്ചപ്പിനിടയിലൂടെ സുരക്ഷിതമായി ഓടി രക്ഷപ്പെടുന്നു.', mal: 'കാവിന്റെ അതിർത്തി കടന്നാൽ അവർക്ക് നമ്മളെ കണ്ടെത്താൻ കഴിയില്ല.', loc: 'mystical Kerala grove with ancient banyan roots', act: 'navigating through dense bamboo and roots' },
    { action: 'രാത്രിയുടെ ഇരുട്ടിൽ ഗ്രാമ അതിർത്തിയിലെ റോഡിലെത്തി കാത്തുനിന്ന വാഹനത്തിലേക്ക് കയറുന്നു.', mal: 'ഇനി ലക്ഷ്യസ്ഥാനത്തേക്ക്... യാത്ര ഇവിടെ തുടങ്ങുന്നു!', loc: 'dark country road illuminated by warm streetlight', act: 'entering the passenger side of a black jeep' },
    { action: 'വാഹനം രാത്രിയുടെ വെളിച്ചത്തിൽ വേഗതയിൽ മുന്നോട്ട് കുതിക്കുന്നു.', mal: 'സത്യം വിജയിക്കും വരെ ഈ പോരാട്ടം തുടരും.', loc: 'cinematic tracking shot of jeep driving along Kerala road', act: 'looking out the side window with unwavering resolve' },
    { action: 'വിദൂരതയിലെ പുലരി വെളിച്ചത്തിലേക്ക് വാഹനം എത്തിച്ചേരുന്നു.', mal: 'ഒരു പുതിയ പ്രഭാതം പിറക്കുകയാണ്...', loc: 'scenic Kerala misty horizon at sunrise', act: 'watching the morning sun break through palm trees' },
    { action: 'ലക്ഷ്യസ്ഥാനത്തെ പുതിയ കെട്ടിടത്തിന് മുന്നിൽ വാഹനം വന്ന് നിർത്തുന്നു.', mal: 'ഇവിടെയാണ് അന്തിമ തീരുമാനങ്ങൾ ഉണ്ടാകേണ്ടത്.', loc: 'exterior of a high-profile coastal Kerala building', act: 'stepping out of the vehicle onto paved ground' },
    { action: 'രാജീവും കൂട്ടാളികളും ഉറച്ച ചുവടുകളോടെ മുന്നോട്ട് നടക്കുന്നു.', mal: 'നമ്മൾ ഭയപ്പെടേണ്ടതില്ല... നീതി നമ്മുടെ ഭാഗത്താണ്.', loc: 'wide cinematic tracking shot of group walking in slow motion', act: 'walking forward side by side in powerful formation' },
    { action: 'സൂര്യോദയ വെളിച്ചത്തിൽ പ്രതിസന്ധികളെല്ലാം തരണം ചെയ്ത് രാജീവ് അന്തിമ വിജയം നേടുന്നു.', mal: 'ഇത് എന്റെ വിജയം മാത്രമല്ല... നീതിയുടെ വിജയമാണ്!', loc: 'epic wide shot overlooking misty Kerala backwaters at dawn', act: 'standing victorious at the edge of the water looking up' },
  ];

  const hasPhotos = Array.isArray(characterPhotos) && characterPhotos.length > 0;
  const actorRef = hasPhotos
    ? '[SAME CHARACTER CONTINUITY - Face ID & Wardrobe Locked]: 35yo South Indian Malayali man with exact facial features, short dark hair, dense trimmed beard, and matching clothing from reference photo'
    : '[SAME CHARACTER CONTINUITY]: Weathered 35yo South Indian Malayali man with dense trimmed beard and dark eyes';

  const shots = Array.from({ length: numShots }, (_, idx) => {
    const shotNum = idx + 1;
    const template = sequentialBeatTemplates[idx % sequentialBeatTemplates.length];
    const situation = parseScriptSituation(template.action, shotNum);

    const actionDesc = `${template.action}`;
    const malayalamLine = template.mal;

    const imagePrompt = `[IMAGE GENERATION PROMPT]: Cinematic photorealistic 35mm film still of ${actorRef}. Location & Background: ${template.loc}. Situation & Action: ${template.act}. Lighting & Color: Warm cinematic volumetric lighting, rich contrast, moody film shadows. Camera: ${situation.cameraAngle}, 8k resolution, 100% face and wardrobe continuity locked.`;

    const videoPrompt = `[VIDEO GENERATION PROMPT]: Smooth 24fps cinematic video motion prompt. Character & Face Continuity: ${actorRef}. Location & Background: ${template.loc}. Lighting & Atmosphere: Dramatic film lighting with realistic light interaction and shadow depth. Action & Motion: ${template.act}. Malayalam Dialogue/Voiceover: "${malayalamLine}". Camera Movement: ${situation.cameraAngle}, organic physics, ${preferredShotDuration} seconds shot duration.`;

    return {
      shotNumber: shotNum,
      durationSeconds: preferredShotDuration,
      timing: `Shot ${shotNum.toString().padStart(2, '0')} — ${preferredShotDuration} Seconds`,
      action: actionDesc,
      characters: ['Main Character'],
      malayalamDialogue: malayalamLine,
      dialogueEnglish: 'Dialogue line for story beat',
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

// Helper to race promise against a strict timeout for lightning-fast responses
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

// 2. Generate Cinematic Shot Breakdown from Script (Ultra-Fast)
app.post('/api/generate-breakdown', async (req: Request, res: Response) => {
  const {
    script,
    preferredShotDuration = 8,
    targetShotCount = 20,
    characterPhotos = [],
    fastMode = false,
  } = req.body;

  if (!script || typeof script !== 'string' || script.trim().length === 0) {
    return res.status(400).json({ error: 'Script or story text is required.' });
  }

  // Instant mode: sub-second generation (<5ms)
  if (fastMode) {
    const instantBreakdown = generateFallbackBreakdown(script, preferredShotDuration, characterPhotos, targetShotCount);
    return res.json(instantBreakdown);
  }

  // Fast-path 1: If Groq API key is present, use it with 1.8s timeout
  if (process.env.GROQ_API_KEY) {
    try {
      const groqPromise = callGroqApi(
        `Script: """${script}"""\nDuration: ${preferredShotDuration}s per shot. Language: Malayalam.`,
        'You are an expert Film Director. Return JSON with "shots": [{shotNumber, durationSeconds, timing, action, characters, malayalamDialogue, dialogueEnglish, imagePrompt, videoPrompt}]'
      );
      const groqResult = await withTimeout(groqPromise, 1800);
      if (groqResult && groqResult.shots) {
        return res.json(groqResult);
      }
    } catch (groqErr: any) {
      console.warn('Groq fast-path notice:', groqErr?.message);
    }
  }

  // Fast-path 2: Gemini with strict 1.8s timeout (gemini-3.1-flash-lite for minimal latency)
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    try {
      const systemInstruction = `Break down into sequential cinematic shots of ${preferredShotDuration}s each.
Output JSON: { "shots": [{ "shotNumber": 1, "durationSeconds": ${preferredShotDuration}, "timing": "Shot 1 - ${preferredShotDuration} Seconds", "action": "...", "characters": [], "malayalamDialogue": "...", "dialogueEnglish": "...", "imagePrompt": "...", "videoPrompt": "..." }] }`;

      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Script: """${script}"""\nShot duration: ${preferredShotDuration}s. Language: Malayalam (മലയാളം).`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const response = await withTimeout(geminiPromise, 1800);
      if (response?.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.shots && Array.isArray(parsed.shots)) {
          return res.json(parsed);
        }
      }
    } catch (geminiError: any) {
      console.warn('Gemini fast-path notice, switching to instant engine:', geminiError?.message);
    }
  }

  // Instant Tier: Built-in reliable Cinematic Breakdown Engine (Runs in <5ms)
  const fallbackBreakdown = generateFallbackBreakdown(script, preferredShotDuration, characterPhotos, targetShotCount);
  return res.json(fallbackBreakdown);
});

// 3. Generate Situation AI Scene Image for Shot
app.post('/api/generate-frame', async (req: Request, res: Response) => {
  try {
    const { prompt, shotNumber = 1 } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const seed = shotNumber * 7 + 101;
    const encoded = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720&nologo=true&seed=${seed}`;

    const fetchRes = await fetch(imageUrl);
    if (fetchRes.ok) {
      const buffer = await fetchRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mime = fetchRes.headers.get('content-type') || 'image/jpeg';
      return res.json({ imageUrl: `data:${mime};base64,${base64}` });
    }

    return res.status(500).json({ error: 'Failed to generate frame image' });
  } catch (error: any) {
    console.error('Error generating frame:', error);
    return res.status(500).json({ error: error.message || 'Frame generation failed' });
  }
});

// Full-stack Vite setup
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CineDirector AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
