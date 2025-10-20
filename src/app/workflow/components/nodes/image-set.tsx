'use client';

import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '../../config';
import { NodeHandle } from './workflow-node/node-handle';
import WorkflowNode from './workflow-node';

function ImageSet({ id, data, selected }: WorkflowNodeProps) {
  const [imageError, setImageError] = useState<boolean>(false);
  
  // 使用 ReactFlow 官方 API
  const { getNode, setNodes, getEdges } = useReactFlow();

  // 从 media.imageList 获取所有图片
  const imageList = data?.media?.imageList || [];
  
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
    const files = event.target.files;
    if (!files) return;
    
    const newImages = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        url: URL.createObjectURL(file),
        fileName: file.name,
        timestamp: Date.now()
      }));
    
    setImageError(false);
    
    // 更新节点数据，支持多图
    const mediaData = {
      imageList: [...imageList, ...newImages]
    };
    
    setNodes(nodes => nodes.map(node => 
      node.id === id 
        ? { 
            ...node, 
            data: { 
              ...node.data, 
              media: mediaData,
              title: `Image Set (${mediaData.imageList.length})`
            } 
          }
        : node
    ));
    
    console.log(`Node ${id} uploaded ${newImages.length} images:`, newImages);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // 计算网格布局
  const getGridLayout = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  return (
    <WorkflowNode id={id} data={data} onRefresh={handleRefresh} selected={selected}>
      <div className="w-full flex-1 flex items-center justify-center p-3">
        {/* 多图网格显示区域 */}
        <div
          className="w-full h-full min-h-[148px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:border-gray-400 transition-colors relative"
          onClick={() => document.getElementById(`image-upload-${id}`)?.click()}
        >
          {imageList.length > 0 ? (
            <>
              {/* 网格布局显示多张图片 */}
              <div className={`grid ${getGridLayout(imageList.length)} gap-1 w-full h-full p-2`}>
                {imageList.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image.url}
                      alt={image.fileName}
                      className="w-full h-full object-cover rounded"
                      onError={handleImageError}
                    />
                    {/* 图片序号 */}
                    <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 节点处理时的加载动画 */}
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-md">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              )}
            </>
          ) : imageError ? (
            <div className="text-red-500 text-xs text-center">加载失败</div>
          ) : (
            <div className="text-gray-500 text-xs text-center">
              <div>点击上传多张图片</div>
              <div className="text-xs mt-1">支持拖拽多文件</div>
            </div>
          )}
        </div>
        
        {/* 隐藏的文件上传输入 - 支持多文件 */}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
          id={`image-upload-${id}`}
        />
      </div>
      
      {/* Handle 配置 */}
      {nodesConfig['image-set'].handles.map((handle: any) => (
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

export default ImageSet;
