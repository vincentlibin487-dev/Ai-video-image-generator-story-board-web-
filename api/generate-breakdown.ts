import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  DialogueMode,
  expandShotsToTargetCount,
  generateBreakdownLocal,
  inferCategoryFromScript,
  isExplicitlySilent,
} from '../src/lib/storyEngine';
import {
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
      preferredShotDuration = 8,
      targetShotCount = 1,
      characterPhotos = [],
      fastMode = false,
      language = 'ml',
      dialogueMode = 'dialogue',
      categoryId = 'all',
    } = body;

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
      return res.status(200).json(instantBreakdown);
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
      });
    }

    const dialogueRule =
      effectiveMode === 'silent'
        ? `STRICT NO-DIALOGUE / PURE VISUAL SCRIPT RULE: Dialogue is OFF. Set "malayalamDialogue": "" and "dialogueEnglish": "" on EVERY shot. NEVER invent spoken lines. Tell the entire story 100% visually via framing, micro-expressions, blocking, lighting, and natural ambient SFX/foley.`
        : effectiveMode === 'dialogue'
        ? `AUTOMATIC DIALOGUE SYNTHESIS RULE: Dialogue is ON. Even if the user entered only a short situation WITHOUT any dialogues, automatically write natural, emotionally grounded spoken dialogue in "malayalamDialogue" (strictly pure ${langConfig.geminiLangName}) and "dialogueEnglish" tailored to "${resolvedCategory.name}" (${resolvedCategory.dialogueStyle}). Pace dialogue concisely to fit naturally inside ${clipDurationSec} seconds, with ZERO repeated lines across shots.`
        : `SMART MIX DIALOGUE & VISUAL BEATS RULE: Alternate between crisp category-specific spoken dialogue ("malayalamDialogue" in pure ${langConfig.geminiLangName}) and pure silent reaction/action beats (set "malayalamDialogue": "" and "dialogueEnglish": "" on silent beats). ZERO repeated lines.`;

    const singleClipRule =
      totalRequested === 1
        ? `SINGLE ${clipDurationSec}s CLIP STRUCTURE: Divide Shot 01 internally into 3 tightly timed visual beats inside "action" (opening hook -> middle turning beat -> closing frame) so even an ${clipDurationSec}s scene feels complete and cinematic.`
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
   - "cameraAngle": Exact lens/framing/movement cue.
   - "lightingCue": Lighting, color palette & atmosphere matching ${resolvedCategory.visualStyle}.
   - "action": Scene action description in pure ${langConfig.geminiLangName}.
   - "imagePrompt": Must start with "[PHOTO KEYFRAME PROMPT — SHOT ${startNum.toString().padStart(2, '0')}]:" describing a static 35mm still frame.
   - "videoPrompt": Must start with "[VIDEO MOTION PROMPT — SHOT ${startNum.toString().padStart(2, '0')}]:" describing 24fps motion, camera work, spoken dialogue ONLY if non-empty (or explicit Pure Visual / Ambient SFX if silent), and BGM.
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
              : 'Full Chronological Story Arc'
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
    return res.status(200).json({ shots: expandedShots });
  } catch (error: any) {
    console.error('Error generating breakdown:', error);
    return res.status(502).json({
      error: error?.message || 'Failed to generate shot prompts',
    });
  }
}
