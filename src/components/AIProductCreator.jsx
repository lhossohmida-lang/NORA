/**
 * AIProductCreator — /admin/new
 *
 * A guided flow for adding a product:
 *   1. Drag-and-drop or click to pick image files.
 *   2. Sequential Cloudinary upload with per-file progress.
 *   3. Form (nameAr, nameEn, price, category, description).
 *   4. ✨ AI button — pulls keywords (typed name or category label) and
 *      fills nameAr / nameEn / description in one shot.
 *   5. Save → writes to Firestore 'products' with createdAt timestamp.
 */
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, Sparkles, Loader2, Save, ArrowRight, ImagePlus, Trash2, ChevronLeft, Wand2,
} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { uploadImages } from '../lib/cloudinary.js';
import { generateProductContent } from '../lib/openrouter.js';
import { PRODUCT_CATEGORIES, categoryLabel } from './ClientStorefront.jsx';

const formatBytes = (b) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

export default function AIProductCreator() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [files, setFiles] = useState([]); // [{ file, preview, progress, url? }]
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({ nameAr: '', nameEn: '', price: '', category: 'caftan', description: '' });
  const [uploading, setUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addFiles = (list) => {
    const incoming = Array.from(list).filter((f) => f.type.startsWith('image/'));
    const mapped = incoming.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      url: null,
    }));
    setFiles((prev) => [...prev, ...mapped]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => {
    setFiles((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[idx]?.preview);
      copy.splice(idx, 1);
      return copy;
    });
  };

  const aiFill = async () => {
    const keywords = form.nameAr || form.nameEn || categoryLabel(form.category);
    if (!keywords.trim()) { setError('اكتبي كلمة مفتاحية أو اختاري فئة أوّلاً.'); return; }
    setError(null);
    setAiBusy(true);
    try {
      const out = await generateProductContent(keywords);
      setForm((f) => ({
        ...f,
        nameAr: out.nameAr || f.nameAr,
        nameEn: out.nameEn || f.nameEn,
        description: out.description || f.description,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    setError(null);
    if (!form.nameAr.trim()) { setError('الاسم بالعربية مطلوب.'); return; }
    if (!form.price || Number(form.price) <= 0) { setError('السعر يجب أن يكون أكبر من 0.'); return; }
    if (files.length === 0) { setError('أضيفي صورة واحدة على الأقل.'); return; }

    setSaving(true);
    try {
      // Upload all files (sequential, with per-file progress)
      setUploading(true);
      const uploads = await uploadImages(
        files.map((f) => f.file),
        {
          onItemProgress: (i, p) => {
            setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, progress: p } : f)));
          },
          onItemDone: (i, res) => {
            setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, url: res.url, progress: 100 } : f)));
          },
        },
      );
      setUploading(false);

      await addDoc(collection(db, 'products'), {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        price: Number(form.price),
        category: form.category,
        description: form.description.trim(),
        images: uploads.map((u) => u.url),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess(true);
      setTimeout(() => navigate('/admin', { replace: true }), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pearl text-ink pb-20">
      <header className="sticky top-0 z-20 glass border-b border-cream px-5 md:px-8 py-3 flex items-center gap-3">
        <Link to="/admin" className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-sage" />
            منتج جديد
          </h1>
          <p className="text-xs text-ink/50">ارفعي الصور، استخدمي الـ AI، واحفظي</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 md:px-8 py-6 space-y-6">
        {/* Image dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`card cursor-pointer p-8 text-center border-2 border-dashed transition ${
            dragOver ? 'border-sage bg-sage/5' : 'border-cream'
          }`}
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-sage-blush text-white flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <p className="font-bold">اسحبي الصور هنا أو اضغطي للاختيار</p>
          <p className="text-xs text-ink/50 mt-1">PNG · JPG · WebP — حتى 5MB لكل صورة</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative card overflow-hidden"
              >
                <div className="aspect-square bg-cream">
                  <img src={f.preview} alt="" className="w-full h-full object-cover" />
                </div>
                {f.progress > 0 && f.progress < 100 && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-cream">
                    <div className="h-full bg-sage transition-all" style={{ width: `${f.progress}%` }} />
                  </div>
                )}
                {f.url && (
                  <span className="absolute top-2 right-2 bg-sage text-white text-[10px] px-2 py-0.5 rounded-full">
                    ✓
                  </span>
                )}
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-2 left-2 w-7 h-7 rounded-full bg-ink/60 backdrop-blur text-white flex items-center justify-center"
                  aria-label="حذف"
                  type="button"
                >
                  <X className="w-3 h-3" />
                </button>
                <p className="px-2 py-1 text-[10px] text-ink/50 truncate" dir="ltr">
                  {f.file.name} · {formatBytes(f.file.size)}
                </p>
              </motion.div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              className="card aspect-square flex items-center justify-center text-ink/50 hover:bg-cream transition"
              type="button"
            >
              <div className="text-center">
                <ImagePlus className="w-6 h-6 mx-auto" />
                <p className="text-xs mt-1">المزيد</p>
              </div>
            </button>
          </div>
        )}

        {/* Form */}
        <div className="card p-6 space-y-4">
          <div>
            <label className="label flex items-center justify-between">
              <span>الاسم بالعربية *</span>
              <button
                type="button"
                onClick={aiFill}
                disabled={aiBusy}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-sage-blush text-white disabled:opacity-50"
              >
                {aiBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                توليد بـ AI
              </button>
            </label>
            <input
              className="field"
              value={form.nameAr}
              onChange={(e) => setField('nameAr', e.target.value)}
              placeholder="مثال: قفطان زهري بتطريز ذهبي"
            />
          </div>

          <div>
            <label className="label">Name (English)</label>
            <input
              className="field"
              dir="ltr"
              value={form.nameEn}
              onChange={(e) => setField('nameEn', e.target.value)}
              placeholder="Pink Kaftan with Gold Embroidery"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">السعر (دج) *</label>
              <input
                type="number"
                className="field"
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
                placeholder="15000"
              />
            </div>
            <div>
              <label className="label">الفئة</label>
              <select
                className="field"
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">الوصف</label>
            <textarea
              rows={3}
              className="field resize-none"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="وصف قصير وجذّاب للقطعة..."
            />
          </div>

          {error && (
            <div className="text-sm text-blush bg-blush/10 border border-blush/20 rounded-2xl px-4 py-3">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link to="/admin" className="btn-ghost flex-1 justify-center">إلغاء</Link>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {uploading ? 'رفع الصور...' : 'حفظ...'}</>
              : <><Save className="w-4 h-4" /> حفظ المنتج</>}
            {!saving && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="card p-8 text-center max-w-sm"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-sage-blush text-white flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7" />
              </div>
              <p className="font-bold text-lg">تمّ بنجاح!</p>
              <p className="text-sm text-ink/60 mt-2">القطعة أُضيفت إلى الكتالوغ.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
