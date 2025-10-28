import { NodeRunner } from './types';

export const DefaultNodeRunner: NodeRunner = {
  nodeType: '*',
  canRun: () => true,
  validate: () => {
    return { isValid: true };
  },
  run: async (node: any, inputDataList: any[], updateNodeData?: (data: any) => void) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {};
  },
};


