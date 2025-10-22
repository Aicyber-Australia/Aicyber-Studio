import { NodeRunner } from './types';
import { AppNode, NodeSetData } from '../components/nodes';

export const NodeSetNodeRunner: NodeRunner = {
  nodeType: 'node-set',

  canRun: (node: any) => node?.type === 'node-set',

  validate: (node: any, inputDataList: any[], setNodes?: any) => {
    // NodeSet 节点总是可以运行
    return { isValid: true };
  },

  run: async (node: AppNode, inputDataList: any[]) => {
  
    console.log('🔄 NodeSet Runner - Starting run for node:', node.id);
    console.log('🔄 NodeSet Runner - Input data list length:', inputDataList.length);
    
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 统一收集数据到 nodeList
    const currentNodeList = (node?.data as NodeSetData)?.nodeList || [];
    
    const newNodes = inputDataList.map((inputData, index) => ({
        id: `collected-node-${Date.now()}-${index}`,
        type: inputData.type || 'unknown',
        data: inputData,
        position: { x: 0, y: 0 },
        timestamp: Date.now()
      }));
    

    const updatedNodeList = [...currentNodeList, ...newNodes];
    
    console.log('🔄 NodeSet Runner - Updated nodeList length:', updatedNodeList.length);

    // 返回包含 nodeList 的数据，让下游节点自己判断如何提取
    return {
        nodeList: updatedNodeList,
        timestamp: Date.now(),
    };
  },
};