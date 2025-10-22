import { WorkflowNodeData, WorkflowNodeProps } from '../components/nodes';
import { NodeRunner } from './types';

export const TextFrameNodeRunner: NodeRunner = {
  nodeType: 'text-frame',

  canRun: (node: WorkflowNodeProps) => node?.type === 'text-frame',

  validate: (node: WorkflowNodeProps, inputDataList: WorkflowNodeData[], setNodes?: any) => {
    // 收集所有输入文本数据
    const allTexts: string[] = [];
    inputDataList.forEach((inputData: WorkflowNodeData) => {
      if (inputData?.media?.textList) {
        allTexts.push(...inputData.media.textList);
      }
    });

    // 如果检测到多个文本，自动转换为Set类型
    if (allTexts.length > 1 && setNodes) {
      console.log('🔄 Converting Text Frame to Text Set - allTexts:', allTexts);
      console.log('🔄 Converting Text Frame to Text Set - allTexts.length:', allTexts.length);

      setNodes((nodes: WorkflowNodeProps[]) => nodes.map((n: WorkflowNodeProps) =>
        n.id === node.id
          ? {
              ...n,
              type: 'text-set',
              data: {
                ...n.data,
                title: `Text Set (${allTexts.length})`,
                status: 'success',
                media: {
                  textList: allTexts
                }
              }
            }
          : n
      ));

      console.log(`✅ Node ${node.id} automatically converted from text-frame to text-set (${allTexts.length} texts)`);
      return { isValid: true };
    }

    // 如果节点本身有多个文本，也转换为Set
    if ((node?.data?.media?.textList?.length ?? 0) > 1 && setNodes) {
      const textCount = node.data?.media?.textList?.length ?? 0;
      const existingTexts = node.data?.media?.textList || [];
      setNodes((nodes: WorkflowNodeProps[]) => nodes.map((n: WorkflowNodeProps) =>
        n.id === node.id
          ? {
              ...n,
              type: 'text-set',
              data: {
                ...n.data,
                title: `Text Set (${textCount})`,
                status: 'success',
                media: {
                  textList: existingTexts
                }
              }
            }
          : n
      ));

      console.log(`Node ${node.id} automatically converted from text-frame to text-set (${textCount} texts)`);
      return { isValid: true };
    }

    // 单文本验证：有输入文本或自身有文本
    if (allTexts.length === 1 || (node?.data?.media?.textList?.length ?? 0) > 0) {
      return { isValid: true };
    }

    return { isValid: false };
  },

  run: async (node: any, inputDataList: any[]) => {
    console.log('🔄 Text Frame Runner - Starting run for node:', node.id);
    console.log('🔄 Text Frame Runner - Node type:', node.type);
    console.log('🔄 Text Frame Runner - Input data list length:', inputDataList.length);

    await new Promise((resolve) => setTimeout(resolve, 300));

    if (node.type === 'text-set') {
      console.log('🔄 Text Frame Runner - Node is already text-set, skipping frame runner');
      return {};
    }

    console.log('🔄 Text Frame Runner - Processing frame node...');

    // 从inputDataList中提取文本数据
    let textContent = '';

    // 优先从新的media格式获取
    const fromInput = inputDataList.find((d) => d?.media?.textList?.length > 0);
    if (fromInput?.media?.textList?.[0]) {
      textContent = fromInput.media.textList[0];
    }
    // 如果没有，从节点自身获取
    else if (node?.data?.media?.textList?.[0]) {
      textContent = node.data.media.textList[0];
    }

    // 返回新的media格式 (只包含单个字符串)
    return {
      media: {
        textList: [textContent]
      },
      timestamp: Date.now(),
    };
  },
};
