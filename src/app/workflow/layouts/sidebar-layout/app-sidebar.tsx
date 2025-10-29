'use client';

import { useState, useCallback, ComponentProps, useRef, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenu,
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { Moon, Sun, Sunset, Loader2 } from 'lucide-react';
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
import { SidebarActionButtons } from '@/app/workflow/components/sidebar-action-buttons';

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

function SettingsItem({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-row items-center justify-between rounded-lg border p-4 mb-2">
      <div className="space-y-0.5">
        <span className="text-base font-bold">{title}</span>
        <p>{description}.</p>
      </div>
      {children}
    </div>
  );
}

function ControlledSettingsDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const { isFixedLayout, toggleLayout } = useAppStore(useShallow((state: AppStore) => ({
    isFixedLayout: state.layout === 'fixed',
    toggleLayout: state.toggleLayout,
  })));

  // 用于控制滑块动画的本地状态
  const [sliderTheme, setSliderTheme] = useState(theme);
  const [isThemeChanging, setIsThemeChanging] = useState(false);

  // 同步sliderTheme和theme
  useEffect(() => {
    setSliderTheme(theme);
    setIsThemeChanging(false);
  }, [theme]);

  // 延迟执行主题切换，让动画先完成
  const handleThemeChange = (newTheme: string) => {
    if (theme === newTheme || isThemeChanging) return;
    
    // 立即更新滑块位置，触发动画
    setSliderTheme(newTheme);
    
    // 延迟300ms执行主题切换，让滑块动画先完成
    setTimeout(() => {
      setIsThemeChanging(true);
      setTheme(newTheme);
      
      // 主题切换完成后，延迟一点时间再隐藏加载效果
      setTimeout(() => {
        setIsThemeChanging(false);
      }, 500);
    }, 300);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
        return <Sunset className="h-4 w-4" />;
      default:
        return <Sunset className="h-4 w-4" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'System';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="mb-2">Settings</DialogTitle>
        </DialogHeader>

        <SettingsItem
          title="Color mode"
          description="Toggle between dark, light or system color mode."
        >
          <div className="flex items-center gap-2">
            <div className="relative flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1.5">
              {/* 滑动背景 */}
              <div
                className="absolute top-1.5 bottom-1.5 bg-white dark:bg-gray-700 rounded-md shadow-sm transition-all duration-300 ease-in-out"
                style={{
                  width: 'calc(33.333% - 4px)',
                  left: sliderTheme === 'light' 
                    ? '6px' 
                    : sliderTheme === 'dark' 
                    ? 'calc(33.333% + 2px)' 
                    : 'calc(66.666% - 2px)',
                }}
              />
              
              <button
                onClick={() => handleThemeChange('light')}
                className={`relative z-10 flex items-center justify-center flex-1 h-10 px-4 rounded-md transition-all duration-200 ${
                  theme === 'light' 
                    ? 'text-gray-900 dark:text-gray-100' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
                title="Light"
              >
                <Sun className="h-6 w-6" strokeWidth={2} />
              </button>
              
              <button
                onClick={() => handleThemeChange('dark')}
                className={`relative z-10 flex items-center justify-center flex-1 h-10 px-4 rounded-md transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'text-gray-900 dark:text-gray-100' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
                title="Dark"
              >
                <Moon className="h-6 w-6" strokeWidth={2} />
              </button>
              
              <button
                onClick={() => handleThemeChange('system')}
                className={`relative z-10 flex items-center justify-center flex-1 h-10 px-4 rounded-md transition-all duration-200 ${
                  theme === 'system' 
                    ? 'text-gray-900 dark:text-gray-100' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
                title="System"
              >
                <Sunset className="h-6 w-6" strokeWidth={2} />
              </button>
            </div>
          </div>
        </SettingsItem>

        <SettingsItem
          title="Fixed Layout"
          description="Toggle between fixed and free layout"
        >
          <Switch checked={isFixedLayout} onCheckedChange={toggleLayout} />
        </SettingsItem>
      </DialogContent>
      
      {/* 全屏加载效果 */}
      {isThemeChanging && (
        <div className="fixed inset-0 z-[9999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">Switching theme...</span>
          </div>
        </div>
      )}
    </Dialog>
  );
}

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const [activeTab, setActiveTab] = useState<TabType>('nodes');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs font-semibold text-gray-600 px-3 py-1 bg-gray-50 rounded-full">
                Template
              </span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Sidebar className="border-r-0" {...props}>
      {/* 第一部分：Logo */}
      <SidebarHeader className="py-0">
        <div className="flex gap-2 px-1 h-14 items-center">
          <div className="flex aspect-square size-5 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Command className="size-3" />
          </div>
          <span className="truncate font-semibold">AiCyber Studio</span>
        </div>
      </SidebarHeader>

      {/* 第二部分：Tab和内容主体 */}
      <SidebarContent className="flex flex-col">
        <SidebarGroup className="flex-shrink-0">
          <SidebarGroupContent>
            {/* 上分割线 */}
            <div className="border-b border-gray-200 mx-3 mb-3" />
            
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
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 可滚动的Tab内容区域 */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          {renderTabContent()}
        </div>

        {/* 第三部分：底部按钮 */}
        <SidebarGroup className="flex-shrink-0">
          <SidebarGroupContent>
            {/* 分割线 */}
            <div className="border-b border-gray-200 mx-3 mb-2" />
            
            <SidebarActionButtons
              onSettingsClick={() => setIsSettingsOpen(true)}
              onCloudUploadClick={() => console.log('Cloud upload clicked')}
              onUserClick={() => console.log('User clicked')}
              onLogoutClick={() => console.log('Logout clicked')}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarRail />
      
      {/* Settings Dialog */}
      <ControlledSettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
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
    <div className="flex flex-col gap-0.5">
      <SidebarMenuItem
        className={cn(
          'relative border-2 active:scale-[.99] rounded-xl',
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
            'flex items-center justify-center',
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
        </SidebarMenuButton>
      </SidebarMenuItem>
      <span className="text-xs font-medium text-gray-700 text-center leading-tight px-1">
        {props.title}
      </span>
    </div>
  );
}
