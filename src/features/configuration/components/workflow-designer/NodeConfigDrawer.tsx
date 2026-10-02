import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Textarea } from "@/components/ui/Textarea";
import type { Role, User } from "@/types/user";
import type { WorkflowStepDefinition } from "@/types/workflow";

type NodeConfigDrawerProps = {
  open: boolean;
  step: WorkflowStepDefinition | null;
  roles: Role[];
  users: User[];
  readOnly: boolean;
  onClose: () => void;
  onChange: (patch: Partial<WorkflowStepDefinition>) => void;
};

export function NodeConfigDrawer({
  open,
  step,
  roles,
  users,
  readOnly,
  onClose,
  onChange,
}: NodeConfigDrawerProps) {
  if (!step) return null;

  const isApproval = (step.nodeType ?? "approval") === "approval";
  const roleOptions = roles.map((role) => ({ value: role.id, label: role.name }));
  if (
    step.approvalRoleId &&
    step.approvalRoleName &&
    !roleOptions.some((option) => option.value === step.approvalRoleId)
  ) {
    roleOptions.push({ value: step.approvalRoleId, label: step.approvalRoleName });
  }

  const assigneeOptions = users
    .filter((user) => !step.approvalRoleId || user.roleId === step.approvalRoleId)
    .map((user) => ({
      value: user.id,
      label: `${user.displayName} · ${user.jobTitle || user.roleName}`,
    }));
  if (
    step.assigneeUserId &&
    !assigneeOptions.some((option) => option.value === step.assigneeUserId)
  ) {
    assigneeOptions.push({
      value: step.assigneeUserId,
      label: step.assigneeName || step.assigneeUserId,
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isApproval ? "Approval Step" : step.stepName || "Node"}
      size="sm"
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Step Name"
          value={step.stepName}
          disabled={readOnly || !isApproval}
          onChange={(event) => onChange({ stepName: event.target.value })}
        />
        <Textarea
          label="Description"
          value={step.description ?? ""}
          disabled={readOnly || !isApproval}
          rows={3}
          onChange={(event) => onChange({ description: event.target.value })}
        />
        {isApproval ? (
          <>
            <SearchableSelect
              label="Assign To (Role)"
              value={step.approvalRoleId}
              options={roleOptions}
              disabled={readOnly}
              onChange={(value) => {
                const role = roles.find((item) => item.id === value);
                onChange({
                  approvalRoleId: value,
                  approvalRoleName: role?.name ?? step.approvalRoleName,
                  stepName: step.stepName.trim() || role?.name || step.stepName,
                  assigneeUserId: "",
                  assigneeName: "",
                });
              }}
            />
            <SearchableSelect
              label="Assign To (User)"
              value={step.assigneeUserId ?? ""}
              options={assigneeOptions}
              disabled={readOnly || !step.approvalRoleId}
              onChange={(value) => {
                const user = users.find((item) => item.id === value);
                onChange({
                  assigneeUserId: value,
                  assigneeName: user?.displayName ?? "",
                });
              }}
            />
            <SearchableSelect
              label="Status"
              value={step.status || "active"}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              disabled={readOnly}
              onChange={(value) =>
                onChange({ status: value === "inactive" ? "inactive" : "active" })
              }
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Terminal nodes only mark the start or end of the approval path.
          </p>
        )}
      </div>
    </Drawer>
  );
}
