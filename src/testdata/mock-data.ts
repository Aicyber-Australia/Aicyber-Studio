import { AppEdge, createEdge } from '../app/workflow/components/edges';
import { AppNode, createNodeByType } from '../app/workflow/components/nodes';
import { layoutGraph } from '../app/workflow/utils/layout-helper';

const initialNodes: AppNode[] = [
  createNodeByType({ 
    type: 'image-frame', 
    id: 'imageNode_1',
    data: {
      title: 'Image Input',
      media: {
        imageList: [{
          url: '/images/fd181b8088cbbd8f1f0cc1685efbc2e.png',
          fileName: 'fd181b8088cbbd8f1f0cc1685efbc2e.png',
          timestamp: Date.now()
        }]
      }
    }
  }),
  createNodeByType({ 
    type: 'image-frame', 
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
