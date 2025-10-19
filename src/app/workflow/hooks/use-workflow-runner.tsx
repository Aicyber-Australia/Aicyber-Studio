'use client';

import { useState, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useReactFlow } from '@xyflow/react';

import { useAppStore } from '@/app/workflow/store';
import { AppNode } from '@/app/workflow/components/nodes';
import { AppEdge } from '@/app/workflow/components/edges';
import { AppStore } from '@/app/workflow/store/app-store';
import { useToast } from '@/components/toast-provider';

const selector = (state: AppStore) => ({
  getNodes: state.getNodes,
  setNodes: state.setNodes,
  getEdges: state.getEdges,
});

/**
 * This is a demo workflow runner that runs a simplified version of a workflow.
 * You can customize how nodes are processed by overriding `processNode` or
 * even replacing the entire `collectNodesToProcess` function with your own logic.
 */
export function useWorkflowRunner() {
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const isRunning = useRef(false);
  const { getNodes, setNodes, getEdges } = useAppStore(useShallow(selector));
  const { getNode, setNodes: setReactFlowNodes, getEdges: getReactFlowEdges } = useReactFlow();
  const { showToast } = useToast();

  const stopWorkflow = useCallback(() => {
    isRunning.current = false;
    setLogMessages((prev) => [...prev, 'Workflow stopped.']);
  }, []);

  const resetNodeStatus = useCallback(() => {
    const nodes = getNodes();
    setNodes(
      nodes.map((node) => ({
        ...node,
        data: { ...node.data, status: 'initial' },
      })),
    );
    
    // 也更新 ReactFlow 的状态
    setReactFlowNodes(nodes => nodes.map(node => ({
      ...node,
      data: { ...node.data, status: 'initial' }
    })));
  }, [getNodes, setNodes, setReactFlowNodes]);

  const updateNodeStatus = useCallback(
    (nodeId: string, status: string) => {
      // 同时更新两个状态管理系统
      setNodes(
        getNodes().map((node) =>
          node.id === nodeId
            ? ({ ...node, data: { ...node.data, status } } as AppNode)
            : node,
        ),
      );
      
      // 也更新 ReactFlow 的状态
      setReactFlowNodes(nodes => nodes.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, status } }
          : node
      ));
    },
    [setNodes, getNodes, setReactFlowNodes],
  );

  const processNode = useCallback(
    async (node: AppNode) => {
      updateNodeStatus(node.id, 'loading');
      setLogMessages((prev) => [...prev, `${node.data.title} processing...`]);

      // 获取当前节点的数据
      const currentNode = getNode(node.id);
      const inputEdges = getReactFlowEdges().filter(edge => edge.target === node.id);
      console.log(`Input edges for ${node.id}:`, inputEdges);

      if (inputEdges.length === 0) {
        if (!currentNode?.data?.imageUrl) {
          console.log(`Node ${node.id} is a start node but has no image data, error...`);
          updateNodeStatus(node.id, 'error');
          setLogMessages((prev) => [...prev, `❌ ${node.data.title} has no image data!`]);
          showToast({
            title: "节点错误",
            description: `${node.data.title} 没有图片数据`,
            variant: "error"
          });
          throw new Error(`Node ${node.id} has no image data`);
        }
      }
  

      const inputDataList = [];
      for (const edge of inputEdges) {
        const sourceNode = getNode(edge.source);
        if (sourceNode?.data) {
          inputDataList.push(sourceNode.data);
          console.log(`Node ${node.id} received data from ${edge.source}:`, sourceNode.data);
        }
      }


      
      // 如果没有输入数据，检查当前节点是否有数据
      if (inputDataList.length === 0) {
        if (!currentNode?.data?.imageUrl) {
          console.log(`Node ${node.id} has no input data and no local data, error...`);
          updateNodeStatus(node.id, 'error');
          setLogMessages((prev) => [...prev, `❌ ${node.data.title} has no image data!`]);
          showToast({
            title: "节点错误",
            description: `${node.data.title} 没有图片数据`,
            variant: "error"
          });
          throw new Error(`Node ${node.id} has no image data`);
        }
        // 如果有本地数据，继续处理
        console.log(`Node ${node.id} using local data...`);
      }
      
      // 模拟处理时间
      await new Promise((resolve) => setTimeout(resolve, 1000));

     

      // 使用输入数据或当前节点数据
      const sourceData = inputDataList.length > 0 ? inputDataList[0] : currentNode?.data;
      
      const processedData = {
        imageUrl: sourceData?.imageUrl,
        fileName: `processed-${sourceData?.fileName || 'image'}`,
        timestamp: Date.now()
      };

    
      setReactFlowNodes(nodes => nodes.map(n => 
        n.id === node.id 
          ? { ...n, data: { ...n.data, ...processedData } }  // 直接合并到 data
          : n
      ));

      updateNodeStatus(node.id, 'success');
      setLogMessages((prev) => [...prev, `✅ ${node.data.title} completed successfully!`]);
      console.log(`Node ${node.id} processing completed successfully!`);

      // 准备要传递的数据
    },
    [updateNodeStatus, resetNodeStatus, getNode, getReactFlowEdges, setReactFlowNodes],
  );

  const runWorkflow = useCallback(
    async (startNodeId?: string) => {
      if (isRunning.current) return;
      const nodes = getNodes();
      const edges = getEdges();
      isRunning.current = true;

      // for this demo, we'll start with the passed start node
      // or the first node that doesn't have any incoming edges
      const _startNodeId =
        startNodeId ||
        nodes.find((node) => !edges.some((e) => e.target === node.id))?.id;

      if (!_startNodeId) {
        return;
      }

      setLogMessages(['Starting workflow...']);

      const nodesToProcess = collectNodesToProcess(nodes, edges, _startNodeId);

      for (const node of nodesToProcess) {
        if (!isRunning.current) break;
        
        try {
          await processNode(node);
        } catch (error) {
          console.error(`Node ${node.id} processing failed:`, error);
          setLogMessages((prev) => [...prev, `❌ Workflow stopped due to error in ${node.data.title}`]);
          showToast({
            title: "工作流错误",
            description: `工作流在 ${node.data.title} 节点处停止`,
            variant: "error"
          });
          isRunning.current = false;
          return; // 停止工作流
        }
      }

      if (isRunning.current) {
        setLogMessages((prev) => [...prev, '✅ Workflow processing complete.']);
      }

      isRunning.current = false;
    },
    [getNodes, getEdges, processNode],
  );

  return {
    logMessages,
    runWorkflow,
    stopWorkflow,
    isRunning: isRunning.current,
  };
}

/**
 * This is a very simplified example of how you might traverse a graph and collect nodes to process.
 * It's not meant to be used in production, but you can use it as a starting point for your own logic.
 */
function collectNodesToProcess(
  nodes: AppNode[],
  edges: AppEdge[],
  startNodeId: string,
) {
  const nodesToProcess: AppNode[] = [];
  const visited = new Set();

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    nodesToProcess.push(node);

    const outgoingEdges = edges.filter((e) => e.source === nodeId);
    for (const edge of outgoingEdges) {
      visit(edge.target);
    }
  }

  visit(startNodeId);

  return nodesToProcess;
}
