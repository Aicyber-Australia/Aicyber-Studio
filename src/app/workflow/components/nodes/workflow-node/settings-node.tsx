"use client";

import React from 'react';
import type { NodeProps } from '@xyflow/react';
import { SquareX } from 'lucide-react';
import { SetNodeSettings } from './set-node-settings';
import type { WorkflowNodeData, AppNodeType } from '@/app/workflow/components/nodes';

export type SettingsNodeData = {
  targetId: string;
  targetType: AppNodeType;
  targetData: WorkflowNodeData;
  title: string;
  onClose: () => void;
};

export default function SettingsNode({ data }: NodeProps<SettingsNodeData>) {
  return (
    <div className="rounded-lg border bg-white shadow-lg dark:bg-gray-900 dark:border-gray-800 box-border w-[260px] relative z-[10000]">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800 select-none">
        <div className="text-base font-semibold">{data.title}</div>
        <button
          type="button"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={data.onClose}
          title="Close"
        >
          <SquareX className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 h-[300px] overflow-auto space-y-4">
        <SetNodeSettings nodeId={data.targetId} nodeType={data.targetType} data={data.targetData} />
      </div>
    </div>
  );
}
