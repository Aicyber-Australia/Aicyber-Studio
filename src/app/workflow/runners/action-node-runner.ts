import { NodeRunner } from './types';
import { AppNode } from '../components/nodes';
import { getApiCallFunction, getRegisteredNodeTypes } from '../../api/services/service-registrar';

export const ActionNodeRunner: NodeRunner<AppNode> = {
  nodeType: 'action-node', // 通用类型

  canRun(node: AppNode): boolean {
    // 动态获取所有已注册的节点类型
    const registeredNodeTypes = getRegisteredNodeTypes();
    const canRun = registeredNodeTypes.includes(node.type);
    console.log(`ActionNodeRunner.canRun(${node.type}):`, canRun, 'Registered types:', registeredNodeTypes);
    return canRun;
  },

  validate(node: AppNode, inputDataList: any[]): { isValid: boolean; error?: string } {
    const nodeData = node.data;
    const prompt = nodeData?.prompt || '';

    // 检查prompt是否存在
    if (!prompt.trim()) {
      return { isValid: false, error: 'Prompt is required' };
    }

    // 对于需要输入数据的节点类型进行额外验证
    const requiresInputData = ['image-to-image-node', 'image-replicate-node', 'video-to-video-node'];
    if (requiresInputData.includes(node.type)) {
      if (!inputDataList || inputDataList.length === 0) {
        return { isValid: false, error: 'No input data provided' };
      }

      // 检查输入数据是否包含所需的内容
      const hasRequiredData = inputDataList.some(data => 
        data && (data.imageUrl || data.imageData || data.fileName || data.videoUrl)
      );

      if (!hasRequiredData) {
        return { isValid: false, error: `No required data found in input for ${node.type}` };
      }
    }

    return { isValid: true };
  },

  async run(node: AppNode, inputDataList: any[]): Promise<any> {
    try {
      console.log(`ActionNodeRunner - Running ${node.type} with data:`, node.data);
      console.log(`ActionNodeRunner - Input data list:`, inputDataList);

      // 获取对应的API服务函数
      const apiService = getApiCallFunction(node.type);
      console.log(`ActionNodeRunner - Got API service function for ${node.type}`);

      // 传递整个node和输入数据给服务
      const result = await apiService(node, inputDataList);

      console.log(`ActionNodeRunner - Service result:`, result);
      console.log(`ActionNodeRunner - Service result stringified:`, JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error(`ActionNodeRunner error for ${node.type}:`, error);
      throw new Error(`${node.type} execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};
