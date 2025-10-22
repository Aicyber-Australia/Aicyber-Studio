"use client";

import React from 'react';
import { WorkflowNodeProps } from '..';
import { nodesConfig } from '../../../config';
import ActionNodeBase from './action-node-base';
import { NodeHandle } from '../workflow-node/node-handle';

export function ImageToTextNode({ id, data, selected }: WorkflowNodeProps) {
  return (
    <ActionNodeBase id={id} data={data} selected={selected}>
      {nodesConfig['image-to-text-node'].handles.map((handle) => (
        <NodeHandle
          key={`${handle.type}-${handle.id}`}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          x={handle.x}
          y={handle.y}
        />
      ))}
    </ActionNodeBase>
  );
}
