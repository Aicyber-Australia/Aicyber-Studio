import { ApiCallFunction, ServiceNode, InputData, MediaItem } from './types';

// 你的endpoint URL - 请替换为你的实际endpoint
const YOUR_ENDPOINT = 'https://your-api-endpoint.com/api';

// 根据node.type映射method
const getMethodByNodeType = (nodeType: string): string => {
  const methodMap: Record<string, string> = {
    'text-to-video-node': 'video-gen',
    'video-to-video-node': 'video-edit'
  };
  return methodMap[nodeType] || 'unknown';
};

// 提取图片列表 - 只支持新的media格式
const extractImageList = (inputDataList: InputData[]): MediaItem[] => {
  const imageList: MediaItem[] = [];

  inputDataList.forEach(data => {
    if (!data) return;

    // 新的media格式
    if (data.media?.imageList) {
      data.media.imageList.forEach((img) => {
        imageList.push({
          url: img.url,
          data: img.data,
          fileName: img.fileName
        });
      });
    }

  });

  return imageList;
};

// 提取视频列表 - 只支持新的media格式
const extractVideoList = (inputDataList: InputData[]): MediaItem[] => {
  const videoList: MediaItem[] = [];

  inputDataList.forEach(data => {
    if (!data) return;

    // 新的media格式
    if (data.media?.videoList) {
      data.media.videoList.forEach((video) => {
        videoList.push({
          url: video.url,
          data: video.data,
          fileName: video.fileName
        });
      });
    }

  });

  return videoList;
};

// 通用调用函数
async function callYourEndpoint(node: ServiceNode, inputDataList: InputData[]) {
  const { prompt, selectedModel } = node.data;
  const method = getMethodByNodeType(node.type);

  const response = await fetch(YOUR_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: selectedModel || 'default',
      method: method,
      media: {
        imageList: extractImageList(inputDataList),
        videoList: extractVideoList(inputDataList),
        prompt: prompt
      }
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

// 视频生成服务
export const videoGenerationService: ApiCallFunction = async (node, inputDataList) => {
  try {
    console.log('🎬 Video Generation Service called');
    return await callYourEndpoint(node, inputDataList);
  } catch (error) {
    console.error('Video Generation Service error:', error);
    throw new Error(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// 视频编辑服务
export const videoEditingService: ApiCallFunction = async (node, inputDataList) => {
  try {
    console.log('✂️ Video Editing Service called');
    return await callYourEndpoint(node, inputDataList);
  } catch (error) {
    console.error('Video Editing Service error:', error);
    throw new Error(`Video editing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// 视频服务映射 - 用于自动注册
export const videoServiceMap = {
  'text-to-video-node': videoGenerationService,
  'video-to-video-node': videoEditingService
};