'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '../../../config';
import WorkflowNode from '../workflow-node';
import { NodeHandle } from '../workflow-node/node-handle';

function ImageDisplayNode({ id, data }: WorkflowNodeProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState<boolean>(false);

  // 从节点数据中获取图片URL
  useEffect(() => {
    if (data.imageUrl) {
      setImageUrl(data.imageUrl);
    }
  }, [data.imageUrl]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setImageError(false);
      
      // 这里可以触发数据更新回调
      // onDataChange?.({ imageUrl: url, fileName: file.name });
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <WorkflowNode id={id} data={data}>
      <div className="p-4 w-full h-full">
        <div className="flex flex-col items-center space-y-2">
          {/* 图片显示区域 */}
          <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt="Display"
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            ) : imageError ? (
              <div className="text-red-500 text-sm">图片加载失败</div>
            ) : (
              <div className="text-gray-500 text-sm">暂无图片</div>
            )}
          </div>
          
          {/* 上传按钮 */}
          <div className="flex space-x-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id={`image-upload-${id}`}
            />
            <label
              htmlFor={`image-upload-${id}`}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded cursor-pointer hover:bg-blue-600 transition-colors"
            >
              选择图片
            </label>
            
            {imageUrl && (
              <button
                onClick={() => {
                  setImageUrl('');
                  setImageError(false);
                }}
                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
              >
                清除
              </button>
            )}
          </div>
          
          {/* 图片信息 */}
          {imageUrl && (
            <div className="text-xs text-gray-600 text-center">
              <div>图片已加载</div>
              <div className="truncate max-w-48">{imageUrl}</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Handle 配置 */}
      {nodesConfig['image-display-node'].handles.map((handle) => (
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

export default ImageDisplayNode;
