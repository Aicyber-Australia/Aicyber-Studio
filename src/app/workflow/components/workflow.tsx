'use client';

import React, { useCallback, useState } from 'react';
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
} from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import { useTheme } from 'next-themes';
import { MousePointer2, Hand, Play, Pause, Trash2, Divide } from 'lucide-react';

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
});

export default function Workflow() {
  const store = useAppStore(useShallow(selector));
  const { onDragOver, onDrop } = useDragAndDrop();
  const { theme } = useTheme();
  const reactFlowStore = useStoreApi();
  const { getInternalNode } = useReactFlow();
  const [isSelectMode, setIsSelectMode] = useState(true);
  const { runWorkflow, stopWorkflow, isRunning } = useWorkflowRunner();

  // Initialize undo/redo functionality
  const { takeSnapshot } = useUndoRedo();

  // Initialize copy/paste functionality for nodes with undo/redo support
  useCopyPaste(takeSnapshot);

  const handleClearCanvas = useCallback(() => {
    takeSnapshot();
    store.setNodes([]);
    store.setEdges([]);
  }, [takeSnapshot, store]);

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

  // Wrap event handlers with takeSnapshot for undo/redo
  const handleConnect: OnConnect = useCallback(
    (connection) => {
      takeSnapshot();
      store.onConnect(connection);
    },
    [takeSnapshot, store.onConnect],
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

  const handleEdgesDelete: OnEdgesDelete = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const handleNodeDragStop = useCallback<OnNodeDrag>(
    (event, node, nodes) => {
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
