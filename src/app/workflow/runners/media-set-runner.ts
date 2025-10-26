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

  run: async (node: any, inputDataList: any[], updateNodeData?: (data: any) => void) => {
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
      mediaList: Array<{ id: string; type: 'image' | 'text' | 'video'; url?: string; content?: string; fileName: string; timestamp: number; }>;
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

    // Convert all media to unified mediaList format
    const unifiedMediaList: Array<{
      id: string;
      type: 'image' | 'text' | 'video';
      url?: string;
      content?: string;
      fileName: string;
      timestamp: number;
    }> = [];

    // Add existing mediaList items
    unifiedMediaList.push(...allMedia.mediaList);

    // Convert imageList to mediaList format
    allMedia.imageList.forEach((image) => {
      unifiedMediaList.push({
        id: `media-${Date.now()}-${Math.random()}`,
        type: 'image',
        url: image.url,
        fileName: image.fileName,
        timestamp: image.timestamp || Date.now()
      });
    });

    // Convert videoList to mediaList format
    allMedia.videoList.forEach((video) => {
      unifiedMediaList.push({
        id: `media-${Date.now()}-${Math.random()}`,
        type: 'video',
        url: video.url,
        fileName: video.fileName,
        timestamp: video.timestamp || Date.now()
      });
    });

    // Convert textList to mediaList format
    allMedia.textList.forEach((text, index) => {
      unifiedMediaList.push({
        id: `media-${Date.now()}-${Math.random()}`,
        type: 'text',
        content: text,
        fileName: `text-${index + 1}.txt`,
        timestamp: Date.now()
      });
    });

    console.log('🔄 MediaSet Runner - unifiedMediaList:', unifiedMediaList);

    // Return merged media in unified format
    const result = {
      media: {
        mediaList: unifiedMediaList
      },
      fileName: `media-set-${unifiedMediaList.length}`,
      timestamp: Date.now(),
    };

    console.log('🔄 MediaSet Runner - returning result:', result);
    return result;
  },
};
