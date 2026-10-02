import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Drawer } from "@/components/ui/Drawer";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import type { Role, User } from "@/types/user";
import type { WorkflowApprovalLevel, WorkflowStepDefinition } from "@/types/workflow";
import { createApprovalLevel, renumberLevels } from "./stageFlow";

type ApprovalLevelsDrawerProps = {
  open: boolean;
  stage: WorkflowStepDefinition | null;
  roles: Role[];
  users: User[];
  readOnly: boolean;
  onClose: () => void;
  onLevelsChange: (levels: WorkflowApprovalLevel[]) => void;
};

type LevelDraft = {
  id?: string;
  name: string;
  assignedRoleId: string;
  assignedUserId: string;
  description: string;
  isActive: boolean;
};

const emptyDraft = (): LevelDraft => ({
  name: "",
  assignedRoleId: "",
  assignedUserId: "",
  description: "",
  isActive: true,
});

export function ApprovalLevelsDrawer({
  open,
  stage,
  roles,
  users,
  readOnly,
  onClose,
  onLevelsChange,
}: ApprovalLevelsDrawerProps) {
  const [draft, setDraft] = useState<LevelDraft | null>(null);
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDraft(null);
      setFormError("");
      setDeleteId(null);
    }
  }, [open, stage?.id]);

  if (!stage) return null;

  const levels = [...(stage.approvalLevels ?? [])].sort((left, right) => left.sequence - right.sequence);
  const roleOptions = roles.map((role) => ({ value: role.id, label: role.name }));
  const userOptions = users
    .filter((user) => !draft?.assignedRoleId || user.roleId === draft.assignedRoleId)
    .map((user) => ({
      value: user.id,
      label: `${user.displayName} · ${user.jobTitle || user.roleName}`,
    }));

  const startCreate = () => {
    setFormError("");
    setDraft(emptyDraft());
  };

  const startEdit = (level: WorkflowApprovalLevel) => {
    setFormError("");
    setDraft({
      id: level.id,
      name: level.name,
      assignedRoleId: level.assignedRoleId,
      assignedUserId: level.assignedUserId ?? "",
      description: level.description ?? "",
      isActive: level.isActive,
    });
  };

  const saveDraft = () => {
    if (!draft) return;
    const name = draft.name.trim();
    const role = roles.find((item) => item.id === draft.assignedRoleId);
    const user = users.find((item) => item.id === draft.assignedUserId);
    if (!name) {
      setFormError("Level name is required.");
      return;
    }
    if (!role) {
      setFormError("Select a role.");
      return;
    }

    const next = createApprovalLevel({
      id: draft.id,
      name,
      assignedRoleId: role.id,
      assignedRoleName: role.name,
      assignedUserId: user?.id,
      assignedUserName: user?.displayName,
      description: draft.description.trim() || undefined,
      isActive: draft.isActive,
      sequence: draft.id
        ? levels.find((item) => item.id === draft.id)?.sequence
        : levels.length + 1,
    });

    const updated = draft.id
      ? levels.map((item) => (item.id === draft.id ? { ...next, id: draft.id } : item))
      : [...levels, next];
    onLevelsChange(renumberLevels(updated));
    setDraft(null);
    setFormError("");
  };

  const move = (levelId: string, direction: -1 | 1) => {
    const index = levels.findIndex((item) => item.id === levelId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= levels.length) return;
    const reordered = [...levels];
    const [item] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, item);
    onLevelsChange(renumberLevels(reordered));
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={`${stage.stepName} Approval Levels`}
        size="md"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Approve moves to the next level. Reject returns this stage for correction. Inactive levels are skipped.
            {readOnly
              ? " This published version is locked. Edit the flow to create a draft."
              : " Save the workflow draft to keep these changes on this version only."}
          </p>

          {levels.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              No approval levels. This stage can move on without approval.
            </div>
          ) : (
            <ol className="space-y-2">
              {levels.map((level, index) => (
                <li
                  key={level.id}
                  className="rounded-lg border border-border bg-card px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-card-foreground">
                        {index + 1}. {level.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {level.assignedUserName || level.assignedRoleName || "Unassigned"}
                        {level.isActive ? "" : " · Inactive"}
                      </div>
                    </div>
                    {readOnly ? null : (
                      <div className="flex items-center gap-1">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          aria-label="Move approval level up"
                          icon={<ChevronUp className="h-4 w-4" />}
                          disabled={index === 0}
                          onClick={() => move(level.id, -1)}
                        />
                        <IconButton
                          size="sm"
                          variant="ghost"
                          aria-label="Move approval level down"
                          icon={<ChevronDown className="h-4 w-4" />}
                          disabled={index === levels.length - 1}
                          onClick={() => move(level.id, 1)}
                        />
                        <Button size="sm" variant="ghost" onClick={() => startEdit(level)}>
                          Edit
                        </Button>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          aria-label="Delete approval level"
                          icon={<Trash2 className="h-4 w-4 text-destructive" />}
                          onClick={() => setDeleteId(level.id)}
                        />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {readOnly ? null : (
            <Button size="sm" variant="outline" onClick={startCreate}>
              <Plus className="h-4 w-4" />
              Add Approval Level
            </Button>
          )}

          {draft && !readOnly ? (
            <form
              className="space-y-3 rounded-lg border border-border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                saveDraft();
              }}
            >
              <div className="text-sm font-semibold text-card-foreground">
                {draft.id ? "Edit approval level" : "Approval Level"}
              </div>
              <Input
                label="Level Name"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
              <SearchableSelect
                label="Assign To"
                value={draft.assignedRoleId}
                options={roleOptions}
                placeholder="Select a role"
                onChange={(value) =>
                  setDraft({
                    ...draft,
                    assignedRoleId: value,
                    assignedUserId: "",
                  })
                }
              />
              <SearchableSelect
                label="Assigned user"
                value={draft.assignedUserId}
                options={userOptions}
                placeholder="Optional"
                clearable
                disabled={!draft.assignedRoleId}
                onChange={(value) => setDraft({ ...draft, assignedUserId: value })}
              />
              <Textarea
                label="Description"
                value={draft.description}
                rows={3}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
              <Switch
                label="Active"
                checked={draft.isActive}
                onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
              />
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          ) : null}
        </div>
      </Drawer>

      <ConfirmationDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Delete approval level?"
        description="The remaining levels stay in order. This draft version is the only one that changes."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (!deleteId) return;
          onLevelsChange(renumberLevels(levels.filter((item) => item.id !== deleteId)));
          if (draft?.id === deleteId) setDraft(null);
          setDeleteId(null);
        }}
      />
    </>
  );
}
