"use client";

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { Play, Trash, Trash2, Square, RotateCcw, CheckCircle2, XCircle, ChevronDown, ChevronUp, Download, OctagonMinus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { WorkflowNodeData, ApiExecutionError, createNodeByType } from '@/app/workflow/components/nodes';
import { useWorkflowRunner } from '@/app/workflow/hooks/use-workflow-runner';
import { useAppStore } from '@/app/workflow/store';
import { useReactFlow, NodeResizer, getIncomers, useStore } from '@xyflow/react';
import { canExtractMedia, extractMediaFromActionNode } from '@/app/workflow/utils/media-extraction';
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeContent,
} from '@/components/base-node';
import { NodeStatusIndicator } from '@/components/node-status-indicator';
import { ACTION_NODE_SIZE } from '@/app/workflow/config';
import { getExecutionCount } from '@/app/workflow/runners/media-set-utils';
import { iconMapping } from '@/app/workflow/utils/icon-mapping';

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

interface ActionNodeBaseProps {
  id: string;
  data: WorkflowNodeData;
  onRefresh?: () => void;
  children?: React.ReactNode;
  selected?: boolean;
}

function ActionNodeBase({ id, data, onRefresh, children, selected }: ActionNodeBaseProps) {
  const { runWorkflow, stopWorkflow } = useWorkflowRunner();
  const removeNode = useAppStore((s) => s.removeNode);
  const addNode = useAppStore((s) => s.addNode);
  const { setNodes, getNode } = useReactFlow();

  // Determine default model based on node type using getNode
  const currentNode = getNode(id);
  const nodeType = currentNode?.type;
  const defaultModel = (nodeType === 'image-to-image-node' || nodeType === 'image-replicate-node') ? 'qwen' : 'default';

  const [selectedModel, setSelectedModel] = useState<string>(data?.selectedModel || defaultModel);
  const [setOutputMode, setSetOutputMode] = useState<'individual' | 'integrated'>(data?.setOutputMode || 'individual');
  const [executionMode, setExecutionMode] = useState<'concurrent' | 'progressive'>(data?.executionMode || 'concurrent');
  const [prompt, setPrompt] = useState<string>(data?.prompt || '');
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [hasBreakpoint, setHasBreakpoint] = useState<boolean>(data?.hasBreakpoint || false);

  // Subscribe to ReactFlow store for real-time updates
  // This will re-render when nodes or edges change
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);

  // Calculate execution count and check execution mode restrictions
  const { executionCount, shouldShowExecutionCount, isExecutionModeLocked, lockReason } = useMemo(() => {
    const currentNode = nodes.find((n) => n.id === id);

    if (!currentNode) return { executionCount: 0, shouldShowExecutionCount: false, isExecutionModeLocked: false, lockReason: '' };

    // Check if this node has a breakpoint set
    const nodeHasBreakpoint = (currentNode.data as any)?.hasBreakpoint === true;

    // Get all incoming nodes
    const incomingNodes = getIncomers(currentNode, nodes, edges);

    if (incomingNodes.length === 0) {
      // No incoming nodes, but check for breakpoint lock
      if (nodeHasBreakpoint) {
        return {
          executionCount: 0,
          shouldShowExecutionCount: false,
          isExecutionModeLocked: true,
          lockReason: 'Locked to Concurrent: Breakpoint is set'
        };
      }
      return { executionCount: 0, shouldShowExecutionCount: false, isExecutionModeLocked: false, lockReason: '' };
    }

    // Check if all incoming nodes are action nodes
    // Action nodes are registered in the API service registry
    const actionNodeTypes = [
      'text-to-image-node',
      'image-to-image-node',
      'image-replicate-node',
      'image-to-text-node',
      'edit-image-node',
      'text-to-video-node',
      'video-to-video-node'
    ];

    // Count action nodes and other node types upstream
    let actionNodeCount = 0;
    let otherNodeCount = 0;

    incomingNodes.forEach((node) => {
      if (node.type && actionNodeTypes.includes(node.type)) {
        actionNodeCount++;
      } else {
        otherNodeCount++;
      }
    });

    const hasActionNodeUpstream = actionNodeCount > 0;

    // Only show execution count if NO action nodes are upstream
    const shouldShow = !hasActionNodeUpstream;

    // Extract data from incoming nodes
    const inputDataList = incomingNodes.map((node) => node.data);

    // Calculate execution count using utility function
    const count = getExecutionCount(inputDataList);

    // Check if execution mode must be locked to concurrent
    // Lock if:
    // 1. Breakpoint is set, OR
    // 2. Multiple action nodes upstream, OR
    // 3. Action node(s) + other node types upstream
    const mustBeConcurrent =
      nodeHasBreakpoint ||
      (actionNodeCount > 1) ||
      (actionNodeCount >= 1 && otherNodeCount >= 1);

    let reason = '';
    if (mustBeConcurrent) {
      if (nodeHasBreakpoint) {
        reason = 'Locked to Concurrent: Breakpoint is set';
      } else if (actionNodeCount > 1 && otherNodeCount >= 1) {
        reason = `Locked to Concurrent: ${actionNodeCount} action node(s) + ${otherNodeCount} other node(s) upstream`;
      } else if (actionNodeCount > 1) {
        reason = `Locked to Concurrent: ${actionNodeCount} action nodes upstream`;
      } else {
        reason = `Locked to Concurrent: Mixed upstream node types`;
      }
    }

    return {
      executionCount: count,
      shouldShowExecutionCount: shouldShow,
      isExecutionModeLocked: mustBeConcurrent,
      lockReason: reason
    };
  }, [id, nodes, edges]);

  // Determine available models based on node type
  const availableModels = useMemo(() => {
    const currentNode = nodes.find((n) => n.id === id);
    if (!currentNode) return DEFAULT_MODELS;

    const nodeType = currentNode.type;

    // Image-to-image nodes and image-replicate nodes support model selection
    if (nodeType === 'image-to-image-node' || nodeType === 'image-replicate-node') {
      return IMAGE_TO_IMAGE_MODELS;
    }

    // Other node types use default model
    return DEFAULT_MODELS;
  }, [id, nodes]);

  const onPlay = useCallback(() => {
    if (data?.status === 'loading') {
      stopWorkflow();
    } else {
      runWorkflow(id);
    }
  }, [id, runWorkflow, stopWorkflow, data?.status]);
  const onRemove = useCallback(() => removeNode(id), [id, removeNode]);
  const updateNodeData = useCallback((newData: Partial<WorkflowNodeData>) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  }, [id, setNodes]);

  // Ensure selectedModel is saved to node data on mount if not set
  useEffect(() => {
    if (!data?.selectedModel && selectedModel) {
      updateNodeData({ selectedModel });
    }
  }, [data?.selectedModel, selectedModel, updateNodeData]);

  // Auto-enforce concurrent mode when restriction applies
  useEffect(() => {
    if (isExecutionModeLocked && executionMode !== 'concurrent') {
      console.log(`⚠️ Auto-enforcing concurrent mode for action node ${id}: ${lockReason}`);
      setExecutionMode('concurrent');
      updateNodeData({ executionMode: 'concurrent' });
    }
  }, [isExecutionModeLocked, executionMode, id, lockReason, updateNodeData]);

  const handleTitleChange = useCallback((newTitle: string) => {
    updateNodeData({ title: newTitle });
  }, [updateNodeData]);

  const onReset = useCallback(() => {
    setSelectedModel('default');
    setSetOutputMode('individual');
    setExecutionMode('concurrent');
    setPrompt('');
    setShowResponses(false);
    updateNodeData({
      selectedModel: 'default',
      setOutputMode: 'individual',
      executionMode: 'concurrent',
      prompt: '',
      fileName: undefined,
      timestamp: undefined,
      status: 'initial',
      media: undefined,
      apiResponses: undefined,
      executionMetadata: undefined
    });
  }, [updateNodeData]);

  const handleModelChange = useCallback((value: string) => {
    setSelectedModel(value);
    updateNodeData({ selectedModel: value });
  }, [updateNodeData]);

  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value);
    updateNodeData({ prompt: value });
  }, [updateNodeData]);

  const handleSetOutputModeChange = useCallback((value: 'individual' | 'integrated') => {
    setSetOutputMode(value);
    // When switching to integrated, force concurrent execution mode
    if (value === 'integrated' && executionMode === 'progressive') {
      setExecutionMode('concurrent');
      updateNodeData({ setOutputMode: value, executionMode: 'concurrent' });
    } else {
      updateNodeData({ setOutputMode: value });
    }
  }, [updateNodeData, executionMode]);

  const handleExecutionModeChange = useCallback((value: 'concurrent' | 'progressive') => {
    setExecutionMode(value);
    updateNodeData({ executionMode: value });
  }, [updateNodeData]);

  const handleBreakpointToggle = useCallback(() => {
    const newValue = !hasBreakpoint;
    setHasBreakpoint(newValue);

    // If setting breakpoint on action node, force to concurrent mode
    // The lock will be enforced by the useMemo above, but we set it immediately for consistency
    if (newValue && executionMode !== 'concurrent') {
      setExecutionMode('concurrent');
      updateNodeData({ hasBreakpoint: newValue, executionMode: 'concurrent' });
    } else {
      updateNodeData({ hasBreakpoint: newValue });
    }
  }, [hasBreakpoint, executionMode, updateNodeData]);

  // Helper to check if a response is an error
  const isError = (response: any): response is ApiExecutionError => {
    return 'error' in response;
  };

  // Handler to extract media and create a new media-set node
  const handleExtractMedia = useCallback(() => {
    const extractedData = extractMediaFromActionNode(data);

    if (!extractedData) {
      console.warn('No media data to extract from action node');
      return;
    }

    // Get current node position
    const currentNode = getNode(id);
    if (!currentNode) {
      console.warn('Current node not found');
      return;
    }

    // Create a new media-set node positioned to the right of the action node
    const newNodePosition = {
      x: currentNode.position.x + (currentNode.width || ACTION_NODE_SIZE.width) + 100,
      y: currentNode.position.y
    };

    const newMediaSetNode = createNodeByType({
      type: 'media-set',
      position: newNodePosition,
      data: {
        title: `Extracted Media (${extractedData.mediaList.length})`,
        status: 'success',
        media: extractedData,
        setOutputMode: 'integrated'
      }
    });

    // Add the new node
    addNode(newMediaSetNode);

    console.log(`Created new media-set node with ${extractedData.mediaList.length} items`, newMediaSetNode);
  }, [data, id, getNode, addNode]);

  // Check if extraction is available
  const canExtract = canExtractMedia(data);

  // Get icon component
  const IconComponent = data?.icon ? iconMapping[data.icon] : undefined;

  // Check if node is running
  const isNodeRunning = data?.status === 'loading';

  return (
    <NodeStatusIndicator status={data?.status}>
      <NodeResizer
        color="#3b82f6"
        isVisible={selected}
        minWidth={ACTION_NODE_SIZE.width}
        minHeight={ACTION_NODE_SIZE.height}
      />
      <BaseNode style={{ width: '100%', height: '100%', minWidth: 0, overflow: 'visible' }}>
        <BaseNodeHeader className="flex-col gap-0 border-b border-gray-200 dark:border-gray-700 min-w-0">
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
                  {data?.title || 'Action Node'}
                  {shouldShowExecutionCount && executionCount > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      ({executionCount}x)
                    </span>
                  )}
                  {data?.executionMetadata && data.executionMetadata.errorCount > 0 && (
                    <span className="ml-2 text-xs text-red-500 font-normal">
                      ({data.executionMetadata.errorCount} errors)
                    </span>
                  )}
                </BaseNodeHeaderTitle>
              </div>
            </div>
          </div>
          <div className="w-2/3 h-px bg-gray-200 dark:bg-gray-700 ml-1 self-start"></div>
          {/* Second layer: Toolbar buttons */}
          <div className="flex items-center justify-between w-full px-0.5 pt-1 min-h-[10px]" style={{ visibility: isTitleEditing ? 'hidden' : 'visible' }}>
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
                  "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700",
                  !canExtract && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleExtractMedia}
                disabled={!canExtract}
                title={canExtract ? "Extract media to new node" : "Complete execution to extract media"}
              >
                <Download className={`h-4 w-4 ${canExtract ? 'text-green-500' : 'text-gray-400'}`} />
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
                onClick={onReset}
                title="重置节点"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="group nodrag bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 h-7 w-7 transition-colors"
                onClick={onRemove}
                title="Delete"
              >
                <Trash className="h-4 w-4 group-hover:hidden" />
                <Trash2 className="h-4 w-4 hidden group-hover:block" />
              </Button>
            </div>
          </div>
        </BaseNodeHeader>

        <BaseNodeContent className="flex-1 flex flex-col space-y-4 min-w-0 bg-gray-50 dark:bg-gray-900">
          {/* Model Selection - Small expandable box */}
          <div className="flex justify-start flex-shrink-0 nodrag w-full min-w-0">
            <Select value={selectedModel} onValueChange={handleModelChange}>
              <SelectTrigger className="w-1/2 h-9 rounded-full bg-white dark:bg-white">
                <SelectValue placeholder="Select model:" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Output Mode Selection */}
          <div className="flex justify-start flex-shrink-0 nodrag w-full min-w-0">
            <Select value={setOutputMode} onValueChange={handleSetOutputModeChange}>
              <SelectTrigger className="w-full h-9 bg-white dark:bg-white">
                <SelectValue placeholder="Output mode:" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">
                  Individual (Separate outputs)
                </SelectItem>
                <SelectItem value="integrated">
                  Integrated (Combined output)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Execution Mode Selection */}
          <div className="flex flex-col justify-start flex-shrink-0 nodrag space-y-1 w-full min-w-0">
            <Select
              value={executionMode}
              onValueChange={handleExecutionModeChange}
              disabled={setOutputMode === 'integrated' || isExecutionModeLocked}
            >
              <SelectTrigger className="w-full h-9 bg-white dark:bg-white">
                <SelectValue placeholder="Execution mode:" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concurrent">
                  Concurrent (All at once)
                </SelectItem>
                <SelectItem value="progressive" disabled={setOutputMode === 'integrated' || isExecutionModeLocked}>
                  Progressive (One-by-one)
                </SelectItem>
              </SelectContent>
            </Select>
            {isExecutionModeLocked && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight">
                {lockReason}
              </div>
            )}
          </div>

          {/* Large Text Input Area */}
          <div className="flex-1 flex flex-col -mt-4 min-h-0 nodrag w-full min-w-0">
            <textarea
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="Enter your prompt here..."
              className="w-full h-full p-3 border border-input rounded-md bg-white dark:bg-white text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none resize-none min-w-0"
            />
          </div>

          {/* Execution Results Section - Only show if there are responses to display */}
          {data.apiResponses && data.apiResponses.length > 0 && (
            <div className="flex-shrink-0 nodrag border-t pt-3 space-y-2">
              {/* Show/Hide Details Button */}
              <div className="flex items-center justify-end text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowResponses(!showResponses)}
                >
                  {showResponses ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Show Details
                    </>
                  )}
                </Button>
              </div>

              {/* Response Details (Collapsible) */}
              {showResponses && (
                <div className="max-h-32 overflow-y-auto space-y-1.5 text-xs border rounded-md p-2 bg-muted/30">
                  {/* Deduplicate responses by URL for display (progressive mode can cause duplicates in UI) */}
                  {Array.from(new Map(data.apiResponses.map(r => [('url' in r ? r.url : null) || JSON.stringify(r), r])).values()).map((response, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 p-1.5 rounded ${
                        isError(response) ? 'bg-red-50 dark:bg-red-950/20' : 'bg-green-50 dark:bg-green-950/20'
                      }`}
                    >
                      {isError(response) ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-red-700 dark:text-red-300 font-medium">Error {idx + 1}</div>
                            <div className="text-red-600 dark:text-red-400 truncate">{response.error}</div>
                            {response.errorCode && (
                              <div className="text-red-500 dark:text-red-500 text-[10px]">Code: {response.errorCode}</div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-green-700 dark:text-green-300 font-medium">
                              {response.type.charAt(0).toUpperCase() + response.type.slice(1)} {idx + 1}
                            </div>
                            {response.url && (
                              <div className="text-green-600 dark:text-green-400 truncate text-[10px]">
                                {response.url}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </BaseNodeContent>
        {children}
      </BaseNode>
    </NodeStatusIndicator>
  );
}

export default ActionNodeBase;
