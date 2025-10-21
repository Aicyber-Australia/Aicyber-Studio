import { useCopilotAction } from '@copilotkit/react-core';
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
  runLayout: () => Promise<void>;
  fitView: (options?: { duration?: number; padding?: number }) => void;
}

export function useCopilotWorkflowActions({
  store,
  selectedNodes,
  takeSnapshot,
  handleClearCanvas,
  runWorkflow,
  stopWorkflow,
  isRunning,
  runLayout,
  fitView,
}: UseCopilotWorkflowActionsProps) {
  // Add node action
  useCopilotAction({
    name: "addNode",
    description: "Add a single STANDALONE node to the workflow without any connections. IMPORTANT: Do NOT use this action if you need to connect nodes - you CANNOT connect nodes after using this action because the node ID is not available. For any workflow with connections, you MUST use createWorkflow instead. Valid types: 'image-frame', 'image-set', 'text-to-image-node', 'image-to-image-node'",
    parameters: [
      {
        name: "type",
        type: "string",
        description: "The type of node: 'image-frame', 'image-set', 'text-to-image-node', 'image-to-image-node'",
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
      {
        name: "title",
        type: "string",
        description: "Optional title for the node",
        required: false,
      },
      {
        name: "prompt",
        type: "string",
        description: "Optional prompt for action nodes (text-to-image-node, image-to-image-node)",
        required: false,
      },
    ],
    render: ({ status, args, result }) => {
      if (status === "executing" || status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-xs text-blue-700">
              Adding {args.type} node at ({args.x}, {args.y})...
            </span>
          </div>
        );
      }

      if (status === "complete") {
        return (
          <div className="p-2 bg-green-50 border border-green-200 rounded-md">
            <span className="text-xs text-green-700">✓ {result}</span>
          </div>
        );
      }

      return <></>;
    },
    handler: async ({ type, x, y, title, prompt }) => {
      takeSnapshot();
      const nodeId = store.addNodeByType(type as any, { x, y });

      if (!nodeId) {
        return `Failed to add node of type ${type}`;
      }

      // Update node data if title or prompt provided
      if (title || prompt) {
        const currentNodes = store.getNodes();
        const updatedNodes = currentNodes.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...(title && { title }),
                ...(prompt && { prompt }),
              },
            };
          }
          return node;
        });
        store.setNodes(updatedNodes);
      }

      return `Successfully added ${type} node at position (${x}, ${y}). This is a standalone node - if you need to connect it, you must use connectNodes with existing node IDs or use createWorkflow for new connected nodes.`;
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
    render: ({ status, args, result }) => {
      if (status === "executing" || status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="animate-spin h-3 w-3 border-2 border-red-500 border-t-transparent rounded-full" />
            <span className="text-xs text-red-700">
              Deleting node {args.nodeId}...
            </span>
          </div>
        );
      }

      if (status === "complete") {
        return (
          <div className="p-2 bg-green-50 border border-green-200 rounded-md">
            <span className="text-xs text-green-700">✓ {result}</span>
          </div>
        );
      }

      return <></>;
    },
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
    render: ({ status, result }) => {
      if (status === "executing" || status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="animate-spin h-3 w-3 border-2 border-red-500 border-t-transparent rounded-full" />
            <span className="text-xs text-red-700">
              Deleting {selectedNodes.length} selected node(s)...
            </span>
          </div>
        );
      }

      if (status === "complete") {
        return (
          <div className="p-2 bg-green-50 border border-green-200 rounded-md">
            <span className="text-xs text-green-700">✓ {result}</span>
          </div>
        );
      }

      return <></>;
    },
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

  // Add connected node to existing workflow
  useCopilotAction({
    name: "addConnectedNode",
    description: "Add a new node to the existing workflow and automatically connect it. Use this when the user wants to add a node 'to the workflow', 'to the end', 'as output', 'as input', or similar phrases that imply connection. This will automatically find the best connection point based on the node type and existing workflow structure.",
    parameters: [
      {
        name: "type",
        type: "string",
        description: "The type of node: 'image-frame', 'image-set', 'text-to-image-node', 'image-to-image-node'",
        required: true,
      },
      {
        name: "title",
        type: "string",
        description: "Optional title for the node",
        required: false,
      },
      {
        name: "prompt",
        type: "string",
        description: "Optional prompt for action nodes (text-to-image-node, image-to-image-node)",
        required: false,
      },
      {
        name: "position",
        type: "string",
        description: "Where to add: 'start' (connect as input), 'end' (connect as output), or 'auto' (default: 'auto' - determines based on node type)",
        required: false,
      },
    ],
    render: ({ status, args, result }) => {
      if (status === "executing" || status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-md">
            <div className="animate-spin h-3 w-3 border-2 border-emerald-500 border-t-transparent rounded-full" />
            <span className="text-xs text-emerald-700">
              Adding {args.type} to workflow and connecting...
            </span>
          </div>
        );
      }

      if (status === "complete") {
        return (
          <div className="p-2 bg-green-50 border border-green-200 rounded-md">
            <span className="text-xs text-green-700">✓ {result}</span>
          </div>
        );
      }

      return <></>;
    },
    handler: async ({ type, title, prompt, position = 'auto' }) => {
      const currentNodes = store.getNodes();
      const currentEdges = store.getEdges();

      if (currentNodes.length === 0) {
        return "No existing workflow found. Use createWorkflow to create a new workflow first.";
      }

      // Determine connection strategy based on position parameter and node type
      let targetConnectionNode: string | null = null;
      let connectionType: 'source' | 'target' = 'target';
      let nodePosition = { x: 100, y: 100 };

      if (position === 'start' || (position === 'auto' && (type === 'image-frame' || type === 'image-set'))) {
        // Add at the start - find the first node (node without incoming edges)
        const nodesWithoutIncoming = currentNodes.filter(
          node => !currentEdges.some(edge => edge.target === node.id)
        );
        if (nodesWithoutIncoming.length > 0) {
          targetConnectionNode = nodesWithoutIncoming[0].id;
          connectionType = 'source';
          nodePosition = {
            x: nodesWithoutIncoming[0].position.x - 350,
            y: nodesWithoutIncoming[0].position.y,
          };
        }
      } else {
        // Add at the end - find the last node (node without outgoing edges)
        const nodesWithoutOutgoing = currentNodes.filter(
          node => !currentEdges.some(edge => edge.source === node.id)
        );
        if (nodesWithoutOutgoing.length > 0) {
          // If multiple leaf nodes, prefer the rightmost one
          const lastNode = nodesWithoutOutgoing.reduce((rightmost, current) =>
            current.position.x > rightmost.position.x ? current : rightmost
          );
          targetConnectionNode = lastNode.id;
          connectionType = 'target';
          nodePosition = {
            x: lastNode.position.x + 350,
            y: lastNode.position.y,
          };
        }
      }

      if (!targetConnectionNode) {
        return "Could not determine where to connect the new node. The workflow structure may be complex. Please use createWorkflow or specify node IDs with connectNodes.";
      }

      takeSnapshot();

      // Create the new node
      const nodeId = store.addNodeByType(type as any, nodePosition);
      if (!nodeId) {
        return `Failed to add node of type ${type}`;
      }

      // Update node data if title or prompt provided
      if (title || prompt) {
        const nodes = store.getNodes();
        const updatedNodes = nodes.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...(title && { title }),
                ...(prompt && { prompt }),
              },
            };
          }
          return node;
        });
        store.setNodes(updatedNodes);
      }

      // Create the connection
      if (connectionType === 'target') {
        // Connect existing node -> new node
        store.onConnect({
          source: targetConnectionNode,
          target: nodeId,
          sourceHandle: null,
          targetHandle: null,
        });
      } else {
        // Connect new node -> existing node
        store.onConnect({
          source: nodeId,
          target: targetConnectionNode,
          sourceHandle: null,
          targetHandle: null,
        });
      }

      const targetNode = currentNodes.find(n => n.id === targetConnectionNode);
      const connectionDesc = connectionType === 'target'
        ? `connected after ${targetNode?.data?.title || targetConnectionNode}`
        : `connected before ${targetNode?.data?.title || targetConnectionNode}`;

      // Run layout to optimize the workflow
      await runLayout();

      // Fit view to show the entire workflow
      fitView({ duration: 300, padding: 0.2 });

      return `Successfully added ${type}${title ? ` "${title}"` : ''} to the workflow and ${connectionDesc}.`;
    },
  });

  // Replace node action
  useCopilotAction({
    name: "replaceNode",
    description: "Replace an existing node with a new node type while preserving all connections. Use this when the user wants to 'change', 'replace', 'convert', or 'swap' a node type. This action automatically transfers all incoming and outgoing connections from the old node to the new node.",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to replace",
        required: true,
      },
      {
        name: "newType",
        type: "string",
        description: "The new node type: 'image-frame', 'image-set', 'text-to-image-node', 'image-to-image-node'",
        required: true,
      },
      {
        name: "title",
        type: "string",
        description: "Optional title for the new node",
        required: false,
      },
      {
        name: "prompt",
        type: "string",
        description: "Optional prompt for the new node (for action nodes)",
        required: false,
      },
    ],
    render: ({ status, args, result }) => {
      if (status === "executing" || status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
            <div className="animate-spin h-3 w-3 border-2 border-amber-500 border-t-transparent rounded-full" />
            <span className="text-xs text-amber-700">
              Replacing node with {args.newType}...
            </span>
          </div>
        );
      }

      if (status === "complete") {
        return (
          <div className="p-2 bg-green-50 border border-green-200 rounded-md">
            <span className="text-xs text-green-700">✓ {result}</span>
          </div>
        );
      }

      return <></>;
    },
    handler: async ({ nodeId, newType, title, prompt }) => {
      const nodes = store.getNodes();
      const edges = store.getEdges();

      // Find the node to replace
      const oldNode = nodes.find(n => n.id === nodeId);
      if (!oldNode) {
        return `Error: Node with ID "${nodeId}" does not exist. Use getCurrentCanvas to see available nodes.`;
      }

      // Find all connections to this node
      const incomingEdges = edges.filter(e => e.target === nodeId);
      const outgoingEdges = edges.filter(e => e.source === nodeId);

      takeSnapshot();

      // Create new node at the same position
      const newNodeId = store.addNodeByType(newType as any, oldNode.position);
      if (!newNodeId) {
        return `Failed to create new node of type ${newType}`;
      }

      // Update new node data if provided
      if (title || prompt) {
        const currentNodes = store.getNodes();
        const updatedNodes = currentNodes.map(node => {
          if (node.id === newNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...(title && { title }),
                ...(prompt && { prompt }),
              },
            };
          }
          return node;
        });
        store.setNodes(updatedNodes);
      }

      // Recreate all connections with the new node
      const currentEdges = store.getEdges();
      let updatedEdges = currentEdges.filter(e => e.source !== nodeId && e.target !== nodeId);

      // Add incoming connections to new node
      incomingEdges.forEach(edge => {
        updatedEdges.push({
          ...edge,
          id: `${edge.source}-${newNodeId}`,
          target: newNodeId,
        });
      });

      // Add outgoing connections from new node
      outgoingEdges.forEach(edge => {
        updatedEdges.push({
          ...edge,
          id: `${newNodeId}-${edge.target}`,
          source: newNodeId,
        });
      });

      store.setEdges(updatedEdges);

      // Remove the old node
      store.removeNode(nodeId);

      // Run layout to optimize
      await runLayout();

      // Fit view to show the entire workflow
      fitView({ duration: 300, padding: 0.2 });

      const oldNodeName = oldNode.data?.title || oldNode.type;
      const newNodeName = title || newType;
      return `Successfully replaced ${oldNodeName} with ${newNodeName}. All connections preserved (${incomingEdges.length} incoming, ${outgoingEdges.length} outgoing).`;
    },
  });

  // Connect nodes action
  useCopilotAction({
    name: "connectNodes",
    description: "Create a connection between two EXISTING nodes that are already on the canvas. CRITICAL: You can ONLY connect nodes that already exist - you cannot connect a node you just created with addNode because you don't have its ID. If you need to create new connected nodes, use createWorkflow instead. This action is ONLY for connecting existing nodes that the user explicitly asks to connect.",
    parameters: [
      {
        name: "sourceNodeId",
        type: "string",
        description: "The ID of the source node (must be an existing node ID)",
        required: true,
      },
      {
        name: "targetNodeId",
        type: "string",
        description: "The ID of the target node (must be an existing node ID)",
        required: true,
      },
    ],
    render: ({ status, args, result }) => {
      if (status === "executing" || status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
            <div className="animate-spin h-3 w-3 border-2 border-purple-500 border-t-transparent rounded-full" />
            <span className="text-xs text-purple-700">
              Connecting {args.sourceNodeId} → {args.targetNodeId}...
            </span>
          </div>
        );
      }

      if (status === "complete") {
        return (
          <div className="p-2 bg-green-50 border border-green-200 rounded-md">
            <span className="text-xs text-green-700">✓ {result}</span>
          </div>
        );
      }

      return <></>;
    },
    handler: async ({ sourceNodeId, targetNodeId }) => {
      // Validate that both nodes exist
      const nodes = store.getNodes();
      const sourceNode = nodes.find(n => n.id === sourceNodeId);
      const targetNode = nodes.find(n => n.id === targetNodeId);

      if (!sourceNode) {
        return `Error: Source node with ID "${sourceNodeId}" does not exist`;
      }
      if (!targetNode) {
        return `Error: Target node with ID "${targetNodeId}" does not exist`;
      }

      // Check if connection already exists
      const edges = store.getEdges();
      const existingEdge = edges.find(
        e => e.source === sourceNodeId && e.target === targetNodeId
      );
      if (existingEdge) {
        return `Connection already exists between ${sourceNodeId} and ${targetNodeId}`;
      }

      takeSnapshot();
      store.onConnect({
        source: sourceNodeId,
        target: targetNodeId,
        sourceHandle: null,
        targetHandle: null,
      });
      return `Successfully connected ${sourceNode.data.title || sourceNodeId} → ${targetNode.data.title || targetNodeId}`;
    },
  });

  // Get current canvas state action
  useCopilotAction({
    name: "getCurrentCanvas",
    description: "Get the current state of the workflow canvas including all nodes, their connections, and configuration. Use this when the user asks 'explain...', 'what is on the canvas', 'show me the workflow', 'what nodes do I have', or similar queries.",
    parameters: [],
    render: ({ status, result }) => {
      if (status === "complete") {
        return (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xs text-slate-700 whitespace-pre-line">
              {result}
            </div>
          </div>
        );
      }

      return <></>;
    },
    handler: async () => {
      const nodes = store.getNodes();
      const edges = store.getEdges();

      if (nodes.length === 0) {
        return "Canvas is empty.";
      }

      // Build node details
      const nodeDetails = nodes.map((node, i) => {
        let details = `${i + 1}. [${node.type}]`;
        if (node.data?.title) details += ` "${node.data.title}"`;
        details += ` (ID: ${node.id})`;
        if (node.data?.prompt) details += `\n   Prompt: "${node.data.prompt.substring(0, 60)}${node.data.prompt.length > 60 ? '...' : ''}"`;
        return details;
      }).join('\n');

      // Build connection details
      let connectionDetails = '';
      if (edges.length > 0) {
        connectionDetails = edges.map((edge, i) => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          const sourceName = sourceNode?.data?.title || sourceNode?.type || edge.source;
          const targetName = targetNode?.data?.title || targetNode?.type || edge.target;
          return `${i + 1}. ${sourceName} → ${targetName}`;
        }).join('\n');
      }

      // Workflow analysis
      const startNodes = nodes.filter(n => !edges.some(e => e.target === n.id));
      const endNodes = nodes.filter(n => !edges.some(e => e.source === n.id));
      const isolatedNodes = nodes.filter(n => !edges.some(e => e.source === n.id || e.target === n.id));

      // Build summary
      let summary = `📊 ${nodes.length} node${nodes.length !== 1 ? 's' : ''}, ${edges.length} connection${edges.length !== 1 ? 's' : ''}\n\n`;
      summary += `Nodes:\n${nodeDetails}`;

      if (connectionDetails) {
        summary += `\n\nConnections:\n${connectionDetails}`;
      }

      if (startNodes.length > 0 || endNodes.length > 0 || isolatedNodes.length > 0) {
        summary += `\n\n`;
        if (startNodes.length > 0) summary += `▶ Start: ${startNodes.map(n => n.data?.title || n.type).join(', ')}\n`;
        if (endNodes.length > 0) summary += `◼ End: ${endNodes.map(n => n.data?.title || n.type).join(', ')}\n`;
        if (isolatedNodes.length > 0) summary += `⚠ Isolated: ${isolatedNodes.map(n => n.data?.title || n.type).join(', ')}`;
      }

      return summary;
    },
  });

  // Clear canvas action
  useCopilotAction({
    name: "clearCanvas",
    description: "Clear all nodes and edges from the workflow canvas",
    parameters: [],
    render: ({ status, result }) => {
      if (status === "executing" || status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
            <div className="animate-spin h-3 w-3 border-2 border-orange-500 border-t-transparent rounded-full" />
            <span className="text-xs text-orange-700">
              Clearing canvas...
            </span>
          </div>
        );
      }

      if (status === "complete") {
        return (
          <div className="p-2 bg-green-50 border border-green-200 rounded-md">
            <span className="text-xs text-green-700">✓ {result}</span>
          </div>
        );
      }

      return <></>;
    },
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
    render: ({ status, args, result }) => {
      if (status === "executing" || status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-200 rounded-md">
            <div className="animate-spin h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full" />
            <span className="text-xs text-indigo-700">
              {args.action === "start" ? "Starting" : "Stopping"} workflow...
            </span>
          </div>
        );
      }

      if (status === "complete") {
        return (
          <div className="p-2 bg-green-50 border border-green-200 rounded-md">
            <span className="text-xs text-green-700">✓ {result}</span>
          </div>
        );
      }

      return <></>;
    },
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
    description: "Update data for a specific node (e.g., title, prompt, model). IMPORTANT: Always call getCurrentCanvas first to get the correct node IDs before using this action.",
    parameters: [
      {
        name: "nodeId",
        type: "string",
        description: "The ID of the node to update (use getCurrentCanvas to get valid node IDs)",
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
    render: ({ status, args, result }) => {
      if (status === "executing" || status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
            <div className="animate-spin h-3 w-3 border-2 border-amber-500 border-t-transparent rounded-full" />
            <span className="text-xs text-amber-700">
              Updating {args.field}...
            </span>
          </div>
        );
      }

      if (status === "complete") {
        return (
          <div className="p-2 bg-green-50 border border-green-200 rounded-md">
            <span className="text-xs text-green-700">✓ {result}</span>
          </div>
        );
      }

      return <></>;
    },
    handler: async ({ nodeId, field, value }) => {
      // Get fresh node state
      const nodes = store.getNodes();
      const targetNode = nodes.find(n => n.id === nodeId);

      if (!targetNode) {
        return `Error: Node with ID "${nodeId}" does not exist. Use getCurrentCanvas to see available nodes.`;
      }

      takeSnapshot();
      const updatedNodes = nodes.map(node => {
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

      const nodeName = targetNode.data?.title || targetNode.type;
      return `Successfully updated ${field} for ${nodeName} to "${value}"`;
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
    render: ({ status, args, result }) => {
      if (status === "executing" || status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-2 bg-teal-50 border border-teal-200 rounded-md">
            <div className="animate-spin h-3 w-3 border-2 border-teal-500 border-t-transparent rounded-full" />
            <span className="text-xs text-teal-700">
              Moving node {args.nodeId} to ({args.x}, {args.y})...
            </span>
          </div>
        );
      }

      if (status === "complete") {
        return (
          <div className="p-2 bg-green-50 border border-green-200 rounded-md">
            <span className="text-xs text-green-700">✓ {result}</span>
          </div>
        );
      }

      return <></>;
    },
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

  // Refactor workflow action - intelligently restructure existing workflow
  useCopilotAction({
    name: "refactorWorkflow",
    description: `Intelligently refactor the entire workflow to match a new workflow type. This action analyzes the current workflow and transforms it to a different type while preserving user intent.

COMMON REFACTORINGS:
1. Text-to-Image → Image-to-Image:
   - Replace text-to-image-node with image-to-image-node
   - Add image-frame or image-set input node before it
   - Preserve output nodes and prompts

2. Image-to-Image → Text-to-Image:
   - Replace image-to-image-node with text-to-image-node
   - Remove input image nodes if they become unnecessary
   - Preserve prompts and output nodes

3. Single processing → Multi-step pipeline:
   - Keep existing nodes
   - Add intermediate processing nodes
   - Connect sequentially

Use this when the user wants to fundamentally change the workflow type (e.g., "change this to an image-to-image workflow", "make this a text-to-image pipeline", "add image input to this workflow").`,
    parameters: [
      {
        name: "targetWorkflowType",
        type: "string",
        description: "The target workflow type: 'text-to-image', 'image-to-image', 'multi-step-processing', or describe the desired workflow structure",
        required: true,
      },
      {
        name: "preservePrompts",
        type: "boolean",
        description: "Whether to preserve existing prompts (default: true)",
        required: false,
      },
      {
        name: "preserveTitles",
        type: "boolean",
        description: "Whether to preserve existing node titles (default: true)",
        required: false,
      },
    ],
    render: ({ status, args, result }) => {
      if (status === "executing" || status === "inProgress") {
        return (
          <div className="flex flex-col gap-2 p-3 bg-violet-50 border border-violet-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full" />
              <span className="text-sm font-medium text-violet-700">
                Refactoring workflow to {args.targetWorkflowType}...
              </span>
            </div>
          </div>
        );
      }

      if (status === "complete") {
        return (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-700 whitespace-pre-line">
              ✓ {result}
            </div>
          </div>
        );
      }

      return <></>;
    },
    handler: async ({ targetWorkflowType, preservePrompts = true, preserveTitles = true }) => {
      const nodes = store.getNodes();
      const edges = store.getEdges();

      if (nodes.length === 0) {
        return "Canvas is empty. Use createWorkflow to create a new workflow first.";
      }

      takeSnapshot();

      const workflowType = targetWorkflowType.toLowerCase();
      let summary = "";

      // Text-to-Image → Image-to-Image refactoring
      if (workflowType.includes('image-to-image') || workflowType.includes('image2image')) {
        const textToImageNodes = nodes.filter(n => n.type === 'text-to-image-node');

        if (textToImageNodes.length === 0) {
          return "No text-to-image nodes found to convert. Current workflow may already be image-to-image.";
        }

        let nodesChanged = 0;
        let nodesAdded = 0;

        // Process each text-to-image node
        for (const oldNode of textToImageNodes) {
          // Check if there's already an input node before this
          const hasInputBefore = edges.some(e => {
            const sourceNode = nodes.find(n => n.id === e.source);
            return e.target === oldNode.id &&
                   (sourceNode?.type === 'image-frame' || sourceNode?.type === 'image-set');
          });

          // Create image-to-image node to replace text-to-image
          const newNodeId = store.addNodeByType('image-to-image-node', oldNode.position);

          if (newNodeId) {
            // Preserve data
            const currentNodes = store.getNodes();
            const updatedNodes = currentNodes.map(node => {
              if (node.id === newNodeId) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    ...(preservePrompts && oldNode.data?.prompt && { prompt: oldNode.data.prompt }),
                    ...(preserveTitles && oldNode.data?.title && { title: oldNode.data.title }),
                  },
                };
              }
              return node;
            });
            store.setNodes(updatedNodes);

            // Transfer outgoing connections
            const outgoingEdges = edges.filter(e => e.source === oldNode.id);
            const currentEdges = store.getEdges();
            let newEdges = currentEdges.filter(e => e.source !== oldNode.id && e.target !== oldNode.id);

            // Add input node if not present
            let inputNodeId: string | null = null;
            if (!hasInputBefore) {
              inputNodeId = store.addNodeByType('image-frame', {
                x: oldNode.position.x - 350,
                y: oldNode.position.y,
              });

              if (inputNodeId) {
                // Update input node title
                const nodes = store.getNodes();
                store.setNodes(nodes.map(n =>
                  n.id === inputNodeId
                    ? { ...n, data: { ...n.data, title: 'Input Image' } }
                    : n
                ));

                // Connect input to new image-to-image node
                newEdges.push({
                  id: `${inputNodeId}-${newNodeId}`,
                  source: inputNodeId,
                  target: newNodeId,
                  sourceHandle: null,
                  targetHandle: null,
                  type: 'default' as const,
                  animated: true,
                });
                nodesAdded++;
              }
            } else {
              // Transfer incoming connection
              const incomingEdges = edges.filter(e => e.target === oldNode.id);
              incomingEdges.forEach(edge => {
                newEdges.push({
                  ...edge,
                  id: `${edge.source}-${newNodeId}`,
                  target: newNodeId,
                });
              });
            }

            // Transfer outgoing connections
            outgoingEdges.forEach(edge => {
              newEdges.push({
                ...edge,
                id: `${newNodeId}-${edge.target}`,
                source: newNodeId,
              });
            });

            store.setEdges(newEdges);
            store.removeNode(oldNode.id);
            nodesChanged++;
          }
        }

        summary = `Refactored to Image-to-Image workflow:\n• Converted ${nodesChanged} text-to-image node(s) to image-to-image\n• Added ${nodesAdded} input image node(s)`;
      }
      // Image-to-Image → Text-to-Image refactoring
      else if (workflowType.includes('text-to-image') || workflowType.includes('text2image')) {
        const imageToImageNodes = nodes.filter(n => n.type === 'image-to-image-node');

        if (imageToImageNodes.length === 0) {
          return "No image-to-image nodes found to convert. Current workflow may already be text-to-image.";
        }

        let nodesChanged = 0;
        let nodesRemoved = 0;

        for (const oldNode of imageToImageNodes) {
          // Create text-to-image node
          const newNodeId = store.addNodeByType('text-to-image-node', oldNode.position);

          if (newNodeId) {
            // Preserve data
            const currentNodes = store.getNodes();
            const updatedNodes = currentNodes.map(node => {
              if (node.id === newNodeId) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    ...(preservePrompts && oldNode.data?.prompt && { prompt: oldNode.data.prompt }),
                    ...(preserveTitles && oldNode.data?.title && { title: oldNode.data.title }),
                  },
                };
              }
              return node;
            });
            store.setNodes(updatedNodes);

            // Get edges
            const incomingEdges = edges.filter(e => e.target === oldNode.id);
            const outgoingEdges = edges.filter(e => e.source === oldNode.id);

            let currentEdges = store.getEdges();
            let newEdges = currentEdges.filter(e => e.source !== oldNode.id && e.target !== oldNode.id);

            // Remove standalone input image nodes that only connected to this node
            for (const edge of incomingEdges) {
              const sourceNode = nodes.find(n => n.id === edge.source);
              if (sourceNode && (sourceNode.type === 'image-frame' || sourceNode.type === 'image-set')) {
                const sourceOutgoingEdges = edges.filter(e => e.source === sourceNode.id);
                const sourceIncomingEdges = edges.filter(e => e.target === sourceNode.id);

                // If this input node only connects to the node we're replacing and has no inputs
                if (sourceOutgoingEdges.length === 1 && sourceIncomingEdges.length === 0) {
                  store.removeNode(sourceNode.id);
                  newEdges = newEdges.filter(e => e.source !== sourceNode.id && e.target !== sourceNode.id);
                  nodesRemoved++;
                }
              }
            }

            // Transfer remaining outgoing connections
            outgoingEdges.forEach(edge => {
              newEdges.push({
                ...edge,
                id: `${newNodeId}-${edge.target}`,
                source: newNodeId,
              });
            });

            store.setEdges(newEdges);
            store.removeNode(oldNode.id);
            nodesChanged++;
          }
        }

        summary = `Refactored to Text-to-Image workflow:\n• Converted ${nodesChanged} image-to-image node(s) to text-to-image\n• Removed ${nodesRemoved} unnecessary input image node(s)`;
      }
      else {
        return `Unsupported workflow type: "${targetWorkflowType}". Supported types: "text-to-image", "image-to-image"`;
      }

      // Run layout to optimize
      await runLayout();

      // Fit view to show the entire workflow
      fitView({ duration: 300, padding: 0.2 });

      return summary;
    },
  });

  // Create workflow action - creates multiple nodes and connects them
  useCopilotAction({
    name: "createWorkflow",
    description: `Create a complete workflow by adding multiple nodes and connecting them. Use this action whenever the user wants to create connected nodes or a workflow pipeline.

EXAMPLE WORKFLOWS:
1. Simple image generation workflow:
   nodes: [
     { type: "text-to-image-node", prompt: "a beautiful sunset" },
     { type: "image-frame" }
   ]

2. Image transformation workflow:
   nodes: [
     { type: "image-frame", title: "Input Image" },
     { type: "image-to-image-node", prompt: "convert to cartoon style" },
     { type: "image-frame", title: "Output" }
   ]

3. Multi-step processing:
   nodes: [
     { type: "image-set", title: "Source Images" },
     { type: "image-to-image-node", prompt: "enhance quality" },
     { type: "image-to-image-node", prompt: "add artistic filter" },
     { type: "image-frame", title: "Final Result" }
   ]

Node types: 'image-frame' (single image input/output), 'image-set' (multiple images), 'text-to-image-node' (generate from text), 'image-to-image-node' (transform images)`,
    parameters: [
      {
        name: "nodes",
        type: "object[]",
        description: "Array of nodes to create in the workflow. Each node should specify its type and optional configuration.",
        required: true,
        attributes: [
          {
            name: "type",
            type: "string",
            description: "The type of node: 'image-frame' (single image input), 'image-set' (multiple images input), 'text-to-image-node' (text to image generation), 'image-to-image-node' (image transformation)",
            required: true,
          },
          {
            name: "title",
            type: "string",
            description: "The title/name for the node (optional, will use default if not provided)",
            required: false,
          },
          {
            name: "prompt",
            type: "string",
            description: "The prompt or instructions for action nodes (only for text-to-image-node and image-to-image-node)",
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
        description: "Horizontal spacing between nodes in auto-layout (default: 350)",
        required: false,
      },
    ],
    render: ({ status, args, result }) => {
      if (status === "executing" || status === "inProgress") {
        return (
          <div className="flex flex-col gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span className="text-sm font-medium text-blue-700">
                Creating workflow with {args.nodes?.length || 0} nodes...
              </span>
            </div>
            {args.nodes && args.nodes.length > 0 && (
              <div className="ml-6 text-xs text-blue-600 space-y-1">
                {args.nodes.map((node: any, i: number) => (
                  <div key={i}>
                    {i + 1}. {node.type}{node.title ? ` - ${node.title}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      if (status === "complete") {
        return (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-700 whitespace-pre-line">
              ✓ {result}
            </div>
          </div>
        );
      }

      return <></>;
    },
    handler: async ({ nodes, connectSequentially = true, startX = 100, startY = 100, spacing = 350 }) => {
      if (!nodes || nodes.length === 0) {
        return "No nodes provided to create workflow";
      }

      // Validate node types
      const validTypes = ['image-frame', 'image-set', 'text-to-image-node', 'image-to-image-node'];
      const invalidNodes = nodes.filter((n: any) => !validTypes.includes(n.type));
      if (invalidNodes.length > 0) {
        return `Invalid node type(s): ${invalidNodes.map((n: any) => n.type).join(', ')}. Valid types are: ${validTypes.join(', ')}`;
      }

      takeSnapshot();

      const createdNodeIds: string[] = [];
      const createdNodes: any[] = [];

      // Create all nodes first
      for (let i = 0; i < nodes.length; i++) {
        const nodeSpec = nodes[i];
        const position = {
          x: nodeSpec.x ?? (startX + i * spacing),
          y: nodeSpec.y ?? startY,
        };

        const nodeId = store.addNodeByType(nodeSpec.type as any, position);

        if (nodeId) {
          createdNodeIds.push(nodeId);
          createdNodes.push({
            id: nodeId,
            type: nodeSpec.type,
            title: nodeSpec.title,
            prompt: nodeSpec.prompt,
          });
        }
      }

      // Update node data for all created nodes
      const currentNodes = store.getNodes();
      const updatedNodes = currentNodes.map(node => {
        const createdNode = createdNodes.find(n => n.id === node.id);
        if (createdNode && (createdNode.title || createdNode.prompt)) {
          return {
            ...node,
            data: {
              ...node.data,
              ...(createdNode.title && { title: createdNode.title }),
              ...(createdNode.prompt && { prompt: createdNode.prompt }),
            },
          };
        }
        return node;
      });
      store.setNodes(updatedNodes);

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
        .map((n, i) => `${i + 1}. ${n.type}${n.title ? ` - "${n.title}"` : ''}`)
        .join('\n');

      const connectionInfo = connectSequentially && createdNodeIds.length > 1
        ? `\n\n✓ Connected ${createdNodeIds.length - 1} edge(s) sequentially`
        : '';

      // Run layout to optimize the workflow
      await runLayout();

      // Fit view to show the entire workflow
      fitView({ duration: 300, padding: 0.2 });

      return `Successfully created workflow with ${createdNodeIds.length} node(s):\n${summary}${connectionInfo}`;
    },
  });
}
