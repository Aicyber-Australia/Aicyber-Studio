"use client";

import React, { useCallback, useState } from 'react';
import { Play, Trash, RotateCcw, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkflowNodeProps } from '@/app/workflow/components/nodes';
import { nodesConfig } from '@/app/workflow/config';
import { NodeHandle } from '../workflow-node/node-handle';
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
import { ImageEditDialog } from '../image/image-edit-dialog';

export function EditImageNode({ id, data, selected }: WorkflowNodeProps) {
  const { runWorkflow } = useWorkflowRunner();
  const removeNode = useAppStore((s) => s.removeNode);
  const { setNodes } = useReactFlow();

  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Load image from upstream node or from saved edits
  const imageData = data?.media?.imageList?.[0];
  const imageUrl = imageData?.url || '';

  const handleSave = useCallback((imageDataUrl: string) => {
    // Convert data URL to blob URL
    fetch(imageDataUrl)
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        setNodes(nodes => nodes.map(node =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  media: {
                    imageList: [{
                      url: url,
                      fileName: `edited_${Date.now()}.png`,
                      timestamp: Date.now()
                    }]
                  },
                  status: 'success'
                }
              }
            : node
        ));
      });
  }, [id, setNodes]);

  const onPlay = useCallback(() => runWorkflow(id), [id, runWorkflow]);
  const onRemove = useCallback(() => removeNode(id), [id, removeNode]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, title: newTitle } } : node
      )
    );
  }, [id, setNodes]);

  const onReset = useCallback(() => {
    // Close the dialog if it's open
    setIsEditing(false);

    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: undefined,
              status: 'initial'
            }
          }
        : node
    ));
  }, [id, setNodes]);

  const handleEdit = useCallback(() => {
    if (imageUrl) {
      setIsEditing(true);
    }
  }, [imageUrl]);

  return (
    <>
      <NodeStatusIndicator status={data?.status}>
        <NodeResizer
          color="#3b82f6"
          isVisible={selected}
          minWidth={ACTION_NODE_SIZE.width}
          minHeight={ACTION_NODE_SIZE.height}
        />
        <BaseNode>
          <BaseNodeHeader className="flex-shrink-0">
            <BaseNodeHeaderTitle
              editable
              onTitleChange={handleTitleChange}
              onEditingChange={setIsTitleEditing}
            >
              {data?.title || 'Edit Image'}
            </BaseNodeHeaderTitle>
            <div className="flex items-center gap-1" style={{ visibility: isTitleEditing ? 'hidden' : 'visible' }}>
              <Button
                variant="ghost"
                className="nodrag px-1!"
                onClick={onReset}
                title="Reset"
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

          <BaseNodeContent className="flex-1 flex flex-col p-3 min-h-0 overflow-y-auto">
            {/* Image Preview and Edit Button */}
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg overflow-hidden min-h-0 relative">
              {imageUrl ? (
                <>
                  <img
                    src={imageUrl}
                    alt="Image to edit"
                    className="max-w-full max-h-full object-contain"
                  />
                  {/* Edit button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors group">
                    <Button
                      className="nodrag opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleEdit}
                      size="lg"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Image
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-gray-500 text-sm text-center">
                  Connect an image source to begin editing
                </div>
              )}
            </div>
          </BaseNodeContent>

          {nodesConfig['edit-image-node'].handles.map((handle) => (
            <NodeHandle
              key={`${handle.type}-${handle.id}`}
              id={handle.id}
              type={handle.type}
              position={handle.position}
              x={handle.x}
              y={handle.y}
            />
          ))}
        </BaseNode>
      </NodeStatusIndicator>

      {/* Edit Dialog */}
      <ImageEditDialog
        imageUrl={isEditing ? imageUrl : null}
        onClose={() => setIsEditing(false)}
        onSave={handleSave}
      />
    </>
  );
}
