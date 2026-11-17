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
} from 'lucide-react';
import type { AppLang } from '../lib/i18n';

export interface ImageEditorStudioProps {
  lang: AppLang;
  onClose?: () => void;
}

interface LayerItem {
  id: string;
  name: string;
  type: 'image' | 'text' | 'shape';
  content?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  visible: boolean;
  shapeType?: 'rectangle' | 'circle';
  shapeFill?: string;
}

export const ImageEditorStudio: React.FC<ImageEditorStudioProps> = ({ lang, onClose }) => {
  const isMl = lang === 'ml';

  const [imageUrl, setImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80'
  );
  const [imageName, setImageName] = useState<string>('cinematic_poster_01.jpg');
  const [imageWidth, setImageWidth] = useState<number>(1200);
  const [imageHeight, setImageHeight] = useState<number>(675);

  // Adjustments
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [blur, setBlur] = useState<number>(0);
  const [sepia, setSepia] = useState<number>(0);
  const [grayscale, setGrayscale] = useState<number>(0);
  const [vignette, setVignette] = useState<boolean>(false);

  // Active Tool: 'adjust' | 'text' | 'layers' | 'filters' | 'draw' | 'crop'
  const [activeTab, setActiveTab] = useState<'adjust' | 'text' | 'layers' | 'filters' | 'draw' | 'crop'>('adjust');

  // Layers stack
  const [layers, setLayers] = useState<LayerItem[]>([
    {
      id: 'layer_bg',
      name: 'Background Poster',
      type: 'image',
      x: 0,
      y: 0,
      opacity: 100,
      blendMode: 'normal',
      visible: true,
    },
    {
      id: 'layer_title',
      name: 'Cinematic Title Text',
      type: 'text',
      content: 'BLOCKBUSTER MOVIE TITLE',
      x: 100,
      y: 80,
      fontSize: 42,
      fontColor: '#fbbf24',
      fontFamily: 'sans-serif',
      opacity: 100,
      blendMode: 'normal',
      visible: true,
    },
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('layer_title');

  // New text input state
  const [newTextContent, setNewTextContent] = useState<string>('');
  const [newTextSize, setNewTextSize] = useState<number>(36);
  const [newTextColor, setNewTextColor] = useState<string>('#ffffff');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    const img = new Image();
    img.onload = () => {
      setImageWidth(img.width || 1200);
      setImageHeight(img.height || 675);
    };
    img.src = url;
  };

  const handleAddTextLayer = () => {
    const text = newTextContent.trim() || (isMl ? 'പുതിയ സിനിമാ ശീർഷകം' : 'New Movie Title');
    const newLayer: LayerItem = {
      id: `layer_text_${Date.now()}`,
      name: text.slice(0, 20),
      type: 'text',
      content: text,
      x: 120,
      y: 150,
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

  const handleAddShapeLayer = (shapeType: 'rectangle' | 'circle') => {
    const newLayer: LayerItem = {
      id: `layer_shape_${Date.now()}`,
      name: shapeType === 'rectangle' ? 'Box Shape' : 'Circle Shape',
      type: 'shape',
      shapeType,
      shapeFill: '#fbbf24',
      x: 200,
      y: 200,
      width: 250,
      height: 120,
      opacity: 85,
      blendMode: 'normal',
      visible: true,
    };
    setLayers((prev) => [newLayer, ...prev]);
    setSelectedLayerId(newLayer.id);
  };

  const handleDeleteLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
  };

  const handleExportPoster = () => {
    const canvas = document.createElement('canvas');
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Apply filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) sepia(${sepia}%) grayscale(${grayscale}%)`;
      ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
      ctx.filter = 'none';

      // Draw layers
      layers.slice().reverse().forEach((l) => {
        if (!l.visible) return;
        ctx.globalAlpha = (l.opacity ?? 100) / 100;
        if (l.type === 'text' && l.content) {
          ctx.font = `bold ${l.fontSize || 36}px sans-serif`;
          ctx.fillStyle = l.fontColor || '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 12;
          ctx.fillText(l.content, l.x, l.y);
          ctx.shadowBlur = 0;
        } else if (l.type === 'shape') {
          ctx.fillStyle = l.shapeFill || '#fbbf24';
          if (l.shapeType === 'circle') {
            ctx.beginPath();
            ctx.arc(l.x + (l.width || 100) / 2, l.y + (l.height || 100) / 2, (l.width || 100) / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(l.x, l.y, l.width || 200, l.height || 100);
          }
        }
      });

      ctx.globalAlpha = 1.0;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `photoshop_poster_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = imageUrl;
  };

  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) sepia(${sepia}%) grayscale(${grayscale}%)`,
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col pb-24">
      {/* Top Photoshop Header */}
      <header className="bg-[#0f121d] border-b border-zinc-800 px-4 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-black shadow-md">
            <Layers3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-wide uppercase flex items-center gap-2">
              <span>{isMl ? 'ഫോട്ടോഷോപ്പ് & ഇമേജ് എഡിറ്റിംഗ് സ്റ്റുഡിയോ' : 'Photoshop & Image Editing Studio'}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs">
                PRO PSD
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              {isMl
                ? 'പോസ്റ്ററുകൾ നിർമ്മിക്കാനും, ലെയറുകൾ എഡിറ്റ് ചെയ്യാനും, പ്രൊഫഷണൽ ഫിൽട്ടറുകൾ നൽകാനും.'
                : 'Create cinematic posters, manage layers, and apply professional adjustments & text.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center gap-2 cursor-pointer border border-zinc-700"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>{isMl ? 'ചിത്രം അപ്‌ലോഡ്' : 'Open Image'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPoster}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <Download className="w-4 h-4" />
            <span>{isMl ? 'പോസ്റ്റർ എക്സ്പോർട്ട് (.JPG)' : 'Export Poster'}</span>
          </button>
        </div>
      </header>

      {/* Main Photoshop Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Left Toolbar / Tools */}
        <div className="lg:col-span-3 bg-[#11131f] border border-zinc-800 rounded-2xl p-4 space-y-4 shadow-2xl">
          <div className="grid grid-cols-3 gap-2 border-b border-zinc-800 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('adjust')}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'adjust' ? 'bg-amber-500 text-black font-extrabold' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>{isMl ? 'കളർ' : 'Adjust'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'text' ? 'bg-amber-500 text-black font-extrabold' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>{isMl ? 'ടെക്സ്റ്റ്' : 'Text'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('layers')}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'layers' ? 'bg-amber-500 text-black font-extrabold' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{isMl ? 'ലെയറുകൾ' : 'Layers'}</span>
            </button>
          </div>

          {/* Tab 1: Adjustments */}
          {activeTab === 'adjust' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-extrabold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>{isMl ? 'കളർ & ലൈറ്റിംഗ് അഡ്ജസ്റ്റ്മെന്റ്' : 'Color & Light Adjustments'}</span>
              </h3>

              <div className="space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>{isMl ? 'ബ്രൈറ്റ്‌നസ്' : 'Brightness'}</span>
                  <span className="font-mono text-amber-400">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>{isMl ? 'കോൺട്രാസ്റ്റ്' : 'Contrast'}</span>
                  <span className="font-mono text-amber-400">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>{isMl ? 'സാച്ചുറേഷൻ' : 'Saturation'}</span>
                  <span className="font-mono text-amber-400">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>{isMl ? 'ബ്ലർ (Blur)' : 'Blur'}</span>
                  <span className="font-mono text-amber-400">{blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={blur}
                  onChange={(e) => setBlur(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>{isMl ? 'സെപിയ (Sepia)' : 'Sepia'}</span>
                  <span className="font-mono text-amber-400">{sepia}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sepia}
                  onChange={(e) => setSepia(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-300 font-bold">{isMl ? 'വിഗ്നെറ്റ് (Vignette)' : 'Vignette Frame'}</span>
                <button
                  type="button"
                  onClick={() => setVignette(!vignette)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    vignette ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {vignette ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Text Layers */}
          {activeTab === 'text' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-extrabold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Type className="w-3.5 h-3.5 text-amber-400" />
                <span>{isMl ? 'പോസ്റ്റർ ടൈറ്റിൽ & ടെക്സ്റ്റ്' : 'Add Poster Title'}</span>
              </h3>

              <div className="space-y-2">
                <label className="text-zinc-400 block">{isMl ? 'ടെക്സ്റ്റ് നൽകുക' : 'Enter Text Content'}</label>
                <input
                  type="text"
                  value={newTextContent}
                  onChange={(e) => setNewTextContent(e.target.value)}
                  placeholder={isMl ? 'സിനിമാ ശീർഷകം എഴുതുക...' : 'Enter movie title...'}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 block mb-1">{isMl ? 'ഫോണ്ട് സൈസ്' : 'Font Size'}</label>
                  <input
                    type="number"
                    value={newTextSize}
                    onChange={(e) => setNewTextSize(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">{isMl ? 'നിറം (Color)' : 'Color'}</label>
                  <input
                    type="color"
                    value={newTextColor}
                    onChange={(e) => setNewTextColor(e.target.value)}
                    className="w-full h-8 bg-zinc-900 border border-zinc-700 rounded-xl px-1 cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddTextLayer}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase tracking-wider cursor-pointer shadow-md"
              >
                {isMl ? '➕ ടെക്സ്റ്റ് ലെയർ ചേർക്കുക' : 'Add Text Layer'}
              </button>

              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <span className="text-zinc-400 font-bold block">{isMl ? 'വേഗത്തിലുള്ള ആകൃതികൾ (Shapes):' : 'Quick Shapes:'}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddShapeLayer('rectangle')}
                    className="flex-1 py-2 bg-zinc-900 border border-zinc-700 rounded-xl font-bold hover:bg-zinc-800 cursor-pointer"
                  >
                    {isMl ? 'ബോക്സ്' : 'Rectangle'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddShapeLayer('circle')}
                    className="flex-1 py-2 bg-zinc-900 border border-zinc-700 rounded-xl font-bold hover:bg-zinc-800 cursor-pointer"
                  >
                    {isMl ? 'വട്ടം (Circle)' : 'Circle'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Layers Manager */}
          {activeTab === 'layers' && (
            <div className="space-y-3 text-xs">
              <h3 className="font-extrabold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>{isMl ? 'ലെയർ സ്റ്റാക്ക് (Layers)' : 'Layers Stack'}</span>
              </h3>

              <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar pr-1">
                {layers.map((layer) => (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      selectedLayerId === layer.id
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300'
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
                        {layer.visible ? '👁️' : '🚫'}
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
                        className="text-zinc-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center Canvas Preview Area */}
        <div className="lg:col-span-9 bg-[#11131f] border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center relative shadow-2xl min-h-[450px]">
          <div
            className={`relative rounded-xl overflow-hidden shadow-2xl border border-zinc-700 bg-black ${
              vignette ? 'ring-4 ring-amber-500/30' : ''
            }`}
            style={{ maxWidth: '100%', maxHeight: '600px' }}
          >
            <img
              src={imageUrl}
              alt="Poster Preview"
              style={filterStyle}
              className="w-full h-auto object-contain max-h-[580px] pointer-events-none"
            />

            {/* Render Layers on top of canvas preview */}
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
                      fontSize: `${layer.fontSize || 36}px`,
                      fontWeight: 900,
                      textShadow: '0 4px 12px rgba(0,0,0,0.9)',
                    }}
                  >
                    {layer.content}
                  </div>
                );
              }
              if (layer.type === 'shape') {
                return (
                  <div
                    key={layer.id}
                    className="absolute"
                    style={{
                      left: `${layer.x}px`,
                      top: `${layer.y}px`,
                      width: `${layer.width || 200}px`,
                      height: `${layer.height || 100}px`,
                      backgroundColor: layer.shapeFill || '#fbbf24',
                      borderRadius: layer.shapeType === 'circle' ? '50%' : '12px',
                      opacity: (layer.opacity || 85) / 100,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                    }}
                  />
                );
              }
              return null;
            })}
          </div>

          <div className="mt-4 flex items-center justify-between w-full text-xs text-zinc-400 px-2">
            <span>
              {imageName} ({imageWidth} × {imageHeight} px)
            </span>
            <span className="font-mono text-amber-400">
              {isMl ? 'ഫോട്ടോഷോപ്പ് പ്രോ എഡിറ്റർ സജീവം' : 'Photoshop Pro Studio Active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
