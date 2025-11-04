"use client";

import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Trash, Trash2, Square, RotateCcw, CheckCircle2, XCircle, ChevronDown, ChevronUp, Download, OctagonMinus, ImageUp, HelpCircle, Menu, SquareX, List, ArrowRightFromLine, ArrowBigRightDash, GalleryHorizontalEnd, BetweenHorizontalStart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { WorkflowNodeData, ApiExecutionError, createNodeByType, AppNodeType } from '@/app/workflow/components/nodes';
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
import { NodeSettings } from '../workflow-node/node-settings';

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
  const [isImageUpActive, setIsImageUpActive] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsClosing, setIsSettingsClosing] = useState(false); // Track closing animation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // State for delete confirmation dialog
  const [isExtensionCollapsed, setIsExtensionCollapsed] = useState<boolean>(true); // Extension panel collapsed state

  // Progress animation states
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [showCompleteAnimation, setShowCompleteAnimation] = useState(false);
  const microAnimationRef = useRef<NodeJS.Timeout | null>(null);
  const completeAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCompletedCountRef = useRef(0);
  const hasShownCompleteAnimationRef = useRef(false);
  const previousStatusRef = useRef<string | undefined>(data?.status);

  const containerRef = React.useRef<HTMLDivElement>(null);

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

  // Toggle extension panel
  const handleToggleExtension = useCallback(() => {
    setIsExtensionCollapsed(prev => !prev);
  }, []);
  
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

  // Sync state with data when data changes (e.g., from settings panel)
  useEffect(() => {
    const dataOutputMode = data?.setOutputMode || 'individual';
    if (dataOutputMode !== setOutputMode) {
      setSetOutputMode(dataOutputMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.setOutputMode]);

  useEffect(() => {
    const dataExecutionMode = data?.executionMode || 'concurrent';
    if (dataExecutionMode !== executionMode) {
      setExecutionMode(dataExecutionMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.executionMode]);

  useEffect(() => {
    const dataSelectedModel = data?.selectedModel || defaultModel;
    if (dataSelectedModel !== selectedModel) {
      setSelectedModel(dataSelectedModel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.selectedModel]);

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

  const handleImageUpToggle = useCallback(() => {
    setIsImageUpActive((prev) => !prev);
  }, []);

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

  // Calculate progress for status display
  const progressInfo = useMemo(() => {
    const totalExecutions = executionCount || 0;
    if (totalExecutions === 0) {
      return { current: 0, total: 0, percentage: 0 };
    }

    const metadata = data?.executionMetadata;
    const successCount = metadata?.successCount || 0;
    const errorCount = metadata?.errorCount || 0;
    const completedCount = successCount + errorCount;

    // If node is running, current step is completed + 1
    // If node is done, current step equals total
    let currentStep: number;
    if (isNodeRunning) {
      currentStep = completedCount + 1;
    } else if (data?.status === 'success' || data?.status === 'error') {
      currentStep = totalExecutions;
    } else {
      currentStep = completedCount;
    }

    const percentage = totalExecutions > 0 ? (currentStep / totalExecutions) * 100 : 0;
    
    return {
      current: currentStep,
      total: totalExecutions,
      percentage: Math.min(percentage, 100),
      completedCount
    };
  }, [executionCount, data?.status, data?.executionMetadata, isNodeRunning]);

  // Start micro animation for current step (random small increments)
  const startMicroAnimation = useCallback((step: number, total: number) => {
    if (microAnimationRef.current) {
      clearInterval(microAnimationRef.current);
    }

    if (total === 0) return;

    const stepSize = 100 / total;
    const stepStart = step * stepSize;
    const stepEnd = (step + 1) * stepSize;
    const currentEnd = step >= total ? 100 : stepEnd;

    // Animate to the start of current step first
    setAnimatedProgress(stepStart);

    // Then add micro animation with random small increments
    let currentMicro = stepStart;
    const microInterval = setInterval(() => {
      // Random increment between 0.1% and 0.5% of the step size
      const increment = (Math.random() * 0.004 + 0.001) * stepSize;
      currentMicro = Math.min(currentMicro + increment, currentEnd * 0.95); // Don't exceed 95% of step end
      setAnimatedProgress(currentMicro);
    }, 100 + Math.random() * 200); // Random interval between 100-300ms

    microAnimationRef.current = microInterval;
  }, []);

  // Stop micro animation and animate to step completion
  const stopMicroAnimation = useCallback((step: number, total: number, forceSmooth: boolean = false) => {
    if (microAnimationRef.current) {
      clearInterval(microAnimationRef.current);
      microAnimationRef.current = null;
    }

    if (total === 0) return;

    const stepSize = 100 / total;
    const stepEnd = (step + 1) * stepSize;
    const targetProgress = step >= total ? 100 : stepEnd;
    
    // If forceSmooth is true, use setTimeout to ensure CSS transition works
    // This is important when status changes to success
    if (forceSmooth) {
      setTimeout(() => {
        setAnimatedProgress(targetProgress);
      }, 0);
    } else {
      setAnimatedProgress(targetProgress);
    }
  }, []);

  // Animate progress based on execution state
  useEffect(() => {
    const total = progressInfo.total;
    const completed = progressInfo.completedCount || 0;
    const currentStep = progressInfo.current;
    const currentStatus = data?.status;
    const previousStatus = previousStatusRef.current;
    
    // Detect status change from loading to success
    const statusChangedToSuccess = previousStatus === 'loading' && currentStatus === 'success';
    
    // Update previous status ref
    previousStatusRef.current = currentStatus;
    
    if (total === 0) {
      setAnimatedProgress(0);
      setShowCompleteAnimation(false);
      hasShownCompleteAnimationRef.current = false;
      lastCompletedCountRef.current = 0;
      if (microAnimationRef.current) {
        clearInterval(microAnimationRef.current);
        microAnimationRef.current = null;
      }
      return;
    }

    const stepSize = 100 / total;
    
    // Check if a new execution completed or node just started running
    const newCompletion = completed > lastCompletedCountRef.current;
    const justStarted = isNodeRunning && lastCompletedCountRef.current === 0 && completed === 0;
    
    if (newCompletion) {
      const previousCompleted = lastCompletedCountRef.current;
      lastCompletedCountRef.current = completed;
      
      // Stop micro animation for previous step and animate to completion
      if (previousCompleted >= 0) {
        stopMicroAnimation(previousCompleted, total);
      }
      
      // Start micro animation for current step if still running
      if (isNodeRunning && currentStep <= total && currentStep > 0) {
        setTimeout(() => {
          startMicroAnimation(currentStep - 1, total);
        }, 100);
      }
    }

    // Calculate target progress
    let targetProgress: number;
    
    // If not running and status is initial, show 0% progress
    if (!isNodeRunning && data?.status === 'initial') {
      targetProgress = 0;
    } else if (total === 1) {
      // Single execution: use 50% logic
      if (isNodeRunning) {
        targetProgress = 50;
        // Start micro animation if not already running (on first run or after reset)
        if (!microAnimationRef.current && (justStarted || completed === 0)) {
          startMicroAnimation(0, total);
        }
      } else {
        // Only show 100% if status is success
        targetProgress = data?.status === 'success' ? 100 : completed * stepSize;
        // Stop micro animation first to ensure smooth transition
        if (microAnimationRef.current) {
          stopMicroAnimation(0, total, statusChangedToSuccess);
        }
        // If status just changed to success, ensure smooth transition from current progress to 100%
        if (statusChangedToSuccess && !microAnimationRef.current) {
          // Don't set progress immediately, let CSS transition handle it
          // The stopMicroAnimation above or the update below will handle it
        }
        // Wait for the progress bar to animate to 100% before showing green animation
        if (!hasShownCompleteAnimationRef.current && data?.status === 'success') {
          if (completeAnimationTimeoutRef.current) {
            clearTimeout(completeAnimationTimeoutRef.current);
          }
          // Use a longer delay to ensure the progress animation completes (700ms transition + buffer)
          const delay = statusChangedToSuccess ? 800 : 800;
          completeAnimationTimeoutRef.current = setTimeout(() => {
            if (!hasShownCompleteAnimationRef.current) {
              hasShownCompleteAnimationRef.current = true;
              setShowCompleteAnimation(true);
            }
            completeAnimationTimeoutRef.current = null;
          }, delay);
        }
      }
    } else {
      // Multiple executions: use original logic with micro animations
      if (isNodeRunning) {
        // Currently processing: show progress to 50% of current step
        const currentStepStart = completed * stepSize;
        const currentStepMid = currentStepStart + stepSize * 0.5;
        targetProgress = currentStepMid;
        
        // Start micro animation if not already running (on first run or when starting new step)
        if (!microAnimationRef.current && currentStep > 0 && completed < total) {
          // Small delay to ensure smooth transition from previous step
          const delay = (newCompletion || justStarted) ? 100 : 0;
          setTimeout(() => {
            startMicroAnimation(currentStep - 1, total);
          }, delay);
        }
      } else {
        // Only show 100% if status is success, otherwise show progress based on completed
        targetProgress = data?.status === 'success' ? 100 : completed * stepSize;
        // Stop micro animation first to ensure smooth transition
        if (microAnimationRef.current) {
          stopMicroAnimation(completed - 1, total, statusChangedToSuccess);
        }
        // If status just changed to success, ensure smooth transition from current progress to 100%
        if (statusChangedToSuccess && !microAnimationRef.current) {
          // Don't set progress immediately, let CSS transition handle it
          // The stopMicroAnimation above or the update below will handle it
        }
        // Wait for the progress bar to animate to 100% before showing green animation
        if (!hasShownCompleteAnimationRef.current && data?.status === 'success') {
          if (completeAnimationTimeoutRef.current) {
            clearTimeout(completeAnimationTimeoutRef.current);
          }
          // Use a longer delay to ensure the progress animation completes (700ms transition + buffer)
          const delay = statusChangedToSuccess ? 800 : 800;
          completeAnimationTimeoutRef.current = setTimeout(() => {
            if (!hasShownCompleteAnimationRef.current) {
              hasShownCompleteAnimationRef.current = true;
              setShowCompleteAnimation(true);
            }
            completeAnimationTimeoutRef.current = null;
          }, delay);
        }
      }
    }

    // Update animated progress if not using micro animation
    // When micro animation stops, it already sets the progress, so we only update if:
    // 1. No micro animation was running (normal case)
    // 2. We need to ensure smooth transition to 100% on completion
    if (!microAnimationRef.current) {
      // If status just changed to success, we need to ensure smooth transition
      // from current animatedProgress value to 100%
      if (statusChangedToSuccess && targetProgress === 100) {
        // Get current animated progress value
        // Use a small delay to ensure the DOM has updated and CSS transition can work
        setTimeout(() => {
          setAnimatedProgress(100);
        }, 0);
      } else {
        // Always update to target progress when micro animation is not running
        // This ensures smooth transitions in all cases
        setAnimatedProgress(targetProgress);
      }
    } else if (!isNodeRunning && data?.status === 'success' && targetProgress === 100) {
      // Special case: if node just completed and micro animation is still running,
      // stop it first and let it handle the transition to 100%
      // The stopMicroAnimation call above will handle this
    }
  }, [progressInfo, isNodeRunning, data?.status, startMicroAnimation, stopMicroAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (microAnimationRef.current) {
        clearInterval(microAnimationRef.current);
        microAnimationRef.current = null;
      }
      if (completeAnimationTimeoutRef.current) {
        clearTimeout(completeAnimationTimeoutRef.current);
        completeAnimationTimeoutRef.current = null;
      }
    };
  }, []);

  // Reset animation states when status changes to initial
  useEffect(() => {
    if (data?.status === 'initial') {
      setAnimatedProgress(0);
      setShowCompleteAnimation(false);
      hasShownCompleteAnimationRef.current = false;
      lastCompletedCountRef.current = 0;
      previousStatusRef.current = data?.status;
      if (microAnimationRef.current) {
        clearInterval(microAnimationRef.current);
        microAnimationRef.current = null;
      }
      if (completeAnimationTimeoutRef.current) {
        clearTimeout(completeAnimationTimeoutRef.current);
        completeAnimationTimeoutRef.current = null;
      }
    }
  }, [data?.status]);

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <NodeStatusIndicator status={data?.status}>
      <NodeResizer
        color="#3b82f6"
        isVisible={selected}
        minWidth={ACTION_NODE_SIZE.width}
        minHeight={ACTION_NODE_SIZE.height}
      />
      <BaseNode>
        <BaseNodeHeader className="flex-col gap-0 border-b border-gray-200 dark:border-gray-700 min-w-0 flex-shrink-0">
          {/* First layer: Icon, Node Name, Model Selection */}
          <div className="flex items-center justify-between w-full px-0.5 pt-0 pb-0.5 min-h-[28px]">
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
            {/* Model Selection */}
            <div className="nodrag flex-shrink-0 ml-2">
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger className="!h-5 w-26 !py-0 !px-2 rounded-sm bg-gray-200 dark:bg-gray-700 border-0 shadow-sm text-[10px] [&>svg:last-child]:hidden">
                  <span className="flex-1 text-left">{selectedModel || 'Model'}</span>
                  <List className="w-1.5 h-1.5 opacity-50 flex-shrink-0" />
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
          </div>
          <div className="w-3/5 h-px bg-gray-200 dark:bg-gray-700 ml-1 self-start"></div>
          {/* Second layer: Toolbar buttons */}
          <div className="flex items-center justify-between w-full px-0.5 pt-1 min-h-[10px]" style={{ visibility: isTitleEditing ? 'hidden' : 'visible' }}>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative inline-block">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "nodrag h-7 w-7 transition-colors relative z-10",
                    "bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                  onClick={onPlay}
                  title={isNodeRunning ? "Stop node execution" : "Run node"}
                >
                  {isNodeRunning ? (
                    <Square className="h-4 w-4 text-green-500" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                {/* Rotating green border animation when running */}
                {isNodeRunning && (
                  <div className="run-icon-border-animation" />
                )}
              </div>
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
                onClick={onReset}
                title="重置节点"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
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
                className="nodrag h-7 w-7 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Help"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              {/* Menu (settings) */}
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

        <BaseNodeContent className="flex-1 flex flex-col space-y-4 min-w-0 min-h-0 bg-gray-50 dark:bg-gray-900 rounded-b-lg border-b border-gray-200 dark:border-gray-700 shadow-sm overflow-y-auto">
          {/* Output and Input Mode Selection - In one row */}
          <div className="flex items-start gap-4 flex-shrink-0 nodrag w-full min-w-0">
            {/* Execution Mode Selection - Icon Slider */}
            <div className="flex flex-col justify-start flex-1 min-w-0">
              <div className="text-[10px] text-muted-foreground mb-1">Execution Mode</div>
              <div className={cn(
                "relative flex w-[84px] items-center rounded-md border p-1 box-border overflow-hidden bg-white dark:bg-gray-800",
                (setOutputMode === 'integrated' || isExecutionModeLocked) && "opacity-50 cursor-not-allowed"
              )}>
                <div className={`icon-slider-track ${executionMode === 'concurrent' ? 'left' : 'right'}`} />
                <button
                  type="button"
                  className={`relative z-10 flex-1 flex items-center justify-center h-7 w-7 rounded-md nodrag ${executionMode === 'concurrent' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
                  title="All at once"
                  onClick={() => !(setOutputMode === 'integrated' || isExecutionModeLocked) && handleExecutionModeChange('concurrent')}
                  disabled={setOutputMode === 'integrated' || isExecutionModeLocked}
                >
                  <GalleryHorizontalEnd className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={`relative z-10 flex-1 flex items-center justify-center h-7 w-7 rounded-md nodrag ${executionMode === 'progressive' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
                  title="One-by-one"
                  onClick={() => !(setOutputMode === 'integrated' || isExecutionModeLocked) && handleExecutionModeChange('progressive')}
                  disabled={setOutputMode === 'integrated' || isExecutionModeLocked}
                >
                  <BetweenHorizontalStart className="h-3.5 w-3.5" />
                </button>
              </div>
              {isExecutionModeLocked && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight mt-1">
                  {lockReason}
                </div>
              )}
            </div>

            {/* Output Mode Selection - Icon Slider */}
            <div className="flex flex-col justify-start flex-1 min-w-0">
              <div className="text-[10px] text-muted-foreground mb-1">Output</div>
              <div className="relative flex w-[84px] items-center rounded-md border p-1 box-border overflow-hidden bg-white dark:bg-gray-800">
                <div className={`icon-slider-track ${setOutputMode === 'individual' ? 'left' : 'right'}`} />
                <button
                  type="button"
                  className={`relative z-10 flex-1 flex items-center justify-center h-7 w-7 rounded-md nodrag ${setOutputMode === 'individual' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
                  title="Separate outputs"
                  onClick={() => handleSetOutputModeChange('individual')}
                >
                  <ArrowRightFromLine className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={`relative z-10 flex-1 flex items-center justify-center h-7 w-7 rounded-md nodrag ${setOutputMode === 'integrated' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
                  title="Combined output"
                  onClick={() => handleSetOutputModeChange('integrated')}
                >
                  <ArrowBigRightDash className="h-4 w-4" />
                </button>
              </div>
            </div>
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

        {/* Extension Panel - Collapsible */}
        <div className="flex-shrink-0 nodrag w-full">
          {/* Content Area - White background with rounded bottom corners */}
          <div className="bg-white dark:bg-white rounded-b-lg">
            {/* Header - Always visible, one line when collapsed */}
            <div className="w-full flex items-center justify-between px-3 py-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Status</span>
              <button
                type="button"
                onClick={handleToggleExtension}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                {isExtensionCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>

            {/* Content - Collapsible with slide animation */}
            <div className={`extension-panel-content ${isExtensionCollapsed ? 'collapsed' : 'expanded'}`}>
              <div className="px-3 pb-3">
                {progressInfo.total > 0 ? (
                  <div className="space-y-2">
                    {/* Progress text */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        Progress
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {progressInfo.current} / {progressInfo.total}
                      </span>
                    </div>
                    {/* Progress bar with smooth animation */}
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full progress-bar-container">
                      <div
                        className={`h-full bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 dark:from-gray-600 dark:via-gray-500 dark:to-gray-600 relative progress-bar-fill ${animatedProgress >= 100 ? 'rounded-full' : 'rounded-l-full rounded-r-full'}`}
                        style={{ 
                          width: `${animatedProgress}%`,
                          transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        {/* Shimmer effect - only show when progressing */}
                        {isNodeRunning && animatedProgress > 0 && animatedProgress < 100 && (
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent progress-bar-shimmer rounded-l-full rounded-r-full"
                          />
                        )}
                      </div>
                      {/* Completion animation - green sweep from left to right */}
                      {showCompleteAnimation && animatedProgress >= 100 && data?.status === 'success' && (
                        <div 
                          className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 dark:from-green-500 dark:to-green-400 progress-bar-complete rounded-full"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    No execution data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {children}
      </BaseNode>
      </NodeStatusIndicator>

      {/* Settings panel - positioned absolutely to the right of node */}
      {(isSettingsOpen || isSettingsClosing) && (
        <div 
          className={`${isSettingsClosing ? 'settings-panel-exit' : 'settings-panel-enter'} absolute top-0 left-full ml-6 min-w-[280px] max-w-[400px] rounded-lg border bg-white shadow-lg dark:bg-gray-900 dark:border-gray-800 z-[10000] nodrag`}
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
          <div className="p-4 max-h-[500px] overflow-auto space-y-4 bg-gray-50 dark:bg-gray-900">
            <NodeSettings nodeId={id} nodeType={nodeType as AppNodeType} data={data} />
          </div>
        </div>
      )}

      {/* Delete confirmation modal - rendered via portal */}
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

export default ActionNodeBase;
