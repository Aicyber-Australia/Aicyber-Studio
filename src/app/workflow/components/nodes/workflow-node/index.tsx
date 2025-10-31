import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash, Trash2, RotateCcw, OctagonMinus, Play, Square, HelpCircle, ImageUp, Menu } from 'lucide-react';
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

// import { NodeSettingsDialog } from './node-settings-dialog'; // replaced by canvas settings-node
// import { SetNodeSettings } from './set-node-settings'; // now used inside settings-node component

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // State for delete confirmation dialog

  // Settings open state for menu button style
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isNodeRunning = data?.status === 'loading';

  const onPlay = useCallback(() => {
    if (isNodeRunning) {
      stopWorkflow();
    } else {
      runWorkflow(id);
    }
  }, [id, runWorkflow, stopWorkflow, isNodeRunning]);

  const handleDeleteClick = useCallback(() => {
    setIsDeleteDialogOpen(true); // Open dialog on first click
  }, []);

  const handleConfirmDelete = useCallback(() => {
    removeNode(id);
    setIsDeleteDialogOpen(false); // Close dialog after deleting
  }, [removeNode, id]);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteDialogOpen(false); // Close dialog on cancel
  }, []);

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

  // Whether this node is a set-type node
  const isSetNode = (() => {
    const t = (type || (getNode(id)?.type as AppNodeType)) as string | undefined;
    return [
      'text-set',
      'image-set',
      'video-set',
      'media-set',
      'node-set',
    ].includes(t || '');
  })();

  // Determine the minimum size based on node type
  const nodeType = (type || (getNode(id)?.type as AppNodeType)) as AppNodeType;
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

  const containerRef = React.useRef<HTMLDivElement>(null);

  const settingsNodeId = `settings-${id}`;

  const createOrUpdateSettingsNode = useCallback(() => {
    const currentNode = getNode(id);
    if (!currentNode) return;
    
    const gap = 24; // reserve handle space and avoid overlap
    const settingsX = (currentNode.position?.x || 0) + (currentNode.width || minSize.width) + gap;
    const settingsY = currentNode.position?.y || 0;

    setNodes((nodes) => {
      const base = nodes.filter((n) => n.id !== settingsNodeId);
      const position = { x: settingsX, y: settingsY };
      const settingsNode = {
        id: settingsNodeId,
        type: 'settings-node',
        position,
        data: {
          targetId: id,
          targetType: nodeType,
          targetData: data,
          title: `Node Settings - ${data?.title || 'Untitled'}`,
          onClose: () => {
            setIsSettingsOpen(false);
            setNodes((ns) => ns.filter((n) => n.id !== settingsNodeId));
          },
        },
        draggable: false,
        selectable: true,
        width: 260,
        height: 360,
        zIndex: 10000,
        style: { zIndex: 10000, pointerEvents: 'auto' },
      } as any;

      return [...base, settingsNode];
    });
  }, [data, id, nodeType, getNode, minSize.width, setNodes, settingsNodeId]);

  const removeSettingsNode = useCallback(() => {
    setNodes((ns) => ns.filter((n) => n.id !== settingsNodeId));
  }, [setNodes]);

  const openSettings = useCallback(() => {
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      removeSettingsNode();
      return;
    }
    setIsSettingsOpen(true);
    createOrUpdateSettingsNode();
  }, [isSettingsOpen, createOrUpdateSettingsNode, removeSettingsNode]);

  // Keep settings node anchored to the right of this node when position/size changes
  React.useEffect(() => {
    if (!isSettingsOpen) return;
    createOrUpdateSettingsNode();
  }, [isSettingsOpen, data?.title, createOrUpdateSettingsNode]);

  // Also update when this node's position changes (via React Flow internals)
  React.useEffect(() => {
    if (!isSettingsOpen) return;
    const currentNode = getNode(id);
    if (!currentNode) return;
    createOrUpdateSettingsNode();
  }, [isSettingsOpen, getNode(id)?.position?.x, getNode(id)?.position?.y, getNode(id)?.width, getNode(id)?.height, createOrUpdateSettingsNode]);

  return (
    <div className="relative" ref={containerRef}>
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
          <div className="flex items-center justify-between w-full px-0.5 pt-0 pb-0.5 min-h-[20px]">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {IconComponent ? <IconComponent aria-label={data?.icon} className="h-5 w-5 flex-shrink-0" /> : null}
              <div className="relative flex-1 min-w-0">
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
                className="group nodrag bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 h-7 w-7 transition-colors"
                onClick={handleDeleteClick}
                title="Delete"
              >
                <Trash className="h-4 w-4 group-hover:hidden" />
                <Trash2 className="h-4 w-4 hidden group-hover:block" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {/* Help */}
              <Button
                variant="ghost"
                size="icon"
                className="nodrag h-7 w-7 hover:bg-transparent"
                title="Help"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              {/* Menu (settings) for set nodes only */}
              {isSetNode && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "nodrag h-7 w-7 transition-colors",
                    isSettingsOpen
                      ? "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                      : "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                  title="Menu"
                  onClick={openSettings}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </BaseNodeHeader>
        <div className="bg-gray-50 dark:bg-gray-900 flex-1 min-h-0">
          {children}
        </div>
        </BaseNode>
      </NodeStatusIndicator>

      {/* Delete confirmation modal (English) - rendered via portal */}
      {isDeleteDialogOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/50" onClick={handleCancelDelete} />
          <div className="relative z-[100000] w-[320px] rounded-lg border bg-white p-4 shadow-lg dark:bg-gray-900 dark:border-gray-800">
            <div className="text-sm font-semibold mb-2">Delete node?</div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-4">This action cannot be undone.</div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-2.5 py-1.5 text-xs rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-2.5 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default WorkflowNode;
