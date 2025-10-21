import { useCopilotAction } from '@copilotkit/react-core';
import { useCallback } from 'react';
import { AppStore } from '@/app/workflow/store/app-store';
import { AppNode } from '@/app/workflow/components/nodes';

interface UseCopilotWorkflowActionsProps {
  store: {
    nodes: AppNode[];
    edges: any[];
    addNodeByType: AppStore['addNodeByType'];
    removeNode: AppStore['removeNode'];
    onConnect: AppStore['onConnect'];
    setNodes: AppStore['setNodes'];
    getNodes: AppStore['getNodes'];
    setEdges: AppStore['setEdges'];
    getEdges: AppStore['getEdges'];
  };
  selectedNodes: any[];
  takeSnapshot: () => void;
  handleClearCanvas: () => void;
  runWorkflow: () => void;
  stopWorkflow: () => void;
  isRunning: boolean;
}

export function useCopilotWorkflowActions({
  store,
  selectedNodes,
  takeSnapshot,
  handleClearCanvas,
  runWorkflow,
  stopWorkflow,
  isRunning,
}: UseCopilotWorkflowActionsProps) {
  // Add node action
  useCopilotAction({
    name: "addNode",
    description: "Add a new node to the workflow at a specified position",
    parameters: [
      {
        name: "type",
        type: "string",
        description: "The type of node to add (youcan refer to the nodesConfig for available types)",
        required: true,
      },
      {
        name: "x",
        type: "number",
        description: "X coordinate for the node position",
        required: true,
      },
      {
        name: "y",
        type: "number",
        description: "Y coordinate for the node position",
        required: true,
      },
    ],
    handler: async ({ type, x, y }) => {
      takeSnapshot();
      const nodeId = store.addNodeByType(type as any, { x, y });
      if (nodeId) {
        return `Successfully added ${type} node at position (${x}, ${y})`;
      }
      return `Failed to add node of type ${type}`;
    },
  });

  // Delete node action
  useCopilotAction({
    name: "deleteNode",
    description: "Delete a node from the workflow by its ID",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to delete",
        required: true,
      },
    ],
    handler: async ({ nodeId }) => {
      takeSnapshot();
      store.removeNode(nodeId);
      return `Successfully deleted node ${nodeId}`;
    },
  });

  // Delete selected nodes action
  useCopilotAction({
    name: "deleteSelectedNodes",
    description: "Delete all currently selected nodes from the workflow",
    parameters: [],
    handler: async () => {
      if (selectedNodes.length === 0) {
        return "No nodes are currently selected";
      }
      takeSnapshot();
      selectedNodes.forEach(node => {
        store.removeNode(node.id);
      });
      return `Successfully deleted ${selectedNodes.length} selected node(s)`;
    },
  });

  // Connect nodes action
  useCopilotAction({
    name: "connectNodes",
    description: "Create a connection (edge) between two nodes",
    parameters: [
      {
        name: "sourceNodeId",
        type: "string",
        description: "The ID of the source node",
        required: true,
      },
      {
        name: "targetNodeId",
        type: "string",
        description: "The ID of the target node",
        required: true,
      },
    ],
    handler: async ({ sourceNodeId, targetNodeId }) => {
      takeSnapshot();
      store.onConnect({
        source: sourceNodeId,
        target: targetNodeId,
        sourceHandle: null,
        targetHandle: null,
      });
      return `Successfully connected ${sourceNodeId} to ${targetNodeId}`;
    },
  });

  // Clear canvas action
  useCopilotAction({
    name: "clearCanvas",
    description: "Clear all nodes and edges from the workflow canvas",
    parameters: [],
    handler: async () => {
      handleClearCanvas();
      return "Successfully cleared the canvas";
    },
  });

  // Run workflow action
  useCopilotAction({
    name: "runWorkflow",
    description: "Start or stop the workflow execution",
    parameters: [
      {
        name: "action",
        type: "string",
        description: "Action to perform: 'start' or 'stop'",
        required: true,
      },
    ],
    handler: async ({ action }) => {
      if (action === "start") {
        if (isRunning) {
          return "Workflow is already running";
        }
        runWorkflow();
        return "Started workflow execution";
      } else if (action === "stop") {
        if (!isRunning) {
          return "Workflow is not running";
        }
        stopWorkflow();
        return "Stopped workflow execution";
      }
      return `Invalid action: ${action}. Use 'start' or 'stop'`;
    },
  });

  // Update node data action
  useCopilotAction({
    name: "updateNodeData",
    description: "Update data for a specific node (e.g., title, prompt, model)",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to update",
        required: true,
      },
      {
        name: "field",
        type: "string",
        description: "The field to update (e.g., 'title', 'prompt', 'selectedModel')",
        required: true,
      },
      {
        name: "value",
        type: "string",
        description: "The new value for the field",
        required: true,
      },
    ],
    handler: async ({ nodeId, field, value }) => {
      takeSnapshot();
      const updatedNodes = store.nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              [field]: value,
            },
          };
        }
        return node;
      });
      store.setNodes(updatedNodes);
      return `Successfully updated ${field} for node ${nodeId}`;
    },
  });

  // Move node action
  useCopilotAction({
    name: "moveNode",
    description: "Move a node to a new position on the canvas",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to move",
        required: true,
      },
      {
        name: "x",
        type: "number",
        description: "New X coordinate",
        required: true,
      },
      {
        name: "y",
        type: "number",
        description: "New Y coordinate",
        required: true,
      },
    ],
    handler: async ({ nodeId, x, y }) => {
      takeSnapshot();
      const updatedNodes = store.nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            position: { x, y },
          };
        }
        return node;
      });
      store.setNodes(updatedNodes);
      return `Successfully moved node ${nodeId} to position (${x}, ${y})`;
    },
  });

  // Create workflow action - creates multiple nodes and connects them
  useCopilotAction({
    name: "createWorkflow",
    description: "Create a complete workflow by adding multiple nodes and connecting them in sequence. This is more reliable than adding nodes one by one. Use this when the user asks to create a workflow with multiple steps.",
    parameters: [
      {
        name: "nodes",
        type: "object[]",
        description: "Array of nodes to create in the workflow",
        required: true,
        attributes: [
          {
            name: "type",
            type: "string",
            description: "The type of node (refer to nodesConfig for available types like 'workflow', 'agent', 'tool')",
            required: true,
          },
          {
            name: "title",
            type: "string",
            description: "The title/name for the node",
            required: false,
          },
          {
            name: "prompt",
            type: "string",
            description: "The prompt or instructions for the node",
            required: false,
          },
          {
            name: "x",
            type: "number",
            description: "X coordinate for node position (optional, auto-calculated if not provided)",
            required: false,
          },
          {
            name: "y",
            type: "number",
            description: "Y coordinate for node position (optional, auto-calculated if not provided)",
            required: false,
          },
        ],
      },
      {
        name: "connectSequentially",
        type: "boolean",
        description: "If true, connects each node to the next one in sequence (default: true)",
        required: false,
      },
      {
        name: "startX",
        type: "number",
        description: "Starting X coordinate for auto-layout (default: 100)",
        required: false,
      },
      {
        name: "startY",
        type: "number",
        description: "Starting Y coordinate for auto-layout (default: 100)",
        required: false,
      },
      {
        name: "spacing",
        type: "number",
        description: "Horizontal spacing between nodes in auto-layout (default: 300)",
        required: false,
      },
    ],
    handler: async ({ nodes, connectSequentially = true, startX = 100, startY = 100, spacing = 300 }) => {
      if (!nodes || nodes.length === 0) {
        return "No nodes provided to create workflow";
      }

      takeSnapshot();

      const createdNodeIds: string[] = [];
      const createdNodes: any[] = [];

      // Create all nodes
      for (let i = 0; i < nodes.length; i++) {
        const nodeSpec = nodes[i];
        const position = {
          x: nodeSpec.x ?? (startX + i * spacing),
          y: nodeSpec.y ?? startY,
        };

        const nodeId = store.addNodeByType(nodeSpec.type as any, position);

        if (nodeId) {
          createdNodeIds.push(nodeId);

          // Update node data if title or prompt provided
          if (nodeSpec.title || nodeSpec.prompt) {
            // Get fresh nodes after the node was just added
            const currentNodes = store.getNodes();
            const updatedNodes = currentNodes.map(node => {
              if (node.id === nodeId) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    ...(nodeSpec.title && { title: nodeSpec.title }),
                    ...(nodeSpec.prompt && { prompt: nodeSpec.prompt }),
                  },
                };
              }
              return node;
            });
            store.setNodes(updatedNodes);
          }

          createdNodes.push({
            id: nodeId,
            type: nodeSpec.type,
            title: nodeSpec.title,
          });
        }
      }

      // Connect nodes sequentially if requested
      if (connectSequentially && createdNodeIds.length > 1) {
        const currentEdges = store.getEdges();
        const newEdges = [...currentEdges];

        for (let i = 0; i < createdNodeIds.length - 1; i++) {
          const newEdge = {
            id: `${createdNodeIds[i]}-${createdNodeIds[i + 1]}`,
            source: createdNodeIds[i],
            target: createdNodeIds[i + 1],
            sourceHandle: null,
            targetHandle: null,
            type: 'default' as const,
            animated: true,
          };
          newEdges.push(newEdge);
        }

        store.setEdges(newEdges);
      }

      const summary = createdNodes
        .map((n, i) => `${i + 1}. ${n.type}${n.title ? ` (${n.title})` : ''}`)
        .join('\n');

      return `Successfully created workflow with ${createdNodeIds.length} node(s):\n${summary}\n${
        connectSequentially ? 'All nodes connected sequentially.' : 'Nodes created without connections.'
      }`;
    },
  });
}
