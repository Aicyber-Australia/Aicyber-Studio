import { WorkflowNodeData, AppNode, WorkflowNodeProps } from '../components/nodes';
import { NodeRunner } from './types';

export const ImageFrameNodeRunner: NodeRunner = {
  nodeType: 'image-frame',

  canRun: (node: WorkflowNodeProps) => node?.type === 'image-frame',

  validate: (node: WorkflowNodeProps, inputDataList: WorkflowNodeData[], setNodes?: any) => {
    // 收集所有输入图片数据
    const allImages: Array<{
      url: string;
      data?: string;
      fileName: string;
      timestamp?: number;
    }> = [];
    inputDataList.forEach((inputData: WorkflowNodeData) => {
      if (inputData?.media?.imageList) {
        allImages.push(...inputData.media.imageList);
      }
    });

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


