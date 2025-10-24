export type RunnerValidation = { isValid: boolean; error?: string };

export interface NodeRunner<NodeType = any> {
  nodeType: string;
  canRun: (node: NodeType) => boolean;
  validate: (node: NodeType, inputDataList: any[], setNodes?: any) => RunnerValidation;
  run: (node: NodeType, inputDataList: any[], updateNodeData?: (data: any) => void) => Promise<any>;
  iterator?: (node: NodeType, inputDataList: any[], loopNode: NodeType) => Promise<any>;
}


