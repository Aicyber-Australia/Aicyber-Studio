import { Position } from '@xyflow/react';
import { AppNodeType, NodeConfig } from './components/nodes';

export const NODE_SIZE = { width: 260, height: 50 };

// Image nodes need square dimensions for image display
export const IMAGE_NODE_SIZE = { width: 280, height: 280 };

// Text nodes need more height for text display
export const TEXT_NODE_SIZE = { width: 280, height: 200 };

// Action node needs more height for the UI elements
export const ACTION_NODE_SIZE = { width: 280, height: 220 };

export const nodesConfig: Record<AppNodeType, NodeConfig> = {
  'media-set': {
    id: 'media-set',
    title: 'Media Set',
    status: 'initial',
    handles: [],
    icon: 'Media',
  
  },
  'image-frame': {
    id: 'image-frame',
    title: 'Image Frame',
    status: 'initial',
    handles: [
      {
        type: 'target',
        position: Position.Left,
        x: 0,
        y: IMAGE_NODE_SIZE.height * 0.5,
      },
      {
        type: 'source',
        position: Position.Right,
        x: IMAGE_NODE_SIZE.width,
        y: IMAGE_NODE_SIZE.height * 0.5,
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
        y: IMAGE_NODE_SIZE.height * 0.5,
      },
      {
        type: 'source',
        position: Position.Right,
        x: IMAGE_NODE_SIZE.width,
        y: IMAGE_NODE_SIZE.height * 0.5,
      },
    ],
    icon: 'Images',
  },
  'text-frame': {
    id: 'text-frame',
    title: 'Text Frame',
    status: 'initial',
    handles: [
      {
        type: 'target',
        position: Position.Left,
        x: 0,
        y: TEXT_NODE_SIZE.height * 0.5,
      },
      {
        type: 'source',
        position: Position.Right,
        x: TEXT_NODE_SIZE.width,
        y: TEXT_NODE_SIZE.height * 0.5,
      },
    ],
    icon: 'FileText',
  },
  'text-set': {
    id: 'text-set',
    title: 'Text Set',
    status: 'initial',
    handles: [
      {
        type: 'target',
        position: Position.Left,
        x: 0,
        y: TEXT_NODE_SIZE.height * 0.5,
      },
      {
        type: 'source',
        position: Position.Right,
        x: TEXT_NODE_SIZE.width,
        y: TEXT_NODE_SIZE.height * 0.5,
      },
    ],
    icon: 'FileText',
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
  'node-set': {
    id: 'node-set',
    title: 'Node Set',
    status: 'initial',
    handles: [
      {
        type: 'target',
        position: Position.Left,
        x: 0,
        y: NODE_SIZE.height * 0.5,
      },
      {
        type: 'source',
        position: Position.Right,
        x: NODE_SIZE.width,
        y: NODE_SIZE.height * 0.5,
      },
    ],
    icon: 'Layers',
  },
};
