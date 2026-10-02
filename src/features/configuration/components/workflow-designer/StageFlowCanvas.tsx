import {
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type NodeTypes,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkflowStepDefinition } from "@/types/workflow";
import { isConfigurableStage, orderedStageSteps } from "./stageFlow";
import {
  LevelNode,
  ReturnedNode,
  StageNode,
  type StageFlowCanvasNode,
  type StageFlowNodeData,
} from "./StageFlowNodes";

const nodeTypes: NodeTypes = {
  stage: StageNode,
  level: LevelNode,
  returned: ReturnedNode,
};

type StageFlowCanvasProps = {
  steps: WorkflowStepDefinition[];
  readOnly: boolean;
  expandedIds: string[];
  selectedStageId: string | null;
  onSelectStage: (stageId: string) => void;
  onToggleStage: (stageId: string) => void;
  onManageStage: (stageId: string) => void;
  onDeleteLevel: (stageId: string, levelId: string, levelName: string) => void;
};

const LAYOUT = {
  stageX: 40,
  stageY: 56,
  stageGapX: 320,
  stageRowGap: 220,
  cardWidth: 268,
  levelGapY: 124,
  levelOffsetY: 148,
  returnedOffsetX: 300,
} as const;

function buildStageFlow(
  steps: WorkflowStepDefinition[],
  options: {
    readOnly: boolean;
    expandedIds: string[];
    selectedStageId: string | null;
    onToggleStage: (stageId: string) => void;
    onManageStage: (stageId: string) => void;
    onDeleteLevel: (stageId: string, levelId: string, levelName: string) => void;
  },
): { nodes: StageFlowCanvasNode[]; edges: Edge[] } {
  const stages = orderedStageSteps(steps);
  const expanded = new Set(options.expandedIds);
  const nodes: StageFlowCanvasNode[] = [];
  const edges: Edge[] = [];
  const perRow = Math.max(1, Math.ceil(stages.length / 2));

  const edgeBase = {
    type: "smoothstep" as const,
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
    style: {
      strokeWidth: 2,
      stroke: "var(--foreground)",
      strokeDasharray: "7 5",
    },
    labelBgStyle: { fill: "var(--card)" },
    labelBgPadding: [4, 6] as [number, number],
    labelBgBorderRadius: 4,
  };

  const activeLevels = (stage: WorkflowStepDefinition) =>
    expanded.has(stage.id) && isConfigurableStage(stage)
      ? [...(stage.approvalLevels ?? [])]
          .filter((level) => level.isActive)
          .sort((left, right) => left.sequence - right.sequence)
      : [];

  // Keep room under row 1 when any top-row stage is expanded.
  let row1Extra = 0;
  stages.slice(0, perRow).forEach((stage) => {
    const levels = activeLevels(stage);
    if (levels.length > 0) {
      row1Extra = Math.max(
        row1Extra,
        LAYOUT.levelOffsetY + levels.length * LAYOUT.levelGapY - 40,
      );
    }
  });

  const stagePositions = new Map<string, { x: number; y: number; row: number; col: number }>();
  stages.forEach((stage, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    stagePositions.set(stage.id, {
      x: LAYOUT.stageX + col * LAYOUT.stageGapX,
      y: LAYOUT.stageY + row * LAYOUT.stageRowGap + (row === 1 ? row1Extra : 0),
      row,
      col,
    });
  });

  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index]!;
    const nextStage = stages[index + 1];
    const position = stagePositions.get(stage.id)!;
    const levels = activeLevels(stage);
    const wrapsToNextRow =
      Boolean(nextStage) &&
      Math.floor(index / perRow) !== Math.floor((index + 1) / perRow);

    nodes.push({
      id: stage.id,
      type: "stage",
      position: { x: position.x, y: position.y },
      data: {
        kind: "stage",
        stage,
        expanded: levels.length > 0,
        readOnly: options.readOnly,
        onToggle: options.onToggleStage,
        onManage: options.onManageStage,
      },
      selected: stage.id === options.selectedStageId,
      draggable: false,
      selectable: true,
    });

    if (levels.length > 0) {
      const returnedId = `${stage.id}__returned`;
      nodes.push({
        id: returnedId,
        type: "returned",
        position: {
          x: position.x + LAYOUT.returnedOffsetX,
          y: position.y + LAYOUT.levelOffsetY + ((levels.length - 1) * LAYOUT.levelGapY) / 2,
        },
        data: { kind: "returned" },
        draggable: false,
        selectable: false,
      });

      let previousId = stage.id;
      let previousHandle = "source";

      levels.forEach((level, levelIndex) => {
        const levelId = `${stage.id}__level__${level.id}`;
        nodes.push({
          id: levelId,
          type: "level",
          position: {
            x: position.x,
            y: position.y + LAYOUT.levelOffsetY + levelIndex * LAYOUT.levelGapY,
          },
          data: {
            kind: "level",
            stage,
            level,
            readOnly: options.readOnly,
            onDeleteLevel: options.onDeleteLevel,
          },
          draggable: false,
          selectable: true,
        });

        edges.push({
          id: `${previousId}->${levelId}`,
          source: previousId,
          target: levelId,
          sourceHandle: previousHandle,
          targetHandle: "target",
          ...edgeBase,
          style: { ...edgeBase.style, stroke: "var(--foreground)" },
        });

        edges.push({
          id: `${levelId}->reject->${returnedId}`,
          source: levelId,
          target: returnedId,
          sourceHandle: "reject",
          targetHandle: "target",
          label: "Reject",
          ...edgeBase,
          style: {
            stroke: "var(--destructive)",
            strokeWidth: 2,
            strokeDasharray: "6 4",
          },
          labelStyle: { fill: "var(--destructive)", fontSize: 11, fontWeight: 600 },
        });

        previousId = levelId;
        previousHandle = "approve";
      });

      if (nextStage) {
        edges.push({
          id: `${previousId}->approve->${nextStage.id}`,
          source: previousId,
          target: nextStage.id,
          sourceHandle: previousHandle,
          targetHandle: "target",
          label: "Approve",
          ...edgeBase,
          style: { ...edgeBase.style, stroke: "var(--success)" },
          labelStyle: { fill: "var(--success)", fontSize: 11, fontWeight: 600 },
        });
      }
    } else if (nextStage) {
      edges.push({
        id: `${stage.id}->${nextStage.id}`,
        source: stage.id,
        target: nextStage.id,
        sourceHandle: wrapsToNextRow ? "source" : "next",
        targetHandle: "target",
        ...edgeBase,
        style: { ...edgeBase.style, stroke: "var(--foreground)" },
      });
    }
  }

  return { nodes, edges };
}

function CanvasInner(props: StageFlowCanvasProps) {
  const { fitView, zoomIn, zoomOut, getZoom } = useReactFlow();
  const [nodes, setNodes] = useState<StageFlowCanvasNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [zoomLabel, setZoomLabel] = useState("100%");
  const handlersRef = useRef({
    onToggleStage: props.onToggleStage,
    onManageStage: props.onManageStage,
    onDeleteLevel: props.onDeleteLevel,
  });

  handlersRef.current = {
    onToggleStage: props.onToggleStage,
    onManageStage: props.onManageStage,
    onDeleteLevel: props.onDeleteLevel,
  };

  const expandedKey = props.expandedIds.join("|");
  const stages = orderedStageSteps(props.steps);

  useEffect(() => {
    const next = buildStageFlow(props.steps, {
      readOnly: props.readOnly,
      expandedIds: props.expandedIds,
      selectedStageId: props.selectedStageId,
      onToggleStage: (stageId) => handlersRef.current.onToggleStage(stageId),
      onManageStage: (stageId) => handlersRef.current.onManageStage(stageId),
      onDeleteLevel: (stageId, levelId, levelName) =>
        handlersRef.current.onDeleteLevel(stageId, levelId, levelName),
    });
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [props.steps, props.readOnly, props.expandedIds, props.selectedStageId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 200 });
      setZoomLabel(`${Math.round(getZoom() * 100)}%`);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [fitView, getZoom, stages.length, expandedKey]);

  const onNodesChange: OnNodesChange<StageFlowCanvasNode> = (changes) => {
    setNodes((current) => applyNodeChanges(changes, current));
  };

  const api = useMemo(
    () => ({
      zoomIn: () => {
        void zoomIn({ duration: 150 });
        window.setTimeout(() => setZoomLabel(`${Math.round(getZoom() * 100)}%`), 160);
      },
      zoomOut: () => {
        void zoomOut({ duration: 150 });
        window.setTimeout(() => setZoomLabel(`${Math.round(getZoom() * 100)}%`), 160);
      },
      fitView: () => {
        void fitView({ padding: 0.2, duration: 200 });
        window.setTimeout(() => setZoomLabel(`${Math.round(getZoom() * 100)}%`), 220);
      },
      getZoomLabel: () => zoomLabel,
    }),
    [fitView, getZoom, zoomIn, zoomOut, zoomLabel],
  );

  useEffect(() => {
    (window as unknown as { __workflowCanvas?: typeof api }).__workflowCanvas = api;
    return () => {
      delete (window as unknown as { __workflowCanvas?: typeof api }).__workflowCanvas;
    };
  }, [api]);

  if (stages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        This version has no business stages to draw.
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-muted/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => {
          const data = node.data as StageFlowNodeData;
          if (data.stage) props.onSelectStage(data.stage.id);
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        fitView
        minZoom={0.35}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background
          id="stage-flow-dots"
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.2}
          color="var(--border)"
        />
      </ReactFlow>
    </div>
  );
}

export function StageFlowCanvas(props: StageFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export function workflowCanvasControls() {
  return (
    window as unknown as {
      __workflowCanvas?: {
        zoomIn: () => void;
        zoomOut: () => void;
        getZoomLabel: () => string;
      };
    }
  ).__workflowCanvas;
}
