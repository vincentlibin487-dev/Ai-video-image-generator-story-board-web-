import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  FolderPlus,
  Layers,
  ListPlus,
  Music,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  bulkImportCategoryLyrics,
  CATEGORY_ICON_OPTIONS,
  createCategoryContentItem,
  createDynamicCategory,
  DEFAULT_EDITOR_CATEGORIES,
  DEFAULT_MUSIC_LYRICS_SEED,
  deleteCategoryContentItem,
  deleteDynamicCategory,
  ensureCategoriesSeededInFirestore,
  ensureMusicLyricsSeededInFirestore,
  getCategoryIconComponent,
  subscribeDynamicEditorCatalog,
  updateCategoryContentItem,
  updateDynamicCategory,
  type DynamicCategoryItem,
  type DynamicEditorCategory,
  type EditorConfigState,
} from '../lib/dynamicCategories';

interface AdminCategoriesManagerProps {
  isMl: boolean;
}

const ACCENT_SWATCHES = [
  '#2dd4bf',
  '#14b8a6',
  '#22d3ee',
  '#38bdf8',
  '#34d399',
  '#10b981',
  '#fbbf24',
  '#f59e0b',
  '#fb7185',
  '#c084fc',
  '#f472b6',
  '#a3e635',
];

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export const AdminCategoriesManager: React.FC<AdminCategoriesManagerProps> = ({ isMl }) => {
  const [categories, setCategories] = useState<DynamicEditorCategory[]>(DEFAULT_EDITOR_CATEGORIES);
  const [items, setItems] = useState<DynamicCategoryItem[]>(DEFAULT_MUSIC_LYRICS_SEED);
  const [configState, setConfigState] = useState<EditorConfigState | null>(null);
  const [seedingBusy, setSeedingBusy] = useState<boolean>(false);
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Category Create / Edit Form State
  const [showCategoryForm, setShowCategoryForm] = useState<boolean>(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catLabel, setCatLabel] = useState<string>('');
  const [catShortLabel, setCatShortLabel] = useState<string>('');
  const [catAccentHex, setCatAccentHex] = useState<string>('#2dd4bf');
  const [catIconKey, setCatIconKey] = useState<string>('sparkles');
  const [catHasLyricsBoxes, setCatHasLyricsBoxes] = useState<boolean>(true);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);

  // Selected Category for Song / Lyrics Boxes
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('music');
  const [boxSearchQuery, setBoxSearchQuery] = useState<string>('');
  const [visibleBoxLimit, setVisibleBoxLimit] = useState<number>(30);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  // Add New Song / Item Box Form
  const [showAddBoxForm, setShowAddBoxForm] = useState<boolean>(false);
  const [newItemTitle, setNewItemTitle] = useState<string>('');
  const [newItemSubtitle, setNewItemSubtitle] = useState<string>('');
  const [newItemBadge, setNewItemBadge] = useState<string>('Lyrics');
  const [newItemLyrics, setNewItemLyrics] = useState<string>('');

  // Bulk Paste Import
  const [showBulkForm, setShowBulkForm] = useState<boolean>(false);
  const [bulkText, setBulkText] = useState<string>('');

  // Inline Edit Song / Item Box
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemTitle, setEditItemTitle] = useState<string>('');
  const [editItemSubtitle, setEditItemSubtitle] = useState<string>('');
  const [editItemBadge, setEditItemBadge] = useState<string>('');
  const [editItemLyrics, setEditItemLyrics] = useState<string>('');
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeDynamicEditorCatalog({
      onCategoriesChange: (cats) => {
        setCategories(cats);
      },
      onItemsChange: (list) => {
        setItems(list);
      },
      onConfigChange: (cfg) => {
        setConfigState(cfg);
      },
    });
    return unsub;
  }, []);

  // Automatically bootstrap the 14 existing categories + 120 Music lyrics in Firestore once
  useEffect(() => {
    let active = true;
    setSeedingBusy(true);
    ensureCategoriesSeededInFirestore()
      .then(() => ensureMusicLyricsSeededInFirestore(false))
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
      })
      .finally(() => {
        if (active) setSeedingBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Keep selectedCategoryId valid if the selected category is deleted
  useEffect(() => {
    if (categories.length === 0) return;
    if (!categories.some((c) => c.categoryId === selectedCategoryId)) {
      const musicCat = categories.find((c) => c.categoryId === 'music');
      setSelectedCategoryId(musicCat ? musicCat.categoryId : categories[0].categoryId);
    }
  }, [categories, selectedCategoryId]);

  const itemCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      map[item.categoryId] = (map[item.categoryId] || 0) + 1;
    }
    return map;
  }, [items]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.categoryId === selectedCategoryId) || categories[0] || null,
    [categories, selectedCategoryId]
  );

  const filteredBoxes = useMemo(() => {
    const targetId = activeCategory?.categoryId || selectedCategoryId;
    const q = boxSearchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (item.categoryId !== targetId) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.badgeText.toLowerCase().includes(q) ||
        item.lyrics.toLowerCase().includes(q)
      );
    });
  }, [items, activeCategory?.categoryId, selectedCategoryId, boxSearchQuery]);

  const openAddCategoryForm = () => {
    setEditingCategoryId(null);
    setCatLabel('');
    setCatShortLabel('');
    setCatAccentHex('#2dd4bf');
    setCatIconKey('sparkles');
    setCatHasLyricsBoxes(true);
    setShowCategoryForm(true);
    setErrorMessage(null);
    setStatusMessage(null);
  };

  const openEditCategoryForm = (cat: DynamicEditorCategory) => {
    setEditingCategoryId(cat.categoryId);
    setCatLabel(cat.label);
    setCatShortLabel(cat.shortLabel);
    setCatAccentHex(cat.accentHex || '#2dd4bf');
    setCatIconKey(cat.iconKey || 'sparkles');
    setCatHasLyricsBoxes(Boolean(cat.hasLyricsBoxes));
    setShowCategoryForm(true);
    setErrorMessage(null);
    setStatusMessage(null);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catLabel.trim()) {
      setErrorMessage(isMl ? 'കാറ്റഗറി പേര് നൽകുക.' : 'Please enter a category name.');
      return;
    }
    setActionBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      if (editingCategoryId) {
        await updateDynamicCategory(editingCategoryId, {
          label: catLabel,
          shortLabel: catShortLabel || catLabel,
          accentHex: catAccentHex,
          iconKey: catIconKey,
          hasLyricsBoxes: catHasLyricsBoxes,
        });
        setStatusMessage(
          isMl ? `"${catLabel}" അപ്ഡേറ്റ് ചെയ്തു.` : `Updated category "${catLabel}".`
        );
      } else {
        const nextOrder =
          categories.length > 0 ? Math.max(...categories.map((c) => c.orderIndex)) + 1 : 0;
        const nextTrack =
          categories.length > 0 ? Math.max(...categories.map((c) => c.trackNumber)) + 1 : 15;
        const createdId = await createDynamicCategory({
          label: catLabel,
          shortLabel: catShortLabel || catLabel,
          accentHex: catAccentHex,
          iconKey: catIconKey,
          hasLyricsBoxes: catHasLyricsBoxes,
          orderIndex: nextOrder,
          trackNumber: nextTrack,
        });
        setSelectedCategoryId(createdId);
        setStatusMessage(
          isMl
            ? `"${catLabel}" ചേർത്തു — വെബ്സൈറ്റിലും എഡിറ്ററിലും ഉടൻ അപ്ഡേറ്റ് ആകും.`
            : `Added "${catLabel}" — live across the app now.`
        );
      }
      setShowCategoryForm(false);
      setEditingCategoryId(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setActionBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await deleteDynamicCategory(categoryId);
      setConfirmDeleteCatId(null);
      setStatusMessage(
        isMl
          ? 'കാറ്റഗറി ഡിലീറ്റ് ചെയ്തു — വെബ്സൈറ്റിൽ നിന്നും നീക്കം ചെയ്തു.'
          : 'Category deleted and removed from the live editor.'
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setActionBusy(false);
    }
  };

  const handleAddBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory) return;
    if (!newItemTitle.trim() && !newItemLyrics.trim()) {
      setErrorMessage(isMl ? 'പേര് അല്ലെങ്കിൽ വരികൾ നൽകുക.' : 'Enter a song title or lyrics.');
      return;
    }
    setActionBusy(true);
    setErrorMessage(null);
    try {
      const catItems = items.filter((i) => i.categoryId === activeCategory.categoryId);
      const nextOrder = catItems.length > 0 ? Math.max(...catItems.map((i) => i.orderIndex)) + 1 : 0;
      await createCategoryContentItem({
        categoryId: activeCategory.categoryId,
        title: newItemTitle.trim() || `Song #${catItems.length + 1}`,
        subtitle: newItemSubtitle.trim(),
        badgeText: newItemBadge.trim(),
        lyrics: newItemLyrics.trim() || newItemTitle.trim(),
        orderIndex: nextOrder,
      });
      setNewItemTitle('');
      setNewItemSubtitle('');
      setNewItemLyrics('');
      setShowAddBoxForm(false);
      setStatusMessage(
        isMl
          ? 'പുതിയ പാട്ട് / ബോക്സ് ചേർത്തു.'
          : `Added new box to "${activeCategory.shortLabel}".`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add box');
    } finally {
      setActionBusy(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory || !bulkText.trim()) return;
    setActionBusy(true);
    setErrorMessage(null);
    try {
      const catItems = items.filter((i) => i.categoryId === activeCategory.categoryId);
      const nextOrder = catItems.length > 0 ? Math.max(...catItems.map((i) => i.orderIndex)) + 1 : 0;
      const count = await bulkImportCategoryLyrics(activeCategory.categoryId, bulkText, nextOrder);
      setBulkText('');
      setShowBulkForm(false);
      setStatusMessage(
        isMl
          ? `${count} പാട്ടുകൾ വെവ്വേറെ ബോക്സുകളായി ചേർത്തു.`
          : `Imported ${count} songs into separate boxes.`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Bulk import failed');
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveEditedBox = async (itemId: string) => {
    setActionBusy(true);
    setErrorMessage(null);
    try {
      await updateCategoryContentItem(itemId, {
        title: editItemTitle,
        subtitle: editItemSubtitle,
        badgeText: editItemBadge,
        lyrics: editItemLyrics,
      });
      setEditingItemId(null);
      setStatusMessage(isMl ? 'മാറ്റങ്ങൾ സേവ് ചെയ്തു.' : 'Saved box changes.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteBox = async (itemId: string) => {
    setActionBusy(true);
    setErrorMessage(null);
    try {
      await deleteCategoryContentItem(itemId);
      setConfirmDeleteItemId(null);
      setStatusMessage(isMl ? 'ബോക്സ് ഡിലീറ്റ് ചെയ്തു.' : 'Deleted box.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setActionBusy(false);
    }
  };

  const handleCopyLyrics = async (item: DynamicCategoryItem) => {
    const text = item.lyrics.trim() ? item.lyrics : item.title;
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedItemId(item.itemId);
      window.setTimeout(() => {
        setCopiedItemId((cur) => (cur === item.itemId ? null : cur));
      }, 1500);
    }
  };

  const handleForceSeedMusic = async () => {
    setSeedingBusy(true);
    setErrorMessage(null);
    try {
      const added = await ensureMusicLyricsSeededInFirestore(true);
      setStatusMessage(
        isMl
          ? `${added} പാട്ടുകൾ Music കാറ്റഗറിയിൽ ലോഡ് ചെയ്തു.`
          : added > 0
          ? `Loaded ${added} songs into Music.`
          : 'All 120 Music songs are already loaded.'
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not seed Music songs');
    } finally {
      setSeedingBusy(false);
    }
  };

  return (
    <div className="bg-[#11131f] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-5">
      {/* Header + +Category Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white flex flex-wrap items-center gap-2">
              <span>
                {isMl
                  ? 'എഡിറ്റർ കാറ്റഗറികളും ഗാനവരികളും (Live Sync)'
                  : 'Editor Categories & Song Lyrics Manager'}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 tabular-nums">
                {categories.length} {isMl ? 'കാറ്റഗറികൾ' : 'Categories'}
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isMl
                ? 'ഇവിടെ ചേർക്കുകയോ എഡിറ്റ് ചെയ്യുകയോ ഡിലീറ്റ് ചെയ്യുകയോ ചെയ്യുന്ന കാറ്റഗറികളും പാട്ട് ബോക്സുകളും ഉടൻ ആപ്പിൽ അപ്ഡേറ്റ് ആകും.'
                : 'Add, edit, or delete categories and separate song lyrics boxes here — synced automatically to the user-facing editor.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {seedingBusy && (
            <span className="text-[11px] font-mono text-amber-300 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              Syncing defaults...
            </span>
          )}
          <button
            type="button"
            onClick={openAddCategoryForm}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-teal-500/20"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ Category</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center justify-between gap-2">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 text-red-300 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between gap-2">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="p-1 text-emerald-300 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Add / Edit Category Modal-Style Inline Card */}
      {showCategoryForm && (
        <form
          onSubmit={handleSaveCategory}
          className="p-4 rounded-xl bg-[#0b0e17] border border-teal-500/40 space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-extrabold text-teal-300">
              {editingCategoryId
                ? isMl
                  ? 'കാറ്റഗറി എഡിറ്റ് ചെയ്യുക'
                  : 'Edit Category'
                : isMl
                ? 'പുതിയ കാറ്റഗറി ചേർക്കുക (+ Category)'
                : 'Create New Category (+ Category)'}
            </h4>
            <button
              type="button"
              onClick={() => setShowCategoryForm(false)}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-zinc-300">
                {isMl ? 'കാറ്റഗറി പേര് (Category Name)' : 'Category Name'}
              </span>
              <input
                type="text"
                value={catLabel}
                onChange={(e) => {
                  setCatLabel(e.target.value);
                  if (!editingCategoryId && !catShortLabel) {
                    setCatShortLabel(e.target.value.slice(0, 10));
                  }
                }}
                placeholder="e.g., Trending Songs / Dialogue Lyrics"
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-teal-400 text-xs text-white focus:outline-none"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-zinc-300">
                {isMl ? 'വീൽ ഷോർട്ട് പേര് (Short Wheel Label)' : 'Short Wheel Label'}
              </span>
              <input
                type="text"
                value={catShortLabel}
                onChange={(e) => setCatShortLabel(e.target.value.slice(0, 14))}
                placeholder="e.g., Lyrics"
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-teal-400 text-xs text-white focus:outline-none"
                required
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-300 block">
              {isMl ? 'നിറം തിരഞ്ഞെടുക്കുക (Accent Color)' : 'Accent Color'}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENT_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setCatAccentHex(hex)}
                  style={{ backgroundColor: hex }}
                  className={`w-7 h-7 rounded-lg cursor-pointer transition-transform ${
                    catAccentHex === hex
                      ? 'ring-2 ring-white scale-110'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                  title={hex}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-300 block">
              {isMl ? 'ഐക്കൺ തിരഞ്ഞെടുക്കുക (Wheel Icon)' : 'Wheel Icon'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_ICON_OPTIONS.map((opt) => {
                const IconComp = opt.icon;
                const active = catIconKey === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setCatIconKey(opt.key)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-teal-400/20 border-teal-400 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" style={{ color: catAccentHex }} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={catHasLyricsBoxes}
              onChange={(e) => setCatHasLyricsBoxes(e.target.checked)}
              className="w-4 h-4 accent-teal-400"
            />
            <span className="text-xs text-zinc-200 font-semibold">
              {isMl
                ? 'പാട്ട് / വരികൾ വെവ്വേറെ കോപ്പി ബോക്സുകളായി കാണിക്കുക (Copy Button)'
                : 'Display items in separate copyable Lyrics / Text boxes (with 1-click Copy button)'}
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCategoryForm(false)}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 cursor-pointer"
            >
              {isMl ? 'റദ്ദാക്കുക' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={actionBusy}
              className="min-h-[38px] px-5 py-1.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-extrabold cursor-pointer disabled:opacity-50"
            >
              {actionBusy
                ? isMl
                  ? 'സേവ് ചെയ്യുന്നു...'
                  : 'Saving...'
                : editingCategoryId
                ? isMl
                  ? 'മാറ്റങ്ങൾ സേവ് ചെയ്യുക'
                  : 'Save Category'
                : isMl
                ? 'കാറ്റഗറി ചേർക്കുക'
                : 'Create Category'}
            </button>
          </div>
        </form>
      )}

      {/* Existing 14 + Custom Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
        {categories.map((cat) => {
          const IconComp = getCategoryIconComponent(cat.iconKey);
          const itemCount = itemCountByCategory[cat.categoryId] || 0;
          const isSelected = activeCategory?.categoryId === cat.categoryId;
          const confirmingDelete = confirmDeleteCatId === cat.categoryId;

          return (
            <div
              key={cat.categoryId}
              className={`rounded-xl border p-3 flex flex-col justify-between gap-2.5 transition-colors ${
                isSelected
                  ? 'bg-[#161c2d] border-teal-400/70'
                  : 'bg-[#0b0e17] border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(cat.categoryId);
                    setVisibleBoxLimit(30);
                  }}
                  className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer flex-1"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0"
                    style={{
                      backgroundColor: `${cat.accentHex}1a`,
                      borderColor: `${cat.accentHex}44`,
                    }}
                  >
                    <IconComp className="w-4 h-4" style={{ color: cat.accentHex }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white truncate">{cat.label}</div>
                    <div className="text-[10.5px] text-zinc-400 font-mono truncate">
                      {cat.shortLabel} · {itemCount > 0 ? `${itemCount} boxes` : cat.isBuiltIn ? 'Built-in' : 'Custom'}
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(cat.categoryId);
                    setVisibleBoxLimit(30);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer ${
                    isSelected
                      ? 'bg-teal-400 text-black'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {isMl ? 'ബോക്സുകൾ' : 'Boxes / Lyrics'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditCategoryForm(cat)}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                    title="Edit Category"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {confirmingDelete ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleDeleteCategory(cat.categoryId)}
                        disabled={actionBusy}
                        className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-extrabold cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCatId(null)}
                        className="px-1.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-[10px] font-bold cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCatId(cat.categoryId)}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 border border-zinc-800 hover:border-red-500/40 text-zinc-400 hover:text-red-300 cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Category Separate Song / Lyrics Boxes Manager */}
      {activeCategory && (
        <div className="rounded-2xl bg-[#0b0e17] border border-zinc-800 p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Music className="w-4 h-4 text-teal-400 shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-white">
                  {activeCategory.label} —{' '}
                  <span className="text-teal-300">
                    {filteredBoxes.length} {isMl ? 'വെവ്വേറെ ബോക്സുകൾ' : 'Separate Boxes'}
                  </span>
                </h4>
                <p className="text-[11px] text-zinc-400">
                  {isMl
                    ? 'ഓരോ പാട്ടിന്റെ വരികളും വെവ്വേറെ ബോക്സിൽ കോപ്പി ബട്ടണോടെ ഉപയോക്താക്കൾക്ക് ലഭിക്കും.'
                    : 'Each song or item renders in its own separate box with a 1-click Copy button in the editor.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeCategory.categoryId === 'music' && !configState?.musicLyricsInitialized && (
                <button
                  type="button"
                  onClick={() => void handleForceSeedMusic()}
                  disabled={seedingBusy}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load 120 Songs</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowBulkForm((v) => !v);
                  setShowAddBoxForm(false);
                }}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>{isMl ? 'ഒന്നിച്ച് ചേർക്കുക' : 'Bulk Import'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddBoxForm((v) => !v);
                  setShowBulkForm(false);
                }}
                className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isMl ? '+ പാട്ട് / ബോക്സ്' : '+ Add Song / Box'}</span>
              </button>
            </div>
          </div>

          {/* Add Single Song / Lyrics Box Form */}
          {showAddBoxForm && (
            <form
              onSubmit={handleAddBox}
              className="p-3.5 rounded-xl bg-[#111522] border border-teal-500/40 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="Song Title (e.g., Monsoon Melody)"
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white focus:border-teal-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={newItemSubtitle}
                  onChange={(e) => setNewItemSubtitle(e.target.value)}
                  placeholder="Mood / Artist (optional)"
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white focus:border-teal-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={newItemBadge}
                  onChange={(e) => setNewItemBadge(e.target.value)}
                  placeholder="Badge (e.g., Funny, Love)"
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white focus:border-teal-400 focus:outline-none"
                />
              </div>
              <textarea
                rows={4}
                value={newItemLyrics}
                onChange={(e) => setNewItemLyrics(e.target.value)}
                placeholder="Paste or type the song lyrics for this box..."
                className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white focus:border-teal-400 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBoxForm(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-4 py-1.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-extrabold cursor-pointer disabled:opacity-50"
                >
                  Save Box
                </button>
              </div>
            </form>
          )}

          {/* Bulk Import Multiple Songs Form */}
          {showBulkForm && (
            <form
              onSubmit={handleBulkImport}
              className="p-3.5 rounded-xl bg-[#111522] border border-amber-500/40 space-y-2.5"
            >
              <div className="text-xs font-bold text-amber-300">
                Paste 100–150 songs below — separate each song with <code className="text-white">---</code> on its own line (first line = Song Title, lines below = Lyrics):
              </div>
              <textarea
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`Song One Title\nFirst line of lyrics...\nSecond line of lyrics...\n---\nSong Two Title\nChorus line here...`}
                className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkForm(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy || !bulkText.trim()}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold cursor-pointer disabled:opacity-50"
                >
                  Import Separate Boxes
                </button>
              </div>
            </form>
          )}

          {/* Filter Search within Selected Category Boxes */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={boxSearchQuery}
              onChange={(e) => {
                setBoxSearchQuery(e.target.value);
                setVisibleBoxLimit(30);
              }}
              placeholder={
                isMl ? 'പാട്ട് അല്ലെങ്കിൽ വരികൾ തിരയുക...' : 'Search songs, titles, or lyrics...'
              }
              className="w-full min-h-[38px] pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:border-teal-400 focus:outline-none"
            />
          </div>

          {/* Separate Boxes Grid */}
          {filteredBoxes.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-400">
              {isMl
                ? 'ഈ കാറ്റഗറിയിൽ ഇതുവരെ ബോക്സുകൾ ചേർത്തിട്ടില്ല. മുകളിലുള്ള "+ Add Song / Box" അമർത്തി ചേർക്കാം.'
                : 'No boxes in this category yet. Click "+ Add Song / Box" or "Bulk Import" above to add entries.'}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredBoxes.slice(0, visibleBoxLimit).map((item) => {
                  const isEditing = editingItemId === item.itemId;
                  const isCopied = copiedItemId === item.itemId;
                  const confirmingDel = confirmDeleteItemId === item.itemId;

                  return (
                    <div
                      key={item.itemId}
                      className="rounded-xl bg-[#111522] border border-zinc-800 p-3 flex flex-col justify-between gap-2.5"
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editItemTitle}
                            onChange={(e) => setEditItemTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                            placeholder="Title"
                          />
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              value={editItemSubtitle}
                              onChange={(e) => setEditItemSubtitle(e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-[11px] text-white"
                              placeholder="Mood"
                            />
                            <input
                              type="text"
                              value={editItemBadge}
                              onChange={(e) => setEditItemBadge(e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-[11px] text-white"
                              placeholder="Badge"
                            />
                          </div>
                          <textarea
                            rows={4}
                            value={editItemLyrics}
                            onChange={(e) => setEditItemLyrics(e.target.value)}
                            className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-700 text-[11px] text-zinc-200"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 text-[11px] font-bold text-zinc-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSaveEditedBox(item.itemId)}
                              disabled={actionBusy}
                              className="px-3 py-1 rounded-lg bg-teal-400 text-black text-[11px] font-extrabold cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold text-white truncate">
                                  {item.title}
                                </div>
                                {item.subtitle && (
                                  <div className="text-[10.5px] text-zinc-400 truncate">
                                    {item.subtitle}
                                  </div>
                                )}
                              </div>
                              {item.badgeText && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/15 border border-teal-500/30 text-teal-300 shrink-0">
                                  {item.badgeText}
                                </span>
                              )}
                            </div>

                            <pre className="text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap font-sans max-h-32 overflow-y-auto bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5">
                              {item.lyrics || item.title}
                            </pre>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/70">
                            <button
                              type="button"
                              onClick={() => void handleCopyLyrics(item)}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                                isCopied
                                  ? 'bg-emerald-500 text-black'
                                  : 'bg-teal-400/15 hover:bg-teal-400/25 border border-teal-400/40 text-teal-300'
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(item.itemId);
                                  setEditItemTitle(item.title);
                                  setEditItemSubtitle(item.subtitle);
                                  setEditItemBadge(item.badgeText);
                                  setEditItemLyrics(item.lyrics);
                                }}
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
                                title="Edit Box"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {confirmingDel ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteBox(item.itemId)}
                                  className="px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-extrabold cursor-pointer"
                                >
                                  Confirm
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteItemId(item.itemId)}
                                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 border border-zinc-800 text-zinc-400 hover:text-red-300 cursor-pointer"
                                  title="Delete Box"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredBoxes.length > visibleBoxLimit && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleBoxLimit((n) => n + 40)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-teal-300 cursor-pointer"
                  >
                    Show More ({filteredBoxes.length - visibleBoxLimit} remaining)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleBoxLimit(filteredBoxes.length)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 cursor-pointer"
                  >
                    Show All ({filteredBoxes.length})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
