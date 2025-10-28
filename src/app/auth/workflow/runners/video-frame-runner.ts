import { WorkflowNodeData, AppNode, WorkflowNodeProps } from '../components/nodes';
import { NodeRunner } from './types';

export const VideoFrameNodeRunner: NodeRunner = {
  nodeType: 'video-frame',

  canRun: (node: WorkflowNodeProps) => node?.type === 'video-frame',

  validate: (node: WorkflowNodeProps, inputDataList: WorkflowNodeData[], setNodes?: any) => {
    // 收集所有输入视频数据
    const allVideos: Array<{
      url: string;
      data?: string;
      fileName: string;
      timestamp?: number;
    }> = [];
    inputDataList.forEach((inputData: WorkflowNodeData) => {
      if (inputData?.media?.videoList) {
        allVideos.push(...inputData.media.videoList);
      }
    });

    // 如果检测到多个视频，自动转换为Set类型
    if (allVideos.length > 1 && setNodes) {
      console.log('🔄 Converting Frame to Set - allVideos:', allVideos);
      console.log('🔄 Converting Frame to Set - allVideos.length:', allVideos.length);

      setNodes((nodes: WorkflowNodeProps[]) => nodes.map((n: WorkflowNodeProps) =>
        n.id === node.id
          ? {
              ...n,
              type: 'video-set',
              data: {
                ...n.data,
                title: `Video Set (${allVideos.length})`,
                status: 'success',
                media: {
                  videoList: allVideos
                }
              }
            }
          : n
      ));

      console.log(`✅ Node ${node.id} automatically converted from video-frame to video-set (${allVideos.length} videos)`);
      return { isValid: true };
    }

    // 如果节点本身有多个视频，也转换为Set
    if ((node?.data?.media?.videoList?.length ?? 0) > 1 && setNodes) {
      const videoCount = node.data?.media?.videoList?.length ?? 0;
      const existingVideos = node.data?.media?.videoList || [];
      setNodes((nodes: WorkflowNodeProps[]) => nodes.map((n: WorkflowNodeProps) =>
        n.id === node.id
          ? {
              ...n,
              type: 'video-set',
              data: {
                ...n.data,
                title: `Video Set (${videoCount})`,
                status: 'success',
                media: {
                  videoList: existingVideos
                }
              }
            }
          : n
      ));

      console.log(`Node ${node.id} automatically converted from video-frame to video-set (${videoCount} videos)`);
      return { isValid: true };
    }

    // 单视频验证：有输入视频或自身有视频
    if (allVideos.length === 1 || (node?.data?.media?.videoList?.length ?? 0) > 0) {
      return { isValid: true };
    }

    return { isValid: false };
  },

  run: async (node: any, inputDataList: any[], updateNodeData?: (data: any) => void) => {
    console.log('🔄 Frame Runner - Starting run for node:', node.id);
    console.log('🔄 Frame Runner - Node type:', node.type);
    console.log('🔄 Frame Runner - Input data list length:', inputDataList.length);

    await new Promise((resolve) => setTimeout(resolve, 300));

    if (node.type === 'video-set') {
      console.log('🔄 Frame Runner - Node is already video-set, skipping frame runner');
      return {};
    }

    console.log('🔄 Frame Runner - Processing frame node...');

    // 从inputDataList中提取视频数据
    let videoUrl = '';
    let fileName = 'video';

    // 优先从新的media格式获取
    const fromInput = inputDataList.find((d) => d?.media?.videoList?.length > 0);
    if (fromInput?.media?.videoList?.[0]) {
      videoUrl = fromInput.media.videoList[0].url;
      fileName = fromInput.media.videoList[0].fileName;
    }
    // 如果没有，从节点自身获取
    else if (node?.data?.media?.videoList?.[0]) {
      videoUrl = node.data.media.videoList[0].url;
      fileName = node.data.media.videoList[0].fileName;
    }

    // 返回新的media格式
    return {
      media: {
        videoList: [{
          url: videoUrl,
          fileName: fileName,
          timestamp: Date.now()
        }]
      },
      fileName,
      timestamp: Date.now(),
    };
  },
};
