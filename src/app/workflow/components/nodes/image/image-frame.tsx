'use client';

import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { ImagePlus } from 'lucide-react';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '@/app/workflow/config';
import { NodeHandle } from '@/app/workflow/components/nodes/workflow-node/node-handle';
import WorkflowNode from '@/app/workflow/components/nodes/workflow-node';
import { uploadFileToStorage } from '@/app/workflow/utils/upload-to-storage';

function ImageFrame({ id, data, selected }: WorkflowNodeProps) {
  const [imageError, setImageError] = useState<boolean>(false);
  
  // 使用 ReactFlow 官方 API
  const { setNodes } = useReactFlow();

  // 从 media.imageList[0] 获取图片URL
  const imageData = data?.media?.imageList?.[0];
  const imageUrl = imageData?.url || '';
  
  // 检查节点是否正在处理
  const isProcessing = data?.status === 'loading';

  // 刷新按钮处理函数
  const handleRefresh = () => {
    setImageError(false);
    
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageError(false);

      // Show loading state immediately with blob URL
      const blobUrl = URL.createObjectURL(file);
      const mediaData = {
        imageList: [{
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
          imageList: [{
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

        console.log(`Node ${id} uploaded image to Supabase:`, { imageUrl: uploadedUrl, fileName: file.name });
      } catch (error) {
        console.error(`Failed to upload image for node ${id}:`, error);
        setImageError(true);
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

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <WorkflowNode id={id} data={data} type="image-frame" onRefresh={handleRefresh} selected={selected}>
      <div className="w-full flex-1 flex items-center justify-center p-3 min-h-0">
        {/* 图片显示区域 - 长方形，随节点缩放 */}
        <div
          className={`w-full border-2 rounded-2xl flex items-center justify-center overflow-auto cursor-pointer hover:border-gray-400 transition-colors relative ${
            imageUrl && !imageError ? 'border-solid border-gray-300' : 'border-dashed border-gray-300'
          }`}
          style={{ aspectRatio: '16/14', maxHeight: '100%' }}
          onClick={() => document.getElementById(`image-upload-${id}`)?.click()}
        >
          {imageUrl && !imageError ? (
            <>
              <img
                src={imageUrl}
                alt="Display"
                className="w-full h-full object-cover rounded-2xl"
                onError={handleImageError}
              />
              {/* 节点处理时的加载动画 - 在图片区域正中间 */}
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-2xl">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              )}
            </>
          ) : imageError ? (
            <div className="text-red-500 text-xs text-center">加载失败</div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2" title="click to add image">
              <ImagePlus className="w-8 h-8 text-gray-400" />
              <span className="text-gray-500 text-xs">click to add image</span>
            </div>
          )}
        </div>
        
        {/* 隐藏的文件上传输入 */}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          id={`image-upload-${id}`}
        />
      </div>
      
      {/* Handle 配置 */}
      {nodesConfig['image-frame'].handles.map((handle) => (
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

export default ImageFrame;
