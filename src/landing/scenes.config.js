/**
 * scenes.config.js — the single source of truth for the cinematic landing.
 *
 * ▸ HOW TO SWAP A VIDEO: drop a new file into `public/videos/` keeping the same
 *   name (e.g. `01-hero.mp4`) and a matching poster (`01-hero.webp`). No code
 *   change needed. Recommended: H.264 mp4, ≤1080p, 8–15s loop, < 4MB, plus a
 *   WebP poster (first frame) so there's never a black flash.
 * ▸ HOW TO EDIT TEXT: change `eyebrow`, `title` (array = one line per entry,
 *   revealed in sequence), `description`, and `cta` below.
 * ▸ HOW TO REORDER/ADD SCENES: reorder the array or add an object. `kind` picks
 *   the overlay layout: 'hero' | 'collections' | 'craft' | 'products' |
 *   'testimonials' | 'cta'.
 *
 * NOTE: the project is JavaScript (Vite + JSX), so this is `.config.js` rather
 * than `.ts`; the shape is identical to the requested `scenes.config.ts`.
 *
 * The clips currently shipped are placeholders reusing the store's real footage
 * (the caftan film + the boutique dolly-in). Replace them with bespoke scene
 * videos when ready.
 */

export const SHOP_PATH = '/shop';

export const SCENES = [
  {
    id: 'hero',
    kind: 'hero',
    eyebrow: 'مجموعة ٢٠٢٦',
    title: ['الأناقة الجزائرية', 'بأبهى حُلّة'],
    description:
      'قنادر، كاراكو، وفساتين سهرة مصنوعة بحبٍّ وحِرفية — لكل لحظة تستحقّ التألّق.',
    video: '/videos/01-hero.mp4',
    poster: '/videos/01-hero.webp',
    posterAlt: 'موديل ترتدي قندورة جزائرية فاخرة',
    objectPosition: 'center',
    cta: { label: 'تسوّقي الآن', href: SHOP_PATH },
  },
  {
    id: 'collections',
    kind: 'collections',
    eyebrow: 'تشكيلاتنا',
    title: ['لكل مناسبة', 'إطلالة تخصّكِ'],
    description:
      'من القندورة التقليدية إلى فستان السهرة العصري — اختاري ما يليق بلحظتكِ.',
    video: '/videos/02-collections.mp4',
    poster: '/videos/02-collections.webp',
    posterAlt: 'تشكيلة فساتين في صالة عرض فاخرة',
    objectPosition: 'center',
    cta: { label: 'استكشفي التشكيلات', href: SHOP_PATH },
    categories: [
      { label: 'سهرة', href: SHOP_PATH },
      { label: 'أعراس', href: SHOP_PATH },
      { label: 'تقليدي عصري', href: SHOP_PATH },
      { label: 'عيد', href: SHOP_PATH },
    ],
  },
  {
    id: 'craft',
    kind: 'craft',
    eyebrow: 'الحِرفة',
    title: ['تطريزٌ يُروى', 'خيطاً بخيط'],
    description:
      'الفتلة والمجبود والصرمة — لمساتٌ يدوية تحمل إرث الجزائر العريق في كل قطعة.',
    video: '/videos/03-craft.mp4',
    poster: '/videos/03-craft.webp',
    posterAlt: 'تفاصيل التطريز اليدوي على قماش فاخر',
    objectPosition: 'center',
    cta: { label: 'اكتشفي القصة', href: SHOP_PATH },
  },
  {
    id: 'products',
    kind: 'products',
    eyebrow: 'الأكثر رواجاً',
    title: ['قِطعٌ مُختارة', 'بانتظاركِ'],
    description: 'أحدث ما وصل — اضغطي لإضافته إلى سلّتكِ مباشرة.',
    video: '/videos/04-products.mp4',
    poster: '/videos/04-products.webp',
    posterAlt: 'عرض منتجات فوق خلفية صالة العرض',
    objectPosition: 'center',
    cta: { label: 'كل المنتجات', href: SHOP_PATH },
  },
  {
    id: 'testimonials',
    kind: 'testimonials',
    eyebrow: 'آراء زبوناتنا',
    title: ['ثقةٌ تليق', 'بكِ'],
    description: '',
    video: '/videos/02-collections.mp4',
    poster: '/videos/02-collections.webp',
    posterAlt: 'صالة عرض فساتين أنيقة',
    objectPosition: 'center',
    // Sample testimonials — replace with real ones.
    testimonials: [
      { name: 'أمينة — وهران', quote: 'القندورة جات أحسن من الصورة، خدمة راقية والتوصيل سريع.' },
      { name: 'ليديا — الجزائر', quote: 'التطريز رائع والقماش فاخر. نوصّي بيهم بقوة.' },
      { name: 'سهام — قسنطينة', quote: 'فستان السهرة لفت كل الأنظار في العرس. تشكرات أفنان!' },
    ],
  },
  {
    id: 'cta',
    kind: 'cta',
    eyebrow: 'أفنان',
    title: ['اكتشفي المجموعة', 'كاملةً'],
    description: 'توصيل لكل ولايات الوطن، والدفع عند الاستلام.',
    video: '/videos/05-cta.mp4',
    poster: '/videos/05-cta.webp',
    posterAlt: 'لقطة ختامية لقندورة فاخرة',
    objectPosition: 'center',
    cta: { label: 'ادخلي المتجر', href: SHOP_PATH },
    links: [
      { label: 'واتساب', href: 'https://wa.me/', icon: 'whatsapp' },
      { label: 'إنستغرام', href: 'https://instagram.com', icon: 'instagram' },
      { label: 'المتجر', href: SHOP_PATH, icon: 'shop' },
    ],
  },
];

export default SCENES;
