'use client';

import React from 'react';

/**
 * A two-segment slider component with smooth animation
 * Commonly used in node settings for binary choices
 */
export function SegmentedSlider({
  value,
  onChange,
  left,
  right,
  className,
  disabled,
}: {
  value: 'left' | 'right';
  onChange: (v: 'left' | 'right') => void;
  left: string;
  right: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={
        "relative flex w-[220px] items-center rounded-md border p-1 box-border overflow-hidden bg-white dark:bg-gray-800 " +
        (disabled ? " opacity-60 pointer-events-none " : " ") +
        (className || '')
      }
      aria-disabled={disabled}
    >
      <div
        className={`segmented-slider-track ${value === 'left' ? 'left' : 'right'}`}
        style={{ width: 'calc(50% - 4px)' }}
      />
      <button
        type="button"
        className={`relative z-10 flex-1 text-center px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${
          value === 'left' ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400'
        }`}
        onClick={() => onChange('left')}
      >
        {left}
      </button>
      <button
        type="button"
        className={`relative z-10 flex-1 text-center px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${
          value === 'right' ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400'
        }`}
        onClick={() => onChange('right')}
      >
        {right}
      </button>
    </div>
  );
}

