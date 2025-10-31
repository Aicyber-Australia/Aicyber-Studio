import React, { useState, useRef, useEffect, forwardRef, type HTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableTitleProps extends Omit<HTMLAttributes<HTMLHeadingElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onEditingChange?: (isEditing: boolean) => void;
}

/**
 * An editable title component that shows a hover effect and allows click-to-edit.
 * On hover, shows a darker bounded box around the title.
 * On click, focuses on an input box for editing.
 */
export const EditableTitle = forwardRef<HTMLHeadingElement, EditableTitleProps>(
  ({ value, onChange, onEditingChange, className, ...props }, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update edit value when value prop changes
    useEffect(() => {
      setEditValue(value);
    }, [value]);

    // Focus input when entering edit mode
    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    const handleClick = () => {
      setIsEditing(true);
      onEditingChange?.(true);
    };

    const handleSave = () => {
      setIsEditing(false);
      onEditingChange?.(false);
      if (editValue.trim() !== value) {
        onChange(editValue.trim() || value); // Don't allow empty titles
      } else {
        setEditValue(value); // Reset to original if no change
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Don't blur if clicking on the save button
      if (e.relatedTarget?.classList.contains('save-title-btn')) {
        return;
      }
      handleSave();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditValue(value);
        setIsEditing(false);
        onEditingChange?.(false);
      }
    };

    // Shared style object - use inline styles for pixel-perfect matching
    const sharedStyle: React.CSSProperties = {
      height: '28px',
      lineHeight: '28px',
      padding: '0 4px',
      margin: '0',
      fontSize: '16px',
      fontWeight: 600,
      boxSizing: 'border-box',
    };

    return (
      <>
        <h3
          ref={ref}
          data-slot="base-node-title"
          className={cn(
            'nodrag flex-1 min-w-0',
            'user-select-none cursor-text',
            'hover:bg-muted/50 hover:ring-1 hover:ring-border transition-all',
            // Text truncation
            'truncate overflow-hidden',
            // Transparent ring to match input ring space
            'ring-1 ring-transparent rounded',
            className
          )}
          onClick={handleClick}
          title={value}
          style={{
            ...sharedStyle,
            visibility: isEditing ? 'hidden' : 'visible',
          }}
          {...props}
        >
          {value}
        </h3>
        {isEditing && (
          <div
            className="absolute left-0 top-0 bottom-0 flex items-center gap-1 z-10"
            style={{
              pointerEvents: 'auto',
              width: '66.67%', // 2/3 width
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={cn(
                'nodrag flex-1 min-w-0',
                'bg-transparent outline-none focus:outline-none',
                'ring-1 ring-border bg-muted/50',
                'border-0 rounded',
                // Enable horizontal scrolling when text is too long
                'overflow-x-auto whitespace-nowrap',
                // Reset input default styling
                'appearance-none',
                className
              )}
              style={{
                ...sharedStyle,
                scrollbarWidth: 'thin',
              }}
              {...props}
            />
            <button
              type="button"
              className="save-title-btn nodrag flex-shrink-0 p-1 rounded hover:bg-muted/70 transition-colors bg-card"
              onClick={handleSave}
              title="Save (Enter)"
            >
              <Check className="w-4 h-4 text-green-600" />
            </button>
          </div>
        )}
      </>
    );
  }
);

EditableTitle.displayName = 'EditableTitle';
