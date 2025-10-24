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
    async (node: AppNode, inputDataList: any[], skipDownstream: boolean = false, isProgressiveIteration: boolean = false) => {
      updateNodeStatus(node.id, 'loading');
      setLogMessages((prev) => [...prev, `${node.data.title} processing...`]);

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

              // Merge media lists if they exist
              if (partialData.media?.mediaList && currentData.media?.mediaList) {
                newData.media = {
                  ...partialData.media,
                  mediaList: [...currentData.media.mediaList, ...partialData.media.mediaList]
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

                // Merge media lists if they exist
                if (partialData.media?.mediaList && currentData.media?.mediaList) {
                  newData.media = {
                    ...partialData.media,
                    mediaList: [...currentData.media.mediaList, ...partialData.media.mediaList]
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

        // Get downstream nodes
        const edges = getReactFlowEdges();
        const downstreamEdges = edges.filter(edge => edge.source === node.id);

        if (downstreamEdges.length === 0) {
          console.log('🔄 Progressive - No downstream nodes');
          return;
        }

        // Execute each downstream node
        for (const edge of downstreamEdges) {
          const downstreamNode = getNode(edge.target);
          if (!downstreamNode) continue;

          // Check if downstream node is in concurrent mode
          const downstreamNodeData = downstreamNode.data as any;
          const isConcurrentDownstream = downstreamNodeData?.executionMode === 'concurrent';

          if (isConcurrentDownstream) {
            console.log(`🔄 Progressive - Skipping concurrent downstream node ${downstreamNode.id} - will be executed after progressive upstream completes`);
            continue; // Skip concurrent nodes during progressive iteration
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

          // Execute each downstream node sequentially
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
              await processNode(dsNode, dsInputDataList, skipDsDownstream, true);

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

            // Merge media lists if they exist
            if (processedData.media?.mediaList && currentData.media?.mediaList) {
              newData.media = {
                ...processedData.media,
                mediaList: [...currentData.media.mediaList, ...processedData.media.mediaList]
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

              // Merge media lists if they exist
              if (processedData.media?.mediaList && currentData.media?.mediaList) {
                newData.media = {
                  ...processedData.media,
                  mediaList: [...currentData.media.mediaList, ...processedData.media.mediaList]
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
      } else {
        // Keep as loading - this node will be called again with more items
        console.log(`Node ${node.id} iteration completed (still more to process)`);
      }
      console.log(`Node ${node.id} final data:`, { ...node.data, ...processedData });

      // If this was a progressive node, now execute any concurrent downstream nodes
      // that were skipped during progressive iteration
      // IMPORTANT: Only do this if NOT in a progressive iteration (isProgressiveIteration = false)
      // If isProgressiveIteration = true, this node is being called from another progressive's callback
      // and hasn't truly completed all work yet - it will be called again with more items
      if (!skipDownstream && !isProgressiveIteration && (updatedNode?.data.executionMode === 'progressive' || node.data.executionMode === 'progressive')) {
        console.log(`🔄 Progressive completed - Checking for downstream nodes (concurrent or progressive)`);

        // Wait for status update to propagate
        await new Promise(resolve => setTimeout(resolve, 10));

        const edges = getReactFlowEdges();
        const downstreamEdges = edges.filter(edge => edge.source === node.id);

        for (const edge of downstreamEdges) {
          const downstreamNode = getNode(edge.target) as AppNode | undefined;
          if (!downstreamNode) continue;

          const downstreamNodeData = downstreamNode.data as any;
          const isConcurrentDownstream = downstreamNodeData?.executionMode === 'concurrent';
          const isProgressiveDownstream = downstreamNodeData?.executionMode === 'progressive';

          // Handle progressive downstream nodes first
          // Recursively mark all chained progressive nodes as complete
          if (isProgressiveDownstream) {
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

                // Check if all upstream of this concurrent node are complete
                const concurrentUpstreamEdges = edges.filter(e => e.target === concurrentNode.id);
                const allComplete = concurrentUpstreamEdges.every(upEdge => {
                  const upNode = getNode(upEdge.source) as AppNode | undefined;
                  if (!upNode) return false;
                  const upData = upNode.data as any;
                  return upData?.status === 'success';
                });

                if (allComplete) {
                  console.log(`🔄 Progressive completed - All upstream of concurrent ${concurrentNode.id} are complete, executing`);

                  // Collect data ONLY from immediate upstream nodes (direct edges to concurrent)
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
                      await processNode(concurrentNode, concurrentInputData, false, false);
                    } catch (error) {
                      console.error(`🔄 Progressive completed - Failed to execute concurrent ${concurrentNode.id}:`, error);
                    }
                  }
                }
              }
            }
          }

          if (isConcurrentDownstream) {
            console.log(`🔄 Progressive completed - Found concurrent downstream node ${downstreamNode.id}`);

            // Check if this concurrent node was already executed
            const concurrentNodeData = downstreamNode.data as any;
            if (concurrentNodeData?.status === 'success' || concurrentNodeData?.status === 'loading') {
              console.log(`🔄 Progressive completed - Concurrent node ${downstreamNode.id} already executed or executing, skipping`);
              continue;
            }

            // Check if ALL upstream nodes of this concurrent node are complete
            const upstreamEdges = edges.filter(e => e.target === downstreamNode.id);
            const allUpstreamComplete = upstreamEdges.every(upEdge => {
              const upstreamNode = getNode(upEdge.source) as AppNode | undefined;
              if (!upstreamNode) return false;

              const upstreamData = upstreamNode.data as any;
              // Consider the current node as complete since we just marked it
              const isComplete = upEdge.source === node.id || upstreamData?.status === 'success';

              console.log(`🔄 Progressive completed - Upstream node ${upEdge.source} status: ${upstreamData?.status}, isCurrentNode: ${upEdge.source === node.id}, complete: ${isComplete}`);
              return isComplete;
            });

            if (!allUpstreamComplete) {
              console.log(`🔄 Progressive completed - Skipping concurrent node ${downstreamNode.id} - not all upstream nodes are complete yet`);
              continue;
            }

            console.log(`🔄 Progressive completed - All upstream nodes complete, executing concurrent downstream node ${downstreamNode.id} with all collected data`);

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
                  console.log(`🔄 Progressive completed - Using fresh data from current node ${node.id}`);
                } else {
                  // This is another upstream node - fetch from state
                  const upstreamNode = getNode(upEdge.source);
                  if (!upstreamNode?.data) continue;

                  const upstreamData = upstreamNode.data as any;

                  // Only include nodes that have completed
                  if (upstreamData?.status === 'success') {
                    upstreamDataToAdd = upstreamData;
                    console.log(`🔄 Progressive completed - Using data from upstream node ${upEdge.source} (status: ${upstreamData?.status})`);
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
                      console.log(`🔄 Progressive completed - Skipping duplicate media item: ${uniqueKey}`);
                    }
                  }

                  console.log(`🔄 Progressive completed - Deduplicated ${upstreamDataToAdd.media.mediaList.length} items to ${deduplicatedMediaList.length} items from ${upEdge.source}`);

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
                console.log(`🔄 Progressive completed - No data for concurrent downstream node ${downstreamNode.id}, skipping`);
                continue;
              }

              console.log(`🔄 Progressive completed - Concurrent node ${downstreamNode.id} will process ${dsInputDataList.length} input sources from immediate upstream nodes`);
              console.log(`🔄 Progressive completed - Concurrent node ${downstreamNode.id} execution mode: ${downstreamNodeData?.executionMode}`);
              console.log(`🔄 Progressive completed - Concurrent node ${downstreamNode.id} input data:`, dsInputDataList);

              // Self-check
              await selfCheckNode(downstreamNode, dsInputDataList);
              await new Promise(resolve => setTimeout(resolve, 5));

              // Execute the concurrent node with all accumulated data in CONCURRENT mode
              // The node should execute all items at once, not progressively
              // skipDownstream = false to allow it to execute its own downstream nodes
              // isProgressiveIteration = false to ensure results are replaced, not accumulated
              await processNode(downstreamNode, dsInputDataList, false, false);

              console.log(`🔄 Progressive completed - Concurrent node ${downstreamNode.id} execution finished`);

              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
              console.error(`🔄 Progressive completed - Concurrent downstream node ${downstreamNode.id} failed:`, error);
              throw error;
            }
          }
        }
      }
    },
    [updateNodeStatus, getNode, getNodes, setNodes, getEdges, getReactFlowEdges, setReactFlowNodes, showToast, collectInputData, selfCheckNode],
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

      // Clear downstream nodes based on whether a specific start node was provided
      if (startNodeId) {
        // Individual node run - clear only downstream nodes
        clearDownstreamNodes(startNodeId);
      } else {
        // Overall workflow run - clear all downstream nodes (keeping initial nodes)
        clearAllDownstreamNodes();
      }

      setLogMessages(['Starting workflow...']);

      const nodesToProcess = collectNodesToProcess(nodes, edges, _startNodeId);

      for (const node of nodesToProcess) {
        if (!isRunning.current) break;

        try {
          // Check if node is in progressive mode
          const isProgressiveMode = node.data.executionMode === 'progressive';

          // 第一步：收集数据（只收集一次）
          const inputDataList = collectInputData(node);

          // 第二步：自检（只负责类型转换）
          await selfCheckNode(node, inputDataList);

          await new Promise(resolve => setTimeout(resolve, 5));

          // 第三步：执行（重新获取类型并处理数据）
          await processNode(node, inputDataList);

          // In progressive mode, downstream nodes are already processed
          // So we need to skip them in the main workflow loop
          if (isProgressiveMode) {
            const downstreamNodeIds = new Set<string>();
            const collectDownstreamIds = (nodeId: string) => {
              const outgoing = edges.filter(e => e.source === nodeId);
              outgoing.forEach(edge => {
                if (!downstreamNodeIds.has(edge.target)) {
                  downstreamNodeIds.add(edge.target);

                  // Check if this downstream node is concurrent - if so, don't collect its children
                  // because concurrent nodes will be handled separately after progressive completes
                  const targetNode = nodesToProcess.find(n => n.id === edge.target);
                  const targetNodeData = targetNode?.data as any;
                  const isConcurrent = targetNodeData?.executionMode === 'concurrent';

                  if (isConcurrent) {
                    console.log(`🔄 Main workflow - Found concurrent downstream node ${edge.target}, will not collect its children`);
                  }

                  if (!isConcurrent) {
                    // Only collect children of non-concurrent nodes
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
                const removedNode = nodesToProcess[i];
                console.log(`🔄 Main workflow - Removing ${removedNode.id} (executionMode: ${(removedNode.data as any)?.executionMode}) from queue (will be handled by progressive parent)`);
                nodesToProcess.splice(i, 1);
              }
            }
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
    [getNodes, getEdges, processNode, collectInputData, selfCheckNode, updateNodeStatus, showToast, clearDownstreamNodes, clearAllDownstreamNodes],
  );

  return {
    logMessages,
    runWorkflow,
    stopWorkflow,
    isRunning: isRunning.current,
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
