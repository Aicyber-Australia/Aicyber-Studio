import { NodeRunner } from './types';
import { AppNode, ApiExecutionResponse, ApiExecutionError } from '../components/nodes';
import { getApiCallFunction, getRegisteredNodeTypes } from '../../api/services/service-registrar';
import { normalizeInputsToMediaSets, MediaSet } from './media-set-utils';

/**
 * Deduplicates MediaSets to prevent duplicate API requests.
 * Two MediaSets are considered duplicates if they contain the same media items (by URL/content).
 */
function deduplicateMediaSets(mediaSets: MediaSet[]): MediaSet[] {
  const seen = new Set<string>();
  const deduplicated: MediaSet[] = [];

  for (const mediaSet of mediaSets) {
    // Create a unique key for this mediaSet based on its media items
    const mediaKeys = mediaSet.mediaList
      .map(item => {
        // Use URL for images/videos, content for text
        if (item.type === 'text') {
          return `text:${item.content}`;
        }
        return `${item.type}:${item.url}`;
      })
      .sort() // Sort to ensure consistent ordering
      .join('|');

    const mediaSetKey = `mediaSet:${mediaKeys}`;

    if (!seen.has(mediaSetKey)) {
      seen.add(mediaSetKey);
      deduplicated.push(mediaSet);
    } else {
      console.log(`ActionNodeRunner - Skipping duplicate mediaSet: ${mediaSetKey}`);
    }
  }

  return deduplicated;
}

export const ActionNodeRunner: NodeRunner<AppNode> = {
  nodeType: 'action-node', // 通用类型

  canRun(node: AppNode): boolean {
    // 动态获取所有已注册的节点类型
    const registeredNodeTypes = getRegisteredNodeTypes();
    const canRun = registeredNodeTypes.includes(node.type);
    console.log(`ActionNodeRunner.canRun(${node.type}):`, canRun, 'Registered types:', registeredNodeTypes);
    return canRun;
  },

  validate(node: AppNode, inputDataList: any[]): { isValid: boolean; error?: string } {
    const nodeData = node.data;
    const prompt = ('prompt' in nodeData && nodeData?.prompt) ? nodeData.prompt : '';

    // edit-image-node doesn't require a prompt
    const noPromptRequired = ['edit-image-node'];

    // 检查prompt是否存在 (except for nodes that don't need it)
    if (!noPromptRequired.includes(node.type) && !prompt.trim()) {
      return { isValid: false, error: 'Prompt is required' };
    }

    // 对于需要输入数据的节点类型进行额外验证
    const requiresInputData = ['image-to-image-node', 'image-replicate-node', 'video-to-video-node', 'image-to-text-node', 'edit-image-node'];
    if (requiresInputData.includes(node.type)) {
      if (!inputDataList || inputDataList.length === 0) {
        return { isValid: false, error: 'No input data provided' };
      }

      // Normalize inputs to mediaSets to validate
      const mediaSets = normalizeInputsToMediaSets(inputDataList);

      if (mediaSets.length === 0) {
        return { isValid: false, error: `No valid media data found in input for ${node.type}` };
      }

      // Verify each mediaSet has required media
      const allMediaSetsValid = mediaSets.every(mediaSet =>
        mediaSet.mediaList && mediaSet.mediaList.length > 0
      );

      if (!allMediaSetsValid) {
        return { isValid: false, error: `Invalid media data structure for ${node.type}` };
      }
    }

    return { isValid: true };
  },

  async run(node: AppNode, inputDataList: any[], updateNodeData?: (data: any) => void, progressiveCallback?: (mediaSetIndex: number, mediaSet: any, continueDownstream: () => Promise<void>) => Promise<void>): Promise<any> {
    try {
      console.log(`ActionNodeRunner - Running ${node.type} with data:`, node.data);
      console.log(`ActionNodeRunner - Input data list:`, inputDataList);

      // Normalize all inputs to unified MediaSet format
      const normalizedMediaSets = normalizeInputsToMediaSets(inputDataList);
      console.log(`ActionNodeRunner - Normalized to ${normalizedMediaSets.length} mediaSets:`, normalizedMediaSets);

      // Deduplicate mediaSets based on media URLs/content to avoid duplicate API requests
      const mediaSets = deduplicateMediaSets(normalizedMediaSets);
      console.log(`ActionNodeRunner - After deduplication: ${mediaSets.length} mediaSets`);

      // Store execution count in node data for UI display
      const executionCount = mediaSets.length;
      console.log(`ActionNodeRunner - Execution count: ${executionCount}`);

      // 获取对应的API服务函数
      const apiService = getApiCallFunction(node.type);
      console.log(`ActionNodeRunner - Got API service function for ${node.type}`);

      // Initialize shared state
      const apiResponses: Array<ApiExecutionResponse | ApiExecutionError> = [];
      const resultMediaList: any[] = [];
      let successCount = 0;
      let errorCount = 0;

      // Helper function to update node with current state
      const pushUpdate = () => {
        if (updateNodeData) {
          updateNodeData({
            media: {
              mediaList: [...resultMediaList]
            },
            apiResponses: [...apiResponses],
            executionMetadata: {
              totalExecutions: executionCount,
              successCount,
              errorCount,
              lastExecutionTime: Date.now()
            }
          });
        }
      };

      // Check execution mode
      const executionMode = node.data.executionMode || 'concurrent';
      console.log(`ActionNodeRunner - Execution mode: ${executionMode}`);

      // Helper function to process a single mediaSet
      const processSingleMediaSet = async (mediaSet: any, i: number) => {
        console.log(`ActionNodeRunner - Starting mediaSet ${i + 1}/${mediaSets.length}`);

        try {
          // Call API service with single mediaSet
          const singleResult = await apiService(node, [mediaSet]);

          console.log(`ActionNodeRunner - MediaSet ${i + 1} result:`, singleResult);

          // Extract response data
          if (singleResult && typeof singleResult === 'object') {
            const resultData = singleResult as any;

            // Check if it's an error response
            if ('error' in resultData) {
              const errorResponse: ApiExecutionError = {
                error: resultData.error,
                errorCode: resultData.errorCode,
                metadata: resultData.metadata
              };
              apiResponses.push(errorResponse);
              errorCount++;
              console.log(`ActionNodeRunner - MediaSet ${i + 1} returned error:`, errorResponse.error);

              // Push real-time update
              pushUpdate();

              // In progressive mode, return null to indicate skip
              return null;
            } else {
              // Extract media from successful response
              if (resultData.media) {
                let hasMedia = false;
                const currentBatchMedia: any[] = [];

                // Process imageList
                if (resultData.media.imageList && Array.isArray(resultData.media.imageList)) {
                  resultData.media.imageList.forEach((img: any) => {
                    const response: ApiExecutionResponse = {
                      url: img.url,
                      type: 'image',
                      metadata: resultData.metadata
                    };
                    apiResponses.push(response);
                    const mediaItem = {
                      id: `media-${Date.now()}-${Math.random()}`,
                      type: 'image',
                      url: img.url,
                      fileName: img.fileName || `result-${i + 1}.jpg`,
                      timestamp: Date.now()
                    };
                    resultMediaList.push(mediaItem);
                    currentBatchMedia.push(mediaItem);
                    hasMedia = true;
                  });
                }

                // Process videoList
                if (resultData.media.videoList && Array.isArray(resultData.media.videoList)) {
                  resultData.media.videoList.forEach((vid: any) => {
                    const response: ApiExecutionResponse = {
                      url: vid.url,
                      type: 'video',
                      metadata: resultData.metadata
                    };
                    apiResponses.push(response);
                    const mediaItem = {
                      id: `media-${Date.now()}-${Math.random()}`,
                      type: 'video',
                      url: vid.url,
                      fileName: vid.fileName || `result-${i + 1}.mp4`,
                      timestamp: Date.now()
                    };
                    resultMediaList.push(mediaItem);
                    currentBatchMedia.push(mediaItem);
                    hasMedia = true;
                  });
                }

                // Process textList
                if (resultData.media.textList && Array.isArray(resultData.media.textList)) {
                  resultData.media.textList.forEach((text: string) => {
                    const response: ApiExecutionResponse = {
                      url: '', // Text doesn't have URL
                      type: 'text',
                      metadata: { ...resultData.metadata, content: text }
                    };
                    apiResponses.push(response);
                    const mediaItem = {
                      id: `media-${Date.now()}-${Math.random()}`,
                      type: 'text',
                      content: text,
                      fileName: `result-${i + 1}.txt`,
                      timestamp: Date.now()
                    };
                    resultMediaList.push(mediaItem);
                    currentBatchMedia.push(mediaItem);
                    hasMedia = true;
                  });
                }

                if (hasMedia) {
                  successCount++;
                }

                // Push real-time update
                pushUpdate();

                return currentBatchMedia;
              }
            }
          }
        } catch (error) {
          // Handle execution error
          const errorResponse: ApiExecutionError = {
            error: error instanceof Error ? error.message : 'Unknown error',
            metadata: { mediaSetIndex: i }
          };
          apiResponses.push(errorResponse);
          errorCount++;
          console.error(`ActionNodeRunner - MediaSet ${i + 1} execution failed:`, error);

          // Push real-time update
          pushUpdate();

          // In progressive mode, return null to indicate skip
          return null;
        }

        return null;
      };

      if (executionMode === 'progressive' && progressiveCallback) {
        // Progressive mode: execute one by one with downstream execution
        console.log('ActionNodeRunner - Using progressive execution mode');

        for (let i = 0; i < mediaSets.length; i++) {
          const mediaSet = mediaSets[i];

          // Process single mediaSet and get result
          const batchMedia = await processSingleMediaSet(mediaSet, i);

          // If error occurred, skip to next (batchMedia will be null)
          if (batchMedia === null) {
            console.log(`ActionNodeRunner - Skipping mediaSet ${i + 1} due to error`);
            continue;
          }

          // Execute downstream workflow with this result
          await progressiveCallback(i, mediaSet, async () => {
            console.log(`ActionNodeRunner - Progressive: executing downstream for mediaSet ${i + 1}`);
            // Downstream execution happens in the callback
          });
        }
      } else {
        // Concurrent mode: execute all API calls concurrently
        console.log('ActionNodeRunner - Using concurrent execution mode');

        const promises = mediaSets.map(async (mediaSet, i) => {
          await processSingleMediaSet(mediaSet, i);
        });

        // Wait for all API calls to complete
        await Promise.all(promises);
      }

      console.log(`ActionNodeRunner - All executions complete. Success: ${successCount}, Errors: ${errorCount}`);
      console.log(`ActionNodeRunner - API Responses:`, apiResponses);
      console.log(`ActionNodeRunner - Result media list:`, resultMediaList);

      // Return final result with media list and execution metadata
      return {
        media: {
          mediaList: resultMediaList
        },
        apiResponses,
        executionMetadata: {
          totalExecutions: executionCount,
          successCount,
          errorCount,
          lastExecutionTime: Date.now()
        },
        executionCount,
        mediaSetsProcessed: mediaSets.length
      };
    } catch (error) {
      console.error(`ActionNodeRunner error for ${node.type}:`, error);
      throw new Error(`${node.type} execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};
