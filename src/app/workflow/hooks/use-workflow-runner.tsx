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
 * Deduplicates API responses based on URL and type.
 * This prevents duplicate entries in the apiResponses array during progressive iterations.
 */
function deduplicateApiResponses(responses: any[]): any[] {
  const seen = new Set<string>();
  const deduplicated: any[] = [];

  for (const response of responses) {
    // Create a unique key based on URL and type
    // For errors, use the error message as well
    let key: string;
    if ('error' in response) {
      key = `error:${response.error}:${response.errorCode || ''}`;
    } else {
      key = `${response.type}:${response.url}`;
    }

    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(response);
    }
  }

  return deduplicated;
}

/**
 * Deduplicates media items based on their content (URL for images/videos, content for text).
 * This prevents duplicate media entries during progressive iterations.
 */
function deduplicateMediaItems(mediaItems: any[]): any[] {
  const seen = new Set<string>();
  const deduplicated: any[] = [];

  for (const item of mediaItems) {
    // Create a unique key based on type and URL/content
    let key: string;
    if (item.type === 'text') {
      key = `text:${item.content || ''}`;
    } else if (item.type === 'image' || item.type === 'video') {
      key = `${item.type}:${item.url || ''}`;
    } else {
      // Fallback for unknown types
      key = JSON.stringify(item);
    }

    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(item);
    }
  }

  return deduplicated;
}

/**
 * This is a demo workflow runner that runs a simplified version of a workflow.
 * You can customize how nodes are processed by overriding `processNode` or
 * even replacing the entire `collectNodesToProcess` function with your own logic.
 */
export function useWorkflowRunner() {
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const isRunning = useRef(false);
  const breakpointNodeId = useRef<string | null>(null); // Track which node hit a breakpoint
  const { getNodes, setNodes, getEdges } = useAppStore(useShallow(selector));
  const { getNode, setNodes: setReactFlowNodes, getEdges: getReactFlowEdges } = useReactFlow();
  const { showToast } = useToast();

  /**
   * Check if all upstream nodes of a given node are marked as completed
   * @param nodeId - The ID of the node to check
   * @returns true if all upstream nodes have status 'success', false otherwise
   */
  const areAllUpstreamNodesCompleted = useCallback((nodeId: string): boolean => {
    const edges = getReactFlowEdges();
    const upstreamEdges = edges.filter(e => e.target === nodeId);

    // If no upstream edges, node can run
    if (upstreamEdges.length === 0) {
      return true;
    }

    const allComplete = upstreamEdges.every(upEdge => {
      const upstreamNode = getNode(upEdge.source);
      if (!upstreamNode) {
        console.warn(`⚠️ Upstream node ${upEdge.source} not found for node ${nodeId}`);
        return false;
      }

      const upstreamData = upstreamNode.data as any;
      const isComplete = upstreamData?.status === 'success';

      console.log(`🔍 Checking upstream ${upEdge.source} for ${nodeId}: status=${upstreamData?.status}, complete=${isComplete}`);
      return isComplete;
    });

    return allComplete;
  }, [getNode, getReactFlowEdges]);

  /**
   * Check if a node can run (all its upstream nodes are completed)
   * @param nodeId - The ID of the node to check
   * @returns true if the node can run, false otherwise
   */
  const canNodeRun = useCallback((nodeId: string): boolean => {
    const edges = getReactFlowEdges();
    const upstreamEdges = edges.filter(e => e.target === nodeId);

    // If no upstream edges, node can run
    if (upstreamEdges.length === 0) {
      return true;
    }

    // Check if all upstream nodes are completed
    return upstreamEdges.every(upEdge => {
      const upstreamNode = getNode(upEdge.source);
      if (!upstreamNode) return false;

      const upstreamData = upstreamNode.data as any;
      return upstreamData?.status === 'success';
    });
  }, [getNode, getReactFlowEdges]);

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

  // Clear downstream nodes (media, status, processedMediaIds) while preserving mode selections
  const clearDownstreamNodes = useCallback((startNodeId: string) => {
    const edges = getReactFlowEdges();
    const downstreamNodeIds = new Set<string>();

    // Recursively collect all downstream node IDs
    const collectDownstream = (nodeId: string) => {
      const outgoing = edges.filter(e => e.source === nodeId);
      outgoing.forEach(edge => {
        if (!downstreamNodeIds.has(edge.target)) {
          downstreamNodeIds.add(edge.target);
          collectDownstream(edge.target);
        }
      });
    };

    collectDownstream(startNodeId);

    console.log(`🔄 Clearing ${downstreamNodeIds.size} downstream nodes from ${startNodeId}`);

    // Clear data for downstream nodes
    setReactFlowNodes(nodes => nodes.map(node => {
      if (downstreamNodeIds.has(node.id)) {
        const nodeData = node.data as any;
        // Build cleared data, preserving only mode selections
        const clearedData: any = {
          ...node.data,
          status: 'initial',
          media: undefined,
          apiResponses: undefined,
          executionMetadata: undefined,
          processedMediaIds: undefined,
          fileName: undefined,
          timestamp: undefined,
        };

        // Preserve mode selections if they exist
        if (nodeData.selectedModel !== undefined) clearedData.selectedModel = nodeData.selectedModel;
        if (nodeData.executionMode !== undefined) clearedData.executionMode = nodeData.executionMode;
        if (nodeData.setOutputMode !== undefined) clearedData.setOutputMode = nodeData.setOutputMode;
        if (nodeData.prompt !== undefined) clearedData.prompt = nodeData.prompt;
        if (nodeData.inputMode !== undefined) clearedData.inputMode = nodeData.inputMode;
        if (nodeData.collectorMode !== undefined) clearedData.collectorMode = nodeData.collectorMode;
        if (nodeData.outputMode !== undefined) clearedData.outputMode = nodeData.outputMode;
        if (nodeData.nodeList !== undefined) clearedData.nodeList = [];
        if (nodeData.hasBreakpoint !== undefined) clearedData.hasBreakpoint = nodeData.hasBreakpoint;

        return {
          ...node,
          data: clearedData
        };
      }
      return node;
    }));

    // Also update Zustand store
    setNodes(
      getNodes().map((node) => {
        if (downstreamNodeIds.has(node.id)) {
          const nodeData = node.data as any;
          // Build cleared data, preserving only mode selections
          const clearedData: any = {
            ...node.data,
            status: 'initial',
            media: undefined,
            apiResponses: undefined,
            executionMetadata: undefined,
            processedMediaIds: undefined,
            fileName: undefined,
            timestamp: undefined,
          };

          // Preserve mode selections if they exist
          if (nodeData.selectedModel !== undefined) clearedData.selectedModel = nodeData.selectedModel;
          if (nodeData.executionMode !== undefined) clearedData.executionMode = nodeData.executionMode;
          if (nodeData.setOutputMode !== undefined) clearedData.setOutputMode = nodeData.setOutputMode;
          if (nodeData.prompt !== undefined) clearedData.prompt = nodeData.prompt;
          if (nodeData.inputMode !== undefined) clearedData.inputMode = nodeData.inputMode;
          if (nodeData.collectorMode !== undefined) clearedData.collectorMode = nodeData.collectorMode;
          if (nodeData.outputMode !== undefined) clearedData.outputMode = nodeData.outputMode;
          if (nodeData.nodeList !== undefined) clearedData.nodeList = [];

          return {
            ...node,
            data: clearedData
          } as AppNode;
        }
        return node;
      })
    );
  }, [getNodes, setNodes, getReactFlowEdges, setReactFlowNodes]);

  // Clear all non-initial nodes (nodes that have incoming edges)
  const clearAllDownstreamNodes = useCallback(() => {
    const edges = getReactFlowEdges();
    const nodesWithInputs = new Set(edges.map(e => e.target));

    console.log(`🔄 Clearing all ${nodesWithInputs.size} downstream nodes`);

    // Clear data for nodes with incoming edges
    setReactFlowNodes(nodes => nodes.map(node => {
      if (nodesWithInputs.has(node.id)) {
        const nodeData = node.data as any;
        // Build cleared data, preserving only mode selections
        const clearedData: any = {
          ...node.data,
          status: 'initial',
          media: undefined,
          apiResponses: undefined,
          executionMetadata: undefined,
          processedMediaIds: undefined,
          fileName: undefined,
          timestamp: undefined,
        };

        // Preserve mode selections if they exist
        if (nodeData.selectedModel !== undefined) clearedData.selectedModel = nodeData.selectedModel;
        if (nodeData.executionMode !== undefined) clearedData.executionMode = nodeData.executionMode;
        if (nodeData.setOutputMode !== undefined) clearedData.setOutputMode = nodeData.setOutputMode;
        if (nodeData.prompt !== undefined) clearedData.prompt = nodeData.prompt;
        if (nodeData.inputMode !== undefined) clearedData.inputMode = nodeData.inputMode;
        if (nodeData.collectorMode !== undefined) clearedData.collectorMode = nodeData.collectorMode;
        if (nodeData.outputMode !== undefined) clearedData.outputMode = nodeData.outputMode;
        if (nodeData.nodeList !== undefined) clearedData.nodeList = [];
        if (nodeData.hasBreakpoint !== undefined) clearedData.hasBreakpoint = nodeData.hasBreakpoint;

        return {
          ...node,
          data: clearedData
        };
      }
      return node;
    }));

    // Also update Zustand store
    setNodes(
      getNodes().map((node) => {
        if (nodesWithInputs.has(node.id)) {
          const nodeData = node.data as any;
          // Build cleared data, preserving only mode selections
          const clearedData: any = {
            ...node.data,
            status: 'initial',
            media: undefined,
            apiResponses: undefined,
            executionMetadata: undefined,
            processedMediaIds: undefined,
            fileName: undefined,
            timestamp: undefined,
          };

          // Preserve mode selections if they exist
          if (nodeData.selectedModel !== undefined) clearedData.selectedModel = nodeData.selectedModel;
          if (nodeData.executionMode !== undefined) clearedData.executionMode = nodeData.executionMode;
          if (nodeData.setOutputMode !== undefined) clearedData.setOutputMode = nodeData.setOutputMode;
          if (nodeData.prompt !== undefined) clearedData.prompt = nodeData.prompt;
          if (nodeData.inputMode !== undefined) clearedData.inputMode = nodeData.inputMode;
          if (nodeData.collectorMode !== undefined) clearedData.collectorMode = nodeData.collectorMode;
          if (nodeData.outputMode !== undefined) clearedData.outputMode = nodeData.outputMode;
          if (nodeData.nodeList !== undefined) clearedData.nodeList = [];

          return {
            ...node,
            data: clearedData
          } as AppNode;
        }
        return node;
      })
    );
  }, [getNodes, setNodes, getReactFlowEdges, setReactFlowNodes]);

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
    (node: AppNode, filterProcessed: boolean = false) => {
      const inputEdges = getReactFlowEdges().filter(edge => edge.target === node.id);
      console.log(`Input edges for ${node.id}:`, inputEdges);

      const inputDataList: any[] = [];
      for (const edge of inputEdges) {
        const sourceNode = getNode(edge.source);
        if (sourceNode?.data) {
          let nodeData: any = sourceNode.data;

          // In progressive mode, filter out already-processed media items
          if (filterProcessed && nodeData.media?.mediaList && Array.isArray(nodeData.media.mediaList)) {
            // Get the set of already-processed media IDs for this source
            const currentNodeData = node.data as any;
            const processedIds = new Set(
              (currentNodeData.processedMediaIds?.[edge.source] || []) as string[]
            );

            // Filter out processed media items
            const unprocessedMediaList = nodeData.media.mediaList.filter(
              (mediaItem: any) => !processedIds.has(mediaItem.url || mediaItem.id || JSON.stringify(mediaItem))
            );

            if (unprocessedMediaList.length > 0) {
              nodeData = {
                ...nodeData,
                media: {
                  ...nodeData.media,
                  mediaList: unprocessedMediaList
                }
              };
              console.log(`Node ${node.id} filtered data from ${edge.source}: ${nodeData.media.mediaList.length} -> ${unprocessedMediaList.length} items`);
            } else {
              console.log(`Node ${node.id} skipping ${edge.source}: all items already processed`);
              continue; // Skip this source entirely if all items are processed
            }
          }

          inputDataList.push(nodeData);
          console.log(`Node ${node.id} received data from ${edge.source}:`, nodeData);
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
    async (node: AppNode, inputDataList: any[], skipDownstream: boolean = false, isProgressiveIteration: boolean = false, subflowContext: Set<string> = new Set()) => {
      updateNodeStatus(node.id, 'loading');
      setLogMessages((prev) => [...prev, `${node.data.title} processing...`]);

      // Initialize or update subflow context - tracks which nodes are part of this execution path
      const currentSubflowContext = new Set(subflowContext);
      currentSubflowContext.add(node.id);

      // 重新获取节点类型（可能已经被自检阶段修改）
      const updatedNode = getNode(node.id);
      const finalNodeType = updatedNode?.type || node.type;
      console.log('🔄 Process - Original type:', node.type, 'Final type:', finalNodeType);

      // 根据最终类型选择Runner
      const runner = nodeRunnerRegistry.getRunner(finalNodeType as string);
      console.log('🔄 Process - Using runner for type:', finalNodeType);

      // Create real-time update callback for action nodes
      const updateNodeDataCallback = (partialData: any) => {
        console.log('🔄 Real-time update:', partialData);

        // If this is a progressive iteration (downstream node being called multiple times),
        // we need to accumulate real-time updates
        // Otherwise, the action-node-runner sends cumulative data, so just replace
        if (isProgressiveIteration) {
          console.log('🔄 Real-time update - Accumulating for progressive iteration');
          setReactFlowNodes(nodes => nodes.map(n => {
            if (n.id === node.id) {
              const currentData = n.data as any;
              const newData = { ...n.data, ...partialData };

              // Merge media lists if they exist (with deduplication)
              if (partialData.media?.mediaList && currentData.media?.mediaList) {
                const mergedMediaList = [...currentData.media.mediaList, ...partialData.media.mediaList];
                newData.media = {
                  ...partialData.media,
                  mediaList: deduplicateMediaItems(mergedMediaList)
                };
              }

              // Merge apiResponses if they exist (with deduplication)
              if (partialData.apiResponses && currentData.apiResponses) {
                const mergedResponses = [...currentData.apiResponses, ...partialData.apiResponses];
                newData.apiResponses = deduplicateApiResponses(mergedResponses);
              }

              return { ...n, data: newData };
            }
            return n;
          }));

          // Update Zustand store
          setNodes(
            getNodes().map((n) => {
              if (n.id === node.id) {
                const currentData = n.data as any;
                const newData = { ...n.data, ...partialData };

                // Merge media lists if they exist (with deduplication)
                if (partialData.media?.mediaList && currentData.media?.mediaList) {
                  const mergedMediaList = [...currentData.media.mediaList, ...partialData.media.mediaList];
                  newData.media = {
                    ...partialData.media,
                    mediaList: deduplicateMediaItems(mergedMediaList)
                  };
                }

                // Merge apiResponses if they exist (with deduplication)
                if (partialData.apiResponses && currentData.apiResponses) {
                  const mergedResponses = [...currentData.apiResponses, ...partialData.apiResponses];
                  newData.apiResponses = deduplicateApiResponses(mergedResponses);
                }

                return { ...n, data: newData } as AppNode;
              }
              return n;
            }),
          );
        } else {
          // Normal mode: action-node-runner sends cumulative data, just replace
          // Update ReactFlow nodes
          setReactFlowNodes(nodes => nodes.map(n =>
            n.id === node.id
              ? { ...n, data: { ...n.data, ...partialData } }
              : n
          ));

          // Update Zustand store
          setNodes(
            getNodes().map((n) =>
              n.id === node.id
                ? ({ ...n, data: { ...n.data, ...partialData } } as AppNode)
                : n,
            ),
          );
        }
      };

      // Progressive mode callback - executes downstream workflow for each media set
      const progressiveCallback = async (
        mediaSetIndex: number,
        _mediaSet: any,
        _continueDownstream: () => Promise<void>
      ) => {
        console.log(`🔄 Progressive - Processing mediaSet ${mediaSetIndex + 1}, executing downstream workflow`);
        console.log(`🔄 Progressive - Current subflow context:`, Array.from(currentSubflowContext));

        // Get downstream nodes
        const edges = getReactFlowEdges();
        const downstreamEdges = edges.filter(edge => edge.source === node.id);

        if (downstreamEdges.length === 0) {
          console.log('🔄 Progressive - No downstream nodes');
          return;
        }

        // Execute each downstream node - PARALLEL for multiple branches
        // When there are multiple downstream edges (branches/subflows), execute them in parallel
        const subflowPromises = downstreamEdges.map(async (edge) => {
          const downstreamNode = getNode(edge.target);
          if (!downstreamNode) return;

          // CRITICAL: Check if this downstream node belongs to the current subflow
          // A node belongs to current subflow if ALL its upstream nodes are either:
          // 1. In the current subflow context, OR
          // 2. Have no connection to other parallel subflows
          const downstreamUpstreamEdges = edges.filter(e => e.target === downstreamNode.id);
          const isInCurrentSubflow = downstreamUpstreamEdges.every(upEdge => {
            // If the upstream is in our current context, it's definitely part of this subflow
            if (currentSubflowContext.has(upEdge.source)) {
              return true;
            }

            // If the upstream is NOT in our context, check if it's completed
            // If it's completed, this node might be waiting for multiple subflows to converge
            const upNode = getNode(upEdge.source);
            const upNodeData = upNode?.data as any;
            return upNodeData?.status === 'success';
          });

          if (!isInCurrentSubflow) {
            console.log(`🔄 Progressive - Skipping ${downstreamNode.id} - belongs to different subflow or waiting for other upstream nodes`);
            return;
          }

          console.log(`🔄 Progressive - Node ${downstreamNode.id} confirmed in current subflow, proceeding`);

          // Check if downstream node is in concurrent mode
          const downstreamNodeData = downstreamNode.data as any;
          const isConcurrentDownstream = downstreamNodeData?.executionMode === 'concurrent';

          if (isConcurrentDownstream) {
            console.log(`🔄 Progressive - Skipping concurrent downstream node ${downstreamNode.id} - will be executed after all upstream nodes complete`);

            // Check if all upstream nodes are completed for this concurrent node
            if (areAllUpstreamNodesCompleted(downstreamNode.id)) {
              console.log(`✅ Concurrent node ${downstreamNode.id} has all upstream nodes completed, but skipping during progressive iteration`);
            } else {
              console.log(`⏸️ Concurrent node ${downstreamNode.id} still waiting for upstream nodes to complete`);
            }

            return; // Skip concurrent nodes during progressive iteration
          }

          // Additional validation for Progressive nodes in Progressive mode
          const isProgressiveDownstream = downstreamNodeData?.executionMode === 'progressive';
          if (isProgressiveDownstream) {
            // Check if any input edges contain non-action nodes
            const downstreamUpstreamEdges = edges.filter(e => e.target === downstreamNode.id);
            let hasIncompleteNonActionNode = false;

            for (const upEdge of downstreamUpstreamEdges) {
              const upstreamNode = getNode(upEdge.source);
              if (!upstreamNode) continue;

              const upstreamNodeType = upstreamNode.type as string;
              const upstreamNodeData = upstreamNode.data as any;
              const isUpstreamActionNode = isActionNode(upstreamNodeType);

              // If upstream is a non-action node, check if it's completed
              if (!isUpstreamActionNode) {
                const isCompleted = upstreamNodeData?.status === 'success';
                if (!isCompleted) {
                  hasIncompleteNonActionNode = true;
                  console.log(`🔄 Progressive - Downstream progressive node ${downstreamNode.id} has incomplete non-action upstream ${upEdge.source} (status: ${upstreamNodeData?.status})`);
                  break;
                }
              }
            }

            if (hasIncompleteNonActionNode) {
              console.log(`🔄 Progressive - Skipping progressive downstream node ${downstreamNode.id} - non-action upstream nodes not completed`);
              return; // Skip this progressive node - it's not runnable yet
            }
          }

          console.log(`🔄 Progressive - Executing downstream node: ${downstreamNode.id}`);

          // Collect all nodes from this downstream node onwards
          const nodes = getNodes();
          const allEdges = getEdges();
          let downstreamNodesToProcess = collectNodesToProcess(nodes, allEdges, downstreamNode.id);

          // Filter out nodes that are themselves in progressive mode and have downstream connections
          // They will handle their own downstream processing
          downstreamNodesToProcess = downstreamNodesToProcess.filter((dsNode, index) => {
            // Keep the first node (the immediate downstream)
            if (index === 0) return true;

            // For subsequent nodes, check if their immediate parent is in progressive mode
            const parentEdges = allEdges.filter(e => e.target === dsNode.id);
            const hasProgressiveParent = parentEdges.some(edge => {
              const parentNode = nodes.find(n => n.id === edge.source);
              const parentData = parentNode?.data as any;
              return parentData?.executionMode === 'progressive';
            });

            // If parent is progressive, let the parent handle this node
            if (hasProgressiveParent) {
              console.log(`🔄 Progressive - Skipping ${dsNode.id} because parent is progressive`);
              return false;
            }

            return true;
          });

          // Execute each downstream node sequentially within this subflow
          for (let dsIndex = 0; dsIndex < downstreamNodesToProcess.length; dsIndex++) {
            const dsNode = downstreamNodesToProcess[dsIndex];

            if (!isRunning.current) {
              throw new Error('Workflow stopped by user');
            }

            try {
              // For progressive mode, we need to collect ONLY the new items from this iteration
              // Instead of pulling from accumulated mediaList and filtering, we build input from scratch

              // Get all upstream nodes of dsNode
              const dsUpstreamEdges = edges.filter(e => e.target === dsNode.id);
              const dsInputDataList: any[] = [];

              for (const upEdge of dsUpstreamEdges) {
                const upstreamNode = getNode(upEdge.source);
                if (!upstreamNode?.data) continue;

                const upstreamData = upstreamNode.data as any;

                if (upEdge.source === node.id) {
                  // This is the current node - get only NEW items from this iteration
                  // Check what was already processed
                  const dsNodeData = getNode(dsNode.id)?.data as any;
                  const processedIds = new Set(
                    (dsNodeData?.processedMediaIds?.[node.id] || []) as string[]
                  );

                  if (upstreamData.media?.mediaList && Array.isArray(upstreamData.media.mediaList)) {
                    // Filter to get only unprocessed items
                    const unprocessedMediaList = upstreamData.media.mediaList.filter(
                      (mediaItem: any) => !processedIds.has(mediaItem.url || mediaItem.id || JSON.stringify(mediaItem))
                    );

                    if (unprocessedMediaList.length > 0) {
                      dsInputDataList.push({
                        ...upstreamData,
                        media: {
                          ...upstreamData.media,
                          mediaList: unprocessedMediaList
                        }
                      });
                    }
                  }
                } else {
                  // Other upstream nodes - include their full data
                  dsInputDataList.push(upstreamData);
                }
              }

              // If no new data to process, skip this node
              if (!dsInputDataList || dsInputDataList.length === 0) {
                console.log(`🔄 Progressive - No new data for downstream node ${dsNode.id}, skipping`);
                continue;
              }

              // Extract the media items that will be processed
              const mediaItemsToProcess: string[] = [];
              dsInputDataList.forEach((inputData: any) => {
                if (inputData.media?.mediaList) {
                  inputData.media.mediaList.forEach((item: any) => {
                    mediaItemsToProcess.push(item.url || item.id || JSON.stringify(item));
                  });
                }
              });

              console.log(`🔄 Progressive - Processing ${mediaItemsToProcess.length} new items in ${dsNode.id}`);

              // Self-check
              await selfCheckNode(dsNode, dsInputDataList);
              await new Promise(resolve => setTimeout(resolve, 5));

              // Process downstream node
              // If this is the first node and it's progressive, allow it to handle its own downstream
              // Otherwise skip downstream to avoid infinite loops
              const skipDsDownstream = dsIndex > 0; // Only first node can handle its own downstream

              // Mark as progressive iteration so results are accumulated
              // Pass subflow context to ensure downstream nodes track their execution path
              await processNode(dsNode, dsInputDataList, skipDsDownstream, true, currentSubflowContext);

              // After processing, mark ONLY the items we just processed
              if (mediaItemsToProcess.length > 0) {
                // IMPORTANT: We need to wait for state updates to propagate
                await new Promise(resolve => setTimeout(resolve, 10));

                // Get current processed IDs from the latest node state
                const currentDsNode = getNode(dsNode.id);
                const currentDsNodeData = currentDsNode?.data as any;
                const currentProcessedIds = currentDsNodeData?.processedMediaIds?.[node.id] || [];

                // Merge with new processed IDs
                const updatedProcessedIds = [...currentProcessedIds, ...mediaItemsToProcess];

                console.log(`🔄 Progressive - Marking ${mediaItemsToProcess.length} items as processed from ${node.id}. Total: ${updatedProcessedIds.length}`);
                console.log(`🔄 Progressive - Processed IDs:`, updatedProcessedIds);

                // Update downstream node to track these as processed - synchronously update both stores
                const updateData = {
                  processedMediaIds: {
                    ...(currentDsNodeData?.processedMediaIds || {}),
                    [node.id]: updatedProcessedIds
                  }
                };

                // Update ReactFlow nodes
                setReactFlowNodes(nodes => nodes.map(n =>
                  n.id === dsNode.id
                    ? {
                        ...n,
                        data: {
                          ...n.data,
                          ...updateData
                        }
                      }
                    : n
                ));

                // Update Zustand store
                setNodes(
                  getNodes().map((n) =>
                    n.id === dsNode.id
                      ? {
                          ...n,
                          data: {
                            ...n.data,
                            ...updateData
                          }
                        } as AppNode
                      : n
                  )
                );

                // Wait for state to propagate
                await new Promise(resolve => setTimeout(resolve, 10));
              }

              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
              // If downstream workflow errors, terminate entire workflow
              console.error(`🔄 Progressive - Downstream node ${dsNode.id} failed:`, error);
              isRunning.current = false;
              throw error;
            }
          }
        });

        // Wait for all subflows to complete in parallel
        if (downstreamEdges.length > 1) {
          console.log(`🔄 Progressive - Waiting for ${downstreamEdges.length} parallel subflows to complete`);
        }
        await Promise.all(subflowPromises);
        if (downstreamEdges.length > 1) {
          console.log(`🔄 Progressive - All ${downstreamEdges.length} parallel subflows completed`);
        }
      };

      // 执行Runner with update callback and progressive callback
      const processedData = await runner.run(
        updatedNode || node,
        inputDataList,
        updateNodeDataCallback,
        (!skipDownstream && (updatedNode?.data.executionMode === 'progressive' || node.data.executionMode === 'progressive'))
          ? progressiveCallback
          : undefined
      );
      console.log(`🔄 Process - Runner returned data:`, processedData);

      // 合并输出到节点 data (final update)
      // If this is a progressive iteration (called multiple times from progressive callback),
      // we need to ACCUMULATE results because each call processes different items
      // Otherwise, just replace because real-time updates are already cumulative
      if (isProgressiveIteration) {
        console.log(`🔄 Process - Accumulating results for progressive iteration`);
        setReactFlowNodes(nodes => nodes.map(n => {
          if (n.id === node.id) {
            const currentData = n.data as any;
            const newData = { ...n.data, ...processedData };

            // Merge media lists if they exist (with deduplication)
            if (processedData.media?.mediaList && currentData.media?.mediaList) {
              const mergedMediaList = [...currentData.media.mediaList, ...processedData.media.mediaList];
              newData.media = {
                ...processedData.media,
                mediaList: deduplicateMediaItems(mergedMediaList)
              };
            }

            // Merge apiResponses if they exist (with deduplication)
            if (processedData.apiResponses && currentData.apiResponses) {
              const mergedResponses = [...currentData.apiResponses, ...processedData.apiResponses];
              newData.apiResponses = deduplicateApiResponses(mergedResponses);
            }

            // Update execution metadata
            if (processedData.executionMetadata && currentData.executionMetadata) {
              newData.executionMetadata = {
                totalExecutions: (currentData.executionMetadata.totalExecutions || 0) + (processedData.executionMetadata.totalExecutions || 0),
                successCount: (currentData.executionMetadata.successCount || 0) + (processedData.executionMetadata.successCount || 0),
                errorCount: (currentData.executionMetadata.errorCount || 0) + (processedData.executionMetadata.errorCount || 0),
                lastExecutionTime: processedData.executionMetadata.lastExecutionTime
              };
            }

            return { ...n, data: newData };
          }
          return n;
        }));

        // 同步更新 Zustand store
        setNodes(
          getNodes().map((n) => {
            if (n.id === node.id) {
              const currentData = n.data as any;
              const newData = { ...n.data, ...processedData };

              // Merge media lists if they exist (with deduplication)
              if (processedData.media?.mediaList && currentData.media?.mediaList) {
                const mergedMediaList = [...currentData.media.mediaList, ...processedData.media.mediaList];
                newData.media = {
                  ...processedData.media,
                  mediaList: deduplicateMediaItems(mergedMediaList)
                };
              }

              // Merge apiResponses if they exist (with deduplication)
              if (processedData.apiResponses && currentData.apiResponses) {
                const mergedResponses = [...currentData.apiResponses, ...processedData.apiResponses];
                newData.apiResponses = deduplicateApiResponses(mergedResponses);
              }

              // Update execution metadata
              if (processedData.executionMetadata && currentData.executionMetadata) {
                newData.executionMetadata = {
                  totalExecutions: (currentData.executionMetadata.totalExecutions || 0) + (processedData.executionMetadata.totalExecutions || 0),
                  successCount: (currentData.executionMetadata.successCount || 0) + (processedData.executionMetadata.successCount || 0),
                  errorCount: (currentData.executionMetadata.errorCount || 0) + (processedData.executionMetadata.errorCount || 0),
                  lastExecutionTime: processedData.executionMetadata.lastExecutionTime
                };
              }

              return { ...n, data: newData } as AppNode;
            }
            return n;
          }),
        );
      } else {
        // Normal mode: real-time updates are cumulative, just replace
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
      }

      // Only mark as 'success' if this is NOT a progressive iteration
      // If isProgressiveIteration = true, this node will be called again, so keep it as 'loading'
      if (!isProgressiveIteration) {
        updateNodeStatus(node.id, 'success');
        setLogMessages((prev) => [...prev, `✅ ${node.data.title} completed successfully!`]);
        console.log(`Node ${node.id} processing completed successfully!`);

        // Check for breakpoint after node completion
        const nodeData = (updatedNode?.data || node.data) as any;
        if (nodeData?.hasBreakpoint) {
          console.log(`🔴 Breakpoint hit at node ${node.id} (${node.data.title})`);
          setLogMessages((prev) => [...prev, `🔴 Breakpoint: Paused at ${node.data.title}`]);
          showToast({
            title: "Breakpoint Hit",
            description: `Workflow paused at ${node.data.title}. Click Resume to continue.`,
            variant: "default",
          });
          breakpointNodeId.current = node.id;
          isRunning.current = false;
          throw new Error('BREAKPOINT'); // Special error to stop workflow execution
        }
      } else {
        // Keep as loading - this node will be called again with more items
        console.log(`Node ${node.id} iteration completed (still more to process)`);
      }
      console.log(`Node ${node.id} final data:`, { ...node.data, ...processedData });

      // If this was a progressive OR concurrent node, now execute any downstream nodes
      // that need to be triggered after this node completes
      // IMPORTANT: Only do this if NOT in a progressive iteration (isProgressiveIteration = false)
      // If isProgressiveIteration = true, this node is being called from another progressive's callback
      // and hasn't truly completed all work yet - it will be called again with more items
      const isProgressiveNode = updatedNode?.data.executionMode === 'progressive' || node.data.executionMode === 'progressive';
      const isConcurrentNode = updatedNode?.data.executionMode === 'concurrent' || node.data.executionMode === 'concurrent';

      if (!skipDownstream && !isProgressiveIteration && (isProgressiveNode || isConcurrentNode)) {
        const nodeType = isProgressiveNode ? 'Progressive' : 'Concurrent';
        console.log(`🔄 ${nodeType} completed - Checking for downstream nodes`);

        // Wait for status update to propagate
        await new Promise(resolve => setTimeout(resolve, 10));

        const edges = getReactFlowEdges();
        const downstreamEdges = edges.filter(edge => edge.source === node.id);

        // Execute downstream nodes in parallel when there are multiple branches
        const downstreamPromises = downstreamEdges.map(async (edge) => {
          const downstreamNode = getNode(edge.target) as AppNode | undefined;
          if (!downstreamNode) return;

          const downstreamNodeData = downstreamNode.data as any;
          const isConcurrentDownstream = downstreamNodeData?.executionMode === 'concurrent';
          const isProgressiveDownstream = downstreamNodeData?.executionMode === 'progressive';

          // Handle progressive downstream nodes first
          // Only mark progressive children as complete if the PARENT is also progressive
          // If the parent is concurrent, the progressive child needs to actually execute
          if (isProgressiveDownstream && isProgressiveNode) {
            console.log(`🔄 Progressive completed - Found progressive downstream node ${downstreamNode.id}, marking it complete`);

            // Recursively mark progressive downstream nodes as complete
            const markProgressiveComplete = async (nodeToMark: any) => {
              updateNodeStatus(nodeToMark.id, 'success');
              await new Promise(resolve => setTimeout(resolve, 10));
              console.log(`🔄 Progressive completed - Marked ${nodeToMark.id} as success`);

              // Check this node's children
              const childEdges = edges.filter(e => e.source === nodeToMark.id);
              for (const childEdge of childEdges) {
                const childNode = getNode(childEdge.target);
                if (!childNode) continue;

                const childData = childNode.data as any;
                // If child is also progressive, mark it complete recursively
                if (childData?.executionMode === 'progressive') {
                  await markProgressiveComplete(childNode);
                }
              }
            };

            await markProgressiveComplete(downstreamNode);

            // After marking all progressive nodes complete, look for concurrent nodes to execute
            // We need to check from the LAST progressive node in the chain
            const findLastProgressiveNode = (currentNode: any): any => {
              const childEdges = edges.filter(e => e.source === currentNode.id);
              for (const childEdge of childEdges) {
                const childNode = getNode(childEdge.target);
                if (!childNode) continue;
                const childData = childNode.data as any;
                if (childData?.executionMode === 'progressive') {
                  return findLastProgressiveNode(childNode);
                }
              }
              return currentNode;
            };

            const lastProgressiveNode = findLastProgressiveNode(downstreamNode);
            console.log(`🔄 Progressive completed - Last progressive node in chain: ${lastProgressiveNode.id}`);

            // Check if the last progressive node has concurrent children
            const lastNodeEdges = edges.filter(e => e.source === lastProgressiveNode.id);
            for (const lastEdge of lastNodeEdges) {
              const concurrentNode = getNode(lastEdge.target) as AppNode | undefined;
              if (!concurrentNode) continue;

              const concurrentData = concurrentNode.data as any;
              if (concurrentData?.executionMode === 'concurrent') {
                console.log(`🔄 Progressive completed - Last progressive ${lastProgressiveNode.id} has concurrent child ${concurrentNode.id}, checking if ready to execute`);

                // Check if already executed
                if (concurrentData?.status === 'success' || concurrentData?.status === 'loading') {
                  console.log(`🔄 Progressive completed - Concurrent node ${concurrentNode.id} already executed, skipping`);
                  continue;
                }

                // Check if all upstream of this concurrent node are complete using helper function
                const allComplete = areAllUpstreamNodesCompleted(concurrentNode.id);

                if (!allComplete) {
                  console.log(`⏸️ Concurrent node ${concurrentNode.id} cannot execute - not all upstream nodes are completed`);
                  continue;
                }

                if (allComplete) {
                  console.log(`🔄 Progressive completed - All upstream of concurrent ${concurrentNode.id} are complete, executing`);

                  // Collect data ONLY from immediate upstream nodes (direct edges to concurrent)
                  const concurrentUpstreamEdges = edges.filter(e => e.target === concurrentNode.id);
                  const concurrentInputData = [];
                  for (const upEdge of concurrentUpstreamEdges) {
                    const upNode = getNode(upEdge.source);
                    if (!upNode?.data) continue;

                    const upNodeData = upNode.data as any;

                    // Deduplicate media items if this data has a mediaList
                    if (upNodeData.media?.mediaList && Array.isArray(upNodeData.media.mediaList)) {
                      const deduplicatedMediaList = [];
                      const seenUrls = new Set<string>();

                      for (const mediaItem of upNodeData.media.mediaList) {
                        const uniqueKey = mediaItem.url || mediaItem.id || JSON.stringify(mediaItem);
                        if (!seenUrls.has(uniqueKey)) {
                          seenUrls.add(uniqueKey);
                          deduplicatedMediaList.push(mediaItem);
                        } else {
                          console.log(`🔄 Progressive completed - Skipping duplicate media item: ${uniqueKey}`);
                        }
                      }

                      console.log(`🔄 Progressive completed - Deduplicated ${upNodeData.media.mediaList.length} items to ${deduplicatedMediaList.length} items`);

                      // Create deduplicated data
                      const deduplicatedData = {
                        ...upNodeData,
                        media: {
                          ...upNodeData.media,
                          mediaList: deduplicatedMediaList
                        }
                      };
                      concurrentInputData.push(deduplicatedData);
                    } else {
                      // No media list, just push as-is
                      concurrentInputData.push(upNodeData);
                    }

                    console.log(`🔄 Progressive completed - Collecting data from immediate upstream ${upEdge.source}`);
                  }

                  if (concurrentInputData.length > 0) {
                    try {
                      await selfCheckNode(concurrentNode, concurrentInputData);
                      await new Promise(resolve => setTimeout(resolve, 5));
                      // Pass subflow context to concurrent node
                      await processNode(concurrentNode, concurrentInputData, false, false, currentSubflowContext);
                    } catch (error) {
                      console.error(`🔄 Progressive completed - Failed to execute concurrent ${concurrentNode.id}:`, error);
                    }
                  }
                }
              }
            }
          }

          // Handle progressive downstream when parent is concurrent
          // Concurrent → Progressive: Execute the progressive node normally
          if (isProgressiveDownstream && isConcurrentNode) {
            console.log(`🔄 ${nodeType} completed - Found progressive downstream node ${downstreamNode.id}, executing it`);

            // Check if already executed
            if (downstreamNodeData?.status === 'success' || downstreamNodeData?.status === 'loading') {
              console.log(`🔄 ${nodeType} completed - Progressive node ${downstreamNode.id} already executed or executing, skipping`);
              return;
            }

            // Check if all upstream nodes are complete
            const upstreamEdges = edges.filter(e => e.target === downstreamNode.id);
            const allUpstreamComplete = upstreamEdges.every(upEdge => {
              const upstreamNode = getNode(upEdge.source) as AppNode | undefined;
              if (!upstreamNode) return false;
              const upstreamData = upstreamNode.data as any;
              const isComplete = upEdge.source === node.id || upstreamData?.status === 'success';
              return isComplete;
            });

            if (!allUpstreamComplete) {
              console.log(`🔄 ${nodeType} completed - Progressive node ${downstreamNode.id} waiting for all upstream to complete`);
              return;
            }

            // Collect input data from upstream nodes
            const progressiveInputData = [];
            for (const upEdge of upstreamEdges) {
              let upstreamDataToAdd: any;
              if (upEdge.source === node.id) {
                upstreamDataToAdd = { ...node.data, ...processedData, status: 'success' };
              } else {
                const upstreamNode = getNode(upEdge.source);
                if (upstreamNode?.data && (upstreamNode.data as any)?.status === 'success') {
                  upstreamDataToAdd = upstreamNode.data;
                } else {
                  continue;
                }
              }
              progressiveInputData.push(upstreamDataToAdd);
            }

            if (progressiveInputData.length > 0) {
              try {
                console.log(`🔄 ${nodeType} completed - Executing progressive node ${downstreamNode.id} with ${progressiveInputData.length} inputs`);
                await selfCheckNode(downstreamNode, progressiveInputData);
                await new Promise(resolve => setTimeout(resolve, 5));
                await processNode(downstreamNode, progressiveInputData, false, false, currentSubflowContext);
              } catch (error) {
                console.error(`🔄 ${nodeType} completed - Failed to execute progressive ${downstreamNode.id}:`, error);
                throw error;
              }
            }
          }

          if (isConcurrentDownstream) {
            console.log(`🔄 ${nodeType} completed - Found concurrent downstream node ${downstreamNode.id}`);

            // Check if this concurrent node was already executed
            const concurrentNodeData = downstreamNode.data as any;
            if (concurrentNodeData?.status === 'success' || concurrentNodeData?.status === 'loading') {
              console.log(`🔄 ${nodeType} completed - Concurrent node ${downstreamNode.id} already executed or executing, skipping`);
              return;
            }

            // Check if ALL upstream nodes of this concurrent node are complete using helper function
            // Note: We need special handling here because the current node just completed
            // but its status might not have propagated yet
            const upstreamEdges = edges.filter(e => e.target === downstreamNode.id);
            const allUpstreamComplete = upstreamEdges.every(upEdge => {
              const upstreamNode = getNode(upEdge.source) as AppNode | undefined;
              if (!upstreamNode) return false;

              const upstreamData = upstreamNode.data as any;
              // Consider the current node as complete since we just marked it
              const isComplete = upEdge.source === node.id || upstreamData?.status === 'success';

              console.log(`🔄 ${nodeType} completed - Upstream node ${upEdge.source} status: ${upstreamData?.status}, isCurrentNode: ${upEdge.source === node.id}, complete: ${isComplete}`);
              return isComplete;
            });

            if (!allUpstreamComplete) {
              console.log(`⏸️ Concurrent node ${downstreamNode.id} cannot execute - not all upstream nodes are completed`);
              console.log(`🔄 ${nodeType} completed - Skipping concurrent node ${downstreamNode.id} - not all upstream nodes are complete yet`);
              return;
            }

            console.log(`🔄 ${nodeType} completed - All upstream nodes complete, executing concurrent downstream node ${downstreamNode.id} with all collected data`);

            try {
              // For concurrent nodes after progressive completion, we need to collect data carefully
              // Only collect from the IMMEDIATE upstream nodes (direct edges), not from grandparent nodes
              // This ensures Progressive1→Progressive2→Concurrent only uses Progressive2's output
              const immediateUpstreamEdges = edges.filter(e => e.target === downstreamNode.id);
              const dsInputDataList: any[] = [];

              for (const upEdge of immediateUpstreamEdges) {
                let upstreamDataToAdd: any;

                if (upEdge.source === node.id) {
                  // This is the current node that just completed
                  // Use the processed data we just computed (not from getNode, which might be stale)
                  upstreamDataToAdd = {
                    ...node.data,
                    ...processedData,
                    status: 'success'
                  };
                  console.log(`🔄 ${nodeType} completed - Using fresh data from current node ${node.id}`);
                } else {
                  // This is another upstream node - fetch from state
                  const upstreamNode = getNode(upEdge.source);
                  if (!upstreamNode?.data) continue;

                  const upstreamData = upstreamNode.data as any;

                  // Only include nodes that have completed
                  if (upstreamData?.status === 'success') {
                    upstreamDataToAdd = upstreamData;
                    console.log(`🔄 ${nodeType} completed - Using data from upstream node ${upEdge.source} (status: ${upstreamData?.status})`);
                  } else {
                    continue;
                  }
                }

                // Deduplicate media items if this data has a mediaList
                if (upstreamDataToAdd.media?.mediaList && Array.isArray(upstreamDataToAdd.media.mediaList)) {
                  const deduplicatedMediaList = [];
                  const seenUrls = new Set<string>();

                  for (const mediaItem of upstreamDataToAdd.media.mediaList) {
                    const uniqueKey = mediaItem.url || mediaItem.id || JSON.stringify(mediaItem);
                    if (!seenUrls.has(uniqueKey)) {
                      seenUrls.add(uniqueKey);
                      deduplicatedMediaList.push(mediaItem);
                    } else {
                      console.log(`🔄 ${nodeType} completed - Skipping duplicate media item: ${uniqueKey}`);
                    }
                  }

                  console.log(`🔄 ${nodeType} completed - Deduplicated ${upstreamDataToAdd.media.mediaList.length} items to ${deduplicatedMediaList.length} items from ${upEdge.source}`);

                  // Create deduplicated data
                  const deduplicatedData = {
                    ...upstreamDataToAdd,
                    media: {
                      ...upstreamDataToAdd.media,
                      mediaList: deduplicatedMediaList
                    }
                  };
                  dsInputDataList.push(deduplicatedData);
                } else {
                  // No media list, just push as-is
                  dsInputDataList.push(upstreamDataToAdd);
                }
              }

              if (!dsInputDataList || dsInputDataList.length === 0) {
                console.log(`🔄 ${nodeType} completed - No data for concurrent downstream node ${downstreamNode.id}, skipping`);
                return;
              }

              console.log(`🔄 ${nodeType} completed - Concurrent node ${downstreamNode.id} will process ${dsInputDataList.length} input sources from immediate upstream nodes`);
              console.log(`🔄 ${nodeType} completed - Concurrent node ${downstreamNode.id} execution mode: ${downstreamNodeData?.executionMode}`);
              console.log(`🔄 ${nodeType} completed - Concurrent node ${downstreamNode.id} input data:`, dsInputDataList);

              // Self-check
              await selfCheckNode(downstreamNode, dsInputDataList);
              await new Promise(resolve => setTimeout(resolve, 5));

              // Execute the concurrent node with all accumulated data in CONCURRENT mode
              // The node should execute all items at once, not progressively
              // skipDownstream = false to allow it to execute its own downstream nodes
              // isProgressiveIteration = false to ensure results are replaced, not accumulated
              // Pass subflow context to concurrent node
              await processNode(downstreamNode, dsInputDataList, false, false, currentSubflowContext);

              console.log(`🔄 ${nodeType} completed - Concurrent node ${downstreamNode.id} execution finished`);

              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
              console.error(`🔄 ${nodeType} completed - Concurrent downstream node ${downstreamNode.id} failed:`, error);
              throw error;
            }
          }
        });

        // Wait for all downstream branches to complete in parallel
        if (downstreamEdges.length > 1) {
          console.log(`🔄 ${nodeType} completed - Waiting for ${downstreamEdges.length} parallel downstream branches to complete`);
        }
        await Promise.all(downstreamPromises);
        if (downstreamEdges.length > 1) {
          console.log(`🔄 ${nodeType} completed - All ${downstreamEdges.length} parallel downstream branches completed`);
        }
      }
    },
    [updateNodeStatus, getNode, getNodes, setNodes, getEdges, getReactFlowEdges, setReactFlowNodes, showToast, collectInputData, selfCheckNode, areAllUpstreamNodesCompleted],
  );

  /**
   * Recursively execute upstream nodes that are ready but not yet executed
   * This ensures proper execution order for concurrent nodes
   * @param nodeId - The ID of the node whose upstream nodes should be executed
   * @param executionPath - Set to track execution path and prevent circular dependencies
   */
  const executeUpstreamNodesIfNeeded = useCallback(async (
    nodeId: string,
    executionPath: Set<string> = new Set()
  ): Promise<void> => {
    // Prevent circular dependencies
    if (executionPath.has(nodeId)) {
      console.warn(`⚠️ Circular dependency detected at node ${nodeId}`);
      return;
    }

    executionPath.add(nodeId);

    const edges = getReactFlowEdges();
    const upstreamEdges = edges.filter(e => e.target === nodeId);

    console.log(`🔄 Checking ${upstreamEdges.length} upstream nodes for ${nodeId}`);

    for (const upEdge of upstreamEdges) {
      const upstreamNode = getNode(upEdge.source);
      if (!upstreamNode) {
        console.warn(`⚠️ Upstream node ${upEdge.source} not found`);
        continue;
      }

      const upstreamData = upstreamNode.data as any;
      const upstreamStatus = upstreamData?.status;

      console.log(`🔍 Upstream node ${upEdge.source} status: ${upstreamStatus}`);

      // If upstream is already completed or loading, skip it
      if (upstreamStatus === 'success' || upstreamStatus === 'loading') {
        console.log(`✅ Upstream node ${upEdge.source} already processed (${upstreamStatus})`);
        continue;
      }

      // If upstream is in error state, we cannot proceed
      if (upstreamStatus === 'error') {
        console.error(`❌ Upstream node ${upEdge.source} is in error state`);
        throw new Error(`Cannot execute node ${nodeId}: upstream node ${upEdge.source} failed`);
      }

      // Check if this upstream node can run (its own upstream nodes are completed)
      if (canNodeRun(upEdge.source)) {
        console.log(`🚀 Executing pending upstream node ${upEdge.source} before ${nodeId}`);

        // Recursively execute this upstream node's dependencies first
        await executeUpstreamNodesIfNeeded(upEdge.source, new Set(executionPath));

        // Now execute this upstream node
        try {
          // Build subflow context for the upstream node
          const buildSubflowContext = (nodeId: string, visited: Set<string> = new Set()): Set<string> => {
            if (visited.has(nodeId)) return visited;
            visited.add(nodeId);

            const edges = getReactFlowEdges();
            const upstreamEdges = edges.filter(e => e.target === nodeId);
            for (const upEdge of upstreamEdges) {
              buildSubflowContext(upEdge.source, visited);
            }

            return visited;
          };

          const upstreamSubflowContext = buildSubflowContext(upEdge.source);

          const inputDataList = collectInputData(upstreamNode as AppNode);
          await selfCheckNode(upstreamNode as AppNode, inputDataList);
          await new Promise(resolve => setTimeout(resolve, 5));
          await processNode(upstreamNode as AppNode, inputDataList, false, false, upstreamSubflowContext);
          await new Promise(resolve => setTimeout(resolve, 50));

          console.log(`✅ Successfully executed upstream node ${upEdge.source}`);
        } catch (error) {
          console.error(`❌ Failed to execute upstream node ${upEdge.source}:`, error);
          throw error;
        }
      } else {
        // This upstream node cannot run yet (its dependencies aren't ready)
        console.log(`⏸️ Upstream node ${upEdge.source} cannot run yet - waiting for its dependencies`);

        // Recursively try to execute its dependencies
        await executeUpstreamNodesIfNeeded(upEdge.source, new Set(executionPath));

        // Try again to execute this upstream node
        if (canNodeRun(upEdge.source)) {
          console.log(`🚀 Retrying execution of upstream node ${upEdge.source}`);
          try {
            // Build subflow context for the upstream node
            const buildSubflowContext = (nodeId: string, visited: Set<string> = new Set()): Set<string> => {
              if (visited.has(nodeId)) return visited;
              visited.add(nodeId);

              const edges = getReactFlowEdges();
              const upstreamEdges = edges.filter(e => e.target === nodeId);
              for (const upEdge of upstreamEdges) {
                buildSubflowContext(upEdge.source, visited);
              }

              return visited;
            };

            const upstreamSubflowContext = buildSubflowContext(upEdge.source);

            const inputDataList = collectInputData(upstreamNode as AppNode);
            await selfCheckNode(upstreamNode as AppNode, inputDataList);
            await new Promise(resolve => setTimeout(resolve, 5));
            await processNode(upstreamNode as AppNode, inputDataList, false, false, upstreamSubflowContext);
            await new Promise(resolve => setTimeout(resolve, 50));

            console.log(`✅ Successfully executed upstream node ${upEdge.source}`);
          } catch (error) {
            console.error(`❌ Failed to execute upstream node ${upEdge.source}:`, error);
            throw error;
          }
        }
      }
    }

    executionPath.delete(nodeId);
  }, [getNode, getReactFlowEdges, canNodeRun, collectInputData, selfCheckNode, processNode]);

  /**
   * Helper function to check if a node is an action node
   */
  const isActionNode = useCallback((nodeType: string): boolean => {
    return ['text-to-image-node', 'image-to-image-node', 'image-to-text-node', 'edit-image-node'].includes(nodeType);
  }, []);

  /**
   * Validates and enforces execution mode restrictions for action nodes
   * An action node must be in concurrent mode if its upstream contains:
   * - Multiple action nodes, OR
   * - One or more action nodes + other types of nodes
   */
  const validateAndEnforceActionNodeExecutionMode = useCallback((nodeId: string): void => {
    const node = getNode(nodeId);
    if (!node || !isActionNode(node.type as string)) {
      return; // Not an action node, no restriction
    }

    const edges = getReactFlowEdges();
    const upstreamEdges = edges.filter(e => e.target === nodeId);

    if (upstreamEdges.length === 0) {
      return; // No upstream nodes, no restriction
    }

    // Count upstream action nodes and other types
    let actionNodeCount = 0;
    let otherNodeCount = 0;

    for (const edge of upstreamEdges) {
      const upstreamNode = getNode(edge.source);
      if (!upstreamNode) continue;

      if (isActionNode(upstreamNode.type as string)) {
        actionNodeCount++;
      } else {
        otherNodeCount++;
      }
    }

    // Check if restriction applies:
    // 1. Multiple action nodes upstream, OR
    // 2. At least one action node + other types of nodes
    const mustBeConcurrent =
      (actionNodeCount > 1) ||
      (actionNodeCount >= 1 && otherNodeCount >= 1);

    if (mustBeConcurrent) {
      const nodeData = node.data as any;
      const currentMode = nodeData?.executionMode;

      if (currentMode !== 'concurrent') {
        console.log(`⚠️ RESTRICTION: Action node ${nodeId} (${node.data.title}) is being forced to concurrent mode due to upstream node configuration`);
        console.log(`   Upstream: ${actionNodeCount} action node(s) + ${otherNodeCount} other node(s)`);

        // Force the node to concurrent mode
        setReactFlowNodes(nodes => nodes.map(n =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, executionMode: 'concurrent' } }
            : n
        ));

        // Also update Zustand store
        setNodes(
          getNodes().map((n) =>
            n.id === nodeId
              ? ({ ...n, data: { ...n.data, executionMode: 'concurrent' } } as AppNode)
              : n,
          ),
        );

        showToast({
          title: "Execution Mode Restriction",
          description: `${node.data.title} has been locked to Concurrent mode due to multiple upstream action nodes or mixed upstream node types.`,
          variant: "default"
        });
      }
    }
  }, [getNode, getNodes, setNodes, getReactFlowEdges, setReactFlowNodes, showToast, isActionNode]);

  const runWorkflow = useCallback(
    async (startNodeId?: string) => {
      if (isRunning.current) return;
      const nodes = getNodes();
      const edges = getEdges();
      isRunning.current = true;

      // Validate and enforce execution mode restrictions for all action nodes
      console.log('🔍 Validating action node execution mode restrictions...');
      nodes.forEach(node => {
        if (isActionNode(node.type as string)) {
          validateAndEnforceActionNodeExecutionMode(node.id);
        }
      });

      // If a specific start node is provided, use it
      // Otherwise, find ALL nodes without incoming edges to start concurrently
      let startNodeIds: string[];
      if (startNodeId) {
        startNodeIds = [startNodeId];
      } else {
        startNodeIds = nodes
          .filter((node) => !edges.some((e) => e.target === node.id))
          .map((node) => node.id);
      }

      if (startNodeIds.length === 0) {
        console.log('⚠️ No start nodes found (no nodes without incoming edges)');
        isRunning.current = false;
        return;
      }

      console.log(`🚀 Starting workflow with ${startNodeIds.length} initial node(s):`, startNodeIds);

      // Clear downstream nodes based on whether a specific start node was provided
      if (startNodeId) {
        // Individual node run - clear only downstream nodes
        clearDownstreamNodes(startNodeId);
      } else {
        // Overall workflow run - clear all downstream nodes (keeping initial nodes)
        clearAllDownstreamNodes();
      }

      setLogMessages(['Starting workflow...']);

      // Collect all nodes to process from all start nodes
      const nodesToProcess: AppNode[] = [];
      const visited = new Set<string>();

      for (const _startNodeId of startNodeIds) {
        const nodesFromThisStart = collectNodesToProcess(nodes, edges, _startNodeId);
        for (const node of nodesFromThisStart) {
          if (!visited.has(node.id)) {
            visited.add(node.id);
            nodesToProcess.push(node);
          }
        }
      }

      // Execute all starting nodes (nodes without input edges) concurrently
      console.log(`🚀 Executing ${startNodeIds.length} starting node(s) in parallel`);

      try {
        await Promise.all(
          startNodeIds.map(async (nodeId) => {
            const startNode = nodes.find(n => n.id === nodeId);
            if (!startNode) return;

            console.log(`🔄 Starting concurrent execution of node ${nodeId}`);

            // Create a new subflow context for each independent starting node
            // This ensures that parallel subflows don't interfere with each other
            const independentSubflowContext = new Set<string>();

            // Collect data for this starting node
            const inputDataList = collectInputData(startNode);

            // Self-check
            await selfCheckNode(startNode, inputDataList);
            await new Promise(resolve => setTimeout(resolve, 5));

            // Process the node with its own subflow context
            await processNode(startNode, inputDataList, false, false, independentSubflowContext);
            await new Promise(resolve => setTimeout(resolve, 50));
          })
        );

        console.log(`✅ All ${startNodeIds.length} starting node(s) completed`);

          // Remove starting nodes from nodesToProcess since they're already executed
          const startNodeIdsSet = new Set(startNodeIds);
          let remainingNodesToProcess = nodesToProcess.filter(node => !startNodeIdsSet.has(node.id));

          // Continue with remaining nodes - execute independent branches in parallel
          const processedNodes = new Set(startNodeIds);
          const executingNodes = new Set<string>(); // Track nodes currently executing

          while (remainingNodesToProcess.length > 0 || executingNodes.size > 0) {
            if (!isRunning.current) break;

            // Find all nodes that can run now (all upstream dependencies satisfied)
            // and are not already executing
            const readyNodes = remainingNodesToProcess.filter(node => {
              // Skip if already executing
              if (executingNodes.has(node.id)) {
                return false;
              }

              // Skip if already successfully completed (may have been executed by concurrent/progressive parent)
              const nodeData = node.data as any;
              if (nodeData?.status === 'success') {
                console.log(`⏭️ Skipping ${node.id} - already executed with status: success`);
                // Mark as processed so it's considered complete for downstream nodes
                processedNodes.add(node.id);
                return false;
              }

              const upstreamEdges = edges.filter(e => e.target === node.id);
              return upstreamEdges.every(edge => processedNodes.has(edge.source));
            });

            // Remove nodes that were already processed (executed by parent nodes) from remaining list
            remainingNodesToProcess = remainingNodesToProcess.filter(n => !processedNodes.has(n.id));

            if (readyNodes.length === 0) {
              // No ready nodes, wait a bit for executing nodes to complete
              if (executingNodes.size > 0) {
                console.log(`⏸️ Waiting for ${executingNodes.size} nodes to complete:`, Array.from(executingNodes));
                // Wait a short time and check again
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
              } else if (remainingNodesToProcess.length > 0) {
                console.warn('⚠️ No more ready nodes but remaining nodes exist - possible circular dependency');
                console.log('Remaining nodes:', remainingNodesToProcess.map(n => `${n.id} (${n.data.title})`));
                console.log('Executing nodes:', Array.from(executingNodes));
                console.log('Processed nodes:', Array.from(processedNodes));
                break;
              } else {
                // All done
                break;
              }
            }

            console.log(`🚀 Starting ${readyNodes.length} ready nodes:`, readyNodes.map(n => `${n.id} (${n.data.title})`));

            // Start each ready node asynchronously (don't wait for completion)
            readyNodes.forEach((node) => {
              executingNodes.add(node.id);

              // Create promise wrapper to track this node's execution
              const executeNode = async () => {
                  try {
                    // Build subflow context for this node from its upstream nodes
                    // Collect all upstream node IDs recursively to understand which subflow this belongs to
                    const buildSubflowContext = (nodeId: string, visited: Set<string> = new Set()): Set<string> => {
                      if (visited.has(nodeId)) return visited;
                      visited.add(nodeId);

                      const upstreamEdges = edges.filter(e => e.target === nodeId);
                      for (const upEdge of upstreamEdges) {
                        buildSubflowContext(upEdge.source, visited);
                      }

                      return visited;
                    };

                    const nodeSubflowContext = buildSubflowContext(node.id);
                    console.log(`🔄 Main workflow - Node ${node.id} subflow context:`, Array.from(nodeSubflowContext));

                    // Check if node is in concurrent mode and verify all upstream nodes are completed
                    const nodeData = node.data as any;
                    const isConcurrentMode = nodeData?.executionMode === 'concurrent';
                    const isProgressiveMode = nodeData?.executionMode === 'progressive';

                    if (isConcurrentMode) {
                      // For concurrent nodes, enforce that ALL upstream nodes must be completed
                      const allUpstreamComplete = areAllUpstreamNodesCompleted(node.id);

                      if (!allUpstreamComplete) {
                        console.log(`⏸️ RESTRICTION: Concurrent node ${node.id} cannot start - not all upstream nodes are completed`);
                        console.log(`🔄 Attempting to execute pending upstream nodes first...`);

                        setLogMessages((prev) => [...prev, `⏸️ ${node.data.title} checking upstream dependencies...`]);

                        try {
                          // Try to execute any pending upstream nodes
                          await executeUpstreamNodesIfNeeded(node.id);

                          // Check again if all upstream are now completed
                          const allUpstreamCompleteAfterExecution = areAllUpstreamNodesCompleted(node.id);

                          if (!allUpstreamCompleteAfterExecution) {
                            console.log(`❌ Still cannot execute concurrent node ${node.id} - upstream nodes not ready`);
                            setLogMessages((prev) => [...prev, `⏸️ ${node.data.title} waiting for upstream nodes...`]);

                            // Mark node as initial to indicate it hasn't started yet
                            updateNodeStatus(node.id, 'initial');

                            // Skip this node for now
                            return;
                          }

                          console.log(`✅ All upstream nodes for ${node.id} executed successfully - proceeding with concurrent node`);
                          setLogMessages((prev) => [...prev, `✅ ${node.data.title} ready to execute`]);
                        } catch (error) {
                          console.error(`❌ Failed to execute upstream nodes for ${node.id}:`, error);
                          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                          updateNodeStatus(node.id, 'error');
                          setLogMessages((prev) => [...prev, `❌ ${node.data.title} failed: ${errorMessage}`]);
                          showToast({
                            title: "Upstream Execution Error",
                            description: `${node.data.title}: ${errorMessage}`,
                            variant: "error"
                          });
                          throw error;
                        }
                      } else {
                        console.log(`✅ Concurrent node ${node.id} all upstream nodes completed - proceeding with execution`);
                      }
                    }

                    // 第一步：收集数据（只收集一次）
                    const inputDataList = collectInputData(node);

                    // 第二步：自检（只负责类型转换）
                    await selfCheckNode(node, inputDataList);

                    await new Promise(resolve => setTimeout(resolve, 5));

                    // 第三步：执行（重新获取类型并处理数据）
                    // Pass the subflow context to ensure proper isolation
                    await processNode(node, inputDataList, false, false, nodeSubflowContext);

                    // In progressive mode, downstream nodes are already processed
                    // So we need to skip them in the main workflow loop
                    if (isProgressiveMode) {
                      const downstreamNodeIds = new Set<string>();
                      const collectDownstreamIds = (nodeId: string) => {
                        const outgoing = edges.filter(e => e.source === nodeId);
                        outgoing.forEach(edge => {
                          if (!downstreamNodeIds.has(edge.target)) {
                            // Check if this downstream node is concurrent
                            const targetNode = remainingNodesToProcess.find(n => n.id === edge.target);
                            const targetNodeData = targetNode?.data as any;
                            const isConcurrent = targetNodeData?.executionMode === 'concurrent';

                            if (isConcurrent) {
                              // Check if this concurrent node has multiple upstream nodes
                              const targetUpstreamEdges = edges.filter(e => e.target === edge.target);
                              const hasMultipleUpstreams = targetUpstreamEdges.length > 1;

                              if (hasMultipleUpstreams) {
                                console.log(`🔄 Main workflow - Found concurrent downstream node ${edge.target} with ${targetUpstreamEdges.length} upstream nodes, KEEPING in main queue`);
                                // Don't add to downstreamNodeIds - let the main workflow handle it
                              } else {
                                console.log(`🔄 Main workflow - Found concurrent downstream node ${edge.target} with single upstream, will be handled by progressive parent`);
                                downstreamNodeIds.add(edge.target);
                              }
                            } else {
                              // Non-concurrent node - will be handled by progressive callback
                              downstreamNodeIds.add(edge.target);
                              // DO NOT recursively collect children - only collect immediate downstream
                              // This prevents orphaning nodes that are downstream of concurrent nodes
                            }
                          }
                        });
                      };
                      collectDownstreamIds(node.id);

                      // Remove downstream nodes from processing queue
                      remainingNodesToProcess = remainingNodesToProcess.filter(n => {
                        if (downstreamNodeIds.has(n.id)) {
                          console.log(`🔄 Main workflow - Removing ${n.id} (executionMode: ${(n.data as any)?.executionMode}) from queue (will be handled by progressive parent)`);
                          return false;
                        }
                        return true;
                      });
                    }

                    // 等待状态更新完成，确保下一个节点能获取到最新数据
                    await new Promise(resolve => setTimeout(resolve, 50));

                  } catch (error) {
                    console.error(`Node ${node.id} processing failed:`, error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                    // Check if this is a breakpoint hit (not a real error)
                    if (errorMessage === 'BREAKPOINT') {
                      console.log(`🔴 Workflow paused at breakpoint in node ${node.id}`);
                      isRunning.current = false;
                      // Don't throw, just mark as error and stop
                    }

                    // Update node status to error
                    updateNodeStatus(node.id, 'error');

                    setLogMessages((prev) => [...prev, `❌ Workflow stopped due to error in ${node.data.title}: ${errorMessage}`]);
                    showToast({
                      title: "Workflow Error",
                      description: `${node.data.title}: ${errorMessage}`,
                      variant: "error"
                    });
                    isRunning.current = false;
                  } finally {
                    // Mark node as no longer executing
                    executingNodes.delete(node.id);
                    // Mark node as processed (even if error, to avoid infinite loops)
                    processedNodes.add(node.id);
                    console.log(`✅ Node ${node.id} (${node.data.title}) completed. Executing: ${executingNodes.size}, Remaining: ${remainingNodesToProcess.length}`);
                  }
              };

              // Start the node execution (fire and forget - it will update executingNodes when done)
              executeNode();
            });

            // Remove nodes that are now executing from remaining list
            remainingNodesToProcess = remainingNodesToProcess.filter(n => !executingNodes.has(n.id));

            // Small delay before checking for more ready nodes
            await new Promise(resolve => setTimeout(resolve, 10));
          }
      } catch (error) {
        console.error('❌ Error executing starting nodes:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setLogMessages((prev) => [...prev, `❌ Workflow stopped: ${errorMessage}`]);
        showToast({
          title: "Workflow Error",
          description: errorMessage,
          variant: "error"
        });
        isRunning.current = false;
        return;
      }

      if (isRunning.current) {
        setLogMessages((prev) => [...prev, '✅ Workflow processing complete.']);

        // Log all node information after workflow completion
        const finalNodes = getNodes();
        console.log('='.repeat(80));
        console.log('📊 WORKFLOW EXECUTION COMPLETED - ALL NODES INFO');
        console.log('='.repeat(80));
        console.log(`Total nodes: ${finalNodes.length}`);
        console.log('');

        finalNodes.forEach((node, index) => {
          console.log(`Node ${index + 1}: ${node.id}`);
          console.log(`  Type: ${node.type}`);
          console.log(`  Title: ${node.data.title}`);
          console.log(`  Status: ${node.data.status}`);
          console.log(`  Position: (${node.position.x}, ${node.position.y})`);
          console.log(`  Data:`, node.data);
          console.log('');
        });

        console.log('='.repeat(80));
      }

      isRunning.current = false;
    },
    [getNodes, getEdges, processNode, collectInputData, selfCheckNode, updateNodeStatus, showToast, clearDownstreamNodes, clearAllDownstreamNodes, areAllUpstreamNodesCompleted, executeUpstreamNodesIfNeeded],
  );

  const resumeWorkflow = useCallback(async () => {
    if (isRunning.current) {
      console.warn('⚠️ Workflow is already running');
      return;
    }

    const breakpointNode = breakpointNodeId.current;
    if (!breakpointNode) {
      console.warn('⚠️ No breakpoint to resume from');
      showToast({
        title: "No Breakpoint",
        description: "There is no paused workflow to resume.",
        variant: "default"
      });
      return;
    }

    console.log(`▶️ Resuming workflow from breakpoint at node ${breakpointNode}`);
    setLogMessages((prev) => [...prev, `▶️ Resuming workflow from ${getNode(breakpointNode)?.data.title || breakpointNode}...`]);

    // Clear the breakpoint reference
    breakpointNodeId.current = null;

    // Get downstream nodes to continue execution
    const edges = getReactFlowEdges();
    const downstreamEdges = edges.filter(edge => edge.source === breakpointNode);

    if (downstreamEdges.length === 0) {
      console.log('✅ No downstream nodes to execute - workflow complete');
      setLogMessages((prev) => [...prev, '✅ Workflow complete (no downstream nodes).']);
      showToast({
        title: "Workflow Complete",
        description: "No more nodes to execute.",
        variant: "default"
      });
      return;
    }

    // Start execution from downstream nodes
    isRunning.current = true;

    const nodes = getNodes();
    const allEdges = getEdges();

    try {
      // Collect all downstream nodes to process
      const nodesToProcess: AppNode[] = [];
      const visited = new Set<string>();

      for (const downstreamEdge of downstreamEdges) {
        const downstreamStartNodes = collectNodesToProcess(nodes, allEdges, downstreamEdge.target);
        for (const node of downstreamStartNodes) {
          if (!visited.has(node.id)) {
            visited.add(node.id);
            nodesToProcess.push(node);
          }
        }
      }

      console.log(`▶️ Resuming with ${nodesToProcess.length} nodes to process`);

      // Process each node sequentially (similar to runWorkflow logic)
      for (const node of nodesToProcess) {
        if (!isRunning.current) break;

        try {
          // Check if node is in concurrent mode and verify all upstream nodes are completed
          const nodeData = node.data as any;
          const isConcurrentMode = nodeData?.executionMode === 'concurrent';
          const isProgressiveMode = nodeData?.executionMode === 'progressive';

          if (isConcurrentMode) {
            const allUpstreamComplete = areAllUpstreamNodesCompleted(node.id);

            if (!allUpstreamComplete) {
              console.log(`⏸️ Concurrent node ${node.id} waiting for upstream completion`);
              try {
                await executeUpstreamNodesIfNeeded(node.id);
                const allUpstreamCompleteAfterExecution = areAllUpstreamNodesCompleted(node.id);

                if (!allUpstreamCompleteAfterExecution) {
                  console.log(`❌ Cannot execute concurrent node ${node.id} - upstream nodes not ready`);
                  updateNodeStatus(node.id, 'initial');
                  continue;
                }
              } catch (error) {
                console.error(`❌ Failed to execute upstream nodes for ${node.id}:`, error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                updateNodeStatus(node.id, 'error');
                setLogMessages((prev) => [...prev, `❌ ${node.data.title} failed: ${errorMessage}`]);
                isRunning.current = false;
                return;
              }
            }
          }

          // Build subflow context for this node
          const buildSubflowContext = (nodeId: string, visited: Set<string> = new Set()): Set<string> => {
            if (visited.has(nodeId)) return visited;
            visited.add(nodeId);

            const edges = getReactFlowEdges();
            const upstreamEdges = edges.filter(e => e.target === nodeId);
            for (const upEdge of upstreamEdges) {
              buildSubflowContext(upEdge.source, visited);
            }

            return visited;
          };

          const nodeSubflowContext = buildSubflowContext(node.id);

          // Collect data, self-check, and process
          const inputDataList = collectInputData(node);
          await selfCheckNode(node, inputDataList);
          await new Promise(resolve => setTimeout(resolve, 5));
          await processNode(node, inputDataList, false, false, nodeSubflowContext);

          // Handle progressive mode downstream tracking
          if (isProgressiveMode) {
            const downstreamNodeIds = new Set<string>();
            const collectDownstreamIds = (nodeId: string) => {
              const outgoing = allEdges.filter(e => e.source === nodeId);
              outgoing.forEach(edge => {
                if (!downstreamNodeIds.has(edge.target)) {
                  downstreamNodeIds.add(edge.target);
                  const targetNode = nodesToProcess.find(n => n.id === edge.target);
                  const targetNodeData = targetNode?.data as any;
                  const isConcurrent = targetNodeData?.executionMode === 'concurrent';
                  if (!isConcurrent) {
                    collectDownstreamIds(edge.target);
                  }
                }
              });
            };
            collectDownstreamIds(node.id);

            // Remove downstream nodes from processing queue
            const currentIndex = nodesToProcess.indexOf(node);
            for (let i = nodesToProcess.length - 1; i > currentIndex; i--) {
              if (downstreamNodeIds.has(nodesToProcess[i].id)) {
                nodesToProcess.splice(i, 1);
              }
            }
          }

          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
          console.error(`Node ${node.id} processing failed:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          // Check if this is a breakpoint hit
          if (errorMessage === 'BREAKPOINT') {
            console.log(`🔴 Workflow paused again at breakpoint in node ${node.id}`);
            return;
          }

          updateNodeStatus(node.id, 'error');
          setLogMessages((prev) => [...prev, `❌ Workflow stopped: ${node.data.title} - ${errorMessage}`]);
          showToast({
            title: "Workflow Error",
            description: `${node.data.title}: ${errorMessage}`,
            variant: "error"
          });
          isRunning.current = false;
          return;
        }
      }

      if (isRunning.current) {
        setLogMessages((prev) => [...prev, '✅ Workflow resumed and completed successfully!']);
        showToast({
          title: "Workflow Complete",
          description: "All nodes executed successfully.",
          variant: "default"
        });
      }

    } catch (error) {
      console.error('❌ Error during resume:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLogMessages((prev) => [...prev, `❌ Resume failed: ${errorMessage}`]);
      showToast({
        title: "Resume Error",
        description: errorMessage,
        variant: "error"
      });
    } finally {
      isRunning.current = false;
    }
  }, [breakpointNodeId, getNode, getNodes, getEdges, getReactFlowEdges, showToast, areAllUpstreamNodesCompleted, executeUpstreamNodesIfNeeded, collectInputData, selfCheckNode, processNode, updateNodeStatus]);

  return {
    logMessages,
    runWorkflow,
    stopWorkflow,
    resumeWorkflow,
    isRunning: isRunning.current,
    hasBreakpoint: breakpointNodeId.current !== null,
    clearDownstreamNodes,
    clearAllDownstreamNodes,
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
