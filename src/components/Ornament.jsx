/**
 * Ornament — the Afnan signature: an Algerian/Maghrebi eight-point khatam star
 * rendered as crisp hairline gold geometry.
 *
 * This is the one motif the storefront is remembered by. It appears three ways,
 * all derived from the same star so the identity stays coherent:
 *
 *   <StarGlyph/>     a single small star — section eyebrow / inline accent
 *   <OrnateDivider/> a gold hairline rule with a star medallion at its center
 *   <Zellige/>       a faint tessellating star lattice, laid only over the deep
 *                    emerald surfaces (splash, brand story, footer) as texture
 *
 * Pure SVG + tokens, no raster assets, so it stays sharp at any size and tints
 * itself from `currentColor`. Reduced-motion is irrelevant here — nothing moves.
 */
import { useId } from 'react';

/* Build an N-point star path centered at (cx,cy). Default 8 points = khatam. */
function starPath(cx, cy, outer, inner, points = 8, rot = -Math.PI / 2) {
  const step = Math.PI / points;
  let d = '';
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + i * step;
    d += `${i === 0 ? 'M' : 'L'}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)} `;
  }
  return `${d}Z`;
}

const GLYPH = starPath(12, 12, 11, 4.6);

/* A single star — fill (default) for accents, or stroke for an outlined look. */
export function StarGlyph({ className = 'w-4 h-4', variant = 'fill', strokeWidth = 1.4 }) {
  const stroke = variant === 'stroke';
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d={GLYPH}
        fill={stroke ? 'none' : 'currentColor'}
        stroke={stroke ? 'currentColor' : 'none'}
        strokeWidth={stroke ? strokeWidth : 0}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Gold hairline rule with a small khatam medallion at the center. */
export function OrnateDivider({ className = '', width = 'w-40' }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${width} ${className}`} aria-hidden="true">
      <span className="lux-divider flex-1" />
      <span className="text-gold relative inline-flex items-center justify-center">
        <StarGlyph className="w-3.5 h-3.5" variant="stroke" strokeWidth={1.2} />
        <span className="absolute w-1 h-1 rounded-full bg-gold" />
      </span>
      <span className="lux-divider flex-1" />
    </div>
  );
}

/*
 * Zellige — a faint tessellating star lattice for deep-emerald surfaces only.
 * Full stars sit on the tile corners and center so the motif tiles seamlessly;
 * a thin diamond grid links the centers. Kept very low opacity: it's texture,
 * never pattern noise. Tints from `currentColor`, so the tone is set with a
 * Tailwind text-* class (defaults to text-gold-soft) — no raw hex.
 */
export function Zellige({ className = 'text-gold-soft', size = 58, opacity = 0.08 }) {
  const id = useId().replace(/:/g, '');
  const c = size / 2;
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id={`zlg-${id}`} width={size} height={size} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="0.9" opacity={opacity}>
            {/* diamond lattice linking star centers */}
            <path d={`M${c} 0 L${size} ${c} L${c} ${size} L0 ${c} Z`} />
            {/* corner + center khatam stars (corners shared across tiles) */}
            <path d={starPath(size, 0, 9, 3.6)} />
            <path d={starPath(0, size, 9, 3.6)} />
            <path d={starPath(size, size, 9, 3.6)} />
            <path d={starPath(0, 0, 9, 3.6)} />
            <path d={starPath(c, c, 9, 3.6)} fill="currentColor" fillOpacity={opacity * 0.6} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#zlg-${id})`} />
    </svg>
  );
}
