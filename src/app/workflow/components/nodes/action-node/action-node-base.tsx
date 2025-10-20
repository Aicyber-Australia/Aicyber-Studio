"use client";

import React, { useCallback, useState } from 'react';
import { Play, Trash, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useReactFlow } from '@xyflow/react';
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeContent,
} from '@/components/base-node';
import { NodeStatusIndicator } from '@/components/node-status-indicator';
import { NODE_SIZE, ACTION_NODE_SIZE } from '@/app/workflow/config';

// Available models for selection
const MODELS = [
  { value: 'n8n', label: 'Default Model' }
];

interface ActionNodeBaseProps {
  id: string;
  data: WorkflowNodeData;
  onRefresh?: () => void;
  children?: React.ReactNode;
}

function ActionNodeBase({ id, data, onRefresh, children }: ActionNodeBaseProps) {
  const { runWorkflow } = useWorkflowRunner();
  const removeNode = useAppStore((s) => s.removeNode);
  const { setNodes } = useReactFlow();
  
  const [selectedModel, setSelectedModel] = useState<string>(data?.selectedModel || 'default');
  const [prompt, setPrompt] = useState<string>(data?.prompt || '');

  const onPlay = useCallback(() => runWorkflow(id), [id, runWorkflow]);
  const onRemove = useCallback(() => removeNode(id), [id, removeNode]);
  const updateNodeData = useCallback((newData: Partial<WorkflowNodeData>) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  }, [id, setNodes]);

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
      <BaseNode style={{ ...ACTION_NODE_SIZE }}>
        <BaseNodeHeader>
          <BaseNodeHeaderTitle>{data?.title || 'Action Node'}</BaseNodeHeaderTitle>
          <div className="flex items-center gap-1">
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
        
        <BaseNodeContent className="space-y-4">
          {/* Model Selection - Small expandable box */}
          <div className="flex justify-start">
            <Select value={selectedModel} onValueChange={handleModelChange}>
              <SelectTrigger className="w-2/3 h-9">
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
          <div className="space-y-2 -mt-4">
            <textarea
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="Enter your text here..."
              className="w-full min-h-[100px] p-3 border border-input rounded-md bg-transparent text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none resize-none"
            />
          </div>
        </BaseNodeContent>
        {children}
      </BaseNode>
    </NodeStatusIndicator>
  );
}

export default ActionNodeBase;
