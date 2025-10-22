"use client";

import React, { useState, useCallback } from "react";
import { useNodeId, useReactFlow } from "@xyflow/react";
import { BaseNode, BaseNodeHeader, BaseNodeHeaderTitle, BaseNodeContent } from "@/components/base-node";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Eye, Trash } from "lucide-react";
import { AppNode, NodeSetData } from "@/app/workflow/components/nodes";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/app/workflow/store";




export const NodeSet = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  const nodeId = useNodeId();
  const { setNodes, getNode } = useReactFlow();
  const [isExpanded, setIsExpanded] = useState(false);
  const removeNode = useAppStore((s) => s.removeNode);

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

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

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
        
        {/* 删除整个 NodeSet 的按钮 */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRemoveNodeSet}
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          title="删除整个 NodeSet"
        >
          <Trash className="h-3 w-3" />
        </Button>
      </BaseNodeHeader>

      <BaseNodeContent>
        <div className="space-y-2">
          {/* 控制按钮 */}
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddNode}
              className="h-6 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Node
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleToggleExpanded}
              className="h-6 px-2 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              {isExpanded ? 'Hide' : 'Show'}
            </Button>
          </div>

          {/* 节点列表 */}
          {isExpanded && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {nodeList.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-2">
                  No nodes added yet
                </div>
              ) : (
                nodeList.map((nodeItem: any, index: number) => (
                  <div
                    key={nodeItem.id}
                    className="flex items-center justify-between bg-muted/50 rounded px-2 py-1 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium">{nodeItem.type}</span>
                      <span className="text-muted-foreground">
                        {nodeItem.data?.title || 'Untitled'}
                      </span>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveChildNode(nodeItem.id)}
                      className="h-4 w-4 p-0 text-destructive hover:text-destructive"
                      title="删除子节点"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </BaseNodeContent>
    </BaseNode>
  );
});

NodeSet.displayName = "NodeSet";
