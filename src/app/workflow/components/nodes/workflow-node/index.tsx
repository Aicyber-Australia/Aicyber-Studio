import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash, Trash2, RotateCcw, OctagonMinus, Play, Square, HelpCircle, ImageUp, Menu, SquareX } from 'lucide-react';
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
import { IMAGE_NODE_SIZE, TEXT_NODE_SIZE, TEXT_SET_SIZE, ACTION_NODE_SIZE, NODE_SET_SIZE, MEDIA_SET_SIZE, VIDEO_NODE_SIZE, VIDEO_SET_SIZE, NODE_SIZE } from '@/app/workflow/config';
import { NodeSettings } from './node-settings';

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
  const [dontShowAgain, setDontShowAgain] = useState(false); // State for "don't show again" checkbox

  // Settings open state for menu button style
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsClosing, setIsSettingsClosing] = useState(false); // Track closing animation

  const isNodeRunning = data?.status === 'loading';

  const onPlay = useCallback(() => {
    if (isNodeRunning) {
      stopWorkflow();
    } else {
      runWorkflow(id);
    }
  }, [id, runWorkflow, stopWorkflow, isNodeRunning]);

  const handleDeleteClick = useCallback(() => {
    // Check if user has selected "don't show again"
    const skipDialog = localStorage.getItem('node-delete-skip-dialog') === 'true';
    if (skipDialog) {
      // Directly delete without showing dialog
      removeNode(id);
    } else {
      // Show confirmation dialog
      setIsDeleteDialogOpen(true);
    }
  }, [id, removeNode]);

  const handleConfirmDelete = useCallback(() => {
    // Save "don't show again" preference if checked
    if (dontShowAgain) {
      localStorage.setItem('node-delete-skip-dialog', 'true');
    }
    removeNode(id);
    setIsDeleteDialogOpen(false); // Close dialog after deleting
    setDontShowAgain(false); // Reset checkbox state
  }, [removeNode, id, dontShowAgain]);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteDialogOpen(false); // Close dialog on cancel
    setDontShowAgain(false); // Reset checkbox state when canceling
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

  // Determine the minimum size based on node type
  const nodeType = (type || (getNode(id)?.type as AppNodeType)) as AppNodeType;
  
  // Whether this node is a set-type node
  const isSetNode = (() => {
    const t = nodeType as string | undefined;
    return [
      'text-set',
      'image-set',
      'video-set',
      'media-set',
      'node-set',
    ].includes(t || '');
  })();

  // Whether this node is an action-type node
  const isActionNode = (() => {
    const t = nodeType as string | undefined;
    return [
      'text-to-image-node',
      'image-to-image-node',
      // Add more action node types here
    ].includes(t || '');
  })();

  // Whether this node is a frame-type node
  const isFrameNode = (() => {
    const t = nodeType as string | undefined;
    return [
      'image-frame',
      'video-frame',
      'text-frame',
    ].includes(t || '');
  })();
  let minSize = NODE_SIZE;
  if (nodeType === 'media-set') {
    minSize = MEDIA_SET_SIZE;
  } else if (nodeType === 'video-set') {
    minSize = VIDEO_SET_SIZE;
  } else if (nodeType === 'text-set') {
    minSize = TEXT_SET_SIZE;
  } else if (nodeType === 'image-frame' || nodeType === 'image-set') {
    minSize = IMAGE_NODE_SIZE;
  } else if (nodeType === 'video-frame') {
    minSize = VIDEO_NODE_SIZE;
  } else if (nodeType === 'text-frame') {
    minSize = TEXT_NODE_SIZE;
  } else if (nodeType === 'text-to-image-node' || nodeType === 'image-to-image-node') {
    minSize = ACTION_NODE_SIZE;
  } else if (nodeType === 'node-set') {
    minSize = NODE_SET_SIZE;
  }

  const IconComponent = data?.icon ? iconMapping[data.icon] : undefined;

  const containerRef = React.useRef<HTMLDivElement>(null);

  const toggleSettings = useCallback(() => {
    if (isSettingsOpen && !isSettingsClosing) {
      // Closing: trigger exit animation first
      setIsSettingsClosing(true);
      // Wait for animation to complete before actually closing
      setTimeout(() => {
        setIsSettingsOpen(false);
        setIsSettingsClosing(false);
      }, 250); // Slightly longer to ensure animation completes
    } else if (!isSettingsOpen) {
      // Opening: just open
      setIsSettingsOpen(true);
    }
  }, [isSettingsOpen, isSettingsClosing]);

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <NodeStatusIndicator status={data?.status}>
        <NodeResizer
          color="#3b82f6"
          isVisible={selected}
          minWidth={minSize.width}
          minHeight={minSize.height}
        />
        <BaseNode>
        <BaseNodeHeader className="flex-col gap-0 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
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
                <Trash2 className="h-4 w-4 hidden group-hover:block text-red-500" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {/* Help */}
              <Button
                variant="ghost"
                size="icon"
                className="nodrag h-7 w-7 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Help"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              {/* Menu (settings) for set nodes, action nodes, and frame nodes */}
              
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
                onClick={toggleSettings}
              >
                <Menu className="h-4 w-4" />
              </Button>
              
            </div>
          </div>
        </BaseNodeHeader>
        <div className={`bg-gray-50 dark:bg-gray-900 flex flex-col flex-1 min-h-0 overflow-y-auto ${isFrameNode || isSetNode ? 'rounded-b-lg' : ''}`}>
          {children}
        </div>
        </BaseNode>
      </NodeStatusIndicator>

      {/* Settings panel - positioned absolutely to the right of node */}
      {(isSettingsOpen || isSettingsClosing) && (isSetNode || isActionNode || isFrameNode) && (
        <div 
          className={`${isSettingsClosing ? 'settings-panel-exit' : 'settings-panel-enter'} absolute top-0 left-full ml-6 w-[280px] rounded-lg border bg-white shadow-lg dark:bg-gray-900 dark:border-gray-800 z-[10000] nodrag`}
          style={{ pointerEvents: 'auto' }}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800 select-none">
            <div className="text-sm font-normal">Node Settings - {data?.title || 'Untitled'}</div>
            <button
              type="button"
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={toggleSettings}
              title="Close"
            >
              <SquareX className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 h-[260px] overflow-auto space-y-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
            <NodeSettings nodeId={id} nodeType={nodeType} data={data} />
          </div>
        </div>
      )}

      {/* Delete confirmation modal (English) - rendered via portal */}
      {isDeleteDialogOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/50" onClick={handleCancelDelete} />
          <div className="relative z-[100000] w-[320px] rounded-lg border bg-white p-4 shadow-lg dark:bg-gray-900 dark:border-gray-800">
            <div className="text-sm font-semibold mb-2">Delete node?</div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-4">This action cannot be undone.</div>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="dont-show-again"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <label htmlFor="dont-show-again" className="text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                Don't show again
              </label>
            </div>
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
