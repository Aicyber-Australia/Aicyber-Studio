'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '@/app/workflow/config';
import { NodeHandle } from '@/app/workflow/components/nodes/workflow-node/node-handle';
import WorkflowNode from '@/app/workflow/components/nodes/workflow-node';
import { Eye, Trash2, FolderOpen, ArrowRightFromLine, ArrowBigRightDash, GalleryHorizontalEnd, BetweenHorizontalStart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { uploadFileToStorage } from '@/app/workflow/utils/upload-to-storage';

function VideoSet({ id, data, selected }: WorkflowNodeProps) {
  const [videoError, setVideoError] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 使用 ReactFlow 官方 API
  const { setNodes, getEdges } = useReactFlow();

  // Check if node has input edges
  const hasInputEdges = useMemo(() => {
    const edges = getEdges();
    return edges.some(edge => edge.target === id);
  }, [getEdges, id]);

  // 从 media.videoList 获取所有视频
  const videoList = data?.media?.videoList || [];

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
    const files = event.target.files;
    if (!files) return;

    const videoFiles = Array.from(files).filter(file => file.type.startsWith('video/'));
    if (videoFiles.length === 0) return;

    setVideoError(false);

    // Show loading state immediately with blob URLs
    const blobVideos = videoFiles.map(file => ({
      url: URL.createObjectURL(file),
      fileName: file.name,
      timestamp: Date.now()
    }));

    const mediaData = {
      videoList: [...videoList, ...blobVideos]
    };

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: mediaData,
              title: `Video Set (${mediaData.videoList.length})`,
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
        videoList: [...videoList, ...uploadedVideos]
      };

      setNodes(nodes => nodes.map(node =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                media: updatedMediaData,
                title: `Video Set (${updatedMediaData.videoList.length})`,
                status: 'success'
              }
            }
          : node
      ));

      // Revoke the blob URLs to free memory
      blobVideos.forEach(vid => URL.revokeObjectURL(vid.url));

      console.log(`Node ${id} uploaded ${uploadedVideos.length} videos to Supabase`);
    } catch (error) {
      console.error(`Failed to upload videos for node ${id}:`, error);
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
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  const handleDeleteVideo = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedVideoList = videoList.filter((_, i) => i !== index);

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: { videoList: updatedVideoList },
              title: updatedVideoList.length > 0 ? `Video Set (${updatedVideoList.length})` : 'Video Set'
            }
          }
        : node
    ));
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
        const maxLimit = (node.data as any)?.media?.videoList?.length || 1;
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
  const maxLimit = videoList.length || 1;
  const processLimit = Math.min(data?.processLimit || 10, maxLimit);

  return (
    <>
      <WorkflowNode id={id} data={data} type="video-set" onRefresh={handleRefresh} selected={selected}>
        <div className="w-full h-full flex flex-col p-3 min-h-0 nodrag space-y-2">
          {/* Output + Process + Limit aligned */}
          <div className="nodrag grid grid-cols-3 items-start gap-4 flex-shrink-0">
            {/* Output Mode - icon segmented */}
            <div className="nodrag flex-shrink-0 w-[120px]">
              <div className="text-[10px] text-muted-foreground mb-1">Output Mode</div>
              <div className="relative flex w-[84px] items-center rounded-md border p-1 box-border overflow-hidden bg-white dark:bg-gray-800">
                <div className={`icon-slider-track ${setOutputMode === 'individual' ? 'left' : 'right'}`} />
                <button
                  type="button"
                  className={`relative z-10 flex-1 flex items-center justify-center h-7 w-7 rounded-md ${setOutputMode === 'individual' ? 'text-gray-900' : 'text-gray-500'}`}
                  title="Individual"
                  onClick={() => handleSetOutputModeChange('individual')}
                >
                  <ArrowRightFromLine className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={`relative z-10 flex-1 flex items-center justify-center h-7 w-7 rounded-md ${setOutputMode === 'integrated' ? 'text-gray-900' : 'text-gray-500'}`}
                  title="Integrated"
                  onClick={() => handleSetOutputModeChange('integrated')}
                >
                  <ArrowBigRightDash className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Process Items - Only shown when no input edges */}
            {!hasInputEdges && (
              <div className="nodrag flex-shrink-0 w-[120px]">
                <div className="text-[10px] text-muted-foreground mb-1">Process Items</div>
                <div className="relative flex w-[84px] items-center rounded-md border p-1 box-border overflow-hidden bg-white dark:bg-gray-800">
                  <div className={`icon-slider-track ${processLimitMode === 'all' ? 'left' : 'right'}`} />
                  <button
                    type="button"
                    className={`relative z-10 flex-1 flex items-center justify-center h-7 w-7 rounded-md ${processLimitMode === 'all' ? 'text-gray-900' : 'text-gray-500'}`}
                    title="Process All"
                    onClick={() => handleProcessLimitModeChange('all')}
                  >
                    <GalleryHorizontalEnd className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className={`relative z-10 flex-1 flex items-center justify-center h-7 w-7 rounded-md ${processLimitMode === 'limited' ? 'text-gray-900' : 'text-gray-500'}`}
                    title="First N"
                    onClick={() => handleProcessLimitModeChange('limited')}
                  >
                    <BetweenHorizontalStart className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Limit column - always visible; disabled when Process All */}
            {!hasInputEdges && (
              <div className="nodrag flex-shrink-0 w-[84px]">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] text-muted-foreground">Limit</div>
                  <span className="text-[10px] text-muted-foreground">/ {maxLimit}</span>
                </div>
                <div className={`inline-flex items-center justify-between gap-1 w-[84px] h-7 border rounded bg-white dark:bg-gray-800 px-1 ${processLimitMode !== 'limited' ? 'opacity-50' : ''}`}>
                  <button
                    type="button"
                    className={`w-5 h-5 flex items-center justify-center rounded ${processLimitMode === 'limited' ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : 'cursor-not-allowed'}`}
                    onClick={() => processLimitMode === 'limited' && handleProcessLimitChange(Math.max(1, (processLimit || 1) - 1))}
                    title="Decrease"
                    disabled={processLimitMode !== 'limited'}
                  >
                    −
                  </button>
                  <span className="text-xs w-6 text-center select-none">{processLimit}</span>
                  <button
                    type="button"
                    className={`w-5 h-5 flex items-center justify-center rounded ${processLimitMode === 'limited' ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : 'cursor-not-allowed'}`}
                    onClick={() => processLimitMode === 'limited' && handleProcessLimitChange(Math.min(maxLimit, (processLimit || 1) + 1))}
                    title="Increase"
                    disabled={processLimitMode !== 'limited'}
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 多视频网格显示区域 - 自适应节点尺寸 */}
          <div
            className={`nodrag nopan nowheel w-full flex-1 min-h-0 border-2 border-dashed border-gray-300 rounded-lg overflow-auto cursor-pointer hover:border-gray-400 transition-colors relative ${videoList.length === 0 && !videoError ? 'flex items-center justify-center' : ''}`}
            onClick={() => document.getElementById(`video-upload-${id}`)?.click()}
            onWheel={(e) => e.stopPropagation()}
          >
            {videoList.length > 0 ? (
              <>
                {/* 网格布局显示多个视频 - 视频保持16:9比例 */}
                <div
                  className={`nodrag grid ${getGridLayout(videoList.length)} gap-1 p-2 w-full`}
                  style={{
                    minWidth: '100%',
                    minHeight: 'fit-content',
                    gridAutoRows: 'minmax(0, 1fr)'
                  }}
                >
                  {videoList.map((video, index) => {
                    // Determine if this item will be processed based on limit settings
                    const willBeProcessed = !hasInputEdges && processLimitMode === 'limited'
                      ? index < processLimit
                      : true;

                    return (
                    <div
                      key={index}
                      className="nodrag relative overflow-hidden group rounded"
                      style={{
                        aspectRatio: '16/9',
                        minWidth: 0,
                        minHeight: 0
                      }}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      draggable={false}
                    >
                      <video
                        src={video.url}
                        className={`w-full h-full object-cover ${!willBeProcessed ? 'opacity-40' : ''}`}
                        onError={handleVideoError}
                        draggable={false}
                      />
                      {/* Overlay for items that won't be processed */}
                      {!willBeProcessed && (
                        <div className="absolute inset-0 bg-gray-900/30 pointer-events-none" />
                      )}
                      {/* 视频序号 */}
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
                            onClick={(e) => handleDeleteVideo(index, e)}
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
            ) : videoError ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-red-500 text-xs text-center">加载失败</div>
              </div>
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
            accept="video/*"
            multiple
            onChange={handleVideoUpload}
            className="hidden"
            id={`video-upload-${id}`}
          />
        </div>

        {/* Handle 配置 */}
        {nodesConfig['video-set'].handles.map((handle: any) => (
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
    </>
  );
}

export default VideoSet;
