'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SquareX } from 'lucide-react';

export function NodeSettingsDialog({
  open,
  onOpenChange,
  title = 'Node Settings',
  children,
  anchorRect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children?: React.ReactNode;
  anchorRect?: { x: number; y: number; width: number; height: number } | null;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; originX: number; originY: number }>({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  // Initialize position when opened: prefer anchoring to the right of the node if provided
  useEffect(() => {
    if (!open) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (anchorRect) {
      // Desired size consistent with style below
      const desiredWidth = Math.min(window.innerWidth * 0.9, 300);
      const desiredHeight = 360;

      const margin = 8;
      let x = anchorRect.x + anchorRect.width + margin; // to the right
      let y = anchorRect.y; // align top

      // Clamp within viewport
      if (x + desiredWidth + margin > vw) {
        x = Math.max(margin, vw - desiredWidth - margin);
      }
      if (y + desiredHeight + margin > vh) {
        y = Math.max(margin, vh - desiredHeight - margin);
      }

      setPosition({ x: Math.floor(x), y: Math.floor(y) });
      return;
    }

    // Fallback: center-ish
    const width = Math.min(560, Math.floor(vw * 0.9));
    const height = Math.min(360, Math.floor(vh * 0.85));
    const x = Math.max(8, Math.floor((vw - width) / 2));
    const y = Math.max(8, Math.floor((vh - height) / 3));
    setPosition({ x, y });
  }, [open, anchorRect]);

  const handleMouseDownHeader = useCallback((e: React.MouseEvent) => {
    if (!dialogRef.current) return;
    dragState.current.dragging = true;
    dragState.current.startX = e.clientX;
    dragState.current.startY = e.clientY;
    dragState.current.originX = position?.x || 0;
    dragState.current.originY = position?.y || 0;
    e.preventDefault();
  }, [position]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragState.current.dragging) return;
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      const nx = Math.max(0, Math.min(window.innerWidth - 40, dragState.current.originX + dx));
      const ny = Math.max(0, Math.min(window.innerHeight - 40, dragState.current.originY + dy));
      setPosition({ x: nx, y: ny });
    };
    const onUp = () => {
      dragState.current.dragging = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (!open || position == null) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999]" style={{ pointerEvents: 'auto' }}>
      {/* No grey backdrop as requested */}
      <div
        ref={dialogRef}
        className="absolute rounded-lg border bg-white shadow-lg dark:bg-gray-900 dark:border-gray-800 box-border"
        style={{ left: position.x, top: position.y, width: 'min(90vw, 300px)', height: '360px' }}
      >
        {/* Header (draggable handle) */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800 cursor-move select-none"
          onMouseDown={handleMouseDownHeader}
        >
          <div className="text-base font-semibold">{title}</div>
          <button
            type="button"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => onOpenChange(false)}
            title="Close"
          >
            <SquareX className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 h-[300px] overflow-auto space-y-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}


