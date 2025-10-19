import { NodeRunner } from './types';

export const ImageFrameNodeRunner: NodeRunner = {
  nodeType: 'image-display-node',

  canRun: (node: any) => node?.type === 'image-display-node',

  validate: (node: any, inputDataList: any[]) => {
    const fromInput = inputDataList.find((d) => !!d?.imageUrl);
    const own = node?.data?.imageUrl;

    if (!fromInput && !own) {
      return { isValid: false, error: `${node?.data?.title || '节点'} 需要 imageUrl` };
    }
    return { isValid: true };
  },

  run: async (node: any, inputDataList: any[]) => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const fromInput = inputDataList.find((d) => !!d?.imageUrl);
    const imageUrl = fromInput?.imageUrl ?? node?.data?.imageUrl;

    return {
      imageUrl,
      fileName: fromInput?.fileName ?? node?.data?.fileName ?? 'image',
      timestamp: Date.now(),
    };
  },
};


