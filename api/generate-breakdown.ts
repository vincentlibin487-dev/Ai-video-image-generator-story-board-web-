import { GoogleGenAI } from '@google/genai';
import { generateBreakdownLocal } from '../src/lib/storyEngine';
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
      fastMode = false,
      language = 'ml',
    } = body;

    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return res.status(400).json({ error: 'Script or story text is required.' });
    }

    const langConfig = getLangConfig(language);
    const langCode = langConfig.code as AppLang;

    if (fastMode) {
      const instantBreakdown = generateBreakdownLocal(
        script,
        preferredShotDuration,
        characterPhotos,
        targetShotCount,
        langCode
      );
      return res.status(200).json(instantBreakdown);
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const systemInstruction = `Break down into sequential cinematic shots of ${preferredShotDuration}s each. Write action and dialogue strictly in ${langConfig.geminiLangName}.
Output JSON: { "shots": [{ "shotNumber": 1, "durationSeconds": ${preferredShotDuration}, "timing": "Shot 1 - ${preferredShotDuration} Seconds", "action": "...", "characters": [], "malayalamDialogue": "...", "dialogueEnglish": "...", "imagePrompt": "...", "videoPrompt": "..." }] }`;

        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Script: """${script}"""\nShot duration: ${preferredShotDuration}s. Language: ${langConfig.geminiLangName}.`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const response = await withTimeout(geminiPromise, 4000);
        if (response?.text) {
          const parsed = JSON.parse(response.text);
          if (parsed.shots && Array.isArray(parsed.shots)) {
            return res.status(200).json(parsed);
          }
        }
      } catch (geminiError: any) {
        console.warn('Gemini breakdown notice, switching to instant engine:', geminiError?.message);
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
