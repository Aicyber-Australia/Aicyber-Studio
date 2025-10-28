import { NodeRunner } from './types';

export const VideoSetNodeRunner: NodeRunner = {
  nodeType: 'video-set',

  canRun: (node: any) => node?.type === 'video-set',

  validate: (node: any, inputDataList: any[], setNodes?: any) => {
    // Set节点不需要自动转换，保持Set类型
    // 多视频验证逻辑
    const fromInput = inputDataList.find((d) =>
      d?.media?.videoList?.length > 0 || d?.videoUrl
    );
    const own = node?.data?.media?.videoList?.length > 0;

    if (!fromInput && !own) {
      return { isValid: false, error: `${node?.data?.title || '节点'} 需要视频数据` };
    }
    return { isValid: true };
  },

  run: async (node: any, inputDataList: any[], updateNodeData?: (data: any) => void) => {
    console.log('🔄 VideoSet Runner - Starting run for node:', node.id);
    console.log('🔄 VideoSet Runner - Node type:', node.type);
    console.log('🔄 VideoSet Runner - Input data list length:', inputDataList.length);

    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log('🔄 VideoSet Runner - inputDataList:', inputDataList);
    console.log('🔄 VideoSet Runner - node.data:', node.data);
    console.log('🔄 VideoSet Runner - node.type:', node.type);

    // 收集所有输入视频数据
    const allVideos: Array<{
      url: string;
      data?: string;
      fileName: string;
      timestamp?: number;
    }> = [];

    // 从inputDataList中提取所有视频
    inputDataList.forEach((inputData, index) => {
      console.log(`🔄 VideoSet Runner - inputData[${index}]:`, inputData);
      if (inputData?.media?.videoList) {
        console.log(`🔄 VideoSet Runner - found media.videoList in input[${index}]:`, inputData.media.videoList);
        allVideos.push(...inputData.media.videoList);
      }
    });

    console.log('🔄 VideoSet Runner - allVideos from input:', allVideos);
    console.log('🔄 VideoSet Runner - allVideos.length from input:', allVideos.length);

    // 如果没有输入数据，从节点自身获取
    const hasInputData = inputDataList.length > 0;
    if (allVideos.length === 0 && node?.data?.media?.videoList) {
      console.log('🔄 VideoSet Runner - using node data:', node.data.media.videoList);
      allVideos.push(...node.data.media.videoList);
    }

    console.log('🔄 VideoSet Runner - final allVideos:', allVideos);
    console.log('🔄 VideoSet Runner - final allVideos.length:', allVideos.length);

    // Determine which videos to pass downstream
    // Apply process limit only if there's no input data (no incoming edges during execution)
    // and processLimitMode is set to 'limited'
    let downstreamVideos = allVideos;
    if (!hasInputData && node?.data?.processLimitMode === 'limited' && node?.data?.processLimit) {
      const limit = node.data.processLimit;
      downstreamVideos = allVideos.slice(0, limit);
      console.log(`🔄 VideoSet Runner - applying process limit for downstream: ${limit}, passing ${downstreamVideos.length} of ${allVideos.length} items`);
    }

    // 返回结果：downstreamVideos传递给下游节点
    // DO NOT update node data - keep the original items displayed in the UI
    const result = {
      media: {
        videoList: downstreamVideos  // Only pass limited items downstream
      },
      fileName: `video-set-${downstreamVideos.length}`,
      timestamp: Date.now(),
    };

    console.log('🔄 VideoSet Runner - returning result (downstream):', result);
    console.log('🔄 VideoSet Runner - passing downstream:', downstreamVideos.length, 'of', allVideos.length, 'total videos');
    return result;
  },
};
