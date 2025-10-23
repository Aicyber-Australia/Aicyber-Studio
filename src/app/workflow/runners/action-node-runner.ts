import { NodeRunner } from './types';
import { AppNode } from '../components/nodes';
import { getApiCallFunction, getRegisteredNodeTypes } from '../../api/services/service-registrar';
import { normalizeInputsToMediaSets } from './media-set-utils';

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
    const prompt = ('prompt' in nodeData && nodeData?.prompt) ? nodeData.prompt : '';

    // edit-image-node doesn't require a prompt
    const noPromptRequired = ['edit-image-node'];

    // 检查prompt是否存在 (except for nodes that don't need it)
    if (!noPromptRequired.includes(node.type) && !prompt.trim()) {
      return { isValid: false, error: 'Prompt is required' };
    }

    // 对于需要输入数据的节点类型进行额外验证
    const requiresInputData = ['image-to-image-node', 'image-replicate-node', 'video-to-video-node', 'image-to-text-node', 'edit-image-node'];
    if (requiresInputData.includes(node.type)) {
      if (!inputDataList || inputDataList.length === 0) {
        return { isValid: false, error: 'No input data provided' };
      }

      // Normalize inputs to mediaSets to validate
      const mediaSets = normalizeInputsToMediaSets(inputDataList);

      if (mediaSets.length === 0) {
        return { isValid: false, error: `No valid media data found in input for ${node.type}` };
      }

      // Verify each mediaSet has required media
      const allMediaSetsValid = mediaSets.every(mediaSet =>
        mediaSet.mediaList && mediaSet.mediaList.length > 0
      );

      if (!allMediaSetsValid) {
        return { isValid: false, error: `Invalid media data structure for ${node.type}` };
      }
    }

    return { isValid: true };
  },

  async run(node: AppNode, inputDataList: any[]): Promise<any> {
    try {
      console.log(`ActionNodeRunner - Running ${node.type} with data:`, node.data);
      console.log(`ActionNodeRunner - Input data list:`, inputDataList);

      // Normalize all inputs to unified MediaSet format
      const mediaSets = normalizeInputsToMediaSets(inputDataList);
      console.log(`ActionNodeRunner - Normalized to ${mediaSets.length} mediaSets:`, mediaSets);

      // Store execution count in node data for UI display
      const executionCount = mediaSets.length;
      console.log(`ActionNodeRunner - Execution count: ${executionCount}`);

      // 获取对应的API服务函数
      const apiService = getApiCallFunction(node.type);
      console.log(`ActionNodeRunner - Got API service function for ${node.type}`);

      // 传递整个node和normalized mediaSets给服务
      // The service will receive mediaSets instead of raw inputDataList
      const result = await apiService(node, mediaSets);

      console.log(`ActionNodeRunner - Service result:`, result);
      console.log(`ActionNodeRunner - Service result stringified:`, JSON.stringify(result, null, 2));

      // Include execution metadata in result
      if (result && typeof result === 'object') {
        return {
          ...result,
          executionCount,
          mediaSetsProcessed: mediaSets.length
        };
      }

      return result;
    } catch (error) {
      console.error(`ActionNodeRunner error for ${node.type}:`, error);
      throw new Error(`${node.type} execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};
