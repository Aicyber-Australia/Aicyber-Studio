import { NodeRunner } from './types';
import { AppNode, NodeSetData, WorkflowNodeData } from '../components/nodes';

// Helper function to get media types from a node
const getMediaTypes = (node: AppNode): Set<string> => {
  const types = new Set<string>();
  const nodeData = node.data as WorkflowNodeData;
  const media = nodeData?.media;

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

export const NodeSetNodeRunner: NodeRunner = {
  nodeType: 'node-set',

  canRun: (node: any) => node?.type === 'node-set',

  validate: (node: any, inputDataList: any[], setNodes?: any) => {

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

      // Extract individual media items from each input node
      const inputMediaArrays = inputDataList.map(inputData => {
        const media = inputData.media || {};
        const items: any[] = [];

        // Collect all individual media items
        if (media.imageList) {
          items.push(...media.imageList.map((img: any) => ({ type: 'image', data: img })));
        }
        if (media.videoList) {
          items.push(...media.videoList.map((vid: any) => ({ type: 'video', data: vid })));
        }
        if (media.textList) {
          items.push(...media.textList.map((txt: any) => ({ type: 'text', data: txt })));
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
          if (item.type === 'image') {
            combinedMedia.imageList.push(item.data);
          } else if (item.type === 'video') {
            combinedMedia.videoList.push(item.data);
          } else if (item.type === 'text') {
            combinedMedia.textList.push(item.data);
          }
        });

        // Clean up empty arrays
        if (combinedMedia.imageList.length === 0) delete combinedMedia.imageList;
        if (combinedMedia.videoList.length === 0) delete combinedMedia.videoList;
        if (combinedMedia.textList.length === 0) delete combinedMedia.textList;

        return {
          id: `cross-node-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          type: "media-set" as const,
          data: {
            media: combinedMedia,
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
      // First, extract all media arrays from all input nodes
      const sequenceMediaArrays = inputDataList.map(inputData => {
        const media = inputData.media || {};
        const allMedia = [];

        // Collect all media items from this node
        if (media.imageList) {
          allMedia.push(...media.imageList.map((img: any) => ({ type: 'image' as const, data: img })));
        }
        if (media.videoList) {
          allMedia.push(...media.videoList.map((vid: any) => ({ type: 'video' as const, data: vid })));
        }
        if (media.textList) {
          allMedia.push(...media.textList.map((txt: any) => ({ type: 'text' as const, data: txt })));
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
            if (item.type === 'image') {
              combinedMedia.imageList.push(item.data);
            } else if (item.type === 'video') {
              combinedMedia.videoList.push(item.data);
            } else if (item.type === 'text') {
              combinedMedia.textList.push(item.data);
            }
          }
        });

        // Clean up empty arrays
        if (combinedMedia.imageList.length === 0) delete combinedMedia.imageList;
        if (combinedMedia.videoList.length === 0) delete combinedMedia.videoList;
        if (combinedMedia.textList.length === 0) delete combinedMedia.textList;

        pairedNodes.push({
          id: `sequence-node-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          type: "media-set" as const,
          data: {
            media: combinedMedia,
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

      // Simply append each input as a separate media-set node
      const appendProcessedNodes = inputDataList.map((inputData, index) => ({
        id: `append-node-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        type: "media-set" as const,
        data: {
          ...inputData,
          timestamp: Date.now()
        },
        position: { x: 0, y: 0 }
      }));

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