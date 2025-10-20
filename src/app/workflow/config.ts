import { Position } from '@xyflow/react';
import { AppNodeType, NodeConfig } from './components/nodes';

export const NODE_SIZE = { width: 260, height: 50 };

// Action node needs more height for the UI elements
export const ACTION_NODE_SIZE = { width: 280, height: 220 };

export const nodesConfig: Record<AppNodeType, NodeConfig> = {
  'image-frame': {
    id: 'image-frame',
    title: 'Image Frame',
    status: 'initial',
    handles: [
      {
        type: 'target',
        position: Position.Left,
        x: 0,
        y: 90, // 节点高度的一半 (180 / 2)
      },
      {
        type: 'source',
        position: Position.Right,
        x: NODE_SIZE.width, // 节点宽度
        y: 90, // 节点高度的一半 (180 / 2)
      },
    ],
    icon: 'Image',
  },
  'image-set': {
    id: 'image-set',
    title: 'Image Set',
    status: 'initial',
    handles: [
      {
        type: 'target',
        position: Position.Left,
        x: 0,
        y: 90, // 节点高度的一半 (180 / 2)
      },
      {
        type: 'source',
        position: Position.Right,
        x: NODE_SIZE.width, // 节点宽度
        y: 90, // 节点高度的一半 (180 / 2)
      },
    ],
    icon: 'Images',
  },
  'text-to-image-node': {
    id: 'text-to-image-node',
    title: 'Text to Image',
    status: 'initial',
    handles: [
      {
        type: 'target',
        position: Position.Left,
        x: 0,
        y: ACTION_NODE_SIZE.height * 0.5,
      },
      {
        type: 'source',
        position: Position.Right,
        x: ACTION_NODE_SIZE.width,
        y: ACTION_NODE_SIZE.height * 0.5,
      },
    ],
    icon: 'Image',
  },
  'image-to-image-node': {
    id: 'image-to-image-node',
    title: 'Image to Image',
    status: 'initial',
    handles: [
      {
        type: 'target',
        position: Position.Left,
        x: 0,
        y: ACTION_NODE_SIZE.height * 0.5,
      },
      {
        type: 'source',
        position: Position.Right,
        x: ACTION_NODE_SIZE.width,
        y: ACTION_NODE_SIZE.height * 0.5,
      },
    ],
    icon: 'Image',
  },
};
