import { ApiCallFunction, ServiceNode, InputData, MediaItem } from './types';
import { gemini25FlashImage } from './supabase/image-to-image/gemini-2-5-flash-image';
import { qwenImageEdit } from './supabase/image-to-image/qwen-image-edit';
import { wanImageEdit } from './supabase/image-to-image/wan-image-edit';
import { ImageCreateRequest } from '@/types/request/image-create-request';
import { SupabaseImageResponse } from '@/types/response/image-response';

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

// 提取图片列表 - 支持新的media格式和MediaSet格式
const extractImageList = (inputDataList: InputData[]): MediaItem[] => {
  const imageList: MediaItem[] = [];

  inputDataList.forEach(data => {
    if (!data) return;

    // Handle MediaSet format (from action-node-runner)
    if ('mediaList' in data && Array.isArray(data.mediaList)) {
      data.mediaList.forEach((item: any) => {
        if (item.type === 'image' && item.url) {
          imageList.push({
            url: item.url,
            data: undefined,
            fileName: item.fileName
          });
        }
      });
      return;
    }

    // Handle InputData format (legacy)
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

// 提取视频列表 - 支持新的media格式和MediaSet格式
const extractVideoList = (inputDataList: InputData[]): MediaItem[] => {
  const videoList: MediaItem[] = [];

  inputDataList.forEach(data => {
    if (!data) return;

    // Handle MediaSet format (from action-node-runner)
    if ('mediaList' in data && Array.isArray(data.mediaList)) {
      data.mediaList.forEach((item: any) => {
        if (item.type === 'video' && item.url) {
          videoList.push({
            url: item.url,
            data: undefined,
            fileName: item.fileName
          });
        }
      });
      return;
    }

    // Handle InputData format (legacy)
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

// Model selector - routes to different Supabase edge functions based on model selection
const callImageToImageAPI = async (
  model: string,
  request: ImageCreateRequest
): Promise<SupabaseImageResponse> => {
  switch (model?.toLowerCase()) {
    case 'gemini-2-5-flash':
    case 'gemini':
      return await gemini25FlashImage(request);
    case 'qwen':
    case 'qwen-image-edit':
      return await qwenImageEdit(request);
    case 'wan':
    case 'wan-image-edit':
      return await wanImageEdit(request);
    default:
      // Default to Qwen if no model specified
      return await qwenImageEdit(request);
  }
};

// Transform Supabase response to match the existing mock structure
const transformSupabaseResponse = (
  supabaseResponse: SupabaseImageResponse,
  model: string,
  method: string,
  prompt: string
) => {
  // Check if it's an error response
  if ('error' in supabaseResponse) {
    throw new Error(supabaseResponse.error);
  }

  // Extract URLs from response
  const urls = Array.isArray(supabaseResponse.url)
    ? supabaseResponse.url
    : [supabaseResponse.url];

  // Transform to the existing structure
  return {
    media: {
      imageList: urls.map((url, index) => ({
        url,
        fileName: `${method}-${model}-${Date.now()}-${index}.jpg`,
        data: null
      }))
    },
    metadata: {
      model,
      method,
      prompt,
      status: supabaseResponse.status,
      timestamp: new Date().toISOString(),
      ...(('task_id' in supabaseResponse) && { task_id: supabaseResponse.task_id }),
      ...(('request_id' in supabaseResponse) && { request_id: supabaseResponse.request_id })
    }
  };
};

// Image-to-image API call using Supabase edge functions
async function callImageToImageEndpoint(node: ServiceNode, inputDataList: InputData[]) {
  const { prompt, selectedModel } = node.data;
  const method = getMethodByNodeType(node.type);
  const imageList = extractImageList(inputDataList);

  console.log('🖼️ Calling Supabase Image-to-Image API - model:', selectedModel, 'method:', method);

  // Validate we have at least one image
  if (!imageList || imageList.length === 0) {
    throw new Error('No input images provided for image-to-image processing');
  }

  // Extract image URLs (prefer URL over data)
  const imageUrls = imageList.map(img => img.url || img.data).filter(Boolean) as string[];

  if (imageUrls.length === 0) {
    throw new Error('No valid image URLs found in input data');
  }

  // Prepare request for Supabase edge function
  const request: ImageCreateRequest = {
    input: {
      prompt: prompt || '',
      images: imageUrls // Pass all image URLs
    },
  };

  // Call the appropriate model's edge function
  const supabaseResponse = await callImageToImageAPI(selectedModel || 'qwen', request);

  // Transform response to match existing structure
  return transformSupabaseResponse(supabaseResponse, selectedModel || 'qwen', method, prompt || '');
}

// 图片生成服务 (Text-to-Image) - Currently using mock
export const imageGenerationService: ApiCallFunction = async (node, inputDataList) => {
  try {
    console.log('🖼️ Image Generation Service called (MOCK MODE)');
    const { prompt, selectedModel } = node.data;
    const method = getMethodByNodeType(node.type);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Return mock image data
    return {
      media: {
        imageList: [
          {
            url: 'https://picsum.photos/seed/' + Date.now() + '/512/512',
            fileName: `mock-${method}-${Date.now()}.jpg`,
            data: null
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
  } catch (error) {
    console.error('Image Generation Service error:', error);
    throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// 图片编辑服务 (Image-to-Image)
export const imageEditingService: ApiCallFunction = async (node, inputDataList) => {
  try {
    console.log('✏️ Image Editing Service called');
    console.log('Node data:', node.data);
    console.log('Input data list:', inputDataList);
    const result = await callImageToImageEndpoint(node, inputDataList);
    console.log('✏️ Image Editing Service result:', result);
    return result;
  } catch (error) {
    console.error('Image Editing Service error:', error);
    throw new Error(`Image editing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// 图片复制服务 (Image Replication) - Uses image-to-image API
export const imageReplicationService: ApiCallFunction = async (node, inputDataList) => {
  try {
    console.log('🔄 Image Replication Service called');
    return await callImageToImageEndpoint(node, inputDataList);
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