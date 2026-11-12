import { EdgeTTS } from 'node-edge-tts';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  AppLang,
  cleanTextForSpeech,
  getLangConfig,
  VOICE_PACE_SETTINGS,
  VoicePace,
} from '../src/lib/i18n';

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

function safeTruncateSpeech(text: string, maxLen = 2800): string {
  if (text.length <= maxLen) return text;
  const sliced = text.slice(0, maxLen);
  const lastBreak = Math.max(
    sliced.lastIndexOf('\n'),
    sliced.lastIndexOf('.'),
    sliced.lastIndexOf('।'),
    sliced.lastIndexOf(' ')
  );
  return (lastBreak > maxLen * 0.5 ? sliced.slice(0, lastBreak + 1) : sliced).trim();
}

function resolvePace(rawPace: unknown): VoicePace {
  if (rawPace === 'narrator' || rawPace === 'normal') return 'narrator';
  if (rawPace === 'calm' || rawPace === 'verySlow') return 'calm';
  return 'story';
}

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

function buildLocalConversationalTurns(text: string, lang: AppLang): { role: 'A' | 'B'; text: string }[] {
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

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const rawText = typeof body?.text === 'string' ? body.text.trim() : '';
  const langConfig = getLangConfig(body?.language);
  const paceKey: VoicePace = resolvePace(body?.pace);
  const paceSettings = VOICE_PACE_SETTINGS[paceKey];

  if (!rawText) {
    return res.status(400).json({ error: 'Text is required for TTS.' });
  }

  const preparedText = safeTruncateSpeech(cleanTextForSpeech(rawText, langConfig.code));
  if (!preparedText) {
    return res.status(400).json({ error: 'Speakable text is empty.' });
  }

  try {
    const ai = getGeminiClient();

    // Story Conversation Feel: Transform card notes into lively natural storytelling lines
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

      // Synthesize all conversational turns in parallel with distinct lively male tones
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
      return res.status(200).json({
        audioDataUrl: `data:audio/mpeg;base64,${combined.toString('base64')}`,
        voice: `${langConfig.ttsVoice} (Conversational Story Feel)`,
        pace: paceKey,
      });
    }

    // Expressive Solo Cinema Narrator / Calm Clear
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

    return res.status(200).json({
      audioDataUrl: `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`,
      voice: langConfig.ttsVoice,
      pace: paceKey,
    });
  } catch (error: any) {
    console.error('Error synthesizing expressive story voice:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to synthesize voiceover',
    });
  }
}
