import { NodeRunner } from './types';
import { AppNode } from '../components/nodes';

export const TextToImageNodeRunner: NodeRunner<AppNode> = {
  nodeType: 'text-to-image-node',

  canRun(node: AppNode): boolean {
    return node.type === 'text-to-image-node';
  },

  validate(node: AppNode, inputDataList: any[]): { isValid: boolean; error?: string } {
    // to-image-node可以独立运行，不需要依赖输入数据
    // 只需要检查节点本身是否有prompt
    const nodeData = node.data;
    const prompt = nodeData?.prompt || '';

    if (!prompt.trim()) {
      return { isValid: false, error: 'Prompt is required for image generation' };
    }

    return { isValid: true };
  },

  async run(node: AppNode, inputDataList: any[]): Promise<any> {
    try {
      // 获取节点数据中的模型选择和文本输入
      const nodeData = node.data;
      const selectedModel = nodeData?.selectedModel || 'default';
      const prompt = nodeData?.prompt || '';

      if (!prompt.trim()) {
        throw new Error('Prompt is required for image generation');
      }

      // 调用内部API
      const response = await fetch('/api/action-node-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          model: selectedModel
        })
      });

    
      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('ToImageNodeRunner - API result:', result);

      if (!result.success) {
        console.log('ToImageNodeRunner - API returned error:', result.error);
        throw new Error(result.error || 'Image generation failed');
      }

      return {
        imageUrl: result.image_url,
        fileName: `generated-image-${Date.now()}.jpg`, 
        timestamp: Date.now(),
        prompt: prompt,  // 保存prompt到节点数据中
      };
    } catch (error) {
      console.error('ToImageNodeRunner error:', error);
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};
