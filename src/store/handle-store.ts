import { create } from 'zustand';

interface HandleStore {
  handleData: Record<string, any>; // key: `${nodeId}-${handleId}`, value: data
  setHandleData: (nodeId: string, handleId: string, data: any) => void;
  getHandleData: (nodeId: string, handleId: string) => any;
  passDataToTarget: (sourceNodeId: string, targetNodeId: string, data: any) => void;
}

export const useHandleStore = create<HandleStore>((set, get) => ({
  handleData: {},
  
  setHandleData: (nodeId: string, handleId: string, data: any) => {
    const key = `${nodeId}-${handleId}`;
    console.log(`Setting handle data for ${key}:`, data);
    set((state) => ({
      handleData: { ...state.handleData, [key]: data }
    }));
  },
  
  getHandleData: (nodeId: string, handleId: string) => {
    const key = `${nodeId}-${handleId}`;
    return get().handleData[key];
  },
  
  passDataToTarget: (sourceNodeId: string, targetNodeId: string, data: any) => {
    console.log(`Passing data from ${sourceNodeId} to ${targetNodeId}:`, data);
    // 直接设置目标节点的数据
    get().setHandleData(targetNodeId, 'default', data);
  },
}));
