// Media types
export interface MediaItem {
  url: string;
  data?: string;
  fileName: string;
}

export interface MediaData {
  imageList?: MediaItem[];
  videoList?: MediaItem[];
}

// Node data structure
export interface NodeData {
  prompt?: string;
  selectedModel?: string;
  media?: MediaData;
  [key: string]: unknown;
}

// Node structure
export interface ServiceNode {
  id: string;
  type: string;
  data: NodeData;
  [key: string]: unknown;
}

// Input data structure
export interface InputData {
  media?: MediaData;
  [key: string]: unknown;
}

// API call function type
export type ApiCallFunction = (
  node: ServiceNode,
  inputDataList: InputData[]
) => Promise<unknown>;
