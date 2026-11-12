import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { EdgeTTS } from 'node-edge-tts';
import { generateStoryAnglesLocal, generateBreakdownLocal } from './src/lib/storyEngine';
import {
  AppLang,
  cleanTextForSpeech,
  getLangConfig,
  VOICE_PACE_SETTINGS,
  VoicePace,
} from './src/lib/i18n';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS headers for cross-origin production deployments (e.g. Vercel frontend -> external backend)
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Lazy Gemini client factory (avoids crashes when GEMINI_API_KEY is unset in fallback mode)
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

    const ai = getGeminiClient();
    if (ai) {
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

// Route to generate story angle options
app.post('/api/generate-story-angles', async (req: Request, res: Response) => {
  try {
    const { script, language = 'ml' } = req.body || {};
    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return res.status(400).json({ error: 'Story script concept is required.' });
    }

    const langConfig = getLangConfig(language);
    const langCode = langConfig.code as AppLang;

    // Try AI generation for custom story angles if Gemini is present
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

        const response = await withTimeout(geminiPromise, 3500);
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

    // Fallback instant 70 story angles engine (<5ms response)
    const angles = generateStoryAnglesLocal(script, langCode);
    return res.json({ angles });
  } catch (error: any) {
    console.error('Error generating story angles:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate story angles' });
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
    language = 'ml',
  } = req.body || {};

  if (!script || typeof script !== 'string' || script.trim().length === 0) {
    return res.status(400).json({ error: 'Script or story text is required.' });
  }

  const langConfig = getLangConfig(language);
  const langCode = langConfig.code as AppLang;

  // Instant mode: sub-second generation (<5ms)
  if (fastMode) {
    const instantBreakdown = generateBreakdownLocal(script, preferredShotDuration, characterPhotos, targetShotCount, langCode);
    return res.json(instantBreakdown);
  }

  // Fast-path 1: If Groq API key is present, use it with 1.8s timeout
  if (process.env.GROQ_API_KEY) {
    try {
      const groqPromise = callGroqApi(
        `Script: """${script}"""\nDuration: ${preferredShotDuration}s per shot. Language: ${langConfig.geminiLangName}.`,
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

  // Fast-path 2: Gemini with strict 2.5s timeout
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

      const response = await withTimeout(geminiPromise, 2500);
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
  const fallbackBreakdown = generateBreakdownLocal(script, preferredShotDuration, characterPhotos, targetShotCount, langCode);
  return res.json(fallbackBreakdown);
});

// 3. Generate High-Quality Male Voiceover via Edge Neural TTS (Slow, Paused & Multi-language)
app.post('/api/tts', async (req: Request, res: Response) => {
  const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!rawText) {
    return res.status(400).json({ error: 'Text is required for TTS.' });
  }

  const langConfig = getLangConfig(req.body?.language);
  const paceKey: VoicePace =
    req.body?.pace === 'verySlow' || req.body?.pace === 'normal' ? req.body.pace : 'slow';
  const paceSettings = VOICE_PACE_SETTINGS[paceKey];

  const cleaned = cleanTextForSpeech(rawText, langConfig.code);
  const maxLen = 3000;
  let preparedText = cleaned;
  if (cleaned.length > maxLen) {
    const sliced = cleaned.slice(0, maxLen);
    const lastBreak = Math.max(
      sliced.lastIndexOf('\n'),
      sliced.lastIndexOf('.'),
      sliced.lastIndexOf('।'),
      sliced.lastIndexOf(' ')
    );
    preparedText = (lastBreak > maxLen * 0.5 ? sliced.slice(0, lastBreak + 1) : sliced).trim();
  }

  if (!preparedText) {
    return res.status(400).json({ error: 'Speakable text is empty.' });
  }

  const tempFile = path.join(
    os.tmpdir(),
    `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`
  );

  try {
    const tts = new EdgeTTS({
      voice: langConfig.ttsVoice,
      lang: langConfig.ttsLang,
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      rate: paceSettings.edgeRate,
      pitch: paceSettings.edgePitch,
      timeout: 25000,
    });

    await tts.ttsPromise(preparedText, tempFile);
    const audioBuffer = await fs.readFile(tempFile);
    const base64Audio = audioBuffer.toString('base64');

    return res.json({
      audioDataUrl: `data:audio/mpeg;base64,${base64Audio}`,
      voice: langConfig.ttsVoice,
      pace: paceKey,
    });
  } catch (error: any) {
    console.error('Error synthesizing male voice:', error);
    return res.status(500).json({ error: error?.message || 'Failed to synthesize voiceover' });
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
});

// 4. Generate Situation AI Scene Image for Shot
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
