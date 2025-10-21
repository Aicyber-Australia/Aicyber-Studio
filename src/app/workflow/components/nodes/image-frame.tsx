'use client';

import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '../../config';
import { NodeHandle } from './workflow-node/node-handle';
import WorkflowNode from './workflow-node';

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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImageError(false);
      
      // 使用新的media格式更新节点数据
      const mediaData = {
        imageList: [{
          url: url,
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
                timestamp: Date.now()
              } 
            }
          : node
      ));
      
      console.log(`Node ${id} uploaded image:`, { imageUrl: url, fileName: file.name });
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <WorkflowNode id={id} data={data} onRefresh={handleRefresh} selected={selected}>
      <div className="w-full flex-1 flex items-center justify-center p-3 min-h-0">
        {/* 图片显示区域 - 正方形，随节点缩放 */}
        <div
          className="aspect-square w-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-auto cursor-pointer hover:border-gray-400 transition-colors relative"
          style={{ maxHeight: '100%' }}
          onClick={() => document.getElementById(`image-upload-${id}`)?.click()}
        >
          {imageUrl && !imageError ? (
            <>
              <img
                src={imageUrl}
                alt="Display"
                className="w-full h-full object-cover rounded-md"
                onError={handleImageError}
              />
              {/* 节点处理时的加载动画 - 在图片区域正中间 */}
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-md">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              )}
            </>
          ) : imageError ? (
            <div className="text-red-500 text-xs text-center">加载失败</div>
          ) : (
            <div className="text-gray-500 text-xs text-center">点击上传</div>
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
