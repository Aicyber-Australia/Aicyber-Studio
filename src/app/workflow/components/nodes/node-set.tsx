"use client";

import React, { useState, useCallback } from "react";
import { useNodeId, useReactFlow } from "@xyflow/react";
import { BaseNode, BaseNodeHeader, BaseNodeHeaderTitle, BaseNodeContent } from "@/components/base-node";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Trash, Play, RotateCcw } from "lucide-react";
import { AppNode, NodeSetData } from "@/app/workflow/components/nodes";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/app/workflow/store";
import { useWorkflowRunner } from "@/app/workflow/hooks/use-workflow-runner";
import { NodeHandle } from "./workflow-node/node-handle";
import { nodesConfig } from "@/app/workflow/config";




export const NodeSet = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  const nodeId = useNodeId();
  const { setNodes, getNode } = useReactFlow();
  const removeNode = useAppStore((s) => s.removeNode);
  const { runWorkflow } = useWorkflowRunner();

  const node = getNode(nodeId!);
  const data = node?.data as NodeSetData;
  const nodeList = data?.nodeList || [];


  // handle add node use for add a new node into the node set, when realise function such as drag or select a node added into the node set
  const handleAddNode = useCallback(() => {
    if (!nodeId) return;
    
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === nodeId
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


  }, [nodeId, setNodes]);

  // 删除子节点（从 nodeList 中移除）
  const handleRemoveChildNode = useCallback((nodeToRemoveId: string) => {
    if (!nodeId) return;

    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                nodeList: (n.data?.nodeList as AppNode[] || []).filter(
                  (item: AppNode) => item.id !== nodeToRemoveId
                ),
              },
            }
          : n
      )
    );
  }, [nodeId, setNodes]);

  // 删除整个 NodeSet 节点
  const handleRemoveNodeSet = useCallback(() => {
    if (!nodeId) return;
    removeNode(nodeId);
  }, [nodeId, removeNode]);

  const onPlay = useCallback(() => runWorkflow(nodeId!), [nodeId, runWorkflow]);
  const onRemove = useCallback(() => removeNode(nodeId!), [nodeId, removeNode]);

  return (
    <BaseNode ref={ref} {...props}>
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>
          <NodeStatusIndicator status={data?.status}>
            <span className="text-sm font-medium">
              {data?.title || "Node Set"}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              ({nodeList.length} nodes)
            </span>
          </NodeStatusIndicator>
        </BaseNodeHeaderTitle>
        
        {/* 标准操作按钮 */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onPlay}
            className="h-6 w-6 p-0"
            title="运行"
          >
            <Play className="h-3 w-3 stroke-blue-500 fill-blue-500" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            title="删除"
          >
            <Trash className="h-3 w-3" />
          </Button>
        </div>
      </BaseNodeHeader>

      <BaseNodeContent>
        <div className="space-y-2">
          {/* 简化的节点列表展示 */}
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {nodeList.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-2">
                No nodes collected yet
              </div>
            ) : (
              nodeList.map((nodeItem: any, index: number) => (
                <div
                  key={nodeItem.id}
                  className="flex items-center justify-between bg-muted/30 rounded px-2 py-1 text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium text-blue-600">{nodeItem.type}</span>
                    <span className="text-muted-foreground truncate max-w-32">
                      {nodeItem.data?.title || 'Untitled'}
                    </span>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveChildNode(nodeItem.id)}
                    className="h-4 w-4 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    title="删除子节点"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </BaseNodeContent>

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
    </BaseNode>
  );
});

NodeSet.displayName = "NodeSet";
