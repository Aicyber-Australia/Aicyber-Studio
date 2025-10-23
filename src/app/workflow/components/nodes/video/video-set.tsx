'use client';

import React, { useState, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '@/app/workflow/config';
import { NodeHandle } from '@/app/workflow/components/nodes/workflow-node/node-handle';
import WorkflowNode from '@/app/workflow/components/nodes/workflow-node';
import { Eye, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function VideoSet({ id, data, selected }: WorkflowNodeProps) {
  const [videoError, setVideoError] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 使用 ReactFlow 官方 API
  const { setNodes } = useReactFlow();

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

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newVideos = Array.from(files)
      .filter(file => file.type.startsWith('video/'))
      .map(file => ({
        url: URL.createObjectURL(file),
        fileName: file.name,
        timestamp: Date.now()
      }));

    setVideoError(false);

    // 更新节点数据，支持多视频
    const mediaData = {
      videoList: [...videoList, ...newVideos]
    };

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: mediaData,
              title: `Video Set (${mediaData.videoList.length})`
            }
          }
        : node
    ));

    console.log(`Node ${id} uploaded ${newVideos.length} videos:`, newVideos);
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

  return (
    <>
      <WorkflowNode id={id} data={data} type="video-set" onRefresh={handleRefresh} selected={selected}>
        <div className="w-full flex-1 flex flex-col p-3 min-h-0 nodrag space-y-2">
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

          {/* 多视频网格显示区域 - 自适应节点尺寸 */}
          <div
            className="nodrag nopan nowheel w-full h-full border-2 border-dashed border-gray-300 rounded-lg overflow-auto cursor-pointer hover:border-gray-400 transition-colors relative"
            onClick={() => document.getElementById(`video-upload-${id}`)?.click()}
            onWheel={(e) => e.stopPropagation()}
          >
            {videoList.length > 0 ? (
              <>
                {/* 网格布局显示多个视频 - 视频保持16:9比例 */}
                <div
                  className={`nodrag grid ${getGridLayout(videoList.length)} gap-1 p-2`}
                  style={{
                    minWidth: '100%',
                    minHeight: 'fit-content',
                    gridAutoRows: 'minmax(0, 1fr)'
                  }}
                >
                  {videoList.map((video, index) => (
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
                        className="w-full h-full object-cover"
                        onError={handleVideoError}
                        draggable={false}
                      />
                      {/* 视频序号 */}
                      <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
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
                  ))}
                </div>

                {/* 节点处理时的加载动画 */}
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-md">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                )}
              </>
            ) : videoError ? (
              <div className="text-red-500 text-xs text-center">加载失败</div>
            ) : (
              <div className="text-gray-500 text-xs text-center">
                <div>点击上传多个视频</div>
                <div className="text-xs mt-1">支持拖拽多文件</div>
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
