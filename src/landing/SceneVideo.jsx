/**
 * SceneVideo — one full-screen, stacked background layer for a single scene.
 *
 * All scenes are absolutely stacked; the active one fades to opacity-100 and the
 * rest to 0 (the cross-fade). The clip only mounts + plays once the scene is
 * active or adjacent (`load`), and pauses + rewinds when it leaves view to spare
 * the CPU. Under `prefers-reduced-motion` the poster image is shown instead of
 * an autoplaying video. A darkening emerald scrim keeps the overlay text legible.
 */
import { useEffect, useRef } from 'react';
import { Zellige } from '../components/Ornament.jsx';

export default function SceneVideo({ scene, active, load, reduced, paused, isNext }) {
  const ref = useRef(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active && !reduced && !paused) {
      try { v.currentTime = 0; } catch { /* not seekable yet */ }
      v.play?.().catch(() => { /* autoplay blocked — poster stays */ });
    } else {
      v.pause?.();
    }
  }, [active, reduced, paused, load]);

  const pos = scene.objectPosition || 'center';
  const showVideo = load && !reduced;

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-700 ease-out will-change-[opacity] ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden={!active}
    >
      {showVideo ? (
        <video
          ref={ref}
          src={scene.video}
          poster={scene.poster}
          muted
          loop
          playsInline
          preload={active || isNext ? 'auto' : 'metadata'}
          className="w-full h-full object-cover"
          style={{ objectPosition: pos }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <img
          src={scene.poster}
          alt={active ? scene.posterAlt || '' : ''}
          className="w-full h-full object-cover"
          style={{ objectPosition: pos }}
          loading={active ? 'eager' : 'lazy'}
        />
      )}

      {/* Legibility scrim — content sits start-aligned, so weight the bottom. */}
      <div className="absolute inset-0 bg-gradient-to-t from-forest/90 via-forest/45 to-forest/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-forest/55 via-transparent to-transparent" />
      {active && <Zellige opacity={0.05} />}
    </div>
  );
}
