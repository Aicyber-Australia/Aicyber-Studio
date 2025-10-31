'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '@/app/workflow/config';
import { NodeHandle } from '@/app/workflow/components/nodes/workflow-node/node-handle';
import WorkflowNode from '@/app/workflow/components/nodes/workflow-node';
import { Trash2, Plus, ArrowRightFromLine, ArrowBigRightDash, GalleryHorizontalEnd, BetweenHorizontalStart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

function TextSet({ id, data, selected }: WorkflowNodeProps) {
  const [textError, setTextError] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 使用 ReactFlow 官方 API
  const { setNodes, getEdges } = useReactFlow();

  // Check if node has input edges
  const hasInputEdges = useMemo(() => {
    const edges = getEdges();
    return edges.some(edge => edge.target === id);
  }, [getEdges, id]);

  // 从 media.textList 获取所有文本 (字符串数组)
  const textList: string[] = data?.media?.textList || [];

  // 检查节点是否正在处理
  const isProcessing = data?.status === 'loading';

  // 刷新按钮处理函数
  const handleRefresh = () => {
    setTextError(false);

    // 直接清除节点数据
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              timestamp: undefined,
              outputData: undefined,
              media: undefined
            }
          }
        : node
    ));
  };

  const handleAddText = () => {
    setTextError(false);

    // 添加一个空字符串到数组
    const mediaData = {
      textList: [...textList, '']
    };

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: mediaData,
              title: `Text Set (${mediaData.textList.length})`
            }
          }
        : node
    ));

    console.log(`Node ${id} added new text, total: ${mediaData.textList.length}`);

    // 自动聚焦到新添加的文本框
    setTimeout(() => {
      const newIndex = textList.length;
      document.getElementById(`text-input-${id}-${newIndex}`)?.focus();
    }, 50);
  };

  const handleTextChange = (index: number, newContent: string) => {
    const updatedTextList = textList.map((text, i) =>
      i === index ? newContent : text
    );

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: { textList: updatedTextList }
            }
          }
        : node
    ));
  };

  const handleTextError = () => {
    setTextError(true);
  };

  const handleDeleteText = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTextList = textList.filter((_, i) => i !== index);

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: updatedTextList.length > 0 ? { textList: updatedTextList } : undefined,
              title: updatedTextList.length > 0 ? `Text Set (${updatedTextList.length})` : 'Text Set'
            }
          }
        : node
    ));
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
        const maxLimit = (node.data as any)?.media?.textList?.length || 1;
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
  const maxLimit = textList.length || 1;
  const processLimit = Math.min(data?.processLimit || 10, maxLimit);

  return (
    <>
      <WorkflowNode id={id} data={data} type="text-set" onRefresh={handleRefresh} selected={selected}>
        <div className="w-full flex-1 flex flex-col p-3 min-h-0 nodrag space-y-2">
          {/* Output + Process controls in one row */}
          <div className="nodrag flex items-start gap-4 flex-shrink-0">
            {/* Output Mode - icon segmented */}
            <div className="nodrag flex-shrink-0">
              <div className="text-[10px] text-muted-foreground mb-1">Output Mode</div>
              <div className="relative flex w-[84px] items-center rounded-md border p-1 box-border overflow-hidden bg-white dark:bg-gray-800">
                <div
                  className="absolute top-1 bottom-1 rounded transition-all duration-200 ease-in-out"
                  style={{ width: 'calc(50% - 4px)', left: setOutputMode === 'individual' ? '2px' : 'calc(50% + 2px)', backgroundColor: 'rgb(243 244 246)' }}
                />
                <button
                  type="button"
                  className={`relative z-10 flex-1 flex items-center justify-center h-7 w-7 rounded-md ${setOutputMode === 'individual' ? 'text-gray-900' : 'text-gray-500'}`}
                  title="Individual"
                  onClick={() => handleSetOutputModeChange('individual')}
                >
                  <ArrowRightFromLine className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={`relative z-10 flex-1 flex items-center justify-center h-7 w-7 rounded-md ${setOutputMode === 'integrated' ? 'text-gray-900' : 'text-gray-500'}`}
                  title="Integrated"
                  onClick={() => handleSetOutputModeChange('integrated')}
                >
                  <ArrowBigRightDash className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Process Items - Only shown when no input edges */}
            {!hasInputEdges && (
              <div className="nodrag flex-shrink-0 space-y-1.5">
                <div className="text-[10px] text-muted-foreground">Process Items</div>
                <div className="relative flex w-[84px] items-center rounded-md border p-1 box-border overflow-hidden bg-white dark:bg-gray-800">
                  <div
                    className="absolute top-1 bottom-1 rounded transition-all duration-200 ease-in-out"
                    style={{ width: 'calc(50% - 4px)', left: processLimitMode === 'all' ? '2px' : 'calc(50% + 2px)', backgroundColor: 'rgb(243 244 246)' }}
                  />
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

          {/* 多文本显示区域 - 简洁设计 */}
          <div
            className="nodrag nopan nowheel w-full h-full border-2 border-purple-200 bg-white rounded-lg overflow-auto hover:border-purple-300 transition-colors relative"
            onWheel={(e) => e.stopPropagation()}
          >
            {textError ? (
              <div className="text-red-500 text-xs text-center p-4">加载失败</div>
            ) : (
              <>
                {/* 文本列表显示 */}
                <div className="nodrag w-full h-full p-2 space-y-2">
                  {textList.map((text, index) => {
                    // Determine if this item will be processed based on limit settings
                    const willBeProcessed = !hasInputEdges && processLimitMode === 'limited'
                      ? index < processLimit
                      : true;

                    return (
                    <div
                      key={index}
                      className={`nodrag relative bg-gray-50 rounded p-2 border border-gray-200 hover:border-purple-300 transition-colors group ${!willBeProcessed ? 'opacity-50 bg-gray-100' : ''}`}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* 文本序号和删除按钮 */}
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${willBeProcessed ? 'text-gray-500' : 'text-gray-400'}`}>
                          #{index + 1}
                          {!willBeProcessed && <span className="ml-1 text-[10px]">(skipped)</span>}
                        </span>
                        {hoveredIndex === index && (
                          <button
                            onClick={(e) => handleDeleteText(index, e)}
                            className="nodrag p-0.5 hover:bg-red-100 rounded transition-colors"
                            title="删除"
                            draggable={false}
                          >
                            <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-600 pointer-events-none" />
                          </button>
                        )}
                      </div>

                      {/* 文本输入 */}
                      <textarea
                        id={`text-input-${id}-${index}`}
                        value={text}
                        onChange={(e) => handleTextChange(index, e.target.value)}
                        className="nodrag w-full resize-none border-none outline-none bg-transparent text-sm text-gray-700 placeholder-gray-400 leading-relaxed"
                        placeholder="输入文本..."
                        draggable={false}
                        style={{ minHeight: '50px' }}
                      />
                    </div>
                    );
                  })}

                  {/* 添加按钮 */}
                  <button
                    onClick={handleAddText}
                    className="nodrag w-full p-2 border border-dashed border-gray-300 rounded hover:border-purple-300 hover:bg-purple-50 transition-colors flex items-center justify-center gap-1 text-gray-500 hover:text-purple-600 text-sm"
                    draggable={false}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加
                  </button>
                </div>

                {/* 节点处理时的加载动画 */}
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Handle 配置 */}
        {nodesConfig['text-set'].handles.map((handle: any) => (
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

export default TextSet;
