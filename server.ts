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
  inferCategoryFromScript,
  isExplicitlySilent,
  mapGroupToGenreKey,
  mergeAnglesEnsuringAllCategories,
} from './src/lib/storyEngine';
import {
  STORY_CATEGORIES,
  getCategoryById,
  getCategoryGroup,
  type StoryCategory,
} from './src/lib/storyCategories';
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

// Strict Non-Adult / Family-Safe (SFW) keyword & domain filter for ad creatives
const ADULT_NSFW_REGEX =
  /\b(porn|porno|pornography|xxx|nsfw|adult|erotic|erotica|hentai|nude|nudity|naked|sex|sexy|horny|milf|boob|boobs|tits|titty|pussy|cock|dick|fuck|fucking|babe|babes|camgirl|camgirls|livecam|webcam|stripchat|chaturbate|bongacams|livejasmin|myfreecams|camsoda|flirt4free|onlyfans|fansly|xvideos|xhamster|pornhub|redtube|youporn|xnxx|spankbang|brazzers|bangbros|realitykings|fetish|bdsm|escort|escorts|hookup|hookups|sexdating|adultdating|jerkmate|adultfriendfinder|ashleymadison|benaughty|nutaku|fakku|exoclick|trafficjunky|juicyads|plugrush|18\+|18plus|plus18|hot-singles|local-girls|meet-girls|sugar-daddy|lingerie|hardcore|softcore|playboy|penthouse|hustler|ecchi|viagra|cialis|penis|iab25|iab25-[1-7]|rta-5042)\b/i;

function isFamilySafeAdContent(...values: Array<string | undefined | null>): boolean {
  const combined = values.filter(Boolean).join(' ');
  if (!combined) return true;
  return !ADULT_NSFW_REGEX.test(combined);
}

function stripXmlTags(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function extractSafeVastData(
  xml: string,
  reqHeaders: Record<string, string | string[] | undefined>,
  depth = 0
): Promise<{
  safeVideoUrls: string[];
  safeClickThrough: string;
  safeImpressions: string[];
  blockedAdultCount: number;
}> {
  const adBlocks = [...xml.matchAll(/<Ad\b[^>]*>[\s\S]*?<\/Ad>/gi)].map((m) => m[0]);
  const blocksToInspect = adBlocks.length > 0 ? adBlocks : [xml];

  const safeVideoUrls: string[] = [];
  const seenCreativePrefixes = new Set<string>();
  let safeClickThrough = '';
  const safeImpressions: string[] = [];
  let blockedAdultCount = 0;
  const wrapperUrls: string[] = [];

  for (const block of blocksToInspect) {
    const adTextMetadata = stripXmlTags(block);
    const mediaMatches = [
      ...block.matchAll(/<MediaFile([^>]*)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/MediaFile>/gi),
    ]
      .map((m) => ({ attrs: m[1] || '', url: (m[2] || '').trim() }))
      .filter(({ attrs, url }) => {
        if (!url || !/^https?:\/\//i.test(url)) return false;
        const lower = url.toLowerCase();
        const isVideoUrl = lower.includes('.mp4') || lower.includes('.webm') || /type=["']video\//i.test(attrs);
        return isVideoUrl;
      })
      .map((item) => item.url);

    const blockClickThrough =
      block
        .match(/<ClickThrough[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ClickThrough>/i)?.[1]
        ?.trim() || '';

    const blockImpressions = [
      ...block.matchAll(/<Impression[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/Impression>/gi),
    ]
      .map((m) => m[1]?.trim())
      .filter((u): u is string => Boolean(u));

    const blockWrapperUrl =
      block
        .match(/<VASTAdTagURI[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/VASTAdTagURI>/i)?.[1]
        ?.trim() || '';

    // Strict SFW Gate: reject the entire Ad block if any metadata, URL, or tag contains adult/NSFW signals
    if (
      !isFamilySafeAdContent(
        adTextMetadata,
        blockClickThrough,
        blockWrapperUrl,
        ...mediaMatches,
        ...blockImpressions
      )
    ) {
      blockedAdultCount += 1;
      continue;
    }

    // Prefer one clean MP4 resolution (480p or default) per creative ID to avoid playing identical repeats
    const preferredMedia =
      mediaMatches.find((u) => u.includes('480.mp4')) ||
      mediaMatches.find((u) => u.includes('.mp4') && !u.includes('360.mp4')) ||
      mediaMatches[0];

    if (preferredMedia) {
      const creativeKey = preferredMedia.replace(/(480|360|720)?\.(mp4|webm)$/i, '');
      if (!seenCreativePrefixes.has(creativeKey)) {
        seenCreativePrefixes.add(creativeKey);
        safeVideoUrls.push(preferredMedia);
      }
      if (!safeClickThrough && blockClickThrough) {
        safeClickThrough = blockClickThrough;
      }
      safeImpressions.push(...blockImpressions);
    } else if (blockWrapperUrl && /^https?:\/\//i.test(blockWrapperUrl)) {
      wrapperUrls.push(blockWrapperUrl);
    }
  }

  // Follow up to 1 VAST Wrapper level if direct MediaFiles were empty
  if (safeVideoUrls.length === 0 && depth < 1 && wrapperUrls.length > 0) {
    try {
      const forwardedFor = reqHeaders['x-forwarded-for'];
      const acceptLang = reqHeaders['accept-language'];
      const wrapRes = await fetch(wrapperUrls[0], {
        signal: AbortSignal.timeout(4000),
        headers: {
          'User-Agent':
            (reqHeaders['user-agent'] as string) ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...(forwardedFor ? { 'X-Forwarded-For': String(forwardedFor) } : {}),
          ...(acceptLang ? { 'Accept-Language': String(acceptLang) } : {}),
          Referer: 'https://cineai.vercel.app/',
        },
      });
      if (wrapRes.ok) {
        const wrapXml = await wrapRes.text();
        const nested = await extractSafeVastData(wrapXml, reqHeaders, depth + 1);
        blockedAdultCount += nested.blockedAdultCount;
        safeVideoUrls.push(...nested.safeVideoUrls);
        if (!safeClickThrough && nested.safeClickThrough) safeClickThrough = nested.safeClickThrough;
        safeImpressions.push(...nested.safeImpressions);
      }
    } catch {
      // Ignore transient wrapper errors
    }
  }

  return { safeVideoUrls, safeClickThrough, safeImpressions, blockedAdultCount };
}

// Endpoint to fetch real HilltopAds VAST video ad data with strict Non-Adult (SFW) filtering
app.get('/api/vast-ad', async (req: Request, res: Response) => {
  const vastFeedUrl =
    'https://subtle-injury.com/d/mLF.zQdgGfNEvDZGGhUU/Gemme9/uFZjUolTkaPSTzcV2YMBjcYO0/MADJE/t/NFzvYRyGNqjuQAwYN-QR';

  let blockedAdultCount = 0;

  try {
    const forwardedFor = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    const acceptLang = req.headers['accept-language'];
    const upstreamRes = await fetch(vastFeedUrl, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent':
          (req.headers['user-agent'] as string) ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(forwardedFor ? { 'X-Forwarded-For': String(forwardedFor) } : {}),
        ...(acceptLang ? { 'Accept-Language': String(acceptLang) } : {}),
        Referer: 'https://cineai.vercel.app/',
      },
    });

    if (upstreamRes.ok) {
      const xml = await upstreamRes.text();
      const extracted = await extractSafeVastData(xml, req.headers, 0);
      blockedAdultCount = extracted.blockedAdultCount;

      if (extracted.safeVideoUrls.length > 0) {
        return res.json({
          success: true,
          sfwOnly: true,
          blockedAdultCount,
          videoUrl: extracted.safeVideoUrls[0],
          allVideoUrls: extracted.safeVideoUrls,
          clickThrough: extracted.safeClickThrough || vastFeedUrl,
          impressions: extracted.safeImpressions,
        });
      }
    }
  } catch (err: any) {
    console.warn('VAST upstream fetch error (strict SFW mode):', err?.message);
  }

  // Never fall back to unverified hardcoded MP4 URLs when live SFW validation fails or blocks adult creatives
  return res.json({
    success: true,
    sfwOnly: true,
    blockedAdultCount,
    videoUrl: '',
    allVideoUrls: [],
    clickThrough: '',
    impressions: [],
  });
});

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

// Route to generate story angle options across 350+ categories
app.post('/api/generate-story-angles', async (req: Request, res: Response) => {
  try {
    const {
      script,
      language = 'ml',
      dialogueMode = 'dialogue',
      targetShotCount = 8,
      durationDisplay = '',
      categoryId = 'all',
      fastMode = false,
    } = req.body || {};

    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return res.status(400).json({ error: 'Story script concept is required.' });
    }

    const langConfig = getLangConfig(language);
    const langCode = langConfig.code as AppLang;
    const clipCount = Math.max(1, Number(targetShotCount) || 8);
    const rawMode: DialogueMode =
      dialogueMode === 'silent' || dialogueMode === 'dialogue' ? dialogueMode : 'dynamic';
    const effectiveMode: DialogueMode = isExplicitlySilent(script) ? 'silent' : rawMode;
    const selectedCategory =
      categoryId && categoryId !== 'all' ? getCategoryById(categoryId) : undefined;

    if (fastMode) {
      const angles = generateStoryAnglesLocal(
        script,
        langCode,
        clipCount,
        selectedCategory?.id || 'all',
        effectiveMode
      );
      return res.json({ angles });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
      });
    }

    const modeNote =
      effectiveMode === 'silent'
        ? 'Format every variation for PURE VISUAL / WORDLESS STORYTELLING (zero spoken dialogue anywhere — express plot, emotion, and tension purely through eyes, action, lighting, props, and ambient SFX).'
        : effectiveMode === 'dialogue'
        ? 'Even though the user may have provided only a brief situation with NO dialogues, automatically craft natural, character-specific spoken dialogue moments tailored strictly to the category and characters with zero repeated lines.'
        : 'Dynamically blend crisp character-driven spoken dialogue beats with expressive silent visual-reaction moments.';

    const nativeOnlyRule =
      langCode === 'en'
        ? 'Write genre, title, mood, bgm, continuity, characters, and storySummary clearly in natural English.'
        : `100% PURE ${langConfig.geminiLangName} ONLY: Write genre, title, mood, bgm, continuity, characters, and storySummary strictly in pure ${langConfig.geminiLangName} Unicode script. ZERO English letters in narrative/dialogue text.`;

    const normalizeAiAngle = (a: any, idx: number, cat: StoryCategory) => {
      const grp = getCategoryGroup(cat.groupId);
      const summary = a.storySummary || a.synopsis || script.trim();
      const chars = a.characters || '';
      const bgm = a.bgm || `${cat.bgmVibe} (${cat.pacing})`;
      const continuity = a.continuity || `${cat.visualStyle}; ${cat.settingCue}`;
      return {
        ...a,
        id: `angle-${idx + 1}`,
        catKey: mapGroupToGenreKey(cat.groupId),
        categoryId: cat.id,
        categoryName: cat.name,
        categoryGroup: cat.groupId,
        visualStyle: cat.visualStyle,
        cameraFocus: cat.cameraFocus,
        genre: a.genre || `${grp.labels[langCode] || grp.labels.en} · ${cat.name}`,
        synopsis: a.synopsis || a.mood || cat.tone,
        bgm,
        continuity,
        scriptText:
          a.scriptText ||
          `${summary}\n\n[CATEGORY_ID: ${cat.id}]\n[CHARACTERS: ${chars}]\n[BGM STYLE: ${bgm}]\n[CONTINUITY: ${continuity}]`,
      };
    };

    const callGeminiWithRetry = async (contents: string, systemInstruction: string, timeoutMs = 18000) => {
      let lastErr: any;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            }),
            timeoutMs
          );
          const parsed = JSON.parse(response.text || '{}');
          if (Array.isArray(parsed.angles) && parsed.angles.length > 0) {
            return parsed.angles;
          }
          lastErr = new Error('Empty story angles array returned by Gemini.');
        } catch (err: any) {
          lastErr = err;
        }
      }
      throw lastErr;
    };

    if (selectedCategory) {
      const grp = getCategoryGroup(selectedCategory.groupId);
      const twistsA = [
        'Intimate Face-to-Face Focus (eyes, proximity, micro-expressions)',
        'Atmospheric Visual Poetry (lighting, rain/shadow textures, silence)',
        'Unexpected Plot Twist (sudden reveal flipping character dynamic)',
        'Escalating Pace & Stakes (tight reactions, heightened tension)',
      ];
      const twistsB = [
        'Heart-First Emotional Resonance (vulnerability & honesty)',
        'Suspenseful Hidden-Motive Subtext (glances concealing secrets)',
        'Playful Spontaneous Chemistry (witty timing & warmth)',
        'Grand Signature Finale (sweeping closing frame & payoff)',
      ];

      const runFocusedBatch = async (twists: string[], batchOffset: number) => {
        const systemInstruction = `Master Film Screenwriter: Generate ${twists.length} COMPLETELY DISTINCT cinematic screenplay variations of the user's situation, ALL strictly tailored to this exact film category:
CATEGORY PROFILE:
- Category: ${selectedCategory.name} (Group: ${grp.labels.en})
- Tone: ${selectedCategory.tone}
- Visual Look & Lighting: ${selectedCategory.visualStyle}
- Camera Direction: ${selectedCategory.cameraFocus}
- Pacing: ${selectedCategory.pacing}
- Dialogue Style: ${selectedCategory.dialogueStyle}
- Setting & Atmosphere: ${selectedCategory.settingCue}
- BGM / Sound Vibe: ${selectedCategory.bgmVibe}

DIRECTORIAL ANGLES TO COVER (1 distinct story per item, in order):
${twists.map((tw, i) => `${i + 1}. ${tw}`).join('\n')}

RULES:
1. Even if the user entered only a short situation without dialogues, expand each variation into a rich visual + dramatic/situational mini-arc fitted for ${clipCount} clip(s) (${durationDisplay || `${clipCount} shots`}) without repeating the prompt verbatim across sentences.
2. ${modeNote}
3. ${nativeOnlyRule}
4. Each variation must have unique character names, blocking, lighting details, and plot progression matching "${selectedCategory.name}".

Return JSON only:
{ "angles": [{ "genre": "...", "title": "...", "mood": "...", "bgm": "...", "continuity": "...", "characters": "...", "storySummary": "..." }] }`;

        const rawAngles = await callGeminiWithRetry(
          `Language: ${langConfig.geminiLangName}\nCategory: ${selectedCategory.name}\nDialogue Mode: ${effectiveMode}\nTarget Length: ${durationDisplay || `${clipCount} clips`} (${clipCount} clips)\nSituation Seed: "${script.trim()}"`,
          systemInstruction
        );
        return rawAngles.map((a: any, idx: number) => normalizeAiAngle(a, batchOffset + idx, selectedCategory));
      };

      try {
        const [batchA, batchB] = await Promise.all([
          runFocusedBatch(twistsA, 0),
          runFocusedBatch(twistsB, 4),
        ]);
        const merged = [...batchA, ...batchB];
        return res.json({ angles: merged });
      } catch (geminiErr: any) {
        console.error('Gemini focused story angles failed:', geminiErr?.message);
        return res.status(502).json({
          error: geminiErr?.message || 'Failed to generate category story variations from Gemini.',
        });
      }
    }

    // Explore across multiple diverse categories from the 366-category library
    const exploreCategories: StoryCategory[] = [
      getCategoryById('rom-first-eye-contact'),
      getCategoryById('thr-interrogation-room'),
      getCategoryById('act-alley-ambush'),
      getCategoryById('com-awkward-first-date'),
      getCategoryById('dra-unspoken-father-son'),
      getCategoryById('emo-mother-airport-tiffin'),
      getCategoryById('hor-attic-footsteps'),
      getCategoryById('sci-time-loop-cafe'),
      getCategoryById('mys-locked-room-manor'),
      getCategoryById('cri-diamond-vault-blueprint'),
      getCategoryById('fam-sunday-lunch-reunion'),
      getCategoryById('fan-enchanted-sword-shrine'),
      getCategoryById('yth-college-canteen-banter'),
      getCategoryById('comml-smart-tech-morning-save'),
    ].filter((c): c is StoryCategory => Boolean(c));

    const runExploreBatch = async (cats: StoryCategory[], batchOffset: number) => {
      const catDescriptors = cats.map((c) => {
        const g = getCategoryGroup(c.groupId);
        return `- categoryId "${c.id}": ${c.name} (${g.labels.en}) | Tone: ${c.tone} | Visual: ${c.visualStyle} | Camera: ${c.cameraFocus} | Dialogue: ${c.dialogueStyle}`;
      });

      const systemInstruction = `Master Film Screenwriter: Adapt the user's situation into ${cats.length} COMPLETELY DIFFERENT cinematic genres & scenes (1 per specified category below):
${catDescriptors.join('\n')}

CRITICAL RULES:
1. Keep the user's core premise/characters recognizable, but transform the plot, setting cues, visual mood, lighting, camera style, and conflict to authentically embody each category! (e.g., Romance must feel tender & intimate; Horror genuinely eerie; Action kinetic; Thriller tense; Comedy witty; Sci-Fi speculative).
2. ${modeNote}
3. ${nativeOnlyRule}
4. Preserve "categoryId" as the exact string listed above.

Return JSON only:
{ "angles": [{ "categoryId": "${cats[0].id}", "genre": "...", "title": "...", "mood": "...", "bgm": "...", "continuity": "...", "characters": "...", "storySummary": "..." }] }`;

      const rawAngles = await callGeminiWithRetry(
        `Language: ${langConfig.geminiLangName}\nDialogue Mode: ${effectiveMode}\nTarget Length: ${durationDisplay || `${clipCount} clips`} (${clipCount} clips)\nUser Situation: "${script.trim()}"`,
        systemInstruction,
        20000
      );

      return rawAngles.map((a: any, idx: number) => {
        const matchedCat =
          (a.categoryId ? getCategoryById(String(a.categoryId)) : undefined) ||
          cats[idx % cats.length] ||
          STORY_CATEGORIES[0];
        return normalizeAiAngle(a, batchOffset + idx, matchedCat);
      });
    };

    try {
      const settled = await Promise.allSettled([
        runExploreBatch(exploreCategories.slice(0, 4), 0),
        runExploreBatch(exploreCategories.slice(4, 8), 4),
        runExploreBatch(exploreCategories.slice(8, 11), 8),
        runExploreBatch(exploreCategories.slice(11, 14), 11),
      ]);

      const combined = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
      if (combined.length > 0) {
        const localReference = generateStoryAnglesLocal(script, langCode, clipCount, 'all', effectiveMode);
        return res.json({ angles: mergeAnglesEnsuringAllCategories(combined, localReference) });
      }
      const firstErr = settled.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
      return res.status(502).json({
        error: firstErr?.reason?.message || 'Gemini failed to generate multi-category story options.',
      });
    } catch (geminiErr: any) {
      console.error('Gemini explore story angles failed:', geminiErr?.message);
      return res.status(502).json({
        error: geminiErr?.message || 'Failed to generate story angles from Gemini.',
      });
    }
  } catch (error: any) {
    console.error('Error generating story angles:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate story angles' });
  }
});

// Helper to race promise against a strict timeout for lightning-fast responses
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

// 2. Generate Cinematic Shot Breakdown from Script
app.post('/api/generate-breakdown', async (req: Request, res: Response) => {
  const {
    script,
    preferredShotDuration = 8,
    targetShotCount = 1,
    characterPhotos = [],
    fastMode = false,
    language = 'ml',
    dialogueMode = 'dialogue',
    categoryId = 'all',
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
  const clipDurationSec = Math.max(2, Number(preferredShotDuration) || 8);
  const totalRequested = Math.max(1, Number(targetShotCount) || 1);
  const coreAiShotCount = Math.min(totalRequested, 16);

  const resolvedCategory: StoryCategory =
    (categoryId && categoryId !== 'all' ? getCategoryById(categoryId) : undefined) ||
    inferCategoryFromScript(script);
  const resolvedGroup = getCategoryGroup(resolvedCategory.groupId);

  if (fastMode) {
    const instantBreakdown = generateBreakdownLocal(
      script,
      clipDurationSec,
      characterPhotos,
      totalRequested,
      langCode,
      effectiveMode,
      resolvedCategory.id
    );
    return res.json(instantBreakdown);
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'Gemini API key is not configured on the server.',
    });
  }

  try {
    const dialogueRule =
      effectiveMode === 'silent'
        ? `STRICT NO-DIALOGUE / PURE VISUAL SCRIPT RULE: Dialogue is OFF. Set "malayalamDialogue": "" and "dialogueEnglish": "" on EVERY shot. NEVER invent spoken lines. Tell the entire story 100% visually via framing, micro-expressions, blocking, lighting, and natural ambient SFX/foley.`
        : effectiveMode === 'dialogue'
        ? `AUTOMATIC DIALOGUE SYNTHESIS RULE: Dialogue is ON. Even if the user entered only a short situation WITHOUT any dialogues, automatically write natural, emotionally grounded spoken dialogue in "malayalamDialogue" (strictly pure ${langConfig.geminiLangName}) and "dialogueEnglish" tailored to "${resolvedCategory.name}" (${resolvedCategory.dialogueStyle}). Pace dialogue concisely to fit naturally inside ${clipDurationSec} seconds, with ZERO repeated lines across shots.`
        : `SMART MIX DIALOGUE & VISUAL BEATS RULE: Alternate between crisp category-specific spoken dialogue ("malayalamDialogue" in pure ${langConfig.geminiLangName}) and pure silent reaction/action beats (set "malayalamDialogue": "" and "dialogueEnglish": "" on silent beats). ZERO repeated lines.`;

    const singleClipRule =
      totalRequested === 1
        ? `SINGLE ${clipDurationSec}s CLIP STRUCTURE: Since the total duration is ${clipDurationSec} seconds (1 rich scene clip), divide Shot 01 internally into 3 tightly timed visual beats inside "action" (e.g., 0:00–0:${Math.max(2, Math.floor(clipDurationSec * 0.35))
            .toString()
            .padStart(2, '0')} Opening Hook -> middle turning beat -> closing frame) so even a short ${clipDurationSec}s scene feels complete and cinematic.`
        : `MULTI-SHOT ESCALATING ARC: Each chronological shot must advance the situation cleanly without repeating actions or dialogues.`;

    const categoryProfileBlock = `CATEGORY DIRECTION PROFILE:
- Category: ${resolvedCategory.name} (${resolvedGroup.labels.en})
- Emotional Tone: ${resolvedCategory.tone}
- Visual & Lighting Style: ${resolvedCategory.visualStyle}
- Camera Direction: ${resolvedCategory.cameraFocus}
- Pacing: ${resolvedCategory.pacing}
- Dialogue Style: ${resolvedCategory.dialogueStyle}
- Setting Cues: ${resolvedCategory.settingCue}
- BGM / Soundscape: ${resolvedCategory.bgmVibe}`;

    const generateRange = async (startNum: number, endNum: number, arcPhase: string) => {
      const count = endNum - startNum + 1;
      const systemInstruction = `Master Film Director, Cinematographer & Screenwriter:
Expand the user's situation into ${count} rich scene-by-scene shot breakdown(s) (Shot ${startNum} to ${endNum}, each ${clipDurationSec}s long) for phase "${arcPhase}".

${categoryProfileBlock}

${singleClipRule}

CRITICAL RULES:
1. CATEGORY FIDELITY: Every visual choice, camera angle, lighting cue, pacing note, and dialogue line MUST unmistakably reflect "${resolvedCategory.name}" (${resolvedCategory.tone}).
2. CONTINUITY LOCK: Keep character faces, outfits, props, and location continuity cohesive across every shot in "continuity".
3. STRUCTURED FIELDS PER SHOT:
   - "cameraAngle": Exact lens/framing/movement cue (e.g., "85mm intimate eye-level push-in").
   - "lightingCue": Lighting, color palette & atmosphere matching ${resolvedCategory.visualStyle}.
   - "action": Scene action description in pure ${langConfig.geminiLangName}.
   - "imagePrompt": Must start with "[PHOTO KEYFRAME PROMPT — SHOT ${startNum.toString().padStart(2, '0')}]:" (matching each shotNumber) describing a static 35mm still frame.
   - "videoPrompt": Must start with "[VIDEO MOTION PROMPT — SHOT ${startNum.toString().padStart(2, '0')}]:" (matching each shotNumber) describing 24fps motion, camera work, spoken dialogue ONLY if non-empty (or explicit Pure Visual / Ambient SFX if silent), and BGM.
4. LANGUAGE: Write "action" and "malayalamDialogue" strictly in pure ${langConfig.geminiLangName}. Write "cameraAngle", "lightingCue", "bgm", "continuity", "imagePrompt", and "videoPrompt" in clear English.
5. ${dialogueRule}

Return valid JSON only:
{ "shots": [{ "shotNumber": ${startNum}, "durationSeconds": ${clipDurationSec}, "timing": "Shot ${startNum.toString().padStart(2, '0')} — ${clipDurationSec}s", "cameraAngle": "...", "lightingCue": "...", "action": "...", "characters": [], "bgm": "...", "continuity": "...", "malayalamDialogue": "", "dialogueEnglish": "", "imagePrompt": "[PHOTO KEYFRAME PROMPT — SHOT ${startNum.toString().padStart(2, '0')}]: ...", "videoPrompt": "[VIDEO MOTION PROMPT — SHOT ${startNum.toString().padStart(2, '0')}]: ..." }] }`;

      let lastErr: any;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const resRange = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: `Language: ${langConfig.geminiLangName}\nCategory: ${resolvedCategory.name} (${resolvedGroup.labels.en})\nDialogue Mode: ${effectiveMode}\nShot Range: ${startNum} to ${endNum} (Total shots: ${totalRequested})\nClip Duration: ${clipDurationSec}s\nSituation / Script:\n"""${script.trim()}"""`,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            }),
            24000
          );
          const parsed = JSON.parse(resRange.text || '{}');
          if (Array.isArray(parsed.shots) && parsed.shots.length > 0) {
            return parsed.shots;
          }
          lastErr = new Error('Empty shots array returned by Gemini.');
        } catch (err: any) {
          lastErr = err;
        }
      }
      throw lastErr;
    };

    const ranges: { start: number; end: number; phase: string }[] = [];
    const chunkSize = 4;
    const arcLabels = [
      'Opening Situation, Character Presence & Rising Chemistry/Tension',
      'Escalation, Turning Point & Peak Climax Beat',
      'Complication Wave & Shifting Dynamics',
      'Resolution & Memorable Closing Frame',
    ];
    for (let s = 1, chunkIdx = 0; s <= coreAiShotCount; s += chunkSize, chunkIdx++) {
      const e = Math.min(coreAiShotCount, s + chunkSize - 1);
      ranges.push({
        start: s,
        end: e,
        phase:
          chunkIdx === 0 && e === coreAiShotCount
            ? totalRequested === 1
              ? `Complete ${clipDurationSec}s 3-Beat Mini-Scene`
              : 'Full Chronological Story Arc (Beginning -> Escalation -> Climax -> Resolution)'
            : `${arcLabels[chunkIdx % arcLabels.length]} (continuing seamlessly from Shot ${Math.max(1, s - 1)})`,
      });
    }

    const chunkResults = await Promise.all(
      ranges.map((r) => generateRange(r.start, r.end, r.phase))
    );
    const aiShots = chunkResults.flat();

    const expandedShots = expandShotsToTargetCount(
      aiShots,
      totalRequested,
      clipDurationSec,
      allowDialogue,
      langCode,
      effectiveMode,
      resolvedCategory.id
    );
    return res.json({ shots: expandedShots });
  } catch (geminiError: any) {
    console.error('Gemini breakdown failed:', geminiError?.message);
    return res.status(502).json({
      error: geminiError?.message || 'Failed to generate scene breakdown from Gemini.',
    });
  }
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
