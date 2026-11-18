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
  Bell,
  User,
  Filter,
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
  blendMode: string;
  visible: boolean;
  locked?: boolean;
  thumbnailUrl?: string;
}

const PHOTOSHOP_TABS = [
  'Untitled-15',
  'Untitled-16',
  'Untitled-17',
  'cat.psd',
  'Untitled-18',
  'Untitled-19',
  'Untitled-20',
  'Untitled-21',
  'Untitled-22 @ 50% (Layer 1, RGB/8*)',
];

export const ImageEditorStudio: React.FC<ImageEditorStudioProps> = ({ lang, onClose }) => {
  const isMl = lang === 'ml';

  // Active Document Tab
  const [activeTab, setActiveTab] = useState<string>('Untitled-1.psd');

  // Canvas & Image State (Clean blank canvas by default, no cat photo)
  const [imageUrl, setImageUrl] = useState<string>('');
  const [canvasWidth, setCanvasWidth] = useState<number>(1920);
  const [canvasHeight, setCanvasHeight] = useState<number>(1080);

  // Active Photoshop Left Tool
  const [activeTool, setActiveTool] = useState<string>('move');

  // Right Panel Tabs
  const [rightPanelMode, setRightPanelMode] = useState<'color' | 'swatches' | 'gradients' | 'patterns'>('color');
  const [middlePanelMode, setMiddlePanelMode] = useState<'properties' | 'adjustments' | 'libraries'>('properties');
  const [bottomPanelMode, setBottomPanelMode] = useState<'layers' | 'channels' | 'paths'>('layers');

  // Adjustments & Options
  const [brushOpacity, setBrushOpacity] = useState<number>(93);
  const [activeBlendMode, setActiveBlendMode] = useState<string>('Normal');
  const [layerOpacity, setLayerOpacity] = useState<number>(100);

  // Layers stack starting clean
  const [layers, setLayers] = useState<LayerItem[]>([
    {
      id: 'layer_bg',
      name: 'Background Canvas',
      type: 'shape',
      x: 0,
      y: 0,
      opacity: 100,
      blendMode: 'Normal',
      visible: true,
      locked: true,
    },
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('layer_bg');

  // Text tools
  const [newTextContent, setNewTextContent] = useState<string>('');
  const [newTextSize, setNewTextSize] = useState<number>(56);
  const [newTextColor, setNewTextColor] = useState<string>('#ffffff');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setActiveTab(file.name);

    const newLayer: LayerItem = {
      id: `layer_${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ''),
      type: 'image',
      x: 0,
      y: 0,
      opacity: 100,
      blendMode: 'Normal',
      visible: true,
      locked: false,
      thumbnailUrl: url,
    };
    setLayers((prev) => [newLayer, ...prev]);
    setSelectedLayerId(newLayer.id);
  };

  const getToolDisplayName = (id: string) => {
    const map: Record<string, string> = {
      move: 'Move Tool (V)',
      marquee: 'Rectangular Marquee (M)',
      lasso: 'Lasso Tool (L)',
      wand: 'Object Selection & Wand (W)',
      crop: 'Crop Tool (C)',
      eyedropper: 'Eyedropper Tool (I)',
      heal: 'Spot Healing Brush (J)',
      brush: 'Brush Tool (B)',
      clone: 'Clone Stamp Tool (S)',
      eraser: 'Eraser Tool (E)',
      gradient: 'Gradient Tool (G)',
      blur: 'Blur & Sharpen Tool',
      pen: 'Pen Tool (P)',
      text: 'Horizontal Type Tool (T)',
      path: 'Path Selection (A)',
      shape: 'Rectangle Shape (U)',
      hand: 'Hand Tool (H)',
      zoom: 'Zoom Tool (Z)',
    };
    return map[id] || 'Photoshop Tool';
  };

  const handleAddTextLayer = () => {
    const text = newTextContent.trim() || 'Photoshop Text';
    const newLayer: LayerItem = {
      id: `layer_text_${Date.now()}`,
      name: text.slice(0, 16),
      type: 'text',
      content: text,
      x: 400,
      y: 500,
      fontSize: newTextSize,
      fontColor: newTextColor,
      opacity: 100,
      blendMode: 'Normal',
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
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      layers.slice().reverse().forEach((l) => {
        if (!l.visible) return;
        ctx.globalAlpha = (l.opacity ?? 100) / 100;
        if (l.type === 'text' && l.content) {
          ctx.font = `bold ${l.fontSize || 56}px sans-serif`;
          ctx.fillStyle = l.fontColor || '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.95)';
          ctx.shadowBlur = 18;
          ctx.fillText(l.content, l.x, l.y);
          ctx.shadowBlur = 0;
        }
      });
      ctx.globalAlpha = 1.0;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${activeTab.replace(/\.[^/.]+$/, '')}_photoshop.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = imageUrl;
  };

  return (
    <div className="min-h-screen bg-[#323232] text-zinc-200 flex flex-col font-sans select-none pb-16">
      {/* 1. TOP MENU BAR (Photoshop Desktop Menu) */}
      <div className="bg-[#1e1e1e] border-b border-[#111] flex items-center justify-between px-3 h-8 text-xs text-zinc-300 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center text-[9px]">Ps</div>
            <span>Adobe Photoshop</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-zinc-400 text-[11px]">
            <span className="hover:text-white cursor-pointer">File</span>
            <span className="hover:text-white cursor-pointer">Edit</span>
            <span className="hover:text-white cursor-pointer">Image</span>
            <span className="hover:text-white cursor-pointer">Layer</span>
            <span className="hover:text-white cursor-pointer">Select</span>
            <span className="hover:text-white cursor-pointer">Filter</span>
            <span className="hover:text-white cursor-pointer">View</span>
            <span className="hover:text-white cursor-pointer">Window</span>
            <span className="hover:text-white cursor-pointer">Help</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportPsImage}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* 2. TOP DOCUMENT TABS BAR */}
      <div className="bg-[#262626] border-b border-[#111] flex items-center px-1 h-8 overflow-x-auto no-scrollbar shrink-0 gap-1">
        {PHOTOSHOP_TABS.map((tab) => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 text-[11px] font-medium rounded-t flex items-center gap-2 cursor-pointer border-t border-x ${
              activeTab === tab || (tab.includes('cat.psd') && activeTab === 'cat.psd')
                ? 'bg-[#323232] text-white border-zinc-600 shadow-inner'
                : 'bg-[#2a2a2a] text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            <span className="truncate max-w-[140px]">{tab}</span>
            <span className="text-[9px] text-zinc-500 hover:text-white">×</span>
          </div>
        ))}
      </div>

      {/* 3. TOP OPTIONS BAR (Dynamic Tool Options) */}
      <div className="bg-[#383838] border-b border-[#222] px-3 py-1.5 flex items-center justify-between text-xs text-zinc-300 shrink-0 shadow-sm">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
          <div className="bg-blue-600/20 text-blue-400 font-bold px-2.5 py-0.5 rounded border border-blue-500/40 text-[11px] whitespace-nowrap">
            Tool Active: <span className="text-white uppercase">{getToolDisplayName(activeTool)}</span>
          </div>

          {activeTool === 'brush' || activeTool === 'heal' || activeTool === 'clone' ? (
            <div className="flex items-center gap-3 border-l border-zinc-700 pl-3">
              <span className="text-zinc-400 text-[11px]">Size:</span>
              <input type="range" min="5" max="150" defaultValue="35" className="w-20 accent-blue-500 cursor-pointer" />
              <span className="text-zinc-400 text-[11px]">Opacity:</span>
              <span className="font-mono text-white">{brushOpacity}%</span>
              <input
                type="range"
                min="10"
                max="100"
                value={brushOpacity}
                onChange={(e) => setBrushOpacity(Number(e.target.value))}
                className="w-16 accent-blue-500 cursor-pointer"
              />
            </div>
          ) : activeTool === 'text' ? (
            <div className="flex items-center gap-3 border-l border-zinc-700 pl-3">
              <span className="text-zinc-400 text-[11px]">Font Size:</span>
              <input
                type="number"
                min="12"
                max="200"
                value={newTextSize}
                onChange={(e) => setNewTextSize(Number(e.target.value))}
                className="w-14 bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-white text-xs"
              />
              <span className="text-zinc-400 text-[11px]">Color:</span>
              <input
                type="color"
                value={newTextColor}
                onChange={(e) => setNewTextColor(e.target.value)}
                className="w-6 h-6 bg-zinc-900 border border-zinc-700 rounded cursor-pointer"
              />
              <button
                type="button"
                onClick={handleAddTextLayer}
                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[11px] cursor-pointer"
              >
                + Add Text
              </button>
            </div>
          ) : activeTool === 'crop' ? (
            <div className="flex items-center gap-3 border-l border-zinc-700 pl-3">
              <span className="text-zinc-400 text-[11px]">Ratio:</span>
              <select className="bg-zinc-900 border border-zinc-700 text-white rounded px-2 py-0.5 text-xs">
                <option>16:9 Cinematic</option>
                <option>1:1 Square</option>
                <option>4:3 Standard</option>
                <option>Original</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-3 border-l border-zinc-700 pl-3">
              <div className="flex items-center gap-1.5">
                <button type="button" className="px-2 py-0.5 rounded bg-[#444] text-white font-bold text-[11px]">
                  + Add
                </button>
                <button type="button" className="px-2 py-0.5 rounded bg-[#2a2a2a] text-zinc-400 text-[11px]">
                  - Subtract
                </button>
              </div>
              <span className="text-zinc-400 text-[11px]">Feather: 0px</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-zinc-400 cursor-pointer hover:text-white" />
          <Settings className="w-4 h-4 text-zinc-400 cursor-pointer hover:text-white" />
        </div>
      </div>

      {/* 4. MAIN PHOTOSHOP WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT TOOLBAR SIDEBAR (Authentic Photoshop Tools) */}
        <div className="w-11 bg-[#262626] border-r border-[#1a1a1a] flex flex-col items-center py-2 gap-1 shrink-0 z-20">
          {[
            { id: 'move', icon: Move, label: 'Move Tool (V)' },
            { id: 'marquee', icon: Square, label: 'Rectangular Marquee (M)' },
            { id: 'lasso', icon: Circle, label: 'Lasso Tool (L)' },
            { id: 'wand', icon: Wand2, label: 'Object Selection / Wand (W)' },
            { id: 'crop', icon: Crop, label: 'Crop Tool (C)' },
            { id: 'eyedropper', icon: Droplet, label: 'Eyedropper (I)' },
            { id: 'heal', icon: Sparkles, label: 'Spot Healing Brush (J)' },
            { id: 'brush', icon: Brush, label: 'Brush Tool (B)' },
            { id: 'clone', icon: Sparkles, label: 'Clone Stamp (S)' },
            { id: 'eraser', icon: Eraser, label: 'Eraser (E)' },
            { id: 'gradient', icon: Palette, label: 'Gradient Tool (G)' },
            { id: 'blur', icon: Sun, label: 'Blur Tool' },
            { id: 'pen', icon: PenTool, label: 'Pen Tool (P)' },
            { id: 'text', icon: Type, label: 'Horizontal Type Tool (T)' },
            { id: 'path', icon: SlidersHorizontal, label: 'Path Selection (A)' },
            { id: 'shape', icon: Square, label: 'Rectangle Shape (U)' },
            { id: 'hand', icon: Move, label: 'Hand Tool (H)' },
            { id: 'zoom', icon: Search, label: 'Zoom Tool (Z)' },
          ].map((tool, idx) => {
            const IconComponent = tool.icon || Square;
            return (
              <button
                key={tool.id || idx}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={`p-2 rounded transition-colors cursor-pointer ${
                  activeTool === tool.id ? 'bg-[#3b82f6] text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-[#333]'
                }`}
                title={tool.label}
              >
                <IconComponent className="w-3.5 h-3.5" />
              </button>
            );
          })}

          <div className="mt-auto flex flex-col items-center gap-1 pb-2">
            <div className="w-4 h-4 rounded bg-black border border-white/50 shadow cursor-pointer" title="Foreground" />
            <div className="w-4 h-4 rounded bg-white border border-black shadow -mt-2 cursor-pointer" title="Background" />
          </div>
        </div>

        {/* CENTER CANVAS AREA WITH RULERS */}
        <div className="flex-1 bg-[#1a1a1a] flex flex-col items-center justify-center p-6 relative overflow-auto">
          {/* Top Ruler Bar (0 to 2200px) */}
          <div className="absolute top-0 inset-x-11 h-6 bg-[#262626] border-b border-[#333] flex items-center px-4 text-[9px] font-mono text-zinc-500 overflow-hidden pointer-events-none select-none">
            <span>0</span>
            <span className="ml-20">200</span>
            <span className="ml-20">400</span>
            <span className="ml-20">600</span>
            <span className="ml-20">800</span>
            <span className="ml-20">1000</span>
            <span className="ml-20">1200</span>
            <span className="ml-20">1400</span>
            <span className="ml-20">1600</span>
            <span className="ml-20">1800</span>
            <span className="ml-20">2000</span>
          </div>

          {/* Left Ruler Bar */}
          <div className="absolute left-11 top-6 bottom-0 w-6 bg-[#262626] border-r border-[#333] flex flex-col py-2 text-[9px] font-mono text-zinc-500 items-center overflow-hidden pointer-events-none select-none gap-6">
            <span>0</span>
            <span>200</span>
            <span>400</span>
            <span>600</span>
            <span>800</span>
            <span>1000</span>
            <span>1200</span>
            <span>1400</span>
            <span>1600</span>
          </div>

          {/* Main Centered High-Res Canvas */}
          <div className="relative shadow-[0_25px_70px_rgba(0,0,0,0.9)] border border-zinc-700 bg-zinc-950 w-[800px] h-[500px] flex flex-col items-center justify-center overflow-hidden rounded">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Photoshop Canvas"
                className="w-full h-full object-contain pointer-events-none"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-200">New Photoshop Project (1920 × 1080)</h3>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    Open an image from your gallery or create visiting cards, posters, and graphics using the layers and tools on the sides.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-lg cursor-pointer transition-all flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Open Gallery Photo
                </button>
              </div>
            )}

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
                      fontSize: `${layer.fontSize || 56}px`,
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

          {/* Bottom Left Zoom Status */}
          <div className="absolute bottom-2 left-16 text-[10px] font-mono text-zinc-400 bg-[#262626]/85 px-2.5 py-1 rounded border border-zinc-700 pointer-events-none">
            50% &nbsp;|&nbsp; {canvasWidth} px × {canvasHeight} px (300 ppi)
          </div>
        </div>

        {/* RIGHT PANELS (Color, Swatches, Gradients, Patterns | Properties | Layers, Channels, Paths) */}
        <div className="w-80 bg-[#262626] border-l border-[#1a1a1a] flex flex-col shrink-0 z-20">
          {/* 1. TOP RIGHT PANEL: Color, Swatches, Gradients, Patterns */}
          <div className="border-b border-[#1a1a1a] bg-[#222]">
            <div className="grid grid-cols-4 text-[11px] font-medium border-b border-[#1a1a1a]">
              {(['color', 'swatches', 'gradients', 'patterns'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRightPanelMode(mode)}
                  className={`py-1.5 text-center capitalize cursor-pointer ${rightPanelMode === mode ? 'bg-[#262626] text-white border-b-2 border-blue-500 font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="p-3 space-y-3">
              {rightPanelMode === 'color' && (
                <div className="space-y-2">
                  <div className="h-28 rounded-lg shadow-inner relative overflow-hidden border border-zinc-700 bg-gradient-to-r from-red-500 via-green-500 to-blue-500">
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-white opacity-85" />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Active Color:</span>
                    <input
                      type="color"
                      value={newTextColor}
                      onChange={(e) => setNewTextColor(e.target.value)}
                      className="w-10 h-6 bg-zinc-900 border border-zinc-700 rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}
              {rightPanelMode !== 'color' && (
                <div className="h-20 bg-[#1e1e1e] rounded border border-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                  {rightPanelMode} library loaded
                </div>
              )}
            </div>
          </div>

          {/* 2. MIDDLE RIGHT PANEL: Properties, Adjustments, Libraries */}
          <div className="border-b border-[#1a1a1a] bg-[#222]">
            <div className="grid grid-cols-3 text-[11px] font-medium border-b border-[#1a1a1a]">
              {(['properties', 'adjustments', 'libraries'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMiddlePanelMode(mode)}
                  className={`py-1.5 text-center capitalize cursor-pointer ${middlePanelMode === mode ? 'bg-[#262626] text-white border-b-2 border-blue-500 font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="p-3 space-y-2 text-xs">
              {middlePanelMode === 'properties' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Pixel Layer</span>
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
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[10px] cursor-pointer"
                    >
                      Open Image
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="bg-[#1e1e1e] p-1.5 rounded border border-zinc-800 flex justify-between">
                      <span className="text-zinc-500">W:</span>
                      <span>{canvasWidth} px</span>
                    </div>
                    <div className="bg-[#1e1e1e] p-1.5 rounded border border-zinc-800 flex justify-between">
                      <span className="text-zinc-500">H:</span>
                      <span>{canvasHeight} px</span>
                    </div>
                  </div>
                </div>
              )}
              {middlePanelMode !== 'properties' && (
                <div className="h-16 bg-[#1e1e1e] rounded border border-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                  {middlePanelMode} panel active
                </div>
              )}
            </div>
          </div>

          {/* 3. BOTTOM RIGHT PANEL: Layers, Channels, Paths */}
          <div className="flex-1 flex flex-col bg-[#262626]">
            <div className="grid grid-cols-3 text-[11px] font-medium border-b border-[#1a1a1a] bg-[#222]">
              {(['layers', 'channels', 'paths'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setBottomPanelMode(mode)}
                  className={`py-1.5 text-center capitalize cursor-pointer ${bottomPanelMode === mode ? 'bg-[#262626] text-white border-b-2 border-blue-500 font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3 text-xs">
              {bottomPanelMode === 'layers' && (
                <div className="space-y-3">
                  {/* Quick Add Text */}
                  <div className="p-2 rounded bg-[#1e1e1e] border border-zinc-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-400">Add Text Layer (T)</span>
                    <input
                      type="text"
                      value={newTextContent}
                      onChange={(e) => setNewTextContent(e.target.value)}
                      placeholder="Type text..."
                      className="w-full bg-[#2a2a2a] border border-zinc-700 rounded px-2.5 py-1 text-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddTextLayer}
                      className="w-full py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[11px] cursor-pointer"
                    >
                      + Add Text Layer
                    </button>
                  </div>

                  {/* Blend Mode & Opacity */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <select
                      value={activeBlendMode}
                      onChange={(e) => setActiveBlendMode(e.target.value)}
                      className="bg-[#1e1e1e] border border-zinc-700 text-white rounded px-2 py-0.5 text-xs"
                    >
                      <option>Normal</option>
                      <option>Multiply</option>
                      <option>Screen</option>
                      <option>Overlay</option>
                    </select>
                    <span>Opacity: {layerOpacity}%</span>
                  </div>

                  {/* Layers Stack */}
                  <div className="space-y-1">
                    {layers.map((layer) => (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedLayerId(layer.id)}
                        className={`p-2 rounded border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          selectedLayerId === layer.id
                            ? 'bg-[#3b82f6]/25 border-blue-500 text-white font-bold'
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
                          <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {layer.thumbnailUrl ? (
                              <img src={layer.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] text-zinc-500">T</span>
                            )}
                          </div>
                          <span className="truncate">{layer.name}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {layer.locked && <Lock className="w-3 h-3 text-zinc-500" />}
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {bottomPanelMode !== 'layers' && (
                <div className="h-24 bg-[#1e1e1e] rounded border border-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                  {bottomPanelMode} panel active
                </div>
              )}
            </div>

            {/* Bottom Layers Actions Toolbar */}
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
                    blendMode: 'Normal',
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
    </div>
  );
};
