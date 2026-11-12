import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { EdgeTTS } from 'node-edge-tts';
import {
  expandShotsToTargetCount,
  generateBreakdownLocal,
  generateStoryAnglesLocal,
  hasExplicitDialogue,
} from './src/lib/storyEngine';
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
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              { inlineData: { mimeType, data } },
              { text: promptText },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

    // Ultra-fast parallel AI generation using gemini-3.1-flash-lite (MINIMAL thinking)
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
          return res.json({ angles: normalized });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini fast story angles notice, using fallback:', geminiErr?.message);
      }
    }

    // Fallback instant story-matched variations engine (100% anchored to user's premise)
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
  const allowDialogue = hasExplicitDialogue(script);
  const coreAiShotCount = Math.max(4, Math.min(Number(targetShotCount) || 8, 8));

  // Instant mode only if explicitly requested
  if (fastMode) {
    const instantBreakdown = generateBreakdownLocal(script, preferredShotDuration, characterPhotos, targetShotCount, langCode);
    return res.json(instantBreakdown);
  }

  // Primary Fast AI Path: gemini-3.1-flash-lite (MINIMAL thinking)
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
          return res.json({ shots: expandedShots });
        }
      }
    } catch (geminiError: any) {
      console.warn('Gemini fast breakdown notice, using fallback:', geminiError?.message);
    }
  }

  // Fallback Tier: Story-matched Sequential Breakdown Engine (No hardcoded tea-shop presets)
  const fallbackBreakdown = generateBreakdownLocal(script, preferredShotDuration, characterPhotos, targetShotCount, langCode);
  return res.json(fallbackBreakdown);
});

async function synthesizeEdgeBuffer(
  text: string,
  voice: string,
  lang: string,
  rate: string,
  pitch: string
): Promise<Buffer> {
  const tts = new EdgeTTS({
    voice,
    lang,
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
    rate,
    pitch,
    timeout: 20000,
  });

  const chunks: Buffer[] = [];
  for await (const chunk of tts.streamAudio(text)) {
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    }
  }
  return Buffer.concat(chunks);
}

function buildLocalConversationalTurns(
  text: string,
  lang: AppLang
): { role: 'A' | 'B'; text: string }[] {
  const sentences = text
    .split(/(?<=[.।!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  if (sentences.length <= 1) {
    return [{ role: 'A', text }];
  }

  const reactionByLang: Record<AppLang, string> = {
    ml: 'ശരിക്കും? എന്നിട്ട് എന്താണ് സംഭവിച്ചത്?',
    en: 'Wait, really? What happens next in the story?',
    hi: 'सच में? फिर आगे क्या होता है?',
    ta: 'நிஜமாகவா? அப்புறம் என்ன நடந்தது?',
    kn: 'ನಿಜವಾಗಿಯೂ? ಆಮೇಲೆ ಏನಾಯಿತು?',
    te: 'నిజంగానా? ఆ తర్వాత ఏమైంది?',
  };

  const leadLines = sentences.slice(0, Math.ceil(sentences.length / 2)).join(' ');
  const tailLines = sentences.slice(Math.ceil(sentences.length / 2)).join(' ');

  return [
    { role: 'A', text: leadLines },
    { role: 'B', text: `${reactionByLang[lang] || reactionByLang.ml} ${tailLines}` },
  ];
}

// 3. Expressive Conversational Storytelling Voiceover (/api/tts)
app.post('/api/tts', async (req: Request, res: Response) => {
  const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!rawText) {
    return res.status(400).json({ error: 'Text is required for TTS.' });
  }

  const langConfig = getLangConfig(req.body?.language);
  const rawPace = req.body?.pace;
  const paceKey: VoicePace =
    rawPace === 'narrator' || rawPace === 'normal'
      ? 'narrator'
      : rawPace === 'calm' || rawPace === 'verySlow'
      ? 'calm'
      : 'story';
  const paceSettings = VOICE_PACE_SETTINGS[paceKey];

  const cleaned = cleanTextForSpeech(rawText, langConfig.code);
  const maxLen = 2800;
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

  try {
    const ai = getGeminiClient();

    if (paceKey === 'story') {
      let turns: { role: 'A' | 'B'; text: string }[] = [];

      if (ai) {
        try {
          const prompt = `Rewrite this story summary into 4 to 6 short, vibrant conversational lines between two male friends ("A" and "B") passionately sharing this story with real emotion and feeling strictly in ${langConfig.geminiLangName}.
Make it sound natural, expressive, curious, and exciting — like people talking face-to-face telling a gripping cinema story (no robotic bullet headers, no stage directions).
Preserve 100% of the actual story plot. Return valid JSON only:
{ "lines": [{ "role": "A", "text": "..." }, { "role": "B", "text": "..." }] }`;

          const resAi = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents: `Language: ${langConfig.geminiLangName}\nStory:\n${preparedText}`,
              config: {
                systemInstruction: prompt,
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
              },
            }),
            5000
          );

          const parsed = JSON.parse(resAi.text || '{}');
          if (Array.isArray(parsed.lines)) {
            turns = parsed.lines
              .filter((l: any) => l?.text && typeof l.text === 'string')
              .slice(0, 6)
              .map((l: any, idx: number) => ({
                role: (l.role === 'B' || idx % 2 === 1 ? 'B' : 'A') as 'A' | 'B',
                text: cleanTextForSpeech(l.text, langConfig.code),
              }))
              .filter((l: { role: 'A' | 'B'; text: string }) => l.text.length > 0);
          }
        } catch {
          turns = [];
        }
      }

      if (turns.length < 2) {
        turns = buildLocalConversationalTurns(preparedText, langConfig.code);
      }

      const buffers = await Promise.all(
        turns.map((turn) =>
          synthesizeEdgeBuffer(
            turn.text,
            langConfig.ttsVoice,
            langConfig.ttsLang,
            turn.role === 'B' ? '+6%' : '+2%',
            turn.role === 'B' ? '+6Hz' : '-2Hz'
          )
        )
      );

      const combined = Buffer.concat(buffers);
      return res.json({
        audioDataUrl: `data:audio/mpeg;base64,${combined.toString('base64')}`,
        voice: `${langConfig.ttsVoice} (Conversational Story Feel)`,
        pace: paceKey,
      });
    }

    let narrationText = preparedText;
    if (ai && paceKey === 'narrator') {
      try {
        const prompt = `Rewrite this story card neatly into a captivating, natural, emotional spoken storytelling narration in ${langConfig.geminiLangName}.
Make it flow like a passionate human cinema storyteller speaking warmly and vividly — remove stiff labels, keep all story facts intact, max 5 natural sentences. Return valid JSON: { "narration": "..." }`;

        const resAi = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: `Language: ${langConfig.geminiLangName}\nStory:\n${preparedText}`,
            config: {
              systemInstruction: prompt,
              responseMimeType: 'application/json',
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            },
          }),
          5000
        );

        const parsed = JSON.parse(resAi.text || '{}');
        if (parsed?.narration && typeof parsed.narration === 'string') {
          const cleaned = cleanTextForSpeech(parsed.narration, langConfig.code);
          if (cleaned) narrationText = cleaned;
        }
      } catch {
        narrationText = preparedText;
      }
    }

    const audioBuffer = await synthesizeEdgeBuffer(
      narrationText,
      langConfig.ttsVoice,
      langConfig.ttsLang,
      paceSettings.edgeRate,
      paceSettings.edgePitch
    );

    return res.json({
      audioDataUrl: `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`,
      voice: langConfig.ttsVoice,
      pace: paceKey,
    });
  } catch (error: any) {
    console.error('Error synthesizing expressive story voice:', error);
    return res.status(500).json({ error: error?.message || 'Failed to synthesize voiceover' });
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
