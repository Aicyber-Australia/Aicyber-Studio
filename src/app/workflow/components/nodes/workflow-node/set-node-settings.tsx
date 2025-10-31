'use client';

import React, { useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { WorkflowNodeData, AppNodeType } from '@/app/workflow/components/nodes';
import { Input } from '@/components/ui/input';

function SegmentedTwo({
  value,
  onChange,
  left,
  right,
  className,
  disabled,
}: {
  value: 'left' | 'right';
  onChange: (v: 'left' | 'right') => void;
  left: string;
  right: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={
        "relative flex w-[220px] items-center rounded-md border p-1 box-border bg-white dark:bg-gray-800 " +
        (disabled ? " opacity-60 pointer-events-none " : " ") +
        (className || '')
      }
      aria-disabled={disabled}
    >
      <div
        className="absolute top-0.5 h-[calc(100%-4px)] bg-gray-100 dark:bg-gray-700 rounded transition-all duration-300 ease-in-out"
        style={{ 
          width: 'calc(50% - 4px)',
          left: value === 'left' ? '2px' : 'calc(50% + 2px)',
        }}
      />
      <button
        type="button"
        className={`relative z-10 flex-1 text-center px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${
          value === 'left' ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400'
        }`}
        onClick={() => onChange('left')}
      >
        {left}
      </button>
      <button
        type="button"
        className={`relative z-10 flex-1 text-center px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${
          value === 'right' ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400'
        }`}
        onClick={() => onChange('right')}
      >
        {right}
      </button>
    </div>
  );
}

export function SetNodeSettings({
  nodeId,
  nodeType,
  data,
}: {
  nodeId: string;
  nodeType: AppNodeType;
  data: WorkflowNodeData;
}) {
  const { setNodes, getEdges } = useReactFlow();

  const hasInputEdges = useMemo(() => {
    const edges = getEdges();
    return edges.some((e) => e.target === nodeId);
  }, [getEdges, nodeId]);

  const listLen =
    data?.media?.imageList?.length ??
    data?.media?.videoList?.length ??
    data?.media?.textList?.length ??
    0;

  const setOutputMode = (data?.setOutputMode as 'individual' | 'integrated') || 'individual';
  const processLimitMode = (data?.processLimitMode as 'all' | 'limited') || 'all';
  const processLimit = Math.min(Math.max(data?.processLimit || 10, 1), Math.max(listLen, 1));

  const setData = (k: string, v: any) => {
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, [k]: v } } : n)));
  };

  const disableProcessControls = setOutputMode === 'integrated';

  return (
    <div className="space-y-4">
      {/* 第一行：Output Mode */}
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-1 min-w-[240px]">
          <div className="text-[10px] text-muted-foreground">Output Mode</div>
          <SegmentedTwo
            value={setOutputMode === 'individual' ? 'left' : 'right'}
            onChange={(v) => {
              const next = v === 'left' ? 'individual' : 'integrated';
              setData('setOutputMode', next);
              // Lock process to ALL when integrated
              if (next === 'integrated' && processLimitMode !== 'all') {
                setData('processLimitMode', 'all');
              }
            }}
            left="Individual"
            right="Integrated"
          />
        </div>
      </div>

      {/* 第二行：Process Items */}
      {!hasInputEdges && (
        <div className="flex items-start gap-4" aria-disabled={disableProcessControls}>
          <div className="flex flex-col gap-1 min-w-[240px]">
            <div className="text-[10px] text-muted-foreground">Process Items</div>
            <SegmentedTwo
              value={processLimitMode === 'all' ? 'left' : 'right'}
              onChange={(v) => setData('processLimitMode', v === 'left' ? 'all' : 'limited')}
              left="Process All"
              right="First N"
              disabled={disableProcessControls}
            />
            {!disableProcessControls && processLimitMode === 'limited' && (
              <div className="flex items-center gap-2 mt-1">
                <label className="text-[10px] text-muted-foreground whitespace-nowrap">Limit:</label>
                <Input
                  type="number"
                  min={1}
                  max={Math.max(listLen, 1)}
                  value={processLimit}
                  onChange={(e) => {
                    const v = parseInt(e.target.value || '1', 10);
                    setData('processLimit', isNaN(v) ? 1 : v);
                  }}
                  className="h-7 text-xs nodrag w-16 flex-none text-center"
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">/ {Math.max(listLen, 1)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


