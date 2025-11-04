"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  const [totalSteps, setTotalSteps] = useState(5); // Make it configurable
  const [animatedProgress, setAnimatedProgress] = useState(0); // Animated progress for smooth transitions
  const [showCompleteAnimation, setShowCompleteAnimation] = useState(false); // Control when to show green completion animation
  const microAnimationRef = useRef<NodeJS.Timeout | null>(null);
  const completeAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStepRef = useRef(0);
  const hasShownCompleteAnimationRef = useRef(false); // Flag to prevent duplicate animations

  const handleRefresh = useCallback(() => {
    setCurrentStep(0);
    setIsRunning(false);
    setAnimatedProgress(0);
    setShowCompleteAnimation(false);
    hasShownCompleteAnimationRef.current = false;
    lastStepRef.current = 0;
    if (microAnimationRef.current) {
      clearInterval(microAnimationRef.current);
      microAnimationRef.current = null;
    }
    if (completeAnimationTimeoutRef.current) {
      clearTimeout(completeAnimationTimeoutRef.current);
      completeAnimationTimeoutRef.current = null;
    }
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

  // Start micro animation for current step (random small increments)
  const startMicroAnimation = useCallback((step: number) => {
    if (microAnimationRef.current) {
      clearInterval(microAnimationRef.current);
    }

    const stepSize = 100 / totalSteps;
    const stepStart = step * stepSize;
    const stepEnd = (step + 1) * stepSize;
    const currentEnd = step === totalSteps ? 100 : stepEnd;

    // Animate to the start of current step first
    setAnimatedProgress(stepStart);

    // Then add micro animation with random small increments
    let currentMicro = stepStart;
    const microInterval = setInterval(() => {
      // Random increment between 0.1% and 0.5% of the step size
      const increment = (Math.random() * 0.004 + 0.001) * stepSize;
      currentMicro = Math.min(currentMicro + increment, currentEnd * 0.95); // Don't exceed 95% of step end
      setAnimatedProgress(currentMicro);
    }, 100 + Math.random() * 200); // Random interval between 100-300ms

    microAnimationRef.current = microInterval;
  }, [totalSteps]);

  // Stop micro animation and animate to step completion
  const stopMicroAnimation = useCallback((step: number) => {
    if (microAnimationRef.current) {
      clearInterval(microAnimationRef.current);
      microAnimationRef.current = null;
    }

    const stepSize = 100 / totalSteps;
    const stepEnd = (step + 1) * stepSize;
    const targetProgress = step >= totalSteps ? 100 : stepEnd;
    setAnimatedProgress(targetProgress);
  }, [totalSteps]);

  // 模拟运行过程
  const handleStart = useCallback(() => {
    if (isRunning) return;

    setIsRunning(true);
    setCurrentStep(0);
    setAnimatedProgress(0);
    setShowCompleteAnimation(false);
    hasShownCompleteAnimationRef.current = false;
    lastStepRef.current = 0;

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

    // Start micro animation for step 0
    startMicroAnimation(0);

    // 模拟逐步执行
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCurrentStep(step);
      lastStepRef.current = step;

      // Stop micro animation for previous step and animate to completion
      stopMicroAnimation(step - 1);

      // Start micro animation for current step
      if (step < totalSteps) {
        setTimeout(() => {
          startMicroAnimation(step);
        }, 100); // Small delay to ensure smooth transition
      }

      // Update status - keep as 'loading' until animation completes (will be set to 'success' in setTimeout)
      setNodes(nodes => nodes.map(node =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                status: 'loading', // Keep loading until animation completes
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
        if (microAnimationRef.current) {
          clearInterval(microAnimationRef.current);
          microAnimationRef.current = null;
        }
        
        // Clear any existing completion timeout to prevent duplicates
        if (completeAnimationTimeoutRef.current) {
          clearTimeout(completeAnimationTimeoutRef.current);
          completeAnimationTimeoutRef.current = null;
        }
        
        // Stop micro animation and animate to 100%
        stopMicroAnimation(step - 1);
        
        clearInterval(interval);
        setIsRunning(false);
        
        // Wait for progress bar animation to complete (0.7s transition) before showing green animation and setting success
        // Use a flag to ensure this only runs once
        if (!hasShownCompleteAnimationRef.current) {
          completeAnimationTimeoutRef.current = setTimeout(() => {
            if (!hasShownCompleteAnimationRef.current) {
              hasShownCompleteAnimationRef.current = true;
              setShowCompleteAnimation(true);
              // Set status to success after animation completes
              setNodes(nodes => nodes.map(node =>
                node.id === id
                  ? {
                      ...node,
                      data: {
                        ...node.data,
                        status: 'success',
                      }
                    }
                  : node
              ));
            }
            completeAnimationTimeoutRef.current = null;
          }, 750); // Slightly longer than transition duration to ensure it completes
        }
      }
    }, 1000); // 每秒执行一步
  }, [id, isRunning, setNodes, totalSteps, startMicroAnimation, stopMicroAnimation]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    if (microAnimationRef.current) {
      clearInterval(microAnimationRef.current);
      microAnimationRef.current = null;
    }
    if (completeAnimationTimeoutRef.current) {
      clearTimeout(completeAnimationTimeoutRef.current);
      completeAnimationTimeoutRef.current = null;
    }
    setShowCompleteAnimation(false);
    hasShownCompleteAnimationRef.current = false;
  }, []);

  // 手动设置进度
  const handleSetProgress = useCallback((step: number) => {
    setCurrentStep(step);
    lastStepRef.current = step;
    
    // Update animated progress
    const stepSize = 100 / totalSteps;
    const targetProgress = step * stepSize;
    setAnimatedProgress(targetProgress);
    
    // Reset completion animation state
    setShowCompleteAnimation(false);
    hasShownCompleteAnimationRef.current = false;
    
    if (microAnimationRef.current) {
      clearInterval(microAnimationRef.current);
      microAnimationRef.current = null;
    }
    if (completeAnimationTimeoutRef.current) {
      clearTimeout(completeAnimationTimeoutRef.current);
      completeAnimationTimeoutRef.current = null;
    }

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              status: step > 0 ? (step >= totalSteps ? 'success' : 'loading') : 'initial',
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
    
    // If manually set to complete, wait for animation then show green
    if (step >= totalSteps && !hasShownCompleteAnimationRef.current) {
      completeAnimationTimeoutRef.current = setTimeout(() => {
        if (!hasShownCompleteAnimationRef.current) {
          hasShownCompleteAnimationRef.current = true;
          setShowCompleteAnimation(true);
        }
        completeAnimationTimeoutRef.current = null;
      }, 750);
    }
  }, [id, setNodes, totalSteps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (microAnimationRef.current) {
        clearInterval(microAnimationRef.current);
      }
      if (completeAnimationTimeoutRef.current) {
        clearTimeout(completeAnimationTimeoutRef.current);
      }
    };
  }, []);

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
              className={`h-full bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 dark:from-gray-600 dark:via-gray-500 dark:to-gray-600 relative progress-bar-fill ${animatedProgress >= 100 ? 'rounded-full' : 'rounded-l-full rounded-r-full'}`}
              style={{ 
                width: `${animatedProgress}%`,
                transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* Shimmer effect - only show when progressing */}
              {isRunning && animatedProgress > 0 && animatedProgress < 100 && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent progress-bar-shimmer rounded-l-full rounded-r-full"
                />
              )}
            </div>
            {/* Completion animation - green sweep from left to right */}
            {showCompleteAnimation && animatedProgress >= 100 && (
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

        {/* Configuration */}
        <div className="flex-shrink-0">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Configuration</div>
          <div className="flex items-center gap-2">
            <label className="text-xs">Total Steps:</label>
            <input
              type="number"
              min="1"
              max="100"
              value={totalSteps}
              onChange={(e) => {
                const newTotal = Math.max(1, Math.min(100, parseInt(e.target.value) || 1));
                setTotalSteps(newTotal);
                if (currentStep > newTotal) {
                  handleSetProgress(newTotal);
                }
              }}
              disabled={isRunning}
              className="w-16 px-2 py-1 text-xs border rounded"
            />
          </div>
        </div>

        {/* Manual Progress Control */}
        <div className="flex-shrink-0">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Manual Control</div>
          <div className="grid grid-cols-5 gap-1 max-h-32 overflow-y-auto">
            {Array.from({ length: Math.min(totalSteps + 1, 20) }, (_, i) => i).map((step) => (
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
              <div>Animated: <span className="font-mono">{animatedProgress.toFixed(1)}%</span></div>
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

