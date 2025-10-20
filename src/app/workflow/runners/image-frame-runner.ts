import { NodeRunner } from './types';

export const ImageFrameNodeRunner: NodeRunner = {
  nodeType: 'image-frame',

  canRun: (node: any) => node?.type === 'image-frame',

  validate: (node: any, inputDataList: any[]) => {
    // 检查输入数据中是否有图片
    const fromInput = inputDataList.find((d) => 
      d?.media?.imageList?.length > 0 || d?.imageUrl
    );
    // 检查节点自身是否有图片
    const own = node?.data?.media?.imageList?.length > 0;

    if (!fromInput && !own) {
      return { isValid: false, error: `${node?.data?.title || '节点'} 需要图片数据` };
    }
    return { isValid: true };
  },

  run: async (node: any, inputDataList: any[]) => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 从inputDataList中提取图片数据
    let imageUrl = '';
    let fileName = 'image';
    
    // 优先从新的media格式获取
    const fromInput = inputDataList.find((d) => d?.media?.imageList?.length > 0);
    if (fromInput?.media?.imageList?.[0]) {
      imageUrl = fromInput.media.imageList[0].url;
      fileName = fromInput.media.imageList[0].fileName;
    }
    // 如果没有，从节点自身获取
    else if (node?.data?.media?.imageList?.[0]) {
      imageUrl = node.data.media.imageList[0].url;
      fileName = node.data.media.imageList[0].fileName;
    }
    // 向后兼容：从旧的imageUrl格式获取
    else {
      const fromInputOld = inputDataList.find((d) => !!d?.imageUrl);
      imageUrl = fromInputOld?.imageUrl ?? '';
      fileName = fromInputOld?.fileName ?? node?.data?.fileName ?? 'image';
    }

    // 返回新的media格式
    return {
      media: {
        imageList: [{
          url: imageUrl,
          fileName: fileName,
          timestamp: Date.now()
        }]
      },
      fileName,
      timestamp: Date.now(),
    };
  },
};


