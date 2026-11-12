import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { EdgeTTS } from 'node-edge-tts';
import {
  cleanTextForSpeech,
  getLangConfig,
  VOICE_PACE_SETTINGS,
  VoicePace,
} from '../src/lib/i18n';

function safeTruncateSpeech(text: string, maxLen = 3000): string {
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
  const paceKey: VoicePace =
    body?.pace === 'verySlow' || body?.pace === 'normal' ? body.pace : 'slow';
  const paceSettings = VOICE_PACE_SETTINGS[paceKey];

  if (!rawText) {
    return res.status(400).json({ error: 'Text is required for TTS.' });
  }

  const preparedText = safeTruncateSpeech(cleanTextForSpeech(rawText, langConfig.code));
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

    return res.status(200).json({
      audioDataUrl: `data:audio/mpeg;base64,${base64Audio}`,
      voice: langConfig.ttsVoice,
      pace: paceKey,
    });
  } catch (error: any) {
    console.error('Error synthesizing male voice:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to synthesize voiceover',
    });
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
}
