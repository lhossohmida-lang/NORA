/**
 * SplashScreen — cinematic gold-on-emerald intro.
 *
 * If /splash/intro-*.mp4 exists it plays behind a deep-emerald wash; otherwise
 * an animated emerald-silk gradient carries the moment. The gold "أفنان"
 * wordmark draws in with a light sweep, a hairline gold rule expands, and the
 * whole curtain lifts away after 3.6s (tap to skip).
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EASE } from '../lib/motion.js';
import { OrnateDivider, Zellige } from './Ornament.jsx';

const STORE_NAME_AR = 'أفنان';
const STORE_NAME_EN = 'Afnan';
const TAGLINE = 'الفساتين الجزائرية الفاخرة';

export default function SplashScreen({ onFinish }) {
  const [visible, setVisible] = useState(true);
  const videoRef = useRef(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const videoSrc = isMobile ? '/splash/intro-mobile.mp4' : '/splash/intro-desktop.mp4';

  useEffect(() => {
    const t = setTimeout(() => dismiss(), 3600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onFinish?.(), 750);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] overflow-hidden bg-silk-emerald cursor-pointer"
          initial={{ opacity: 1 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
          onClick={dismiss}
        >
          {/* Optional intro video (silently ignored when missing) */}
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted
            playsInline
            onEnded={dismiss}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          {/* Emerald wash + soft gold vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-forest/40 via-forest/60 to-forest/90" />
          <motion.div
            className="absolute -inset-1/4 opacity-50"
            style={{ background: 'radial-gradient(closest-side, rgba(231,206,148,0.22), transparent)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <Zellige opacity={0.06} size={64} />

          <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25, duration: 1, ease: EASE }}
              className="relative has-shine rounded-3xl px-6"
            >
              <h1 className="font-display text-[5.5rem] md:text-[8rem] leading-none gold-text drop-shadow-[0_2px_20px_rgba(0,0,0,0.35)]">
                {STORE_NAME_AR}
              </h1>
              <p className="font-display italic text-gold-soft/90 text-2xl md:text-3xl mt-1 tracking-[0.4em]">
                {STORE_NAME_EN}
              </p>
            </motion.div>

            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.9, ease: EASE }}
              className="mt-7 mb-5 origin-center text-gold"
            >
              <OrnateDivider className="mx-auto" width="w-48" />
            </motion.div>

            <motion.p
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.8, ease: EASE }}
              className="text-ivory/85 text-base md:text-lg tracking-wide"
            >
              {TAGLINE}
            </motion.p>

            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              transition={{ delay: 2.4, duration: 0.7 }}
              className="absolute bottom-10 text-gold-soft/70 text-xs tracking-[0.2em]"
            >
              اضغطي للمتابعة
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
