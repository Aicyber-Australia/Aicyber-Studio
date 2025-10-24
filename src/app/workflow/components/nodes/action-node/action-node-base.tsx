"use client";

import React, { useCallback, useState, useMemo } from 'react';
import { Play, Trash, RotateCcw, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { WorkflowNodeData, ApiExecutionError } from '@/app/workflow/components/nodes';
import { useWorkflowRunner } from '@/app/workflow/hooks/use-workflow-runner';
import { useAppStore } from '@/app/workflow/store';
import { useReactFlow, NodeResizer, getIncomers, useStore } from '@xyflow/react';
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeContent,
} from '@/components/base-node';
import { NodeStatusIndicator } from '@/components/node-status-indicator';
import { ACTION_NODE_SIZE } from '@/app/workflow/config';
import { getExecutionCount } from '@/app/workflow/runners/media-set-utils';

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
  const [showResponses, setShowResponses] = useState(false);

  // Subscribe to ReactFlow store for real-time updates
  // This will re-render when nodes or edges change
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);

  // Calculate execution count based on incoming connections
  // This will automatically update when nodes or edges change
  const executionCount = useMemo(() => {
    const currentNode = nodes.find((n) => n.id === id);

    if (!currentNode) return 0;

    // Get all incoming nodes
    const incomingNodes = getIncomers(currentNode, nodes, edges);

    // Extract data from incoming nodes
    const inputDataList = incomingNodes.map((node) => node.data);

    // Calculate execution count using utility function
    return getExecutionCount(inputDataList);
  }, [id, nodes, edges]);

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
    setShowResponses(false);
    updateNodeData({
      selectedModel: 'default',
      prompt: '',
      fileName: undefined,
      timestamp: undefined,
      status: 'initial',
      media: undefined,
      apiResponses: undefined,
      executionMetadata: undefined
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

  // Helper to check if a response is an error
  const isError = (response: any): response is ApiExecutionError => {
    return 'error' in response;
  };

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
            {executionCount > 0 && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                ({executionCount}x)
              </span>
            )}
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

          {/* Execution Results Section */}
          {data?.executionMetadata && (
            <div className="flex-shrink-0 nodrag border-t pt-3 space-y-2">
              {/* Execution Summary Bar */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-600 font-medium">{data.executionMetadata.successCount}</span>
                  </div>
                  {data.executionMetadata.errorCount > 0 && (
                    <div className="flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-red-600 font-medium">{data.executionMetadata.errorCount}</span>
                    </div>
                  )}
                  <span className="text-muted-foreground">
                    / {data.executionMetadata.totalExecutions} total
                  </span>
                </div>
                {data.apiResponses && data.apiResponses.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowResponses(!showResponses)}
                  >
                    {showResponses ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Details
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Response Details (Collapsible) */}
              {showResponses && data.apiResponses && data.apiResponses.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1.5 text-xs border rounded-md p-2 bg-muted/30">
                  {data.apiResponses.map((response, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 p-1.5 rounded ${
                        isError(response) ? 'bg-red-50 dark:bg-red-950/20' : 'bg-green-50 dark:bg-green-950/20'
                      }`}
                    >
                      {isError(response) ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-red-700 dark:text-red-300 font-medium">Error {idx + 1}</div>
                            <div className="text-red-600 dark:text-red-400 truncate">{response.error}</div>
                            {response.errorCode && (
                              <div className="text-red-500 dark:text-red-500 text-[10px]">Code: {response.errorCode}</div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-green-700 dark:text-green-300 font-medium">
                              {response.type.charAt(0).toUpperCase() + response.type.slice(1)} {idx + 1}
                            </div>
                            {response.url && (
                              <div className="text-green-600 dark:text-green-400 truncate text-[10px]">
                                {response.url}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </BaseNodeContent>
        {children}
      </BaseNode>
    </NodeStatusIndicator>
  );
}

export default ActionNodeBase;
