/**
 * Cloudinary unsigned upload helper.
 *
 * Reads VITE_CLOUDINARY_CLOUD_NAME + VITE_CLOUDINARY_UPLOAD_PRESET.
 * Single function: uploadImage(file, { onProgress }) → { url, publicId, width, height }.
 */
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const isCloudinaryConfigured = () => Boolean(cloudName && uploadPreset);

/**
 * Upload a single File/Blob to Cloudinary using an unsigned preset.
 * Uses XHR so we can report progress for the admin uploader.
 */
export function uploadImage(file, { onProgress } = {}) {
  if (!isCloudinaryConfigured()) {
    return Promise.reject(new Error('Cloudinary غير مُهيّأ. أضيفي VITE_CLOUDINARY_CLOUD_NAME و VITE_CLOUDINARY_UPLOAD_PRESET.'));
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            url: data.secure_url,
            publicId: data.public_id,
            width: data.width,
            height: data.height,
          });
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(`فشل رفع الصورة (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('فشل الاتصال أثناء رفع الصورة'));
    xhr.send(form);
  });
}

/** Bulk upload with sequential progress callback. */
export async function uploadImages(files, { onItemProgress, onItemDone } = {}) {
  const out = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const res = await uploadImage(f, {
      onProgress: (p) => onItemProgress?.(i, p),
    });
    out.push(res);
    onItemDone?.(i, res);
  }
  return out;
}
