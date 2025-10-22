import { imageServiceMap } from './image-service';
import { videoServiceMap } from './video-service';
import { ApiCallFunction } from './types';

// API调用函数注册表 - 存储实际的调用函数
export const apiCallFunctionRegistry: Record<string, ApiCallFunction> = {};

// 注册所有服务 - 自动注册，无需手动添加
export function registerAllServices() {
  // 自动注册图片服务
  Object.assign(apiCallFunctionRegistry, imageServiceMap);

  // 自动注册视频服务
  Object.assign(apiCallFunctionRegistry, videoServiceMap);

  console.log('🔧 All services registered:', Object.keys(apiCallFunctionRegistry));
  console.log('🔧 Image services:', Object.keys(imageServiceMap));
  console.log('🔧 Video services:', Object.keys(videoServiceMap));
}

// 根据节点类型获取对应的API调用函数
export function getApiCallFunction(nodeType: string) {
  const callFunction = apiCallFunctionRegistry[nodeType];
  
  if (!callFunction) {
    throw new Error(`No API call function registered for node type: ${nodeType}`);
  }
  
  return callFunction;
}

// 检查节点类型是否已注册
export function isNodeTypeRegistered(nodeType: string): boolean {
  return nodeType in apiCallFunctionRegistry;
}

// 获取所有已注册的节点类型
export function getRegisteredNodeTypes(): string[] {
  return Object.keys(apiCallFunctionRegistry);
}
