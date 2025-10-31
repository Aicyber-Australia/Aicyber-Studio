import React, { useCallback, useState } from 'react';
import { Trash, RotateCcw, OctagonMinus, Play, Square, HelpCircle, ImageUp } from 'lucide-react';
import { NodeResizer, useReactFlow } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  const { runWorkflow, stopWorkflow } = useWorkflowRunner();
  const removeNode = useAppStore((s) => s.removeNode);
  const { setNodes, getNode } = useReactFlow();
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [hasBreakpoint, setHasBreakpoint] = useState<boolean>(data?.hasBreakpoint || false);
  const [isImageUpActive, setIsImageUpActive] = useState<boolean>(false);
  
  // Check if node is running (loading status means it's executing)
  const isNodeRunning = data?.status === 'loading';
  
  const onPlay = useCallback(() => {
    if (isNodeRunning) {
      // Stop the workflow if node is running
      stopWorkflow();
    } else {
      // Start running from this node
      runWorkflow(id);
    }
  }, [id, runWorkflow, stopWorkflow, isNodeRunning]);
  
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

  const handleImageUpToggle = useCallback(() => {
    setIsImageUpActive((prev) => !prev);
  }, []);

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

  const IconComponent = data?.icon ? iconMapping[data.icon] : undefined;

  return (
    <div className="relative">
      <NodeStatusIndicator status={data?.status}>
        <NodeResizer
          color="#3b82f6"
          isVisible={selected}
          minWidth={minSize.width}
          minHeight={minSize.height}
        />
        <BaseNode style={{ width: '100%', height: '100%' }}>
        <BaseNodeHeader className="flex-col gap-0 border-b border-gray-200 dark:border-gray-700">
          {/* First layer: Icon, Node Name */}
          <div className="flex items-center justify-between w-full px-0.5 pt-0 pb-0.5 min-h-[20px] relative">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {IconComponent ? <IconComponent aria-label={data?.icon} className="h-5 w-5 flex-shrink-0" /> : null}
              <BaseNodeHeaderTitle
                editable
                onTitleChange={handleTitleChange}
                onEditingChange={setIsTitleEditing}
                className="flex-1 min-w-0"
              >
                {data?.title}
              </BaseNodeHeaderTitle>
            </div>
          </div>
          <div className="w-2/3 h-px bg-gray-200 dark:bg-gray-700 ml-1 self-start"></div>
          {/* Second layer: Toolbar buttons */}
          <div className="flex items-center justify-between w-full px-0.5 pt-1 min-h-[10px]">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon"
                className="nodrag bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 h-7 w-7 transition-colors" 
                onClick={onPlay}
                title={isNodeRunning ? "Stop node execution" : "Run node"}
              >
                {isNodeRunning ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "nodrag h-7 w-7 transition-colors",
                  hasBreakpoint 
                    ? "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" 
                    : "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
                onClick={handleBreakpointToggle}
                title={hasBreakpoint ? "Remove breakpoint (workflow will pause after this node)" : "Add breakpoint"}
              >
                <OctagonMinus className={`h-4 w-4 ${hasBreakpoint ? 'text-red-500' : 'text-black dark:text-black'}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className={cn(
                  "nodrag h-7 w-7 transition-colors",
                  isImageUpActive 
                    ? "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" 
                    : "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
                onClick={handleImageUpToggle}
                title="Image Up"
              >
                <ImageUp className={`h-4 w-4 ${isImageUpActive ? 'text-blue-500' : 'text-black dark:text-black'}`} />
              </Button>
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="nodrag bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 h-7 w-7 transition-colors"
                  onClick={onRefresh}
                  title="刷新"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                className="nodrag bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 h-7 w-7 transition-colors" 
                onClick={onRemove}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon"
                className="nodrag h-7 w-7 hover:bg-transparent" 
                title="Help"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </BaseNodeHeader>
        <div className="bg-gray-50 dark:bg-gray-900 flex-1 min-h-0">
          {children}
        </div>
        </BaseNode>
      </NodeStatusIndicator>
    </div>
  );
}

export default WorkflowNode;
