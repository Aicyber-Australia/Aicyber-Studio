'use client';

import { useState, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useReactFlow } from '@xyflow/react';

import { useAppStore } from '@/app/workflow/store';
import { AppNode } from '@/app/workflow/components/nodes';
import { AppEdge } from '@/app/workflow/components/edges';
import { AppStore } from '@/app/workflow/store/app-store';
import { useToast } from '@/components/toast-provider';
import { nodeRunnerRegistry } from '@/app/workflow/runners/registry';

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

  // 数据收集函数
  const collectInputData = useCallback(
    (node: AppNode) => {
      const inputEdges = getReactFlowEdges().filter(edge => edge.target === node.id);
      console.log(`Input edges for ${node.id}:`, inputEdges);

      const inputDataList: any[] = [];
      for (const edge of inputEdges) {
        const sourceNode = getNode(edge.source);
        if (sourceNode?.data) {
          inputDataList.push(sourceNode.data);
          console.log(`Node ${node.id} received data from ${edge.source}:`, sourceNode.data);
        }
      }
      return inputDataList;
    },
    [getNode, getReactFlowEdges],
  );

  // 自检阶段：只负责类型转换
  const selfCheckNode = useCallback(
    async (node: AppNode, inputDataList: any[]) => {
      console.log('🔄 Self-check - Starting for node:', node.id);
      let runner = nodeRunnerRegistry.getRunner(node.type as string);
      const validation = runner.validate(node, inputDataList, setReactFlowNodes);
      
      if (!validation.isValid) {
        updateNodeStatus(node.id, 'error');
        setLogMessages((prev) => [...prev, `❌ ${validation.error}`]);
        showToast({
          title: "节点错误",
          description: validation.error || `${node.data.title} 校验失败`,
          variant: "error",
        });
        throw new Error(validation.error || 'Self-check failed');
      }
      
      console.log('🔄 Self-check - Completed, node type may have changed');
    },
    [updateNodeStatus, setReactFlowNodes, showToast],
  );

  // Run阶段：重新获取类型并执行
  const processNode = useCallback(
    async (node: AppNode, inputDataList: any[]) => {
      updateNodeStatus(node.id, 'loading');
      setLogMessages((prev) => [...prev, `${node.data.title} processing...`]);
      
      // 重新获取节点类型（可能已经被自检阶段修改）
      const updatedNode = getNode(node.id);
      const finalNodeType = updatedNode?.type || node.type;
      console.log('🔄 Process - Original type:', node.type, 'Final type:', finalNodeType);
      
      // 根据最终类型选择Runner
      const runner = nodeRunnerRegistry.getRunner(finalNodeType as string);
      console.log('🔄 Process - Using runner for type:', finalNodeType);

      // 执行Runner
      const processedData = await runner.run(updatedNode || node, inputDataList);
      console.log(`🔄 Process - Runner returned data:`, processedData);

      // 合并输出到节点 data
      setReactFlowNodes(nodes => nodes.map(n =>
        n.id === node.id
          ? { ...n, data: { ...n.data, ...processedData } }
          : n
      ));

      // 同步更新 Zustand store
      setNodes(
        getNodes().map((n) =>
          n.id === node.id
            ? ({ ...n, data: { ...n.data, ...processedData } } as AppNode)
            : n,
        ),
      );

      updateNodeStatus(node.id, 'success');
      setLogMessages((prev) => [...prev, `✅ ${node.data.title} completed successfully!`]);
      console.log(`Node ${node.id} processing completed successfully!`);
      console.log(`Node ${node.id} final data:`, { ...node.data, ...processedData });
    },
    [updateNodeStatus, getNode, getNodes, setNodes, getReactFlowEdges, setReactFlowNodes, showToast],
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
          // 第一步：收集数据（只收集一次）
          const inputDataList = collectInputData(node);

          // 第二步：自检（只负责类型转换）
          await selfCheckNode(node, inputDataList);

          await new Promise(resolve => setTimeout(resolve, 5));

          // 第三步：执行（重新获取类型并处理数据）
          await processNode(node, inputDataList);

          // 等待状态更新完成，确保下一个节点能获取到最新数据
          await new Promise(resolve => setTimeout(resolve, 50));

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
