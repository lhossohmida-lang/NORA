/**
 * AIChatWidget — floating Sparkles button that opens a slide-up chat sheet.
 *
 * - Stable sessionId per browser (localStorage 'afnan_chat_session').
 * - Persists every message to Firestore 'chatMessages' so the admin AI
 *   assistant can see what customers ask.
 * - Optional voice input (Web Speech API) and TTS readback (toggleable,
 *   preference stored in localStorage 'afnan_tts').
 * - Uses chatStream for incremental token rendering.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mic, MicOff, Send, X, Volume2, VolumeX, Loader2, Bot } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { chatStream } from '../lib/openrouter.js';
import {
  useSpeechRecognition,
  speak,
  stopSpeaking,
  isSpeechSynthesisSupported,
} from '../lib/voiceChat.js';

const SESSION_KEY = 'afnan_chat_session';
const TTS_KEY = 'afnan_tts';

const STORE_NAME = 'أفنان';
const STORE_TAGLINE = 'الفساتين الجزائرية الفاخرة';

function getSessionId() {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const SYSTEM_PROMPT = `أنتِ مساعدة افتراضية لطيفة لمتجر "${STORE_NAME}" — ${STORE_TAGLINE}.
- تكلّمي باللهجة الجزائرية الراقية والمهذّبة (مثال: "مرحبا حبيبتي"، "تشكوري")، وتفادي العربية الفصحى الجافة.
- ساعدي الزبائن في اختيار الفستان المناسب (قفطان، كاراكو، بلوزة، فرقاني، سهرة، عيد، خطوبة).
- اقترحي مقاسات وألوان، وأجيبي عن أسئلة التوصيل (إلى كل الولايات) والدفع (عند الاستلام).
- إذا سألوكِ عن منتج لا تعرفينه بالتفصيل، اطلبي منهم تصفّح الكتالوغ أو ترك معلوماتهم باش نتواصل.
- ردودكِ مختصرة (2-4 جمل)، دافئة، ومع emojis بسيطة عند المناسبة.`;

const STARTER_TIPS = [
  'بصح كيف نختار قفطان مناسب لحفل خطوبة؟',
  'عندكم فساتين عيد للبنات الصغار؟',
  'كيفاش يتم التوصيل والدفع؟',
];

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [ttsOn, setTtsOn] = useState(() => localStorage.getItem(TTS_KEY) === '1');
  const sessionId = useMemo(() => getSessionId(), []);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const speech = useSpeechRecognition({ lang: 'ar-DZ' });

  useEffect(() => {
    if (speech.transcript) setInput(speech.transcript);
  }, [speech.transcript]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => {
    localStorage.setItem(TTS_KEY, ttsOn ? '1' : '0');
    if (!ttsOn) stopSpeaking();
  }, [ttsOn]);

  const persist = async (role, text) => {
    try {
      await addDoc(collection(db, 'chatMessages'), {
        sessionId,
        role,
        text,
        createdAt: serverTimestamp(),
      });
    } catch {
      /* offline / firestore rules — don't break the chat */
    }
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput('');
    speech.reset();
    stopSpeaking();

    const userMsg = { role: 'user', content };
    setMessages((m) => [...m, userMsg, { role: 'assistant', content: '' }]);
    persist('user', content);

    const history = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      userMsg,
    ];

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreaming(true);

    try {
      let assembled = '';
      await chatStream({
        messages: history,
        signal: ctrl.signal,
        onDelta: (_, full) => {
          assembled = full;
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'assistant', content: full };
            return copy;
          });
        },
      });
      persist('assistant', assembled);
      if (ttsOn && assembled && isSpeechSynthesisSupported()) speak(assembled);
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: `عذراً، ${err.message}` };
        return copy;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const toggleMic = () => {
    if (speech.listening) speech.stop();
    else speech.start();
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.6 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-5 z-30 w-14 h-14 rounded-full bg-gold-fill text-forest
                   shadow-gold has-shine flex items-center justify-center"
        aria-label="افتحي المساعدة الذكية"
      >
        <Sparkles className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald animate-pulse" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-forest/45 backdrop-blur-md"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 h-[80vh] flex flex-col
                         rounded-t-[2.25rem] bg-ivory shadow-lux"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 36 }}
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-deep-grad flex items-center justify-center text-gold-soft">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-bark">مساعدة {STORE_NAME}</p>
                    <p className="text-xs text-bark/50">{STORE_TAGLINE}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isSpeechSynthesisSupported() && (
                    <button
                      onClick={() => setTtsOn((v) => !v)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                        ttsOn ? 'bg-emerald-deep-grad text-ivory' : 'bg-white/70 text-bark/60'
                      }`}
                      aria-label={ttsOn ? 'إيقاف الصوت' : 'تشغيل الصوت'}
                    >
                      {ttsOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center"
                    aria-label="إغلاق"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-deep-grad flex items-center justify-center text-gold-soft mb-4">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-bark">مرحبا حبيبتي 💕</h3>
                    <p className="text-sm text-bark/60 mt-1">
                      أنا هنا باش نعاونك تختاري الفستان المثالي.
                    </p>
                    <div className="mt-6 space-y-2 max-w-sm mx-auto">
                      {STARTER_TIPS.map((t) => (
                        <button
                          key={t}
                          onClick={() => send(t)}
                          className="block w-full text-right px-4 py-3 rounded-2xl glass-lux text-sm text-bark hover:bg-white transition"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <ChatBubble key={i} role={m.role} content={m.content} />
                ))}

                {streaming && messages[messages.length - 1]?.content === '' && (
                  <div className="flex items-center gap-2 text-bark/50 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    تكتب لكِ ردّاً...
                  </div>
                )}
              </div>

              <div className="border-t border-black/[0.05] p-3 safe-bottom">
                <div className="flex items-end gap-2 bg-white rounded-3xl p-2 shadow-lux-sm">
                  {speech.supported && (
                    <button
                      onClick={toggleMic}
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition ${
                        speech.listening ? 'bg-gold-fill text-forest animate-pulse' : 'bg-sand text-bark/60'
                      }`}
                      aria-label={speech.listening ? 'إيقاف التسجيل' : 'تسجيل صوتي'}
                    >
                      {speech.listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                    }}
                    placeholder={speech.listening ? 'أنا أسمعك...' : 'اكتبي سؤالك هنا...'}
                    rows={1}
                    className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-bark placeholder:text-bark/40 focus:outline-none max-h-32"
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || streaming}
                    className="shrink-0 w-10 h-10 rounded-full bg-emerald-deep-grad text-ivory flex items-center justify-center disabled:opacity-40 active:scale-95"
                    aria-label="إرسال"
                  >
                    {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ChatBubble({ role, content }) {
  const isUser = role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-emerald-deep-grad text-ivory rounded-bl-md'
            : 'bg-white text-bark rounded-br-md shadow-lux-sm'
        }`}
      >
        {content || '...'}
      </div>
    </motion.div>
  );
}
