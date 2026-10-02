import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeTypes,
  type OnNodesChange,
  applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState } from "react";
import {
  ApprovalNode,
  CompletedNode,
  RejectedNode,
  StartNode,
} from "./WorkflowNodes";
import {
  applyConnection,
  applyNodePositions,
  stepsToFlow,
  type WorkflowCanvasNode,
  type WorkflowNodeData,
} from "./workflowGraph";
import type { WorkflowStepDefinition } from "@/types/workflow";

const nodeTypes: NodeTypes = {
  start: StartNode,
  approval: ApprovalNode,
  completed: CompletedNode,
  rejected: RejectedNode,
};

type WorkflowDesignerCanvasProps = {
  steps: WorkflowStepDefinition[];
  readOnly: boolean;
  onStepsChange: (steps: WorkflowStepDefinition[]) => void;
  onSelectStep: (stepId: string | null) => void;
  onMenuAction: NonNullable<WorkflowNodeData["onMenuAction"]>;
  selectedStepId: string | null;
};

function CanvasInner({
  steps,
  readOnly,
  onStepsChange,
  onSelectStep,
  onMenuAction,
  selectedStepId,
}: WorkflowDesignerCanvasProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [nodes, setNodes] = useState<WorkflowCanvasNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    const next = stepsToFlow(steps, { readOnly, onMenuAction });
    setNodes(
      next.nodes.map((node) => ({
        ...node,
        selected: node.id === selectedStepId,
      })),
    );
    setEdges(next.edges);
  }, [steps, readOnly, onMenuAction, selectedStepId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 200 });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [fitView, steps.length]);

  const onNodesChange: OnNodesChange<WorkflowCanvasNode> = (changes) => {
    setNodes((current) => {
      const next = applyNodeChanges(changes, current);
      const positionChanges = changes.some(
        (change) => change.type === "position" && change.dragging === false,
      );
      if (positionChanges && !readOnly) {
        onStepsChange(applyNodePositions(steps, next));
      }
      return next;
    });
  };

  const onConnect = (connection: Connection) => {
    if (readOnly || !connection.source || !connection.target) return;
    onStepsChange(
      applyConnection(steps, connection.source, connection.target, connection.sourceHandle),
    );
  };

  const api = useMemo(
    () => ({
      zoomIn: () => zoomIn({ duration: 150 }),
      zoomOut: () => zoomOut({ duration: 150 }),
      fitView: () => fitView({ padding: 0.2, duration: 200 }),
    }),
    [fitView, zoomIn, zoomOut],
  );

  useEffect(() => {
    (window as unknown as { __workflowCanvas?: typeof api }).__workflowCanvas = api;
    return () => {
      delete (window as unknown as { __workflowCanvas?: typeof api }).__workflowCanvas;
    };
  }, [api]);

  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-border bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onSelectionChange={({ nodes: selected }) => {
          onSelectStep(selected[0]?.id ?? null);
        }}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background
          id="workflow-dots"
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.4}
          color="var(--border)"
        />
      </ReactFlow>
    </div>
  );
}

export function WorkflowDesignerCanvas(props: WorkflowDesignerCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export function workflowCanvasControls() {
  return (window as unknown as { __workflowCanvas?: { zoomIn: () => void; zoomOut: () => void; fitView: () => void } })
    .__workflowCanvas;
}
