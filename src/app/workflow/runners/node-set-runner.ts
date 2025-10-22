import { NodeRunner } from './types';
import { AppNode, NodeSetData, WorkflowNodeData } from '../components/nodes';


export const NodeSetNodeRunner: NodeRunner = {
  nodeType: 'node-set',

  canRun: (node: any) => node?.type === 'node-set',

  validate: (node: any, inputDataList: any[], setNodes?: any) => {

    // 要求上游节点不能只有一个cross 一定是0或者两个以上
    const crossModeCount = inputDataList.filter(inputData => 
      inputData?.loopMode === 'cross'
    ).length;

    if(crossModeCount === 1) {
      return { isValid: false, error: 'target node must have 0 or more than 2 cross mode nodes' };
    }
  
    return { isValid: true };
  },

  run: async (node: AppNode, inputDataList: any[]) => {
  
    console.log('🔄 NodeSet Runner - Starting run for node:', node.id);
    console.log('🔄 NodeSet Runner - Input data list length:', inputDataList.length);
    
    await new Promise((resolve) => setTimeout(resolve, 300));

    const nodeData = node?.data as NodeSetData;
    const collectorMode = nodeData?.collectorMode;

    let currentNodeList : AppNode[] = [];
    let updatedNodeList : AppNode[] = [];

    if(collectorMode === 'collector') {
      // 如果是收集模式，则需要将当前nodeList和输入数据合并
      currentNodeList = nodeData?.nodeList || [];
    
    }

    // 统一收集数据到 nodeList
    
    const crossNodes = inputDataList.filter(inputData => inputData?.loopMode === 'cross');
    const sequenceNodes = inputDataList.filter(inputData => inputData?.loopMode === 'sequence');
    const appendNodes = inputDataList.filter(inputData => inputData?.loopMode === 'append');

    // debug
    console.log('🔄 NodeSet Runner - Cross nodes:', crossNodes.length);
    console.log('🔄 NodeSet Runner - Sequence nodes:', sequenceNodes.length);
    console.log('🔄 NodeSet Runner - Append nodes:', appendNodes.length);

    

    if (crossNodes.length > 0) {
      console.log('🔄 NodeSet Runner - Processing cross nodes...');
      
      // 收集所有cross节点的数据
      const crossDataArrays = crossNodes.map(crossNode => crossNode.media || {});
      
      // 计算笛卡尔积：所有cross节点的数据组合
      const crossProduct = crossDataArrays.reduce((acc, currentArray) => {
        if (acc.length === 0) {
          // 第一个数组，直接展开
          return Object.keys(currentArray).map(key => ({
            [key]: currentArray[key]
          }));
        }
        
        // 后续数组，与之前的结果做笛卡尔积
        const result = [];
        for (const existingItem of acc) {
          for (const key of Object.keys(currentArray)) {
            result.push({
              ...existingItem,
              [key]: currentArray[key]
            });
          }
        }
        return result;
      }, []);
      
      // 为每个组合创建节点并加入nodelist
      const crossProcessedNodes = crossProduct.map((combinedData: AppNode, index: number) => ({
        id: `cross-node-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        type: "media-set" as const,
        data: {
          media: combinedData,
          title: `Media-Set ${index + 1}`,
          status: 'initial'
        },
        position: { x: 0, y: 0 },
        timestamp: Date.now()
      }));
      
      updatedNodeList = [...updatedNodeList, ...crossProcessedNodes];
    }

    if (sequenceNodes.length > 0) {
      console.log('🔄 NodeSet Runner - Processing sequence nodes...');
      
      // 如果nodeList是空的（没有cross节点），就一行一行地添加sequence节点
      if (updatedNodeList.length === 0) {
        const sequenceProcessedNodes = sequenceNodes.map((inputData, index) => ({
          id: `cross-node-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          type: "media-set" as const,
          data: inputData,
          position: { x: 0, y: 0 },
          timestamp: Date.now()
        }));
        updatedNodeList = [...updatedNodeList, ...sequenceProcessedNodes];
      } else {
        // 如果nodeList不为空，将序列节点的数据合并到现有节点的media数据里
        updatedNodeList = updatedNodeList.map((node: AppNode) => {
          const updatedNode: AppNode = { ...node };
          const nodeData = updatedNode.data as WorkflowNodeData;
          // 为每个现有节点添加序列节点的media数据
          sequenceNodes.forEach((sequenceData: WorkflowNodeData) => {
            if (sequenceData.media) {
              // 确保media对象存在
              nodeData.media = nodeData.media || {};
              
              // 合并imageList
              if (sequenceData.media.imageList) {
                nodeData.media.imageList = [
                  ...(nodeData.media.imageList || []),
                  ...sequenceData.media.imageList
                ];
              }
              
              // 合并videoList
              if (sequenceData.media.videoList) {
                nodeData.media.videoList = [
                  ...(nodeData.media.videoList || []),
                  ...sequenceData.media.videoList
                ];
              }
              
              // 合并textList (新增文本支持)
              if (sequenceData.media.textList) {
                nodeData.media.textList = [
                  ...(nodeData.media.textList || []),
                  ...sequenceData.media.textList
                ];
              }
            }
          });
          
          return updatedNode;
        });
      }
    }
    
    

    if(collectorMode === 'collector') {
      updatedNodeList = [...currentNodeList, ...updatedNodeList];
    };
    
    console.log('🔄 NodeSet Runner - Updated nodeList length:', updatedNodeList.length);

    // 返回包含 nodeList 的数据，让下游节点自己判断如何提取
    return {
        nodeList: updatedNodeList,
        timestamp: Date.now(),
    };
  },
};