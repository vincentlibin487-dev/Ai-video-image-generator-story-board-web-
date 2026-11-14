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
    const { script, language = 'ml', dialogueMode = 'dynamic' } = body;

    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return res.status(400).json({ error: 'Story script concept is required.' });
    }

    const langConfig = getLangConfig(language);
    const langCode = langConfig.code as AppLang;
    const modeNote =
      dialogueMode === 'silent'
        ? 'Format every variation for PURE VISUAL / SLAPSTICK SILENT COMEDY or VISUAL STORYTELLING (zero spoken dialogue, rich visual humor and reactions).'
        : dialogueMode === 'dialogue'
        ? 'Include crisp, varied spoken dialogue cues with zero repeated lines across situations.'
        : 'Blend punchy dialogue moments with hilarious silent visual-comedy reactions dynamically.';

    // Ultra-fast 4 parallel small AI batches (2-4 angles each) for crisp ~3-5s generation
    const ai = getGeminiClient();
    if (ai) {
      try {
        const generateBatch = async (cats: string[], countPerCat: number) => {
          const total = cats.length * countPerCat;
          const nativeOnlyRule =
            langCode === 'en'
              ? 'Write all fields clearly in natural English.'
              : `100% PURE ${langConfig.geminiLangName} ONLY: Write ALL fields (genre, title, mood, bgm, continuity, characters, storySummary) strictly in pure ${langConfig.geminiLangName} Unicode script. ZERO English words or foreign letters.`;

          const systemInstruction = `Cinema Script Consultant: Generate ${total} genuinely DISTINCT film adaptations (${countPerCat} unique variations per category for: ${JSON.stringify(cats)}).
RULES:
1. Stay 100% centered on the EXACT people, animals, places, objects, and core event in the user's input story.
2. CLEAR BEGINNING-TO-END ARC + ZERO REPETITION: Every variation must have a completely DIFFERENT escalating chain of problems, surprises, or comedy angles flowing cleanly from Introduction -> Distinct Middle Escalations -> Satisfying Ending. Do NOT repeat the same conflict or wording across cards.
3. ${modeNote}
4. ${nativeOnlyRule}
5. Include rich "bgm" (background music & SFX), "continuity" (visual character/clothing/prop lock), and 3 punchy sentences in "storySummary" outlining Beginning, Escalating Twist, and Ending.
6. Set "catKey" strictly from ${JSON.stringify(cats)}.

JSON only:
{ "angles": [{ "catKey": "${cats[0]}", "genre": "...", "title": "...", "mood": "...", "bgm": "...", "continuity": "...", "characters": "...", "storySummary": "..." }] }`;

          const resBatch = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents: `Language: ${langConfig.geminiLangName}\nDialogue Mode: ${dialogueMode}\nStory: "${script.trim()}"`,
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

        const settled = await Promise.allSettled([
          generateBatch(['thriller', 'drama'], 2),
          generateBatch(['action', 'folk'], 2),
          generateBatch(['scifi', 'comedy'], 2),
          generateBatch(['ad'], 2),
        ]);

        const combined = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
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
