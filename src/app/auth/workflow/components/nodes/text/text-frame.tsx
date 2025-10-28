'use client';

import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '@/app/workflow/config';
import { NodeHandle } from '@/app/workflow/components/nodes/workflow-node/node-handle';
import WorkflowNode from '@/app/workflow/components/nodes/workflow-node';
import { Trash2 } from 'lucide-react';

function TextFrame({ id, data, selected }: WorkflowNodeProps) {
  const [textError, setTextError] = useState<boolean>(false);

  // 使用 ReactFlow 官方 API
  const { setNodes } = useReactFlow();

  // 从 media.textList[0] 获取文本内容 (单个字符串)
  const textContent = data?.media?.textList?.[0] || '';

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

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;

    setTextError(false);

    // 更新节点数据 - 使用 media.textList 数组
    const mediaData = {
      textList: [newText]  // 只包含一个字符串
    };

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: mediaData
            }
          }
        : node
    ));

    console.log(`Node ${id} text updated:`, newText);
  };

  const handleClearText = () => {
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: undefined
            }
          }
        : node
    ));
  };

  return (
    <>
      <WorkflowNode id={id} data={data} type="text-frame" onRefresh={handleRefresh} selected={selected}>
        <div className="w-full flex-1 flex items-center justify-center p-3 min-h-0 nodrag">
          {/* 文本输入区域 - 简洁设计 */}
          <div
            className="nodrag nopan nowheel w-full h-full border-2 border-blue-200 bg-white rounded-lg overflow-hidden hover:border-blue-300 transition-colors relative"
            onWheel={(e) => e.stopPropagation()}
          >
            {textError ? (
              <div className="text-red-500 text-xs text-center p-4">加载失败</div>
            ) : (
              <>
                {/* 文本输入区域 */}
                <textarea
                  id={`text-input-${id}`}
                  value={textContent}
                  onChange={handleTextChange}
                  className="nodrag w-full h-full resize-none border-none outline-none p-3 text-sm text-gray-800 placeholder-gray-400 leading-relaxed"
                  placeholder="输入文本..."
                  draggable={false}
                />

                {/* 清除按钮 - 仅在有内容时显示 */}
                {textContent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearText();
                    }}
                    className="nodrag absolute top-2 right-2 p-1 bg-gray-100 hover:bg-red-100 rounded transition-colors"
                    title="清除"
                    draggable={false}
                  >
                    <Trash2 className="w-3 h-3 text-gray-600 hover:text-red-600 pointer-events-none" />
                  </button>
                )}

                {/* 节点处理时的加载动画 */}
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Handle 配置 */}
        {nodesConfig['text-frame'].handles.map((handle: any) => (
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

export default TextFrame;
