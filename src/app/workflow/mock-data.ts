import { AppEdge, createEdge } from './components/edges';
import { AppNode, createNodeByType } from './components/nodes';
import { layoutGraph } from './utils/layout-helper';

const initialNodes: AppNode[] = [
  createNodeByType({ 
    type: 'image-display-node', 
    id: 'imageNode_1',
    data: {
      title: 'Image Input',
      imageUrl: '/images/fd181b8088cbbd8f1f0cc1685efbc2e.png'
    }
  }),
  createNodeByType({ 
    type: 'image-display-node', 
    id: 'imageNode_2',
    data: {
      title: 'Image Output'
    }
  }),
];

const initialEdges: AppEdge[] = [
  createEdge('imageNode_1', 'imageNode_2'),
];

export async function loadData() {
  const layoutedNodes = await layoutGraph(initialNodes, initialEdges);

  return {
    nodes: layoutedNodes,
    edges: initialEdges,
  };
}
