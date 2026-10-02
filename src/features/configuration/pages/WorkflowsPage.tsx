import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toErrorMessage } from "@/app/store/async/types";
import { toast } from "@/components/feedback/toast";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { IconButton } from "@/components/ui/IconButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRoles, useUsers } from "@/features/admin/hooks/useUsers";
import {
  useActivateWorkflowVersion,
  useApplyWorkflowDraft,
  useCreateWorkflowDraft,
  useDeleteWorkflowVersion,
  useResetWorkflowCatalog,
  useSaveWorkflowDraft,
} from "@/features/admin/hooks/useWorkflowsApi";
import { ApprovalLevelsDrawer } from "@/features/configuration/components/workflow-designer/ApprovalLevelsDrawer";
import { StageFlowCanvas } from "@/features/configuration/components/workflow-designer/StageFlowCanvas";
import { WorkflowDesignerToolbar } from "@/features/configuration/components/workflow-designer/WorkflowDesignerToolbar";
import {
  deleteApprovalLevel,
  isConfigurableStage,
  orderedStageSteps,
} from "@/features/configuration/components/workflow-designer/stageFlow";
import { usePermissions } from "@/hooks/usePermissions";
import { useWorkflowCatalog } from "@/hooks/useWorkflowConfig";
import { saveWorkflowCatalog } from "@/lib/workflow";
import { findSalesDefinition } from "@/lib/workflow/stages";
import { cn } from "@/lib/utils";
import type { Role, User } from "@/types/user";
import type {
  WorkflowApprovalLevel,
  WorkflowCatalog,
  WorkflowStepDefinition,
  WorkflowVersion,
} from "@/types/workflow";

function versionBadge(version: WorkflowVersion): {
  variant: "success" | "warning" | "neutral";
  label: string;
} {
  if (version.status === "draft") return { variant: "warning", label: "Draft" };
  if (version.isDefault) return { variant: "success", label: "In use" };
  return { variant: "neutral", label: "Earlier" };
}

function versionNote(version: WorkflowVersion): string {
  if (version.status === "draft") return "Not used until you publish it.";
  if (version.isDefault) return "New orders follow this version.";
  return "Only orders that already started on it.";
}

function resolveLevel(
  level: WorkflowApprovalLevel,
  roles: Role[],
  users: User[],
): WorkflowApprovalLevel {
  const roleNameKey = (level.assignedRoleName || "").trim().toLowerCase();
  const role =
    roles.find((item) => item.id === level.assignedRoleId) ??
    (roleNameKey
      ? roles.find((item) => item.name.trim().toLowerCase() === roleNameKey)
      : undefined);
  const roleId = role?.id ?? level.assignedRoleId ?? "";
  const userNameKey = (level.assignedUserName || "").trim().toLowerCase();
  const user =
    users.find((item) => item.id === level.assignedUserId) ??
    (userNameKey
      ? users.find(
          (item) =>
            item.displayName.trim().toLowerCase() === userNameKey &&
            (!roleId || item.roleId === roleId),
        )
      : undefined);

  return {
    ...level,
    assignedRoleId: roleId,
    assignedRoleName: role?.name ?? level.assignedRoleName,
    assignedUserId: user?.id ?? level.assignedUserId,
    assignedUserName: user?.displayName ?? level.assignedUserName,
  };
}

function resolveStep(step: WorkflowStepDefinition, roles: Role[], users: User[]): WorkflowStepDefinition {
  if (!step.approvalLevels?.length) return step;
  return {
    ...step,
    approvalLevels: step.approvalLevels.map((level) => resolveLevel(level, roles, users)),
  };
}

function draftIn(catalog: WorkflowCatalog, definitionId?: string): WorkflowVersion | null {
  return (
    catalog.versions.find(
      (item) => item.status === "draft" && item.workflowDefinitionId === definitionId,
    ) ?? null
  );
}

export function WorkflowsPage() {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("settings:edit");
  const { catalog, isLoading, isError, error, refetch } = useWorkflowCatalog();
  const createDraft = useCreateWorkflowDraft();
  const saveDraft = useSaveWorkflowDraft();
  const applyDraft = useApplyWorkflowDraft();
  const activateVersion = useActivateWorkflowVersion();
  const resetCatalog = useResetWorkflowCatalog();
  const deleteVersion = useDeleteWorkflowVersion();
  const { data: rolesData } = useRoles({ page: 1, pageSize: 100, status: "active" });
  const { data: usersData } = useUsers({ page: 1, pageSize: 100, status: "active" });

  const roles = useMemo(() => rolesData?.items ?? [], [rolesData?.items]);
  const users = useMemo(() => usersData?.items ?? [], [usersData?.items]);
  const definition = findSalesDefinition(catalog);
  const versions = [...catalog.versions]
    .filter((item) => item.workflowDefinitionId === definition?.id)
    .sort((left, right) => right.versionNumber - left.versionNumber);

  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<WorkflowVersion | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<WorkflowVersion | null>(null);
  const [levelToDelete, setLevelToDelete] = useState<{
    stageId: string;
    levelId: string;
    levelName: string;
  } | null>(null);

  const busy =
    createDraft.isPending ||
    saveDraft.isPending ||
    applyDraft.isPending ||
    activateVersion.isPending ||
    deleteVersion.isPending ||
    resetCatalog.isPending;

  const activeId = versions.some((item) => item.id === selectedId)
    ? selectedId
    : (versions.find((item) => item.status === "draft")?.id ??
      versions.find((item) => item.isDefault)?.id ??
      versions[0]?.id ??
      "");
  const selected =
    (draft && draft.id === activeId ? draft : versions.find((item) => item.id === activeId)) ??
    versions[0];
  const isEditing = selected?.status === "draft";
  const canActivate = Boolean(selected && !isEditing && !selected.isDefault);

  const displaySteps = useMemo(() => {
    if (!selected) return [];
    return selected.steps.map((step) => resolveStep(step, roles, users));
  }, [selected, roles, users]);

  const stages = orderedStageSteps(displaySteps);
  const selectedStage = stages.find((step) => step.id === selectedStageId) ?? null;
  const expandableIds = stages.filter(isConfigurableStage).map((step) => step.id);
  const allExpanded = expandableIds.length > 0 && expandableIds.every((id) => expandedIds.includes(id));

  useEffect(() => {
    if (!draft || roles.length === 0) return;
    const nextSteps = draft.steps.map((step) => resolveStep(step, roles, users));
    const changed = nextSteps.some((step, index) => {
      const current = draft.steps[index]?.approvalLevels ?? [];
      const next = step.approvalLevels ?? [];
      return next.some((level, levelIndex) => {
        const existing = current[levelIndex];
        return (
          level.assignedRoleId !== (existing?.assignedRoleId ?? "") ||
          (level.assignedUserId ?? "") !== (existing?.assignedUserId ?? "")
        );
      });
    });
    if (!changed) return;
    setDraft({ ...draft, steps: nextSteps });
  }, [draft, roles, users]);

  const rememberCatalog = (next: WorkflowCatalog, nextSelectedId?: string) => {
    saveWorkflowCatalog(next);
    const nextDraft = draftIn(next, definition?.id);
    setDraft(nextDraft && nextDraft.id === nextSelectedId ? structuredClone(nextDraft) : null);
    if (nextSelectedId) setSelectedId(nextSelectedId);
  };

  const updateDraftSteps = (steps: WorkflowStepDefinition[]) => {
    if (!selected || selected.status !== "draft") return;
    const next = {
      ...selected,
      steps,
      status: "draft" as const,
      isDefault: false,
    };
    setDraft(next);
    setSelectedId(next.id);
  };

  const handleEditFlow = async () => {
    if (!canEdit || !selected) return;
    try {
      const nextCatalog = await createDraft.mutateAsync(selected.id);
      const nextDraft = draftIn(nextCatalog, definition?.id);
      rememberCatalog(nextCatalog, nextDraft?.id);
      if (nextDraft) setDraft(structuredClone(nextDraft));
      toast.success("Draft ready to edit. The published version is unchanged.");
    } catch (err) {
      toast.error(toErrorMessage(err) || "Could not create draft.");
    }
  };

  const leaveDraft = () => {
    const published =
      versions.find((item) => item.isDefault) ??
      versions.find((item) => item.status !== "draft");
    setDraft(null);
    setSelectedStageId(null);
    setExpandedIds([]);
    setConfigOpen(false);
    setPublishOpen(false);
    setCancelOpen(false);
    if (published && published.id !== selected?.id) {
      setSelectedId(published.id);
    }
  };

  const handleCancelEdit = () => {
    if (!selected || selected.status !== "draft") return;
    const saved = versions.find((item) => item.id === selected.id);
    const savedSteps = (saved?.steps ?? []).map((step) => resolveStep(step, roles, users));
    const dirty =
      Boolean(draft) && JSON.stringify(draft?.steps ?? []) !== JSON.stringify(savedSteps);
    if (dirty) {
      setCancelOpen(true);
      return;
    }
    leaveDraft();
  };

  const handleSaveDraft = async () => {
    if (!selected || selected.status !== "draft") return;
    try {
      const nextCatalog = await saveDraft.mutateAsync({
        id: selected.id,
        steps: displaySteps,
      });
      rememberCatalog(nextCatalog, selected.id);
      toast.success("Draft saved.");
    } catch (err) {
      toast.error(toErrorMessage(err) || "Could not save draft.");
    }
  };

  const handlePublish = async () => {
    if (!selected || selected.status !== "draft") return;
    try {
      const nextCatalog = await applyDraft.mutateAsync({
        id: selected.id,
        steps: displaySteps,
      });
      rememberCatalog(nextCatalog, selected.id);
      setPublishOpen(false);
      toast.success("Workflow published for new orders.");
    } catch (err) {
      toast.error(toErrorMessage(err) || "Could not publish workflow.");
    }
  };

  const handleActivate = async () => {
    if (!selected) return;
    try {
      const nextCatalog = await activateVersion.mutateAsync(selected.id);
      rememberCatalog(nextCatalog, selected.id);
      setActivateOpen(false);
      toast.success("Version activated for new orders.");
    } catch (err) {
      toast.error(toErrorMessage(err) || "Could not activate version.");
    }
  };

  const handleDeleteVersion = async () => {
    if (!versionToDelete) return;
    try {
      const nextCatalog = await deleteVersion.mutateAsync(versionToDelete.id);
      rememberCatalog(nextCatalog);
      if (selectedId === versionToDelete.id) {
        setSelectedId("");
        setDraft(null);
        setConfigOpen(false);
      }
      setVersionToDelete(null);
      toast.success(`Deleted version ${versionToDelete.versionNumber}.`);
    } catch (err) {
      toast.error(toErrorMessage(err) || "Could not delete version.");
    }
  };

  const handleDeleteLevel = () => {
    if (!levelToDelete || !isEditing) return;
    updateDraftSteps(deleteApprovalLevel(displaySteps, levelToDelete.stageId, levelToDelete.levelId));
    setLevelToDelete(null);
    toast.success("Approval level removed. Save the draft to keep this change.");
  };

  const handleReset = async () => {
    try {
      const nextCatalog = await resetCatalog.mutateAsync();
      rememberCatalog(nextCatalog);
      setDraft(null);
      setSelectedId("");
      setExpandedIds([]);
      setResetOpen(false);
      toast.success("Workflow catalog reset.");
    } catch (err) {
      toast.error(toErrorMessage(err) || "Could not reset catalog.");
    }
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Sales Order Workflow"
        breadcrumbs={[
          { label: "Configuration", href: ROUTES.configuration.hub },
          { label: "Workflows" },
        ]}
        description="The full order lifecycle, with optional approval levels inside each stage. Publishing creates a new version for new orders. Running orders keep the version they started on."
        actions={
          canEdit ? (
            <Button variant="outline" size="sm" onClick={() => setResetOpen(true)} disabled={busy}>
              <RotateCcw className="h-4 w-4" />
              Reset defaults
            </Button>
          ) : null
        }
      />

      <PageContent
        isLoading={isLoading}
        error={isError ? (error ? toErrorMessage(error) : "Failed to load workflow catalog.") : null}
        onRetry={() => void refetch()}
      >
        {!definition ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            The sales order workflow is not in the catalog yet. Reload this page after the workflow catalog is available.
          </div>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside>
              <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Versions</h2>
                </div>
                <div>
                  {versions.map((version) => {
                    const badge = versionBadge(version);
                    const active = version.id === activeId;
                    return (
                      <div
                        key={version.id}
                        className={cn(
                          "flex items-center gap-1 border-b border-border last:border-b-0",
                          active ? "bg-muted" : "hover:bg-muted/40",
                        )}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 px-4 py-3 text-left"
                          onClick={() => {
                            setSelectedId(version.id);
                            setDraft(version.status === "draft" ? structuredClone(version) : null);
                            setSelectedStageId(null);
                            setExpandedIds([]);
                            setConfigOpen(false);
                          }}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground">
                              Version {version.versionNumber}
                            </span>
                            <StatusBadge variant={badge.variant} dot>
                              {badge.label}
                            </StatusBadge>
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {versionNote(version)}
                          </span>
                        </button>
                        {canEdit && !version.isDefault ? (
                          <IconButton
                            variant="ghost"
                            size="sm"
                            className="mr-2"
                            icon={<Trash2 className="h-4 w-4 text-destructive" />}
                            aria-label={`Delete version ${version.versionNumber}`}
                            disabled={busy}
                            onClick={() => setVersionToDelete(version)}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {canActivate && canEdit ? (
                  <div className="border-t border-border p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={busy}
                      onClick={() => setActivateOpen(true)}
                    >
                      Activate version
                    </Button>
                  </div>
                ) : null}
              </div>
            </aside>

            <section>
              <div className="flex h-[min(78vh,820px)] min-h-[560px] flex-col overflow-hidden rounded-md border border-border bg-card shadow-xs">
                <WorkflowDesignerToolbar
                  canEdit={canEdit}
                  busy={busy}
                  isEditing={Boolean(isEditing)}
                  expanded={allExpanded}
                  onToggleExpanded={() =>
                    setExpandedIds(allExpanded ? [] : expandableIds)
                  }
                  onCancel={handleCancelEdit}
                  onSaveDraft={() => void handleSaveDraft()}
                  onPublish={() => setPublishOpen(true)}
                  onEditFlow={() => void handleEditFlow()}
                />
                <div className="min-h-0 flex-1">
                  {selected ? (
                    <StageFlowCanvas
                      steps={displaySteps}
                      readOnly={!canEdit || !isEditing}
                      expandedIds={expandedIds}
                      selectedStageId={selectedStageId}
                      onSelectStage={setSelectedStageId}
                      onToggleStage={(stageId) =>
                        setExpandedIds((current) =>
                          current.includes(stageId)
                            ? current.filter((id) => id !== stageId)
                            : [...current, stageId],
                        )
                      }
                      onManageStage={(stageId) => {
                        setSelectedStageId(stageId);
                        setConfigOpen(true);
                      }}
                      onDeleteLevel={(stageId, levelId, levelName) =>
                        setLevelToDelete({ stageId, levelId, levelName })
                      }
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Select a workflow version to open the designer.
                    </div>
                  )}
                </div>
                <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                  Stages stay in business order. Approval levels are optional. Manage roles in{" "}
                  <Link className="underline" to={ROUTES.admin.roles}>
                    Role Management
                  </Link>
                  .
                </div>
              </div>
            </section>
          </div>
        )}
      </PageContent>

      <ApprovalLevelsDrawer
        open={configOpen && Boolean(selectedStage) && isConfigurableStage(selectedStage!)}
        stage={selectedStage}
        roles={roles}
        users={users}
        readOnly={!canEdit || !isEditing}
        onClose={() => setConfigOpen(false)}
        onLevelsChange={(levels) => {
          if (!selectedStage) return;
          updateDraftSteps(
            displaySteps.map((step) =>
              step.id === selectedStage.id ? { ...step, approvalLevels: levels } : step,
            ),
          );
        }}
      />

      <ConfirmationDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Discard unsaved changes?"
        description="Changes in this draft that have not been saved will be dropped. The last saved draft stays in the version list."
        confirmLabel="Discard"
        variant="danger"
        onConfirm={leaveDraft}
      />
      <ConfirmationDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title="Publish workflow?"
        description="This checks that the stages connect and that active approval levels have approvers. New orders use this version. Orders already in progress keep their current version."
        confirmLabel="Publish"
        onConfirm={() => void handlePublish()}
      />
      <ConfirmationDialog
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        title="Activate this version?"
        description="New orders will use this published version. Running orders are unchanged."
        confirmLabel="Activate"
        onConfirm={() => void handleActivate()}
      />
      <ConfirmationDialog
        open={Boolean(versionToDelete)}
        onClose={() => setVersionToDelete(null)}
        title="Delete this version?"
        description={
          versionToDelete
            ? `Version ${versionToDelete.versionNumber} will be removed. The version new orders use stays in place.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => void handleDeleteVersion()}
      />
      <ConfirmationDialog
        open={Boolean(levelToDelete)}
        onClose={() => setLevelToDelete(null)}
        title="Delete approval level?"
        description={
          levelToDelete
            ? `${levelToDelete.levelName} will be removed from this draft. The remaining levels stay in order.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteLevel}
      />
      <ConfirmationDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset workflow defaults?"
        description="This reseeds the sales order stage flow and the costing approval graph. Running orders keep the approval snapshot they already started with."
        confirmLabel="Reset"
        variant="danger"
        onConfirm={() => void handleReset()}
      />
    </PageContainer>
  );
}
