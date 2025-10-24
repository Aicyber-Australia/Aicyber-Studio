'use client';

import React, { useState, useCallback } from 'react';
import { useReactFlow, getIncomers, useStore } from '@xyflow/react';
import { WorkflowNodeProps, AppNode, NodeSetData } from '@/app/workflow/components/nodes';
import { nodesConfig } from '../../config';
import { NodeHandle } from './workflow-node/node-handle';
import WorkflowNode from './workflow-node';
import { Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/toast-provider';

function NodeSet({ id, data, selected }: WorkflowNodeProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 使用 ReactFlow 官方 API
  const { setNodes } = useReactFlow();
  const { showToast } = useToast();

  // Subscribe to ReactFlow store for real-time updates
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);

  // 从 data.nodeList 获取所有节点
  const nodeList = (data as NodeSetData)?.nodeList || [];

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
              timestamp: undefined,
              outputData: undefined,
              nodeList: []
            }
          }
        : node
    ));
  };

  // handle add node use for add a new node into the node set, when realise function such as drag or select a node added into the node set
  const handleAddNode = useCallback(() => {
    if (!id) return;

    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                nodeList: [
                  ...(n.data?.nodeList as AppNode[] ?? []),
                  {
                    id: `node-${Date.now()}`,
                    type: 'node-set',
                    data: { title: 'New Node', status: 'initial' },
                    position: { x: 0, y: 0 },
                    timestamp: Date.now()
                  } as AppNode
                ],
              },
            }
          : n
      )
    );
  }, [id, setNodes]);

  // 删除子节点（从 nodeList 中移除）
  const handleRemoveChildNode = useCallback((nodeToRemoveId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;

    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                nodeList: (n.data?.nodeList as AppNode[] || []).filter(
                  (item: AppNode) => item.id !== nodeToRemoveId
                ),
                title: (n.data?.nodeList as AppNode[] || []).filter(
                  (item: AppNode) => item.id !== nodeToRemoveId
                ).length > 0
                  ? `Node Set (${(n.data?.nodeList as AppNode[] || []).filter((item: AppNode) => item.id !== nodeToRemoveId).length})`
                  : 'Node Set'
              },
            }
          : n
      )
    );
  }, [id, setNodes]);

  // Handle input mode change (how to process upstream inputs)
  const handleInputModeChange = useCallback((value: string) => {
    if (!id) return;

    const newInputMode = value as 'cross' | 'sequence' | 'append';

    // If switching to cross or sequence, check incoming MediaSet connections
    if (newInputMode === 'cross' || newInputMode === 'sequence') {
      const currentNode = nodes.find((n) => n.id === id);
      if (currentNode) {
        const incomingNodes = getIncomers(currentNode, nodes, edges);
        const problematicMediaSets: string[] = [];

        incomingNodes.forEach((node) => {
          if (node.type === 'media-set') {
            const media = node.data?.media as any;
            const setOutputMode = node.data?.setOutputMode || 'individual';

            // Check if MediaSet has mixed media types
            if (media?.mediaList && media.mediaList.length > 0) {
              const mediaTypes = new Set(media.mediaList.map((item: any) => item.type));
              const isMixedMediaSet = mediaTypes.size > 1;

              // If mixed types and not integrated, this is problematic
              if (isMixedMediaSet && setOutputMode !== 'integrated') {
                problematicMediaSets.push((node.data?.title as string) || node.id);
              }
            }
          }
        });

        if (problematicMediaSets.length > 0) {
          showToast({
            title: 'Input Mode Change Restricted',
            description: `Cannot switch to ${newInputMode} mode: Connected MediaSet nodes with mixed media types must be in "Integrated" output mode. Affected nodes: ${problematicMediaSets.join(', ')}`,
            variant: 'error',
          });
          return; // Don't change the mode
        }
      }
    }

    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                inputMode: newInputMode,
              },
            }
          : n
      )
    );
  }, [id, setNodes, nodes, edges, showToast]);

  // Handle collector mode change
  const handleCollectorModeChange = useCallback((value: string) => {
    if (!id) return;
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                collectorMode: value as 'normal' | 'collector',
              },
            }
          : n
      )
    );
  }, [id, setNodes]);

  // Handle output mode change (how to send to downstream)
  const handleOutputModeChange = useCallback((value: string) => {
    if (!id) return;
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                outputMode: value as 'loop' | 'direct',
              },
            }
          : n
      )
    );
  }, [id, setNodes]);

  // Get current modes from data
  const inputMode = (data as NodeSetData)?.inputMode || 'sequence';
  const collectorMode = (data as NodeSetData)?.collectorMode || 'normal';
  const outputMode = (data as NodeSetData)?.outputMode || 'loop';

  return (
    <>
      <WorkflowNode id={id} data={data} type="node-set" onRefresh={handleRefresh} selected={selected}>
        <div className="w-full flex-1 flex flex-col p-3 min-h-0 nodrag space-y-2">
          {/* Mode Selection Controls */}
          <div className="nodrag flex flex-col gap-2 flex-shrink-0">
            {/* Input Mode */}
            <div className="flex-1">
              <div className="text-[10px] text-muted-foreground mb-1">Input Processing</div>
              <Select value={inputMode} onValueChange={handleInputModeChange}>
                <SelectTrigger className="h-7 text-xs nodrag">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="nodrag">
                  <SelectItem value="cross" className="text-xs">Cross</SelectItem>
                  <SelectItem value="sequence" className="text-xs">Sequence</SelectItem>
                  <SelectItem value="append" className="text-xs">Append</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Collector and Output Modes */}
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="text-[10px] text-muted-foreground mb-1">Collector</div>
                <Select value={collectorMode} onValueChange={handleCollectorModeChange}>
                  <SelectTrigger className="h-7 text-xs nodrag">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="nodrag">
                    <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                    <SelectItem value="collector" className="text-xs">Collector</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-muted-foreground mb-1">Output</div>
                <Select value={outputMode} onValueChange={handleOutputModeChange}>
                  <SelectTrigger className="h-7 text-xs nodrag">
                    <SelectValue>
                      {outputMode === 'loop' ? 'Individual' : 'Integrated'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="nodrag">
                    <SelectItem value="loop" className="text-xs">Individual</SelectItem>
                    <SelectItem value="direct" className="text-xs">Integrated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 节点列表显示区域 */}
          <div
            className="nodrag nopan nowheel w-full flex-1 border-2 border-dashed border-gray-300 rounded-lg overflow-auto hover:border-gray-400 transition-colors relative"
            onWheel={(e) => e.stopPropagation()}
          >
            {nodeList.length > 0 ? (
              <>
                {/* 节点列表显示 */}
                <div className="nodrag w-full h-full p-2 space-y-1">
                  {nodeList.map((nodeItem: AppNode, index: number) => (
                    <div
                      key={nodeItem.id}
                      className="nodrag relative bg-gray-50 rounded-lg p-2 border border-gray-200 group"
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* 节点信息 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-muted-foreground">#{index + 1}</span>
                          <span className="font-medium text-blue-600">{nodeItem.type}</span>
                          <span className="text-muted-foreground truncate max-w-32">
                            {nodeItem.data?.title || 'Untitled'}
                          </span>
                        </div>

                        {/* 悬停时显示的删除按钮 */}
                        {hoveredIndex === index && (
                          <button
                            onClick={(e) => handleRemoveChildNode(nodeItem.id, e)}
                            className="nodrag p-1 bg-red-100 hover:bg-red-200 rounded-full transition-colors select-none"
                            title="Remove node from set"
                            draggable={false}
                          >
                            <Trash2 className="w-3 h-3 text-red-600 pointer-events-none" />
                          </button>
                        )}
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
            ) : (
              <div className="text-gray-500 text-xs text-center flex flex-col items-center justify-center h-full">
                <div>No nodes collected yet</div>
                <div className="text-xs mt-1">Nodes will be added here</div>
              </div>
            )}
          </div>
        </div>

        {/* Handle 配置 */}
        {nodesConfig['node-set'].handles.map((handle: any) => (
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

export { NodeSet };
export default NodeSet;
