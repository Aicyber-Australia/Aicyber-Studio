'use client';

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Pencil, Undo, Redo, Circle, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Stage, Layer, Line, Image as KonvaImage, Rect, Circle as KonvaCircle } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';

interface ImageEditDialogProps {
  imageUrl: string | null;
  onClose: () => void;
  onSave: (imageDataUrl: string) => void;
}

type DrawingTool = 'pen' | 'circle' | 'rect';

interface DrawingElement {
  tool: DrawingTool;
  points?: number[];
  color?: string;
  strokeWidth?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  fill?: string;
}

function ImageLayer({ imageUrl }: { imageUrl: string }) {
  const [image] = useImage(imageUrl, 'anonymous');
  return image ? <KonvaImage image={image} /> : null;
}

export function ImageEditDialog({ imageUrl, onClose, onSave }: ImageEditDialogProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [tool, setTool] = useState<DrawingTool>('pen');
  const [color, setColor] = useState('#3b82f6');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [history, setHistory] = useState<DrawingElement[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const isDrawing = useRef(false);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // Load image and set stage size - reset edits when image changes
  useEffect(() => {
    if (imageUrl) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setStageSize({ width: img.width, height: img.height });
      };
      img.src = imageUrl;

      // Reset all edits when image changes (including when dialog reopens)
      setElements([]);
      setHistory([[]]);
      setHistoryStep(0);
    }
  }, [imageUrl]);

  // Close on Escape key
  useEffect(() => {
    if (!imageUrl) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [imageUrl, onClose]);

  const saveToHistory = useCallback((newElements: DrawingElement[]) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [history, historyStep]);

  const handleMouseDown = (e: any) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();

    if (tool === 'pen') {
      setElements([...elements, {
        tool,
        points: [pos.x, pos.y],
        color,
        strokeWidth,
      }]);
    } else if (tool === 'circle') {
      setElements([...elements, {
        tool: 'circle',
        x: pos.x,
        y: pos.y,
        radius: 0,
        color,
        strokeWidth,
      }]);
    } else if (tool === 'rect') {
      setElements([...elements, {
        tool: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
        strokeWidth,
      }]);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastElement = elements[elements.length - 1];

    if (!lastElement) return;

    if (lastElement.tool === 'pen') {
      const newPoints = lastElement.points!.concat([point.x, point.y]);
      const newElements = elements.slice();
      newElements[newElements.length - 1] = { ...lastElement, points: newPoints };
      setElements(newElements);
    } else if (lastElement.tool === 'circle') {
      const dx = point.x - lastElement.x!;
      const dy = point.y - lastElement.y!;
      const radius = Math.sqrt(dx * dx + dy * dy);
      const newElements = elements.slice();
      newElements[newElements.length - 1] = { ...lastElement, radius };
      setElements(newElements);
    } else if (lastElement.tool === 'rect') {
      const newElements = elements.slice();
      newElements[newElements.length - 1] = {
        ...lastElement,
        width: point.x - lastElement.x!,
        height: point.y - lastElement.y!,
      };
      setElements(newElements);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      saveToHistory(elements);
    }
  };

  const handleUndo = useCallback(() => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setElements(history[historyStep - 1]);
    }
  }, [historyStep, history]);

  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setElements(history[historyStep + 1]);
    }
  }, [historyStep, history]);

  const handleReset = useCallback(() => {
    // Clear all edits and reset to original image
    setElements([]);
    setHistory([[]]);
    setHistoryStep(0);
  }, []);

  const handleSave = useCallback(() => {
    if (!stageRef.current) return;

    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 1 });
    onSave(dataUrl);
    onClose();
  }, [onSave, onClose]);

  const handleDownload = useCallback(() => {
    if (!stageRef.current) return;

    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 1 });
    const link = document.createElement('a');
    link.download = `edited_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

  if (!imageUrl) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="relative w-[90vw] max-w-[1400px] h-[95vh] bg-white rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Edit Image</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-4 border-b bg-gray-50">
          {/* Drawing Tools */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={tool === 'pen' ? 'default' : 'outline'}
              onClick={() => setTool('pen')}
              title="Draw"
            >
              <Pencil className="w-4 h-4 mr-1" />
              Draw
            </Button>
            <Button
              size="sm"
              variant={tool === 'circle' ? 'default' : 'outline'}
              onClick={() => setTool('circle')}
              title="Circle"
            >
              <Circle className="w-4 h-4 mr-1" />
              Circle
            </Button>
            <Button
              size="sm"
              variant={tool === 'rect' ? 'default' : 'outline'}
              onClick={() => setTool('rect')}
              title="Rectangle"
            >
              <Square className="w-4 h-4 mr-1" />
              Rectangle
            </Button>
            <div className="w-px bg-gray-300 mx-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={handleUndo}
              disabled={historyStep <= 0}
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRedo}
              disabled={historyStep >= history.length - 1}
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              title="Reset to original image"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>

          {/* Brush Controls */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Color:</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-gray-300"
              />
            </div>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs font-medium whitespace-nowrap">Brush Size: {strokeWidth}px</span>
              <Slider
                value={[strokeWidth]}
                onValueChange={(values) => setStrokeWidth(values[0])}
                min={1}
                max={50}
                step={1}
                className="flex-1 max-w-xs"
              />
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-gray-100">
          <div className="bg-white shadow-lg">
            <Stage
              ref={stageRef}
              width={stageSize.width}
              height={stageSize.height}
              onMouseDown={handleMouseDown}
              onMousemove={handleMouseMove}
              onMouseup={handleMouseUp}
              style={{ cursor: 'crosshair' }}
            >
              <Layer>
                {/* Background Image */}
                <ImageLayer imageUrl={imageUrl} />

                {/* Drawing Elements */}
                {elements.map((element, i) => {
                  if (element.tool === 'pen') {
                    return (
                      <Line
                        key={i}
                        points={element.points}
                        stroke={element.color}
                        strokeWidth={element.strokeWidth}
                        tension={0.5}
                        lineCap="round"
                        lineJoin="round"
                      />
                    );
                  } else if (element.tool === 'circle') {
                    return (
                      <KonvaCircle
                        key={i}
                        x={element.x}
                        y={element.y}
                        radius={element.radius}
                        stroke={element.color}
                        strokeWidth={element.strokeWidth}
                      />
                    );
                  } else if (element.tool === 'rect') {
                    return (
                      <Rect
                        key={i}
                        x={element.x}
                        y={element.y}
                        width={element.width}
                        height={element.height}
                        stroke={element.color}
                        strokeWidth={element.strokeWidth}
                      />
                    );
                  }
                  return null;
                })}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save & Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
