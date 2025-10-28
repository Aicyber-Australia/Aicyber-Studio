/**
 * Media Set Utilities
 *
 * This module provides utilities for normalizing inputs to action nodes.
 * It converts all input types (frames, sets with different output modes, and mediaSets)
 * into a unified MediaSet array format for consistent processing.
 */

export type MediaItem = {
  id: string;
  type: 'image' | 'text' | 'video';
  url?: string;
  content?: string;
  fileName: string;
  timestamp: number;
};

export type MediaSet = {
  mediaList: MediaItem[];
  fileName: string;
  timestamp: number;
};

export type InputData = {
  media?: {
    imageList?: Array<{
      url: string;
      data?: string;
      fileName: string;
      timestamp?: number;
    }>;
    videoList?: Array<{
      url: string;
      data?: string;
      fileName: string;
      timestamp?: number;
    }>;
    textList?: string[];
    mediaList?: MediaItem[];
  };
  setOutputMode?: 'individual' | 'integrated';
  fileName?: string;
  timestamp?: number;
  imageUrl?: string;
  imageData?: string;
  videoUrl?: string;
  textContent?: string;
  // Node-set specific properties
  nodeList?: Array<{
    id: string;
    type: string;
    data: {
      media?: {
        mediaList?: MediaItem[];
      };
      fileName?: string;
      timestamp?: number;
    };
  }>;
  outputMode?: 'loop' | 'direct'; // How node-set outputs: loop (pass each node) or direct (flatten all)
};

/**
 * Normalizes all input data into a unified array of MediaSets.
 *
 * Handles multiple scenarios:
 * 1. Multiple individual frames -> combined into one MediaSet with all items
 * 2. Single frame -> one MediaSet with one item
 * 3. Set nodes with 'individual' mode -> each item becomes a separate MediaSet
 * 4. Set nodes with 'integrated' mode -> all items combined into one MediaSet
 * 5. Node-sets -> each media-set in nodeList becomes a separate MediaSet
 *
 * @param inputDataList - Array of input data from connected nodes
 * @returns Array of MediaSets ready for action node processing
 */
export function normalizeInputsToMediaSets(inputDataList: InputData[]): MediaSet[] {
  if (!inputDataList || inputDataList.length === 0) {
    return [];
  }

  const mediaSets: MediaSet[] = [];

  // Check if all inputs are individual frames (single media items without setOutputMode)
  const allIndividualFrames = inputDataList.every((input) => {
    // Skip node-sets
    if (input.nodeList) return false;

    // Must not have setOutputMode (frames don't have this)
    if (input.setOutputMode) return false;

    const media = input.media || {};

    // Count total media items
    const totalItems =
      (media.imageList?.length || 0) +
      (media.videoList?.length || 0) +
      (media.textList?.length || 0) +
      (media.mediaList?.length || 0);

    // Must have exactly 1 item
    return totalItems === 1;
  });

  // Special case: Multiple individual frames -> combine into single MediaSet
  if (allIndividualFrames && inputDataList.length > 1) {
    const combinedMediaList: MediaItem[] = [];

    inputDataList.forEach((input, index) => {
      const media = input.media || {};

      if (media.imageList?.[0]) {
        const img = media.imageList[0];
        combinedMediaList.push({
          id: `media-${Date.now()}-${index}-${Math.random()}`,
          type: 'image',
          url: img.url,
          fileName: img.fileName,
          timestamp: img.timestamp || Date.now()
        });
      } else if (media.videoList?.[0]) {
        const vid = media.videoList[0];
        combinedMediaList.push({
          id: `media-${Date.now()}-${index}-${Math.random()}`,
          type: 'video',
          url: vid.url,
          fileName: vid.fileName,
          timestamp: vid.timestamp || Date.now()
        });
      } else if (media.textList?.[0]) {
        const txt = media.textList[0];
        combinedMediaList.push({
          id: `media-${Date.now()}-${index}-${Math.random()}`,
          type: 'text',
          content: txt,
          fileName: `text-${index + 1}.txt`,
          timestamp: Date.now()
        });
      } else if (media.mediaList?.[0]) {
        combinedMediaList.push(media.mediaList[0]);
      }
    });

    mediaSets.push({
      mediaList: combinedMediaList,
      fileName: `frame-collection-${combinedMediaList.length}`,
      timestamp: Date.now()
    });

    return mediaSets;
  }

  // Process each input
  inputDataList.forEach((input, inputIndex) => {
    // Special case: Handle node-set inputs
    // Node-sets have a nodeList property containing media-set nodes
    if (input.nodeList && Array.isArray(input.nodeList)) {
      const outputMode = input.outputMode || 'loop';

      if (outputMode === 'direct') {
        // Direct mode: Flatten all mediaLists into a single combined MediaSet
        const allMediaItems: MediaItem[] = [];

        input.nodeList.forEach((node) => {
          if (node.data?.media?.mediaList && node.data.media.mediaList.length > 0) {
            allMediaItems.push(...node.data.media.mediaList);
          }
        });

        if (allMediaItems.length > 0) {
          mediaSets.push({
            mediaList: allMediaItems,
            fileName: `node-set-direct-${allMediaItems.length}`,
            timestamp: Date.now()
          });
        }
      } else {
        // Loop mode: Pass each media-set as a separate MediaSet (current behavior)
        input.nodeList.forEach((node) => {
          if (node.data?.media?.mediaList && node.data.media.mediaList.length > 0) {
            mediaSets.push({
              mediaList: node.data.media.mediaList,
              fileName: node.data.fileName || `media-set-${node.id}`,
              timestamp: node.data.timestamp || Date.now()
            });
          }
        });
      }

      return; // Skip normal processing for node-set
    }

    const media = input.media || {};
    const setOutputMode = input.setOutputMode;

    // Check if this input has any media
    const hasMedia =
      (media.imageList?.length || 0) > 0 ||
      (media.videoList?.length || 0) > 0 ||
      (media.textList?.length || 0) > 0 ||
      (media.mediaList?.length || 0) > 0 ||
      input.imageUrl ||
      input.videoUrl ||
      input.textContent;

    if (!hasMedia) return;

    // If this is a set node with integrated mode, combine all media into one MediaSet
    if (setOutputMode === 'integrated') {
      const integratedMediaList: MediaItem[] = [];

      // Add from unified mediaList if exists
      if (media.mediaList) {
        integratedMediaList.push(...media.mediaList);
      }

      // Add from individual lists
      media.imageList?.forEach((img, idx) => {
        integratedMediaList.push({
          id: `media-${Date.now()}-${inputIndex}-img-${idx}-${Math.random()}`,
          type: 'image',
          url: img.url,
          fileName: img.fileName,
          timestamp: img.timestamp || Date.now()
        });
      });

      media.videoList?.forEach((vid, idx) => {
        integratedMediaList.push({
          id: `media-${Date.now()}-${inputIndex}-vid-${idx}-${Math.random()}`,
          type: 'video',
          url: vid.url,
          fileName: vid.fileName,
          timestamp: vid.timestamp || Date.now()
        });
      });

      media.textList?.forEach((txt, idx) => {
        integratedMediaList.push({
          id: `media-${Date.now()}-${inputIndex}-txt-${idx}-${Math.random()}`,
          type: 'text',
          content: txt,
          fileName: `text-${idx + 1}.txt`,
          timestamp: Date.now()
        });
      });

      // Add from legacy single-item properties
      if (input.imageUrl && !media.imageList) {
        integratedMediaList.push({
          id: `media-${Date.now()}-${inputIndex}-img-${Math.random()}`,
          type: 'image',
          url: input.imageUrl,
          fileName: input.fileName || 'image.png',
          timestamp: input.timestamp || Date.now()
        });
      }

      if (input.videoUrl && !media.videoList) {
        integratedMediaList.push({
          id: `media-${Date.now()}-${inputIndex}-vid-${Math.random()}`,
          type: 'video',
          url: input.videoUrl,
          fileName: input.fileName || 'video.mp4',
          timestamp: input.timestamp || Date.now()
        });
      }

      if (input.textContent && !media.textList) {
        integratedMediaList.push({
          id: `media-${Date.now()}-${inputIndex}-txt-${Math.random()}`,
          type: 'text',
          content: input.textContent,
          fileName: input.fileName || 'text.txt',
          timestamp: input.timestamp || Date.now()
        });
      }

      if (integratedMediaList.length > 0) {
        mediaSets.push({
          mediaList: integratedMediaList,
          fileName: input.fileName || `integrated-set-${integratedMediaList.length}`,
          timestamp: input.timestamp || Date.now()
        });
      }
      return; // Done processing this integrated input
    }

    // For individual mode (or frames without setOutputMode), each media item becomes its own MediaSet
    // This handles:
    // - Set nodes with individual mode (setOutputMode === 'individual')
    // - Individual frames (no setOutputMode)
    {
      // Process unified mediaList if exists
      if (media.mediaList) {
        media.mediaList.forEach((item, idx) => {
          mediaSets.push({
            mediaList: [item],
            fileName: item.fileName,
            timestamp: item.timestamp
          });
        });
      }

      // Process individual lists
      media.imageList?.forEach((img, idx) => {
        mediaSets.push({
          mediaList: [{
            id: `media-${Date.now()}-${inputIndex}-img-${idx}-${Math.random()}`,
            type: 'image',
            url: img.url,
            fileName: img.fileName,
            timestamp: img.timestamp || Date.now()
          }],
          fileName: img.fileName,
          timestamp: img.timestamp || Date.now()
        });
      });

      media.videoList?.forEach((vid, idx) => {
        mediaSets.push({
          mediaList: [{
            id: `media-${Date.now()}-${inputIndex}-vid-${idx}-${Math.random()}`,
            type: 'video',
            url: vid.url,
            fileName: vid.fileName,
            timestamp: vid.timestamp || Date.now()
          }],
          fileName: vid.fileName,
          timestamp: vid.timestamp || Date.now()
        });
      });

      media.textList?.forEach((txt, idx) => {
        mediaSets.push({
          mediaList: [{
            id: `media-${Date.now()}-${inputIndex}-txt-${idx}-${Math.random()}`,
            type: 'text',
            content: txt,
            fileName: `text-${idx + 1}.txt`,
            timestamp: Date.now()
          }],
          fileName: `text-${idx + 1}.txt`,
          timestamp: Date.now()
        });
      });

      // Handle legacy single-item properties
      if (input.imageUrl && !media.imageList && !media.mediaList) {
        mediaSets.push({
          mediaList: [{
            id: `media-${Date.now()}-${inputIndex}-img-${Math.random()}`,
            type: 'image',
            url: input.imageUrl,
            fileName: input.fileName || 'image.png',
            timestamp: input.timestamp || Date.now()
          }],
          fileName: input.fileName || 'image.png',
          timestamp: input.timestamp || Date.now()
        });
      }

      if (input.videoUrl && !media.videoList && !media.mediaList) {
        mediaSets.push({
          mediaList: [{
            id: `media-${Date.now()}-${inputIndex}-vid-${Math.random()}`,
            type: 'video',
            url: input.videoUrl,
            fileName: input.fileName || 'video.mp4',
            timestamp: input.timestamp || Date.now()
          }],
          fileName: input.fileName || 'video.mp4',
          timestamp: input.timestamp || Date.now()
        });
      }

      if (input.textContent && !media.textList && !media.mediaList) {
        mediaSets.push({
          mediaList: [{
            id: `media-${Date.now()}-${inputIndex}-txt-${Math.random()}`,
            type: 'text',
            content: input.textContent,
            fileName: input.fileName || 'text.txt',
            timestamp: input.timestamp || Date.now()
          }],
          fileName: input.fileName || 'text.txt',
          timestamp: input.timestamp || Date.now()
        });
      }
    }
  });

  return mediaSets;
}

/**
 * Gets the execution count for an action node.
 * This represents how many times the action will be executed (the length of the MediaSet array).
 *
 * @param inputDataList - Array of input data from connected nodes
 * @returns The number of times the action will execute
 */
export function getExecutionCount(inputDataList: InputData[]): number {
  const mediaSets = normalizeInputsToMediaSets(inputDataList);
  return mediaSets.length;
}
