import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  DialogueMode,
  expandShotsToTargetCount,
  generateBreakdownLocal,
  isExplicitlySilent,
} from '../src/lib/storyEngine';
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
      dialogueMode = 'dynamic',
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
    const totalRequested = Math.max(1, Number(targetShotCount) || 8);
    const coreAiShotCount = Math.max(4, Math.min(totalRequested, 16));

    const ai = getGeminiClient();
    if (ai && !fastMode) {
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
          return res.status(200).json({ shots: expandedShots });
        }
      } catch (geminiError: any) {
        console.warn('Gemini fast breakdown notice, using fallback:', geminiError?.message);
      }
    }

    const fallbackBreakdown = generateBreakdownLocal(
      script,
      preferredShotDuration,
      characterPhotos,
      targetShotCount,
      langCode,
      effectiveMode
    );
    return res.status(200).json(fallbackBreakdown);
  } catch (error: any) {
    console.error('Error generating breakdown:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate shot prompts',
    });
  }
}
