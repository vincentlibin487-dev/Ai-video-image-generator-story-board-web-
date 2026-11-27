import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  DialogueMode,
  generateStoryAnglesLocal,
  isExplicitlySilent,
  mapGroupToGenreKey,
  mergeAnglesEnsuringAllCategories,
} from '../src/lib/storyEngine';
import {
  STORY_CATEGORIES,
  getCategoryById,
  getCategoryGroup,
  type StoryCategory,
} from '../src/lib/storyCategories';
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
      dialogueMode = 'dialogue',
      targetShotCount = 8,
      durationDisplay = '',
      categoryId = 'all',
      fastMode = false,
    } = body;

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
      return res.status(200).json({ angles });
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
1. Expand each variation into a rich visual + dramatic/situational mini-arc fitted for ${clipCount} clip(s) (${durationDisplay || `${clipCount} shots`}) without repeating the prompt verbatim.
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
        return res.status(200).json({ angles: [...batchA, ...batchB] });
      } catch (geminiErr: any) {
        return res.status(502).json({
          error: geminiErr?.message || 'Failed to generate category story variations from Gemini.',
        });
      }
    }

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
1. Keep the user's core premise recognizable, but transform plot, lighting, camera style, and conflict to authentically embody each category!
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
        return res.status(200).json({ angles: mergeAnglesEnsuringAllCategories(combined, localReference) });
      }
      const firstErr = settled.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
      return res.status(502).json({
        error: firstErr?.reason?.message || 'Gemini failed to generate multi-category story options.',
      });
    } catch (geminiErr: any) {
      return res.status(502).json({
        error: geminiErr?.message || 'Failed to generate story angles from Gemini.',
      });
    }
  } catch (error: any) {
    console.error('Error generating story angles:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate story angles',
    });
  }
}
