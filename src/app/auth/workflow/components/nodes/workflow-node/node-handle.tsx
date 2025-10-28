'use client';

import clsx from 'clsx';
import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Position,
  useConnection,
  useInternalNode,
  useNodeConnections,
  useNodeId,
  XYPosition,
} from '@xyflow/react';

import { type AppStore } from '@/app/workflow/store/app-store';

import { type AppNodeType, NodeConfig } from '@/app/workflow/components/nodes';
import { Button } from '@/components/ui/button';
import { FlowDropdownMenu } from '@/app/workflow/components/flow-dropdown-menu';
import { FlowActionMenu, imageFrameActions } from '@/app/workflow/components/flow-action-menu';

import { useDropdown } from '@/hooks/use-dropdown';
import { useAppStore } from '@/app/workflow/store';
import { ButtonHandle } from '@/components/button-handle';

const compatibleNodeTypes = (type: 'source' | 'target', currentNodeType?: string) => {
  // Special case for text-to-image-node: source can only be image-frame
  if (currentNodeType === 'text-to-image-node' && type === 'target') {
    return (node: NodeConfig) => {
      return node.id === 'image-frame';
    };
  }

  // Special case for text-to-image-node: output can connect to any node
  if (currentNodeType === 'text-to-image-node' && type === 'source') {
    return (node: NodeConfig) => {
      return (
        node.id === 'image-frame' ||
        node.id === 'text-to-image-node' ||
        node.id === 'image-to-image-node' ||
        node.id === 'image-to-text-node'
      );
    };
  }

  // Special case for image-to-image-node: source must be image-frame, image-set, or media-set
  if (currentNodeType === 'image-to-image-node' && type === 'target') {
    return (node: NodeConfig) => {
      return node.id === 'image-frame' || node.id === 'image-set' || node.id === 'media-set';
    };
  }

  // Special case for image-to-image-node: output can connect to any node
  if (currentNodeType === 'image-to-image-node' && type === 'source') {
    return (node: NodeConfig) => {
      return (
        node.id === 'image-frame' ||
        node.id === 'text-to-image-node' ||
        node.id === 'image-to-image-node' ||
        node.id === 'image-to-text-node'
      );
    };
  }

  // Special case for image-to-text-node: source must be image-frame, image-set, or media-set
  if (currentNodeType === 'image-to-text-node' && type === 'target') {
    return (node: NodeConfig) => {
      return node.id === 'image-frame' || node.id === 'image-set' || node.id === 'media-set';
    };
  }

  // Special case for image-to-text-node: output can connect to text-frame or text-set
  if (currentNodeType === 'image-to-text-node' && type === 'source') {
    return (node: NodeConfig) => {
      return node.id === 'text-frame' || node.id === 'text-set';
    };
  }

  // Special case for edit-image-node: source must be single image-frame only
  if (currentNodeType === 'edit-image-node' && type === 'target') {
    return (node: NodeConfig) => {
      return node.id === 'image-frame';
    };
  }

  // Special case for edit-image-node: output can connect to image nodes
  if (currentNodeType === 'edit-image-node' && type === 'source') {
    return (node: NodeConfig) => {
      return (
        node.id === 'image-frame' ||
        node.id === 'image-set' ||
        node.id === 'image-to-image-node' ||
        node.id === 'image-to-text-node'
      );
    };
  }

  if (type === 'source') {
    return (node: NodeConfig) => {
      return (
        node.id === 'image-frame' ||
        node.id === 'text-to-image-node' ||
        node.id === 'image-to-image-node' ||
        node.id === 'image-to-text-node' ||
        node.id === 'edit-image-node'
      );
    };
  }
  return (node: NodeConfig) => {
    return (
      node.id === 'image-frame' ||
      node.id === 'text-to-image-node' ||
      node.id === 'image-to-image-node' ||
      node.id === 'image-to-text-node' ||
      node.id === 'edit-image-node'
    );
  };
};

const selector =
  (nodeId: string, type: string, id?: string | null) => (state: AppStore) => ({
    addNodeInBetween: state.addNodeInBetween,
    draggedNodes: state.draggedNodes,
    connectionSites: state.connectionSites,
    isPotentialConnection:
      state.potentialConnection?.id === `handle-${nodeId}-${type}-${id}`,
  });

// TODO: we need to streamline how we calculate the yOffset
const yOffset = (type: 'source' | 'target') => (type === 'source' ? 100 : -130);

function getIndicatorPostion(
  nodePosition: XYPosition,
  x: number,
  y: number,
  type: 'source' | 'target',
) {
  return {
    x: nodePosition.x + x,
    y: nodePosition.y + y + yOffset(type),
  };
}

const fallbackPosition = { x: 0, y: 0 };

export function NodeHandle({
  className,
  position: handlePosition,
  type,
  id,
  x,
  y,
}: {
  className?: string;
  id?: string | null;
  type: 'source' | 'target';
  position: Position;
  x: number;
  y: number;
}) {
  const nodeId = useNodeId() ?? '';
  const currentNode = useInternalNode(nodeId);
  const currentNodeType = currentNode?.type;

  const connections = useNodeConnections({
    handleType: type,
    handleId: id ?? undefined,
  });

  const isConnectionInProgress = useConnection((c) => c.inProgress);

  const { isOpen, toggleDropdown, ref } = useDropdown();
  const {
    draggedNodes,
    addNodeInBetween,
    connectionSites,
    isPotentialConnection,
  } = useAppStore(useShallow(selector(nodeId, type, id)));

  // We get the actual position of the node
  const nodePosition =
    useInternalNode(nodeId)?.internals.positionAbsolute ?? fallbackPosition;

  // Get actual node dimensions for dynamic handle positioning
  const nodeWidth = currentNode?.measured?.width;
  const nodeHeight = currentNode?.measured?.height;

  // Calculate dynamic handle positions based on actual node size
  // Use measured dimensions if available, otherwise fall back to static positions
  // For left/right handles, use middle of node height
  // For x position: 0 for left (target), nodeWidth for right (source)
  const dynamicX = nodeWidth !== undefined ? (type === 'source' ? nodeWidth : 0) : x;
  const dynamicY = nodeHeight !== undefined ? nodeHeight * 0.5 : y;

  const onClick = () => {
    toggleDropdown();
  };

  const onAddNode = useCallback(
    (nodeType: AppNodeType) => {
      if (!nodeId) {
        return;
      }

      addNodeInBetween({
        type: nodeType,
        [type]: nodeId,
        [`${type}HandleId`]: id,
        position: getIndicatorPostion(nodePosition, dynamicX, dynamicY, type),
      });

      toggleDropdown();
    },
    [nodeId, id, type, nodePosition, dynamicX, dynamicY, toggleDropdown, addNodeInBetween],
  );

  const displayAddButton =
    connections.length === 0 &&
    !isConnectionInProgress &&
    !draggedNodes.has(nodeId);

  const connectionId = `handle-${nodeId}-${type}-${id}`;
  useEffect(() => {
    if (displayAddButton) {
      connectionSites.set(connectionId, {
        position: getIndicatorPostion(nodePosition, dynamicX, dynamicY, type),
        [type]: {
          node: nodeId,
          handle: id,
        },
        type,
        id: connectionId,
      });
    }
    return () => {
      connectionSites.delete(connectionId);
    };
  }, [
    nodePosition,
    connectionSites,
    connectionId,
    id,
    nodeId,
    type,
    dynamicX,
    dynamicY,
    displayAddButton,
  ]);
  return (
    <ButtonHandle
      type={type}
      position={handlePosition}
      id={id}
      className={clsx('left-[-6px] top-[-6px]', className)}
      style={{ transform: `translate(${dynamicX}px, ${dynamicY}px)` }}
      showButton={displayAddButton}
    >
      <Button
        onClick={onClick}
        size="icon"
        variant="secondary"
        className={clsx('border h-6 w-6 rounded-xl hover:bg-card', {
          'border-red-500': isPotentialConnection,
        })}
      >
        +
      </Button>
      {isOpen && (
        <div
          className="absolute z-50 mt-2 left-1/2 transform -translate-x-1/2"
          ref={ref}
        >
          {type === 'source' && currentNodeType === 'image-frame' ? (
            <FlowActionMenu
              onAddNode={onAddNode}
              actions={imageFrameActions}
            />
          ) : (
            <FlowDropdownMenu
              onAddNode={onAddNode}
              filterNodes={compatibleNodeTypes(type, currentNodeType)}
            />
          )}
        </div>
      )}
    </ButtonHandle>
  );
}
