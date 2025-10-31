'use client';

import React from 'react';
import { useReactFlow } from '@xyflow/react';
import type { WorkflowNodeData, AppNodeType } from '@/app/workflow/components/nodes';
import { SegmentedSlider } from '@/components/ui/segmented-slider';

/**
 * Settings panel for action nodes (text-to-image-node, image-to-image-node, etc.)
 * This is a placeholder for future action node settings
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

  const setData = (k: string, v: any) => {
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, [k]: v } } : n)));
  };

  // Placeholder for action node settings
  // You can add specific settings for action nodes here
  
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Action node settings will be added here
      </div>
      {/* Example: Model selection, parameters, etc. */}
    </div>
  );
}

