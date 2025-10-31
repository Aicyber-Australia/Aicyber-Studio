'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '@/app/workflow/config';
import { NodeHandle } from '@/app/workflow/components/nodes/workflow-node/node-handle';
import WorkflowNode from '@/app/workflow/components/nodes/workflow-node';
import { Eye, Trash2, FolderOpen } from 'lucide-react';
import { ImagePreviewDialog } from './image-preview-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { uploadFileToStorage } from '@/app/workflow/utils/upload-to-storage';

function ImageSet({ id, data, selected }: WorkflowNodeProps) {
  const [imageError, setImageError] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; fileName: string } | null>(null);

  // 使用 ReactFlow 官方 API
  const { setNodes, getEdges } = useReactFlow();

  // Check if node has input edges
  const hasInputEdges = useMemo(() => {
    const edges = getEdges();
    return edges.some(edge => edge.target === id);
  }, [getEdges, id]);

  // 从 media.imageList 获取所有图片
  // Deduplicate imageList by URL for display (progressive mode can cause duplicates)
  const rawImageList = data?.media?.imageList || [];
  const imageList = Array.from(
    new Map(rawImageList.map((img: any) => [img.url || img.fileName || JSON.stringify(img), img])).values()
  );
  
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
    const files = event.target.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setImageError(false);

    // Show loading state immediately with blob URLs
    const blobImages = imageFiles.map(file => ({
      url: URL.createObjectURL(file),
      fileName: file.name,
      timestamp: Date.now()
    }));

    const mediaData = {
      imageList: [...imageList, ...blobImages]
    };

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: mediaData,
              title: `Image Set (${mediaData.imageList.length})`,
              status: 'loading'
            }
          }
        : node
    ));

    // Upload all images to Supabase storage
    try {
      const uploadedImages = await Promise.all(
        imageFiles.map(async (file, index) => {
          try {
            const uploadedUrl = await uploadFileToStorage(file);
            return {
              url: uploadedUrl,
              fileName: file.name,
              timestamp: Date.now()
            };
          } catch (error) {
            console.error(`Failed to upload image ${file.name}:`, error);
            // Keep the blob URL if upload fails
            return blobImages[index];
          }
        })
      );

      // Update with the Supabase URLs
      const updatedMediaData = {
        imageList: [...imageList, ...uploadedImages]
      };

      setNodes(nodes => nodes.map(node =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                media: updatedMediaData,
                title: `Image Set (${updatedMediaData.imageList.length})`,
                status: 'success'
              }
            }
          : node
      ));

      // Revoke the blob URLs to free memory
      blobImages.forEach(img => URL.revokeObjectURL(img.url));

      console.log(`Node ${id} uploaded ${uploadedImages.length} images to Supabase`);
    } catch (error) {
      console.error(`Failed to upload images for node ${id}:`, error);
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
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleDeleteImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedImageList = imageList.filter((_, i) => i !== index);

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: { imageList: updatedImageList },
              title: updatedImageList.length > 0 ? `Image Set (${updatedImageList.length})` : 'Image Set'
            }
          }
        : node
    ));
  };

  const handlePreviewMouseDown = (image: { url: string; fileName: string }, e: React.MouseEvent) => {
    // Only trigger on left mouse button (button 0)
    if (e.button !== 0) return;

    e.stopPropagation();
    console.log('Preview mousedown triggered for:', image.fileName);
    setPreviewImage(image);
  };

  const handlePreviewClose = () => {
    console.log('Preview closed');
    setPreviewImage(null);
  };

  // 计算网格布局
  const getGridLayout = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  // Handle set output mode change
  const handleSetOutputModeChange = useCallback((value: string) => {
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              setOutputMode: value as 'individual' | 'integrated',
            },
          }
        : node
    ));
  }, [id, setNodes]);

  const setOutputMode = data?.setOutputMode || 'individual';

  // Process limit handlers (only for nodes without input edges)
  const handleProcessLimitModeChange = useCallback((value: string) => {
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              processLimitMode: value as 'all' | 'limited',
              processLimit: value === 'all' ? undefined : (node.data.processLimit || 10),
            },
          }
        : node
    ));
  }, [id, setNodes]);

  const handleProcessLimitChange = useCallback((value: number) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === id) {
        const maxLimit = (node.data as any)?.media?.imageList?.length || 1;
        return {
          ...node,
          data: {
            ...node.data,
            processLimit: Math.max(1, Math.min(value, maxLimit)),
          },
        };
      }
      return node;
    }));
  }, [id, setNodes]);

  const processLimitMode = data?.processLimitMode || 'all';
  const maxLimit = imageList.length || 1;
  const processLimit = Math.min(data?.processLimit || 10, maxLimit);

  return (
    <>
      <WorkflowNode id={id} data={data} type="image-set" onRefresh={handleRefresh} selected={selected}>
        <div className="w-full flex-1 flex flex-col p-3 min-h-0 nodrag space-y-2">
          {/* Output + Process controls in one row */}
          <div className="nodrag flex items-start gap-4 flex-shrink-0">
            {/* Output Mode Selection */}
            <div className="nodrag flex-shrink-0">
            <div className="text-[10px] text-muted-foreground mb-1">Output Mode</div>
            <Select value={setOutputMode} onValueChange={handleSetOutputModeChange}>
              <SelectTrigger className="h-7 text-xs nodrag">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="nodrag">
                <SelectItem value="individual" className="text-xs">Individual</SelectItem>
                <SelectItem value="integrated" className="text-xs">Integrated</SelectItem>
              </SelectContent>
            </Select>
            </div>

            {/* Process Limit Selection - Only shown when no input edges */}
            {!hasInputEdges && (
            <div className="nodrag flex-shrink-0 space-y-1.5">
              <div className="text-[10px] text-muted-foreground">Process Items</div>
              <Select value={processLimitMode} onValueChange={handleProcessLimitModeChange}>
                <SelectTrigger className="h-7 text-xs nodrag">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="nodrag">
                  <SelectItem value="all" className="text-xs">Process All</SelectItem>
                  <SelectItem value="limited" className="text-xs">Process First N</SelectItem>
                </SelectContent>
              </Select>
              {processLimitMode === 'limited' && (
                <div className="flex items-center gap-2">
                  <label htmlFor={`process-limit-${id}`} className="text-[10px] text-muted-foreground whitespace-nowrap">
                    Limit:
                  </label>
                  <Input
                    id={`process-limit-${id}`}
                    type="number"
                    min="1"
                    max={maxLimit}
                    value={processLimit}
                    onChange={(e) => handleProcessLimitChange(parseInt(e.target.value) || 1)}
                    className="h-7 text-xs nodrag"
                  />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">/ {maxLimit}</span>
                </div>
              )}
            </div>
            )}
          </div>

          {/* 多图网格显示区域 - 自适应节点尺寸 */}
          <div
            className="nodrag nopan nowheel w-full h-full border-2 border-dashed border-gray-300 rounded-lg overflow-auto cursor-pointer hover:border-gray-400 transition-colors relative"
            onClick={() => document.getElementById(`image-upload-${id}`)?.click()}
            onWheel={(e) => e.stopPropagation()}
          >
          {imageList.length > 0 ? (
            <>
              {/* 网格布局显示多张图片 - 图片保持1:1比例，完整显示 */}
              <div
                className={`nodrag grid ${getGridLayout(imageList.length)} gap-1 p-2`}
                style={{
                  minWidth: '100%',
                  minHeight: 'fit-content',
                  gridAutoRows: 'minmax(0, 1fr)'
                }}
              >
                {imageList.map((image, index) => {
                  // Determine if this item will be processed based on limit settings
                  const willBeProcessed = !hasInputEdges && processLimitMode === 'limited'
                    ? index < processLimit
                    : true;

                  return (
                  <div
                    key={index}
                    className="nodrag relative overflow-hidden group rounded"
                    style={{
                      aspectRatio: '1/1',
                      minWidth: 0,
                      minHeight: 0
                    }}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    draggable={false}
                  >
                    <img
                      src={image.url}
                      alt={image.fileName}
                      className={`w-full h-full object-cover ${!willBeProcessed ? 'opacity-40' : ''}`}
                      onError={handleImageError}
                      draggable={false}
                    />
                    {/* Overlay for items that won't be processed */}
                    {!willBeProcessed && (
                      <div className="absolute inset-0 bg-gray-900/30 pointer-events-none" />
                    )}
                    {/* 图片序号 */}
                    <div className={`absolute top-1 left-1 text-white text-xs px-1 rounded ${willBeProcessed ? 'bg-black/50' : 'bg-gray-500/70'}`}>
                      {index + 1}
                    </div>

                    {/* 悬停时显示的按钮 */}
                    {hoveredIndex === index && (
                      <div
                        className="nodrag absolute inset-0 bg-black/40 flex items-center justify-center gap-2 rounded"
                        onClick={(e) => e.stopPropagation()}
                        draggable={false}
                      >
                        <button
                          onMouseDown={(e) => handlePreviewMouseDown(image, e)}
                          className="nodrag p-2 bg-white/90 hover:bg-white rounded-full transition-colors select-none"
                          title="Preview (hold to view)"
                          draggable={false}
                        >
                          <Eye className="w-4 h-4 text-gray-700 pointer-events-none" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteImage(index, e)}
                          className="nodrag p-2 bg-white/90 hover:bg-white rounded-full transition-colors select-none"
                          title="Delete"
                          draggable={false}
                        >
                          <Trash2 className="w-4 h-4 text-red-600 pointer-events-none" />
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })}
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
            <div className="flex flex-col items-center justify-center gap-2 text-center" title="click to add files">
              <FolderOpen className="w-8 h-8 text-gray-400" />
              <span className="text-gray-500 text-xs">click to add files</span>
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

      {/* 预览对话框 - 使用 Portal 渲染到 body，确保是真正的窗口级别 */}
      <ImagePreviewDialog image={previewImage} onClose={handlePreviewClose} />
    </>
  );
}

export default ImageSet;
