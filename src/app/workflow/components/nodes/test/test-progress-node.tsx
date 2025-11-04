"use client";

import React, { useState, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '@/app/workflow/config';
import { NodeHandle } from '@/app/workflow/components/nodes/workflow-node/node-handle';
import WorkflowNode from '@/app/workflow/components/nodes/workflow-node';
import { Button } from '@/components/ui/button';
import { Play, Square, RotateCcw } from 'lucide-react';

function TestProgressNode({ id, data, selected }: WorkflowNodeProps) {
  const { setNodes } = useReactFlow();
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 5;

  const handleRefresh = useCallback(() => {
    setCurrentStep(0);
    setIsRunning(false);
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              status: 'initial',
              executionMetadata: undefined,
            }
          }
        : node
    ));
  }, [id, setNodes]);

  // 模拟运行过程
  const handleStart = useCallback(() => {
    if (isRunning) return;

    setIsRunning(true);
    setCurrentStep(0);

    // 设置 loading 状态
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              status: 'loading',
              executionMetadata: {
                totalExecutions: totalSteps,
                successCount: 0,
                errorCount: 0,
                lastExecutionTime: Date.now(),
              }
            }
          }
        : node
    ));

    // 模拟逐步执行
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCurrentStep(step);

      setNodes(nodes => nodes.map(node =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                status: step >= totalSteps ? 'success' : 'loading',
                executionMetadata: {
                  totalExecutions: totalSteps,
                  successCount: step,
                  errorCount: 0,
                  lastExecutionTime: Date.now(),
                }
              }
            }
          : node
      ));

      if (step >= totalSteps) {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 1000); // 每秒执行一步
  }, [id, isRunning, setNodes, totalSteps]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
  }, []);

  // 手动设置进度
  const handleSetProgress = useCallback((step: number) => {
    setCurrentStep(step);
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              status: step > 0 ? 'loading' : 'initial',
              executionMetadata: step > 0 ? {
                totalExecutions: totalSteps,
                successCount: step,
                errorCount: 0,
                lastExecutionTime: Date.now(),
              } : undefined
            }
          }
        : node
    ));
  }, [id, setNodes, totalSteps]);

  const percentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <WorkflowNode id={id} data={data} type="test-progress-node" onRefresh={handleRefresh} selected={selected}>
      <div className="w-full h-full flex flex-col p-3 min-h-0 nodrag space-y-3">
        {/* Progress Display */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              Progress Test
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {currentStep} / {totalSteps}
            </span>
          </div>
          {/* Progress bar with enhanced animations */}
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full progress-bar-container">
            <div
              className={`h-full bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 dark:from-gray-600 dark:via-gray-500 dark:to-gray-600 relative progress-bar-fill ${percentage === 100 ? 'rounded-full' : 'rounded-l-full rounded-r-full'}`}
              style={{ 
                width: `${percentage}%`,
                transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* Shimmer effect - only show when progressing */}
              {isRunning && percentage > 0 && percentage < 100 && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent progress-bar-shimmer rounded-l-full rounded-r-full"
                />
              )}
            </div>
            {/* Completion animation - green sweep from left to right */}
            {percentage === 100 && (
              <div 
                className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 dark:from-green-500 dark:to-green-400 progress-bar-complete rounded-full"
              />
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex-shrink-0 space-y-2">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Controls</div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleStart}
              disabled={isRunning}
              className="flex-1"
            >
              <Play className="w-3 h-3 mr-1" />
              Start
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleStop}
              disabled={!isRunning}
              className="flex-1"
            >
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              className="flex-1"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Manual Progress Control */}
        <div className="flex-shrink-0">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Manual Control</div>
          <div className="grid grid-cols-5 gap-1">
            {[0, 1, 2, 3, 4, 5].map((step) => (
              <Button
                key={step}
                size="sm"
                variant={currentStep === step ? "default" : "outline"}
                onClick={() => handleSetProgress(step)}
                disabled={isRunning}
                className="text-xs"
              >
                {step}
              </Button>
            ))}
          </div>
        </div>

        {/* Status Display */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="text-xs space-y-1">
            <div className="text-gray-600 dark:text-gray-400">Status Info:</div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
              <div>Status: <span className="font-mono">{data?.status || 'initial'}</span></div>
              <div>Current: <span className="font-mono">{currentStep}</span></div>
              <div>Total: <span className="font-mono">{totalSteps}</span></div>
              <div>Percentage: <span className="font-mono">{percentage.toFixed(1)}%</span></div>
              <div>Running: <span className="font-mono">{isRunning ? 'true' : 'false'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Handle 配置 */}
      {nodesConfig['test-progress-node']?.handles.map((handle: any) => (
        <NodeHandle
          key={`${handle.type}-${handle.id}`}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          x={handle.x}
          y={handle.y}
        />
      ))}
    </WorkflowNode>
  );
}

export default TestProgressNode;

