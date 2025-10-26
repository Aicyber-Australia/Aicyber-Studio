export type RunnerValidation = { isValid: boolean; error?: string };

export type ProgressiveExecutionCallback = (
  mediaSetIndex: number,
  mediaSet: any,
  continueDownstream: () => Promise<void>
) => Promise<void>;

export interface NodeRunner<NodeType = any> {
  nodeType: string;
  canRun: (node: NodeType) => boolean;
  validate: (node: NodeType, inputDataList: any[], setNodes?: any) => RunnerValidation;
  run: (node: NodeType, inputDataList: any[], updateNodeData?: (data: any) => void, progressiveCallback?: ProgressiveExecutionCallback) => Promise<any>;
  iterator?: (node: NodeType, inputDataList: any[], loopNode: NodeType) => Promise<any>;
}


