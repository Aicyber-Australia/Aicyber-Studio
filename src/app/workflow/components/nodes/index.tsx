import { Node, NodeProps, XYPosition } from '@xyflow/react';
import { nanoid } from 'nanoid';

import { NODE_SIZE, IMAGE_NODE_SIZE, ACTION_NODE_SIZE, nodesConfig } from '../../config';
import { iconMapping } from '@/app/workflow/utils/icon-mapping';
import ImageFrame from './image-frame';
import ImageSet from './image-set';
import { TextToImageNode } from './action-node/text-to-image';
import { ImageToImageNode } from './action-node/image-to-image';

/* WORKFLOW NODE DATA PROPS ------------------------------------------------------ */

export type WorkflowNodeData = {
  title?: string;
  label?: string;
  icon?: keyof typeof iconMapping;
  status?: 'loading' | 'success' | 'error' | 'initial';
  fileName?: string;
  timestamp?: number;
  selectedModel?: string;
  prompt?: string;
  media?: {
    imageList?: Array<{
      url: string;
      data?: string;
      fileName: string;
      timestamp?: number;
    }>;
    videoList?: Array<{
      url: string;
      data?: string;
      fileName: string;
      timestamp?: number;
    }>;
  };
};

export type WorkflowNodeProps = NodeProps<Node<WorkflowNodeData>> & {
  type: AppNodeType;
  children?: React.ReactNode;
};

export type NodeConfig = {
  id: AppNodeType;
  title: string;
  status?: 'loading' | 'success' | 'error' | 'initial';
  handles: NonNullable<Node['handles']>;
  icon: keyof typeof iconMapping;
};

export const nodeTypes = {
  'image-frame': ImageFrame,
  'image-set': ImageSet,
  'text-to-image-node': TextToImageNode,
  'image-to-image-node': ImageToImageNode,
};

export const createNodeByType = ({
  type,
  id,
  position = { x: 0, y: 0 },
  data,
}: {
  type: AppNodeType;
  id?: string;
  position?: XYPosition;
  data?: WorkflowNodeData;
}): AppNode => {
  const node = nodesConfig[type];

  // Determine the size based on node type
  let nodeSize = NODE_SIZE;
  if (type === 'image-frame' || type === 'image-set') {
    nodeSize = IMAGE_NODE_SIZE;
  } else if (type === 'text-to-image-node' || type === 'image-to-image-node') {
    nodeSize = ACTION_NODE_SIZE;
  }

  const newNode: AppNode = {
    id: id ?? nanoid(),
    data: data ?? {
      title: node.title,
      status: node.status,
      icon: node.icon,
    },
    position: {
      x: position.x - nodeSize.width * 0.5,
      y: position.y - nodeSize.height * 0.5,
    },
    type,

    // Set explicit width and height to control initial size
    width: nodeSize.width,
    height: nodeSize.height,
    // handles: node.handles,
  };

  return newNode;
};

export type AppNode =
  | Node<WorkflowNodeData, 'image-frame'>
  | Node<WorkflowNodeData, 'image-set'>
  | Node<WorkflowNodeData, 'text-to-image-node'>
  | Node<WorkflowNodeData, 'image-to-image-node'>;

export type AppNodeType = NonNullable<AppNode['type']>;
