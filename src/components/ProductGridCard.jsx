/**
 * ProductGridCard — single tile in the storefront grid.
 *
 * Props:
 *   product       — { id, nameAr, nameEn, price, images, ... }
 *   isFavorite    — boolean
 *   onToggleFav   — () => void
 *   onOpen        — () => void  (opens ProductDetail)
 *
 * Animations live on the card itself (initial/animate); the parent grid
 * is intentionally a simple <section> with no orchestration variants.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ImageIcon } from 'lucide-react';

const formatDZD = (n) =>
  new Intl.NumberFormat('ar-DZ', { maximumFractionDigits: 0 }).format(n || 0);

export default function ProductGridCard({ product, isFavorite, onToggleFav, onOpen, index = 0 }) {
  const cover = product.images?.[0];
  const count = product.images?.length || 0;
  const [animationClass, setAnimationClass] = useState('');

  const handleOpen = (e) => {
    e.preventDefault();
    setAnimationClass('animate-ice-melt');
    // Wait for melting keyframe animation (0.85s)
    setTimeout(() => {
      onOpen();
      // Prepare the refreezing animation once open
      setTimeout(() => {
        setAnimationClass('animate-ice-refreeze');
        // Reset completely after refreeze finishes (0.6s)
        setTimeout(() => {
          setAnimationClass('');
        }, 600);
      }, 400);
    }, 850);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }}
      whileHover={animationClass ? {} : { y: -4 }}
      className="group relative"
    >
      <button
        onClick={handleOpen}
        className={`card block w-full text-right focus:outline-none focus:ring-2 focus:ring-sage/40 ${animationClass}`}
        aria-label={`عرض ${product.nameAr}`}
      >
        <div className="relative aspect-[3/4] bg-cream overflow-hidden">
          {cover ? (
            <img
              src={cover}
              alt={product.nameAr}
              loading="lazy"
              className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink/30">
              <ImageIcon className="w-10 h-10" />
            </div>
          )}

          {count > 1 && (
            <span className="absolute top-3 right-3 glass-dark text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              {count}
            </span>
          )}

          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onToggleFav?.(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onToggleFav?.(); } }}
            className="absolute top-3 left-3 w-9 h-9 rounded-full glass flex items-center justify-center transition active:scale-90"
            aria-label={isFavorite ? 'إزالة من المفضّلة' : 'إضافة إلى المفضّلة'}
          >
            <Heart
              className={`w-4 h-4 transition ${isFavorite ? 'fill-blush text-blush' : 'text-ink/60'}`}
            />
          </span>
        </div>

        <div className="p-3 md:p-4">
          <h3 className="text-sm md:text-base font-semibold text-ink line-clamp-1">
            {product.nameAr}
          </h3>
          {product.nameEn && (
            <p className="text-[11px] text-ink/40 mt-0.5 font-display italic line-clamp-1">
              {product.nameEn}
            </p>
          )}
          <div className="flex items-baseline gap-1 mt-2">
            <span className="gradient-text font-bold text-base md:text-lg">{formatDZD(product.price)}</span>
            <span className="text-[10px] text-ink/50">دج</span>
          </div>
        </div>
      </button>
    </motion.article>
  );
}
