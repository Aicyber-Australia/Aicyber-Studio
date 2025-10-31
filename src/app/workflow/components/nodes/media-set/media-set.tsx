'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useReactFlow, getOutgoers, useStore } from '@xyflow/react';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '@/app/workflow/config';
import { NodeHandle } from '@/app/workflow/components/nodes/workflow-node/node-handle';
import WorkflowNode from '@/app/workflow/components/nodes/workflow-node';
import { Eye, Trash2, FileText, Image as ImageIcon, Video as VideoIcon, Plus, ArrowRightFromLine, ArrowBigRightDash, ImagePlus, FileVideo } from 'lucide-react';
import { ImagePreviewDialog } from '@/app/workflow/components/nodes/image/image-preview-dialog';
import { uploadFileToStorage } from '@/app/workflow/utils/upload-to-storage';
import { cn } from '@/lib/utils';

type MediaItem = {
  id: string;
  type: 'image' | 'text' | 'video';
  url?: string;
  content?: string;
  fileName: string;
  timestamp: number;
};

function MediaSet({ id, data, selected }: WorkflowNodeProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; fileName: string } | null>(null);

  // 使用 ReactFlow 官方 API
  const { setNodes } = useReactFlow();

  // Subscribe to ReactFlow store for real-time updates
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);

  // Check if this MediaSet node is connected to any nodes that require integrated mode
  // IMPORTANT: Only MediaSet (not image-set, video-set, text-set) has these restrictions
  // This will automatically update when connections change
  const connectionRestriction = useMemo(() => {
    const currentNode = nodes.find((n) => n.id === id);

    if (!currentNode) return { isRestricted: false, reason: '' };

    const actionNodeTypes = ['text-to-image-node', 'image-to-image-node', 'image-to-text-node', 'edit-image-node'];
    const outgoingNodes = getOutgoers(currentNode, nodes, edges);

    // Check if connected to action nodes (always requires integrated for MediaSet)
    const connectedToActionNode = outgoingNodes.some((node) => actionNodeTypes.includes(node.type || ''));

    // Check if this MediaSet has MIXED media types (more than one type)
    // Deduplicate mediaList by URL/ID for display (progressive mode can cause duplicates)
    const rawMediaList = data?.media?.mediaList || [];
    const mediaList = Array.from(
      new Map(rawMediaList.map((item: any) => [item.url || item.id || JSON.stringify(item), item])).values()
    );
    const mediaTypes = mediaList.length > 0 ? new Set(mediaList.map((item: any) => item.type)) : new Set();
    const hasMixedTypes = mediaTypes.size > 1; // More than one type = mixed

    // Check if connected to NodeSet with cross or sequence mode (only matters if mixed types)
    const connectedToRestrictedNodeSet = hasMixedTypes && outgoingNodes.some((node) => {
      if (node.type === 'node-set') {
        const inputMode = (node.data as any)?.inputMode || 'sequence';
        return inputMode === 'cross' || inputMode === 'sequence';
      }
      return false;
    });

    let isRestricted = false;
    let reason = '';

    if (connectedToActionNode) {
      isRestricted = true;
      reason = 'Connected to Action Node';
    } else if (connectedToRestrictedNodeSet) {
      isRestricted = true;
      reason = 'Mixed media types + NodeSet (cross/sequence mode)';
    }

    // Auto-switch to integrated mode when restriction applies
    if (isRestricted && data?.setOutputMode !== 'integrated') {
      setNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  setOutputMode: 'integrated',
                },
              }
            : node
        )
      );
    }

    return { isRestricted, reason };
  }, [id, nodes, edges, data?.setOutputMode, data?.media?.mediaList, setNodes]);

  // 从 media.mediaList 获取所有媒体项
  const mediaList: MediaItem[] = data?.media?.mediaList || [];

  // 检查节点是否正在处理
  const isProcessing = data?.status === 'loading';

  // 刷新按钮处理函数
  const handleRefresh = () => {
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

    // Show loading state immediately with blob URLs
    const blobImages: MediaItem[] = imageFiles.map(file => ({
      id: `media-${Date.now()}-${Math.random()}`,
      type: 'image' as const,
      url: URL.createObjectURL(file),
      fileName: file.name,
      timestamp: Date.now()
    }));

    const mediaData = {
      mediaList: [...mediaList, ...blobImages]
    };

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: mediaData,
              title: `Media Set (${mediaData.mediaList.length})`,
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
              id: blobImages[index].id,
              type: 'image' as const,
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
        mediaList: [...mediaList, ...uploadedImages]
      };

      setNodes(nodes => nodes.map(node =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                media: updatedMediaData,
                title: `Media Set (${updatedMediaData.mediaList.length})`,
                status: 'success'
              }
            }
          : node
      ));

      // Revoke the blob URLs to free memory
      blobImages.forEach(img => URL.revokeObjectURL(img.url!));

      console.log(`Node ${id} uploaded ${uploadedImages.length} images to Supabase`);
    } catch (error) {
      console.error(`Failed to upload images for node ${id}:`, error);
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

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const videoFiles = Array.from(files).filter(file => file.type.startsWith('video/'));
    if (videoFiles.length === 0) return;

    // Show loading state immediately with blob URLs
    const blobVideos: MediaItem[] = videoFiles.map(file => ({
      id: `media-${Date.now()}-${Math.random()}`,
      type: 'video' as const,
      url: URL.createObjectURL(file),
      fileName: file.name,
      timestamp: Date.now()
    }));

    const mediaData = {
      mediaList: [...mediaList, ...blobVideos]
    };

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: mediaData,
              title: `Media Set (${mediaData.mediaList.length})`,
              status: 'loading'
            }
          }
        : node
    ));

    // Upload all videos to Supabase storage
    try {
      const uploadedVideos = await Promise.all(
        videoFiles.map(async (file, index) => {
          try {
            const uploadedUrl = await uploadFileToStorage(file);
            return {
              id: blobVideos[index].id,
              type: 'video' as const,
              url: uploadedUrl,
              fileName: file.name,
              timestamp: Date.now()
            };
          } catch (error) {
            console.error(`Failed to upload video ${file.name}:`, error);
            // Keep the blob URL if upload fails
            return blobVideos[index];
          }
        })
      );

      // Update with the Supabase URLs
      const updatedMediaData = {
        mediaList: [...mediaList, ...uploadedVideos]
      };

      setNodes(nodes => nodes.map(node =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                media: updatedMediaData,
                title: `Media Set (${updatedMediaData.mediaList.length})`,
                status: 'success'
              }
            }
          : node
      ));

      // Revoke the blob URLs to free memory
      blobVideos.forEach(vid => URL.revokeObjectURL(vid.url!));

      console.log(`Node ${id} uploaded ${uploadedVideos.length} videos to Supabase`);
    } catch (error) {
      console.error(`Failed to upload videos for node ${id}:`, error);
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

  const handleAddText = () => {
    const newText: MediaItem = {
      id: `media-${Date.now()}-${Math.random()}`,
      type: 'text',
      content: '',
      fileName: `text-${mediaList.filter(m => m.type === 'text').length + 1}.txt`,
      timestamp: Date.now()
    };

    const mediaData = {
      mediaList: [...mediaList, newText]
    };

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: mediaData,
              title: `Media Set (${mediaData.mediaList.length})`
            }
          }
        : node
    ));

    console.log(`Node ${id} added new text:`, newText);
  };

  const handleTextChange = (mediaId: string, newContent: string) => {
    const updatedMediaList = mediaList.map(item =>
      item.id === mediaId
        ? { ...item, content: newContent }
        : item
    );

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: { mediaList: updatedMediaList }
            }
          }
        : node
    ));
  };

  const handleDeleteMedia = (mediaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedMediaList = mediaList.filter(item => item.id !== mediaId);

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: { mediaList: updatedMediaList },
              title: updatedMediaList.length > 0 ? `Media Set (${updatedMediaList.length})` : 'Media Set'
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

  const imageCount = mediaList.filter(m => m.type === 'image').length;
  const videoCount = mediaList.filter(m => m.type === 'video').length;
  const textCount = mediaList.filter(m => m.type === 'text').length;

  // Handle set output mode change
  const handleSetOutputModeChange = useCallback((value: 'individual' | 'integrated') => {
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              setOutputMode: value,
            },
          }
        : node
    ));
  }, [id, setNodes]);

  const setOutputMode = data?.setOutputMode || 'integrated';

  return (
    <>
      <WorkflowNode id={id} data={data} type="media-set" onRefresh={handleRefresh} selected={selected}>
        <div className="w-full flex-1 flex flex-col p-3 min-h-0 nodrag space-y-2">
          {/* Output Mode Selection - icon segmented slider */}
          <div className="nodrag flex-shrink-0 w-[120px]">
            <div className="text-[10px] text-muted-foreground mb-1">
              Output Mode
              {connectionRestriction.isRestricted && (
                <span className="ml-1 text-[9px] text-amber-600">
                  (locked: {connectionRestriction.reason})
                </span>
              )}
            </div>
            <div className="relative flex w-[84px] items-center rounded-md border p-1 box-border overflow-hidden bg-white dark:bg-gray-800">
              <div
                className="absolute top-1 h-7 bg-gray-100 dark:bg-gray-700 rounded-md"
                style={{
                  width: 'calc(50% - 4px)',
                  left: setOutputMode === 'individual' ? '4px' : 'calc(50% + 0px)',
                  transition: 'left 300ms ease-in-out',
                }}
              />
              <button
                type="button"
                className={cn(
                  `relative z-10 flex-1 flex items-center justify-center h-7 w-7 rounded-md transition-colors`,
                  setOutputMode === 'individual' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400',
                  connectionRestriction.isRestricted && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => !connectionRestriction.isRestricted && handleSetOutputModeChange('individual')}
                disabled={connectionRestriction.isRestricted}
                title="Individual"
              >
                <ArrowRightFromLine className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={cn(
                  `relative z-10 flex-1 flex items-center justify-center h-7 w-7 rounded-md transition-colors`,
                  setOutputMode === 'integrated' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                )}
                onClick={() => handleSetOutputModeChange('integrated')}
                title="Integrated"
              >
                <ArrowBigRightDash className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 混合媒体显示区域 */}
          <div
            className="nodrag nopan nowheel w-full h-full border-2 border-dashed border-gray-300 rounded-lg overflow-auto hover:border-gray-400 transition-colors relative"
            style={{ minHeight: mediaList.length > 0 ? undefined : 220 }}
            onWheel={(e) => e.stopPropagation()}
          >
            {mediaList.length > 0 ? (
              <>
                {/* 混合媒体列表显示 */}
                <div className="nodrag w-full h-full p-2 space-y-2">
                  {mediaList.map((item, index) => (
                    <div
                      key={item.id}
                      className="nodrag relative bg-gray-50 rounded-lg border border-gray-200 group"
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {item.type === 'image' ? (
                        // 图片项
                        <div className="nodrag relative overflow-hidden rounded-lg" style={{ aspectRatio: '16/9' }}>
                          <img
                            src={item.url}
                            alt={item.fileName}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                          {/* 图片序号和文件名 */}
                          <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            <span>#{index + 1} {item.fileName}</span>
                          </div>

                          {/* 悬停时显示的按钮 */}
                          {hoveredIndex === index && (
                            <div
                              className="nodrag absolute inset-0 bg-black/40 flex items-center justify-center gap-2 rounded"
                              onClick={(e) => e.stopPropagation()}
                              draggable={false}
                            >
                              <button
                                onMouseDown={(e) => handlePreviewMouseDown({ url: item.url!, fileName: item.fileName }, e)}
                                className="nodrag p-2 bg-white/90 hover:bg-white rounded-full transition-colors select-none"
                                title="Preview (hold to view)"
                                draggable={false}
                              >
                                <Eye className="w-4 h-4 text-gray-700 pointer-events-none" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteMedia(item.id, e)}
                                className="nodrag p-2 bg-white/90 hover:bg-white rounded-full transition-colors select-none"
                                title="Delete"
                                draggable={false}
                              >
                                <Trash2 className="w-4 h-4 text-red-600 pointer-events-none" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : item.type === 'video' ? (
                        // 视频项
                        <div className="nodrag relative overflow-hidden rounded-lg" style={{ aspectRatio: '16/9' }}>
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            controls
                            draggable={false}
                          />
                          {/* 视频序号和文件名 */}
                          <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <VideoIcon className="w-3 h-3" />
                            <span>#{index + 1} {item.fileName}</span>
                          </div>

                          {/* 悬停时显示的按钮 */}
                          {hoveredIndex === index && (
                            <div
                              className="nodrag absolute inset-0 bg-black/40 flex items-center justify-center gap-2 rounded"
                              onClick={(e) => e.stopPropagation()}
                              draggable={false}
                            >
                              <button
                                onClick={(e) => handleDeleteMedia(item.id, e)}
                                className="nodrag p-2 bg-white/90 hover:bg-white rounded-full transition-colors select-none"
                                title="Delete"
                                draggable={false}
                              >
                                <Trash2 className="w-4 h-4 text-red-600 pointer-events-none" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        // 文本项
                        <div className="nodrag p-2">
                          {/* 文本序号和标题 */}
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              #{index + 1} - {item.fileName}
                            </span>

                            {/* 悬停时显示的删除按钮 */}
                            {hoveredIndex === index && (
                              <button
                                onClick={(e) => handleDeleteMedia(item.id, e)}
                                className="nodrag p-1 bg-red-100 hover:bg-red-200 rounded-full transition-colors select-none"
                                title="Delete text"
                                draggable={false}
                              >
                                <Trash2 className="w-3 h-3 text-red-600 pointer-events-none" />
                              </button>
                            )}
                          </div>

                          {/* 文本内容输入 */}
                          <textarea
                            value={item.content || ''}
                            onChange={(e) => handleTextChange(item.id, e.target.value)}
                            className="nodrag w-full resize-none border-none outline-none bg-transparent text-sm text-gray-700 placeholder-gray-400"
                            placeholder="Enter text content..."
                            draggable={false}
                            style={{ minHeight: '60px', maxHeight: '120px' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 添加媒体按钮 */}
                  <div className="nodrag flex gap-2">
                    <button
                      onClick={() => document.getElementById(`image-upload-${id}`)?.click()}
                      className="nodrag flex-1 p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700"
                      title="Add images"
                      draggable={false}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span className="text-xs">Add Image</span>
                    </button>
                    <button
                      onClick={() => document.getElementById(`video-upload-${id}`)?.click()}
                      className="nodrag flex-1 p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700"
                      title="Add videos"
                      draggable={false}
                    >
                      <VideoIcon className="w-4 h-4" />
                      <span className="text-xs">Add Video</span>
                    </button>
                    <button
                      onClick={handleAddText}
                      className="nodrag flex-1 p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700"
                      title="Add text"
                      draggable={false}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-xs">Add Text</span>
                    </button>
                  </div>
                </div>

                {/* 节点处理时的加载动画 */}
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-md">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-gray-500 text-xs text-center flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center gap-0">
                    <button
                      onClick={() => document.getElementById(`image-upload-${id}`)?.click()}
                      className="nodrag p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-md group"
                      title="Add Image"
                      draggable={false}
                    >
                      <ImagePlus className="w-12 h-12 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-gray-700 dark:group-hover:text-gray-300" />
                    </button>
                    <div className="w-px h-10 bg-gray-300 dark:bg-gray-600"></div>
                    <button
                      onClick={() => document.getElementById(`video-upload-${id}`)?.click()}
                      className="nodrag p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-md group"
                      title="Add Video"
                      draggable={false}
                    >
                      <FileVideo className="w-12 h-12 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-gray-700 dark:group-hover:text-gray-300" />
                    </button>
                    <div className="w-px h-10 bg-gray-300 dark:bg-gray-600"></div>
                    <button
                      onClick={handleAddText}
                      className="nodrag p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-md group"
                      title="Add Text"
                      draggable={false}
                    >
                      <FileText className="w-12 h-12 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-gray-700 dark:group-hover:text-gray-300" />
                    </button>
                  </div>
                  <div>Add images, videos or text</div>
                  <div className="text-[10px] text-gray-400">Mixed media support</div>
                </div>
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
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={handleVideoUpload}
            className="hidden"
            id={`video-upload-${id}`}
          />
        </div>

        {/* Handle 配置 */}
        {nodesConfig['media-set'].handles.map((handle: any) => (
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

export default MediaSet;
