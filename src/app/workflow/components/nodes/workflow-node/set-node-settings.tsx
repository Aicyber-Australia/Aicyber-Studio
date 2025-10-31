'use client';

import React, { useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { WorkflowNodeData, AppNodeType } from '@/app/workflow/components/nodes';
import { Input } from '@/components/ui/input';
import { SegmentedSlider } from '@/components/ui/segmented-slider';

/**
 * Settings panel for set nodes (image-set, video-set, text-set, media-set)
 */
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
  
  // media-set only shows Output Mode
  const isMediaSet = nodeType === 'media-set';

  return (
    <div className="space-y-4">
      {/* Output Mode */}
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-1 min-w-[240px]">
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-3 shadow-sm">
            <div className="text-[10px] text-muted-foreground mb-1">Output Mode</div>
            <SegmentedSlider
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
      </div>

      {/* Process Items - hidden for media-set */}
      {!isMediaSet && !hasInputEdges && (
        <div className="flex items-start gap-4" aria-disabled={disableProcessControls}>
          <div className="flex flex-col gap-1 min-w-[240px]">
            <div className="rounded-2xl bg-white dark:bg-gray-800 p-3 shadow-sm">
              <div className="text-[10px] text-muted-foreground mb-1">Process Items</div>
              <SegmentedSlider
                value={processLimitMode === 'all' ? 'left' : 'right'}
                onChange={(v) => setData('processLimitMode', v === 'left' ? 'all' : 'limited')}
                left="Process All"
                right="First N"
                disabled={disableProcessControls}
              />
            </div>
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


