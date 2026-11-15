import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type { SavedStoryItem } from '../components/SavedStoriesModal';
import type { GeneratedShot, StoryAngle } from './storyEngine';

export interface UserAccountRecord {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  loginCount: number;
  savedStoriesCount: number;
  lastDayKey: string;
  createdAt?: Timestamp | null;
  lastLoginAt?: Timestamp | null;
}

export function getLocalDayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sanitizeId(raw: string): string {
  const cleaned = String(raw || '').replace(/[^a-zA-Z0-9_\-]/g, '_');
  if (cleaned.length >= 4) return cleaned.slice(0, 128);
  return `story_${Date.now()}`;
}

function sanitizeShot(shot: GeneratedShot, idx: number): Record<string, any> {
  return {
    shotNumber: Number.isFinite(shot.shotNumber) ? Math.max(1, Math.round(shot.shotNumber)) : idx + 1,
    timing: String(shot.timing || '').slice(0, 120),
    durationSeconds: Number.isFinite(shot.durationSeconds)
      ? Math.max(1, Math.round(shot.durationSeconds))
      : 8,
    action: String(shot.action || '').slice(0, 4000),
    malayalamDialogue: String(shot.malayalamDialogue || '').slice(0, 2000),
    imagePrompt: String(shot.imagePrompt || '').slice(0, 4000),
    videoPrompt: String(shot.videoPrompt || '').slice(0, 4000),
    bgm: String(shot.bgm || '').slice(0, 1000),
    continuity: String(shot.continuity || '').slice(0, 1000),
  };
}

function sanitizeAngle(angle: StoryAngle): Record<string, any> {
  return {
    id: String(angle.id || `angle_${Date.now()}`).slice(0, 128),
    title: String(angle.title || 'Untitled Story').slice(0, 300),
    genre: String(angle.genre || 'Cinematic').slice(0, 120),
    catKey: String(angle.catKey || 'drama').slice(0, 40),
    synopsis: String(angle.synopsis || '').slice(0, 4000),
    storySummary: String(angle.storySummary || angle.synopsis || '').slice(0, 15000),
    characters: String(angle.characters || '').slice(0, 2000),
    bgm: String(angle.bgm || '').slice(0, 1000),
    continuity: String(angle.continuity || '').slice(0, 1000),
    mood: String(angle.mood || '').slice(0, 300),
    scriptText: String(angle.scriptText || angle.storySummary || '').slice(0, 15000),
  };
}

export async function upsertUserAccountOnLogin(
  user: User,
  localStoriesCount = 0
): Promise<void> {
  if (!user || !user.email || !user.emailVerified) return;
  const uid = sanitizeId(user.uid);
  const userRef = doc(db, 'user_accounts', uid);
  const path = `user_accounts/${uid}`;
  const dayKey = getLocalDayKey();

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid,
        email: user.email.slice(0, 128),
        displayName: String(user.displayName || user.email.split('@')[0] || 'Creator').slice(0, 128),
        photoURL: String(user.photoURL || '').slice(0, 512),
        loginCount: 1,
        savedStoriesCount: Math.max(0, Math.min(10000, Math.round(localStoriesCount))),
        lastDayKey: dayKey,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    } else {
      const prev = snap.data() as Partial<UserAccountRecord>;
      const nextCount = Math.min(1000000, Math.max(1, Number(prev.loginCount || 0) + 1));
      const existingSavedCount = Number(prev.savedStoriesCount || 0);
      await updateDoc(userRef, {
        displayName: String(user.displayName || prev.displayName || 'Creator').slice(0, 128),
        photoURL: String(user.photoURL || prev.photoURL || '').slice(0, 512),
        loginCount: nextCount,
        savedStoriesCount: Math.max(existingSavedCount, Math.round(localStoriesCount)),
        lastDayKey: dayKey,
        lastLoginAt: serverTimestamp(),
      });
    }
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.WRITE, path);
    } catch {
      // Structured FirestoreErrorInfo already emitted
    }
    throw err;
  }
}

export async function syncStoryCountToUserAccount(user: User, count: number): Promise<void> {
  if (!user || !user.email || !user.emailVerified) return;
  const uid = sanitizeId(user.uid);
  const path = `user_accounts/${uid}`;
  try {
    await updateDoc(doc(db, 'user_accounts', uid), {
      savedStoriesCount: Math.max(0, Math.min(10000, Math.round(count))),
      lastDayKey: getLocalDayKey(),
      lastLoginAt: serverTimestamp(),
    });
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } catch {
      // Logged
    }
  }
}

export async function saveStoryToGmailCloud(
  user: User,
  story: SavedStoryItem,
  isAutoSaved = false
): Promise<void> {
  if (!user || !user.email || !user.emailVerified) return;

  const uid = sanitizeId(user.uid);
  const storyId = sanitizeId(story.id);
  const path = `user_accounts/${uid}/saved_stories/${storyId}`;
  const storyRef = doc(db, 'user_accounts', uid, 'saved_stories', storyId);

  const rawShots = Array.isArray(story.shots) ? story.shots : [];
  const clampedShots = rawShots.slice(0, 500).map((s, i) => sanitizeShot(s, i));
  const sanitizedAngle = sanitizeAngle(story.angle);
  const durationSeconds = Math.max(1, Math.min(86400, Math.round(story.durationSeconds || 60)));
  const shotCount = Math.max(0, Math.min(2000, clampedShots.length));
  const partNumber = Math.max(1, Math.min(1000, Math.round(story.partNumber || 1)));
  const savedAtMs = Math.max(0, Math.round(story.savedAt || Date.now()));

  try {
    const parentSnap = await getDoc(doc(db, 'user_accounts', uid));
    if (!parentSnap.exists()) {
      await upsertUserAccountOnLogin(user, 1);
    }

    const existingSnap = await getDoc(storyRef);
    const mutableFields = {
      title: String(story.title || 'Untitled Cinematic Story').slice(0, 300),
      storySummary: String(story.storySummary || '').slice(0, 20000),
      genre: String(story.genre || 'Cinematic').slice(0, 120),
      durationDisplay: String(story.durationDisplay || `${durationSeconds}s`).slice(0, 120),
      durationSeconds,
      shotCount,
      shots: clampedShots,
      angle: sanitizedAngle,
      partNumber,
      isAutoSaved: Boolean(isAutoSaved),
      isLoved: Boolean(story.isLoved),
      savedAtMs,
      updatedAt: serverTimestamp(),
    };

    if (!existingSnap.exists()) {
      await setDoc(storyRef, {
        storyId,
        ownerUid: uid,
        ownerEmail: user.email.slice(0, 128),
        ...mutableFields,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(storyRef, mutableFields);
    }
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.WRITE, path);
    } catch {
      // Logged
    }
    throw err;
  }
}

export async function deleteStoryFromGmailCloud(user: User, storyIdRaw: string): Promise<void> {
  if (!user || !user.emailVerified) return;
  const uid = sanitizeId(user.uid);
  const storyId = sanitizeId(storyIdRaw);
  const path = `user_accounts/${uid}/saved_stories/${storyId}`;
  try {
    await deleteDoc(doc(db, 'user_accounts', uid, 'saved_stories', storyId));
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.DELETE, path);
    } catch {
      // Logged
    }
  }
}

export function subscribeUserCloudStories(
  user: User,
  onStories: (stories: SavedStoryItem[]) => void,
  onError?: (msg: string) => void
): () => void {
  const uid = sanitizeId(user.uid);
  const colPath = `user_accounts/${uid}/saved_stories`;
  const q = query(collection(db, 'user_accounts', uid, 'saved_stories'), where('ownerUid', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SavedStoryItem[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data() as Record<string, any>;
        return {
          id: docSnap.id,
          title: String(d.title || 'Untitled Story'),
          storySummary: String(d.storySummary || ''),
          genre: String(d.genre || 'Cinematic'),
          durationDisplay: String(d.durationDisplay || ''),
          durationSeconds: Number(d.durationSeconds || 60),
          shotCount: Number(d.shotCount || (Array.isArray(d.shots) ? d.shots.length : 0)),
          shots: Array.isArray(d.shots) ? (d.shots as GeneratedShot[]) : [],
          angle: (d.angle || {}) as StoryAngle,
          savedAt: Number(d.savedAtMs || Date.now()),
          partNumber: Number(d.partNumber || 1),
          isLoved: Boolean(d.isLoved),
          syncedToGmail: d.ownerEmail ? String(d.ownerEmail) : user.email || undefined,
        };
      });

      items.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      onStories(items);
    },
    (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      onError?.(msg);
      try {
        handleFirestoreError(err, OperationType.LIST, colPath);
      } catch {
        // Logged
      }
    }
  );
}
