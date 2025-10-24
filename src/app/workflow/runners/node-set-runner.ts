import { NodeRunner } from './types';
import { AppNode, NodeSetData, WorkflowNodeData } from '../components/nodes';

// Helper function to convert separate media lists to unified mediaList format
const convertToUnifiedMediaList = (media: {
  imageList?: any[];
  videoList?: any[];
  textList?: any[];
}): Array<{ id: string; type: 'image' | 'video' | 'text'; url?: string; content?: string; fileName: string; timestamp: number }> => {
  const unifiedList: Array<{ id: string; type: 'image' | 'video' | 'text'; url?: string; content?: string; fileName: string; timestamp: number }> = [];

  // Convert imageList
  if (media.imageList && media.imageList.length > 0) {
    media.imageList.forEach((img) => {
      unifiedList.push({
        id: img.id || `media-${Date.now()}-${Math.random()}`,
        type: 'image',
        url: img.url,
        fileName: img.fileName,
        timestamp: img.timestamp || Date.now()
      });
    });
  }

  // Convert videoList
  if (media.videoList && media.videoList.length > 0) {
    media.videoList.forEach((vid) => {
      unifiedList.push({
        id: vid.id || `media-${Date.now()}-${Math.random()}`,
        type: 'video',
        url: vid.url,
        fileName: vid.fileName,
        timestamp: vid.timestamp || Date.now()
      });
    });
  }

  // Convert textList
  if (media.textList && media.textList.length > 0) {
    media.textList.forEach((txt, index) => {
      unifiedList.push({
        id: `media-${Date.now()}-${Math.random()}`,
        type: 'text',
        content: typeof txt === 'string' ? txt : txt.content,
        fileName: `text-${index + 1}.txt`,
        timestamp: Date.now()
      });
    });
  }

  return unifiedList;
};

// Helper function to get media types from a node
const getMediaTypes = (node: AppNode): Set<string> => {
  const types = new Set<string>();
  const nodeData = node.data as WorkflowNodeData;
  const media = nodeData?.media;

  // Check unified mediaList first (from media-set nodes)
  if (media?.mediaList && media.mediaList.length > 0) {
    media.mediaList.forEach(item => {
      types.add(item.type);
    });
  }

  // Also check individual lists for backward compatibility
  if (media?.imageList && media.imageList.length > 0) types.add('image');
  if (media?.videoList && media.videoList.length > 0) types.add('video');
  if (media?.textList && media.textList.length > 0) types.add('text');

  return types;
};

// Helper function to check if all nodes have the same media type combination
const validateMediaTypeConsistency = (nodeList: AppNode[]): { isValid: boolean; error?: string } => {
  if (nodeList.length === 0) return { isValid: true };

  // Get the media types from the first node as reference
  const referenceTypes = getMediaTypes(nodeList[0]);
  const referenceTypeString = Array.from(referenceTypes).sort().join(',');

  // Check all other nodes have the same media types
  for (let i = 1; i < nodeList.length; i++) {
    const currentTypes = getMediaTypes(nodeList[i]);
    const currentTypeString = Array.from(currentTypes).sort().join(',');

    if (currentTypeString !== referenceTypeString) {
      return {
        isValid: false,
        error: `Media type mismatch: Node ${i + 1} has types [${currentTypeString}] but expected [${referenceTypeString}]`
      };
    }
  }

  return { isValid: true };
};

/**
 * NodeSet Runner
 *
 * Handles connections between NodeSets and other media nodes.
 *
 * Key Concepts:
 * 1. NodeSet outputMode (how NodeSet sends data to downstream):
 *    - 'loop' (individual): Each media-set in nodeList treated separately
 *    - 'direct' (integrated): All media-sets flattened into one combined set
 *
 * 2. Media Set setOutputMode (how image-set, video-set, text-set, media-set output):
 *    - 'individual': Each media item becomes separate output
 *    - 'integrated': All media items combined into one unit
 *
 * 3. NodeSet inputMode (how NodeSet processes upstream inputs):
 *    - 'sequence': Pairs inputs by index (a1+b1, a2+b2, ...)
 *    - 'cross': Creates Cartesian product (a1+b1, a1+b2, a2+b1, a2+b2, ...)
 *    - 'append': Simply concatenates inputs as separate media-sets
 *
 * Connection Scenarios:
 *
 * Example 1: Two NodeSets connecting to another NodeSet
 * - NodeSet A [a1, a2] with outputMode='loop' (individual)
 * - NodeSet B [b1, b2] with outputMode='loop' (individual)
 * - NodeSet C with inputMode='sequence'
 * - Result: C = {[a1].append(b1), [a2].append(b2)}
 *
 * Example 2: NodeSet and Image Set connecting
 * - NodeSet A [a1, a2] with outputMode='loop' (individual)
 * - Image Set B [b1, b2] with setOutputMode='individual'
 * - NodeSet C with inputMode='cross'
 * - Result: C = {[a1].append(b1), [a1].append(b2), [a2].append(b1), [a2].append(b2)}
 *
 * Special Rules:
 * - MediaSet nodes with mixed media types MUST use 'integrated' mode when connecting
 *   to NodeSet in cross/sequence modes (for type safety)
 * - Sequence mode requires all inputs to have same length
 * - Cross mode requires at least 2 inputs
 */
export const NodeSetNodeRunner: NodeRunner = {
  nodeType: 'node-set',

  canRun: (node: any) => node?.type === 'node-set',

  validate: (node: any, inputDataList: any[]) => {

    // Validate media type consistency in existing nodeList
    const nodeData = node?.data as NodeSetData;
    if (nodeData?.nodeList && nodeData.nodeList.length > 0) {
      const typeCheck = validateMediaTypeConsistency(nodeData.nodeList);
      if (!typeCheck.isValid) {
        return typeCheck;
      }
    }

    // Validate input mode requirements
    const inputMode = nodeData?.inputMode || 'sequence';

    // Cross mode requires at least 2 inputs to create combinations
    if (inputMode === 'cross' && inputDataList.length < 2) {
      return {
        isValid: false,
        error: 'Cross mode requires at least 2 input nodes to create combinations'
      };
    }

    // Special validation: MediaSet nodes in cross/sequence mode must be integrated
    if ((inputMode === 'cross' || inputMode === 'sequence') && inputDataList.length > 0) {
      for (let i = 0; i < inputDataList.length; i++) {
        const inputData = inputDataList[i];
        const media = inputData.media || {};

        // Check if this is a media-set node (has mixed media types)
        const hasMediaList = media.mediaList && media.mediaList.length > 0;
        if (hasMediaList) {
          const mediaTypes = new Set(media.mediaList.map((item: any) => item.type));
          const isMixedMediaSet = mediaTypes.size > 1;

          // If it's a mixed media-set and not integrated, require integrated mode
          if (isMixedMediaSet && inputData.setOutputMode !== 'integrated') {
            return {
              isValid: false,
              error: `Input ${i + 1}: MediaSet nodes with mixed media types must use 'integrated' output mode when connecting to NodeSet in ${inputMode} mode for type safety`
            };
          }
        }
      }
    }

    // Sequence mode requires all inputs to have the same length (considering integrated mode and NodeSet outputMode)
    if (inputMode === 'sequence' && inputDataList.length > 1) {
      const inputLengths = inputDataList.map(inputData => {
        // Handle NodeSet inputs
        if (inputData.nodeList && Array.isArray(inputData.nodeList)) {
          const outputMode = inputData.outputMode || 'loop';

          // If NodeSet is in 'direct' (integrated) mode, it counts as 1 item
          if (outputMode === 'direct') {
            return 1;
          }

          // If NodeSet is in 'loop' (individual) mode, count each media-set
          return inputData.nodeList.length;
        }

        // Handle regular media set inputs
        const setOutputMode = inputData.setOutputMode || 'individual';

        // If integrated mode, this counts as 1 item
        if (setOutputMode === 'integrated') {
          return 1;
        }

        // Otherwise, count individual items
        const media = inputData.media || {};
        let count = 0;

        // Check unified mediaList first
        if (media.mediaList) {
          count += media.mediaList.length;
        } else {
          // Fall back to individual lists
          if (media.imageList) count += media.imageList.length;
          if (media.videoList) count += media.videoList.length;
          if (media.textList) count += media.textList.length;
        }
        return count;
      });

      const firstLength = inputLengths[0];
      const allSameLength = inputLengths.every(len => len === firstLength);

      if (!allSameLength) {
        return {
          isValid: false,
          error: `Sequence mode requires all inputs to have the same length. Current lengths: [${inputLengths.join(', ')}]`
        };
      }
    }

    return { isValid: true };
  },

  run: async (node: AppNode, inputDataList: any[]) => {

    console.log('🔄 NodeSet Runner - Starting run for node:', node.id);
    console.log('🔄 NodeSet Runner - Input data list length:', inputDataList.length);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const nodeData = node?.data as NodeSetData;
    const collectorMode = nodeData?.collectorMode;
    const inputMode = nodeData?.inputMode || 'sequence'; // How this nodeset processes inputs

    console.log('🔄 NodeSet Runner - Input Mode:', inputMode);
    console.log('🔄 NodeSet Runner - Collector Mode:', collectorMode);

    let currentNodeList : AppNode[] = [];
    let updatedNodeList : AppNode[] = [];

    if(collectorMode === 'collector') {
      // 如果是收集模式，则需要将当前nodeList和输入数据合并
      currentNodeList = nodeData?.nodeList || [];

    }

    // Process inputs based on the nodeset's inputMode setting
    // All inputs are treated the same way according to inputMode

    if (inputMode === 'cross') {
      console.log('🔄 NodeSet Runner - Processing in CROSS mode...');

      // Extract individual media items from each input node, respecting setOutputMode and NodeSet outputMode
      const inputMediaArrays = inputDataList.map((inputData, inputIndex) => {
        console.log(`🔄 NodeSet Runner - Processing input ${inputIndex}:`, inputData.nodeList ? 'NodeSet' : 'Regular Node');

        // Handle NodeSet inputs
        if (inputData.nodeList && Array.isArray(inputData.nodeList)) {
          const outputMode = inputData.outputMode || 'loop';
          console.log(`🔄 NodeSet Runner - Input ${inputIndex} is NodeSet with outputMode:`, outputMode);

          // If NodeSet is in 'direct' (integrated) mode, treat entire NodeSet as one item
          if (outputMode === 'direct') {
            // Flatten all media from nodeList into one integrated item
            const allMedia: any = {
              imageList: [],
              videoList: [],
              textList: [],
              mediaList: []
            };

            inputData.nodeList.forEach((node: any) => {
              const nodeMedia = node.data?.media || {};
              if (nodeMedia.mediaList) {
                allMedia.mediaList.push(...nodeMedia.mediaList);
              }
              if (nodeMedia.imageList) allMedia.imageList.push(...nodeMedia.imageList);
              if (nodeMedia.videoList) allMedia.videoList.push(...nodeMedia.videoList);
              if (nodeMedia.textList) allMedia.textList.push(...nodeMedia.textList);
            });

            return [{
              type: 'integrated',
              media: allMedia,
              isIntegrated: true
            }];
          }

          // If NodeSet is in 'loop' (individual) mode, treat each media-set separately
          return inputData.nodeList.map((node: any) => ({
            type: 'integrated',
            media: node.data?.media || {},
            isIntegrated: true
          }));
        }

        // Handle regular media set inputs
        const media = inputData.media || {};
        const setOutputMode = inputData.setOutputMode || 'individual';

        console.log(`🔄 NodeSet Runner - Input ${inputIndex} setOutputMode:`, setOutputMode);

        // If integrated mode, treat entire node as one item
        if (setOutputMode === 'integrated') {
          // Package entire node's media as a single integrated item
          return [{
            type: 'integrated',
            media: media,
            isIntegrated: true
          }];
        }

        // Otherwise, extract individual items
        const items: any[] = [];

        // Check for unified mediaList first
        if (media.mediaList) {
          items.push(...media.mediaList.map((item: any) => ({
            type: item.type,
            data: item
          })));
        } else {
          // Fall back to individual lists for backward compatibility
          if (media.imageList) {
            items.push(...media.imageList.map((img: any) => ({ type: 'image', data: img })));
          }
          if (media.videoList) {
            items.push(...media.videoList.map((vid: any) => ({ type: 'video', data: vid })));
          }
          if (media.textList) {
            items.push(...media.textList.map((txt: any) => ({ type: 'text', data: txt })));
          }
        }

        return items;
      });

      console.log('🔄 NodeSet Runner - Cross mode input arrays:', inputMediaArrays.map(arr => arr.length));

      // Calculate Cartesian product of individual items
      const crossProduct = inputMediaArrays.reduce((acc: any[], currentArray: any[]) => {
        if (acc.length === 0) {
          // First array, wrap each item
          return currentArray.map(item => [item]);
        }

        // Subsequent arrays, combine with existing combinations
        const result: any[] = [];
        for (const existingCombination of acc) {
          for (const currentItem of currentArray) {
            result.push([...existingCombination, currentItem]);
          }
        }
        return result;
      }, []);

      console.log('🔄 NodeSet Runner - Cross product combinations:', crossProduct.length);

      // Create media-set nodes for each combination
      const crossProcessedNodes = crossProduct.map((combination: any[], index: number) => {
        const combinedMedia: any = {
          imageList: [],
          videoList: [],
          textList: []
        };

        // Combine all items in this combination
        combination.forEach(item => {
          if (item.isIntegrated) {
            // This is an integrated node - add all its media at once
            const integratedMedia = item.media;
            if (integratedMedia.mediaList) {
              // Unified mediaList from media-set
              integratedMedia.mediaList.forEach((mediaItem: any) => {
                if (mediaItem.type === 'image') {
                  combinedMedia.imageList.push(mediaItem);
                } else if (mediaItem.type === 'video') {
                  combinedMedia.videoList.push(mediaItem);
                } else if (mediaItem.type === 'text') {
                  combinedMedia.textList.push(mediaItem.content || mediaItem);
                }
              });
            } else {
              // Fall back to individual lists
              if (integratedMedia.imageList) {
                combinedMedia.imageList.push(...integratedMedia.imageList);
              }
              if (integratedMedia.videoList) {
                combinedMedia.videoList.push(...integratedMedia.videoList);
              }
              if (integratedMedia.textList) {
                combinedMedia.textList.push(...integratedMedia.textList);
              }
            }
          } else if (item.type === 'image') {
            combinedMedia.imageList.push(item.data);
          } else if (item.type === 'video') {
            combinedMedia.videoList.push(item.data);
          } else if (item.type === 'text') {
            combinedMedia.textList.push(typeof item.data === 'string' ? item.data : item.data.content);
          }
        });

        // Clean up empty arrays
        if (combinedMedia.imageList.length === 0) delete combinedMedia.imageList;
        if (combinedMedia.videoList.length === 0) delete combinedMedia.videoList;
        if (combinedMedia.textList.length === 0) delete combinedMedia.textList;

        // Convert to unified mediaList format
        const unifiedMediaList = convertToUnifiedMediaList(combinedMedia);

        return {
          id: `cross-node-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          type: "media-set" as const,
          data: {
            media: {
              mediaList: unifiedMediaList
            },
            title: `Media-Set ${index + 1}`,
            status: 'initial' as const,
            timestamp: Date.now()
          },
          position: { x: 0, y: 0 }
        } as AppNode;
      });

      updatedNodeList = [...updatedNodeList, ...crossProcessedNodes];
    }

    else if (inputMode === 'sequence') {
      console.log('🔄 NodeSet Runner - Processing in SEQUENCE mode...');

      // Sequence mode: pair inputs sequentially (a1+b1, a2+b2, ...)
      // Respect setOutputMode and NodeSet outputMode when extracting media
      const sequenceMediaArrays = inputDataList.map((inputData, inputIndex) => {
        console.log(`🔄 NodeSet Runner - Processing sequence input ${inputIndex}:`, inputData.nodeList ? 'NodeSet' : 'Regular Node');

        // Handle NodeSet inputs
        if (inputData.nodeList && Array.isArray(inputData.nodeList)) {
          const outputMode = inputData.outputMode || 'loop';
          console.log(`🔄 NodeSet Runner - Sequence Input ${inputIndex} is NodeSet with outputMode:`, outputMode);

          // If NodeSet is in 'direct' (integrated) mode, treat entire NodeSet as one item
          if (outputMode === 'direct') {
            // Flatten all media from nodeList into one integrated item
            const allMedia: any = {
              imageList: [],
              videoList: [],
              textList: [],
              mediaList: []
            };

            inputData.nodeList.forEach((node: any) => {
              const nodeMedia = node.data?.media || {};
              if (nodeMedia.mediaList) {
                allMedia.mediaList.push(...nodeMedia.mediaList);
              }
              if (nodeMedia.imageList) allMedia.imageList.push(...nodeMedia.imageList);
              if (nodeMedia.videoList) allMedia.videoList.push(...nodeMedia.videoList);
              if (nodeMedia.textList) allMedia.textList.push(...nodeMedia.textList);
            });

            return [{
              type: 'integrated' as const,
              media: allMedia,
              isIntegrated: true
            }];
          }

          // If NodeSet is in 'loop' (individual) mode, treat each media-set separately
          return inputData.nodeList.map((node: any) => ({
            type: 'integrated' as const,
            media: node.data?.media || {},
            isIntegrated: true
          }));
        }

        // Handle regular media set inputs
        const media = inputData.media || {};
        const setOutputMode = inputData.setOutputMode || 'individual';

        console.log(`🔄 NodeSet Runner - Sequence Input ${inputIndex} setOutputMode:`, setOutputMode);

        // If integrated mode, return entire node as single item
        if (setOutputMode === 'integrated') {
          return [{
            type: 'integrated' as const,
            media: media,
            isIntegrated: true
          }];
        }

        // Otherwise, extract individual items
        const allMedia = [];

        // Check for unified mediaList first
        if (media.mediaList) {
          allMedia.push(...media.mediaList.map((item: any) => ({
            type: item.type,
            data: item
          })));
        } else {
          // Fall back to individual lists for backward compatibility
          if (media.imageList) {
            allMedia.push(...media.imageList.map((img: any) => ({ type: 'image' as const, data: img })));
          }
          if (media.videoList) {
            allMedia.push(...media.videoList.map((vid: any) => ({ type: 'video' as const, data: vid })));
          }
          if (media.textList) {
            allMedia.push(...media.textList.map((txt: any) => ({ type: 'text' as const, data: txt })));
          }
        }

        return allMedia;
      });

      // Find the maximum length to determine how many paired nodes to create
      const maxLength = Math.max(...sequenceMediaArrays.map(arr => arr.length));

      const pairedNodes: AppNode[] = [];

      for (let i = 0; i < maxLength; i++) {
        const combinedMedia: any = {
          imageList: [],
          videoList: [],
          textList: []
        };

        // For each input, take the i-th item and combine
        sequenceMediaArrays.forEach(mediaArray => {
          if (i < mediaArray.length) {
            const item = mediaArray[i];

            if (item.isIntegrated) {
              // This is an integrated node - add all its media at once
              const integratedMedia = item.media;
              if (integratedMedia.mediaList) {
                // Unified mediaList from media-set
                integratedMedia.mediaList.forEach((mediaItem: any) => {
                  if (mediaItem.type === 'image') {
                    combinedMedia.imageList.push(mediaItem);
                  } else if (mediaItem.type === 'video') {
                    combinedMedia.videoList.push(mediaItem);
                  } else if (mediaItem.type === 'text') {
                    combinedMedia.textList.push(mediaItem.content || mediaItem);
                  }
                });
              } else {
                // Fall back to individual lists
                if (integratedMedia.imageList) {
                  combinedMedia.imageList.push(...integratedMedia.imageList);
                }
                if (integratedMedia.videoList) {
                  combinedMedia.videoList.push(...integratedMedia.videoList);
                }
                if (integratedMedia.textList) {
                  combinedMedia.textList.push(...integratedMedia.textList);
                }
              }
            } else if (item.type === 'image') {
              combinedMedia.imageList.push(item.data);
            } else if (item.type === 'video') {
              combinedMedia.videoList.push(item.data);
            } else if (item.type === 'text') {
              combinedMedia.textList.push(typeof item.data === 'string' ? item.data : item.data.content);
            }
          }
        });

        // Clean up empty arrays
        if (combinedMedia.imageList.length === 0) delete combinedMedia.imageList;
        if (combinedMedia.videoList.length === 0) delete combinedMedia.videoList;
        if (combinedMedia.textList.length === 0) delete combinedMedia.textList;

        // Convert to unified mediaList format
        const unifiedMediaList = convertToUnifiedMediaList(combinedMedia);

        pairedNodes.push({
          id: `sequence-node-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          type: "media-set" as const,
          data: {
            media: {
              mediaList: unifiedMediaList
            },
            title: `Media-Set ${i + 1}`,
            status: 'initial' as const,
            timestamp: Date.now()
          },
          position: { x: 0, y: 0 }
        } as AppNode);
      }

      updatedNodeList = [...updatedNodeList, ...pairedNodes];
    }

    else if (inputMode === 'append') {
      console.log('🔄 NodeSet Runner - Processing in APPEND mode...');

      // Append mode: Respect setOutputMode for each input
      const appendProcessedNodes: AppNode[] = [];

      inputDataList.forEach((inputData, inputIndex) => {
        console.log(`🔄 NodeSet Runner - Processing append input ${inputIndex}:`, inputData.nodeList ? 'NodeSet' : 'Regular Node');

        // Handle NodeSet inputs
        if (inputData.nodeList && Array.isArray(inputData.nodeList)) {
          const outputMode = inputData.outputMode || 'loop';
          console.log(`🔄 NodeSet Runner - Append Input ${inputIndex} is NodeSet with outputMode:`, outputMode);

          if (outputMode === 'direct') {
            // Flatten all media from nodeList into one media-set
            const allMedia: any = {
              imageList: [],
              videoList: [],
              textList: [],
              mediaList: []
            };

            inputData.nodeList.forEach((node: any) => {
              const nodeMedia = node.data?.media || {};
              if (nodeMedia.mediaList) {
                allMedia.mediaList.push(...nodeMedia.mediaList);
              }
              if (nodeMedia.imageList) allMedia.imageList.push(...nodeMedia.imageList);
              if (nodeMedia.videoList) allMedia.videoList.push(...nodeMedia.videoList);
              if (nodeMedia.textList) allMedia.textList.push(...nodeMedia.textList);
            });

            const unifiedMediaList = allMedia.mediaList.length > 0
              ? allMedia.mediaList
              : convertToUnifiedMediaList(allMedia);

            appendProcessedNodes.push({
              id: `append-node-${Date.now()}-${inputIndex}-${Math.random().toString(36).substr(2, 9)}`,
              type: "media-set" as const,
              data: {
                media: { mediaList: unifiedMediaList },
                title: `Media-Set (NodeSet direct)`,
                status: 'initial' as const,
                timestamp: Date.now()
              },
              position: { x: 0, y: 0 }
            } as AppNode);
          } else {
            // Loop mode: Add each media-set separately
            inputData.nodeList.forEach((node: any, nodeIdx: number) => {
              const nodeMedia = node.data?.media || {};
              const unifiedMediaList = nodeMedia.mediaList || convertToUnifiedMediaList(nodeMedia);

              appendProcessedNodes.push({
                id: `append-node-${Date.now()}-${inputIndex}-${nodeIdx}-${Math.random().toString(36).substr(2, 9)}`,
                type: "media-set" as const,
                data: {
                  media: { mediaList: unifiedMediaList },
                  title: node.data?.title || `Media-Set ${nodeIdx + 1}`,
                  status: 'initial' as const,
                  timestamp: Date.now()
                },
                position: { x: 0, y: 0 }
              } as AppNode);
            });
          }
          return; // Done with this NodeSet input
        }

        // Handle regular media set inputs
        const media = inputData.media || {};
        const setOutputMode = inputData.setOutputMode || 'individual';

        console.log(`🔄 NodeSet Runner - Append Input ${inputIndex} setOutputMode:`, setOutputMode);

        // If integrated mode, add all media as one media-set
        if (setOutputMode === 'integrated') {
          let unifiedMediaList;
          if (media.mediaList) {
            unifiedMediaList = media.mediaList;
          } else {
            unifiedMediaList = convertToUnifiedMediaList(media);
          }

          appendProcessedNodes.push({
            id: `append-node-${Date.now()}-${inputIndex}-${Math.random().toString(36).substr(2, 9)}`,
            type: "media-set" as const,
            data: {
              ...inputData,
              media: { mediaList: unifiedMediaList },
              timestamp: Date.now()
            },
            position: { x: 0, y: 0 }
          } as AppNode);
        } else {
          // Individual mode: Split each media item into separate media-sets
          const allMediaItems: any[] = [];

          // Collect all media items
          if (media.mediaList) {
            allMediaItems.push(...media.mediaList.map((item: any) => ({ type: item.type, data: item })));
          } else {
            if (media.imageList) {
              allMediaItems.push(...media.imageList.map((img: any) => ({ type: 'image', data: img })));
            }
            if (media.videoList) {
              allMediaItems.push(...media.videoList.map((vid: any) => ({ type: 'video', data: vid })));
            }
            if (media.textList) {
              allMediaItems.push(...media.textList.map((txt: any) => ({ type: 'text', data: txt })));
            }
          }

          // Create a separate media-set for each individual item
          allMediaItems.forEach((item, itemIdx) => {
            const singleItemMedia: any = {};

            if (item.type === 'image') {
              singleItemMedia.mediaList = [{
                id: item.data.id || `media-${Date.now()}-${Math.random()}`,
                type: 'image',
                url: item.data.url,
                fileName: item.data.fileName,
                timestamp: item.data.timestamp || Date.now()
              }];
            } else if (item.type === 'video') {
              singleItemMedia.mediaList = [{
                id: item.data.id || `media-${Date.now()}-${Math.random()}`,
                type: 'video',
                url: item.data.url,
                fileName: item.data.fileName,
                timestamp: item.data.timestamp || Date.now()
              }];
            } else if (item.type === 'text') {
              singleItemMedia.mediaList = [{
                id: `media-${Date.now()}-${Math.random()}`,
                type: 'text',
                content: typeof item.data === 'string' ? item.data : item.data.content,
                fileName: `text-${itemIdx + 1}.txt`,
                timestamp: Date.now()
              }];
            }

            appendProcessedNodes.push({
              id: `append-node-${Date.now()}-${inputIndex}-${itemIdx}-${Math.random().toString(36).substr(2, 9)}`,
              type: "media-set" as const,
              data: {
                media: singleItemMedia,
                title: `Media-Set ${itemIdx + 1}`,
                status: 'initial' as const,
                timestamp: Date.now()
              },
              position: { x: 0, y: 0 }
            } as AppNode);
          });
        }
      });

      updatedNodeList = [...updatedNodeList, ...appendProcessedNodes];
    }

    if(collectorMode === 'collector') {
      updatedNodeList = [...currentNodeList, ...updatedNodeList];
    };

    console.log('🔄 NodeSet Runner - Updated nodeList length:', updatedNodeList.length);

    // Validate media type consistency in the final nodeList
    const typeValidation = validateMediaTypeConsistency(updatedNodeList);
    if (!typeValidation.isValid) {
      console.error('🔄 NodeSet Runner - Type validation failed:', typeValidation.error);
      throw new Error(typeValidation.error);
    }

    console.log('🔄 NodeSet Runner - Media type consistency validated successfully');

    // 返回包含 nodeList 的数据，让下游节点自己判断如何提取
    return {
        nodeList: updatedNodeList,
        timestamp: Date.now(),
    };
  },
};