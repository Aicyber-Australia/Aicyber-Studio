import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { layoutGraph } from '@/app/workflow/utils/layout-helper';
import { useAppStore } from '@/app/workflow/store';
import { AppStore } from '@/app/workflow/store/app-store';
import { createNodeByType } from '@/app/workflow/components/nodes';

const selector = (state: AppStore) => ({
  getNodes: state.getNodes,
  setNodes: state.setNodes,
  getEdges: state.getEdges,
  addNode: state.addNode,
  addEdge: state.addEdge,
});

export function useLayout() {
  const { getNodes, getEdges, setNodes, addNode, addEdge } = useAppStore(useShallow(selector));

  return useCallback(async (fitViewCallback?: () => void) => {
    const nodes = getNodes();
    const edges = getEdges();
    
    console.log('🔄 Layout - Starting layout process');
    console.log('🔄 Layout - Total nodes:', nodes.length);
    console.log('🔄 Layout - Total edges:', edges.length);
    
    // 检查model节点后面是否有nodeset
    const modelNodes = nodes.filter(node => 
      node.type === 'text-to-image-node' || 
      node.type === 'image-to-image-node'
    );
    
    console.log('🔄 Layout - Found model nodes:', modelNodes.length);
    
    for (const modelNode of modelNodes) {
      // 查找从model节点出发的边
      const outgoingEdges = edges.filter(edge => edge.source === modelNode.id);
      
      console.log(`🔄 Layout - Model node ${modelNode.id} has ${outgoingEdges.length} outgoing edges`);
      
      // 只有当model节点没有连接到任何下游节点时才插入nodeset
      if (outgoingEdges.length === 0) {
        console.log(`🔄 Layout - Inserting nodeset for model node ${modelNode.id}`);
        
        // 计算新nodeset的位置（在model节点右侧）
        const newNodePosition = {
          x: modelNode.position.x + 300,
          y: modelNode.position.y
        };
        
        // 创建collector模式的nodeset
        const newNodeSet = createNodeByType({
          type: 'node-set',
          position: newNodePosition,
          data: {
            title: 'Node Set',
            status: 'initial',
            icon: 'Layers',
            inputMode: 'append',
            collectorMode: 'collector',
            outputMode: 'direct',
            nodeList: []
          }
        });
        
        if (newNodeSet) {
          console.log(`🔄 Layout - Created nodeset ${newNodeSet.id}`);
          addNode(newNodeSet);
          
          // 自动连接model节点到新插入的nodeset
          const newEdge = {
            id: `${modelNode.id}-to-${newNodeSet.id}`,
            source: modelNode.id,
            target: newNodeSet.id,
            type: 'default' as const
          };
          
          console.log(`🔄 Layout - Creating edge from ${modelNode.id} to ${newNodeSet.id}`);
          addEdge(newEdge);
          
          // 重新获取更新后的节点和边
          const updatedNodes = getNodes();
          const updatedEdges = getEdges();
          
          // 执行布局
          const layoutedNodes = await layoutGraph(updatedNodes, updatedEdges);
          setNodes(layoutedNodes);
          console.log('🔄 Layout - Layout completed with nodeset insertion and connection');
          
          // 触发fitView缩放
          if (fitViewCallback) {
            setTimeout(() => {
              fitViewCallback();
              console.log('🔄 Layout - FitView triggered');
            }, 100);
          }
          return;
        }
      } else {
        console.log(`🔄 Layout - Model node ${modelNode.id} already has connections, skipping`);
      }
    }
    
    // 如果没有需要插入的nodeset，正常执行布局
    console.log('🔄 Layout - No nodeset insertion needed, running normal layout');
    const layoutedNodes = await layoutGraph(nodes, edges);
    setNodes(layoutedNodes);
    console.log('🔄 Layout - Normal layout completed');
    
    // 触发fitView缩放
    if (fitViewCallback) {
      setTimeout(() => {
        fitViewCallback();
        console.log('🔄 Layout - FitView triggered');
      }, 100);
    }
  }, [getEdges, getNodes, setNodes, addNode, addEdge]);
}
