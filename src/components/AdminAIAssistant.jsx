/**
 * AdminAIAssistant — floating Bot button in the admin bottom-right.
 *
 * Builds a context-aware system prompt every time the user sends a message:
 *   • Live counts (products / orders / 30d revenue / chat messages)
 *   • Last 20 product names + prices
 *   • Last 20 orders (customer + total + item count)
 *   • Last 30 customer chat messages, each tagged with [last-6-of-sessionId]
 *
 * Streams responses, supports Arabic voice input + TTS readback.
 * Quick-action chips suggest the most common admin questions.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Mic, MicOff, X, Volume2, VolumeX, Loader2, Sparkles, TrendingUp,
} from 'lucide-react';
import { chatStream } from '../lib/openrouter.js';
import {
  useSpeechRecognition,
  speak,
  stopSpeaking,
  isSpeechSynthesisSupported,
} from '../lib/voiceChat.js';
import { categoryLabel } from './ClientStorefront.jsx';

const TTS_KEY = 'afnan_admin_tts';
const formatDZD = (n) =>
  new Intl.NumberFormat('ar-DZ', { maximumFractionDigits: 0 }).format(n || 0);

const QUICK_ACTIONS = [
  'كم منتج عندي وكم طلب؟',
  'ايش أكثر سؤال يطرحوه الزبائن؟',
  'اقترحي لي اسم لفستان سهرة جديد',
  'وش الفئة الأكثر مبيعاً؟',
];

function buildSystemPrompt({ products, orders, revenue, customerMessages }) {
  const recentProducts = products.slice(0, 20).map((p) => {
    const cat = categoryLabel(p.category);
    return `- ${p.nameAr || '(بلا اسم)'} | ${cat} | ${formatDZD(p.price)} دج`;
  }).join('\n');

  const recentOrders = orders.slice(0, 20).map((o) => {
    const date = o.createdAt?.toDate?.()?.toLocaleDateString('ar-DZ') || '-';
    return `- ${o.customerName || 'زبونة'} | ${o.items?.length || 0} قطعة | ${formatDZD(o.total)} دج | ${date}`;
  }).join('\n');

  const recentChats = customerMessages.slice(-30).map((m) => {
    const tag = String(m.sessionId || '').slice(-6) || 'unknown';
    return `[${tag}] ${m.role === 'user' ? 'زبونة' : 'AI'}: ${m.text}`;
  }).join('\n');

  return `أنتِ مساعدة إدارية ذكية لمتجر "أفنان" للفساتين الجزائرية الفاخرة.
تتكلّمين باللهجة الجزائرية الراقية، باختصار وصراحة. ردودكِ عملية ومرتّبة.

=== بيانات حيّة عن المتجر ===
• عدد المنتجات: ${products.length}
• عدد الطلبات: ${orders.length}
• إيرادات آخر 30 يوم: ${formatDZD(revenue)} دج
• عدد رسائل شات الزبائن: ${customerMessages.length}

=== آخر المنتجات (حتى 20) ===
${recentProducts || '(لا توجد منتجات بعد)'}

=== آخر الطلبات (حتى 20) ===
${recentOrders || '(لا توجد طلبات بعد)'}

=== آخر 30 رسالة من شات الزبائن ===
${recentChats || '(لا توجد رسائل بعد)'}
[ملاحظة: الـ tag [xxxxxx] هو آخر 6 أحرف من sessionId — استخدميه لتجميع المحادثات إن لزم.]

=== تعليمات الرد ===
- إذا سُئلتِ عن إحصاء، استخدمي الأرقام أعلاه.
- إذا طُلب منكِ اقتراح اسم/وصف، أعطي 2-3 اقتراحات قصيرة.
- إذا سُئلتِ عن أسئلة الزبائن، لخّصي الأنماط (مقاسات، توصيل، أسعار...).
- ردودكِ مختصرة (3-5 جمل)، ودودة، بصيغة المؤنّث.`;
}

export default function AdminAIAssistant({ products = [], orders = [], revenue = 0, customerMessages = [] }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [ttsOn, setTtsOn] = useState(() => localStorage.getItem(TTS_KEY) === '1');
  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const speech = useSpeechRecognition({ lang: 'ar-DZ' });

  const systemPrompt = useMemo(
    () => buildSystemPrompt({ products, orders, revenue, customerMessages }),
    [products, orders, revenue, customerMessages],
  );

  useEffect(() => { if (speech.transcript) setInput(speech.transcript); }, [speech.transcript]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => {
    localStorage.setItem(TTS_KEY, ttsOn ? '1' : '0');
    if (!ttsOn) stopSpeaking();
  }, [ttsOn]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput('');
    speech.reset();
    stopSpeaking();

    setMessages((m) => [...m, { role: 'user', content }, { role: 'assistant', content: '' }]);

    const history = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content },
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
      if (ttsOn && assembled && isSpeechSynthesisSupported()) speak(assembled);
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: `حدث خطأ: ${err.message}` };
        return copy;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const toggleMic = () => speech.listening ? speech.stop() : speech.start();

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.4 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-ink text-white shadow-bloom flex items-center justify-center"
        aria-label="افتحي المساعدة الإدارية"
      >
        <Bot className="w-6 h-6" />
        <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-sage animate-pulse" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 right-0 left-0 md:left-auto md:bottom-6 md:right-6 z-50
                         w-full md:w-[420px] h-[80vh] md:h-[640px] flex flex-col
                         rounded-t-[2.5rem] md:rounded-3xl bg-pearl shadow-glass"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 36 }}
            >
              <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-cream">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-ink">مساعدة الإدارة</p>
                    <p className="text-[11px] text-ink/60 flex items-center gap-1 flex-wrap">
                      <span>{products.length} منتج</span>
                      <span className="text-ink/30">·</span>
                      <span>{orders.length} طلب</span>
                      <span className="text-ink/30">·</span>
                      <span>{customerMessages.length} رسالة شات</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isSpeechSynthesisSupported() && (
                    <button
                      onClick={() => setTtsOn((v) => !v)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                        ttsOn ? 'bg-sage-blush text-white' : 'bg-white/70 text-ink/60'
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
                  <div className="text-center py-6">
                    <div className="w-14 h-14 mx-auto rounded-full bg-ink text-white flex items-center justify-center mb-3">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <p className="font-bold">صباح الخير 🌸</p>
                    <p className="text-sm text-ink/60 mt-1">
                      اسأليني عن أرقامك، اقتراحات، أو رسائل الزبائن.
                    </p>
                    <div className="mt-5 space-y-2 max-w-sm mx-auto">
                      {QUICK_ACTIONS.map((q) => (
                        <button
                          key={q}
                          onClick={() => send(q)}
                          className="block w-full text-right px-4 py-2.5 rounded-2xl glass text-sm text-ink hover:bg-white transition"
                        >
                          <Sparkles className="w-3 h-3 inline ml-1 text-sage" />
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <ChatBubble key={i} role={m.role} content={m.content} />
                ))}

                {streaming && messages[messages.length - 1]?.content === '' && (
                  <div className="flex items-center gap-2 text-ink/50 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    أفكّر...
                  </div>
                )}
              </div>

              <div className="border-t border-cream p-3 safe-bottom">
                <div className="flex items-end gap-2 bg-white rounded-3xl p-2 shadow-glass">
                  {speech.supported && (
                    <button
                      onClick={toggleMic}
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition ${
                        speech.listening ? 'bg-blush text-white animate-pulse' : 'bg-cream text-ink/60'
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
                    placeholder={speech.listening ? 'أنا أسمعك...' : 'اسأليني أي شيء عن المتجر...'}
                    rows={1}
                    className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none max-h-32"
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || streaming}
                    className="shrink-0 w-10 h-10 rounded-full bg-sage-blush text-white flex items-center justify-center disabled:opacity-40 active:scale-95"
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
        className={`max-w-[85%] px-4 py-2.5 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-ink text-white rounded-bl-md'
            : 'bg-white text-ink rounded-br-md shadow-glass'
        }`}
      >
        {content || '...'}
      </div>
    </motion.div>
  );
}
