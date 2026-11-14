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
  DialogueMode,
  expandShotsToTargetCount,
  generateBreakdownLocal,
  generateStoryAnglesLocal,
  isExplicitlySilent,
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
    const { script, language = 'ml', dialogueMode = 'dynamic' } = req.body || {};
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
    dialogueMode = 'dynamic',
  } = req.body || {};

  if (!script || typeof script !== 'string' || script.trim().length === 0) {
    return res.status(400).json({ error: 'Script or story text is required.' });
  }

  const langConfig = getLangConfig(language);
  const langCode = langConfig.code as AppLang;
  const rawMode: DialogueMode =
    dialogueMode === 'silent' || dialogueMode === 'dialogue' ? dialogueMode : 'dynamic';
  const effectiveMode: DialogueMode = isExplicitlySilent(script) ? 'silent' : rawMode;
  const allowDialogue = effectiveMode !== 'silent';
  const totalRequested = Math.max(1, Number(targetShotCount) || 8);
  const coreAiShotCount = Math.max(4, Math.min(totalRequested, 16));

  // Instant mode only if explicitly requested
  if (fastMode) {
    const instantBreakdown = generateBreakdownLocal(
      script,
      preferredShotDuration,
      characterPhotos,
      targetShotCount,
      langCode,
      effectiveMode
    );
    return res.json(instantBreakdown);
  }

  // Primary Fast AI Path: gemini-4-hydrogen (parallelized up to 16 continuous shots)
  const ai = getGeminiClient();
  if (ai) {
    try {
      const dialogueRule =
        effectiveMode === 'silent'
          ? `STRICT NO-DIALOGUE / VISUAL COMEDY RULE: Set "malayalamDialogue": "" and "dialogueEnglish": "" on EVERY shot. Tell the story & humor 100% visually via expressive faces, slapstick timing, gestures, and ambient SFX.`
          : effectiveMode === 'dialogue'
          ? `DIALOGUE-DRIVEN RULE: Every conversational/dramatic shot MUST feature a completely fresh, non-repeated spoken dialogue line in "malayalamDialogue" (pure ${langConfig.geminiLangName}) and "dialogueEnglish". NEVER repeat or recycle the same dialogue sentence or phrase across shots.`
          : `FLEXIBLE DIALOGUE & VISUAL COMEDY MIX RULE: Dynamically alternate between crisp dialogue-led shots ("malayalamDialogue" in pure ${langConfig.geminiLangName}) and pure silent/visual-comedy shots (leave "malayalamDialogue": "" and "dialogueEnglish": "" on physical gag / silent reaction beats!). STRICTLY ZERO repeated dialogue lines across the entire story.`;

      const arcMapGuide = `8-PART ESCALATING VARIETY ARC (ABSOLUTE ZERO REPETITION):
- Part 1: Clear Introduction & Opening Setup (establishing characters & premise)
- Part 2: First Situational Problem / Funny Misunderstanding
- Part 3: Pure Visual / Physical Twist or Comedic Mishap (distinct situation!)
- Part 4: Escalating Second Problem (neighbor/family/outsider arrives or new hurdle!)
- Part 5: Clever Attempt Backfires (unexpected reversal & messy gag!)
- Part 6: Peak Comedic/Dramatic Climax Chaos (all threads collide!)
- Part 7: Heartwarming or Clever Turning Point (surprise clue/good deed shifts mood!)
- Part 8: Satisfying Conclusion & Memorable Closing Punchline (wraps up Part 1)`;

      const generateRange = async (startNum: number, endNum: number, arcPhase: string) => {
        const count = endNum - startNum + 1;
        const systemInstruction = `Master Cinematographer & Story Comedy/Drama Director: Generate shots ${startNum} to ${endNum} (${count} unique chronological scenes of ${preferredShotDuration}s each) for "${arcPhase}" of the user's story.
${arcMapGuide}

CRITICAL NO-REPETITION & CONTINUITY RULES:
1. ABSOLUTE VARIETY — ZERO REPEATS: Every single shot from ${startNum} to ${endNum} MUST introduce a BRAND-NEW situational problem, twist, prop interaction, or comedic/story beat. NEVER repeat the same problem, same action, or same dialogue across parts!
2. 100% STORY-ANCHORED PROGRESSION: Stay rooted in the exact characters, home/setting, and premise of the user's input while escalating smoothly from Introduction -> Escalating Problems -> Resolution.
3. UNBROKEN VISUAL CONTINUITY: Maintain the EXACT same character face, wardrobe, props, and location continuity seamlessly from Shot ${Math.max(1, startNum - 1)} into Shot ${endNum}. Write this inside "continuity".
4. SEPARATE STATIC PHOTO vs MOTION VIDEO PROMPTS:
   - "imagePrompt": Must start with "[PHOTO KEYFRAME PROMPT — SHOT ${startNum.toString().padStart(2, '0')}]:" (matching each shotNumber) describing ONLY a static 35mm film still (framing, distinct pose/expression, wardrobe/prop continuity, lighting). NO motion verbs or audio!
   - "videoPrompt": Must start with "[VIDEO MOTION PROMPT — SHOT ${startNum.toString().padStart(2, '0')}]:" (matching each shotNumber) describing continuous 24fps camera/subject motion continuing from Shot (N-1), Continuity Lock, Spoken Dialogue (ONLY if this shot has dialogue; otherwise explicitly state Visual Comedy / Ambient SFX Only), and distinct evolving BGM ("bgm").
5. LANGUAGE: Write "action" and "malayalamDialogue" strictly in pure ${langConfig.geminiLangName}. Write "bgm", "continuity", "imagePrompt", and "videoPrompt" clearly in English (keeping quoted ${langConfig.geminiLangName} dialogue exact if present).
6. ${dialogueRule}

Return valid JSON only:
{ "shots": [{ "shotNumber": ${startNum}, "durationSeconds": ${preferredShotDuration}, "timing": "Shot ${startNum.toString().padStart(2, '0')} — ${preferredShotDuration}s", "action": "...", "characters": [], "bgm": "...", "continuity": "...", "malayalamDialogue": "", "dialogueEnglish": "", "imagePrompt": "[PHOTO KEYFRAME PROMPT — SHOT ${startNum.toString().padStart(2, '0')}]: ...", "videoPrompt": "[VIDEO MOTION PROMPT — SHOT ${startNum.toString().padStart(2, '0')}]: ..." }] }`;

        const resRange = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: `Language: ${langConfig.geminiLangName}\nDialogue Mode: ${effectiveMode}\nShot Range: ${startNum} to ${endNum} (Total film shots: ${totalRequested})\nClip Duration: ${preferredShotDuration}s\nStory:\n"""${script.trim()}"""`,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          }),
          24000
        );
        const parsed = JSON.parse(resRange.text || '{}');
        return Array.isArray(parsed.shots) ? parsed.shots : [];
      };

      const ranges: { start: number; end: number; phase: string }[] = [];
      const chunkSize = 4;
      const arcLabels = [
        'Parts 1-4: Clear Introduction, First Problem, Visual Comedy Beat & Outsider Complication',
        'Parts 5-8: Backfired Plan Twist, Peak Climax Chaos, Turning Point & Satisfying Ending (ZERO overlap with Shots 1-4)',
        'Escalation Wave 3: Fresh Sub-Plots & Comedic Turns',
        'Final Resolution Wave: Closing Arc Beats',
      ];
      for (let s = 1, chunkIdx = 0; s <= coreAiShotCount; s += chunkSize, chunkIdx++) {
        const e = Math.min(coreAiShotCount, s + chunkSize - 1);
        ranges.push({
          start: s,
          end: e,
          phase:
            chunkIdx === 0 && e === coreAiShotCount
              ? 'Full 8-Stage Beginning -> Escalating Unique Problems -> Ending Arc'
              : `${arcLabels[chunkIdx % arcLabels.length]} (continuing seamlessly from Shot ${Math.max(1, s - 1)})`,
        });
      }

      const chunkResults = await Promise.all(
        ranges.map((r) => generateRange(r.start, r.end, r.phase))
      );
      const aiShots = chunkResults.flat();

      if (aiShots.length > 0) {
        const expandedShots = expandShotsToTargetCount(
          aiShots,
          totalRequested,
          preferredShotDuration,
          allowDialogue,
          langCode,
          effectiveMode
        );
        return res.json({ shots: expandedShots });
      }
    } catch (geminiError: any) {
      console.warn('Gemini fast breakdown notice, using fallback:', geminiError?.message);
    }
  }

  // Fallback Tier: 8-Part Sequential Story Breakdown Engine
  const fallbackBreakdown = generateBreakdownLocal(
    script,
    preferredShotDuration,
    characterPhotos,
    targetShotCount,
    langCode,
    effectiveMode
  );
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
          const pureScriptRule =
            langConfig.code === 'en'
              ? 'Write naturally in expressive, clear English.'
              : `STRICT NATIVE SCRIPT RULE: Write 100% in pure ${langConfig.geminiLangName} script ONLY. NEVER use any English words, Latin letters, digits, foreign language words (no Tamil in Malayalam, no Manglish), speaker labels (A:/B:), or brackets. Transliterate every loanword into pure native ${langConfig.geminiLangName} script.`;

          const prompt = `Transform this story overview into 4 to 5 short, natural spoken storytelling lines shared warmly between two friends ("A" and "B") in ${langConfig.geminiLangName}.
Make it flow like a real human telling a gripping movie story aloud — warm pauses using commas, expressive curiosity, and smooth rhythm (NOT flat bullet reading).
${pureScriptRule}
Preserve all facts of the story plot. Return valid JSON only:
{ "lines": [{ "role": "A", "text": "..." }, { "role": "B", "text": "..." }] }`;

          const resAi = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: `Language: ${langConfig.geminiLangName}\nStory:\n${preparedText}`,
              config: {
                systemInstruction: prompt,
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            }),
            7500
          );

          const parsed = JSON.parse(resAi.text || '{}');
          if (Array.isArray(parsed.lines)) {
            turns = parsed.lines
              .filter((l: any) => l?.text && typeof l.text === 'string')
              .slice(0, 5)
              .map((l: any, idx: number) => ({
                role: (l.role === 'B' || idx % 2 === 1 ? 'B' : 'A') as 'A' | 'B',
                text: cleanTextForSpeech(l.text, langConfig.code),
              }))
              .filter((l: { role: 'A' | 'B'; text: string }) => l.text.length > 1);
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
            turn.role === 'B' ? '-7%' : '-5%',
            turn.role === 'B' ? '-2Hz' : '+0Hz'
          )
        )
      );

      const combined = Buffer.concat(buffers);
      return res.json({
        audioDataUrl: `data:audio/mpeg;base64,${combined.toString('base64')}`,
        voice: `${langConfig.ttsVoice} (Clear Storytelling Voice)`,
        pace: paceKey,
      });
    }

    let narrationText = preparedText;
    if (ai && paceKey === 'narrator') {
      try {
        const pureScriptRule =
          langConfig.code === 'en'
            ? 'Write clearly in expressive English.'
            : `STRICT NATIVE SCRIPT RULE: Write 100% in pure ${langConfig.geminiLangName} Unicode script ONLY. ZERO English letters, digits, or mixed-language words.`;

        const prompt = `Rewrite this story card neatly into a warm, crystal-clear human cinema storytelling narration in ${langConfig.geminiLangName}.
Use natural punctuation commas and pauses so every syllable lands clearly without rushing. ${pureScriptRule} Max 5 crisp sentences. Return valid JSON: { "narration": "..." }`;

        const resAi = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: `Language: ${langConfig.geminiLangName}\nStory:\n${preparedText}`,
            config: {
              systemInstruction: prompt,
              responseMimeType: 'application/json',
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          }),
          7500
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
