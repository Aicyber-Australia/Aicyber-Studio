'use client';

import React from 'react';
import { createPortal } from 'react-dom';

export function NodeSettingsDialog({
  open,
  onOpenChange,
  title = 'Node Settings',
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children?: React.ReactNode;
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative z-[100000] w-[560px] max-w-[95vw] rounded-lg border bg-white p-4 shadow-lg dark:bg-gray-900 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">{title}</div>
          <button
            type="button"
            className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="mt-2 max-h-[70vh] overflow-auto space-y-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}


