export interface CharacterProfile {
  id: string;
  name: string;
  role: string;
  photoUrl: string;
  age?: string;
  ethnicity?: string;
  visualContinuityTags: string;
  keyFeatures: string[];
  isAnalyzing?: boolean;
}

export interface ShotDialogue {
  character: string;
  lineOriginal: string;
  lineRomanized?: string;
  lineEnglish?: string;
  audioEmotion?: string;
}

export interface CameraDetails {
  framing: string;
  lens: string;
  movement: string;
}

export interface LightingColorDetails {
  lighting: string;
  colorGrade: string;
  atmosphere: string;
}

export interface AudioFoleyDetails {
  sfx: string;
  musicCue: string;
}

export interface GenerationPrompts {
  masterCinematic: string;
  klingPrompt: string;
  lumaPrompt: string;
  midjourneyPrompt: string;
  runwayPrompt: string;
}

export interface ShotItem {
  id: string;
  shotNumber: number;
  durationSeconds: number;
  sceneHeading: string;
  scriptSegment: string;
  charactersPresent: string[];
  dialogue: ShotDialogue | null;
  cameraDetails: CameraDetails;
  lightingColor: LightingColorDetails;
  audioFoley: AudioFoleyDetails;
  generationPrompts: GenerationPrompts;
  characterContinuityTokens: string[];
  frameImageUrl?: string;
  isGeneratingImage?: boolean;
}

export type AspectRatioType = '16:9' | '2.39:1' | '4:3' | '9:16';
export type AiToolPreset = 'universal' | 'kling' | 'luma' | 'midjourney' | 'runway';

export interface DirectorProject {
  title: string;
  genre: string;
  targetLanguage: string;
  preferredShotDuration: number;
  aspectRatio: AspectRatioType;
  targetAiTool: AiToolPreset;
  cinematicStyle: string;
  script: string;
  characters: CharacterProfile[];
  shots: ShotItem[];
}
