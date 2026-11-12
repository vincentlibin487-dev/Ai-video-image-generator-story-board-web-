import React, { useState } from 'react';
import { ShotItem, DirectorProject } from '../types/director';
import { Download, Copy, Check, X, FileText, Code, Table } from 'lucide-react';

interface BatchExportModalProps {
  project: DirectorProject;
  isOpen: boolean;
  onClose: () => void;
}

export const BatchExportModal: React.FC<BatchExportModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'kling' | 'luma' | 'midjourney' | 'csv' | 'json'>('kling');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate Exports
  const getKlingExport = () => {
    return project.shots
      .map(
        (s) =>
          `// SHOT ${s.shotNumber} (${s.durationSeconds}s) - ${s.sceneHeading}\n${s.generationPrompts.klingPrompt}\n`
      )
      .join('\n');
  };

  const getLumaExport = () => {
    return project.shots
      .map(
        (s) =>
          `// SHOT ${s.shotNumber} (${s.durationSeconds}s) - ${s.sceneHeading}\n${s.generationPrompts.lumaPrompt}\n`
      )
      .join('\n');
  };

  const getMidjourneyExport = () => {
    return project.shots
      .map(
        (s) =>
          `// SHOT ${s.shotNumber} (${s.durationSeconds}s)\n${s.generationPrompts.midjourneyPrompt}\n`
      )
      .join('\n');
  };

  const getCsvExport = () => {
    const headers = [
      'ShotNumber',
      'DurationSeconds',
      'SceneHeading',
      'ScriptSegment',
      'Characters',
      'DialogueOriginal',
      'DialogueEnglish',
      'Framing',
      'Movement',
      'Lens',
      'Lighting',
      'ColorGrade',
      'KlingPrompt',
      'LumaPrompt',
      'MidjourneyPrompt',
    ];

    const rows = project.shots.map((s) => [
      s.shotNumber,
      s.durationSeconds,
      `"${s.sceneHeading.replace(/"/g, '""')}"`,
      `"${s.scriptSegment.replace(/"/g, '""')}"`,
      `"${s.charactersPresent.join('; ')}"`,
      `"${(s.dialogue?.lineOriginal || '').replace(/"/g, '""')}"`,
      `"${(s.dialogue?.lineEnglish || '').replace(/"/g, '""')}"`,
      `"${s.cameraDetails.framing}"`,
      `"${s.cameraDetails.movement.replace(/"/g, '""')}"`,
      `"${s.cameraDetails.lens}"`,
      `"${s.lightingColor.lighting.replace(/"/g, '""')}"`,
      `"${s.lightingColor.colorGrade.replace(/"/g, '""')}"`,
      `"${s.generationPrompts.klingPrompt.replace(/"/g, '""')}"`,
      `"${s.generationPrompts.lumaPrompt.replace(/"/g, '""')}"`,
      `"${s.generationPrompts.midjourneyPrompt.replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  const getJsonExport = () => {
    return JSON.stringify(project, null, 2);
  };

  const getContent = () => {
    switch (activeTab) {
      case 'kling':
        return getKlingExport();
      case 'luma':
        return getLumaExport();
      case 'midjourney':
        return getMidjourneyExport();
      case 'csv':
        return getCsvExport();
      case 'json':
        return getJsonExport();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = getContent();
    const ext = activeTab === 'csv' ? 'csv' : activeTab === 'json' ? 'json' : 'txt';
    const filename = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'cine-breakdown'}-${activeTab}.${ext}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-[#0f111a] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-100 font-cinema uppercase tracking-wider">
              Export Production Prompts &amp; Shot Lists
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Production-ready export for AI video batch queues, crew call sheets, and editors.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-zinc-800/80 bg-zinc-950/50">
          {[
            { key: 'kling', label: 'Kling AI Batch', icon: FileText },
            { key: 'luma', label: 'Luma Dream Machine', icon: FileText },
            { key: 'midjourney', label: 'Midjourney v6 Prompts', icon: FileText },
            { key: 'csv', label: 'Production CSV Shot List', icon: Table },
            { key: 'json', label: 'Complete Project JSON', icon: Code },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
                  activeTab === tab.key
                    ? 'border-amber-400 text-amber-300 bg-zinc-900/80'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Code Content Area */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto bg-zinc-950 border border-zinc-800/90 rounded-xl p-4 font-mono-code text-xs text-zinc-300 leading-relaxed">
            <pre className="whitespace-pre-wrap">{getContent()}</pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-950 border-t border-zinc-800">
          <span className="text-xs text-zinc-500 font-mono-code">
            Total {project.shots.length} shots formatted for {activeTab.toUpperCase()}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
