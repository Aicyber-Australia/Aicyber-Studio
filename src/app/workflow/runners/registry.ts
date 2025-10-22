import { NodeRunner } from './types';
import { DefaultNodeRunner } from './default-runner';
import { ImageFrameNodeRunner } from './image-frame-runner';
import { ImageSetNodeRunner } from './image-set-runner';
import { ActionNodeRunner } from './action-node-runner';

export class NodeRunnerRegistry {
  private runners: Map<string, NodeRunner> = new Map();

  register(runner: NodeRunner) {
    this.runners.set(runner.nodeType, runner);
  }

  getRunner(nodeType: string): NodeRunner {
    // 首先尝试精确匹配
    const exactMatch = this.runners.get(nodeType);
    if (exactMatch) {
      console.log(`Registry: Exact match for ${nodeType}`);
      return exactMatch;
    }

    // 如果没有精确匹配，检查是否有runner可以运行这个节点类型
    // 注意：跳过 DefaultNodeRunner，因为它总是返回 true
    for (const runner of this.runners.values()) {
      if (runner.nodeType === '*') {
        continue; // 跳过默认runner，最后再处理
      }
      if (runner.canRun && runner.canRun({ type: nodeType } as any)) {
        console.log(`Registry: Using ${runner.nodeType} runner for ${nodeType}`);
        return runner;
      }
    }

    // 最后返回默认 Runner
    console.log(`Registry: Using default runner for ${nodeType}`);
    return DefaultNodeRunner;
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

// 注册统一的 Action Node Runner
nodeRunnerRegistry.register(ActionNodeRunner);


