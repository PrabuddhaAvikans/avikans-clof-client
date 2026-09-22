import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { IconButton } from "@/components/ui/IconButton";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Stepper, type StepItem } from "@/components/ui/Stepper";
import { useRoles, useUsers } from "@/features/admin/hooks/useUsers";
import { usePermissions } from "@/hooks/usePermissions";
import { useWorkflowCatalog } from "@/hooks/useWorkflowConfig";
import {
  workspaceGrid,
  workspaceGridCol,
  workspaceListPanelBody,
  workspaceListPanelShell,
  workspacePanelBody,
  workspacePanelShell,
} from "@/lib/panelLayout";
import {
  COSTING_APPROVAL_WORKFLOW_ID,
  activateWorkflowVersion,
  applyWorkflowDraft,
  createDraftFromVersion,
  createWorkflowStep,
  getDraftVersion,
  loadWorkflowCatalog,
  resetWorkflowCatalog,
} from "@/lib/workflow";
import { cn } from "@/lib/utils";
import type { Role, User } from "@/types/user";
import type { WorkflowStepDefinition, WorkflowVersion } from "@/types/workflow";

function versionBadge(version: WorkflowVersion): {
  variant: "success" | "warning" | "neutral";
  label: string;
} {
  if (version.isDefault) return { variant: "success", label: "Active" };
  if (version.status === "draft") return { variant: "warning", label: "Editing" };
  return { variant: "neutral", label: "Inactive" };
}

function previewSteps(version: WorkflowVersion): StepItem[] {
  return version.steps.map((step, index) => ({
    id: step.id,
    label: step.approvalRoleName || step.stepName || `Step ${index + 1}`,
    description: `${step.assigneeName?.trim() || "Unassigned"} · ${index === 0 ? "pending" : "waiting"}`,
    status: index === 0 ? "current" : "pending",
  }));
}

function assigneeOptionsForRole(roleId: string, users: User[], step: WorkflowStepDefinition) {
  const options = users
    .filter((user) => user.roleId === roleId)
    .map((user) => ({
      value: user.id,
      label: `${user.displayName} · ${user.jobTitle || user.roleName}`,
    }));
  if (step.assigneeUserId && !options.some((option) => option.value === step.assigneeUserId)) {
    const selected = users.find((user) => user.id === step.assigneeUserId);
    if (selected) {
      options.push({
        value: selected.id,
        label: `${selected.displayName} · ${selected.jobTitle || selected.roleName}`,
      });
    }
  }
  return options;
}

export function WorkflowsPage() {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("settings:edit");
  const { catalog, reload } = useWorkflowCatalog();
  const { data: rolesData } = useRoles({ page: 1, pageSize: 100, status: "active" });
  const { data: usersData } = useUsers({ page: 1, pageSize: 100, status: "active" });

  const roles = rolesData?.items ?? [];
  const users = usersData?.items ?? [];
  const definition =
    catalog.definitions.find((item) => item.id === COSTING_APPROVAL_WORKFLOW_ID) ??
    catalog.definitions[0];
  const versions = [...catalog.versions]
    .filter((item) => item.workflowDefinitionId === definition?.id)
    .sort((left, right) => right.versionNumber - left.versionNumber);

  const [selectedId, setSelectedId] = useState<string>(
    () => getDraftVersion()?.id ?? versions.find((item) => item.isDefault)?.id ?? versions[0]?.id ?? "",
  );
  const [draft, setDraft] = useState<WorkflowVersion | null>(getDraftVersion);
  const [applyOpen, setApplyOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const selected =
    (selectedId === draft?.id ? draft : versions.find((item) => item.id === selectedId)) ??
    draft ??
    versions[0];
  const isEditing = selected?.status === "draft";
  const canActivate = Boolean(selected && !isEditing && !selected.isDefault);

  const roleOptions = useMemo(
    () => roles.map((role: Role) => ({ value: role.id, label: role.name })),
    [roles],
  );

  const refreshLocal = (nextSelectedId?: string) => {
    const next = loadWorkflowCatalog();
    const nextDraft =
      next.versions.find(
        (item) =>
          item.status === "draft" && item.workflowDefinitionId === COSTING_APPROVAL_WORKFLOW_ID,
      ) ?? null;
    setDraft(nextDraft ? structuredClone(nextDraft) : null);
    if (nextSelectedId) setSelectedId(nextSelectedId);
    reload();
  };

  const updateDraft = (patch: Partial<WorkflowVersion>) => {
    if (!draft || !isEditing) return;
    setDraft({ ...draft, ...patch });
  };

  const updateStep = (stepId: string, patch: Partial<WorkflowStepDefinition>) => {
    if (!draft) return;
    updateDraft({
      steps: draft.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
    });
  };

  const handleRoleChange = (step: WorkflowStepDefinition, roleId: string) => {
    const role = roles.find((item) => item.id === roleId);
    const roleUsers = users.filter((user) => user.roleId === roleId);
    const keepAssignee = roleUsers.some((user) => user.id === step.assigneeUserId);
    updateStep(step.id, {
      approvalRoleId: roleId,
      approvalRoleName: role?.name ?? "",
      stepName: role?.name ?? step.stepName,
      assigneeUserId: keepAssignee ? step.assigneeUserId : "",
      assigneeName: keepAssignee ? step.assigneeName : "",
    });
  };

  const handleAssigneeChange = (stepId: string, userId: string) => {
    const user = users.find((item) => item.id === userId);
    updateStep(stepId, {
      assigneeUserId: user?.id ?? "",
      assigneeName: user?.displayName ?? "",
    });
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    if (!draft) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.steps.length) return;
    const steps = [...draft.steps];
    const [item] = steps.splice(index, 1);
    steps.splice(nextIndex, 0, item);
    updateDraft({ steps: steps.map((step, stepIndex) => ({ ...step, stepOrder: stepIndex + 1 })) });
  };

  const handleActivate = () => {
    const version = versions.find((item) => item.id === selectedId) ?? selected;
    if (!version || version.status === "draft") return;
    try {
      activateWorkflowVersion(version.id);
      setActivateOpen(false);
      toast.success(`Activated v${version.versionNumber} for new orders. Running orders are unchanged.`);
      refreshLocal(version.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not activate this flow");
    }
  };

  const handleEditFlow = () => {
    if (selected?.status === "draft") {
      setDraft(structuredClone(selected));
      setSelectedId(selected.id);
      toast.success("Edit the steps, then Apply.");
      return;
    }
    const sourceId = selected?.id ?? versions.find((item) => item.isDefault)?.id;
    if (!sourceId) return;
    try {
      const created = createDraftFromVersion(sourceId);
      setDraft(created);
      setSelectedId(created.id);
      toast.success("Edit the flow, then Apply. Running orders keep their current version.");
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start editing");
    }
  };

  const handleApply = () => {
    if (!draft) return;
    try {
      applyWorkflowDraft(draft);
      setApplyOpen(false);
      toast.success(`Applied v${draft.versionNumber} to new orders. In-progress orders are unchanged.`);
      refreshLocal(draft.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not apply the flow");
    }
  };

  const handleReset = () => {
    resetWorkflowCatalog();
    setResetOpen(false);
    toast.success("Restored the initial costing approval flow.");
    refreshLocal();
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Costing Approval Workflow"
        description="Activate any old or new version for new orders. Edit a flow, then Apply to create a new version. Running orders keep the version they started with."
        breadcrumbs={[
          { label: "Configuration", href: ROUTES.configuration.hub },
          { label: "Workflows" },
        ]}
        actions={
          canEdit ? (
            <>
              <Button
                variant="outline"
                leftIcon={<RotateCcw className="h-4 w-4" />}
                onClick={() => setResetOpen(true)}
              >
                Reset defaults
              </Button>
              <Button
                variant="outline"
                leftIcon={<Pencil className="h-4 w-4" />}
                onClick={handleEditFlow}
              >
                Edit flow
              </Button>
              <Button
                variant="outline"
                leftIcon={<Check className="h-4 w-4" />}
                disabled={!canActivate}
                onClick={() => setActivateOpen(true)}
              >
                Activate
              </Button>
              <Button
                leftIcon={<Check className="h-4 w-4" />}
                disabled={!isEditing}
                onClick={() => setApplyOpen(true)}
              >
                Apply
              </Button>
            </>
          ) : undefined
        }
      />

      <div className={workspaceGrid}>
        <div className={cn(workspaceGridCol, "lg:col-span-3")}>
          <div className={workspaceListPanelShell}>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Flow versions</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Previous versions stay available to activate for new orders.
              </p>
            </div>
            <div className={workspaceListPanelBody}>
              <ul className="divide-y divide-border">
                {versions.map((version) => {
                  const badge = versionBadge(version);
                  const active = selected?.id === version.id;
                  const showActivate =
                    canEdit && !version.isDefault && version.status !== "draft";
                  return (
                    <li key={version.id}>
                      <div
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50",
                          active && "bg-primary/5 hover:bg-primary/5",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(version.id);
                            if (version.status === "draft") {
                              setDraft(structuredClone(version));
                            }
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block text-sm font-medium text-foreground">
                            v{version.versionNumber}
                            {version.isDefault ? " · current" : ""}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {version.steps.length} step{version.steps.length === 1 ? "" : "s"}
                          </span>
                        </button>
                        <StatusBadge size="sm" variant={badge.variant}>
                          {badge.label}
                        </StatusBadge>
                        {showActivate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedId(version.id);
                              setActivateOpen(true);
                            }}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <div className={cn(workspaceGridCol, "lg:col-span-5")}>
          {selected && (
            <div className={workspacePanelShell}>
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">
                  {definition?.name} v{selected.versionNumber}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isEditing
                    ? "Change the steps, then Apply to create and activate this new flow."
                    : selected.isDefault
                      ? "This is the active flow for new orders. Use Edit flow to create a new version."
                      : "This flow is inactive. Activate it for new orders, or Edit flow to create a new version."}{" "}
                  Roles come from{" "}
                  <Link to={ROUTES.admin.roles} className="text-primary hover:underline">
                    role management
                  </Link>
                  .
                </p>
              </div>
              <div className={workspacePanelBody}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Approval steps
                  </h3>
                  {canEdit && isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() =>
                        updateDraft({
                          steps: [
                            ...selected.steps,
                            createWorkflowStep({ stepOrder: selected.steps.length + 1 }),
                          ],
                        })
                      }
                    >
                      Add step
                    </Button>
                  )}
                  {canEdit && canActivate && (
                    <Button size="sm" onClick={() => setActivateOpen(true)}>
                      Activate
                    </Button>
                  )}
                </div>

                <ol className="space-y-2">
                  {selected.steps.map((step, index) => (
                    <li key={step.id} className="rounded-md border border-border bg-muted/20 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Step {index + 1}
                        </p>
                        {canEdit && isEditing && (
                          <div className="flex items-center gap-1">
                            <IconButton
                              size="sm"
                              variant="ghost"
                              icon={<ArrowUp className="h-4 w-4" />}
                              aria-label="Move up"
                              disabled={index === 0}
                              onClick={() => moveStep(index, -1)}
                            />
                            <IconButton
                              size="sm"
                              variant="ghost"
                              icon={<ArrowDown className="h-4 w-4" />}
                              aria-label="Move down"
                              disabled={index === selected.steps.length - 1}
                              onClick={() => moveStep(index, 1)}
                            />
                            <IconButton
                              size="sm"
                              variant="ghost"
                              icon={<Trash2 className="h-4 w-4" />}
                              aria-label="Remove step"
                              disabled={selected.steps.length <= 1}
                              onClick={() =>
                                updateDraft({
                                  steps: selected.steps.filter((item) => item.id !== step.id),
                                })
                              }
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <SearchableSelect
                          label="Role"
                          required
                          value={step.approvalRoleId}
                          options={roleOptions}
                          disabled={!canEdit || !isEditing}
                          placeholder="Select a role"
                          hint="From Administration → Roles"
                          onChange={(value) => handleRoleChange(step, value)}
                        />
                        <SearchableSelect
                          label="Assignee"
                          value={step.assigneeUserId ?? ""}
                          options={assigneeOptionsForRole(step.approvalRoleId, users, step)}
                          disabled={!canEdit || !isEditing || !step.approvalRoleId}
                          placeholder="Select a user with this role"
                          clearable
                          onChange={(value) => handleAssigneeChange(step.id, value)}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>

        <div className={cn(workspaceGridCol, "lg:col-span-4")}>
          <div className={workspacePanelShell}>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Preview</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Copied onto an order when it is submitted for approval.
              </p>
            </div>
            <div className={workspacePanelBody}>
              {selected ? <Stepper steps={previewSteps(selected)} orientation="vertical" /> : null}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onConfirm={handleApply}
        title="Apply this new flow?"
        description="This publishes the edited steps as a new version and activates it for new orders. Orders already in approval keep their current version."
        confirmLabel="Apply"
      />
      <ConfirmationDialog
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        onConfirm={handleActivate}
        title={`Activate v${selected?.versionNumber ?? ""}?`}
        description="New orders will use this version. Orders already in approval keep their current version."
        confirmLabel="Activate"
      />
      <ConfirmationDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        title="Restore the initial flow?"
        description="This restores the original 3-step costing approval. Running orders are not migrated."
        confirmLabel="Reset"
        variant="danger"
      />
    </PageContainer>
  );
}
