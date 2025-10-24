import { NodeRunner } from './types';

export const TextSetNodeRunner: NodeRunner = {
  nodeType: 'text-set',

  canRun: (node: any) => node?.type === 'text-set',

  validate: (node: any, inputDataList: any[], setNodes?: any) => {
    // Set节点不需要自动转换，保持Set类型
    // 多文本验证逻辑
    const fromInput = inputDataList.find((d) =>
      d?.media?.textList?.length > 0
    );
    const own = node?.data?.media?.textList?.length > 0;

    if (!fromInput && !own) {
      return { isValid: false, error: `${node?.data?.title || '节点'} 需要文本数据` };
    }
    return { isValid: true };
  },

  run: async (node: any, inputDataList: any[], updateNodeData?: (data: any) => void) => {
    console.log('🔄 TextSet Runner - Starting run for node:', node.id);
    console.log('🔄 TextSet Runner - Node type:', node.type);
    console.log('🔄 TextSet Runner - Input data list length:', inputDataList.length);

    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log('🔄 TextSet Runner - inputDataList:', inputDataList);
    console.log('🔄 TextSet Runner - node.data:', node.data);
    console.log('🔄 TextSet Runner - node.type:', node.type);

    // 收集所有输入文本数据
    const allTexts: string[] = [];

    // 从inputDataList中提取所有文本
    inputDataList.forEach((inputData, index) => {
      console.log(`🔄 TextSet Runner - inputData[${index}]:`, inputData);
      if (inputData?.media?.textList) {
        console.log(`🔄 TextSet Runner - found media.textList in input[${index}]:`, inputData.media.textList);
        allTexts.push(...inputData.media.textList);
      }
    });

    console.log('🔄 TextSet Runner - allTexts from input:', allTexts);
    console.log('🔄 TextSet Runner - allTexts.length from input:', allTexts.length);

    // 如果没有输入数据，从节点自身获取
    if (allTexts.length === 0 && node?.data?.media?.textList) {
      console.log('🔄 TextSet Runner - using node data:', node.data.media.textList);
      allTexts.push(...node.data.media.textList);
    }

    console.log('🔄 TextSet Runner - final allTexts:', allTexts);
    console.log('🔄 TextSet Runner - final allTexts.length:', allTexts.length);

    // 返回合并后的文本列表
    const result = {
      media: {
        textList: allTexts
      },
      timestamp: Date.now(),
    };

    console.log('🔄 TextSet Runner - returning result:', result);
    return result;
  },
};
