import React, { useRef } from 'react';
import { RotateCcw } from 'lucide-react';

export interface ColorWheelValue {
  x: number; // -1..1
  y: number; // -1..1
  strength: number; // 0..100
  hex: string;
}

export const DEFAULT_COLOR_WHEEL_VALUE: ColorWheelValue = {
  x: 0,
  y: 0,
  strength: 0,
  hex: '#ffffff',
};

export interface ColorGradeAdjustments {
  brightness: number; // 40..180
  exposure: number; // -50..50
  contrast: number; // 40..200
  saturation: number; // 0..200
  warmth: number; // -50..80 (negative = cool, positive = warm)
  tint: number; // -45..45 (green <-> magenta)
  vignette: number; // 0..90
  lutIntensity: number; // 0..100
  lift: ColorWheelValue; // Shadows wheel
  gamma: ColorWheelValue; // Midtones wheel
  gain: ColorWheelValue; // Highlights wheel
}

export const DEFAULT_COLOR_GRADE_ADJUSTMENTS: ColorGradeAdjustments = {
  brightness: 100,
  exposure: 0,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  tint: 0,
  vignette: 12,
  lutIntensity: 100,
  lift: DEFAULT_COLOR_WHEEL_VALUE,
  gamma: DEFAULT_COLOR_WHEEL_VALUE,
  gain: DEFAULT_COLOR_WHEEL_VALUE,
};

function hslToHex(hDeg: number, sPct: number, lPct: number): string {
  const s = sPct / 100;
  const l = lPct / 100;
  const k = (n: number) => (n + hDeg / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function wheelPointToColor(x: number, y: number): { hex: string; mag: number } {
  const mag = Math.min(1, Math.hypot(x, y));
  if (mag < 0.04) return { hex: '#ffffff', mag: 0 };
  // 0 deg at top (red), clockwise
  const rad = Math.atan2(x, -y);
  const deg = ((rad * 180) / Math.PI + 360) % 360;
  const hex = hslToHex(deg, Math.round(mag * 95), 55);
  return { hex, mag };
}

interface ColorWheelPadProps {
  label: string;
  subLabel: string;
  value: ColorWheelValue;
  onChange: (next: ColorWheelValue) => void;
  isCssRotatedLandscape?: boolean;
  sizePx?: number;
}

export const ColorWheelPad: React.FC<ColorWheelPadProps> = ({
  label,
  subLabel,
  value,
  onChange,
  isCssRotatedLandscape = false,
  sizePx = 68,
}) => {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<boolean>(false);

  const updateFromClient = (clientX: number, clientY: number) => {
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let nx = 0;
    let ny = 0;
    if (isCssRotatedLandscape && rect.width > 0 && rect.height > 0) {
      const rx = (clientY - rect.top) / rect.height;
      const ry = 1 - (clientX - rect.left) / rect.width;
      nx = (rx - 0.5) * 2;
      ny = (ry - 0.5) * 2;
    } else if (rect.width > 0 && rect.height > 0) {
      const rx = (clientX - rect.left) / rect.width;
      const ry = (clientY - rect.top) / rect.height;
      nx = (rx - 0.5) * 2;
      ny = (ry - 0.5) * 2;
    }
    const dist = Math.hypot(nx, ny);
    if (dist > 1) {
      nx /= dist;
      ny /= dist;
    }
    const { hex, mag } = wheelPointToColor(nx, ny);
    onChange({
      x: Number(nx.toFixed(3)),
      y: Number(ny.toFixed(3)),
      strength: mag < 0.04 ? 0 : Math.max(15, Math.round(mag * 100)),
      hex,
    });
  };

  const knobLeftPct = 50 + value.x * 46;
  const knobTopPct = 50 + value.y * 46;

  return (
    <div className="p-1.5 rounded-xl bg-[#101520] border border-zinc-800 flex flex-col items-center gap-1 select-none">
      <div className="w-full flex items-center justify-between px-0.5">
        <div className="min-w-0">
          <div className="text-[9px] font-extrabold text-white truncate">{label}</div>
          <div className="text-[7.5px] text-zinc-400 truncate">{subLabel}</div>
        </div>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_COLOR_WHEEL_VALUE)}
          className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer shrink-0"
          title={`Reset ${label}`}
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
      </div>

      <div
        ref={wheelRef}
        onPointerDown={(e) => {
          e.stopPropagation();
          draggingRef.current = true;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
          updateFromClient(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          updateFromClient(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (!draggingRef.current) return;
          draggingRef.current = false;
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        style={{
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          background:
            'radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.22) 48%, rgba(0,0,0,0.25) 100%), conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #d946ef, #ef4444)',
        }}
        className="relative rounded-full border border-zinc-600 shadow-inner cursor-crosshair touch-none shrink-0"
      >
        <div
          className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${knobLeftPct}%`,
            top: `${knobTopPct}%`,
            backgroundColor: value.hex,
          }}
        />
      </div>

      <div className="w-full flex items-center gap-1 px-0.5">
        <input
          type="range"
          min={0}
          max={100}
          value={value.strength}
          onChange={(e) => onChange({ ...value, strength: Number(e.target.value) })}
          className="w-full accent-teal-400 h-1 cursor-pointer"
        />
        <span className="text-[7.5px] font-mono tabular-nums text-zinc-300 w-6 text-right shrink-0">
          {value.strength}%
        </span>
      </div>
    </div>
  );
};
