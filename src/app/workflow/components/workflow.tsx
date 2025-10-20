'use client';

import React, { useCallback } from 'react';
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

import { nodeTypes } from '@/app/workflow/components/nodes';
import { useAppStore } from '@/app/workflow/store';
import { WorkflowControls } from './controls';
import FlowContextMenu from '@/app/workflow/components/flow-context-menu';
import { AppStore } from '@/app/workflow/store/app-store';
import { useDragAndDrop } from '@/app/workflow/hooks/useDragAndDrop';
import { FlowRunButton } from '@/app/workflow/components/flow-run-button';
import { DebugPanel } from './debug-panel';
import { useCopyPaste } from '@/app/workflow/hooks/useCopyPaste';
import { useUndoRedo } from '@/app/workflow/hooks/useUndoRedo';

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
});

export default function Workflow() {
  const store = useAppStore(useShallow(selector));
  const { onDragOver, onDrop } = useDragAndDrop();
  const { theme } = useTheme();
  const reactFlowStore = useStoreApi();
  const { getInternalNode } = useReactFlow();

  // Initialize undo/redo functionality
  const { takeSnapshot } = useUndoRedo();

  // Initialize copy/paste functionality for nodes with undo/redo support
  useCopyPaste(takeSnapshot);

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
      fitView
    >
      <Background />
      <WorkflowControls />
      <FlowContextMenu />
      <FlowRunButton />
      <DebugPanel />
      <MiniMap />
    </ReactFlow>
  );
}
