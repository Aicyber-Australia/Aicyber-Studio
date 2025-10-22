'use client';

import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '../../config';
import { NodeHandle } from './workflow-node/node-handle';
import WorkflowNode from './workflow-node';
import { FileText, Trash2 } from 'lucide-react';

function TextFrame({ id, data, selected }: WorkflowNodeProps) {
  const [textError, setTextError] = useState<boolean>(false);
  
  // 使用 ReactFlow 官方 API
  const { setNodes } = useReactFlow();

  // 从 data 获取文本内容
  const textContent = data?.textContent || '';
  
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
              textContent: '',
              timestamp: undefined,
              outputData: undefined
            } 
          }
        : node
    ));
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    
    setTextError(false);
    
    // 更新节点数据
    setNodes(nodes => nodes.map(node => 
      node.id === id 
        ? { 
            ...node, 
            data: { 
              ...node.data, 
              textContent: newText,
              title: newText ? `Text: ${newText.substring(0, 20)}${newText.length > 20 ? '...' : ''}` : 'Text Frame'
            } 
          }
        : node
    ));
    
    console.log(`Node ${id} text updated:`, newText);
  };

  const handleTextError = () => {
    setTextError(true);
  };

  const handleClearText = () => {
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              textContent: '',
              title: 'Text Frame'
            }
          }
        : node
    ));
  };

  return (
    <>
      <WorkflowNode id={id} data={data} type="text-frame" onRefresh={handleRefresh} selected={selected}>
        <div className="w-full flex-1 flex items-center justify-center p-3 min-h-0 nodrag">
          {/* 文本输入区域 */}
          <div
            className="nodrag nopan nowheel w-full h-full border-2 border-dashed border-gray-300 rounded-lg overflow-auto cursor-text hover:border-gray-400 transition-colors relative"
            onClick={() => document.getElementById(`text-input-${id}`)?.focus()}
            onWheel={(e) => e.stopPropagation()}
          >
            {textContent ? (
              <>
                {/* 文本显示区域 */}
                <div className="nodrag w-full h-full p-3">
                  <textarea
                    id={`text-input-${id}`}
                    value={textContent}
                    onChange={handleTextChange}
                    onError={handleTextError}
                    className="nodrag w-full h-full resize-none border-none outline-none bg-transparent text-sm text-gray-700 placeholder-gray-400"
                    placeholder="输入文本内容..."
                    draggable={false}
                    style={{ minHeight: '200px' }}
                  />
                </div>
                
                {/* 清除按钮 */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearText();
                    }}
                    className="nodrag p-1 bg-white/90 hover:bg-white rounded-full transition-colors select-none shadow-sm"
                    title="清除文本"
                    draggable={false}
                  >
                    <Trash2 className="w-3 h-3 text-red-600 pointer-events-none" />
                  </button>
                </div>
                
                {/* 节点处理时的加载动画 */}
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-md">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                )}
              </>
            ) : textError ? (
              <div className="text-red-500 text-xs text-center">加载失败</div>
            ) : (
              <div className="text-gray-500 text-xs text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <div>点击输入文本</div>
                <div className="text-xs mt-1">支持多行文本</div>
              </div>
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
