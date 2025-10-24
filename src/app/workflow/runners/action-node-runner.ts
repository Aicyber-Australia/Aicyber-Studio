import { NodeRunner } from './types';
import { AppNode } from '../components/nodes';
import { getApiCallFunction, getRegisteredNodeTypes } from '../../api/services/service-registrar';
import { normalizeInputsToMediaSets } from './media-set-utils';
import { resourceLimits } from 'worker_threads';

export const ActionNodeRunner: NodeRunner<AppNode> = {
  nodeType: 'action-node', // 通用类型

  canRun(node: AppNode): boolean {
    // 动态获取所有已注册的节点类型
    const registeredNodeTypes = getRegisteredNodeTypes();
    const canRun = registeredNodeTypes.includes(node.type);
    console.log(`ActionNodeRunner.canRun(${node.type}):`, canRun, 'Registered types:', registeredNodeTypes);
    return canRun;
  },

  validate(node: AppNode, inputDataList: any[]): { isValid: boolean; error?: string; shouldUseIterator?: boolean; iterationCount?: number } {
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

      // 检查是否需要使用iterator模式（当有多个输入数据时）
      const totalMediaCount = mediaSets.reduce((total, mediaSet) => total + mediaSet.mediaList.length, 0);
      const shouldUseIterator = totalMediaCount > 1;
      console.log(`ActionNodeRunner - Total media count: ${totalMediaCount}, will use ${shouldUseIterator ? 'iterator' : 'run'} mode`);
      
      return { 
        isValid: true, 
        shouldUseIterator,
        iterationCount: shouldUseIterator ? totalMediaCount : undefined
      };
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
  },

  async iterator(node: AppNode, inputDataList: any[], loopNode: AppNode): Promise<any> {
    console.log(`ActionNodeRunner - Iterator for ${node.type} with data:`, node.data);
    console.log(`ActionNodeRunner - Input data list:`, inputDataList);
    console.log(`ActionNodeRunner - Loop node:`, loopNode);

    // 获取所有媒体数据
    const mediaSets = normalizeInputsToMediaSets(inputDataList);
    const allMediaItems: any[] = [];
    
    // 展平所有媒体项
    mediaSets.forEach(mediaSet => {
      if (mediaSet.mediaList && mediaSet.mediaList.length > 0) {
        allMediaItems.push(...mediaSet.mediaList);
      }
    });

    console.log(`ActionNodeRunner - Total media items to process: ${allMediaItems.length}`);
    
    // 不记录具体结果，直接执行，让collector收集
    const apiService = getApiCallFunction(node.type);
    
    // 对每个媒体项执行API调用
    for (let i = 0; i < allMediaItems.length; i++) {
      const mediaItem = allMediaItems[i];
      console.log(`ActionNodeRunner - Processing media item ${i + 1}/${allMediaItems.length}:`, mediaItem);
      
      let success = false;
      
      // 重试逻辑：失败3次后进入下一条
      for (let retry = 0; retry < 3; retry++) {
        try {
          console.log(`ActionNodeRunner - Attempt ${retry + 1}/3 for media item ${i + 1}`);
          
          // 为单个媒体项创建mediaSet
          const singleMediaSet = {
            mediaList: [mediaItem],
            fileName: mediaItem.fileName || `item-${i}`,
            timestamp: mediaItem.timestamp || Date.now()
          };
          
          // 调用API服务
          const result = await apiService(node, [singleMediaSet]);
          
          console.log(`ActionNodeRunner - Success for media item ${i + 1}, attempt ${retry + 1}`);
          success = true;
          break; // 成功则跳出重试循环
          
        } catch (error) {
          console.error(`ActionNodeRunner - Attempt ${retry + 1}/3 failed for media item ${i + 1}:`, error);
          
          // 如果不是最后一次重试，等待一段时间再重试
          if (retry < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1))); // 递增等待时间
          }
        }
      }
      
      if (!success) {
        console.error(`ActionNodeRunner - All attempts failed for media item ${i + 1}`);
      }
    }
    
    console.log(`ActionNodeRunner - Iterator completed processing ${allMediaItems.length} items`);
    
    // 返回简单的执行信息，不包含具体结果
    return {
      executionMode: 'iterator',
      totalProcessed: allMediaItems.length,
      completed: true
    };
  }

};
