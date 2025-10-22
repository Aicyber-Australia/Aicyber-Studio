import { NodeRunner } from './types';

export const MediaSetNodeRunner: NodeRunner = {
  nodeType: 'media-set',

  canRun: (node: any) => node?.type === 'media-set',

  validate: (node: any, inputDataList: any[], setNodes?: any) => {
    // MediaSet can accept mixed media types
    const fromInput = inputDataList.find((d) =>
      d?.media?.imageList?.length > 0 ||
      d?.media?.videoList?.length > 0 ||
      d?.media?.textList?.length > 0 ||
      d?.media?.mediaList?.length > 0
    );
    const own = node?.data?.media?.mediaList?.length > 0 ||
                node?.data?.media?.imageList?.length > 0 ||
                node?.data?.media?.videoList?.length > 0 ||
                node?.data?.media?.textList?.length > 0;

    if (!fromInput && !own) {
      return { isValid: false, error: `${node?.data?.title || '节点'} 需要媒体数据` };
    }
    return { isValid: true };
  },

  run: async (node: any, inputDataList: any[]) => {
    console.log('🔄 MediaSet Runner - Starting run for node:', node.id);
    console.log('🔄 MediaSet Runner - Node type:', node.type);
    console.log('🔄 MediaSet Runner - Input data list length:', inputDataList.length);

    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log('🔄 MediaSet Runner - inputDataList:', inputDataList);
    console.log('🔄 MediaSet Runner - node.data:', node.data);

    // Collect all media from inputs
    const allMedia: {
      imageList: Array<{ url: string; data?: string; fileName: string; timestamp?: number; }>;
      videoList: Array<{ url: string; data?: string; fileName: string; timestamp?: number; }>;
      textList: string[];
      mediaList: Array<{ id: string; type: 'image' | 'text'; url?: string; content?: string; fileName: string; timestamp: number; }>;
    } = {
      imageList: [],
      videoList: [],
      textList: [],
      mediaList: []
    };

    // Extract all media from inputs
    inputDataList.forEach((inputData, index) => {
      console.log(`🔄 MediaSet Runner - inputData[${index}]:`, inputData);

      if (inputData?.media?.imageList) {
        console.log(`🔄 MediaSet Runner - found imageList in input[${index}]:`, inputData.media.imageList);
        allMedia.imageList.push(...inputData.media.imageList);
      }

      if (inputData?.media?.videoList) {
        console.log(`🔄 MediaSet Runner - found videoList in input[${index}]:`, inputData.media.videoList);
        allMedia.videoList.push(...inputData.media.videoList);
      }

      if (inputData?.media?.textList) {
        console.log(`🔄 MediaSet Runner - found textList in input[${index}]:`, inputData.media.textList);
        allMedia.textList.push(...inputData.media.textList);
      }

      if (inputData?.media?.mediaList) {
        console.log(`🔄 MediaSet Runner - found mediaList in input[${index}]:`, inputData.media.mediaList);
        allMedia.mediaList.push(...inputData.media.mediaList);
      }
    });

    console.log('🔄 MediaSet Runner - allMedia from input:', allMedia);

    // If no input data, use node's own data
    if (allMedia.imageList.length === 0 &&
        allMedia.videoList.length === 0 &&
        allMedia.textList.length === 0 &&
        allMedia.mediaList.length === 0) {

      if (node?.data?.media?.imageList) {
        console.log('🔄 MediaSet Runner - using node imageList:', node.data.media.imageList);
        allMedia.imageList.push(...node.data.media.imageList);
      }
      if (node?.data?.media?.videoList) {
        console.log('🔄 MediaSet Runner - using node videoList:', node.data.media.videoList);
        allMedia.videoList.push(...node.data.media.videoList);
      }
      if (node?.data?.media?.textList) {
        console.log('🔄 MediaSet Runner - using node textList:', node.data.media.textList);
        allMedia.textList.push(...node.data.media.textList);
      }
      if (node?.data?.media?.mediaList) {
        console.log('🔄 MediaSet Runner - using node mediaList:', node.data.media.mediaList);
        allMedia.mediaList.push(...node.data.media.mediaList);
      }
    }

    console.log('🔄 MediaSet Runner - final allMedia:', allMedia);

    // Clean up empty arrays
    const media: any = {};
    if (allMedia.imageList.length > 0) media.imageList = allMedia.imageList;
    if (allMedia.videoList.length > 0) media.videoList = allMedia.videoList;
    if (allMedia.textList.length > 0) media.textList = allMedia.textList;
    if (allMedia.mediaList.length > 0) media.mediaList = allMedia.mediaList;

    // Return merged media
    const result = {
      media,
      fileName: `media-set-${allMedia.imageList.length + allMedia.videoList.length + allMedia.textList.length + allMedia.mediaList.length}`,
      timestamp: Date.now(),
    };

    console.log('🔄 MediaSet Runner - returning result:', result);
    return result;
  },
};
