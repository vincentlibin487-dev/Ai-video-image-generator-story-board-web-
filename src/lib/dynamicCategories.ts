import {
  Bookmark,
  BookOpen,
  Camera,
  Clapperboard,
  Disc3,
  Film,
  Flame,
  Headphones,
  Heart,
  Layers,
  Mic,
  Music,
  Palette,
  Radio,
  Shield,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Split,
  Star,
  Tag,
  Type,
  Video,
  Volume2,
  Wand2,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type { EditorToolTab, WheelCategoryItem } from '../components/CircularToolWheel';

export const EDITOR_CONFIG_DOC_ID = 'categories_state';

export interface EditorConfigState {
  configId: string;
  categoriesInitialized: boolean;
  musicLyricsInitialized: boolean;
  updatedAt?: Timestamp | null;
}

export interface DynamicEditorCategory {
  categoryId: string;
  label: string;
  shortLabel: string;
  tab: EditorToolTab;
  subCategory: string;
  trackNumber: number;
  trackName: string;
  accentHex: string;
  iconKey: string;
  orderIndex: number;
  isBuiltIn: boolean;
  hasLyricsBoxes: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface DynamicCategoryItem {
  itemId: string;
  categoryId: string;
  title: string;
  subtitle: string;
  lyrics: string;
  badgeText: string;
  orderIndex: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface CategoryIconOption {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { key: 'video', label: 'Video', icon: Video },
  { key: 'volume2', label: 'Audio', icon: Volume2 },
  { key: 'palette', label: 'Filters', icon: Palette },
  { key: 'music', label: 'Music', icon: Music },
  { key: 'mic', label: 'Mic / Voice', icon: Mic },
  { key: 'type', label: 'Titles', icon: Type },
  { key: 'smile', label: 'Stickers', icon: Smile },
  { key: 'flame', label: 'VFX', icon: Flame },
  { key: 'clapperboard', label: 'Card', icon: Clapperboard },
  { key: 'wand2', label: 'Chroma', icon: Wand2 },
  { key: 'split', label: 'Split', icon: Split },
  { key: 'sliders', label: 'Transitions', icon: SlidersHorizontal },
  { key: 'sparkles', label: 'Effects', icon: Sparkles },
  { key: 'layers', label: 'Templates', icon: Layers },
  { key: 'headphones', label: 'Songs', icon: Headphones },
  { key: 'disc3', label: 'Album', icon: Disc3 },
  { key: 'radio', label: 'Radio', icon: Radio },
  { key: 'book', label: 'Lyrics', icon: BookOpen },
  { key: 'film', label: 'Cinema', icon: Film },
  { key: 'camera', label: 'Camera', icon: Camera },
  { key: 'star', label: 'Star', icon: Star },
  { key: 'heart', label: 'Favorite', icon: Heart },
  { key: 'zap', label: 'Energy', icon: Zap },
  { key: 'shield', label: 'Emblem Shield', icon: Shield },
  { key: 'bookmark', label: 'Bookmark', icon: Bookmark },
  { key: 'tag', label: 'Tag', icon: Tag },
];

const ICON_MAP: Record<string, LucideIcon> = CATEGORY_ICON_OPTIONS.reduce(
  (acc, item) => {
    acc[item.key] = item.icon;
    return acc;
  },
  {} as Record<string, LucideIcon>
);

export function getCategoryIconComponent(iconKey: string): LucideIcon {
  return ICON_MAP[iconKey] || Sparkles;
}

export const DEFAULT_EDITOR_CATEGORIES: DynamicEditorCategory[] = [
  {
    categoryId: 'video',
    label: 'Media / Video 1',
    shortLabel: 'Media',
    tab: 'Media',
    subCategory: '',
    trackNumber: 2,
    trackName: 'Video 1',
    accentHex: '#2dd4bf',
    iconKey: 'video',
    orderIndex: 0,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
  {
    categoryId: 'audio',
    label: 'Audio 1 (Clip)',
    shortLabel: 'Audio',
    tab: 'Audio',
    subCategory: 'All',
    trackNumber: 3,
    trackName: 'Audio 1',
    accentHex: '#34d399',
    iconKey: 'volume2',
    orderIndex: 1,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
  {
    categoryId: 'filters',
    label: 'Filters & LUTs',
    shortLabel: 'Filters',
    tab: 'Filters',
    subCategory: '',
    trackNumber: 4,
    trackName: 'Filters',
    accentHex: '#22d3ee',
    iconKey: 'palette',
    orderIndex: 2,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
  {
    categoryId: 'music',
    label: 'Music Track',
    shortLabel: 'Music',
    tab: 'Audio',
    subCategory: 'Background Music',
    trackNumber: 5,
    trackName: 'Music',
    accentHex: '#14b8a6',
    iconKey: 'music',
    orderIndex: 3,
    isBuiltIn: true,
    hasLyricsBoxes: true,
  },
  {
    categoryId: 'dialogues',
    label: 'Dialogues / REC',
    shortLabel: 'REC',
    tab: 'Audio',
    subCategory: 'Dialogues',
    trackNumber: 6,
    trackName: 'Dialogues',
    accentHex: '#fbbf24',
    iconKey: 'mic',
    orderIndex: 4,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
  {
    categoryId: 'titles',
    label: 'Titles & Text',
    shortLabel: 'Title',
    tab: 'Titles',
    subCategory: '',
    trackNumber: 1,
    trackName: 'Title',
    accentHex: '#f59e0b',
    iconKey: 'type',
    orderIndex: 5,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
  {
    categoryId: 'stickers',
    label: 'Emoji & Stickers',
    shortLabel: 'Emoji',
    tab: 'Stickers',
    subCategory: '',
    trackNumber: 7,
    trackName: 'Emoji',
    accentHex: '#38bdf8',
    iconKey: 'smile',
    orderIndex: 6,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
  {
    categoryId: 'vfx',
    label: 'Action VFX',
    shortLabel: 'VFX',
    tab: 'VFX',
    subCategory: '',
    trackNumber: 8,
    trackName: 'VFX',
    accentHex: '#fb7185',
    iconKey: 'flame',
    orderIndex: 7,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
  {
    categoryId: 'card',
    label: 'Trailer Card',
    shortLabel: 'Card',
    tab: 'Trailer',
    subCategory: '',
    trackNumber: 9,
    trackName: 'Card',
    accentHex: '#fbbf24',
    iconKey: 'clapperboard',
    orderIndex: 8,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
  {
    categoryId: 'chroma',
    label: 'Chroma Key',
    shortLabel: 'Chroma',
    tab: 'Chroma',
    subCategory: '',
    trackNumber: 10,
    trackName: 'Chroma',
    accentHex: '#10b981',
    iconKey: 'wand2',
    orderIndex: 9,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
  {
    categoryId: 'split',
    label: 'Split Screen',
    shortLabel: 'Split',
    tab: 'Split',
    subCategory: '',
    trackNumber: 11,
    trackName: 'Split',
    accentHex: '#06b6d4',
    iconKey: 'split',
    orderIndex: 10,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
  {
    categoryId: 'transitions',
    label: 'Transitions',
    shortLabel: 'Trans',
    tab: 'Transitions',
    subCategory: '',
    trackNumber: 12,
    trackName: 'Transitions',
    accentHex: '#f59e0b',
    iconKey: 'sliders',
    orderIndex: 11,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
  {
    categoryId: 'effects',
    label: 'Visual Effects',
    shortLabel: 'Effects',
    tab: 'Effects',
    subCategory: '',
    trackNumber: 13,
    trackName: 'Effects',
    accentHex: '#c084fc',
    iconKey: 'sparkles',
    orderIndex: 12,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
  {
    categoryId: 'templates',
    label: 'Templates',
    shortLabel: 'Tmpl',
    tab: 'Templates',
    subCategory: '',
    trackNumber: 14,
    trackName: 'Templates',
    accentHex: '#2dd4bf',
    iconKey: 'layers',
    orderIndex: 13,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
  {
    categoryId: 'action_reel',
    label: 'Action Video',
    shortLabel: 'ActVid',
    tab: 'Media',
    subCategory: '',
    trackNumber: 15,
    trackName: 'Action Reel',
    accentHex: '#f97316',
    iconKey: 'film',
    orderIndex: 14,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
  {
    categoryId: 'emblem_trailer',
    label: 'Emblem Trailer',
    shortLabel: 'Emblem',
    tab: 'Trailer',
    subCategory: '',
    trackNumber: 16,
    trackName: 'Emblem',
    accentHex: '#eab308',
    iconKey: 'shield',
    orderIndex: 15,
    isBuiltIn: true,
    hasLyricsBoxes: false,
  },
];

export function toWheelCategoryItem(cat: DynamicEditorCategory): WheelCategoryItem {
  return {
    id: cat.categoryId,
    label: cat.label,
    shortLabel: cat.shortLabel,
    tab: cat.tab,
    subCategory: cat.subCategory || undefined,
    trackNumber: cat.trackNumber,
    trackName: cat.trackName,
    accentHex: cat.accentHex,
    icon: getCategoryIconComponent(cat.iconKey),
    isBuiltIn: cat.isBuiltIn,
    hasLyricsBoxes: cat.hasLyricsBoxes,
    iconKey: cat.iconKey,
  };
}

// 120 Distinct Songs with Multi-Line Lyrics for the 'music' Category
const SONG_THEMES: Array<{
  title: string;
  mood: string;
  badge: string;
  verse: string;
  chorus: string;
}> = [
  {
    title: 'Neon Monsoon Drive',
    mood: 'Synthwave · Night',
    badge: 'Synth',
    verse: 'Raindrops race along the windshield glass,\nCity neon blurs as midnight passes fast.',
    chorus: 'Turn the headlights into golden beams,\nChasing thunder through electric dreams.',
  },
  {
    title: 'Paper Boats in May',
    mood: 'Acoustic · Warm',
    badge: 'Indie',
    verse: 'Silver puddles mirror crimson skies,\nFolded paper sails where laughter lies.',
    chorus: 'Let the current carry yesterday,\nWe are floating into brighter days.',
  },
  {
    title: 'Midnight Chai & Train',
    mood: 'Lofi · Chill',
    badge: 'Lofi',
    verse: 'Steam rises warm inside a paper cup,\nPlatform whistles wake the quiet up.',
    chorus: 'Every mile hums a gentle tune,\nRolling steadily beneath the moon.',
  },
  {
    title: 'Roar of the Arena',
    mood: 'Epic · Sports',
    badge: 'Hype',
    verse: 'Dust on our boots, thunder in our chest,\nEvery second counts to pass the test.',
    chorus: 'Hands in the air, hear the stadium shake,\nThis is the moment that legends make.',
  },
  {
    title: 'Grandma’s Missing Chappal',
    mood: 'Comedy · Parody',
    badge: 'Funny',
    verse: 'TiP-toe silent past the kitchen door,\nOne wrong step and the chase is on for sure.',
    chorus: 'Run, brother, run like a ninja cat,\nNothing moves faster than a flying flat!',
  },
  {
    title: 'Velvet Horizon',
    mood: 'Cinematic · Drama',
    badge: 'Cinema',
    verse: 'Shadows lengthen on the canyon stone,\nEchoes answer when we walk alone.',
    chorus: 'Across the ridge the morning breaks in fire,\nLifting broken wings a little higher.',
  },
  {
    title: 'Mango Tree Swing',
    mood: 'Folk · Nostalgia',
    badge: 'Folk',
    verse: 'Summer breezes shake the courtyard leaves,\nStories woven in the cool green eaves.',
    chorus: 'Higher up until we touch the breeze,\nWild and carefree under mango trees.',
  },
  {
    title: 'Zero Sleep Espresso',
    mood: 'Comedy · Fast',
    badge: 'Vlog',
    verse: 'Three double shots before the clock strikes nine,\nTyping wild ideas on a shaky timeline.',
    chorus: 'Zoom in quick, cut right on the beat,\nDeadline approaching on two dancing feet!',
  },
  {
    title: 'Starlight Ferris Wheel',
    mood: 'Romantic · Dreamy',
    badge: 'Love',
    verse: 'Carnival lanterns flicker gold and blue,\nEvery spinning orbit pulls me back to you.',
    chorus: 'Hold my hand above the city glow,\nTime slows down while fireworks explode below.',
  },
  {
    title: 'Brass Band Chaos',
    mood: 'Comedy · Festive',
    badge: 'Desi',
    verse: 'Uncle grabbed the mic before the cake was cut,\nDJ dropped a remix with a peacock strut.',
    chorus: 'Boom-chaka-boom down the wedding street,\nEven grumpy neighbors started tapping feet!',
  },
  {
    title: 'Echoes in the Mist',
    mood: 'Ambient · Mystery',
    badge: 'Mystery',
    verse: 'Lanterns flicker through the pine-tree haze,\nFootsteps vanish in the silver maze.',
    chorus: 'Listen closely to the hollow wind,\nEvery secret starts where paths begin.',
  },
  {
    title: 'Pixel Hero Anthem',
    mood: '8-Bit · Retro',
    badge: 'Gaming',
    verse: 'Insert one coin, press the glowing start,\nLaser cannons ready with a fearless heart.',
    chorus: 'Level up, jump above the neon wall,\nHigh-score glory when the bosses fall!',
  },
];

const VERSE_OPENERS = [
  'Dawn breaks soft across the rooftop edge,',
  'Headphones on while the subway hums along,',
  'Sparks fly high from the bonfire ring,',
  'Curtains part as the spotlight hits the floor,',
  'Footsteps echo down the rain-washed lane,',
  'Engine purrs under coastal highway stars,',
  'Laughter spills from the corner tea stall bench,',
  'Camera rolls as the golden hour fades,',
  'Heartbeat syncs with the heavy bassline drop,',
  'Breezes drift over emerald mountain slopes,',
];

const CHORUS_HOOKS = [
  'Sing it louder till the rafters sway,\nNothing steals this spark away!',
  'Keep on moving through the amber light,\nEvery shadow turns to bright!',
  'Raise the banner to the open sky,\nWatch our fearless colors fly!',
  'Spin the record one more timeless round,\nJoy is waiting in the sound!',
  'Frame by frame we write the story true,\nEvery sunset shines brand new!',
];

const SUFFIX_VARIATIONS = [
  'Sunrise Mix',
  'Acoustic Cut',
  'Night Drive',
  'Street Beat',
  'Cinema Edit',
  'Club Mix',
  'Monsoon Session',
  'Reels Hook',
  'Festival Version',
  'Unplugged',
];

export const DEFAULT_MUSIC_LYRICS_SEED: DynamicCategoryItem[] = Array.from(
  { length: 120 },
  (_, index) => {
    const theme = SONG_THEMES[index % SONG_THEMES.length];
    const batch = Math.floor(index / SONG_THEMES.length);
    const opener = VERSE_OPENERS[(index * 3 + batch) % VERSE_OPENERS.length];
    const hook = CHORUS_HOOKS[(index * 2 + batch) % CHORUS_HOOKS.length];
    const suffix = SUFFIX_VARIATIONS[batch % SUFFIX_VARIATIONS.length];
    const num = String(index + 1).padStart(3, '0');

    const title = batch === 0 ? theme.title : `${theme.title} (${suffix})`;
    const lyrics = [
      `[Verse ${batch + 1}]`,
      opener,
      theme.verse,
      '',
      '[Chorus]',
      theme.chorus,
      hook,
    ].join('\n');

    return {
      itemId: `song_${num}`,
      categoryId: 'music',
      title,
      subtitle: theme.mood,
      lyrics,
      badgeText: theme.badge,
      orderIndex: index,
    };
  }
);

function sortCategories(list: DynamicEditorCategory[]): DynamicEditorCategory[] {
  return [...list].sort((a, b) => a.orderIndex - b.orderIndex || a.label.localeCompare(b.label));
}

function sortItems(list: DynamicCategoryItem[]): DynamicCategoryItem[] {
  return [...list].sort((a, b) => a.orderIndex - b.orderIndex || a.title.localeCompare(b.title));
}

export interface DynamicCatalogCallbacks {
  onCategoriesChange: (categories: DynamicEditorCategory[]) => void;
  onItemsChange: (items: DynamicCategoryItem[]) => void;
  onConfigChange?: (config: EditorConfigState | null) => void;
}

/**
 * Real-time Firestore subscription used by both the Video Editor Studio and Admin Panel.
 * Automatically updates across user-facing screens whenever Admin adds, edits, or deletes categories or lyrics boxes.
 */
export function subscribeDynamicEditorCatalog(callbacks: DynamicCatalogCallbacks): () => void {
  let cancelled = false;

  let latestConfig: EditorConfigState | null = null;
  let latestDbCategories: DynamicEditorCategory[] = [];
  let latestDbItems: DynamicCategoryItem[] = [];
  let hasCategoriesSnap = false;
  let hasItemsSnap = false;

  const emitCategories = () => {
    if (cancelled) return;
    if (!hasCategoriesSnap) {
      callbacks.onCategoriesChange(DEFAULT_EDITOR_CATEGORIES);
      return;
    }
    if (latestDbCategories.length > 0) {
      const existingIds = new Set(latestDbCategories.map((c) => c.categoryId));
      const newBuiltIns = DEFAULT_EDITOR_CATEGORIES.filter(
        (d) => (d.categoryId === 'action_reel' || d.categoryId === 'emblem_trailer') && !existingIds.has(d.categoryId)
      );
      callbacks.onCategoriesChange(sortCategories([...latestDbCategories, ...newBuiltIns]));
    } else if (latestConfig?.categoriesInitialized) {
      callbacks.onCategoriesChange([]);
    } else {
      callbacks.onCategoriesChange(DEFAULT_EDITOR_CATEGORIES);
    }
  };

  const emitItems = () => {
    if (cancelled) return;
    if (!hasItemsSnap) {
      callbacks.onItemsChange(DEFAULT_MUSIC_LYRICS_SEED);
      return;
    }
    const hasDbMusicItems = latestDbItems.some((item) => item.categoryId === 'music');
    if (hasDbMusicItems || latestConfig?.musicLyricsInitialized) {
      callbacks.onItemsChange(sortItems(latestDbItems));
    } else {
      callbacks.onItemsChange(sortItems([...DEFAULT_MUSIC_LYRICS_SEED, ...latestDbItems]));
    }
  };

  // Emit immediate defaults before network responds so UI renders instantaneously
  callbacks.onCategoriesChange(DEFAULT_EDITOR_CATEGORIES);
  callbacks.onItemsChange(DEFAULT_MUSIC_LYRICS_SEED);

  const unsubConfig = onSnapshot(
    doc(db, 'editor_config', EDITOR_CONFIG_DOC_ID),
    (snap) => {
      if (cancelled) return;
      latestConfig = snap.exists()
        ? {
            ...(snap.data() as EditorConfigState),
            configId: snap.id,
          }
        : null;
      callbacks.onConfigChange?.(latestConfig);
      emitCategories();
      emitItems();
    },
    () => {
      // Non-fatal fallback to defaults if offline
    }
  );

  let unsubCats: (() => void) | null = null;
  const subCategories = (ordered: boolean) => {
    const q = ordered
      ? query(collection(db, 'editor_categories'), orderBy('orderIndex', 'asc'))
      : query(collection(db, 'editor_categories'));
    unsubCats = onSnapshot(
      q,
      (snap) => {
        if (cancelled) return;
        hasCategoriesSnap = true;
        latestDbCategories = snap.docs.map((d) => ({
          ...(d.data() as DynamicEditorCategory),
          categoryId: d.id,
        }));
        emitCategories();
      },
      (err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        if (ordered && (msg.includes('index') || msg.includes('failed-precondition'))) {
          unsubCats?.();
          subCategories(false);
        }
      }
    );
  };
  subCategories(true);

  let unsubItems: (() => void) | null = null;
  const subItems = (ordered: boolean) => {
    const q = ordered
      ? query(collection(db, 'category_items'), orderBy('orderIndex', 'asc'))
      : query(collection(db, 'category_items'));
    unsubItems = onSnapshot(
      q,
      (snap) => {
        if (cancelled) return;
        hasItemsSnap = true;
        latestDbItems = snap.docs.map((d) => ({
          ...(d.data() as DynamicCategoryItem),
          itemId: d.id,
        }));
        emitItems();
      },
      (err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        if (ordered && (msg.includes('index') || msg.includes('failed-precondition'))) {
          unsubItems?.();
          subItems(false);
        }
      }
    );
  };
  subItems(true);

  return () => {
    cancelled = true;
    unsubConfig();
    unsubCats?.();
    unsubItems?.();
  };
}

export async function ensureCategoriesSeededInFirestore(): Promise<void> {
  const cfgRef = doc(db, 'editor_config', EDITOR_CONFIG_DOC_ID);
  const cfgSnap = await getDoc(cfgRef);
  const cfgData = cfgSnap.exists() ? (cfgSnap.data() as EditorConfigState) : null;
  if (cfgData?.categoriesInitialized) return;

  const existingSnap = await getDocs(collection(db, 'editor_categories'));
  const existingIds = new Set(existingSnap.docs.map((d) => d.id));

  const batch = writeBatch(db);
  for (const cat of DEFAULT_EDITOR_CATEGORIES) {
    if (!existingIds.has(cat.categoryId)) {
      batch.set(doc(db, 'editor_categories', cat.categoryId), {
        categoryId: cat.categoryId,
        label: cat.label,
        shortLabel: cat.shortLabel,
        tab: cat.tab,
        subCategory: cat.subCategory,
        trackNumber: cat.trackNumber,
        trackName: cat.trackName,
        accentHex: cat.accentHex,
        iconKey: cat.iconKey,
        orderIndex: cat.orderIndex,
        isBuiltIn: cat.isBuiltIn,
        hasLyricsBoxes: cat.hasLyricsBoxes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  if (cfgSnap.exists()) {
    batch.update(cfgRef, {
      categoriesInitialized: true,
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.set(cfgRef, {
      configId: EDITOR_CONFIG_DOC_ID,
      categoriesInitialized: true,
      musicLyricsInitialized: false,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function ensureMusicLyricsSeededInFirestore(force = false): Promise<number> {
  await ensureCategoriesSeededInFirestore();
  const cfgRef = doc(db, 'editor_config', EDITOR_CONFIG_DOC_ID);
  const cfgSnap = await getDoc(cfgRef);
  const cfgData = cfgSnap.exists() ? (cfgSnap.data() as EditorConfigState) : null;
  if (!force && cfgData?.musicLyricsInitialized) return 0;

  // Check parent music category exists (recreate if needed before seeding)
  const musicCatRef = doc(db, 'editor_categories', 'music');
  const musicCatSnap = await getDoc(musicCatRef);
  const musicCatTemplate = DEFAULT_EDITOR_CATEGORIES.find((c) => c.categoryId === 'music')!;
  if (!musicCatSnap.exists()) {
    await setDoc(musicCatRef, {
      ...musicCatTemplate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const existingSnap = await getDocs(
    query(collection(db, 'category_items'), where('categoryId', '==', 'music'))
  );
  const existingIds = new Set(existingSnap.docs.map((d) => d.id));
  const missingSongs = DEFAULT_MUSIC_LYRICS_SEED.filter((s) => !existingIds.has(s.itemId));

  // Commit in chunks of 350 to stay well under Firestore 500 batch limit
  for (let i = 0; i < missingSongs.length; i += 350) {
    const chunk = missingSongs.slice(i, i + 350);
    const batch = writeBatch(db);
    for (const song of chunk) {
      batch.set(doc(db, 'category_items', song.itemId), {
        itemId: song.itemId,
        categoryId: song.categoryId,
        title: song.title,
        subtitle: song.subtitle,
        lyrics: song.lyrics,
        badgeText: song.badgeText,
        orderIndex: song.orderIndex,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }

  if (cfgSnap.exists()) {
    await updateDoc(cfgRef, {
      musicLyricsInitialized: true,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(cfgRef, {
      configId: EDITOR_CONFIG_DOC_ID,
      categoriesInitialized: true,
      musicLyricsInitialized: true,
      updatedAt: serverTimestamp(),
    });
  }

  return missingSongs.length;
}

export function slugifyCategoryId(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || 'cat'}_${suffix}`;
}

export async function createDynamicCategory(input: {
  label: string;
  shortLabel: string;
  accentHex: string;
  iconKey: string;
  hasLyricsBoxes: boolean;
  orderIndex: number;
  trackNumber: number;
}): Promise<string> {
  await ensureCategoriesSeededInFirestore();
  const categoryId = slugifyCategoryId(input.label);
  const cleanLabel = input.label.trim().slice(0, 80) || 'Custom Category';
  const cleanShort = (input.shortLabel.trim() || cleanLabel).slice(0, 24);
  const path = `editor_categories/${categoryId}`;
  try {
    await setDoc(doc(db, 'editor_categories', categoryId), {
      categoryId,
      label: cleanLabel,
      shortLabel: cleanShort,
      tab: input.hasLyricsBoxes ? 'Audio' : 'Effects',
      subCategory: '',
      trackNumber: Math.max(1, Math.min(1000, Math.round(input.trackNumber))),
      trackName: cleanShort.slice(0, 40),
      accentHex: /^#[0-9a-fA-F]{6}$/.test(input.accentHex) ? input.accentHex : '#2dd4bf',
      iconKey: input.iconKey || 'sparkles',
      orderIndex: Math.max(0, Math.min(10000, Math.round(input.orderIndex))),
      isBuiltIn: false,
      hasLyricsBoxes: Boolean(input.hasLyricsBoxes),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return categoryId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateDynamicCategory(
  categoryId: string,
  updates: Partial<{
    label: string;
    shortLabel: string;
    accentHex: string;
    iconKey: string;
    hasLyricsBoxes: boolean;
    orderIndex: number;
    trackNumber: number;
  }>
): Promise<void> {
  await ensureCategoriesSeededInFirestore();
  const path = `editor_categories/${categoryId}`;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.label !== undefined) {
      payload.label = updates.label.trim().slice(0, 80) || 'Category';
    }
    if (updates.shortLabel !== undefined) {
      const s = updates.shortLabel.trim().slice(0, 24) || 'Cat';
      payload.shortLabel = s;
      payload.trackName = s.slice(0, 40);
    }
    if (updates.accentHex !== undefined && /^#[0-9a-fA-F]{6}$/.test(updates.accentHex)) {
      payload.accentHex = updates.accentHex;
    }
    if (updates.iconKey !== undefined) {
      payload.iconKey = updates.iconKey.slice(0, 32) || 'sparkles';
    }
    if (updates.hasLyricsBoxes !== undefined) {
      payload.hasLyricsBoxes = Boolean(updates.hasLyricsBoxes);
    }
    if (updates.orderIndex !== undefined) {
      payload.orderIndex = Math.max(0, Math.min(10000, Math.round(updates.orderIndex)));
    }
    if (updates.trackNumber !== undefined) {
      payload.trackNumber = Math.max(1, Math.min(1000, Math.round(updates.trackNumber)));
    }

    await updateDoc(doc(db, 'editor_categories', categoryId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteDynamicCategory(categoryId: string): Promise<void> {
  await ensureCategoriesSeededInFirestore();
  const path = `editor_categories/${categoryId}`;
  try {
    // Delete any attached items cleanly first
    const itemsSnap = await getDocs(
      query(collection(db, 'category_items'), where('categoryId', '==', categoryId))
    );
    for (let i = 0; i < itemsSnap.docs.length; i += 350) {
      const chunk = itemsSnap.docs.slice(i, i + 350);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }
    await deleteDoc(doc(db, 'editor_categories', categoryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createCategoryContentItem(input: {
  categoryId: string;
  title: string;
  subtitle?: string;
  lyrics: string;
  badgeText?: string;
  orderIndex: number;
}): Promise<string> {
  await ensureCategoriesSeededInFirestore();
  const itemId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `category_items/${itemId}`;
  try {
    await setDoc(doc(db, 'category_items', itemId), {
      itemId,
      categoryId: input.categoryId,
      title: (input.title.trim() || 'Untitled Entry').slice(0, 160),
      subtitle: (input.subtitle || '').trim().slice(0, 160),
      lyrics: input.lyrics.slice(0, 8000),
      badgeText: (input.badgeText || '').trim().slice(0, 40),
      orderIndex: Math.max(0, Math.min(10000, Math.round(input.orderIndex))),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return itemId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateCategoryContentItem(
  itemId: string,
  updates: Partial<{
    categoryId: string;
    title: string;
    subtitle: string;
    lyrics: string;
    badgeText: string;
    orderIndex: number;
  }>
): Promise<void> {
  const path = `category_items/${itemId}`;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.categoryId !== undefined) payload.categoryId = updates.categoryId;
    if (updates.title !== undefined) {
      payload.title = (updates.title.trim() || 'Untitled Entry').slice(0, 160);
    }
    if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle.trim().slice(0, 160);
    if (updates.lyrics !== undefined) payload.lyrics = updates.lyrics.slice(0, 8000);
    if (updates.badgeText !== undefined) payload.badgeText = updates.badgeText.trim().slice(0, 40);
    if (updates.orderIndex !== undefined) {
      payload.orderIndex = Math.max(0, Math.min(10000, Math.round(updates.orderIndex)));
    }
    await updateDoc(doc(db, 'category_items', itemId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteCategoryContentItem(itemId: string): Promise<void> {
  const path = `category_items/${itemId}`;
  try {
    await deleteDoc(doc(db, 'category_items', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function bulkImportCategoryLyrics(
  categoryId: string,
  rawText: string,
  startingOrderIndex: number
): Promise<number> {
  await ensureCategoriesSeededInFirestore();
  if (categoryId === 'music') {
    await ensureMusicLyricsSeededInFirestore();
  }

  const blocks = rawText
    .split(/\n\s*---+\s*\n|\n{3,}/g)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) return 0;

  let added = 0;
  for (let i = 0; i < blocks.length; i += 300) {
    const chunk = blocks.slice(i, i + 300);
    const batch = writeBatch(db);
    chunk.forEach((block, idx) => {
      const lines = block.split('\n');
      const firstLine = (lines[0] || '').trim();
      const restLines = lines.slice(1).join('\n').trim();
      const title = firstLine.replace(/^#+\s*/, '').slice(0, 160) || `Song #${startingOrderIndex + added + 1}`;
      const lyrics = (restLines || firstLine).slice(0, 8000);
      const itemId = `item_${Date.now()}_${i + idx}_${Math.random().toString(36).slice(2, 6)}`;
      batch.set(doc(db, 'category_items', itemId), {
        itemId,
        categoryId,
        title,
        subtitle: '',
        lyrics,
        badgeText: 'Lyrics',
        orderIndex: Math.min(10000, startingOrderIndex + added),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      added += 1;
    });
    await batch.commit();
  }

  return added;
}
