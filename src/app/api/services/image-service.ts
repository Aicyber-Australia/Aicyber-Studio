import { ApiCallFunction, ServiceNode, InputData, MediaItem } from './types';

// 你的endpoint URL - 请替换为你的实际endpoint
const YOUR_ENDPOINT = 'https://your-api-endpoint.com/api';

// 根据node.type映射method
const getMethodByNodeType = (nodeType: string): string => {
  const methodMap: Record<string, string> = {
    'text-to-image-node': 'image-gen',
    'image-to-image-node': 'image-edit',
    'image-replicate-node': 'image-replicate',
    'image-to-text-node': 'image-describe',
    'edit-image-node': 'image-edit',
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

// 提取视频列表 - 支持新的media格式和旧格式
const extractVideoList = (inputDataList: InputData[]): MediaItem[] => {
  const videoList: MediaItem[] = [];

  inputDataList.forEach(data => {
    if (!data) return;

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

  // ===== MOCK MODE: Comment out real API call for testing =====
  // const response = await fetch(YOUR_ENDPOINT, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     model: selectedModel || 'default',
  //     method: method,
  //     media: {
  //       imageList: extractImageList(inputDataList),
  //       videoList: extractVideoList(inputDataList),
  //       prompt: prompt
  //     }
  //   })
  // });

  // if (!response.ok) {
  //   throw new Error(`HTTP error! status: ${response.status}`);
  // }

  // const result = await response.json();

  // if (result.error) {
  //   throw new Error(result.error);
  // }

  // return result;

  // ===== MOCK RESPONSE: Return mock image for testing =====
  console.log('🎭 Using MOCK response - prompt:', prompt, 'model:', selectedModel, 'method:', method);

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Return mock image data
  return {
    media: {
      imageList: [
        {
          url: 'https://picsum.photos/seed/' + Date.now() + '/512/512',
          fileName: `mock-${method}-${Date.now()}.jpg`,
          data: null // Or you can add base64 data if needed
        }
      ]
    },
    metadata: {
      model: selectedModel || 'mock-model',
      method: method,
      prompt: prompt,
      timestamp: new Date().toISOString()
    }
  };
}

// 图片生成服务
export const imageGenerationService: ApiCallFunction = async (node, inputDataList) => {
  try {
    console.log('🖼️ Image Generation Service called');
    return await callYourEndpoint(node, inputDataList);
  } catch (error) {
    console.error('Image Generation Service error:', error);
    throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// 图片编辑服务
export const imageEditingService: ApiCallFunction = async (node, inputDataList) => {
  try {
    console.log('✏️ Image Editing Service called');
    console.log('Node data:', node.data);
    console.log('Input data list:', inputDataList);
    const result = await callYourEndpoint(node, inputDataList);
    console.log('✏️ Image Editing Service result:', result);
    return result;
  } catch (error) {
    console.error('Image Editing Service error:', error);
    throw new Error(`Image editing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// 图片复制服务
export const imageReplicationService: ApiCallFunction = async (node, inputDataList) => {
  try {
    console.log('🔄 Image Replication Service called');
    return await callYourEndpoint(node, inputDataList);
  } catch (error) {
    console.error('Image Replication Service error:', error);
    throw new Error(`Image replication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// 图片转文字服务 (Image to Text / Describe)
export const imageToTextService: ApiCallFunction = async (node, inputDataList) => {
  try {
    console.log('📝 Image to Text Service called');
    // Mock response - return a description of the image
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      media: {
        textList: [
          `This is a mock description of the image. Prompt: ${node.data.prompt || 'No prompt provided'}`
        ]
      },
      metadata: {
        model: node.data.selectedModel || 'mock-model',
        method: 'image-describe',
        prompt: node.data.prompt,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Image to Text Service error:', error);
    throw new Error(`Image to text failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// 图片编辑服务 (Edit Image)
export const editImageService: ApiCallFunction = async (node, inputDataList) => {
  try {
    console.log('✏️ Edit Image Service called');
    console.log('Node data:', node.data);
    console.log('Input data list:', inputDataList);

    // Check if user has saved an edited image in the node
    const editedImage = node.data.media?.imageList?.[0];

    // If there's an edited image saved in the node, use it
    if (editedImage) {
      console.log('✏️ Using edited image from node');
      return {
        media: {
          imageList: [editedImage]
        },
        metadata: {
          model: 'edit-image',
          method: 'image-edit',
          timestamp: new Date().toISOString()
        }
      };
    }

    // Otherwise, pass through the input image (user hasn't edited yet or didn't save)
    if (inputDataList && inputDataList.length > 0) {
      const inputImage = inputDataList[0]?.media?.imageList?.[0];
      if (inputImage) {
        console.log('✏️ Passing through input image (no edits saved)');
        return {
          media: {
            imageList: [inputImage]
          },
          metadata: {
            model: 'edit-image',
            method: 'image-edit-passthrough',
            timestamp: new Date().toISOString()
          }
        };
      }
    }

    throw new Error('No image found to edit or pass through');
  } catch (error) {
    console.error('Edit Image Service error:', error);
    throw new Error(`Image editing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// 图片服务映射 - 用于自动注册
export const imageServiceMap = {
  'text-to-image-node': imageGenerationService,
  'image-to-image-node': imageEditingService,
  'image-replicate-node': imageReplicationService,
  'image-to-text-node': imageToTextService,
  'edit-image-node': editImageService
};