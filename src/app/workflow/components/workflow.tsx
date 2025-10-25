'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
  Background,
  ReactFlow,
  ConnectionLineType,
  ColorMode,
  MarkerType,
  OnConnect,
  OnNodeDrag,
  OnNodesDelete,
  OnEdgesDelete,
  SelectionDragHandler,
  useStoreApi,
  useReactFlow,
  MiniMap,
  useOnSelectionChange,
} from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import { useTheme } from 'next-themes';
import { MousePointer2, Hand, Play, Pause, Trash2, Divide } from 'lucide-react';
import { useCopilotReadable } from '@copilotkit/react-core';

import { nodeTypes } from '@/app/workflow/components/nodes';
import { useAppStore } from '@/app/workflow/store';
import { WorkflowControls } from './controls';
import FlowContextMenu from '@/app/workflow/components/flow-context-menu';
import { AppStore } from '@/app/workflow/store/app-store';
import { useDragAndDrop } from '@/app/workflow/hooks/useDragAndDrop';
import { DebugPanel } from './debug-panel';
import { useCopyPaste } from '@/app/workflow/hooks/useCopyPaste';
import { useUndoRedo } from '@/app/workflow/hooks/useUndoRedo';
import { useWorkflowRunner } from '@/app/workflow/hooks/use-workflow-runner';
import { Button } from '@/components/ui/button';
import { nodesConfig } from '@/app/workflow/config';
import { useCopilotWorkflowActions } from '@/app/workflow/hooks/useCopilotWorkflowActions';
import { useLayout } from '@/app/workflow/hooks/use-layout';
import { registerAllServices } from '@/app/api/services/service-registrar';
import { useToast } from '@/components/toast-provider';

const MIN_DISTANCE = 150;

const defaultEdgeOptions = {
  type: 'default',
  markerEnd: {
    type: MarkerType.Arrow,
  },
};

const selector = (state: AppStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  onNodeDragStart: state.onNodeDragStart,
  onNodeDragStop: state.onNodeDragStop,
  setEdges: state.setEdges,
  getEdges: state.getEdges,
  setNodes: state.setNodes,
  getNodes: state.getNodes,
  addNodeByType: state.addNodeByType,
  removeNode: state.removeNode,
});

export default function Workflow() {
  const store = useAppStore(useShallow(selector));
  const { onDragOver, onDrop } = useDragAndDrop();
  const { theme } = useTheme();
  const reactFlowStore = useStoreApi();
  const { getInternalNode, fitView } = useReactFlow();
  const [isSelectMode, setIsSelectMode] = useState(true);
  const { runWorkflow, stopWorkflow, isRunning } = useWorkflowRunner();
  const [selectedNodes, setSelectedNodes] = useState<any[]>([]);
  const runLayout = useLayout();
  const { showToast } = useToast();

  // Register all API services on client side
  useEffect(() => {
    registerAllServices();
  }, []);

  // Initialize undo/redo functionality
  const { takeSnapshot } = useUndoRedo();

  // Initialize copy/paste functionality for nodes with undo/redo support
  useCopyPaste(takeSnapshot);

  // Track selected nodes
  useOnSelectionChange({
    onChange: useCallback(({ nodes }) => {
      setSelectedNodes(nodes);
    }, []),
  });

  // Make workflow state readable for CopilotKit
  useCopilotReadable({
    description: 'The current workflow nodes in the canvas',
    value: store.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        title: node.data.title,
        status: node.data.status,
        icon: node.data.icon,
        ...('prompt' in node.data && { prompt: node.data.prompt }),
        ...('selectedModel' in node.data && { selectedModel: node.data.selectedModel }),
        ...('fileName' in node.data && { fileName: node.data.fileName }),
        ...('timestamp' in node.data && { timestamp: node.data.timestamp }),
        ...('media' in node.data && {
          hasImages: node.data.media?.imageList && node.data.media.imageList.length > 0,
          imageCount: node.data.media?.imageList?.length || 0,
          hasVideos: node.data.media?.videoList && node.data.media.videoList.length > 0,
          videoCount: node.data.media?.videoList?.length || 0,
        }),
      },
    })),
  });

  useCopilotReadable({
    description: 'The connections (edges) between workflow nodes',
    value: store.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      animated: edge.animated,
    })),
  });

  useCopilotReadable({
    description: 'Available node types and their configurations',
    value: Object.entries(nodesConfig).map(([type, config]) => ({
      type,
      title: config.title,
      icon: config.icon,
      defaultStatus: config.status,
      handles: config.handles.map(handle => ({
        type: handle.type,
        position: handle.position,
      })),
    })),
  });

  useCopilotReadable({
    description: 'Current workflow execution state. IMPORTANT: When adding a single node with addNode, do NOT automatically call connectNodes unless explicitly requested by the user.',
    value: {
      isRunning,
      isSelectMode,
      nodeCount: store.nodes.length,
      edgeCount: store.edges.length,
    },
  });

  useCopilotReadable({
    description: 'Currently selected nodes in the workflow',
    value: selectedNodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        title: node.data.title,
        status: node.data.status,
        icon: node.data.icon,
        prompt: node.data.prompt,
        selectedModel: node.data.selectedModel,
        fileName: node.data.fileName,
        timestamp: node.data.timestamp,
        hasImages: node.data.media?.imageList && node.data.media.imageList.length > 0,
        imageCount: node.data.media?.imageList?.length || 0,
        hasVideos: node.data.media?.videoList && node.data.media.videoList.length > 0,
        videoCount: node.data.media?.videoList?.length || 0,
      },
    })),
  });

  const handleClearCanvas = useCallback(() => {
    takeSnapshot();
    store.setNodes([]);
    store.setEdges([]);
  }, [takeSnapshot, store]);

  // Register Copilot actions for workflow manipulation
  useCopilotWorkflowActions({
    store: {
      nodes: store.nodes,
      edges: store.edges,
      addNodeByType: store.addNodeByType,
      removeNode: store.removeNode,
      onConnect: store.onConnect,
      setNodes: store.setNodes,
      getNodes: store.getNodes,
      setEdges: store.setEdges,
      getEdges: store.getEdges,
    },
    selectedNodes,
    takeSnapshot,
    handleClearCanvas,
    runWorkflow,
    stopWorkflow,
    isRunning,
    runLayout,
    fitView,
  });

  const handleRunWorkflow = useCallback(() => {
    if (isRunning) {
      stopWorkflow();
    } else {
      runWorkflow();
    }
  }, [isRunning, stopWorkflow, runWorkflow]);

  // Proximity connect logic
  const getClosestEdge = useCallback((node: any) => {
    const { nodeLookup } = reactFlowStore.getState();
    const internalNode = getInternalNode(node.id);

    if (!internalNode) return null;

    const closestNode = Array.from(nodeLookup.values()).reduce(
      (res, n) => {
        if (n.id !== internalNode.id) {
          const dx =
            n.internals.positionAbsolute.x -
            internalNode.internals.positionAbsolute.x;
          const dy =
            n.internals.positionAbsolute.y -
            internalNode.internals.positionAbsolute.y;
          const d = Math.sqrt(dx * dx + dy * dy);

          if (d < res.distance && d < MIN_DISTANCE) {
            res.distance = d;
            res.node = n;
          }
        }

        return res;
      },
      {
        distance: Number.MAX_VALUE,
        node: null as any,
      },
    );

    if (!closestNode.node) {
      return null;
    }

    const closeNodeIsSource =
      closestNode.node.internals.positionAbsolute.x <
      internalNode.internals.positionAbsolute.x;

    return {
      id: closeNodeIsSource
        ? `${closestNode.node.id}-${node.id}`
        : `${node.id}-${closestNode.node.id}`,
      source: closeNodeIsSource ? closestNode.node.id : node.id,
      target: closeNodeIsSource ? node.id : closestNode.node.id,
      className: 'temp',
    };
  }, [reactFlowStore, getInternalNode]);

  // Validate connection before allowing it
  const isValidConnection = useCallback((connection: any) => {
    const sourceNode = store.getNodes().find(n => n.id === connection.source);
    const targetNode = store.getNodes().find(n => n.id === connection.target);

    if (!sourceNode || !targetNode) return false;

    // Validation: ONLY MediaSet (not image-set, video-set, text-set) with mixed media types
    // connecting to NodeSet in cross/sequence mode requires integrated mode
    if (sourceNode.type === 'media-set' && targetNode.type === 'node-set') {
      const media = sourceNode.data?.media;
      const setOutputMode = sourceNode.data?.setOutputMode || 'integrated'; // media-set defaults to integrated
      const targetInputMode = (targetNode.data as any)?.inputMode || 'sequence';

      // ONLY check if MediaSet has MIXED media types (multiple types)
      if (media?.mediaList && media.mediaList.length > 0) {
        const mediaTypes = new Set(media.mediaList.map((item: any) => item.type));
        const isMixedMediaSet = mediaTypes.size > 1; // More than one type = mixed

        // ONLY if mixed types AND cross/sequence mode AND not integrated -> reject
        if (isMixedMediaSet && (targetInputMode === 'cross' || targetInputMode === 'sequence') && setOutputMode !== 'integrated') {
          showToast({
            title: 'Connection Not Allowed',
            description: 'MediaSet with mixed media types (e.g., images + videos) must be in "Integrated" output mode when connecting to NodeSet in Cross or Sequence mode for type safety',
            variant: 'error',
          });
          return false;
        }
      }
    }

    // Validation: MediaSet (not other set types) can only connect to Action Nodes in integrated mode
    const actionNodeTypes = ['text-to-image-node', 'image-to-image-node', 'image-to-text-node', 'edit-image-node'];
    if (sourceNode.type === 'media-set' && actionNodeTypes.includes(targetNode.type)) {
      const setOutputMode = sourceNode.data?.setOutputMode || 'integrated'; // media-set defaults to integrated
      if (setOutputMode !== 'integrated') {
        showToast({
          title: 'Connection Not Allowed',
          description: 'MediaSet must be in "Integrated" output mode to connect to Action Nodes',
          variant: 'error',
        });
        return false;
      }
    }

    // Image-set, video-set, text-set can connect with any output mode - no restrictions!
    return true;
  }, [store, showToast]);

  // Wrap event handlers with takeSnapshot for undo/redo
  const handleConnect: OnConnect = useCallback(
    (connection) => {
      takeSnapshot();
      store.onConnect(connection, (reason) => {
        // Show toast on connection rejection
        showToast({
          title: 'Connection Rejected',
          description: reason,
          variant: 'error',
        });
      });

      // After connection is established, validate action node execution mode restrictions
      // Use setTimeout to ensure the edge is added before validation
      setTimeout(() => {
        const targetNode = store.getNodes().find(n => n.id === connection.target);
        if (targetNode) {
          const actionNodeTypes = ['text-to-image-node', 'image-to-image-node', 'image-to-text-node', 'edit-image-node'];
          if (actionNodeTypes.includes(targetNode.type)) {
            // Validate the target action node
            const edges = store.getEdges();
            const upstreamEdges = edges.filter(e => e.target === targetNode.id);

            let actionNodeCount = 0;
            let otherNodeCount = 0;

            for (const edge of upstreamEdges) {
              const upstreamNode = store.getNodes().find(n => n.id === edge.source);
              if (!upstreamNode) continue;

              if (actionNodeTypes.includes(upstreamNode.type)) {
                actionNodeCount++;
              } else {
                otherNodeCount++;
              }
            }

            // Check if restriction applies
            const mustBeConcurrent =
              (actionNodeCount > 1) ||
              (actionNodeCount >= 1 && otherNodeCount >= 1);

            if (mustBeConcurrent) {
              const currentMode = (targetNode.data as any)?.executionMode;
              if (currentMode !== 'concurrent') {
                console.log(`⚠️ RESTRICTION: Action node ${targetNode.id} is being forced to concurrent mode`);
                console.log(`   Upstream: ${actionNodeCount} action node(s) + ${otherNodeCount} other node(s)`);

                // Force the node to concurrent mode
                const updatedNodes = store.getNodes().map(n =>
                  n.id === targetNode.id
                    ? { ...n, data: { ...n.data, executionMode: 'concurrent' } }
                    : n
                );
                store.setNodes(updatedNodes);

                showToast({
                  title: "Execution Mode Restriction",
                  description: `${targetNode.data.title} has been locked to Concurrent mode due to multiple upstream action nodes or mixed upstream node types.`,
                  variant: "default"
                });
              }
            }
          }
        }
      }, 50);
    },
    [takeSnapshot, store, showToast],
  );

  const handleNodeDrag = useCallback<OnNodeDrag>(
    (_event, node) => {
      const closeEdge = getClosestEdge(node);
      const currentEdges = store.getEdges();
      const nextEdges = currentEdges.filter((e: any) => e.className !== 'temp');

      if (
        closeEdge &&
        !nextEdges.find(
          (ne) =>
            ne.source === closeEdge.source && ne.target === closeEdge.target,
        )
      ) {
        nextEdges.push(closeEdge as any);
      }

      store.setEdges(nextEdges);
    },
    [getClosestEdge, store],
  );

  const handleNodeDragStart = useCallback<OnNodeDrag>(
    (event, node, nodes) => {
      takeSnapshot();
      store.onNodeDragStart(event, node as any, nodes as any);
    },
    [takeSnapshot, store.onNodeDragStart],
  );

  const handleSelectionDragStart: SelectionDragHandler = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const handleNodesDelete: OnNodesDelete = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const handleEdgesDelete: OnEdgesDelete = useCallback((deletedEdges) => {
    takeSnapshot();

    // After edge deletion, re-validate action nodes that might have been affected
    // Use setTimeout to ensure the edge is removed before validation
    setTimeout(() => {
      const actionNodeTypes = ['text-to-image-node', 'image-to-image-node', 'image-to-text-node', 'edit-image-node'];
      const affectedNodeIds = new Set<string>();

      // Collect all target nodes from deleted edges
      deletedEdges.forEach(edge => {
        affectedNodeIds.add(edge.target);
      });

      // Re-validate each affected action node
      affectedNodeIds.forEach(nodeId => {
        const targetNode = store.getNodes().find(n => n.id === nodeId);
        if (targetNode && actionNodeTypes.includes(targetNode.type)) {
          const edges = store.getEdges();
          const upstreamEdges = edges.filter(e => e.target === targetNode.id);

          let actionNodeCount = 0;
          let otherNodeCount = 0;

          for (const edge of upstreamEdges) {
            const upstreamNode = store.getNodes().find(n => n.id === edge.source);
            if (!upstreamNode) continue;

            if (actionNodeTypes.includes(upstreamNode.type)) {
              actionNodeCount++;
            } else {
              otherNodeCount++;
            }
          }

          // Check if restriction no longer applies
          const mustBeConcurrent =
            (actionNodeCount > 1) ||
            (actionNodeCount >= 1 && otherNodeCount >= 1);

          if (!mustBeConcurrent) {
            console.log(`✅ Action node ${targetNode.id} can now be switched to any execution mode`);
            console.log(`   Upstream: ${actionNodeCount} action node(s) + ${otherNodeCount} other node(s)`);
          }
        }
      });
    }, 50);
  }, [takeSnapshot, store]);

  const handleNodeDragStop = useCallback<OnNodeDrag>(
    (event, node, nodes) => {
      // Skip proximity auto-connect for programmatically added nodes
      if ((node as any).data?.programmaticallyAdded) {
        // Clear the flag after first drag stop
        const updatedNodes = store.getNodes().map(n =>
          n.id === node.id ? { ...n, data: { ...n.data, programmaticallyAdded: false } } : n
        );
        store.setNodes(updatedNodes);
        store.onNodeDragStop(event, node as any, nodes as any);
        return;
      }

      const closeEdge = getClosestEdge(node);
      const currentEdges = store.getEdges();
      const nextEdges = currentEdges.filter((e: any) => e.className !== 'temp');

      if (
        closeEdge &&
        !nextEdges.find(
          (ne) =>
            ne.source === closeEdge.source && ne.target === closeEdge.target,
        )
      ) {
        // Remove className to make it permanent
        const { className, ...permanentEdge } = closeEdge;
        nextEdges.push(permanentEdge as any);
      }

      store.setEdges(nextEdges);
      store.onNodeDragStop(event, node as any, nodes as any);
    },
    [getClosestEdge, store],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      takeSnapshot();
      onDrop(event);
    },
    [takeSnapshot, onDrop],
  );

  return (
    <>
      <ReactFlow
        nodes={store.nodes}
        edges={store.edges}
        onNodesChange={store.onNodesChange}
        onEdgesChange={store.onEdgesChange}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        connectionLineType={ConnectionLineType.SmoothStep}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={handleDrop}
        onNodeDrag={handleNodeDrag}
        onNodeDragStart={handleNodeDragStart}
        onSelectionDragStart={handleSelectionDragStart}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onNodeDragStop={handleNodeDragStop}
        colorMode={theme as ColorMode}
        defaultEdgeOptions={defaultEdgeOptions}
        panOnDrag={isSelectMode ? [1, 2] : true}
        selectionOnDrag={isSelectMode}
        panOnScroll
        selectionKeyCode={isSelectMode ? null : 'Shift'}
        multiSelectionKeyCode="Shift"
        fitView
      >
        <Background />
        <WorkflowControls />
        <FlowContextMenu />
        {/* <DebugPanel /> */}
        <MiniMap  />
      </ReactFlow>

      {/* Floating Mode Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-card border border-border rounded-lg shadow-md p-1.5">
        {/* Mode Toggle Group with Sliding Background */}
        <div className="relative flex items-center gap-1 rounded-md p-1">
          {/* Sliding Background */}
          <div
            className="absolute inset-y-1 w-9 bg-primary dark:bg-accent border border-border rounded-md transition-all duration-300 ease-in-out shadow-sm"
            style={{
              transform: isSelectMode ? 'translateX(0)' : 'translateX(2.5rem)',
            }}
          />

          <Button
            onClick={() => setIsSelectMode(true)}
            variant="ghost"
            size="icon"
            className={`relative z-10 h-9 w-9 transition-colors duration-200 ${
              isSelectMode
                ? 'text-primary-foreground dark:text-foreground hover:text-primary-foreground dark:hover:text-foreground hover:bg-transparent'
                : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
            }`}
            title="Select Mode (Shift to pan)"
          >
            <MousePointer2 className="h-5 w-5" />
          </Button>
          <Button
            onClick={() => setIsSelectMode(false)}
            variant="ghost"
            size="icon"
            className={`relative z-10 h-9 w-9 transition-colors duration-200 ${
              !isSelectMode
                ? 'text-primary-foreground dark:text-foreground hover:text-primary-foreground dark:hover:text-foreground hover:bg-transparent'
                : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
            }`}
            title="Pan Mode (Shift to select)"
          >
            <Hand className="h-5 w-5" />
          </Button>
        </div>

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

        <Button
          onClick={handleRunWorkflow}
          variant="ghost"
          size="icon"
          title={isRunning ? 'Stop Workflow' : 'Run Workflow'}
        >
          {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>

        <Button
          onClick={handleClearCanvas}
          variant="ghost"
          size="icon"
          title="Clear Canvas"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
    </>
  );
}
