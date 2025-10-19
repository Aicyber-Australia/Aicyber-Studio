import { NodeRunner } from './types';

export const DefaultNodeRunner: NodeRunner = {
  nodeType: '*',
  canRun: () => true,
  validate: () => {
    return { isValid: true };
  },
  run: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {};
  },
};


