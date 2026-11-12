import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  expandShotsToTargetCount,
  generateBreakdownLocal,
  hasExplicitDialogue,
} from '../src/lib/storyEngine';
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
      preferredShotDuration = 8,
      targetShotCount = 20,
      characterPhotos = [],
      language = 'ml',
    } = body;

    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return res.status(400).json({ error: 'Script or story text is required.' });
    }

    const langConfig = getLangConfig(language);
    const langCode = langConfig.code as AppLang;
    const allowDialogue = hasExplicitDialogue(script);
    const coreAiShotCount = Math.max(4, Math.min(Number(targetShotCount) || 8, 8));

    const ai = getGeminiClient();
    if (ai) {
      try {
        const dialogueRule = allowDialogue
          ? `The input story includes speech or dialogue. Include "malayalamDialogue" (in ${langConfig.geminiLangName}) and "dialogueEnglish" ONLY on shots where dialogue occurs. Leave "" on silent shots.`
          : `NO-DIALOGUE RULE: The input story has NO spoken dialogue. Set "malayalamDialogue": "" and "dialogueEnglish": "" on EVERY shot. Never invent fake dialogue.`;

        const systemInstruction = `Cinematographer & AI Director: Break the user's exact story into ${coreAiShotCount} sequential chronological shots of ${preferredShotDuration}s each (Beginning -> Middle -> Ending).
RULES:
1. 100% STORY FIDELITY: Visualize ONLY actual characters, objects, and events from the script.
2. DISTINCT SHOTS: Vary framing across shots (Wide, Medium Tracking, Close-Up, Over-the-Shoulder, Insert Detail) — never repeat identical prompts.
3. Include "continuity" (visual face/wardrobe/prop/lighting lock) and "bgm" (unique music & SFX cue) in English, embedding them in "videoPrompt" and continuity in "imagePrompt".
4. Write "action" in ${langConfig.geminiLangName}; write "bgm", "continuity", "imagePrompt", and "videoPrompt" in English.
5. ${dialogueRule}

JSON only:
{ "shots": [{ "shotNumber": 1, "durationSeconds": ${preferredShotDuration}, "timing": "Shot 01 — ${preferredShotDuration}s", "action": "...", "characters": [], "bgm": "...", "continuity": "...", "malayalamDialogue": "", "dialogueEnglish": "", "imagePrompt": "[IMAGE GENERATION PROMPT]: ...", "videoPrompt": "[VIDEO GENERATION PROMPT]: ..." }] }`;

        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `Language: ${langConfig.geminiLangName}\nCore Shots: ${coreAiShotCount}\nDuration: ${preferredShotDuration}s\nStory:\n"""${script.trim()}"""`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          },
        });

        const response = await withTimeout(geminiPromise, 14000);
        if (response?.text) {
          const parsed = JSON.parse(response.text);
          if (parsed.shots && Array.isArray(parsed.shots) && parsed.shots.length > 0) {
            const expandedShots = expandShotsToTargetCount(
              parsed.shots,
              targetShotCount,
              preferredShotDuration,
              allowDialogue,
              langCode
            );
            return res.status(200).json({ shots: expandedShots });
          }
        }
      } catch (geminiError: any) {
        console.warn('Gemini fast breakdown notice, using fallback:', geminiError?.message);
      }
    }

    const fallbackBreakdown = generateBreakdownLocal(
      script,
      preferredShotDuration,
      characterPhotos,
      targetShotCount,
      langCode
    );
    return res.status(200).json(fallbackBreakdown);
  } catch (error: any) {
    console.error('Error generating breakdown:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate shot prompts',
    });
  }
}
