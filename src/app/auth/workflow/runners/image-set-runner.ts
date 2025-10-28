import { NodeRunner } from './types';

export const ImageSetNodeRunner: NodeRunner = {
  nodeType: 'image-set',

  canRun: (node: any) => node?.type === 'image-set',

  validate: (node: any, inputDataList: any[], setNodes?: any) => {
    // Set节点不需要自动转换，保持Set类型
    // 多图验证逻辑
    const fromInput = inputDataList.find((d) => 
      d?.media?.imageList?.length > 0 || d?.imageUrl
    );
    const own = node?.data?.media?.imageList?.length > 0;

    if (!fromInput && !own) {
      return { isValid: false, error: `${node?.data?.title || '节点'} 需要图片数据` };
    }
    return { isValid: true };
  },

  run: async (node: any, inputDataList: any[], updateNodeData?: (data: any) => void) => {
    console.log('🔄 ImageSet Runner - Starting run for node:', node.id);
    console.log('🔄 ImageSet Runner - Node type:', node.type);
    console.log('🔄 ImageSet Runner - Input data list length:', inputDataList.length);

    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log('🔄 ImageSet Runner - inputDataList:', inputDataList);
    console.log('🔄 ImageSet Runner - node.data:', node.data);
    console.log('🔄 ImageSet Runner - node.type:', node.type);

    // 收集所有输入图片数据
    const allImages: Array<{
      url: string;
      data?: string;
      fileName: string;
      timestamp?: number;
    }> = [];

    // 从inputDataList中提取所有图片
    inputDataList.forEach((inputData, index) => {
      console.log(`🔄 ImageSet Runner - inputData[${index}]:`, inputData);
      if (inputData?.media?.imageList) {
        console.log(`🔄 ImageSet Runner - found media.imageList in input[${index}]:`, inputData.media.imageList);
        allImages.push(...inputData.media.imageList);
      }


    });

    console.log('🔄 ImageSet Runner - allImages from input:', allImages);
    console.log('🔄 ImageSet Runner - allImages.length from input:', allImages.length);

    // 如果没有输入数据，从节点自身获取
    const hasInputData = inputDataList.length > 0;
    if (allImages.length === 0 && node?.data?.media?.imageList) {
      console.log('🔄 ImageSet Runner - using node data:', node.data.media.imageList);
      allImages.push(...node.data.media.imageList);
    }

    console.log('🔄 ImageSet Runner - final allImages:', allImages);
    console.log('🔄 ImageSet Runner - final allImages.length:', allImages.length);

    // Determine which images to pass downstream
    // Apply process limit only if there's no input data (no incoming edges during execution)
    // and processLimitMode is set to 'limited'
    let downstreamImages = allImages;
    if (!hasInputData && node?.data?.processLimitMode === 'limited' && node?.data?.processLimit) {
      const limit = node.data.processLimit;
      downstreamImages = allImages.slice(0, limit);
      console.log(`🔄 ImageSet Runner - applying process limit for downstream: ${limit}, passing ${downstreamImages.length} of ${allImages.length} items`);
    }

    // 返回结果：downstreamImages传递给下游节点
    // DO NOT update node data - keep the original items displayed in the UI
    const result = {
      media: {
        imageList: downstreamImages  // Only pass limited items downstream
      },
      fileName: `image-set-${downstreamImages.length}`,
      timestamp: Date.now(),
    };

    console.log('🔄 ImageSet Runner - returning result (downstream):', result);
    console.log('🔄 ImageSet Runner - passing downstream:', downstreamImages.length, 'of', allImages.length, 'total images');
    return result;
  },
};
