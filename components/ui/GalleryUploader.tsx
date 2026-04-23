'use client';

/**
 * MAXCHICHAR // Gallery Photo Uploader
 *
 * ─────────────────────────────────────────────────────────────
 * HOW TO REPLACE THE GALLERY PHOTO (3 methods):
 * ─────────────────────────────────────────────────────────────
 *
 * METHOD 1 — Static file (easiest, best quality):
 *   1. Put your photo at: /public/textures/my-photo.jpg
 *   2. Open store/worldStore.ts
 *   3. Change `galleryPhotoUrl: '/textures/gallery-placeholder.jpg'`
 *      to     `galleryPhotoUrl: '/textures/my-photo.jpg'`
 *   4. Done. The 3D gallery room picks it up via useTexture().
 *
 * METHOD 2 — Runtime drag & drop (this component):
 *   1. Press CMD+K → "Upload Gallery Photo"
 *   2. OR render <GalleryUploader /> somewhere
 *   3. Drag any .jpg/.png/.webp onto the dropzone
 *   4. It converts to base64 and updates the Zustand store
 *   5. The GalleryRoom re-renders with your photo instantly
 *
 * METHOD 3 — URL:
 *   import { useWorldStore } from '@/store/worldStore';
 *   useWorldStore.getState().setGalleryPhoto('https://your-cdn.com/photo.jpg');
 * ─────────────────────────────────────────────────────────────
 */

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorldStore } from '@/store/worldStore';

export default function GalleryUploader({ onClose }: { onClose?: () => void }) {
  const { setGalleryPhoto } = useWorldStore();
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatus('ERROR: File must be an image (JPG, PNG, WEBP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setPreview(url);
      setGalleryPhoto(url);
      setStatus('UPLOAD COMPLETE // GALLERY UPDATED');
    };
    reader.readAsDataURL(file);
  }, [setGalleryPhoto]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className="w-full h-48 border-2 border-dashed transition-all duration-300 clip-hex-sm flex flex-col items-center justify-center gap-3 cursor-pointer relative"
      style={{ borderColor: dragging ? '#00ffff' : '#7b00ff', background: dragging ? 'rgba(0,255,255,0.05)' : 'rgba(123,0,255,0.05)' }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => document.getElementById('gallery-upload')?.click()}
    >
      <input
        id="gallery-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInput}
      />

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Gallery preview" className="h-32 object-contain" />
      ) : (
        <>
          <div className="text-4xl text-purple/60">{dragging ? '⬇' : '⬆'}</div>
          <p className="font-mono text-xs text-purple tracking-widest text-center">
            {dragging ? 'RELEASE TO UPLOAD' : 'DRAG & DROP YOUR PHOTO'}<br />
            <span className="text-purple/50">OR CLICK TO BROWSE</span>
          </p>
        </>
      )}

      {status && (
        <p className="font-mono text-[10px] tracking-widest"
           style={{ color: status.startsWith('ERROR') ? '#ff4444' : '#00ffff' }}>
          {status}
        </p>
      )}
    </div>
  );
}
