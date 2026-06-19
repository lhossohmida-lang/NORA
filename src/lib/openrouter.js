/**
 * OpenRouter client — Afnan
 *
 * Uses the OpenAI SDK with a custom baseURL pointing at OpenRouter.
 * Model: cohere/north-mini-code:free
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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';

export const OPENROUTER_MODEL = 'cohere/north-mini-code:free';

let resolvedApiKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';
let hasAttemptedFetch = false;

export async function getOrFetchApiKey() {
  if (resolvedApiKey && resolvedApiKey !== 'missing-key') return resolvedApiKey;
  if (hasAttemptedFetch) return resolvedApiKey;

  try {
    const docRef = doc(db, 'settings', 'openrouter');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      resolvedApiKey = docSnap.data().apiKey || '';
    }
  } catch (err) {
    console.error('Error fetching API key from Firestore:', err);
  }
  hasAttemptedFetch = true;
  return resolvedApiKey;
}

export async function saveApiKeyToFirestore(key) {
  const docRef = doc(db, 'settings', 'openrouter');
  await setDoc(docRef, { apiKey: key }, { merge: true });
  resolvedApiKey = key;
}

export const isOpenRouterConfigured = () => Boolean(resolvedApiKey);

const client = new OpenAI({
  apiKey: resolvedApiKey || 'missing-key',
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
/**
 * Streaming chat completion. Calls `onDelta(text)` for each incoming chunk
 * and resolves with the full assembled text.
 * Sequentially attempts a list of stable free models on OpenRouter with a 10s timeout.
 */
export async function chatStream({ messages, onDelta, signal, temperature = 0.7, model = OPENROUTER_MODEL }) {
  const key = await getOrFetchApiKey();
  if (!key) {
    throw new Error('مفتاح OpenRouter غير مُعرّف. يرجى إضافته في لوحة التحكم الإدارية أو في ملف .env باسم VITE_OPENROUTER_API_KEY.');
  }
  client.apiKey = key;

  // Build the list of models to try sequentially
  const modelsToTry = [
    'google/gemma-2-9b-it:free',
    'meta-llama/llama-3-8b-instruct:free',
    'qwen/qwen-2-7b-instruct:free',
    'cohere/north-mini-code:free'
  ];
  
  // Put requested model first if not already there
  if (model && !modelsToTry.includes(model)) {
    modelsToTry.unshift(model);
  } else if (model && modelsToTry.includes(model)) {
    // Reorder so that 'model' is first
    const idx = modelsToTry.indexOf(model);
    modelsToTry.splice(idx, 1);
    modelsToTry.unshift(model);
  }

  let lastError = null;
  for (const currentModel of modelsToTry) {
    try {
      console.log(`Attempting chatStream with model: ${currentModel}`);
      const stream = await client.chat.completions.create(
        { model: currentModel, messages, stream: true, temperature },
        { signal, timeout: 10000 }
      );
      
      let full = '';
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          full += delta;
          onDelta?.(delta, full);
        }
      }
      return full; // Succeeded!
    } catch (err) {
      console.warn(`Model ${currentModel} failed in chatStream:`, err);
      lastError = err;
      if (signal?.aborted) {
        throw err; // User aborted the request, do not try other models
      }
    }
  }

  // If all models failed, throw a friendly Arabic error
  const status = lastError?.status || lastError?.response?.status;
  if (status === 429) throw new Error('الخدمة مشغولة حالياً، يرجى المحاولة بعد لحظة.');
  if (status === 503 || status === 502) throw new Error('الخادم متعب حالياً، يرجى المحاولة بعد دقيقة.');
  if (status === 401) throw new Error('مفتاح الـ AI غير صحيح أو منتهي الصلاحية. يرجى التحقق من لوحة الإدارة.');
  throw new Error(lastError?.message || 'حدث خطأ غير متوقع في الاتصال بالذكاء الاصطناعي.');
}

/** Non-streaming variant used when we just need the final string. */
export async function chatOnce({ messages, temperature = 0.6, model = OPENROUTER_MODEL }) {
  const key = await getOrFetchApiKey();
  if (!key) {
    throw new Error('مفتاح OpenRouter غير مُعرّف. يرجى إضافته في لوحة التحكم الإدارية.');
  }
  client.apiKey = key;

  const modelsToTry = [
    'google/gemma-2-9b-it:free',
    'meta-llama/llama-3-8b-instruct:free',
    'qwen/qwen-2-7b-instruct:free',
    'cohere/north-mini-code:free'
  ];
  
  if (model && !modelsToTry.includes(model)) {
    modelsToTry.unshift(model);
  } else if (model && modelsToTry.includes(model)) {
    const idx = modelsToTry.indexOf(model);
    modelsToTry.splice(idx, 1);
    modelsToTry.unshift(model);
  }

  let lastError = null;
  for (const currentModel of modelsToTry) {
    try {
      console.log(`Attempting chatOnce with model: ${currentModel}`);
      const res = await client.chat.completions.create(
        { model: currentModel, messages, temperature },
        { timeout: 10000 }
      );
      return res.choices?.[0]?.message?.content || '';
    } catch (err) {
      console.warn(`Model ${currentModel} failed in chatOnce:`, err);
      lastError = err;
    }
  }

  const status = lastError?.status || lastError?.response?.status;
  if (status === 429) throw new Error('الخدمة مشغولة حالياً، يرجى المحاولة بعد لحظة.');
  if (status === 503 || status === 502) throw new Error('الخادم متعب حالياً، يرجى المحاولة بعد دقيقة.');
  if (status === 401) throw new Error('مفتاح الـ AI غير صحيح أو منتهي الصلاحية. يرجى التحقق من لوحة الإدارة.');
  throw new Error(lastError?.message || 'حدث خطأ غير متوقع في الاتصال بالذكاء الاصطناعي.');
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
