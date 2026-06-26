/**
 * CinematicLanding — the public landing route (`/`).
 *
 * Composes the <VideoScenes> deck and wires three integrations into it:
 *   1. live products from Firestore (with a small demo fallback) for the
 *      "products" scene;
 *   2. add-to-cart that writes the SAME localStorage key the shop reads
 *      (`afnan_cart`), so items added here show up in /shop's cart;
 *   3. lightweight SEO — document title + Store JSON-LD.
 *
 * The full storefront now lives at /shop; every CTA here points there.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase.js';
import VideoScenes from '../landing/VideoScenes.jsx';
import SCENES from '../landing/scenes.config.js';

const CART_KEY = 'afnan_cart';

const DEMO = [
  { id: 'l1', nameAr: 'قندورة قسنطينية', price: 26000, images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=500&q=80'] },
  { id: 'l2', nameAr: 'كاراكو مطرّز', price: 32000, images: ['https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=500&q=80'] },
  { id: 'l3', nameAr: 'فستان سهرة', price: 45000, images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=500&q=80'] },
  { id: 'l4', nameAr: 'بلوزة وهرانية', price: 19000, images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=500&q=80'] },
];

function useLandingProducts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(6));
    const unsub = onSnapshot(
      q,
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setItems([]),
    );
    return unsub;
  }, []);
  return items.length ? items : DEMO;
}

export default function CinematicLanding() {
  const products = useLandingProducts();
  const [toast, setToast] = useState(null);

  // SEO: title + Store structured data (SPA-injected).
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'أفنان | الفساتين الجزائرية الفاخرة';
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: 'أفنان',
      description: 'متجر الفساتين الجزائرية الفاخرة — قنادر، كاراكو، وفساتين سهرة.',
      image: `${window.location.origin}/videos/01-hero.webp`,
      areaServed: 'DZ',
      currenciesAccepted: 'DZD',
      paymentAccepted: 'Cash on delivery',
    });
    document.head.appendChild(ld);
    return () => { document.title = prevTitle; ld.remove(); };
  }, []);

  const addToCart = (p) => {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY)) || [];
      const found = raw.find((i) => i.id === p.id);
      const next = found
        ? raw.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
        : [...raw, { id: p.id, nameAr: p.nameAr, price: p.price, image: p.images?.[0], qty: 1 }];
      localStorage.setItem(CART_KEY, JSON.stringify(next));
      setToast(`أُضيفت «${p.nameAr}» إلى السلّة`);
      window.clearTimeout(addToCart._t);
      addToCart._t = window.setTimeout(() => setToast(null), 2600);
    } catch { /* storage unavailable — fail quietly */ }
  };

  return (
    <>
      <VideoScenes scenes={SCENES} products={products} onAddToCart={addToCart} />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 24, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-gold-fill text-forest font-semibold shadow-gold"
            dir="rtl"
            role="status"
          >
            <Check className="w-4 h-4" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
