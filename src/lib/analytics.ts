import {
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type { AppLang } from './i18n';

export type VisitorStep = 'input' | 'options' | 'prompts' | 'admin';
export type DeviceCategory = 'mobile' | 'tablet' | 'desktop';

export interface VisitorSessionRecord {
  sessionId: string;
  visitorId: string;
  visitNumber: number;
  isReturning: boolean;
  language: AppLang;
  deviceType: DeviceCategory;
  screenCategory: string;
  referrerSource: string;
  currentStep: VisitorStep;
  anglesGeneratedCount: number;
  breakdownsGeneratedCount: number;
  ttsPlaysCount: number;
  activeDurationSec: number;
  dayKey: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

const VISITOR_ID_KEY = 'csb_anon_visitor_id_v1';
const VISIT_COUNT_KEY = 'csb_anon_visit_count_v1';
const SESSION_STATE_KEY = 'csb_anon_session_state_v1';

interface LocalSessionState {
  sessionId: string;
  visitorId: string;
  visitNumber: number;
  isReturning: boolean;
  language: AppLang;
  deviceType: DeviceCategory;
  screenCategory: string;
  referrerSource: string;
  currentStep: VisitorStep;
  anglesGeneratedCount: number;
  breakdownsGeneratedCount: number;
  ttsPlaysCount: number;
  activeDurationSec: number;
  dayKey: string;
  createdOnServer: boolean;
}

const VALID_LANGS: AppLang[] = ['ml', 'en', 'hi', 'ta', 'kn', 'te'];

function sanitizeId(raw: string, prefix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 96);
  if (cleaned.length >= 6) return cleaned;
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`.slice(0, 96);
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`.slice(0, 64);
  }
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 12);
  return `${prefix}_${ts}_${rand}`;
}

function formatDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function detectDeviceType(): DeviceCategory {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth || screen.width || 1024;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function detectScreenCategory(): string {
  if (typeof window === 'undefined') return '1280x720';
  const w = Math.max(240, Math.round(window.innerWidth || 390));
  const h = Math.max(320, Math.round(window.innerHeight || 844));
  return `${w}x${h}`.slice(0, 32);
}

function detectReferrerSource(): string {
  if (typeof document === 'undefined' || !document.referrer) return 'direct';
  try {
    const parsed = new URL(document.referrer);
    const host = parsed.hostname.replace(/^www\./, '').trim();
    if (!host) return 'direct';
    if (typeof window !== 'undefined' && host === window.location.hostname) {
      return 'direct';
    }
    return host.slice(0, 64);
  } catch {
    return 'direct';
  }
}

function clampInt(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(val)));
}

let sessionState: LocalSessionState | null = null;
let initPromise: Promise<void> | null = null;
let heartbeatTimer: number | null = null;
let lastTickAt = Date.now();

function saveSessionToStorage() {
  if (typeof window === 'undefined' || !sessionState) return;
  try {
    sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(sessionState));
  } catch {
    // Ignore storage quota errors
  }
}

async function createSessionDoc(state: LocalSessionState): Promise<void> {
  const path = `visitor_sessions/${state.sessionId}`;
  const ref = doc(db, 'visitor_sessions', state.sessionId);
  try {
    await setDoc(ref, {
      sessionId: state.sessionId,
      visitorId: state.visitorId,
      visitNumber: clampInt(state.visitNumber, 1, 100000),
      isReturning: Boolean(state.isReturning),
      language: VALID_LANGS.includes(state.language) ? state.language : 'ml',
      deviceType: state.deviceType,
      screenCategory: state.screenCategory.slice(0, 32),
      referrerSource: state.referrerSource.slice(0, 64) || 'direct',
      currentStep: state.currentStep === 'admin' ? 'input' : state.currentStep,
      anglesGeneratedCount: clampInt(state.anglesGeneratedCount, 0, 10),
      breakdownsGeneratedCount: clampInt(state.breakdownsGeneratedCount, 0, 10),
      ttsPlaysCount: clampInt(state.ttsPlaysCount, 0, 20),
      activeDurationSec: clampInt(state.activeDurationSec, 0, 86400),
      dayKey: state.dayKey,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    state.createdOnServer = true;
    saveSessionToStorage();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

async function updateSessionDoc(state: LocalSessionState): Promise<void> {
  const path = `visitor_sessions/${state.sessionId}`;
  const ref = doc(db, 'visitor_sessions', state.sessionId);
  try {
    await updateDoc(ref, {
      language: VALID_LANGS.includes(state.language) ? state.language : 'ml',
      currentStep: state.currentStep === 'admin' ? 'input' : state.currentStep,
      anglesGeneratedCount: clampInt(state.anglesGeneratedCount, 0, 1000),
      breakdownsGeneratedCount: clampInt(state.breakdownsGeneratedCount, 0, 1000),
      ttsPlaysCount: clampInt(state.ttsPlaysCount, 0, 1000),
      activeDurationSec: clampInt(state.activeDurationSec, 0, 86400),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

function bumpElapsedActiveSeconds() {
  if (!sessionState || typeof document === 'undefined') return;
  const now = Date.now();
  if (document.visibilityState === 'visible') {
    const deltaSec = Math.max(0, Math.round((now - lastTickAt) / 1000));
    if (deltaSec > 0 && deltaSec <= 300) {
      sessionState.activeDurationSec = clampInt(
        sessionState.activeDurationSec + deltaSec,
        0,
        86400
      );
      saveSessionToStorage();
    }
  }
  lastTickAt = now;
}

async function flushSessionUpdate() {
  if (!sessionState) return;
  bumpElapsedActiveSeconds();

  try {
    if (initPromise) {
      await initPromise;
    }
    if (!sessionState.createdOnServer) {
      await createSessionDoc(sessionState);
    } else {
      await updateSessionDoc(sessionState);
    }
  } catch (err) {
    console.warn(
      'Guest usage telemetry update skipped:',
      err instanceof Error ? err.message : String(err)
    );
  }
}

export function initGuestSession(initialLang: AppLang): void {
  if (typeof window === 'undefined') return;

  if (initPromise) return;

  let storedVisitorId = '';
  let visitNumber = 1;

  try {
    const existingVisitor = localStorage.getItem(VISITOR_ID_KEY);
    if (existingVisitor) {
      storedVisitorId = sanitizeId(existingVisitor, 'vis');
    } else {
      storedVisitorId = generateId('vis');
      localStorage.setItem(VISITOR_ID_KEY, storedVisitorId);
    }

    const existingSessionRaw = sessionStorage.getItem(SESSION_STATE_KEY);
    if (existingSessionRaw) {
      const parsed = JSON.parse(existingSessionRaw) as LocalSessionState;
      if (parsed && parsed.sessionId && parsed.visitorId === storedVisitorId) {
        sessionState = {
          ...parsed,
          language: VALID_LANGS.includes(initialLang) ? initialLang : parsed.language,
        };
      }
    }

    if (!sessionState) {
      const prevCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
      visitNumber = clampInt((Number.isFinite(prevCount) ? prevCount : 0) + 1, 1, 100000);
      localStorage.setItem(VISIT_COUNT_KEY, String(visitNumber));

      sessionState = {
        sessionId: generateId('sess'),
        visitorId: storedVisitorId,
        visitNumber,
        isReturning: visitNumber > 1,
        language: VALID_LANGS.includes(initialLang) ? initialLang : 'ml',
        deviceType: detectDeviceType(),
        screenCategory: detectScreenCategory(),
        referrerSource: detectReferrerSource(),
        currentStep: 'input',
        anglesGeneratedCount: 0,
        breakdownsGeneratedCount: 0,
        ttsPlaysCount: 0,
        activeDurationSec: 1,
        dayKey: formatDayKey(),
        createdOnServer: false,
      };
      saveSessionToStorage();
    }
  } catch {
    sessionState = {
      sessionId: generateId('sess'),
      visitorId: storedVisitorId || generateId('vis'),
      visitNumber: 1,
      isReturning: false,
      language: VALID_LANGS.includes(initialLang) ? initialLang : 'ml',
      deviceType: detectDeviceType(),
      screenCategory: detectScreenCategory(),
      referrerSource: detectReferrerSource(),
      currentStep: 'input',
      anglesGeneratedCount: 0,
      breakdownsGeneratedCount: 0,
      ttsPlaysCount: 0,
      activeDurationSec: 1,
      dayKey: formatDayKey(),
      createdOnServer: false,
    };
  }

  lastTickAt = Date.now();

  initPromise = (async () => {
    if (!sessionState) return;
    try {
      if (!sessionState.createdOnServer) {
        await createSessionDoc(sessionState);
      } else {
        await updateSessionDoc(sessionState);
      }
    } catch (err) {
      console.warn(
        'Initial guest session telemetry skipped:',
        err instanceof Error ? err.message : String(err)
      );
    }
  })();

  if (heartbeatTimer === null) {
    heartbeatTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void flushSessionUpdate();
      }
    }, 30000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        void flushSessionUpdate();
      } else {
        lastTickAt = Date.now();
      }
    });
  }
}

export function trackStepChange(step: 'input' | 'options' | 'prompts'): void {
  if (!sessionState) return;
  if (sessionState.currentStep === step) return;
  sessionState.currentStep = step;
  saveSessionToStorage();
  void flushSessionUpdate();
}

export function trackLanguageChange(newLang: AppLang): void {
  if (!sessionState) return;
  sessionState.language = newLang;
  saveSessionToStorage();
  void flushSessionUpdate();
}

export function trackAnglesGenerated(): void {
  if (!sessionState) return;
  sessionState.anglesGeneratedCount = clampInt(
    sessionState.anglesGeneratedCount + 1,
    0,
    1000
  );
  sessionState.currentStep = 'options';
  saveSessionToStorage();
  void flushSessionUpdate();
}

export function trackBreakdownGenerated(): void {
  if (!sessionState) return;
  sessionState.breakdownsGeneratedCount = clampInt(
    sessionState.breakdownsGeneratedCount + 1,
    0,
    1000
  );
  sessionState.currentStep = 'prompts';
  saveSessionToStorage();
  void flushSessionUpdate();
}

export function trackTtsPlayed(): void {
  if (!sessionState) return;
  sessionState.ttsPlaysCount = clampInt(sessionState.ttsPlaysCount + 1, 0, 1000);
  saveSessionToStorage();
  void flushSessionUpdate();
}
