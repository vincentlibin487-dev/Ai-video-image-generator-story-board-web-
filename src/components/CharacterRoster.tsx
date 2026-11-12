import React, { useState } from 'react';
import { CharacterProfile } from '../types/director';
import { User, Sparkles, Plus, Trash2, Camera, ShieldCheck, Tag, AlertCircle, Edit3 } from 'lucide-react';

interface CharacterRosterProps {
  characters: CharacterProfile[];
  onUpdateCharacters: (characters: CharacterProfile[]) => void;
  onAnalyzeCharacter: (characterId: string) => Promise<void>;
  isAnalyzingId: string | null;
}

const PRESET_AVATARS = [
  {
    name: 'Malayali Detective Mohan',
    role: 'Lead Detective',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    tags: 'Weathered 38yo South Indian Malayali man, dense salt-and-pepper stubble beard, wet black hair, olive-green rain jacket',
  },
  {
    name: 'Fugitive Antony',
    role: 'Antagonist',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    tags: '42yo South Indian man with right cheek scar, grey-streaked mustache, wet buzz-cut hair, oversized black hooded windbreaker',
  },
  {
    name: 'Anjali (Journalist)',
    role: 'Investigative Reporter',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    tags: '29yo South Indian woman, sharp obsidian eyes, wavy shoulder-length dark hair tied in messy bun, wearing a yellow hooded rain jacket with camera strap',
  },
  {
    name: 'Vikram (Officer)',
    role: 'Special Ops Commander',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    tags: '35yo athletic man, tactical haircut, clean-shaven with sharp jaw, wearing dark tactical vest over charcoal longsleeve',
  },
];

export const CharacterRoster: React.FC<CharacterRosterProps> = ({
  characters,
  onUpdateCharacters,
  onAnalyzeCharacter,
  isAnalyzingId,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharRole, setNewCharRole] = useState('Protagonist');
  const [newCharPhoto, setNewCharPhoto] = useState('');
  const [newCharTags, setNewCharTags] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCharPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCharacter = () => {
    if (!newCharName.trim()) return;
    const newChar: CharacterProfile = {
      id: `char-${Date.now()}`,
      name: newCharName.trim(),
      role: newCharRole,
      photoUrl: newCharPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      visualContinuityTags: newCharTags || `Cinematic character, authentic visual presence, consistent wardrobe matching ${newCharRole}`,
      keyFeatures: ['Distinct cinematic appearance', 'Signature outfit'],
    };

    const updated = [...characters, newChar];
    onUpdateCharacters(updated);

    // If a custom photo was provided, auto-trigger analysis
    if (newCharPhoto) {
      onAnalyzeCharacter(newChar.id);
    }

    // Reset modal
    setNewCharName('');
    setNewCharRole('Protagonist');
    setNewCharPhoto('');
    setNewCharTags('');
    setShowAddModal(false);
  };

  const handleRemove = (id: string) => {
    onUpdateCharacters(characters.filter((c) => c.id !== id));
  };

  const handleQuickAddPreset = (preset: typeof PRESET_AVATARS[0]) => {
    const newChar: CharacterProfile = {
      id: `char-${Date.now()}`,
      name: preset.name,
      role: preset.role,
      photoUrl: preset.url,
      visualContinuityTags: preset.tags,
      keyFeatures: preset.tags.split(',').map((s) => s.trim()),
    };
    onUpdateCharacters([...characters, newChar]);
  };

  return (
    <div className="bg-[#0f111a] border border-zinc-800/80 rounded-2xl p-5 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h2 className="text-base font-semibold text-zinc-100 uppercase tracking-wider font-cinema">
              Character Continuity Roster
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Uploaded character photos are scanned by Gemini to extract immutable facial &amp; wardrobe continuity anchors for all AI generation prompts.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Character
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="p-6 border border-dashed border-zinc-800 rounded-xl text-center bg-zinc-950/40">
          <User className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
          <p className="text-sm text-zinc-300 font-medium">No characters added yet</p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1 mb-4">
            Upload character reference photos so our AI Director guarantees 100% face and wardrobe continuity across every generated shot.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
            >
              Upload Custom Photo
            </button>
            <span className="text-xs text-zinc-600">or pick quick cast:</span>
            {PRESET_AVATARS.slice(0, 2).map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleQuickAddPreset(preset)}
                className="px-2.5 py-1 text-xs rounded-md bg-zinc-900 border border-zinc-700/60 hover:border-amber-500/50 text-zinc-300 transition-colors cursor-pointer"
              >
                + {preset.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char) => {
            const isAnalyzing = isAnalyzingId === char.id;
            return (
              <div
                key={char.id}
                className="group relative bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3.5 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-700/60 shrink-0">
                    <img
                      src={char.photoUrl}
                      alt={char.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <span className="absolute bottom-1 left-1 text-[9px] font-mono-code font-bold px-1 rounded bg-amber-500/90 text-zinc-950">
                      REF
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="text-sm font-semibold text-zinc-100 truncate">{char.name}</h3>
                      <button
                        onClick={() => handleRemove(char.id)}
                        className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                        title="Remove character"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="inline-block text-[11px] font-medium text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 mt-0.5">
                      {char.role}
                    </span>

                    {char.age && (
                      <p className="text-[11px] text-zinc-400 mt-1">
                        {char.age} {char.ethnicity ? `• ${char.ethnicity}` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Continuity Tags Box */}
                <div className="mt-3 bg-zinc-950/70 border border-zinc-800/90 rounded-lg p-2.5">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                    <span className="flex items-center gap-1 text-amber-400 font-mono-code font-semibold">
                      <Tag className="w-3 h-3" /> Continuity Anchor Token
                    </span>
                    <button
                      onClick={() => setEditingId(editingId === char.id ? null : char.id)}
                      className="text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      {editingId === char.id ? 'Close' : 'Edit'}
                    </button>
                  </div>

                  {editingId === char.id ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={char.visualContinuityTags}
                        onChange={(e) => {
                          const val = e.target.value;
                          onUpdateCharacters(
                            characters.map((c) =>
                              c.id === char.id ? { ...c, visualContinuityTags: val } : c
                            )
                          );
                        }}
                        rows={3}
                        className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded p-1.5 text-zinc-200 focus:outline-none focus:border-amber-500"
                        placeholder="Visual continuity description for prompts..."
                      />
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-[11px] px-2 py-1 bg-amber-500/20 text-amber-300 rounded hover:bg-amber-500/30 font-medium"
                      >
                        Save Anchor
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                      "{char.visualContinuityTags}"
                    </p>
                  )}
                </div>

                {/* AI Re-Analyze Action */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-800/50">
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Locked for Shots</span>
                  </div>

                  <button
                    onClick={() => onAnalyzeCharacter(char.id)}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    {isAnalyzing ? 'Analyzing Face...' : 'AI Scan Face'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Character Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#12141e] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-zinc-100 font-cinema mb-1">
              Add New Cast Character
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Upload a character photo or choose a preset. Gemini will extract high-fidelity facial anchors.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Character Name</label>
                <input
                  type="text"
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  placeholder="e.g. Inspector Mohan / മോഹൻ"
                  className="w-full text-sm bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Role / Function</label>
                <input
                  type="text"
                  value={newCharRole}
                  onChange={(e) => setNewCharRole(e.target.value)}
                  placeholder="e.g. Protagonist, Crime Branch Inspector, Antagonist"
                  className="w-full text-sm bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Character Photo</label>
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-lg bg-zinc-950 border border-dashed border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                    {newCharPhoto ? (
                      <img src={newCharPhoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-block px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg cursor-pointer transition-colors border border-zinc-700">
                      Upload Photo File
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <p className="text-[11px] text-zinc-500 mt-1">PNG, JPG, or WEBP. Clear facial view recommended.</p>
                  </div>
                </div>
              </div>

              {/* Quick Pick Cast Presets */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Or pick a ready-to-direct cinematic cast member:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_AVATARS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setNewCharName(preset.name);
                        setNewCharRole(preset.role);
                        setNewCharPhoto(preset.url);
                        setNewCharTags(preset.tags);
                      }}
                      className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950/70 border border-zinc-800 hover:border-amber-500/50 text-left transition-colors"
                    >
                      <img src={preset.url} alt={preset.name} className="w-8 h-8 rounded object-cover shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-200 truncate">{preset.name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{preset.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Visual Continuity Tags (Optional hint)
                </label>
                <textarea
                  value={newCharTags}
                  onChange={(e) => setNewCharTags(e.target.value)}
                  rows={2}
                  placeholder="Specific beard, hair, eye color, or signature jacket... (Gemini will enrich automatically)"
                  className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCharacter}
                disabled={!newCharName.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg transition-colors disabled:opacity-50"
              >
                Save &amp; Analyze Character
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
