'use client';

import React from 'react';
import { useReactFlow } from '@xyflow/react';
import type { WorkflowNodeData, AppNodeType } from '@/app/workflow/components/nodes';

/**
 * Settings panel for frame nodes (image-frame, video-frame, text-frame)
 * This is a placeholder for future frame node settings
 */
export function FrameNodeSettings({
  nodeId,
  nodeType,
  data,
}: {
  nodeId: string;
  nodeType: AppNodeType;
  data: WorkflowNodeData;
}) {
  const { setNodes } = useReactFlow();

  const setData = (k: string, v: any) => {
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, [k]: v } } : n)));
  };

  // Placeholder for frame node settings
  // You can add specific settings for frame nodes here
  // Examples: image quality, resize options, format conversion, etc.
  
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Frame node settings will be added here
      </div>
      {/* Example: Image quality, resize options, format settings, etc. */}
    </div>
  );
}

