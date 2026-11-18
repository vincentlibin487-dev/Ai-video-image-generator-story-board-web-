import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Sliders,
  Type,
  Layers,
  Download,
  Upload,
  Crop,
  RotateCw,
  Sparkles,
  Trash2,
  Undo2,
  Redo2,
  Palette,
  Maximize2,
  Brush,
  Square,
  Circle,
  Move,
  Check,
  X,
  FileText,
  Wand2,
  Camera,
  Layers3,
  Smile,
  LayoutGrid,
  Sun,
  Contrast,
  Droplet,
  Eye,
  Zap,
  PlusCircle,
  PenTool,
  Cloud,
  CloudUpload,
  Cpu,
  Eraser,
  Scissors,
  ShieldCheck,
  SlidersHorizontal,
  FolderOpen,
  Settings,
  Share2,
  HelpCircle,
  Search,
  Lock,
  ChevronDown,
  Plus,
  Folder,
} from 'lucide-react';
import type { AppLang } from '../lib/i18n';

export interface ImageEditorStudioProps {
  lang: AppLang;
  onClose?: () => void;
}

interface LayerItem {
  id: string;
  name: string;
  type: 'image' | 'text' | 'shape' | 'sticker' | 'drawing';
  content?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontColor?: string;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  visible: boolean;
  locked?: boolean;
}

export const ImageEditorStudio: React.FC<ImageEditorStudioProps> = ({ lang, onClose }) => {
  const isMl = lang === 'ml';

  // New Project Setup State
  const [projectCreated, setProjectCreated] = useState<boolean>(false);
  const [projectName, setProjectName] = useState<string>('My Cinematic Poster');
  const [projectWidth, setProjectWidth] = useState<number>(1920);
  const [projectHeight, setProjectHeight] = useState<number>(1080);
  const [projectAspect, setProjectAspect] = useState<'16:9' | '9:16' | '1:1' | '2.39:1'>('16:9');
  const [projectBgColor, setProjectBgColor] = useState<string>('#11131f');

  // Document & Canvas State
  const [docs, setDocs] = useState<Array<{ id: string; name: string; active: boolean }>>([
    { id: 'doc_1', name: 'poster.psd', active: true },
  ]);
  const [activeDocName, setActiveDocName] = useState<string>('poster.psd');
  const [imageUrl, setImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80'
  );

  // Active Photoshop Left Tool
  const [activeTool, setActiveTool] = useState<string>('move');

  // Right Panel Tab ('color' | 'properties' | 'layers')
  const [rightPanelTab, setRightPanelTab] = useState<'color' | 'properties' | 'layers'>('layers');

  // Adjustments
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [brushOpacity, setBrushOpacity] = useState<number>(93);

  // Layers stack
  const [layers, setLayers] = useState<LayerItem[]>([
    {
      id: 'layer_1',
      name: 'Layer 1',
      type: 'image',
      x: 0,
      y: 0,
      opacity: 100,
      blendMode: 'normal',
      visible: true,
      locked: false,
    },
    {
      id: 'layer_bg',
      name: 'Background',
      type: 'image',
      x: 0,
      y: 0,
      opacity: 100,
      blendMode: 'normal',
      visible: true,
      locked: true,
    },
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('layer_1');

  // Text tools
  const [newTextContent, setNewTextContent] = useState<string>('');
  const [newTextSize, setNewTextSize] = useState<number>(48);
  const [newTextColor, setNewTextColor] = useState<string>('#fbbf24');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCreateProject = () => {
    setProjectCreated(true);
    setActiveDocName(`${projectName.replace(/\s+/g, '_')}.psd`);
    setDocs([{ id: 'doc_1', name: `${projectName.replace(/\s+/g, '_')}.psd`, active: true }]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    const newDocName = file.name;
    setActiveDocName(newDocName);
    setDocs((prev) => [{ id: `doc_${Date.now()}`, name: newDocName, active: true }, ...prev.map((d) => ({ ...d, active: false }))]);
  };

  const handleAddTextLayer = () => {
    const text = newTextContent.trim() || (isMl ? 'ഫോട്ടോഷോപ്പ് ടൈറ്റിൽ' : 'Photoshop Layer Text');
    const newLayer: LayerItem = {
      id: `layer_text_${Date.now()}`,
      name: text.slice(0, 16),
      type: 'text',
      content: text,
      x: 300,
      y: 400,
      fontSize: newTextSize,
      fontColor: newTextColor,
      opacity: 100,
      blendMode: 'normal',
      visible: true,
    };
    setLayers((prev) => [newLayer, ...prev]);
    setSelectedLayerId(newLayer.id);
    setNewTextContent('');
  };

  const handleDeleteLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
  };

  const handleExportPsImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = projectWidth;
    canvas.height = projectHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (projectBgColor && !imageUrl) {
      ctx.fillStyle = projectBgColor;
      ctx.fillRect(0, 0, projectWidth, projectHeight);
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        ctx.drawImage(img, 0, 0, projectWidth, projectHeight);
        ctx.filter = 'none';
        drawLayersAndExport(ctx, canvas);
      };
      img.src = imageUrl;
      return;
    }

    drawLayersAndExport(ctx, canvas);
  };

  const drawLayersAndExport = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    layers.slice().reverse().forEach((l) => {
      if (!l.visible) return;
      ctx.globalAlpha = (l.opacity ?? 100) / 100;
      if (l.type === 'text' && l.content) {
        ctx.font = `bold ${l.fontSize || 48}px sans-serif`;
        ctx.fillStyle = l.fontColor || '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 16;
        ctx.fillText(l.content, l.x, l.y);
        ctx.shadowBlur = 0;
      }
    });

    ctx.globalAlpha = 1.0;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${activeDocName.replace(/\.[^/.]+$/, '')}_edited.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If project not yet created, show Photoshop New Project Setup Screen
  if (!projectCreated) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] text-white flex items-center justify-center p-4 font-sans select-none">
        <div className="bg-[#262626] border border-zinc-700 rounded-2xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-zinc-700 pb-4">
            <div className="p-3 rounded-xl bg-blue-600 text-white shadow-md">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-wide uppercase">
                {isMl ? 'ന്യൂ പ്രോജക്ട് (New Photoshop Project)' : 'New Photoshop Project'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isMl
                  ? 'പ്രോജക്റ്റിന്റെ പേരും ഫോർമാറ്റും സെറ്റ് ചെയ്ത് വർക്ക് സ്പേസ് തുറക്കുക.'
                  : 'Set project name, format, and dimensions to open the professional workspace.'}
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-bold block">{isMl ? 'പ്രോജക്ട് പേര്' : 'Project Name'}</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-300 font-bold block">{isMl ? 'ഫോർമാറ്റ് / ആസ്പെക്റ്റ് റേഷ്യോ' : 'Preset Format / Aspect Ratio'}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '16:9', name: '16:9 Cinematic (1920×1080)', w: 1920, h: 1080 },
                  { id: '9:16', name: '9:16 Reels / Story (1080×1920)', w: 1080, h: 1920 },
                  { id: '1:1', name: '1:1 Square Post (1200×1200)', w: 1200, h: 1200 },
                  { id: '2.39:1', name: '2.39:1 Cinemascope (2048×858)', w: 2048, h: 858 },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setProjectAspect(item.id as any);
                      setProjectWidth(item.w);
                      setProjectHeight(item.h);
                    }}
                    className={`p-3 rounded-xl border text-left font-bold cursor-pointer transition-all ${
                      projectAspect === item.id
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : 'bg-[#1e1e1e] text-zinc-300 border-zinc-700 hover:bg-[#333]'
                    }`}
                  >
                    <p className="font-extrabold">{item.id}</p>
                    <p className="text-[10px] text-zinc-400">{item.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-zinc-400 block mb-1">Width (px)</label>
                <input
                  type="number"
                  value={projectWidth}
                  onChange={(e) => setProjectWidth(Number(e.target.value))}
                  className="w-full bg-[#1e1e1e] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">Height (px)</label>
                <input
                  type="number"
                  value={projectHeight}
                  onChange={(e) => setProjectHeight(Number(e.target.value))}
                  className="w-full bg-[#1e1e1e] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateProject}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 cursor-pointer"
          >
            {isMl ? '🚀 പ്രോജക്ട് ക്രിയേറ്റ് ചെയ്യുക (Create)' : 'Create Photoshop Project'}
          </button>
        </div>
      </div>
    );
  }

  // Once project is created, show full Photoshop Web Workspace
  return (
    <div className="min-h-screen bg-[#1e1e1e] text-zinc-200 flex flex-col font-sans select-none pb-16">
      {/* 1. TOP DOCUMENT TABS BAR */}
      <div className="bg-[#262626] border-b border-[#111] flex items-center justify-between px-2 h-9 overflow-x-auto no-scrollbar shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="px-3.5 py-1.5 text-xs font-medium rounded-t-lg flex items-center gap-2 cursor-pointer border-t border-x bg-[#1e1e1e] text-white border-zinc-700 shadow-inner"
            >
              <span className="truncate max-w-[120px]">{doc.name}</span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setProjectCreated(false)}
            className="px-2 py-1 text-[10px] font-bold bg-[#333] hover:bg-[#444] text-zinc-300 rounded ml-2 cursor-pointer"
          >
            + New Project
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportPsImage}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-md shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* 2. TOP TOOL OPTIONS BAR */}
      <div className="bg-[#323232] border-b border-[#222] px-3 py-1.5 flex items-center justify-between text-xs text-zinc-300 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 text-[11px]">Format:</span>
            <span className="font-mono text-blue-400 font-bold">{projectAspect} ({projectWidth}×{projectHeight}px)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 text-[11px]">Opacity:</span>
            <span className="font-mono text-white">{brushOpacity}%</span>
            <input
              type="range"
              min="10"
              max="100"
              value={brushOpacity}
              onChange={(e) => setBrushOpacity(Number(e.target.value))}
              className="w-20 accent-blue-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-zinc-400">50% (RGB/8*)</span>
          <Settings className="w-4 h-4 text-zinc-400 cursor-pointer hover:text-white" />
        </div>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT TOOLBAR SIDEBAR */}
        <div className="w-12 bg-[#262626] border-r border-[#1a1a1a] flex flex-col items-center py-2 gap-1 shrink-0 z-20">
          {[
            { id: 'move', icon: Move, label: 'Move Tool (V)' },
            { id: 'marquee', icon: Square, label: 'Marquee Tool (M)' },
            { id: 'lasso', icon: Circle, label: 'Lasso Tool (L)' },
            { id: 'wand', icon: Wand2, label: 'Object Selection (W)' },
            { id: 'brush', icon: Brush, label: 'Brush Tool (B)' },
            { id: 'eraser', icon: Eraser, label: 'Eraser (E)' },
            { id: 'gradient', icon: Droplet, label: 'Gradient Tool (G)' },
            { id: 'text', icon: Type, label: 'Horizontal Type (T)' },
            { id: 'shape', icon: Square, label: 'Shape Tool (U)' },
            { id: 'zoom', icon: Search, label: 'Zoom Tool (Z)' },
          ].map((tool) => {
            const IconComponent = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={`p-2.5 rounded-lg transition-colors cursor-pointer ${
                  activeTool === tool.id ? 'bg-[#3b82f6] text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-[#333]'
                }`}
                title={tool.label}
              >
                <IconComponent className="w-4 h-4" />
              </button>
            );
          })}

          <div className="mt-auto flex flex-col items-center gap-1 pb-2">
            <div className="w-5 h-5 rounded bg-amber-400 border border-black shadow cursor-pointer" title="Foreground" />
            <div className="w-5 h-5 rounded bg-white border border-black shadow -mt-2.5 cursor-pointer" title="Background" />
          </div>
        </div>

        {/* CENTER CANVAS & RULERS */}
        <div className="flex-1 bg-[#1a1a1a] flex flex-col items-center justify-center p-4 relative overflow-auto">
          {/* Top Ruler */}
          <div className="absolute top-0 inset-x-12 h-6 bg-[#262626] border-b border-[#333] flex items-center px-4 text-[9px] font-mono text-zinc-500 overflow-hidden pointer-events-none select-none">
            <span>0</span>
            <span className="ml-24">200</span>
            <span className="ml-24">400</span>
            <span className="ml-24">600</span>
            <span className="ml-24">800</span>
            <span className="ml-24">1000</span>
            <span className="ml-24">1200</span>
            <span className="ml-24">1400</span>
            <span className="ml-24">1600</span>
          </div>

          {/* Left Ruler */}
          <div className="absolute left-12 top-6 bottom-0 w-6 bg-[#262626] border-r border-[#333] flex flex-col py-2 text-[9px] font-mono text-zinc-500 items-center overflow-hidden pointer-events-none select-none gap-8">
            <span>0</span>
            <span>200</span>
            <span>400</span>
            <span>600</span>
            <span>800</span>
            <span>1000</span>
          </div>

          {/* Main Image Canvas */}
          <div
            className={`relative shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-zinc-700 bg-black max-w-4xl max-h-[75vh] overflow-hidden rounded transition-all ${
              projectAspect === '16:9' ? 'aspect-video w-full' : projectAspect === '9:16' ? 'aspect-[9/16] h-[580px]' : projectAspect === '1:1' ? 'aspect-square w-[500px]' : 'w-full aspect-[2.39:1]'
            }`}
          >
            <img
              src={imageUrl}
              alt="Canvas"
              style={{
                filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
              }}
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Render Text Layers */}
            {layers.map((layer) => {
              if (!layer.visible) return null;
              if (layer.type === 'text') {
                return (
                  <div
                    key={layer.id}
                    className="absolute cursor-move select-none"
                    style={{
                      left: `${layer.x}px`,
                      top: `${layer.y}px`,
                      color: layer.fontColor || '#ffffff',
                      fontSize: `${layer.fontSize || 48}px`,
                      fontWeight: 900,
                      textShadow: '0 4px 16px rgba(0,0,0,0.95)',
                    }}
                  >
                    {layer.content}
                  </div>
                );
              }
              return null;
            })}
          </div>

          {/* Bottom Left Info */}
          <div className="absolute bottom-2 left-16 text-[10px] font-mono text-zinc-400 bg-[#262626]/80 px-2 py-0.5 rounded border border-zinc-700 pointer-events-none">
            50% &nbsp;|&nbsp; {projectWidth} px × {projectHeight} px ({projectAspect})
          </div>
        </div>

        {/* RIGHT PANELS */}
        <div className="w-72 bg-[#262626] border-l border-[#1a1a1a] flex flex-col shrink-0 z-20">
          <div className="grid grid-cols-3 border-b border-[#1a1a1a] bg-[#222] text-xs font-medium">
            <button
              type="button"
              onClick={() => setRightPanelTab('color')}
              className={`py-2 text-center cursor-pointer ${rightPanelTab === 'color' ? 'bg-[#262626] text-white border-b-2 border-blue-500 font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Color
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('properties')}
              className={`py-2 text-center cursor-pointer ${rightPanelTab === 'properties' ? 'bg-[#262626] text-white border-b-2 border-blue-500 font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Properties
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('layers')}
              className={`py-2 text-center cursor-pointer ${rightPanelTab === 'layers' ? 'bg-[#262626] text-white border-b-2 border-blue-500 font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Layers
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-4 text-xs">
            {rightPanelTab === 'color' && (
              <div className="space-y-3">
                <div className="h-32 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 rounded-lg shadow-inner relative overflow-hidden border border-zinc-700" />
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Foreground Color:</span>
                  <input
                    type="color"
                    value={newTextColor}
                    onChange={(e) => setNewTextColor(e.target.value)}
                    className="w-10 h-7 bg-zinc-900 border border-zinc-700 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {rightPanelTab === 'properties' && (
              <div className="space-y-3">
                <h4 className="font-bold text-zinc-300 uppercase text-[10px] tracking-wider">Format Dimensions</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="bg-[#1e1e1e] p-2 rounded border border-zinc-800 flex justify-between">
                    <span className="text-zinc-500">W:</span>
                    <span>{projectWidth} px</span>
                  </div>
                  <div className="bg-[#1e1e1e] p-2 rounded border border-zinc-800 flex justify-between">
                    <span className="text-zinc-500">H:</span>
                    <span>{projectHeight} px</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <h4 className="font-bold text-zinc-300 uppercase text-[10px] tracking-wider">Upload / Gallery Photo</h4>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs cursor-pointer shadow"
                  >
                    📂 Open Gallery Photo
                  </button>
                </div>
              </div>
            )}

            {rightPanelTab === 'layers' && (
              <div className="space-y-3">
                <div className="p-2.5 rounded bg-[#1e1e1e] border border-zinc-800 space-y-2">
                  <span className="text-[11px] font-bold text-zinc-300 block">Add Text Layer (T)</span>
                  <input
                    type="text"
                    value={newTextContent}
                    onChange={(e) => setNewTextContent(e.target.value)}
                    placeholder="Type text..."
                    className="w-full bg-[#2a2a2a] border border-zinc-700 rounded px-2.5 py-1 text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddTextLayer}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs cursor-pointer"
                  >
                    + Add Text Layer
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1 border-b border-zinc-800">
                    <span>Kind</span>
                    <span>Normal | 100%</span>
                  </div>

                  {layers.map((layer) => (
                    <div
                      key={layer.id}
                      onClick={() => setSelectedLayerId(layer.id)}
                      className={`p-2 rounded border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        selectedLayerId === layer.id
                          ? 'bg-[#3b82f6]/20 border-blue-500 text-white font-bold'
                          : 'bg-[#1e1e1e] border-zinc-800 text-zinc-300 hover:bg-[#222]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLayers((prev) =>
                              prev.map((l) => (l.id === layer.id ? { ...l, visible: !l.visible } : l))
                            );
                          }}
                          className="text-zinc-400 hover:text-white"
                        >
                          {layer.visible ? <Eye className="w-3.5 h-3.5" /> : '🚫'}
                        </button>
                        <span className="truncate">{layer.name}</span>
                      </div>

                      {layer.id !== 'layer_bg' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLayer(layer.id);
                          }}
                          className="text-zinc-500 hover:text-red-400 p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Layer Action Icons */}
          <div className="bg-[#222] border-t border-[#1a1a1a] px-3 py-2 flex items-center justify-between text-zinc-400 shrink-0">
            <button type="button" className="hover:text-white cursor-pointer" title="Delete Layer">
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const newLayer: LayerItem = {
                  id: `layer_${Date.now()}`,
                  name: `Layer ${layers.length + 1}`,
                  type: 'shape',
                  x: 0,
                  y: 0,
                  opacity: 100,
                  blendMode: 'normal',
                  visible: true,
                };
                setLayers((prev) => [newLayer, ...prev]);
                setSelectedLayerId(newLayer.id);
              }}
              className="hover:text-white cursor-pointer"
              title="Create New Layer"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button type="button" className="hover:text-white cursor-pointer" title="Folder">
              <Folder className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
