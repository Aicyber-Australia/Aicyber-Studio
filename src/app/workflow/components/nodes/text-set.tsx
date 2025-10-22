'use client';

import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '../../config';
import { NodeHandle } from './workflow-node/node-handle';
import WorkflowNode from './workflow-node';
import { FileText, Trash2, Plus } from 'lucide-react';

function TextSet({ id, data, selected }: WorkflowNodeProps) {
  const [textError, setTextError] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // 使用 ReactFlow 官方 API
  const { setNodes } = useReactFlow();

  // 从 media.textList 获取所有文本
  const textList = data?.media?.textList || [];
  
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
    const newText = {
      id: `text-${Date.now()}`,
      content: '',
      fileName: `text-${textList.length + 1}.txt`,
      timestamp: Date.now()
    };
    
    setTextError(false);
    
    // 更新节点数据，添加新文本
    const mediaData = {
      textList: [...textList, newText]
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
    
    console.log(`Node ${id} added new text:`, newText);
  };

  const handleTextChange = (textId: string, newContent: string) => {
    const updatedTextList = textList.map(text => 
      text.id === textId 
        ? { ...text, content: newContent }
        : text
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

  const handleDeleteText = (textId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTextList = textList.filter(text => text.id !== textId);

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: { textList: updatedTextList },
              title: updatedTextList.length > 0 ? `Text Set (${updatedTextList.length})` : 'Text Set'
            }
          }
        : node
    ));
  };

  return (
    <>
      <WorkflowNode id={id} data={data} type="text-set" onRefresh={handleRefresh} selected={selected}>
        <div className="w-full flex-1 flex items-center justify-center p-3 min-h-0 nodrag">
          {/* 多文本显示区域 */}
          <div
            className="nodrag nopan nowheel w-full h-full border-2 border-dashed border-gray-300 rounded-lg overflow-auto cursor-pointer hover:border-gray-400 transition-colors relative"
            onWheel={(e) => e.stopPropagation()}
          >
            {textList.length > 0 ? (
              <>
                {/* 文本列表显示 */}
                <div className="nodrag w-full h-full p-2 space-y-2">
                  {textList.map((text, index) => (
                    <div
                      key={text.id}
                      className="nodrag relative bg-gray-50 rounded-lg p-2 border border-gray-200 group"
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* 文本序号和标题 */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500 font-medium">
                          #{index + 1} - {text.fileName}
                        </span>
                        
                        {/* 悬停时显示的删除按钮 */}
                        {hoveredIndex === index && (
                          <button
                            onClick={(e) => handleDeleteText(text.id, e)}
                            className="nodrag p-1 bg-red-100 hover:bg-red-200 rounded-full transition-colors select-none"
                            title="删除文本"
                            draggable={false}
                          >
                            <Trash2 className="w-3 h-3 text-red-600 pointer-events-none" />
                          </button>
                        )}
                      </div>
                      
                      {/* 文本内容输入 */}
                      <textarea
                        value={text.content}
                        onChange={(e) => handleTextChange(text.id, e.target.value)}
                        className="nodrag w-full resize-none border-none outline-none bg-transparent text-sm text-gray-700 placeholder-gray-400"
                        placeholder="输入文本内容..."
                        draggable={false}
                        style={{ minHeight: '60px', maxHeight: '120px' }}
                      />
                    </div>
                  ))}
                  
                  {/* 添加新文本按钮 */}
                  <button
                    onClick={handleAddText}
                    className="nodrag w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700"
                    title="添加新文本"
                    draggable={false}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">添加文本</span>
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
                <div>点击添加文本</div>
                <div className="text-xs mt-1">支持多个文本</div>
              </div>
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
