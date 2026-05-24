/**
 * OpenRouter client — Afnan
 *
 * Uses the OpenAI SDK with a custom baseURL pointing at OpenRouter.
 * Model: arcee-ai/trinity-large-thinking:free
 *
 * Exposes:
 *   - chatStream({ messages, onDelta, signal })  → streaming chat completion
 *   - chatOnce({ messages })                     → non-streaming chat completion
 *   - generateProductContent(keywords)           → returns { nameAr, nameEn, description }
 *
 * Every network call goes through `withRetry`, which retries 429/503 twice
 * with 1s/2s backoff and surfaces Arabic-friendly errors.
 */
import OpenAI from 'openai';

export const OPENROUTER_MODEL = 'arcee-ai/trinity-large-thinking:free';

const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

export const isOpenRouterConfigured = () => Boolean(apiKey);

const client = new OpenAI({
  apiKey: apiKey || 'missing-key',
  baseURL: 'https://openrouter.ai/api/v1',
  dangerouslyAllowBrowser: true,
  defaultHeaders: {
    'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://afnan.app',
    'X-Title': 'Afnan Store',
  },
});

/**
 * Retry wrapper for 429/503 with exponential backoff (1s, 2s).
 * Throws a friendly Arabic Error to the caller after exhausting retries.
 */
export async function withRetry(fn, { maxAttempts = 3 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = err?.status || err?.response?.status;
      const retriable = status === 429 || status === 503 || status === 502;
      if (!retriable || attempt === maxAttempts) break;
      const delayMs = attempt * 1000; // 1s, 2s
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  const status = lastError?.status || lastError?.response?.status;
  if (status === 429) throw new Error('الخدمة مشغولة دلوقتي، جرّبي بعد لحظة من فضلك.');
  if (status === 503 || status === 502) throw new Error('الخادم متعب شويّة، عاودي بعد دقيقة.');
  if (status === 401) throw new Error('مفتاح الـ AI غير صحيح. تواصلي مع الإدارة.');
  throw new Error(lastError?.message || 'حدث خطأ غير متوقع. حاولي مرّة أخرى.');
}

/**
 * Streaming chat completion. Calls `onDelta(text)` for each incoming chunk
 * and resolves with the full assembled text.
 */
export async function chatStream({ messages, onDelta, signal, temperature = 0.7, model = OPENROUTER_MODEL }) {
  if (!isOpenRouterConfigured()) {
    throw new Error('مفتاح OpenRouter غير مُعرّف. أضيفيه في .env باسم VITE_OPENROUTER_API_KEY.');
  }
  return withRetry(async () => {
    const stream = await client.chat.completions.create(
      { model, messages, stream: true, temperature },
      { signal },
    );
    let full = '';
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      if (delta) {
        full += delta;
        onDelta?.(delta, full);
      }
    }
    return full;
  });
}

/** Non-streaming variant used when we just need the final string. */
export async function chatOnce({ messages, temperature = 0.6, model = OPENROUTER_MODEL }) {
  if (!isOpenRouterConfigured()) {
    throw new Error('مفتاح OpenRouter غير مُعرّف.');
  }
  return withRetry(async () => {
    const res = await client.chat.completions.create({ model, messages, temperature });
    return res.choices?.[0]?.message?.content || '';
  });
}

/** Strip ```json fences from a model response before JSON.parse. */
function stripJsonFences(raw) {
  return String(raw || '')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

/**
 * Generate Arabic + English product names and a short description from a
 * comma-separated list of keywords. Used by EditProductModal and AIProductCreator.
 */
export async function generateProductContent(keywords) {
  const prompt = `أنتِ خبيرة في وصف الفساتين الجزائرية الفاخرة لمتجر "أفنان".
استخرجي من الكلمات المفتاحية التالية اسماً عربياً جذّاباً، اسماً إنجليزياً أنيقاً، ووصفاً قصيراً (سطرين) باللهجة الجزائرية الراقية.

الكلمات: ${keywords}

أعيدي JSON صرف بهذا الشكل بالضبط، بدون أي تعليق:
{"nameAr":"...","nameEn":"...","description":"..."}`;

  const raw = await chatOnce({
    messages: [
      { role: 'system', content: 'أنتِ مساعدة كتابة لمتجر "أفنان" للفساتين الجزائرية. تردّين دائماً بـ JSON صحيح فقط.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.8,
  });

  const cleaned = stripJsonFences(raw);
  try {
    const parsed = JSON.parse(cleaned);
    return {
      nameAr: parsed.nameAr || '',
      nameEn: parsed.nameEn || '',
      description: parsed.description || '',
    };
  } catch {
    return { nameAr: '', nameEn: '', description: cleaned };
  }
}
