# أفنان | Afnan

> متجر إلكتروني للفساتين الجزائرية الفاخرة — تقليدي وعصري.
> Vite + React 18 + Tailwind + Firebase + OpenRouter AI.

---

## ✨ المميّزات

- **واجهة الزبون** (`/`): splash تعريفي، hero راقي، شريط فئات، شبكة منتجات،
  سلّة، مفضّلة، شات ذكي بالعربية الجزائرية.
- **لوحة الإدارة** (`/admin`): KPIs، طلبات، كتالوغ مع تعديل/حذف،
  استوديو AI، ومساعدة إدارية ذكية تعرف كل أرقام المتجر.
- **إنشاء منتج بـ AI** (`/admin/new`): رفع صور إلى Cloudinary + توليد
  اسم/وصف من كلمات مفتاحية بنموذج OpenRouter.
- **Voice + TTS** عربي (ar-DZ) في كل الشاتات.
- **PWA** قابلة للتثبيت + RTL أصيلة.

---

## 🛠 التشغيل المحلّي

```bash
# 1. ثبّتي الاعتمادات
npm install

# 2. انسخي .env.example إلى .env واملئي القيم
cp .env.example .env

# 3. شغّلي التطبيق
npm run dev
# → http://localhost:5173
```

### المتغيّرات المطلوبة في `.env`

| المفتاح | الوصف |
|---|---|
| `VITE_CLOUDINARY_CLOUD_NAME` | اسم حساب Cloudinary |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | preset غير موقّع (unsigned) |
| `VITE_OPENROUTER_API_KEY` | مفتاح OpenRouter — [احصلي عليه هنا](https://openrouter.ai/keys) |
| `VITE_ADMIN_EMAILS` | (اختياري) قائمة إيميلات المسؤولين، مفصولة بفواصل |

---

## 🔥 إعداد Firebase

المشروع مُهيّأ على `nora-3b35e`. تأكّدي من تفعيل:

1. **Authentication** → Email/Password
2. **Firestore Database** بهذه الـ collections:
   - `products` — `{ nameAr, nameEn, price, category, description, images[], createdAt, updatedAt }`
   - `orders` — `{ customerName, phone, items[], total, createdAt }`
   - `chatMessages` — `{ sessionId, role, text, createdAt }`

**قواعد أمان مقترحة** (Firestore Rules):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // المنتجات: قراءة للجميع، كتابة للمسجّلين فقط
    match /products/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // الطلبات: إنشاء للجميع، قراءة/تعديل للمسجّلين
    match /orders/{id} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
    // رسائل الشات: كتابة للجميع، قراءة للمسجّلين
    match /chatMessages/{id} {
      allow create: if true;
      allow read: if request.auth != null;
    }
    // الإعدادات: قراءة للجميع (لتشغيل الـ AI لدى الزوار)، كتابة للمسؤولين فقط
    match /settings/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 🔑 حل مشكلة الـ AI في رابط Vercel (بدون الحاجة لإعادة البناء)

إذا قمت بنشر التطبيق على **Vercel** ولم تفعّل متغيّر البيئة `VITE_OPENROUTER_API_KEY` أثناء البناء، أو تواجه صعوبة في تعديل إعدادات Vercel، فقد أضفنا حلاً ذكياً وسلساً:
1. ادخلي إلى **لوحة الإدارة** (`/admin`) ثم تبويب **AI Studio**.
2. ستجدين بطاقة إعدادات مخصصة بعنوان **"إعدادات مفتاح الذكاء الاصطناعي (API Key)"**.
3. أدخلي مفتاح OpenRouter الخاص بكِ واضغطي **حفظ**.
4. سيتم حفظ المفتاح بأمان في Firestore وتفعيله فوراً لزوار المتجر وللوحة التحكم على حدٍ سواء، دون الحاجة لأي تعديلات برمجية أو إعادة نشر!

---

## ☁️ النشر على Vercel

1. ارفعي المشروع على GitHub.
2. في Vercel → **New Project** → اختاري المستودع.
3. **Settings → Environment Variables** → أضيفي الثلاثة:
   `VITE_CLOUDINARY_CLOUD_NAME`، `VITE_CLOUDINARY_UPLOAD_PRESET`،
   `VITE_OPENROUTER_API_KEY`.
4. **Deployments → آخر deployment → Redeploy** (مهم — المتغيّرات تحتاج إعادة بناء).
5. في OpenRouter Dashboard → قيّدي المفتاح بـ **HTTP Referrer** على نطاق Vercel.
   *(مفاتيح `VITE_*` ظاهرة في bundle المتصفّح — التقييد ضروري.)*

---

## 📦 هيكل المشروع

```
src/
├── App.jsx                       ← Router (4 routes)
├── main.jsx
├── firebase.js                   ← Auth + Firestore + admin allowlist
├── index.css                     ← Tailwind layers + glass/btn helpers
├── components/
│   ├── ClientStorefront.jsx      ← الواجهة الرئيسية (تصدّر CATEGORIES)
│   ├── ProductGridCard.jsx
│   ├── ProductDetail.jsx         ← bottom sheet
│   ├── SplashScreen.jsx          ← فيديو 4 ثوانٍ
│   ├── AIChatWidget.jsx          ← شات الزبائن
│   ├── AdminLogin.jsx
│   ├── ProtectedRoute.jsx
│   ├── AdminDashboard.jsx        ← Sidebar + Topbar + Panels + EditProductModal
│   ├── AIProductCreator.jsx      ← /admin/new
│   └── AdminAIAssistant.jsx      ← bot عائم
└── lib/
    ├── cloudinary.js             ← unsigned upload
    ├── openrouter.js             ← chatStream + generateProductContent + withRetry
    └── voiceChat.js              ← useSpeechRecognition + speak

public/
├── favicon.svg
├── splash/   (intro-mobile.mp4 + intro-desktop.mp4)
└── icons/    (192, 512, 512-maskable)
```

---

## 🎨 لوحة الألوان

| لون | hex | الاستخدام |
|---|---|---|
| sage | `#A8C5A0` | الأساسي (gradient start) |
| blush | `#D4A5A5` | الثانوي (gradient end) |
| cream | `#F8F3EE` | بطاقات/خلفيات ثانوية |
| pearl | `#FAF7F2` | خلفية الصفحات |
| ink | `#2A2438` | النص الأساسي |
| champagne | `#E8C5A0` | accent اختياري |

استخدمي `bg-sage-blush` للـ gradient الأساسي، `gradient-text` للنصوص.

---

## 🤖 ملاحظات الـ AI

- **النموذج:** `cohere/north-mini-code:free` على OpenRouter.
- **الـ Streaming** مفعّل في كل الشاتات (الحروف تظهر تباعاً).
- **`withRetry`** يعيد المحاولة 3 مرّات لحالات 429/503 مع backoff 1s/2s.
- **`sessionId`** ثابت في localStorage باسم `afnan_chat_session`.

---

## 📄 الترخيص

خاصّ بمتجر أفنان — جميع الحقوق محفوظة.
