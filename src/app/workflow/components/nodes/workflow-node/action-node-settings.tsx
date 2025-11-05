'use client';

import React from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { Check } from 'lucide-react';
import type { WorkflowNodeData, AppNodeType } from '@/app/workflow/components/nodes';
import { SegmentedSlider } from '@/components/ui/segmented-slider';
import { cn } from '@/lib/utils';

// Available models for selection - Image-to-Image models
const IMAGE_TO_IMAGE_MODELS = [
  { value: 'qwen', label: 'Qwen Image Edit' },
  { value: 'gemini-2-5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'wan', label: 'Wan Image Edit' }
];

// Default model for other node types
const DEFAULT_MODELS = [
  { value: 'default', label: 'Default Model' }
];

/**
 * Settings panel for action nodes (text-to-image-node, image-to-image-node, etc.)
 */
export function ActionNodeSettings({
  nodeId,
  nodeType,
  data,
}: {
  nodeId: string;
  nodeType: AppNodeType;
  data: WorkflowNodeData;
}) {
  const { setNodes } = useReactFlow();
  const nodes = useStore((state) => state.nodes);
  const modelListRef = React.useRef<HTMLDivElement>(null);
  const [modelTrackTop, setModelTrackTop] = React.useState<number>(0);
  const [modelTrackHeight, setModelTrackHeight] = React.useState<number>(0);

  const setData = (k: string, v: any) => {
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, [k]: v } } : n)));
  };

  // Determine available models based on node type
  const availableModels = React.useMemo(() => {
    const currentNode = nodes.find((n) => n.id === nodeId);
    if (!currentNode) return DEFAULT_MODELS;

    const type = currentNode.type;

    // Image-to-image nodes support model selection
    if (type === 'image-to-image-node') {
      return IMAGE_TO_IMAGE_MODELS;
    }

    // Other node types use default model
    return DEFAULT_MODELS;
  }, [nodeId, nodes]);

  const outputMode = (data?.setOutputMode || 'individual') as 'individual' | 'integrated';
  const executionMode = (data?.executionMode || 'concurrent') as 'concurrent' | 'progressive';
  const selectedModel = data?.selectedModel || (nodeType === 'image-to-image-node' ? 'qwen' : 'default');

  // Update sliding track position to align with the selected model
  React.useLayoutEffect(() => {
    const container = modelListRef.current;
    if (!container) return;
    const buttons = Array.from(container.querySelectorAll('button[data-model-item="true"]')) as HTMLButtonElement[];
    const index = availableModels.findIndex((m) => m.value === selectedModel);
    const target = index >= 0 ? buttons[index] : buttons[0];
    if (!target) return;
    
    // Calculate position relative to container using offsetTop/offsetHeight
    // This works correctly at all zoom levels
    const containerOffsetTop = container.offsetTop;
    const targetOffsetTop = target.offsetTop;
    const inset = 4; // avoid spilling into inter-item spacing
    
    setModelTrackTop(targetOffsetTop - containerOffsetTop + inset / 2);
    setModelTrackHeight(Math.max(0, target.offsetHeight - inset));
  }, [availableModels, selectedModel]);

  return (
    <div className="space-y-4">
      {/* Model Selection */}
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-1 w-full">
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-3 shadow-sm model-select-container-no-animation">
            <div className="text-[10px] text-muted-foreground mb-2">Model</div>
            <div className="relative space-y-1 rounded-md overflow-hidden">
              {availableModels.map((model) => {
                const isSelected = model.value === selectedModel;
                return (
                  <button
                    key={model.value}
                    type="button"
                    onClick={() => setData('selectedModel', model.value)}
                    data-model-item
                    className={cn(
                      "relative z-10 w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isSelected
                        ? "text-gray-900 dark:text-gray-100 bg-gray-200 dark:bg-gray-600"
                        : "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                    )}
                  >
                    <span>{model.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-gray-900 dark:text-gray-100" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {/* Output Mode */}
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-1 w-full">
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-3 shadow-sm">
            <div className="text-[10px] text-muted-foreground mb-1">Output Mode</div>
            <SegmentedSlider
              value={outputMode === 'individual' ? 'left' : 'right'}
              onChange={(v) => {
                const next = v === 'left' ? 'individual' : 'integrated';
                setData('setOutputMode', next);
                // When switching to integrated, force concurrent execution mode
                if (next === 'integrated' && executionMode !== 'concurrent') {
                  setData('executionMode', 'concurrent');
                }
              }}
              left="Separate"
              right="Combined"
            />
          </div>
        </div>
      </div>

      {/* Execution Mode */}
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-1 w-full">
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-3 shadow-sm">
            <div className="text-[10px] text-muted-foreground mb-1">Execution Mode</div>
            <SegmentedSlider
              value={executionMode === 'concurrent' ? 'left' : 'right'}
              onChange={(v) => setData('executionMode', v === 'left' ? 'concurrent' : 'progressive')}
              left="All at once"
              right="One-by-one"
              disabled={outputMode === 'integrated'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

