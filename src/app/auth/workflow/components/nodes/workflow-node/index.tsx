import React, { useCallback, useState } from 'react';
import { Play, Trash, RotateCcw, PauseCircle } from 'lucide-react';
import { NodeResizer, useReactFlow } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { WorkflowNodeData, AppNodeType } from '@/app/workflow/components/nodes';
import { useWorkflowRunner } from '@/app/workflow/hooks/use-workflow-runner';
import { iconMapping } from '@/app/workflow/utils/icon-mapping';
import { useAppStore } from '@/app/workflow/store';
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from '@/components/base-node';
import { NodeStatusIndicator } from '@/components/node-status-indicator';
import { IMAGE_NODE_SIZE, TEXT_NODE_SIZE, ACTION_NODE_SIZE, NODE_SET_SIZE, NODE_SIZE } from '@/app/workflow/config';

// This is an example of how to implement the WorkflowNode component. All the nodes in the Workflow Builder example
// are variations on this CustomNode defined in the index.tsx file.
// You can also create new components for each of your nodes for greater flexibility.
function WorkflowNode({
  id,
  data,
  type,
  children,
  onRefresh,
  selected,
}: {
  id: string;
  data: WorkflowNodeData;
  type?: AppNodeType;
  children?: React.ReactNode;
  onRefresh?: () => void;
  selected?: boolean;
}) {
  const { runWorkflow } = useWorkflowRunner();
  const removeNode = useAppStore((s) => s.removeNode);
  const { setNodes, getNode } = useReactFlow();
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [hasBreakpoint, setHasBreakpoint] = useState<boolean>(data?.hasBreakpoint || false);
  const onPlay = useCallback(() => runWorkflow(id), [id, runWorkflow]);
  const onRemove = useCallback(() => removeNode(id), [id, removeNode]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, title: newTitle } } : node
      )
    );
  }, [id, setNodes]);

  const handleBreakpointToggle = useCallback(() => {
    const newValue = !hasBreakpoint;
    setHasBreakpoint(newValue);
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, hasBreakpoint: newValue } } : node
      )
    );
  }, [hasBreakpoint, id, setNodes]);

  const IconComponent = data?.icon ? iconMapping[data.icon] : undefined;

  // Determine the minimum size based on node type
  const nodeType = type || getNode(id)?.type as AppNodeType;
  let minSize = NODE_SIZE;
  if (nodeType === 'image-frame' || nodeType === 'image-set' || nodeType === 'media-set') {
    minSize = IMAGE_NODE_SIZE;
  } else if (nodeType === 'text-frame' || nodeType === 'text-set') {
    minSize = TEXT_NODE_SIZE;
  } else if (nodeType === 'text-to-image-node' || nodeType === 'image-to-image-node') {
    minSize = ACTION_NODE_SIZE;
  } else if (nodeType === 'node-set') {
    minSize = NODE_SET_SIZE;
  }

  return (
    <NodeStatusIndicator status={data?.status}>
      <NodeResizer
        color="#3b82f6"
        isVisible={selected}
        minWidth={minSize.width}
        minHeight={minSize.height}
      />
      <BaseNode style={{ width: '100%', height: '100%' }}>
        <BaseNodeHeader>
          {IconComponent ? <IconComponent aria-label={data?.icon} /> : null}
          <BaseNodeHeaderTitle
            editable
            onTitleChange={handleTitleChange}
            onEditingChange={setIsTitleEditing}
          >
            {data?.title}
          </BaseNodeHeaderTitle>
          <div className="flex items-center gap-1" style={{ visibility: isTitleEditing ? 'hidden' : 'visible' }}>
            {onRefresh && (
              <Button
                variant="ghost"
                className="nodrag px-1!"
                onClick={onRefresh}
                title="刷新"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              className="nodrag px-1!"
              onClick={handleBreakpointToggle}
              title={hasBreakpoint ? "Remove breakpoint (workflow will pause after this node)" : "Add breakpoint"}
            >
              <PauseCircle className={`w-4 h-4 ${hasBreakpoint ? 'text-red-500' : 'text-gray-400'}`} />
            </Button>
            <Button variant="ghost" className="nodrag px-1!" onClick={onPlay}>
              <Play className="stroke-blue-500 fill-blue-500" />
            </Button>
            <Button variant="ghost" className="nodrag px-1!" onClick={onRemove}>
              <Trash />
            </Button>
          </div>
        </BaseNodeHeader>
        {children}
      </BaseNode>
    </NodeStatusIndicator>
  );
}

export default WorkflowNode;
