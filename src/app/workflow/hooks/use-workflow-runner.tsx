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
  setEdges: state.setEdges,
});

/**
 * This is a demo workflow runner that runs a simplified version of a workflow.
 * You can customize how nodes are processed by overriding `processNode` or
 * even replacing the entire `collectNodesToProcess` function with your own logic.
 */
export function useWorkflowRunner() {
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const isRunning = useRef(false);
  const { getNodes, setNodes, getEdges, setEdges } = useAppStore(useShallow(selector));
  const { getNode, setNodes: setReactFlowNodes, getEdges: getReactFlowEdges, setEdges: setReactFlowEdges } = useReactFlow();
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
      
      // 如果检测到需要迭代器模式
      if (validation.shouldUseIterator && validation.iterationCount) {
        console.log(`🔄 Self-check - Setting up iterator with ${validation.iterationCount} iterations`);
        setLogMessages((prev) => [...prev, `🔄 Setting up iterator with ${validation.iterationCount} iterations...`]);
        
        // 在节点数据中标记迭代信息
        setReactFlowNodes(nodes => nodes.map(n =>
          n.id === node.id
            ? { ...n, data: { ...n.data, isIterator: true, iterationCount: validation.iterationCount } as any }
            : n
        ));
        
        // 同步更新 Zustand store
        setNodes(
          getNodes().map((n) =>
            n.id === node.id
              ? ({ ...n, data: { ...n.data, isIterator: true, iterationCount: validation.iterationCount } as any } as AppNode)
              : n,
          ),
        );
      }
      
      console.log('🔄 Self-check - Completed, node type may have changed');
    },
    [updateNodeStatus, setReactFlowNodes, showToast, setNodes, getNodes],
  );

  // 执行单个节点的方法（用于迭代器内部）
  const executeNode = useCallback(
    async (node: AppNode, inputDataList: any[]) => {
      updateNodeStatus(node.id, 'loading');
      
      // 获取节点类型和runner
      const runner = nodeRunnerRegistry.getRunner(node.type as string);
      
      // 检查是否需要使用iterator模式
      const validation = runner.validate(node, inputDataList);
      const shouldUseIterator = validation.shouldUseIterator || false;
      
      let processedData: any;
      if (shouldUseIterator && (node.data as any)?.isIterator) {
        // 在迭代器内部，如果遇到另一个迭代器，直接执行runner.run
        // 避免循环依赖，让主workflow处理迭代器逻辑
        processedData = await runner.run(node, inputDataList);
      } else if (shouldUseIterator && runner.iterator) {
        processedData = await runner.iterator(node, inputDataList, node);
      } else {
        processedData = await runner.run(node, inputDataList);
      }
      
      // 更新节点状态和数据
      setReactFlowNodes(nodes => nodes.map(n =>
        n.id === node.id
          ? { ...n, data: { ...n.data, ...processedData } }
          : n
      ));
      
      setNodes(
        getNodes().map((n) =>
          n.id === node.id
            ? ({ ...n, data: { ...n.data, ...processedData } } as AppNode)
            : n,
        ),
      );
      
      updateNodeStatus(node.id, 'success');
      return processedData;
    },
    [updateNodeStatus, getNodes, setNodes, setReactFlowNodes, setLogMessages]
  );

  // 迭代器执行方法 - 不记录result，直接执行完整workflow
  const executeIterator = useCallback(
    async (node: AppNode, inputDataList: any[], iterationCount: number): Promise<void> => {
      console.log(`🔄 Iterator - Starting ${iterationCount} iterations for node:`, node.id);
      setLogMessages((prev) => [...prev, `🔄 Starting ${iterationCount} iterations...`]);
      
      for (let i = 0; i < iterationCount; i++) {
        console.log(`🔄 Iterator - Iteration ${i + 1}/${iterationCount}`);
        setLogMessages((prev) => [...prev, `🔄 Iteration ${i + 1}/${iterationCount}...`]);
        
        // 每次迭代都从当前节点跑到底，让collector收集结果
        const nodes = getNodes();
        const edges = getEdges();
        const nodesToProcess = collectNodesToProcess(nodes, edges, node.id);
        
        for (const currentNode of nodesToProcess) {
          if (!isRunning.current) break;
          
          try {
            const currentInputDataList = collectInputData(currentNode);
            await selfCheckNode(currentNode, currentInputDataList);
            await new Promise(resolve => setTimeout(resolve, 5));
            
            // 使用executeNode来执行节点，确保完整的状态更新
            await executeNode(currentNode, currentInputDataList);
            
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (error) {
            console.error(`Iterator iteration ${i + 1} failed at node ${currentNode.id}:`, error);
            setLogMessages((prev) => [...prev, `❌ Iteration ${i + 1} failed at ${currentNode.data.title}`]);
            break;
          }
        }
        
        console.log(`🔄 Iterator - Iteration ${i + 1} completed`);
      }
      
      console.log(`🔄 Iterator - Completed ${iterationCount} iterations`);
      setLogMessages((prev) => [...prev, `✅ Iterator completed ${iterationCount} iterations`]);
    },
    [getNodes, getEdges, collectInputData, selfCheckNode, setLogMessages, isRunning, executeNode]
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

      // 检查是否需要使用iterator模式
      const validation = runner.validate(updatedNode || node, inputDataList);
      const shouldUseIterator = validation.shouldUseIterator || false;
      
      let processedData: any;
      if (shouldUseIterator && updatedNode?.data?.isIterator) {
        console.log('🔄 Process - Using iterator mode with full workflow execution');
        setLogMessages((prev) => [...prev, `${node.data.title} using iterator mode with full workflow execution...`]);
        
        const iterationCount = (updatedNode.data as any).iterationCount || 1;
        await executeIterator(updatedNode as AppNode, inputDataList, iterationCount);
        
        // 迭代器不返回具体结果，让collector收集
        processedData = {
          executionMode: 'iterator',
          totalIterations: iterationCount,
          completed: true
        };
      } else if (shouldUseIterator && runner.iterator) {
        console.log('🔄 Process - Using iterator mode');
        setLogMessages((prev) => [...prev, `${node.data.title} using iterator mode...`]);
        processedData = await runner.iterator(updatedNode || node, inputDataList, updatedNode || node);
      } else {
        console.log('🔄 Process - Using run mode');
        processedData = await runner.run(updatedNode || node, inputDataList);
      }
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
    [updateNodeStatus, getNode, getNodes, setNodes, getReactFlowEdges, setReactFlowNodes, showToast, executeIterator],
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
      
      // 检查workflow中是否有action node
      const hasActionNode = nodesToProcess.some(node => 
        ['image-to-image-node', 'image-replicate-node', 'video-to-video-node', 'image-to-text-node', 'edit-image-node'].includes(node.type)
      );
      
      if (hasActionNode) {
        // 如果有action node，检查最后一个节点是否是collector
        const lastNode = nodesToProcess[nodesToProcess.length - 1];
        const hasCollector = lastNode?.type === 'node-set' && 
                            (lastNode.data as any)?.collectorMode === 'collector';
        
        if (!hasCollector) {
          // 自动添加collector节点
          console.log('🔄 Workflow - Adding collector node automatically');
          setLogMessages((prev) => [...prev, '🔄 Adding collector node automatically...']);
          
          const collectorId = `collector-${Date.now()}`;
          const collectorNode = {
            id: collectorId,
            type: 'node-set',
            data: {
              title: 'Auto Collector',
              status: 'success',
              icon: 'Layers',
              inputMode: 'sequence',
              collectorMode: 'collector',
              outputMode: 'loop',
              nodeList: [],
              timestamp: Date.now()
            },
            position: { x: 400, y: 200 },
            width: 200,
            height: 100
          };
          
          // 添加collector节点到工作流
          setReactFlowNodes(nodes => [...nodes, collectorNode as any]);
          setNodes([...getNodes(), collectorNode as any]);
          
          // 创建从最后一个节点到collector的边
          const lastNodeId = lastNode.id;
          const newEdge = {
            id: `edge-${lastNodeId}-${collectorId}`,
            source: lastNodeId,
            target: collectorId,
            type: 'default'
          };
          
          setReactFlowEdges(edges => [...edges, newEdge as any]);
          setEdges([...getEdges(), newEdge as any]);
          
          setLogMessages((prev) => [...prev, '✅ Collector node added automatically']);
        } else {
          setLogMessages((prev) => [...prev, '✅ Workflow validated: ends with collector']);
        }
      } else {
        setLogMessages((prev) => [...prev, '✅ Workflow validated: no action nodes, no collector needed']);
      }

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

          // 检查是否是迭代器模式，如果是则停止执行后续节点
          const updatedNode = getNode(node.id);
          if (updatedNode?.data?.executionMode === 'iterator') {
            console.log('🔄 Workflow - Iterator mode detected, stopping subsequent nodes');
            setLogMessages((prev) => [...prev, '🔄 Iterator mode completed, stopping workflow...']);
            break; // 停止执行，因为迭代器已经执行了完整workflow
          }

          // 等待状态更新完成，确保下一个节点能获取到最新数据
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
          console.error(`Node ${node.id} processing failed:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          // Update node status to error
          updateNodeStatus(node.id, 'error');

          setLogMessages((prev) => [...prev, `❌ Workflow stopped due to error in ${node.data.title}: ${errorMessage}`]);
          showToast({
            title: "Workflow Error",
            description: `${node.data.title}: ${errorMessage}`,
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
