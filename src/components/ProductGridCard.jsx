/**
 * ProductGridCard — single tile in the storefront grid (luxury emerald/gold).
 *
 * Hover-reveal (inspired by the "product card animation" reference): on hover
 * the card lifts, the cover slowly zooms, a deep-emerald wash sweeps up, and
 * the product name + a "view details" cue reveal over the image. On touch the
 * card stays clean and simply opens on tap. The cover keeps a `layoutId` so
 * tapping performs the shared-element flight into the ProductDetail sheet.
 *
 * Props:
 *   product, isFavorite, onToggleFav, onOpen, onAddToCart
 */
import { motion } from 'framer-motion';
import { Heart, ImageIcon, Plus, ArrowLeft } from 'lucide-react';
import { staggerChild, SPRING, EASE } from '../lib/motion.js';
import { isNewProduct } from './ClientStorefront.jsx';

const formatDZD = (n) =>
  new Intl.NumberFormat('ar-DZ', { maximumFractionDigits: 0 }).format(n || 0);

/* Variant sets — driven by the card's rest/hover state and propagated down. */
const cardV    = { rest: { y: 0 },                 hover: { y: -8 } };
const imgV     = { rest: { scale: 1 },             hover: { scale: 1.12 } };
const washV    = { rest: { opacity: 0 },           hover: { opacity: 1 } };
const revealV  = { rest: { opacity: 0, y: 20 },    hover: { opacity: 1, y: 0 } };

export default function ProductGridCard({ product, isFavorite, onToggleFav, onOpen, onAddToCart }) {
  const cover = product.images?.[0];
  const count = product.images?.length || 0;
  const isNew = isNewProduct(product);

  return (
    <motion.article variants={staggerChild} className="group relative">
      <motion.div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
        initial="rest"
        animate="rest"
        whileHover="hover"
        whileTap={{ scale: 0.985 }}
        variants={cardV}
        transition={SPRING.soft}
        className="card-lux block w-full cursor-pointer text-right outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
        aria-label={`عرض ${product.nameAr}`}
      >
        <div className="relative aspect-[3/4] bg-sand overflow-hidden">
          <motion.div layoutId={`pcard-${product.id}`} className="absolute inset-0">
            {cover ? (
              <motion.img
                src={cover}
                alt={product.nameAr}
                loading="lazy"
                variants={imgV}
                transition={{ duration: 0.9, ease: EASE }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-bark/25">
                <ImageIcon className="w-10 h-10" />
              </div>
            )}
          </motion.div>

          {/* Hover wash + name reveal */}
          <motion.div
            variants={washV}
            transition={{ duration: 0.4, ease: EASE }}
            className="absolute inset-0 bg-gradient-to-t from-forest/90 via-forest/25 to-transparent pointer-events-none"
          />
          <motion.div
            variants={revealV}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute bottom-3 inset-x-3 z-10 flex items-end justify-between gap-2 pointer-events-none"
          >
            <div className="min-w-0">
              <p className="text-ivory font-semibold text-sm line-clamp-1 drop-shadow">{product.nameAr}</p>
              <p className="text-gold-soft text-[11px] mt-0.5">عرض التفاصيل</p>
            </div>
            <span className="w-8 h-8 rounded-full bg-gold-fill text-forest flex items-center justify-center shrink-0 shadow-gold">
              <ArrowLeft className="w-4 h-4" />
            </span>
          </motion.div>

          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
            {isNew && (
              <span className="bg-gold-fill text-forest text-[10px] font-bold px-2.5 py-1 rounded-full shadow-gold">
                جديد
              </span>
            )}
            {count > 1 && (
              <span className="glass-emerald text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {count}
              </span>
            )}
          </div>

          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onToggleFav?.(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onToggleFav?.(); } }}
            className="absolute top-3 left-3 z-20 w-9 h-9 rounded-full glass-lux flex items-center justify-center transition active:scale-90"
            aria-label={isFavorite ? 'إزالة من المفضّلة' : 'إضافة إلى المفضّلة'}
          >
            <Heart className={`w-4 h-4 transition ${isFavorite ? 'fill-gold text-gold' : 'text-bark/55'}`} />
          </span>
        </div>

        <div className="p-3 md:p-4">
          <h3 className="text-sm md:text-base font-semibold text-bark line-clamp-1">
            {product.nameAr}
          </h3>
          {product.nameEn && (
            <p className="text-[11px] text-bark/40 mt-0.5 font-display italic line-clamp-1">
              {product.nameEn}
            </p>
          )}
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-baseline gap-1">
              <span className="gold-text-static font-bold text-base md:text-lg">{formatDZD(product.price)}</span>
              <span className="text-[10px] text-bark/50">دج</span>
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onAddToCart?.(product); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onAddToCart?.(product); } }}
              className="w-9 h-9 rounded-full bg-emerald-deep-grad text-ivory flex items-center justify-center shadow-lux-sm active:scale-90 transition hover:shadow-gold"
              aria-label="أضيفي إلى السلّة"
            >
              <Plus className="w-4 h-4" />
            </span>
          </div>
        </div>
      </motion.div>
    </motion.article>
  );
}
