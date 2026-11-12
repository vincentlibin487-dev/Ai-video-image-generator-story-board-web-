import { GoogleGenAI } from '@google/genai';
import { generateStoryAnglesLocal } from '../src/lib/storyEngine';
import { AppLang, getLangConfig } from '../src/lib/i18n';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { script, language = 'ml' } = body;

    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return res.status(400).json({ error: 'Story script concept is required.' });
    }

    const langConfig = getLangConfig(language);
    const langCode = langConfig.code as AppLang;

    const ai = getGeminiClient();
    if (ai) {
      try {
        const systemInstruction = `You are a legendary Cinema Script Consultant. Given a story concept, generate 60 distinct film storyline angles strictly in ${langConfig.geminiLangName} JSON covering thriller, drama, action, folk, scifi, comedy, and commercial ads.
CRITICAL RULE: Write all genres, titles, characters, storySummary, synopsis, and scriptText in ${langConfig.geminiLangName}. In "storySummary", write ONLY the direct 10-line story narrative with characters, beginning, twist, and ending—never meta-commentary. Include "catKey" from ["thriller","drama","action","folk","scifi","comedy","ad"].
{ "angles": [
  {
    "id": "angle-1",
    "catKey": "thriller",
    "genre": "...",
    "title": "...",
    "mood": "...",
    "characters": "...",
    "storySummary": "...",
    "beginning": "...",
    "middle": "...",
    "ending": "...",
    "synopsis": "...",
    "scriptText": "..."
  }
] }`;

        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Target Language: ${langConfig.geminiLangName}\nStory concept: "${script.trim()}"`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const response = await withTimeout(geminiPromise, 4500);
        if (response?.text) {
          const parsed = JSON.parse(response.text);
          if (parsed.angles && Array.isArray(parsed.angles) && parsed.angles.length >= 10) {
            return res.status(200).json({ angles: parsed.angles });
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini story angles notice, using instant engine:', geminiErr?.message);
      }
    }

    const angles = generateStoryAnglesLocal(script, langCode);
    return res.status(200).json({ angles });
  } catch (error: any) {
    console.error('Error generating story angles:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate story angles',
    });
  }
}
