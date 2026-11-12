import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { EdgeTTS } from 'node-edge-tts';
import { getLangConfig } from '../src/lib/i18n';

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
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const langConfig = getLangConfig(body?.language);

  if (!text) {
    return res.status(400).json({ error: 'Text is required for TTS.' });
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
      rate: '0%',
      pitch: '0%',
      timeout: 12000,
    });

    await tts.ttsPromise(text.slice(0, 2000), tempFile);
    const audioBuffer = await fs.readFile(tempFile);
    const base64Audio = audioBuffer.toString('base64');

    return res.status(200).json({
      audioDataUrl: `data:audio/mpeg;base64,${base64Audio}`,
      voice: langConfig.ttsVoice,
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
