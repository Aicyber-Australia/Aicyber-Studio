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

  run: async (node: any, inputDataList: any[]) => {
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
    if (allVideos.length === 0 && node?.data?.media?.videoList) {
      console.log('🔄 VideoSet Runner - using node data:', node.data.media.videoList);
      allVideos.push(...node.data.media.videoList);
    }

    console.log('🔄 VideoSet Runner - final allVideos:', allVideos);
    console.log('🔄 VideoSet Runner - final allVideos.length:', allVideos.length);

    // 返回合并后的视频列表
    const result = {
      media: {
        videoList: allVideos
      },
      fileName: `video-set-${allVideos.length}`,
      timestamp: Date.now(),
    };

    console.log('🔄 VideoSet Runner - returning result:', result);
    return result;
  },
};
