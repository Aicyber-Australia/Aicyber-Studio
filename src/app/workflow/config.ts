import { Position } from '@xyflow/react';
import { AppNodeType, NodeConfig } from './components/nodes';

export const NODE_SIZE = { width: 260, height: 120 };

// Image nodes use rectangular dimensions for image display
export const IMAGE_NODE_SIZE = { width: 400, height: 360 };

// Video nodes need 16:9 aspect ratio for video display
export const VIDEO_NODE_SIZE = { width: 280, height: 200 };

// Video set needs more height for multiple video display
export const VIDEO_SET_SIZE = { width: 400, height: 360 };

// Text nodes need more height for text display
export const TEXT_NODE_SIZE = { width: 280, height: 200 };

// Text set needs more height for multiple text display
export const TEXT_SET_SIZE = { width: 400, height: 360 };

// Action node needs more height for the UI elements and results display
export const ACTION_NODE_SIZE = { width: 360, height: 380 };

// Node set needs height to display list of nodes
export const NODE_SET_SIZE = { width: 360, height: 280 };

// Media set needs more height for mixed media display (images, videos, text)
export const MEDIA_SET_SIZE = { width: 400, height: 480 };

export const nodesConfig: Record<AppNodeType, NodeConfig> = {
  'media-set': {
    id: 'media-set',
    title: 'Media Set',
    status: 'initial',
    handles: [
      {
        type: 'target',
        position: Position.Left,
        x: 0,
        y: MEDIA_SET_SIZE.height * 0.5,
      },
      {
        type: 'source',
        position: Position.Right,
        x: MEDIA_SET_SIZE.width,
        y: MEDIA_SET_SIZE.height * 0.5,
      },
    ],
    icon: 'Clapperboard',
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
    icon: 'ImagePlay',
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
  'video-frame': {
    id: 'video-frame',
    title: 'Video Frame',
    status: 'initial',
    handles: [
      {
        type: 'target',
        position: Position.Left,
        x: 0,
        y: VIDEO_NODE_SIZE.height * 0.5,
      },
      {
        type: 'source',
        position: Position.Right,
        x: VIDEO_NODE_SIZE.width,
        y: VIDEO_NODE_SIZE.height * 0.5,
      },
    ],
    icon: 'FileVideo',
  },
  'video-set': {
    id: 'video-set',
    title: 'Video Set',
    status: 'initial',
    handles: [
      {
        type: 'target',
        position: Position.Left,
        x: 0,
        y: VIDEO_SET_SIZE.height * 0.5,
      },
      {
        type: 'source',
        position: Position.Right,
        x: VIDEO_SET_SIZE.width,
        y: VIDEO_SET_SIZE.height * 0.5,
      },
    ],
    icon: 'ListVideo',
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
        y: TEXT_SET_SIZE.height * 0.5,
      },
      {
        type: 'source',
        position: Position.Right,
        x: TEXT_SET_SIZE.width,
        y: TEXT_SET_SIZE.height * 0.5,
      },
    ],
    icon: 'NotebookText',
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
    icon: 'Workflow',
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
    icon: 'Workflow',
  },
  'image-to-text-node': {
    id: 'image-to-text-node',
    title: 'Image to Text (Describe)',
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
    icon: 'Workflow',
  },
  'edit-image-node': {
    id: 'edit-image-node',
    title: 'Edit Image',
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
    icon: 'Workflow',
    // Output: Single edited image (imageList[0])
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
        y: NODE_SET_SIZE.height * 0.5,
      },
      {
        type: 'source',
        position: Position.Right,
        x: NODE_SET_SIZE.width,
        y: NODE_SET_SIZE.height * 0.5,
      },
    ],
    icon: 'Layers',
  },
  'test-progress-node': {
    id: 'test-progress-node',
    title: 'Test Progress',
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
    icon: 'Workflow',
  },
};
