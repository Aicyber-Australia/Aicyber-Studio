import { Node, NodeProps, XYPosition } from '@xyflow/react';
import { nanoid } from 'nanoid';

import { NODE_SIZE, IMAGE_NODE_SIZE, TEXT_NODE_SIZE, ACTION_NODE_SIZE, NODE_SET_SIZE, nodesConfig } from '../../config';
import { iconMapping } from '@/app/workflow/utils/icon-mapping';
import ImageFrame from './image-frame';
import ImageSet from './image-set';
import TextFrame from './text-frame';
import TextSet from './text-set';
import MediaSet from './media-set';
import { NodeSet } from './node-set';
import { TextToImageNode } from './action-node/text-to-image';
import { ImageToImageNode } from './action-node/image-to-image';
import { ImageToTextNode } from './action-node/image-to-text';
import { EditImageNode } from './action-node/edit-image';

/* WORKFLOW NODE DATA PROPS ------------------------------------------------------ */

export type NodeSetData = {
  title?: string;
  label?: string;
  icon?: string;
  // 维护一个set 里面是所有支持的媒体类型eg. 每次加入node时候
  mediaTypes?: Array<string>;
  status?: 'loading' | 'success' | 'error' | 'initial';
  nodeList?: AppNode[];
  inputMode?: 'cross' | 'sequence' | 'append'; // How to process upstream input nodes
  collectorMode?: 'collector' | 'normal'; // Whether to accumulate data across runs
  outputMode?: 'loop' | 'direct'; // How to send data to downstream nodes
  programmaticallyAdded?: boolean;
};


export type WorkflowNodeData = {
  title?: string;
  label?: string;
  icon?: keyof typeof iconMapping;
  status?: 'loading' | 'success' | 'error' | 'initial';
  loopMode?: 'cross' | 'sequence' | 'append';
  setOutputMode?: 'individual' | 'integrated'; // How set nodes (image-set, text-set, media-set) output: individual items or as one unit
  fileName?: string;
  timestamp?: number;
  selectedModel?: string;
  prompt?: string;
  programmaticallyAdded?: boolean;
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
    textList?: string[];
    mediaList?: Array<{
      id: string;
      type: 'image' | 'text';
      url?: string;
      content?: string;
      fileName: string;
      timestamp: number;
    }>;
  };
  textContent?: string;
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
  'text-frame': TextFrame,
  'text-set': TextSet,
  'media-set': MediaSet,
  'node-set': NodeSet,
  'text-to-image-node': TextToImageNode,
  'image-to-image-node': ImageToImageNode,
  'image-to-text-node': ImageToTextNode,
  'edit-image-node': EditImageNode,
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
  data?: WorkflowNodeData | NodeSetData;
}): AppNode => {
  const node = nodesConfig[type];

  // Determine the size based on node type
  let nodeSize = NODE_SIZE;
  if (type === 'image-frame' || type === 'image-set' || type === 'media-set') {
    nodeSize = IMAGE_NODE_SIZE;
  } else if (type === 'text-frame' || type === 'text-set') {
    nodeSize = TEXT_NODE_SIZE;
  } else if (type === 'text-to-image-node' || type === 'image-to-image-node' || type === 'image-to-text-node' || type === 'edit-image-node') {
    nodeSize = ACTION_NODE_SIZE;
  } else if (type === 'node-set') {
    nodeSize = NODE_SET_SIZE;
  }

  const newNode: AppNode = {
    id: id ?? nanoid(),
    data: data ?? (() => {
      // 根据节点类型设置不同的默认数据
      if (type === 'node-set') {
        return {
          title: node.title,
          status: node.status,
          icon: node.icon,
          inputMode: 'sequence',   // How to process upstream inputs: cross, sequence, append
          collectorMode: 'normal', // Whether to accumulate: normal, collector
          outputMode: 'loop',      // How to output to downstream: loop, direct
          nodeList: [],            // 初始化为空数组
        } as NodeSetData;
      } else {
        return {
          title: node.title,
          status: node.status,
          icon: node.icon,
          loopMode: 'sequence',  // 其他节点默认是 append 模式 单列插入
          setOutputMode: 'individual',  // Set nodes default to individual output mode
        } as WorkflowNodeData;
      }
    })(),
    position: {
      x: position.x - nodeSize.width * 0.5,
      y: position.y - nodeSize.height * 0.5,
    },
    type,
    width: nodeSize.width,
    height: nodeSize.height,
  };

  return newNode;
};

export type AppNode =
  | Node<WorkflowNodeData, 'image-frame'>
  | Node<WorkflowNodeData, 'image-set'>
  | Node<WorkflowNodeData, 'text-frame'>
  | Node<WorkflowNodeData, 'text-set'>
  | Node<WorkflowNodeData, 'media-set'>
  | Node<NodeSetData, 'node-set'>
  | Node<WorkflowNodeData, 'text-to-image-node'>
  | Node<WorkflowNodeData, 'image-to-image-node'>
  | Node<WorkflowNodeData, 'image-to-text-node'>
  | Node<WorkflowNodeData, 'edit-image-node'>;

export type AppNodeType = NonNullable<AppNode['type']>;
