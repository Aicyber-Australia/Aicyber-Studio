'use client';

import { useState, useCallback, ComponentProps, useRef } from 'react';
import { Command, GripVertical, Plus } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useReactFlow } from '@xyflow/react';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { SettingsDialog } from '@/app/workflow/components/settings-dialog';
import {
  AppNode,
  createNodeByType,
  type NodeConfig,
} from '@/app/workflow/components/nodes';
import { cn } from '@/lib/utils';
import { iconMapping } from '@/app/workflow/utils/icon-mapping';
import { useAppStore } from '@/app/workflow/store';
import { type AppStore } from '@/app/workflow/store/app-store';
import { nodesConfig } from '../../config';

type TabType = 'nodes' | 'template';

// 定义节点分类
const nodeCategories = {
  frame: {
    title: 'Frame',
    nodes: ['image-frame', 'video-frame', 'text-frame']
  },
  set: {
    title: 'Set', 
    nodes: ['image-set', 'video-set', 'text-set', 'media-set', 'node-set']
  },
  model: {
    title: 'Model',
    nodes: ['text-to-image-node', 'image-to-image-node', 'image-to-text-node', 'edit-image-node']
  }
};

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const [activeTab, setActiveTab] = useState<TabType>('nodes');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'nodes':
        return (
          <div className="px-3 py-2 space-y-4">
            {Object.entries(nodeCategories).map(([categoryKey, category]) => (
              <div key={categoryKey}>
                {/* 分类标题 */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px bg-gray-200 flex-1" />
                  <span className="text-xs font-semibold text-gray-600 px-3 py-1 bg-gray-50 rounded-full">
                    {category.title}
                  </span>
                  <div className="h-px bg-gray-200 flex-1" />
                </div>
                
                {/* 分类下的节点 */}
                <SidebarMenu className="grid grid-cols-3 gap-2">
                  {category.nodes
                    .filter(nodeId => nodesConfig[nodeId as keyof typeof nodesConfig])
                    .map((nodeId) => (
                      <DraggableItem 
                        key={nodeId} 
                        {...nodesConfig[nodeId as keyof typeof nodesConfig]} 
                      />
                    ))
                  }
                </SidebarMenu>
              </div>
            ))}
          </div>
        );
      case 'template':
        return (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <span>Template Content</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <span>Template Item 1</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <span>Template Item 2</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        );
      default:
        return null;
    }
  };

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader className="py-0">
        <div className="flex gap-2 px-1 h-14 items-center">
          <div className="flex aspect-square size-5 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Command className="size-3" />
          </div>
          <span className="truncate font-semibold">AiCyber Studio</span>
        </div>
        
        {/* 上分割线 */}
        <div className="border-b border-gray-200 mx-3 mb-0.5" />
        
        {/* Tab布局 */}
        <div className="px-3">
          <div className="bg-white rounded-lg py-1 px-2">
            <div className="relative flex gap-1">
              {/* 滑动背景 */}
              <div
                className="absolute top-0 h-full bg-gray-100 rounded-md transition-all duration-300 ease-in-out"
                style={{
                  width: 'calc(50% - 2px)',
                  left: activeTab === 'nodes' ? '0px' : 'calc(50% + 2px)',
                }}
              />
              
              <button
                onClick={() => setActiveTab('nodes')}
                className={cn(
                  'relative z-10 px-4 py-2 text-sm rounded-md transition-all duration-200 flex-1',
                  activeTab === 'nodes'
                    ? 'text-gray-900 font-semibold'
                    : 'text-gray-500 font-medium hover:text-gray-700'
                )}
              >
                Nodes
              </button>
              <button
                onClick={() => setActiveTab('template')}
                className={cn(
                  'relative z-10 px-4 py-2 text-sm rounded-md transition-all duration-200 flex-1',
                  activeTab === 'template'
                    ? 'text-gray-900 font-semibold'
                    : 'text-gray-500 font-medium hover:text-gray-700'
                )}
              >
                Template
              </button>
            </div>
          </div>
        </div>
        {/* Tab内容 */}
        {renderTabContent()}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <SettingsDialog />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

const selector = (state: AppStore) => ({
  addNode: state.addNode,
  resetPotentialConnection: state.resetPotentialConnection,
});

function DraggableItem(props: NodeConfig) {
  const { screenToFlowPosition } = useReactFlow();
  const { addNode, resetPotentialConnection } =
    useAppStore(useShallow(selector));
  const [isDragging, setIsDragging] = useState(false);

  const onClick = useCallback(() => {
    const newNode: AppNode = createNodeByType({
      type: props.id,
      position: screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }),
    });

    addNode(newNode);
  }, [props, addNode, screenToFlowPosition]);

  const onDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('application/reactflow', JSON.stringify(props));
      setIsDragging(true);
    },
    [props],
  );

  // Removed onDrag logic to disable drag-to-connect functionality
  // Users can still drag nodes to canvas, but not connect directly to handles

  const onDragEnd = useCallback(() => {
    setIsDragging(false);
    resetPotentialConnection();
  }, [resetPotentialConnection]);

  const IconComponent = props?.icon ? iconMapping[props.icon] : undefined;

  return (
    <SidebarMenuItem
      className={cn(
        'relative border-2 active:scale-[.99] rounded-lg',
        isDragging ? 'border-green-500' : 'border-gray-100',
      )}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      draggable
      key={props.title}
    >
      {isDragging && (
        <span
          role="presentation"
          className="absolute -top-2 -right-2 rounded-full border-2 border-green-500 bg-white shadow-sm"
        >
          <Plus className="size-3" />
        </span>
      )}
      <SidebarMenuButton 
        className={cn(
          'bg-card cursor-grab active:cursor-grabbing aspect-square h-auto p-3',
          'flex flex-col items-center justify-center gap-2',
          'hover:bg-gray-50 hover:border-gray-200'
        )}
      >
        <div className="flex-shrink-0">
          {IconComponent ? (
            <IconComponent className="size-6 text-gray-600" aria-label={props?.icon} />
          ) : (
            <div className="size-6 rounded bg-gray-200" />
          )}
        </div>
        <span className="text-xs font-medium text-gray-700 text-center leading-tight">
          {props.title}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
