/**
 * Media Extraction Utilities
 *
 * Provides utilities to extract media data from action nodes and convert
 * them into the standard media-set format.
 */

import { WorkflowNodeData } from '../components/nodes';

export type ExtractedMediaData = {
  mediaList: Array<{
    id: string;
    type: 'image' | 'text' | 'video';
    url?: string;
    content?: string;
    fileName: string;
    timestamp: number;
  }>;
};

/**
 * Extracts media data from an action node and converts it to media-set format.
 *
 * @param nodeData - The action node data containing apiResponses and media
 * @returns ExtractedMediaData in standard media-set format, or null if no media available
 */
export function extractMediaFromActionNode(nodeData: WorkflowNodeData): ExtractedMediaData | null {
  // Check if node has completed execution
  if (nodeData.status !== 'success') {
    return null;
  }

  // Extract from media.mediaList if available
  if (nodeData.media?.mediaList && nodeData.media.mediaList.length > 0) {
    return {
      mediaList: nodeData.media.mediaList.map(item => ({
        id: item.id || `media-${Date.now()}-${Math.random()}`,
        type: item.type,
        url: item.url,
        content: item.content,
        fileName: item.fileName,
        timestamp: item.timestamp || Date.now()
      }))
    };
  }

  // Extract from individual lists (imageList, videoList, textList) if mediaList not available
  const extractedMediaList: Array<{
    id: string;
    type: 'image' | 'text' | 'video';
    url?: string;
    content?: string;
    fileName: string;
    timestamp: number;
  }> = [];

  // Extract images
  if (nodeData.media?.imageList && nodeData.media.imageList.length > 0) {
    nodeData.media.imageList.forEach((img, idx) => {
      extractedMediaList.push({
        id: `media-${Date.now()}-img-${idx}-${Math.random()}`,
        type: 'image',
        url: img.url,
        fileName: img.fileName,
        timestamp: img.timestamp || Date.now()
      });
    });
  }

  // Extract videos
  if (nodeData.media?.videoList && nodeData.media.videoList.length > 0) {
    nodeData.media.videoList.forEach((vid, idx) => {
      extractedMediaList.push({
        id: `media-${Date.now()}-vid-${idx}-${Math.random()}`,
        type: 'video',
        url: vid.url,
        fileName: vid.fileName,
        timestamp: vid.timestamp || Date.now()
      });
    });
  }

  // Extract text
  if (nodeData.media?.textList && nodeData.media.textList.length > 0) {
    nodeData.media.textList.forEach((text, idx) => {
      extractedMediaList.push({
        id: `media-${Date.now()}-txt-${idx}-${Math.random()}`,
        type: 'text',
        content: text,
        fileName: `text-${idx + 1}.txt`,
        timestamp: Date.now()
      });
    });
  }

  // If we extracted any media, return it
  if (extractedMediaList.length > 0) {
    return {
      mediaList: extractedMediaList
    };
  }

  // No media found
  return null;
}

/**
 * Checks if an action node has media data that can be extracted.
 *
 * @param nodeData - The action node data
 * @returns true if the node has extractable media data
 */
export function canExtractMedia(nodeData: WorkflowNodeData): boolean {
  // Must be completed
  if (nodeData.status !== 'success') {
    return false;
  }

  // Check if any media exists
  const hasMediaList = !!(nodeData.media?.mediaList && nodeData.media.mediaList.length > 0);
  const hasImageList = !!(nodeData.media?.imageList && nodeData.media.imageList.length > 0);
  const hasVideoList = !!(nodeData.media?.videoList && nodeData.media.videoList.length > 0);
  const hasTextList = !!(nodeData.media?.textList && nodeData.media.textList.length > 0);

  return hasMediaList || hasImageList || hasVideoList || hasTextList;
}
