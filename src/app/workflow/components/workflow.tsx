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
});

export default function Workflow() {
  const store = useAppStore(useShallow(selector));
  const { onDragOver, onDrop } = useDragAndDrop();
  const { theme } = useTheme();

  // Initialize undo/redo functionality
  const { takeSnapshot } = useUndoRedo();

  // Initialize copy/paste functionality for nodes with undo/redo support
  useCopyPaste(takeSnapshot);

  // Wrap event handlers with takeSnapshot for undo/redo
  const handleConnect: OnConnect = useCallback(
    (connection) => {
      takeSnapshot();
      store.onConnect(connection);
    },
    [takeSnapshot, store.onConnect],
  );

  const handleNodeDragStart: OnNodeDrag = useCallback(
    (event, node, nodes) => {
      takeSnapshot();
      store.onNodeDragStart(event, node, nodes);
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
      onNodeDragStart={handleNodeDragStart}
      onSelectionDragStart={handleSelectionDragStart}
      onNodesDelete={handleNodesDelete}
      onEdgesDelete={handleEdgesDelete}
      onNodeDragStop={store.onNodeDragStop}
      colorMode={theme as ColorMode}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
    >
      <Background />
      <WorkflowControls />
      <FlowContextMenu />
      <FlowRunButton />
      <DebugPanel />
    </ReactFlow>
  );
}
