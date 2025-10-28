'use client';

import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '@/app/workflow/config';
import { NodeHandle } from '@/app/workflow/components/nodes/workflow-node/node-handle';
import WorkflowNode from '@/app/workflow/components/nodes/workflow-node';
import { uploadFileToStorage } from '@/app/workflow/utils/upload-to-storage';

function VideoFrame({ id, data, selected }: WorkflowNodeProps) {
  const [videoError, setVideoError] = useState<boolean>(false);

  // 使用 ReactFlow 官方 API
  const { setNodes } = useReactFlow();

  // 从 media.videoList[0] 获取视频URL
  const videoData = data?.media?.videoList?.[0];
  const videoUrl = videoData?.url || '';

  // 检查节点是否正在处理
  const isProcessing = data?.status === 'loading';

  // 刷新按钮处理函数
  const handleRefresh = () => {
    setVideoError(false);

    // 直接清除节点数据
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              fileName: undefined,
              timestamp: undefined,
              outputData: undefined,
              media: undefined
            }
          }
        : node
    ));
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoError(false);

      // Show loading state immediately with blob URL
      const blobUrl = URL.createObjectURL(file);
      const mediaData = {
        videoList: [{
          url: blobUrl,
          fileName: file.name,
          timestamp: Date.now()
        }]
      };

      setNodes(nodes => nodes.map(node =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                media: mediaData,
                fileName: file.name,
                timestamp: Date.now(),
                status: 'loading'
              }
            }
          : node
      ));

      try {
        // Upload to Supabase storage
        const uploadedUrl = await uploadFileToStorage(file);

        // Update with the Supabase URL
        const updatedMediaData = {
          videoList: [{
            url: uploadedUrl,
            fileName: file.name,
            timestamp: Date.now()
          }]
        };

        setNodes(nodes => nodes.map(node =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  media: updatedMediaData,
                  fileName: file.name,
                  timestamp: Date.now(),
                  status: 'success'
                }
              }
            : node
        ));

        // Revoke the blob URL to free memory
        URL.revokeObjectURL(blobUrl);

        console.log(`Node ${id} uploaded video to Supabase:`, { videoUrl: uploadedUrl, fileName: file.name });
      } catch (error) {
        console.error(`Failed to upload video for node ${id}:`, error);
        setVideoError(true);
        setNodes(nodes => nodes.map(node =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  status: 'error'
                }
              }
            : node
        ));
      }
    }
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  return (
    <WorkflowNode id={id} data={data} type="video-frame" onRefresh={handleRefresh} selected={selected}>
      <div className="w-full flex-1 flex items-center justify-center p-3 min-h-0">
        {/* 视频显示区域 - 16:9比例，随节点缩放 */}
        <div
          className="w-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-auto cursor-pointer hover:border-gray-400 transition-colors relative"
          style={{ aspectRatio: '16/9', maxHeight: '100%' }}
          onClick={() => document.getElementById(`video-upload-${id}`)?.click()}
        >
          {videoUrl && !videoError ? (
            <>
              <video
                src={videoUrl}
                className="w-full h-full object-cover rounded-md"
                controls
                onError={handleVideoError}
              />
              {/* 节点处理时的加载动画 - 在视频区域正中间 */}
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-md">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              )}
            </>
          ) : videoError ? (
            <div className="text-red-500 text-xs text-center">加载失败</div>
          ) : (
            <div className="text-gray-500 text-xs text-center">点击上传</div>
          )}
        </div>

        {/* 隐藏的文件上传输入 */}
        <input
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          className="hidden"
          id={`video-upload-${id}`}
        />
      </div>

      {/* Handle 配置 */}
      {nodesConfig['video-frame'].handles.map((handle) => (
        <NodeHandle
          key={`${handle.type}-${handle.id}`}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          x={handle.x}
          y={handle.y}
        />
      ))}
    </WorkflowNode>
  );
}

export default VideoFrame;
