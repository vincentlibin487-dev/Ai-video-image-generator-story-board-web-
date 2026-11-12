import { GoogleGenAI, ThinkingLevel } from '@google/genai';
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

    // Try ultra-fast parallel AI generation using gemini-3.1-flash-lite (MINIMAL thinking)
    const ai = getGeminiClient();
    if (ai) {
      try {
        const generateBatch = async (cats: string[], countPerCat: number) => {
          const total = cats.length * countPerCat;
          const systemInstruction = `Cinema Script Consultant: Given the user's story concept, generate ${total} genuinely DISTINCT adaptations (${countPerCat} unique variations per category for categories: ${JSON.stringify(cats)}) strictly in ${langConfig.geminiLangName}.
RULES:
1. Stay 100% centered on the EXACT people, places, objects, and event in the user's story.
2. Make every variation distinct (plot direction, twist, conflict, ending — zero copy-paste).
3. Do NOT invent spoken dialogue unless the user's input mentions dialogue.
4. Include unique "bgm" (background music/SFX) and "continuity" (visual/prop/location continuity) in ${langConfig.geminiLangName}.
5. Keep storySummary to 2-3 punchy sentences.
6. Set "catKey" strictly from ${JSON.stringify(cats)}.

JSON only:
{ "angles": [{ "catKey": "${cats[0]}", "genre": "...", "title": "...", "mood": "...", "bgm": "...", "continuity": "...", "characters": "...", "storySummary": "..." }] }`;

          const resBatch = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents: `Language: ${langConfig.geminiLangName}\nStory: "${script.trim()}"`,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
              },
            }),
            12000
          );
          const parsed = JSON.parse(resBatch.text || '{}');
          return Array.isArray(parsed.angles) ? parsed.angles : [];
        };

        const [batch1, batch2] = await Promise.all([
          generateBatch(['thriller', 'drama', 'action', 'folk'], 2),
          generateBatch(['scifi', 'comedy', 'ad'], 2),
        ]);

        const combined = [...batch1, ...batch2];
        if (combined.length >= 6) {
          const normalized = combined.map((a: any, idx: number) => ({
            ...a,
            id: `angle-${idx + 1}`,
            synopsis: a.synopsis || a.mood || a.genre,
            scriptText:
              a.scriptText ||
              `${script.trim()}\n\n${a.storySummary || ''}\n\n[BGM STYLE: ${a.bgm || ''}]\n[CONTINUITY: ${a.continuity || ''}]`,
          }));
          return res.status(200).json({ angles: normalized });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini fast story angles notice, using local fallback:', geminiErr?.message);
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
