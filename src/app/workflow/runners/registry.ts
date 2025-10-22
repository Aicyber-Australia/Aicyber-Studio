import { NodeRunner } from './types';
import { DefaultNodeRunner } from './default-runner';
import { ImageFrameNodeRunner } from './image-frame-runner';
import { ImageSetNodeRunner } from './image-set-runner';
import { NodeSetNodeRunner } from './node-set-runner';
import { ActionNodeRunner } from './action-node-runner';

export class NodeRunnerRegistry {
  private runners: Map<string, NodeRunner> = new Map();

  register(runner: NodeRunner) {
    this.runners.set(runner.nodeType, runner);
  }

  getRunner(nodeType: string): NodeRunner {
    // 返回精确匹配，否则返回默认 Runner
    return this.runners.get(nodeType) || DefaultNodeRunner;
  }

  clear() {
    this.runners.clear();
  }
}

export const nodeRunnerRegistry = new NodeRunnerRegistry();

// 预注册默认 Runner
nodeRunnerRegistry.register(DefaultNodeRunner);

// 注册 Image Frame 节点 Runner
nodeRunnerRegistry.register(ImageFrameNodeRunner);

// 注册 Image Set 节点 Runner
nodeRunnerRegistry.register(ImageSetNodeRunner);

// 注册 Node Set 节点 Runner
nodeRunnerRegistry.register(NodeSetNodeRunner);

// 注册统一的 Action Node Runner
nodeRunnerRegistry.register(ActionNodeRunner);


