/**
 * Voice helpers — speech recognition + text-to-speech.
 *
 * - useSpeechRecognition({ lang })  → { listening, transcript, start, stop, reset, supported }
 * - speak(text, { lang, rate, pitch, voice })
 * - isSpeechRecognitionSupported(), isSpeechSynthesisSupported()
 * - pickArabicFemaleVoice()  → prefers a feminine ar-* voice when available
 */
import { useEffect, useRef, useState, useCallback } from 'react';

export const isSpeechRecognitionSupported = () =>
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

export const isSpeechSynthesisSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Pick the best Arabic feminine voice available in the browser.
 * Falls back to any ar-* voice, then to the platform default.
 */
export function pickArabicFemaleVoice() {
  if (!isSpeechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  const femaleHints = ['female', 'femme', 'woman', 'amina', 'salma', 'hoda', 'mouna', 'leila', 'zeina'];
  const arabic = voices.filter((v) => /^ar/i.test(v.lang));

  const namedFemale = arabic.find((v) => femaleHints.some((h) => v.name.toLowerCase().includes(h)));
  if (namedFemale) return namedFemale;

  return arabic[0] || voices[0] || null;
}

/**
 * Speak a string. Cancels any current utterance first so calls don't queue up.
 */
export function speak(text, { lang = 'ar-DZ', rate = 1, pitch = 1.05, voice } = {}) {
  if (!isSpeechSynthesisSupported() || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.voice = voice || pickArabicFemaleVoice();
    window.speechSynthesis.speak(utter);
  } catch {
    /* ignore — TTS is best-effort */
  }
}

export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
}

/**
 * React hook around webkitSpeechRecognition. Returns a stable API and tears
 * down the recognizer on unmount.
 */
export function useSpeechRecognition({ lang = 'ar-DZ', continuous = false, interim = true } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const supported = !!isSpeechRecognitionSupported();

  useEffect(() => {
    if (!supported) return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new Ctor();
    r.lang = lang;
    r.continuous = continuous;
    r.interimResults = interim;

    r.onresult = (event) => {
      let combined = '';
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0].transcript;
      }
      setTranscript(combined);
    };
    r.onerror = (e) => {
      setError(e.error || 'speech-error');
      setListening(false);
    };
    r.onend = () => setListening(false);

    recognitionRef.current = r;
    return () => {
      try { r.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    };
  }, [lang, continuous, interim, supported]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      setTranscript('');
      setError(null);
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // start() throws if already started — safe to ignore
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  const reset = useCallback(() => setTranscript(''), []);

  return { listening, transcript, start, stop, reset, error, supported };
}
