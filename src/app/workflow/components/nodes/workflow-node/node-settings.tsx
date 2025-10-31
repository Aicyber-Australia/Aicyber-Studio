'use client';

import React from 'react';
import type { WorkflowNodeData, AppNodeType } from '@/app/workflow/components/nodes';
import { SetNodeSettings } from './set-node-settings';
import { ActionNodeSettings } from './action-node-settings';
import { FrameNodeSettings } from './frame-node-settings';

/**
 * Main settings router component that renders the appropriate settings panel
 * based on node type
 */
export function NodeSettings({
  nodeId,
  nodeType,
  data,
}: {
  nodeId: string;
  nodeType: AppNodeType;
  data: WorkflowNodeData;
}) {
  // Determine if this is a set node
  const isSetNode = [
    'text-set',
    'image-set',
    'video-set',
    'media-set',
    'node-set',
  ].includes(nodeType);

  // Determine if this is an action node
  const isActionNode = [
    'text-to-image-node',
    'image-to-image-node',
    // Add more action node types here
  ].includes(nodeType);

  // Determine if this is a frame node
  const isFrameNode = [
    'image-frame',
    'video-frame',
    'text-frame',
  ].includes(nodeType);

  // Render appropriate settings panel
  if (isSetNode) {
    return <SetNodeSettings nodeId={nodeId} nodeType={nodeType} data={data} />;
  }

  if (isActionNode) {
    return <ActionNodeSettings nodeId={nodeId} nodeType={nodeType} data={data} />;
  }

  if (isFrameNode) {
    return <FrameNodeSettings nodeId={nodeId} nodeType={nodeType} data={data} />;
  }

  // Default fallback
  return (
    <div className="text-sm text-muted-foreground">
      No settings available for this node type
    </div>
  );
}

