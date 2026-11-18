import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Camera,
  Scissors,
  Crop,
  Type,
  Trash2,
  Undo2,
  Redo2,
  Sliders,
  Sparkles,
  Download,
  Upload,
  FolderOpen,
  Search,
  Settings,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Film,
  Music,
  Layers,
  Video,
  Mic,
  Flame,
  Smile,
  Share2,
  HelpCircle,
  X,
  Check,
  Bell,
  ShoppingCart,
  Cloud,
  User,
  RefreshCw,
  Palette,
  Crosshair,
  Layers3,
  SlidersHorizontal,
  ArrowLeft,
  FileText,
  Clock,
  Sparkle,
  Tv,
} from 'lucide-react';
import type { AppLang } from '../lib/i18n';

export interface VideoEditorStudioProps {
  lang: AppLang;
  onBackToStoryboard: () => void;
}

interface TemplateItem {
  id: string;
  title: string;
  duration: string;
  durationSec: number;
  category: string;
  thumbnail: string;
  movieTitle: string;
  subtitle: string;
  director: string;
  bgUrl: string;
}

const TEMPLATES_LIST: TemplateItem[] = [
  {
    id: 't_monster_a',
    title: 'Monster A Level Files',
    duration: '00:15',
    durationSec: 15,
    category: 'Cinematic Intro',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
    movieTitle: 'DARK HORIZON',
    subtitle: 'CLASSIFIED LEVEL 5 ARCHIVE',
    director: 'DIRECTOR | ALEX VANCE',
    bgUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1280&q=80',
  },
  {
    id: 't_monster_battle',
    title: 'Monster Ultimate Battle',
    duration: '00:15',
    durationSec: 15,
    category: 'Cinematic Intro',
    thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=400&q=80',
    movieTitle: 'TITAN SURGE',
    subtitle: 'THE FINAL SHOWDOWN',
    director: 'DIRECTOR | MARCUS KANE',
    bgUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1280&q=80',
  },
  {
    id: 't_game_battle',
    title: 'Game Battlefield',
    duration: '00:07',
    durationSec: 7,
    category: 'Cinematic Intro',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
    movieTitle: 'VALKYRIE OPS',
    subtitle: 'TACTICAL COMBAT PROTOCOL',
    director: 'DIRECTOR | SARA CONNER',
    bgUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1280&q=80',
  },
  {
    id: 't_daily_vlog',
    title: 'Cinematic Daily Vlog 02',
    duration: '00:14',
    durationSec: 14,
    category: 'Cinematic Intro',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
    movieTitle: 'MEMORIES OF THE SEA',
    subtitle: 'COASTAL SUNRISE CHRONICLES',
    director: 'DIRECTOR | EMMA STONE',
    bgUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1280&q=80',
  },
  {
    id: 't_minimal_opener',
    title: 'Minimal Cinematic Opener 02',
    duration: '00:21',
    durationSec: 21.1,
    category: 'Cinematic Intro',
    thumbnail: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=400&q=80',
    movieTitle: 'MOVIE NAME',
    subtitle: 'PRODUCE | Come on Entertainment',
    director: 'DIRECTOR | Frank Bieber/Frank Bieber',
    bgUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1280&q=80',
  },
  {
    id: 't_history_world',
    title: 'Cinematic Magnificent Trail...',
    duration: '00:04',
    durationSec: 4,
    category: 'Cinematic Intro',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
    movieTitle: 'HISTORY OF THE WORLD',
    subtitle: 'EPIC HISTORICAL SAGA',
    director: 'DIRECTOR | DAVID ATTEN',
    bgUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1280&q=80',
  },
  {
    id: 't_opener_01',
    title: 'Cinematic Opener 01',
    duration: '00:19',
    durationSec: 19,
    category: 'Cinematic Intro',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
    movieTitle: 'BEYOND ORBIT',
    subtitle: 'INTERSTELLAR MISSION LOG',
    director: 'DIRECTOR | JOHN GLENN',
    bgUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80',
  },
  {
    id: 't_scifi_intro',
    title: 'Cinematic Sci Fi Intro 01',
    duration: '00:09',
    durationSec: 9,
    category: 'Cinematic Intro',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
    movieTitle: 'NEO CYBER 2099',
    subtitle: 'QUANTUM DATA CORE',
    director: 'DIRECTOR | KYLE REESE',
    bgUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1280&q=80',
  },
  {
    id: 't_film_opener',
    title: 'Stock Film Opener',
    duration: '00:05',
    durationSec: 5,
    category: 'Cinematic Intro',
    thumbnail: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80',
    movieTitle: 'RETRO 35MM REEL',
    subtitle: 'ARCHIVAL CELLULOID STUDIO',
    director: 'DIRECTOR | QUENTIN T.',
    bgUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1280&q=80',
  },
];

export const VideoEditorStudio: React.FC<VideoEditorStudioProps> = ({ lang, onBackToStoryboard }) => {
  const isMl = lang === 'ml';

  // Selected Active Template (Defaulting to "Minimal Cinematic Opener 02" matching screenshot)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem>(TEMPLATES_LIST[4]);

  // Top Library Tab: Media | Stock Media | Audio | Titles | Transitions | Effects | Filters | Stickers | Templates
  const [activeMediaTab, setActiveMediaTab] = useState<string>('Templates');

  // Sub sidebar inside Templates: Trending, YouTube Intro, Cinematic Intro (selected), Business Intro, etc.
  const [activeSubCategory, setActiveSubCategory] = useState<string>('Cinematic Intro');

  // Right Inspector Tab: Video | Audio | Color | Speed
  const [activeInspectorTab, setActiveInspectorTab] = useState<'video' | 'audio' | 'color' | 'speed'>('video');
  const [activeVideoSubTab, setActiveVideoSubTab] = useState<'basic' | 'mask' | 'ai' | 'animation'>('basic');

  // Transform controls matching screenshot
  const [scaleX, setScaleX] = useState<number>(100.0);
  const [scaleY, setScaleY] = useState<number>(100.0);
  const [linkScale, setLinkScale] = useState<boolean>(true);
  const [posX, setPosX] = useState<number>(0.0);
  const [posY, setPosY] = useState<number>(0.0);
  const [rotationDeg, setRotationDeg] = useState<number>(0.0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Compositing controls
  const [blendMode, setBlendMode] = useState<string>('Normal');
  const [opacity, setOpacity] = useState<number>(100.0);

  // Background toggle & blur
  const [backgroundEnabled, setBackgroundEnabled] = useState<boolean>(false);
  const [bgType, setBgType] = useState<string>('Blur');

  // Custom User Uploaded Media
  const [customMediaUrl, setCustomMediaUrl] = useState<string | null>(null);
  const [customMediaType, setCustomMediaType] = useState<'video' | 'image'>('video');
  const fileUploadRef = useRef<HTMLInputElement | null>(null);

  // Video Playback & Timeline State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(1.76); // 00:00:01:23 in screenshot
  const totalDurationSec = selectedTemplate.durationSec;
  const [volume, setVolume] = useState<number>(85);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Timeline Tracks Controls
  const [track2Locked, setTrack2Locked] = useState<boolean>(false);
  const [track2Visible, setTrack2Visible] = useState<boolean>(true);
  const [track1Locked, setTrack1Locked] = useState<boolean>(false);
  const [track1Visible, setTrack1Visible] = useState<boolean>(true);
  const [audio1Locked, setAudio1Locked] = useState<boolean>(false);
  const [audio1Muted, setAudio1Muted] = useState<boolean>(false);

  // Title text customizable
  const [movieTitle, setMovieTitle] = useState<string>(selectedTemplate.movieTitle);
  const [subtitle, setSubtitle] = useState<string>(selectedTemplate.subtitle);
  const [directorText, setDirectorText] = useState<string>(selectedTemplate.director);

  // Export Modal state
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'MP4' | 'MOV' | 'GIF'>('MP4');
  const [exportResolution, setExportResolution] = useState<'4K' | '1080p' | '720p'>('1080p');
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Canvas Ref
  const playerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sync title when template changes
  useEffect(() => {
    setMovieTitle(selectedTemplate.movieTitle);
    setSubtitle(selectedTemplate.subtitle);
    setDirectorText(selectedTemplate.director);
  }, [selectedTemplate]);

  // Format Timecode to Filmora format "00:00:01:23" (HH:MM:SS:FF at 30fps)
  const formatTimecode = (sec: number) => {
    const s = Math.max(0, sec);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    const frames = Math.floor((s % 1) * 30);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Video Canvas Drawing Loop
  useEffect(() => {
    let active = true;
    const canvas = playerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgImage = new Image();
    bgImage.crossOrigin = 'anonymous';
    bgImage.src = customMediaUrl || selectedTemplate.bgUrl;

    const render = () => {
      if (!active) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Apply Transform
      ctx.translate(canvas.width / 2 + posX, canvas.height / 2 + posY);
      ctx.rotate((rotationDeg * Math.PI) / 180);
      ctx.scale((scaleX / 100) * (flipH ? -1 : 1), (scaleY / 100) * (flipV ? -1 : 1));
      ctx.globalAlpha = opacity / 100;

      // Draw background image or video frame
      if (bgImage.complete && bgImage.naturalWidth > 0) {
        ctx.drawImage(bgImage, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
      } else {
        // Gradient fallback
        const grad = ctx.createLinearGradient(-canvas.width / 2, -canvas.height / 2, canvas.width / 2, canvas.height / 2);
        grad.addColorStop(0, '#131b1e');
        grad.addColorStop(1, '#080a0c');
        ctx.fillStyle = grad;
        ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
      }

      // Draw subtle cinematic vignette
      const vigGrad = ctx.createRadialGradient(0, 0, canvas.width * 0.2, 0, 0, canvas.width * 0.65);
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);

      // Render Filmora Cinematic Title Overlay if Track 2 is visible
      if (track2Visible) {
        ctx.textAlign = 'center';

        // Subtitle (Top Producer)
        ctx.font = '600 13px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.letterSpacing = '3px';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 8;
        ctx.fillText(subtitle.toUpperCase(), 0, -45);

        // Huge Bold Center MOVIE NAME
        ctx.font = '900 68px "Impact", "Arial Black", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 16;
        ctx.fillText(movieTitle.toUpperCase(), 0, 22);

        // Director subtitle at bottom
        ctx.font = '600 11px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.letterSpacing = '2px';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(directorText.toUpperCase(), 0, 52);
      }

      ctx.restore();

      if (isPlaying) {
        setCurrentTimeSec((prev) => {
          if (prev >= totalDurationSec) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.033;
        });
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    selectedTemplate,
    customMediaUrl,
    movieTitle,
    subtitle,
    directorText,
    scaleX,
    scaleY,
    posX,
    posY,
    rotationDeg,
    flipH,
    flipV,
    opacity,
    isPlaying,
    track2Visible,
    totalDurationSec,
  ]);

  // Handle User File Upload
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomMediaUrl(url);
    if (file.type.startsWith('image/')) {
      setCustomMediaType('image');
    } else {
      setCustomMediaType('video');
    }
  };

  // Handle Export Simulation and Download
  const handleStartExport = () => {
    setIsExporting(true);
    setExportProgress(10);
    const interval = setInterval(() => {
      setExportProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          // Trigger canvas image / video frame download
          const canvas = playerCanvasRef.current;
          if (canvas) {
            const link = document.createElement('a');
            link.download = `${selectedTemplate.title.replace(/\s+/g, '_')}_Filmora.${exportFormat.toLowerCase() === 'gif' ? 'gif' : 'mp4'}`;
            link.href = canvas.toDataURL('image/png');
            link.click();
          }
          setShowExportModal(false);
          return 100;
        }
        return p + 18;
      });
    }, 280);
  };

  // Snapshot Tool
  const handleTakeSnapshot = () => {
    const canvas = playerCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Filmora_Snapshot_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#12161a] text-zinc-200 flex flex-col font-sans select-none overflow-hidden text-xs">
      {/* =========================================================================
          1. TOP APPLICATION MENU BAR (Wondershare Filmora Desktop Bar)
          ========================================================================= */}
      <div className="h-9 bg-[#101417] border-b border-[#21262d] flex items-center justify-between px-3 shrink-0 text-zinc-300">
        {/* Left: Filmora Logo + Menus */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onBackToStoryboard}>
            {/* Filmora Origami Teal Logo */}
            <div className="w-5 h-5 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-teal-400">
                <path d="M12 2L2 19.5h20L12 2zm0 3.8l6.7 11.7H5.3L12 5.8z" />
              </svg>
            </div>
            <span className="font-bold text-white text-[13px] tracking-tight">Wondershare Filmora</span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-zinc-400 text-xs pl-2 border-l border-zinc-800">
            <span className="hover:text-white cursor-pointer transition-colors">File</span>
            <span className="hover:text-white cursor-pointer transition-colors">Edit</span>
            <span className="hover:text-white cursor-pointer transition-colors">Tools</span>
            <span className="hover:text-white cursor-pointer transition-colors">View</span>
            <span className="hover:text-white cursor-pointer transition-colors">Help</span>
          </div>

          {/* Back to Story / Main page button */}
          <button
            type="button"
            onClick={onBackToStoryboard}
            className="ml-2 px-2.5 py-0.5 rounded bg-zinc-800 hover:bg-teal-500 hover:text-black text-[11px] font-semibold text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>{isMl ? 'തിരികെ (Back)' : 'Back'}</span>
          </button>
        </div>

        {/* Center: Untitled document title */}
        <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
          <span className="text-zinc-300 font-medium">{selectedTemplate.title}</span>
          <Check className="w-3.5 h-3.5 text-teal-400" />
        </div>

        {/* Right: Notification, Cart, Login & Bright Teal Export */}
        <div className="flex items-center gap-3">
          <Bell className="w-3.5 h-3.5 text-zinc-400 hover:text-white cursor-pointer" />
          <Cloud className="w-3.5 h-3.5 text-zinc-400 hover:text-white cursor-pointer" />
          <ShoppingCart className="w-3.5 h-3.5 text-zinc-400 hover:text-white cursor-pointer" />
          <button
            type="button"
            className="text-xs text-zinc-300 hover:text-white font-medium cursor-pointer"
          >
            Login
          </button>

          {/* VIBRANT TEAL EXPORT BUTTON */}
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-1 bg-teal-400 hover:bg-teal-300 text-zinc-950 font-bold rounded text-xs flex items-center gap-1 cursor-pointer shadow-md transition-all"
          >
            <span>Export</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Window Buttons */}
          <div className="flex items-center gap-2 pl-2 text-zinc-400">
            <Minus className="w-3 h-3 cursor-pointer hover:text-white" />
            <Square className="w-2.5 h-2.5 cursor-pointer hover:text-white" />
            <X className="w-3.5 h-3.5 cursor-pointer hover:text-rose-400" onClick={onBackToStoryboard} />
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. UPPER WORKSPACE (Media Library | 16:9 Video Player | Inspector Panel)
          ========================================================================= */}
      <div className="h-[52%] flex border-b border-[#21262d] overflow-hidden">
        {/* -------------------------------------------------------------
            COLUMN 1: ASSET & TEMPLATE BROWSER (LEFT)
            ------------------------------------------------------------- */}
        <div className="w-[36%] min-w-[340px] max-w-[480px] bg-[#171b20] border-r border-[#21262d] flex flex-col shrink-0">
          {/* Top Asset Category Tabs with Teal Active Underline */}
          <div className="flex items-center px-2 border-b border-[#21262d] overflow-x-auto no-scrollbar shrink-0 text-[11px] font-medium text-zinc-400 gap-3">
            {[
              { id: 'Media', label: 'Media', icon: Video },
              { id: 'Stock Media', label: 'Stock Media', icon: Film },
              { id: 'Audio', label: 'Audio', icon: Music },
              { id: 'Titles', label: 'Titles', icon: Type },
              { id: 'Transitions', label: 'Transitions', icon: SlidersHorizontal },
              { id: 'Effects', label: 'Effects', icon: Sparkles },
              { id: 'Filters', label: 'Filters', icon: Palette },
              { id: 'Stickers', label: 'Stickers', icon: Smile },
              { id: 'Templates', label: 'Templates', icon: Layers },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeMediaTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveMediaTab(tab.id)}
                  className={`py-2 px-1 flex flex-col items-center gap-1 cursor-pointer transition-colors relative whitespace-nowrap ${
                    isActive ? 'text-teal-400 font-bold' : 'hover:text-zinc-200'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {isActive && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400 rounded-t" />}
                </button>
              );
            })}
          </div>

          {/* Sub Layout: Left Sub-sidebar + Content Grid */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sub-Sidebar (Mine, Split Screen, Templates tree) */}
            <div className="w-28 bg-[#14181d] border-r border-[#21262d] p-2 space-y-1 text-[11px] shrink-0 text-zinc-400">
              <div className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-zinc-800 cursor-pointer">
                <ChevronRight className="w-3 h-3" />
                <span>Mine</span>
              </div>
              <div className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-zinc-800 cursor-pointer">
                <ChevronRight className="w-3 h-3" />
                <span>Split Screen</span>
              </div>
              <div className="pt-1">
                <div className="flex items-center gap-1 py-1 px-1.5 text-zinc-200 font-semibold cursor-pointer">
                  <ChevronDown className="w-3 h-3" />
                  <span>Templates</span>
                </div>
                <div className="pl-3.5 space-y-0.5">
                  {[
                    'Trending',
                    'YouTube Intro',
                    'Cinematic Intro',
                    'Business Intro',
                    'Logo Reveal',
                    'End Screen',
                    'Subscribe',
                    'Music Festival',
                  ].map((sub) => {
                    const isSelected = activeSubCategory === sub;
                    return (
                      <div
                        key={sub}
                        onClick={() => setActiveSubCategory(sub)}
                        className={`py-1 px-1.5 rounded text-[10px] cursor-pointer truncate transition-colors ${
                          isSelected ? 'text-teal-400 bg-teal-950/40 font-bold' : 'hover:text-zinc-200 hover:bg-zinc-800/50'
                        }`}
                      >
                        {sub}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upload user file */}
              <div className="pt-4">
                <input
                  ref={fileUploadRef}
                  type="file"
                  accept="video/*,image/*"
                  className="hidden"
                  onChange={handleMediaUpload}
                />
                <button
                  type="button"
                  onClick={() => fileUploadRef.current?.click()}
                  className="w-full py-1.5 bg-zinc-800 hover:bg-teal-500 hover:text-black text-teal-400 font-bold rounded text-[10px] border border-teal-500/30 flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <Upload className="w-3 h-3" />
                  <span>Import Media</span>
                </button>
              </div>
            </div>

            {/* Content Area: Search, Filters, 16:9 Grid */}
            <div className="flex-1 flex flex-col p-2 overflow-y-auto no-scrollbar space-y-2">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search templates"
                  className="w-full bg-[#101417] border border-zinc-700 rounded pl-8 pr-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-teal-400"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 overflow-x-auto no-scrollbar">
                <div className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 flex items-center gap-1 cursor-pointer whitespace-nowrap">
                  <span>Aspect Ratio: All</span>
                  <ChevronDown className="w-2.5 h-2.5" />
                </div>
                <div className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 flex items-center gap-1 cursor-pointer whitespace-nowrap">
                  <span>Clips: No limit</span>
                  <ChevronDown className="w-2.5 h-2.5" />
                </div>
                <div className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 flex items-center gap-1 cursor-pointer whitespace-nowrap">
                  <span>Duration: No limit</span>
                  <ChevronDown className="w-2.5 h-2.5" />
                </div>
              </div>

              {/* Section Header */}
              <div className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase pt-1">
                {activeSubCategory}
              </div>

              {/* 16:9 Thumbnail Cards Grid */}
              <div className="grid grid-cols-3 gap-2 pb-4">
                {TEMPLATES_LIST.map((tpl) => {
                  const isCur = selectedTemplate.id === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`group relative rounded overflow-hidden cursor-pointer border transition-all ${
                        isCur
                          ? 'border-teal-400 ring-2 ring-teal-400/40 shadow-lg'
                          : 'border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className="aspect-video bg-black relative">
                        <img
                          src={tpl.thumbnail}
                          alt={tpl.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Duration Pill at bottom left */}
                        <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/75 text-[9px] font-mono text-zinc-300">
                          {tpl.duration}
                        </div>
                        {/* Download / Active Icon at bottom right */}
                        <div className="absolute bottom-1 right-1 p-0.5 rounded-full bg-black/60 text-teal-400">
                          <Download className="w-2.5 h-2.5" />
                        </div>
                      </div>
                      <div className="bg-[#12161a] p-1 truncate text-[10px] font-medium text-zinc-300">
                        {tpl.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            COLUMN 2: CENTER 16:9 VIDEO PLAYER & CONTROLS
            ------------------------------------------------------------- */}
        <div className="flex-1 bg-[#0b0e12] flex flex-col justify-between overflow-hidden">
          {/* Top Player Status Bar */}
          <div className="h-7 px-3 bg-[#101417] border-b border-[#21262d] flex items-center justify-between text-[11px] text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-200">Player</span>
              <div className="flex items-center gap-1 cursor-pointer hover:text-white">
                <span>Full Quality</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tv className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
            </div>
          </div>

          {/* Centered 16:9 Screen */}
          <div className="flex-1 flex items-center justify-center p-3 relative overflow-hidden bg-black">
            <div className="aspect-video max-h-full max-w-full relative shadow-2xl rounded border border-zinc-800 overflow-hidden bg-black flex items-center justify-center">
              <canvas
                ref={playerCanvasRef}
                width={1280}
                height={720}
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>
          </div>

          {/* Bottom Player Controls Bar */}
          <div className="bg-[#101417] border-t border-[#21262d] px-3 py-1.5 flex flex-col gap-1 shrink-0">
            {/* Scrubber Progress Bar */}
            <div className="relative w-full flex items-center cursor-pointer group">
              <input
                type="range"
                min="0"
                max={totalDurationSec}
                step="0.05"
                value={currentTimeSec}
                onChange={(e) => setCurrentTimeSec(Number(e.target.value))}
                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-teal-400 group-hover:h-1.5 transition-all"
              />
            </div>

            {/* Play, Step, Timecode, Audio, Fullscreen Controls */}
            <div className="flex items-center justify-between text-zinc-300">
              {/* Left Playback Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentTimeSec(0)}
                  className="hover:text-teal-400 cursor-pointer"
                  title="Previous Frame"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 rounded-full bg-teal-400 hover:bg-teal-300 text-black font-bold cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTimeSec((t) => Math.min(totalDurationSec, t + 1))}
                  className="hover:text-teal-400 cursor-pointer"
                  title="Next Frame"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentTimeSec(0);
                  }}
                  className="hover:text-rose-400 cursor-pointer"
                  title="Stop"
                >
                  <Square className="w-3 h-3" />
                </button>

                {/* Exact Filmora Timecode Display */}
                <div className="text-[11px] font-mono text-zinc-300 pl-2">
                  <span className="text-teal-400">{formatTimecode(currentTimeSec)}</span>
                  <span className="text-zinc-600"> / </span>
                  <span className="text-zinc-400">{formatTimecode(totalDurationSec)}</span>
                </div>
              </div>

              {/* Right Tools: Markers, Snapshot Camera, Volume, Maximize */}
              <div className="flex items-center gap-3 text-zinc-400">
                <button type="button" className="hover:text-white cursor-pointer text-xs" title="Mark In">
                  &#123;
                </button>
                <button type="button" className="hover:text-white cursor-pointer text-xs" title="Mark Out">
                  &#125;
                </button>
                <span className="text-[10px] text-zinc-400 border border-zinc-700 px-1 rounded">16:9</span>

                <button
                  type="button"
                  onClick={handleTakeSnapshot}
                  className="hover:text-teal-400 cursor-pointer"
                  title="Snapshot Camera"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="hover:text-white cursor-pointer"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-12 h-1 accent-teal-400 cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!document.fullscreenElement) {
                      playerCanvasRef.current?.requestFullscreen();
                    } else {
                      document.exitFullscreen();
                    }
                  }}
                  className="hover:text-white cursor-pointer"
                  title="Fullscreen"
                >
                  <Maximize className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            COLUMN 3: RIGHT PROPERTIES & INSPECTOR PANEL
            ------------------------------------------------------------- */}
        <div className="w-[28%] min-w-[280px] max-w-[380px] bg-[#14181d] border-l border-[#21262d] flex flex-col shrink-0">
          {/* Main Tabs: Video | Audio | Color | Speed */}
          <div className="grid grid-cols-4 border-b border-[#21262d] text-[11px] font-semibold text-center text-zinc-400 bg-[#101417]">
            {(['video', 'audio', 'color', 'speed'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveInspectorTab(tab)}
                className={`py-2 capitalize cursor-pointer transition-colors relative ${
                  activeInspectorTab === tab ? 'text-teal-400 font-bold' : 'hover:text-zinc-200'
                }`}
              >
                {tab}
                {activeInspectorTab === tab && (
                  <div className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400" />
                )}
              </button>
            ))}
          </div>

          {/* Sub Tabs under Video: Basic | Mask | AI Tools | Animation */}
          {activeInspectorTab === 'video' && (
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#21262d] bg-[#12161a] text-[10px]">
              {(['basic', 'mask', 'ai', 'animation'] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setActiveVideoSubTab(sub)}
                  className={`px-2.5 py-0.5 rounded-full capitalize font-medium cursor-pointer transition-colors ${
                    activeVideoSubTab === sub
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {sub === 'ai' ? 'AI Tools' : sub}
                </button>
              ))}
            </div>
          )}

          {/* Inspector Content Controls (Scrollable) */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
            {/* Quick Title Edit (Allows customizing the movie title from screenshot) */}
            <div className="p-2.5 rounded bg-[#101417] border border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Cinematic Titles</span>
              <div className="space-y-1.5 text-[11px]">
                <div>
                  <span className="text-zinc-500 text-[10px]">Main Title:</span>
                  <input
                    type="text"
                    value={movieTitle}
                    onChange={(e) => setMovieTitle(e.target.value)}
                    className="w-full bg-[#181c22] border border-zinc-700 rounded px-2 py-0.5 text-white font-bold text-xs"
                  />
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px]">Subtitle:</span>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full bg-[#181c22] border border-zinc-700 rounded px-2 py-0.5 text-zinc-300 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Collapsible: Transform */}
            <div className="space-y-2 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                  <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
                  <span>Transform</span>
                </div>
                <div className="w-2.5 h-2.5 rotate-45 border-r border-b border-zinc-500 cursor-pointer" />
              </div>

              {/* Scale X & Y with Link Lock */}
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Scale</span>
                  <span className="font-mono text-zinc-200">{scaleX.toFixed(2)} %</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-[10px]">X</span>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={scaleX}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setScaleX(v);
                      if (linkScale) setScaleY(v);
                    }}
                    className="flex-1 h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setLinkScale(!linkScale)}
                    className={`p-1 rounded cursor-pointer ${linkScale ? 'text-teal-400' : 'text-zinc-500'}`}
                    title="Link Scale Ratio"
                  >
                    <Lock className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-[10px]">Y</span>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={scaleY}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setScaleY(v);
                      if (linkScale) setScaleX(v);
                    }}
                    className="flex-1 h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                  />
                  <div className="w-5" />
                </div>
              </div>

              {/* Position X & Y */}
              <div className="space-y-1 text-[11px]">
                <span className="text-zinc-400">Position</span>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="bg-[#101417] p-1 rounded border border-zinc-700 flex items-center justify-between">
                    <span className="text-zinc-500">X</span>
                    <input
                      type="number"
                      value={posX}
                      onChange={(e) => setPosX(Number(e.target.value))}
                      className="w-16 bg-transparent text-right text-zinc-200 text-xs"
                    />
                    <span className="text-zinc-500 text-[10px]">px</span>
                  </div>
                  <div className="bg-[#101417] p-1 rounded border border-zinc-700 flex items-center justify-between">
                    <span className="text-zinc-500">Y</span>
                    <input
                      type="number"
                      value={posY}
                      onChange={(e) => setPosY(Number(e.target.value))}
                      className="w-16 bg-transparent text-right text-zinc-200 text-xs"
                    />
                    <span className="text-zinc-500 text-[10px]">px</span>
                  </div>
                </div>
              </div>

              {/* Rotate Dial */}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Rotate</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={rotationDeg}
                    onChange={(e) => setRotationDeg(Number(e.target.value))}
                    className="w-20 h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                  />
                  <span className="font-mono text-zinc-200">{rotationDeg.toFixed(2)}°</span>
                </div>
              </div>

              {/* Flip Buttons */}
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-zinc-400">Flip</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFlipH(!flipH)}
                    className={`px-2.5 py-1 rounded border text-xs cursor-pointer ${
                      flipH ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-[#101417] border-zinc-700 text-zinc-400 hover:text-white'
                    }`}
                  >
                    &#8644;
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlipV(!flipV)}
                    className={`px-2.5 py-1 rounded border text-xs cursor-pointer ${
                      flipV ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-[#101417] border-zinc-700 text-zinc-400 hover:text-white'
                    }`}
                  >
                    &#8645;
                  </button>
                </div>
              </div>
            </div>

            {/* Collapsible: Compositing */}
            <div className="space-y-2 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                  <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
                  <span>Compositing</span>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Blend Mode</span>
                  <select
                    value={blendMode}
                    onChange={(e) => setBlendMode(e.target.value)}
                    className="bg-[#101417] border border-zinc-700 rounded px-2 py-0.5 text-zinc-200 text-xs"
                  >
                    <option>Normal</option>
                    <option>Multiply</option>
                    <option>Screen</option>
                    <option>Overlay</option>
                    <option>Darken</option>
                    <option>Lighten</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Opacity</span>
                    <span className="font-mono text-zinc-200">{opacity.toFixed(2)} %</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Collapsible: Background */}
            <div className="space-y-2 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                  <button
                    type="button"
                    onClick={() => setBackgroundEnabled(!backgroundEnabled)}
                    className={`w-3 h-3 rounded-full border cursor-pointer ${
                      backgroundEnabled ? 'bg-teal-400 border-teal-400' : 'border-zinc-500'
                    }`}
                  />
                  <span>Background</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Inspector Buttons */}
          <div className="p-2 border-t border-[#21262d] bg-[#101417] flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => {
                setScaleX(100);
                setScaleY(100);
                setPosX(0);
                setPosY(0);
                setRotationDeg(0);
                setFlipH(false);
                setFlipV(false);
                setOpacity(100);
              }}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium flex items-center gap-1.5 cursor-pointer relative"
            >
              <span>Keyframe Panel</span>
              <span className="px-1 py-0.2 bg-rose-500 text-white font-extrabold text-[8px] rounded uppercase">NEW</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. LOWER WORKSPACE: TIMELINE & MULTI-TRACKS
          ========================================================================= */}
      <div className="flex-1 flex flex-col bg-[#14181d] overflow-hidden">
        {/* Timeline Toolbar (Scissors, Undo, Redo, Text, Markers, Zoom Slider) */}
        <div className="h-8 bg-[#101417] border-b border-[#21262d] flex items-center justify-between px-3 shrink-0 text-zinc-400">
          <div className="flex items-center gap-3">
            <button type="button" title="Undo" className="hover:text-white cursor-pointer">
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button type="button" title="Redo" className="hover:text-white cursor-pointer">
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button type="button" title="Delete Clip" className="hover:text-rose-400 cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-zinc-800" />
            <button type="button" title="Split Razor" className="text-rose-400 hover:text-white cursor-pointer">
              <Scissors className="w-3.5 h-3.5" />
            </button>
            <button type="button" title="Crop" className="hover:text-white cursor-pointer">
              <Crop className="w-3.5 h-3.5" />
            </button>
            <button type="button" title="Quick Title (T)" className="hover:text-white cursor-pointer">
              <Type className="w-3.5 h-3.5" />
            </button>
            <button type="button" title="AI Effects" className="hover:text-white cursor-pointer">
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button type="button" title="Color Wheels" className="hover:text-white cursor-pointer">
              <Palette className="w-3.5 h-3.5" />
            </button>
            <button type="button" title="Record Voiceover" className="text-emerald-400 hover:text-white cursor-pointer">
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Minus className="w-3 h-3 hover:text-white cursor-pointer" />
            <div className="w-24 h-1 bg-zinc-700 rounded-lg relative cursor-pointer">
              <div className="w-8 h-1 bg-teal-400 rounded-lg" />
            </div>
            <Plus className="w-3 h-3 hover:text-white cursor-pointer" />
          </div>
        </div>

        {/* Timeline Tracks Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Track Control Headers */}
          <div className="w-32 bg-[#12161a] border-r border-[#21262d] flex flex-col shrink-0 text-[10px] text-zinc-400 divide-y divide-[#21262d]">
            {/* Track 2 Header (Title Track) */}
            <div className="h-12 px-2 flex items-center justify-between bg-[#14181d]">
              <div className="flex items-center gap-1.5 font-bold text-zinc-300">
                <Type className="w-3 h-3 text-amber-400" />
                <span>2 / Title</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <button type="button" onClick={() => setTrack2Locked(!track2Locked)}>
                  {track2Locked ? <Lock className="w-2.5 h-2.5 text-amber-400" /> : <Unlock className="w-2.5 h-2.5" />}
                </button>
                <button type="button" onClick={() => setTrack2Visible(!track2Visible)}>
                  {track2Visible ? <Eye className="w-2.5 h-2.5 text-teal-400" /> : <EyeOff className="w-2.5 h-2.5" />}
                </button>
              </div>
            </div>

            {/* Track 1 Header (Video Track) */}
            <div className="h-12 px-2 flex items-center justify-between bg-[#14181d]">
              <div className="flex items-center gap-1.5 font-bold text-zinc-300">
                <Video className="w-3 h-3 text-teal-400" />
                <span>1 / Video 1</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <button type="button" onClick={() => setTrack1Locked(!track1Locked)}>
                  {track1Locked ? <Lock className="w-2.5 h-2.5 text-amber-400" /> : <Unlock className="w-2.5 h-2.5" />}
                </button>
                <button type="button" onClick={() => setTrack1Visible(!track1Visible)}>
                  {track1Visible ? <Eye className="w-2.5 h-2.5 text-teal-400" /> : <EyeOff className="w-2.5 h-2.5" />}
                </button>
              </div>
            </div>

            {/* Audio Track 1 Header */}
            <div className="h-12 px-2 flex items-center justify-between bg-[#14181d]">
              <div className="flex items-center gap-1.5 font-bold text-zinc-300">
                <Music className="w-3 h-3 text-emerald-400" />
                <span>1 / Audio 1</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <button type="button" onClick={() => setAudio1Muted(!audio1Muted)}>
                  {audio1Muted ? <VolumeX className="w-2.5 h-2.5 text-rose-400" /> : <Volume2 className="w-2.5 h-2.5 text-emerald-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Right Track Timeline Area with Ruler & Clips */}
          <div className="flex-1 flex flex-col overflow-x-auto relative bg-[#0d1013]">
            {/* Time Ruler (00:00:00, 00:00:05:00, 00:00:10:00 ...) */}
            <div className="h-6 bg-[#101417] border-b border-[#21262d] flex items-center px-2 text-[9px] font-mono text-zinc-500 shrink-0 gap-16 select-none">
              <span>00:00:00</span>
              <span>00:00:05:00</span>
              <span>00:00:10:00</span>
              <span>00:00:15:00</span>
              <span>00:00:20:00</span>
              <span>00:00:25:00</span>
              <span>00:00:30:00</span>
              <span>00:00:35:00</span>
              <span>00:00:40:00</span>
              <span>00:00:45:00</span>
            </div>

            {/* Tracks Body */}
            <div className="flex-1 flex flex-col divide-y divide-[#21262d]/50 relative py-1">
              {/* Red Vertical Playhead Line with Salmon Scissor Handle */}
              <div
                className="absolute top-0 bottom-0 z-30 pointer-events-none transition-all duration-75"
                style={{ left: `${Math.max(12, (currentTimeSec / totalDurationSec) * 600)}px` }}
              >
                {/* Salmon Red Playhead Scissor Head */}
                <div className="w-6 h-6 -ml-3 rounded-full bg-[#f87171] border border-white text-zinc-950 flex items-center justify-center shadow-lg">
                  <Scissors className="w-3 h-3" />
                </div>
                <div className="w-0.5 h-full bg-[#f87171] mx-auto shadow-sm" />
              </div>

              {/* Track 2 Content: Title Overlay Clip */}
              <div className="h-12 relative px-2 flex items-center">
                <div className="h-9 w-64 bg-amber-600/90 rounded border border-amber-400/80 px-2 flex items-center justify-between text-white shadow-md">
                  <div className="flex items-center gap-1.5 truncate">
                    <Type className="w-3 h-3 text-amber-200" />
                    <span className="font-bold text-[11px] truncate">{movieTitle}</span>
                  </div>
                  <span className="text-[9px] font-mono opacity-80">21.0s</span>
                </div>
              </div>

              {/* Track 1 Content: Video Strip with Thumbnail */}
              <div className="h-12 relative px-2 flex items-center">
                <div className="h-10 w-96 bg-[#1a232e] rounded border border-teal-500/80 flex items-center overflow-hidden shadow-md">
                  <img
                    src={selectedTemplate.thumbnail}
                    alt="Thumbnail"
                    className="w-16 h-full object-cover border-r border-teal-500/50 shrink-0"
                  />
                  <div className="p-2 flex-1 flex flex-col justify-center">
                    <span className="font-bold text-teal-300 text-[11px] truncate">{selectedTemplate.title}</span>
                    <span className="text-[9px] text-zinc-400">1080p 60fps • 16:9 Cinema</span>
                  </div>
                </div>
              </div>

              {/* Track 3 (Audio 1): Music Waveform Clip */}
              <div className="h-12 relative px-2 flex items-center">
                <div className="h-8 w-96 bg-emerald-950/80 rounded border border-emerald-500/60 px-2 flex items-center justify-between text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <Music className="w-3 h-3" />
                    <span className="text-[11px] font-semibold">Cinematic Trailer Score (Stereo 48kHz)</span>
                  </div>
                  <span className="text-[9px] font-mono">00:21:06</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. EXPORT MODAL (Wondershare Filmora 4K/1080p Export Dialogue)
          ========================================================================= */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#14181d] rounded-xl border border-zinc-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 text-teal-400">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M12 2L2 19.5h20L12 2z" />
                  </svg>
                </div>
                <h3 className="font-bold text-white text-sm">Export Filmora Video</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-zinc-400">Project Name:</span>
                <input
                  type="text"
                  defaultValue={`${selectedTemplate.title}_Final`}
                  className="w-full bg-[#101417] border border-zinc-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-zinc-400">Format:</span>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="w-full bg-[#101417] border border-zinc-700 rounded px-2 py-1.5 text-white"
                  >
                    <option value="MP4">MP4 Video (H.264)</option>
                    <option value="MOV">MOV Apple ProRes</option>
                    <option value="GIF">Animated GIF</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-400">Resolution:</span>
                  <select
                    value={exportResolution}
                    onChange={(e) => setExportResolution(e.target.value as any)}
                    className="w-full bg-[#101417] border border-zinc-700 rounded px-2 py-1.5 text-white"
                  >
                    <option value="4K">4K UHD (3840 × 2160)</option>
                    <option value="1080p">1080p Full HD (1920 × 1080)</option>
                    <option value="720p">720p HD (1280 × 720)</option>
                  </select>
                </div>
              </div>

              {isExporting && (
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-[11px] text-teal-400">
                    <span>Rendering 16:9 Video...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-400 transition-all duration-200"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartExport}
                disabled={isExporting}
                className="px-5 py-1.5 rounded bg-teal-400 hover:bg-teal-300 text-zinc-950 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
