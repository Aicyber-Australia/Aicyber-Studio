"use client";

import React, { useCallback, useState } from 'react';
import { Play, Trash, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { WorkflowNodeData } from '@/app/workflow/components/nodes';
import { useWorkflowRunner } from '@/app/workflow/hooks/use-workflow-runner';
import { useAppStore } from '@/app/workflow/store';
import { useReactFlow, NodeResizer } from '@xyflow/react';
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeContent,
} from '@/components/base-node';
import { NodeStatusIndicator } from '@/components/node-status-indicator';
import { ACTION_NODE_SIZE } from '@/app/workflow/config';

// Available models for selection
const MODELS = [
  { value: 'n8n', label: 'Default Model' }
];

interface ActionNodeBaseProps {
  id: string;
  data: WorkflowNodeData;
  onRefresh?: () => void;
  children?: React.ReactNode;
  selected?: boolean;
}

function ActionNodeBase({ id, data, onRefresh, children, selected }: ActionNodeBaseProps) {
  const { runWorkflow } = useWorkflowRunner();
  const removeNode = useAppStore((s) => s.removeNode);
  const { setNodes } = useReactFlow();

  const [selectedModel, setSelectedModel] = useState<string>(data?.selectedModel || 'default');
  const [prompt, setPrompt] = useState<string>(data?.prompt || '');
  const [isTitleEditing, setIsTitleEditing] = useState(false);

  const onPlay = useCallback(() => runWorkflow(id), [id, runWorkflow]);
  const onRemove = useCallback(() => removeNode(id), [id, removeNode]);
  const updateNodeData = useCallback((newData: Partial<WorkflowNodeData>) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  }, [id, setNodes]);

  const handleTitleChange = useCallback((newTitle: string) => {
    updateNodeData({ title: newTitle });
  }, [updateNodeData]);

  const onReset = useCallback(() => {
    setSelectedModel('default');
    setPrompt('');
    updateNodeData({ 
      selectedModel: 'default', 
      prompt: '',
      fileName: undefined,
      timestamp: undefined,
      status: 'initial',
      media: undefined
    });
  }, [updateNodeData]);

  const handleModelChange = useCallback((value: string) => {
    setSelectedModel(value);
    updateNodeData({ selectedModel: value });
  }, [updateNodeData]);

  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value);
    updateNodeData({ prompt: value });
  }, [updateNodeData]);

  return (
    <NodeStatusIndicator status={data?.status}>
      <NodeResizer
        color="#3b82f6"
        isVisible={selected}
        minWidth={ACTION_NODE_SIZE.width}
        minHeight={ACTION_NODE_SIZE.height}
      />
      <BaseNode style={{ width: '100%', height: '100%' }}>
        <BaseNodeHeader>
          <BaseNodeHeaderTitle
            editable
            onTitleChange={handleTitleChange}
            onEditingChange={setIsTitleEditing}
          >
            {data?.title || 'Action Node'}
          </BaseNodeHeaderTitle>
          <div className="flex items-center gap-1" style={{ visibility: isTitleEditing ? 'hidden' : 'visible' }}>
            {onRefresh && (
              <Button
                variant="ghost"
                className="nodrag px-1!"
                onClick={onRefresh}
                title="刷新"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              className="nodrag px-1!"
              onClick={onReset}
              title="重置节点"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" className="nodrag px-1!" onClick={onPlay}>
              <Play className="stroke-blue-500 fill-blue-500" />
            </Button>
            <Button variant="ghost" className="nodrag px-1!" onClick={onRemove}>
              <Trash />
            </Button>
          </div>
        </BaseNodeHeader>
        
        <BaseNodeContent className="flex-1 flex flex-col space-y-4">
          {/* Model Selection - Small expandable box */}
          <div className="flex justify-start flex-shrink-0 nodrag">
            <Select value={selectedModel} onValueChange={handleModelChange}>
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="Select model:" />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Large Text Input Area */}
          <div className="flex-1 flex flex-col -mt-4 min-h-0 nodrag">
            <textarea
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="Enter your prompt here..."
              className="w-full h-full p-3 border border-input rounded-md bg-transparent text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none resize-none"
            />
          </div>
        </BaseNodeContent>
        {children}
      </BaseNode>
    </NodeStatusIndicator>
  );
}

export default ActionNodeBase;
