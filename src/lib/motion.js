/**
 * motion.js — the single motion language for the Afnan storefront.
 *
 * Every transition (hero reveal, sheet slide, chip/nav indicator, grid
 * stagger, shared-element hero) pulls its easing, spring and variants from
 * here so the whole customer experience feels like one cohesive, world-class
 * system rather than a pile of one-off animations.
 *
 * Reduced motion is honored globally at the app root via
 * <MotionConfig reducedMotion="user">, so individual components don't each
 * need to branch on it.
 */

/* --- Easings ------------------------------------------------------- */
export const EASE = [0.22, 1, 0.36, 1];        // expo-out — calm, premium settle
export const EASE_IN_OUT = [0.65, 0, 0.35, 1]; // symmetric — exits / collapses
export const EASE_OUT_BACK = [0.34, 1.4, 0.5, 1];

/* --- Springs ------------------------------------------------------- */
export const SPRING = {
  soft:   { type: 'spring', stiffness: 220, damping: 30, mass: 0.9 },
  snappy: { type: 'spring', stiffness: 420, damping: 34 },
  sheet:  { type: 'spring', stiffness: 300, damping: 34, mass: 0.9 },
  pill:   { type: 'spring', stiffness: 520, damping: 42 }, // sliding indicators
};

/* --- Primitive variants -------------------------------------------- */
export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.6, ease: EASE } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } },
};

/* Headline reveal — rises out of its own line with a soft blur lift. */
export const revealLine = {
  hidden: { opacity: 0, y: '0.5em', filter: 'blur(10px)' },
  show:   { opacity: 1, y: '0em', filter: 'blur(0px)', transition: { duration: 0.95, ease: EASE } },
};

/* --- Stagger orchestration ----------------------------------------- */
export const staggerParent = (staggerChildren = 0.08, delayChildren = 0.05) => ({
  hidden: {},
  show:   { transition: { staggerChildren, delayChildren } },
});

export const staggerChild = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/* --- Overlay + sheet ----------------------------------------------- */
export const backdrop = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.3 } },
  exit:   { opacity: 0, transition: { duration: 0.25 } },
};

export const sheetPanel = {
  hidden: { y: '100%' },
  show:   { y: 0, transition: SPRING.sheet },
  exit:   { y: '100%', transition: { duration: 0.32, ease: EASE_IN_OUT } },
};

/* Threshold helper for drag-to-dismiss bottom sheets. */
export const shouldDismiss = (info, distance = 110, velocity = 480) =>
  info.offset.y > distance || info.velocity.y > velocity;
