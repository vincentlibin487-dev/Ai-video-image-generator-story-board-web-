import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { generateStoryAnglesLocal, mergeAnglesEnsuringAllCategories } from '../src/lib/storyEngine';
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
    const {
      script,
      language = 'ml',
      dialogueMode = 'dynamic',
      targetShotCount = 8,
      durationDisplay = '',
    } = body;

    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return res.status(400).json({ error: 'Story script concept is required.' });
    }

    const langConfig = getLangConfig(language);
    const langCode = langConfig.code as AppLang;
    const clipCount = Math.max(4, Number(targetShotCount) || 8);
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

          const systemInstruction = `Master Film Screenwriter: Transform the user's brief story idea into ${total} COMPLETELY DIFFERENT multi-character film stories (${countPerCat} distinct storylines per category for: ${JSON.stringify(cats)}).
CRITICAL NON-REPETITION & STORY EXPANSION RULES:
1. SEED USED ONCE ONLY (ZERO REPETITION): Treat the user's input STRICTLY as Sentence 1 (the opening hook). NEVER repeat, echo, or re-paste the user's opening lines again in later sentences of "storySummary"! Every sentence after Sentence 1 must introduce brand-new events.
2. EXPAND WITH NEW CHARACTERS & MULTIPLE SITUATIONS FOR A ${clipCount}-CLIP (${durationDisplay || `${clipCount} shots`}) VIDEO:
   - Invent 2 to 4 NEW supporting characters with natural local names in "characters" suited to each category.
   - Write a flowing 4 to 5 sentence narrative story in "storySummary":
     * Sentence 1: Opening moment adapted from the user's seed.
     * Sentence 2: A NEW named character enters and sparks a concrete problem, threat, or comic misunderstanding.
     * Sentence 3: An escalating second situation / chase / emotional twist involving another obstacle.
     * Sentence 4: Surprising turning point + concrete climax resolution & satisfying ending.
3. Each variation across ${JSON.stringify(cats)} must tell a TOTALLY different story plot, conflict, and ending matching its category (Thriller mystery vs Comedy chaos vs Action escape vs Folk horror vs Sci-Fi twist vs Emotional Drama vs Commercial Ad).
4. ${modeNote}
5. ${nativeOnlyRule}
6. Include rich "bgm" (background music & SFX) and "continuity" (visual wardrobe/prop continuity). Keep "catKey" strictly as the exact lowercase ASCII tag from ${JSON.stringify(cats)}.

JSON only:
{ "angles": [{ "catKey": "${cats[0]}", "genre": "...", "title": "...", "mood": "...", "bgm": "...", "continuity": "...", "characters": "...", "storySummary": "..." }] }`;

          const resBatch = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents: `Language: ${langConfig.geminiLangName}\nDialogue Mode: ${dialogueMode}\nVideo Length: ${clipCount} clips (${durationDisplay || `${clipCount} shots`})\nUser's Short Opening Seed: "${script.trim()}"`,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            }),
            16000
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

        const fallbackAngles = generateStoryAnglesLocal(script, langCode, clipCount);
        const combined = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
        if (combined.length >= 4) {
          const normalized = combined.map((a: any, idx: number) => ({
            ...a,
            id: `angle-${idx + 1}`,
            synopsis: a.synopsis || a.mood || a.genre,
            scriptText:
              a.scriptText ||
              `${a.storySummary || script.trim()}\n\n[CHARACTERS: ${a.characters || ''}]\n[BGM STYLE: ${a.bgm || ''}]\n[CONTINUITY: ${a.continuity || ''}]`,
          }));
          return res.status(200).json({ angles: mergeAnglesEnsuringAllCategories(normalized, fallbackAngles) });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini fast story angles notice, using local fallback:', geminiErr?.message);
      }
    }

    const angles = generateStoryAnglesLocal(script, langCode, clipCount);
    return res.status(200).json({ angles });
  } catch (error: any) {
    console.error('Error generating story angles:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate story angles',
    });
  }
}
