'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ImagePreviewDialogProps {
  image: {
    url: string;
    fileName: string;
  } | null;
  onClose: () => void;
}

export function ImagePreviewDialog({ image, onClose }: ImagePreviewDialogProps) {
  // Close preview on mouse up globally
  useEffect(() => {
    if (!image) return;

    const handleGlobalMouseUp = () => {
      onClose();
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [image, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!image) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [image, onClose]);

  if (!image) return null;

  // Use portal to render at document body level
  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ pointerEvents: 'auto' }}
      onClick={onClose}
    >
      <div className="max-w-[95vw] max-h-[95vh] relative select-none" onClick={(e) => e.stopPropagation()}>
        <img
          src={image.url}
          alt={image.fileName}
          className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
          draggable={false}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-sm px-4 py-2 rounded-b-lg">
          {image.fileName}
        </div>
      </div>
    </div>,
    document.body
  );
}
