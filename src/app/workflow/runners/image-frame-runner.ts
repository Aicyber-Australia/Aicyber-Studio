import { WorkflowNodeData, AppNode, WorkflowNodeProps } from '../components/nodes';
import { NodeRunner } from './types';

export const ImageFrameNodeRunner: NodeRunner = {
  nodeType: 'image-frame',

  canRun: (node: WorkflowNodeProps) => node?.type === 'image-frame',

  validate: (node: WorkflowNodeProps, inputDataList: WorkflowNodeData[], setNodes?: any) => {
    console.log('🔄 Frame Validate - Input data list:', inputDataList);
    
    // 收集所有输入图片数据
    const allImages: Array<{
      url: string;
      data?: string;
      fileName: string;
      timestamp?: number;
    }> = [];
    inputDataList.forEach((inputData: WorkflowNodeData) => {
      // 支持新格式 imageList
      if (inputData?.media?.imageList) {
        console.log('🔄 Frame Validate - Found imageList:', inputData.media.imageList.length);
        allImages.push(...inputData.media.imageList);
      }
      // 兼容旧格式 mediaList（从 action node 返回）
      else if (inputData?.media?.mediaList) {
        const images = inputData.media.mediaList.filter((m: any) => m.type === 'image');
        console.log('🔄 Frame Validate - Found mediaList, filtered images:', images.length);
        allImages.push(...images);
      }
    });
    
    console.log('🔄 Frame Validate - Total images collected:', allImages.length);

    // 如果检测到多张图片，自动转换为Set类型
    if (allImages.length > 1 && setNodes) {
      console.log('🔄 Converting Frame to Set - allImages:', allImages);
      console.log('🔄 Converting Frame to Set - allImages.length:', allImages.length);
      
      setNodes((nodes: WorkflowNodeProps[]) => nodes.map((n: WorkflowNodeProps) => 
        n.id === node.id 
          ? { 
              ...n, 
              type: 'image-set',
              data: { 
                ...n.data, 
                title: `Image Set (${allImages.length})`,
                status: 'success',
                media: {
                  imageList: allImages
                }
              } 
            }
          : n
      ));
      
      console.log(`✅ Node ${node.id} automatically converted from image-frame to image-set (${allImages.length} images)`);
      return { isValid: true };
    }

    // 如果节点本身有多个图片，也转换为Set
    if ((node?.data?.media?.imageList?.length ?? 0) > 1 && setNodes) {
      const imageCount = node.data?.media?.imageList?.length ?? 0;
      const existingImages = node.data?.media?.imageList || [];
      setNodes((nodes: WorkflowNodeProps[]) => nodes.map((n: WorkflowNodeProps) => 
        n.id === node.id 
          ? { 
              ...n, 
              type: 'image-set',
              data: { 
                ...n.data, 
                title: `Image Set (${imageCount})`,
                status: 'success',
                media: {
                  imageList: existingImages
                }
              } 
            }
          : n
      ));
      
      console.log(`Node ${node.id} automatically converted from image-frame to image-set (${imageCount} images)`);
      return { isValid: true };
    }
    
    // 单图验证：有输入图片或自身有图片
    if (allImages.length === 1 || (node?.data?.media?.imageList?.length ?? 0) > 0) {
      return { isValid: true };
    }

    return { isValid: false };
  },

  run: async (node: any, inputDataList: any[], updateNodeData?: (data: any) => void) => {
    console.log('🔄 Frame Runner - Starting run for node:', node.id);
    console.log('🔄 Frame Runner - Node type:', node.type);
    console.log('🔄 Frame Runner - Input data list length:', inputDataList.length);
    
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (node.type === 'image-set') {
      console.log('🔄 Frame Runner - Node is already image-set, skipping frame runner');
      return {};
    }
    
    console.log('🔄 Frame Runner - Processing frame node...');

    // 从inputDataList中提取图片数据
    let imageUrl = '';
    let fileName = 'image';
    
    // 优先从 imageList 格式获取
    const fromImageList = inputDataList.find((d) => d?.media?.imageList?.length > 0);
    if (fromImageList?.media?.imageList?.[0]) {
      imageUrl = fromImageList.media.imageList[0].url;
      fileName = fromImageList.media.imageList[0].fileName;
    }
    // 兼容从 mediaList 格式获取（从 action node 返回）
    else {
      const fromMediaList = inputDataList.find((d) => d?.media?.mediaList?.length > 0);
      if (fromMediaList?.media?.mediaList) {
        const firstImage = fromMediaList.media.mediaList.find((m: any) => m.type === 'image');
        if (firstImage) {
          imageUrl = firstImage.url;
          fileName = firstImage.fileName || 'image';
        }
      }
      // 如果没有输入，从节点自身获取
      else if (node?.data?.media?.imageList?.[0]) {
        imageUrl = node.data.media.imageList[0].url;
        fileName = node.data.media.imageList[0].fileName;
      }
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


