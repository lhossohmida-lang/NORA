/**
 * SplashScreen — full-screen intro video.
 *
 * Picks intro-mobile.mp4 vs intro-desktop.mp4 based on viewport width,
 * auto-dismisses after 4s, and lets the visitor tap to skip.
 * The brand name + tagline overlay sits on top with a soft fade-in.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORE_NAME_AR = 'أفنان';
const STORE_NAME_EN = 'Afnan';
const TAGLINE = 'الفساتين الجزائرية الفاخرة';

export default function SplashScreen({ onFinish }) {
  const [visible, setVisible] = useState(true);
  const videoRef = useRef(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const videoSrc = isMobile ? '/splash/intro-mobile.mp4' : '/splash/intro-desktop.mp4';

  useEffect(() => {
    const t = setTimeout(() => dismiss(), 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onFinish?.(), 500);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] bg-ink overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          onClick={dismiss}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted
            playsInline
            onEnded={dismiss}
            className="absolute inset-0 w-full h-full object-cover opacity-80"
            onError={() => { /* video missing — let the gradient layer show */ }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/40 to-ink/70" />

          <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-display text-7xl md:text-8xl text-white tracking-wide drop-shadow-lg">
                {STORE_NAME_AR}
              </h1>
              <p className="font-display italic text-white/80 text-2xl mt-2 tracking-[0.3em]">
                {STORE_NAME_EN}
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.7 }}
              className="mt-6"
            >
              <div className="w-20 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent mx-auto mb-4" />
              <p className="text-white/90 text-lg md:text-xl tracking-wide">{TAGLINE}</p>
            </motion.div>

            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 2.5, duration: 0.6 }}
              className="absolute bottom-10 text-white/60 text-xs tracking-wider"
            >
              اضغطي للمتابعة
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
