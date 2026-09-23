import { ChevronDown, ChevronRight, Plus, Trash2, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Switch } from "@/components/ui/Switch";
import {
  CONTRIBUTION_TOTAL,
  allocateByShares,
  contributionTotal,
  quantityTotal,
  roundPercent,
  splitContributionEqually,
} from "@/lib/taskContributors";
import { cn } from "@/lib/utils";
import type { ManufacturingTask } from "@/types/manufacturing";

export type UserOption = { id: string; name: string };

export type ContributorDraft = {
  userId: string;
  userName: string;
  contributionPercent: string;
  quantity: string;
  progressPercentage: string;
  rejectedQuantity: string;
  wasteQuantity: string;
  actualHours: string;
  normalOvertimeHours: string;
  doubleOvertimeHours: string;
  sharedUnitNos: string;
};

type Props = {
  users: UserOption[];
  value: ContributorDraft[];
  onChange: (next: ContributorDraft[]) => void;
  task: Pick<ManufacturingTask, "estimatedHours" | "labourCostRate" | "plannedQuantity">;
  remainingQuantity: number;
  remainingHours: number;
  openUnitNos?: number[];
  requireTotal?: boolean;
  separateQuantities?: boolean;
};

function emptyDraft(userId = "", userName = ""): ContributorDraft {
  return {
    userId,
    userName,
    contributionPercent: String(CONTRIBUTION_TOTAL),
    quantity: "",
    progressPercentage: String(CONTRIBUTION_TOTAL),
    rejectedQuantity: "",
    wasteQuantity: "",
    actualHours: "",
    normalOvertimeHours: "",
    doubleOvertimeHours: "",
    sharedUnitNos: "",
  };
}

function numericDraft(value?: number) {
  return value != null && value !== 0 ? String(value) : value === 0 ? "0" : "";
}

export function draftsFromUsers(
  userIds: string[],
  users: UserOption[],
  previous: ContributorDraft[] = [],
): ContributorDraft[] {
  const prevById = new Map(previous.map((person) => [person.userId, person]));
  return userIds.map((userId) => {
    const prev = prevById.get(userId);
    const user = users.find((item) => item.id === userId);
    return {
      ...emptyDraft(userId, user?.name ?? prev?.userName ?? userId),
      ...prev,
      userId,
      userName: user?.name ?? prev?.userName ?? userId,
    };
  });
}

export function draftsFromInputs(
  inputs: Array<{
    userId: string;
    userName: string;
    contributionPercent?: number;
    quantity?: number;
    progressPercentage?: number;
    rejectedQuantity?: number;
    wasteQuantity?: number;
    actualHours?: number;
    normalOvertimeHours?: number;
    doubleOvertimeHours?: number;
    unitNos?: number[];
  }>,
): ContributorDraft[] {
  return inputs.map((person) => ({
    userId: person.userId,
    userName: person.userName,
    contributionPercent: numericDraft(person.contributionPercent ?? CONTRIBUTION_TOTAL),
    quantity: numericDraft(person.quantity),
    progressPercentage: numericDraft(person.progressPercentage ?? CONTRIBUTION_TOTAL),
    rejectedQuantity: numericDraft(person.rejectedQuantity),
    wasteQuantity: numericDraft(person.wasteQuantity),
    actualHours: numericDraft(person.actualHours),
    normalOvertimeHours: numericDraft(person.normalOvertimeHours),
    doubleOvertimeHours: numericDraft(person.doubleOvertimeHours),
    sharedUnitNos: person.unitNos?.length ? person.unitNos.join(",") : "",
  }));
}

function draftNumber(value: string) {
  return value === "" ? 0 : Number(value);
}

function parseSharedUnitNos(value: string): number[] | undefined {
  const nos = value
    .split(/[,\s]+/)
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.floor(n));
  return nos.length ? [...new Set(nos)] : undefined;
}

function balanceSeparate(
  people: ContributorDraft[],
  remainingQuantity: number,
  remainingHours: number,
): ContributorDraft[] {
  if (!people.length) return people;
  const quantities = allocateByShares(
    remainingQuantity,
    people.map(() => 1),
  );
  const hours = allocateByShares(
    remainingHours,
    people.map(() => 1),
  );
  return people.map((person, index) => ({
    ...person,
    contributionPercent: String(CONTRIBUTION_TOTAL),
    quantity: String(quantities[index] ?? 0),
    progressPercentage: person.progressPercentage || String(CONTRIBUTION_TOTAL),
    actualHours: String(hours[index] ?? 0),
    sharedUnitNos: "",
  }));
}

function balanceTogether(
  people: ContributorDraft[],
  remainingQuantity: number,
  remainingHours: number,
  openUnitNos: number[],
): ContributorDraft[] {
  if (!people.length) return people;
  const percents = splitContributionEqually(people.length);
  const hours = allocateByShares(remainingHours, percents);
  const sharedQty = Math.min(remainingQuantity, openUnitNos.length || remainingQuantity);
  const sharedNos = (openUnitNos.length
    ? openUnitNos
    : Array.from({ length: sharedQty }, (_, i) => i + 1)
  )
    .slice(0, sharedQty)
    .join(",");
  return people.map((person, index) => ({
    ...person,
    contributionPercent: String(percents[index] ?? 0),
    quantity: index === 0 ? String(sharedQty) : "0",
    progressPercentage: person.progressPercentage || String(CONTRIBUTION_TOTAL),
    actualHours: String(hours[index] ?? 0),
    sharedUnitNos: sharedNos,
  }));
}

export function parsedContributorInputs(drafts: ContributorDraft[]) {
  return drafts
    .filter((person) => person.userId)
    .map((person) => ({
      userId: person.userId,
      userName: person.userName,
      contributionPercent: draftNumber(person.contributionPercent),
      quantity: draftNumber(person.quantity),
      progressPercentage: draftNumber(person.progressPercentage),
      rejectedQuantity: draftNumber(person.rejectedQuantity),
      wasteQuantity: draftNumber(person.wasteQuantity),
      actualHours: person.actualHours === "" ? undefined : Number(person.actualHours),
      normalOvertimeHours:
        person.normalOvertimeHours === "" ? undefined : Number(person.normalOvertimeHours),
      doubleOvertimeHours:
        person.doubleOvertimeHours === "" ? undefined : Number(person.doubleOvertimeHours),
      unitNos: parseSharedUnitNos(person.sharedUnitNos),
    }));
}

export function TaskContributorsEditor({
  users,
  value,
  onChange,
  remainingQuantity,
  remainingHours,
  openUnitNos = [],
  requireTotal = true,
}: Props) {
  const sharedMode = value.some((person) => person.sharedUnitNos.trim().length > 0);
  const [labourOpen, setLabourOpen] = useState(false);

  const parsed = parsedContributorInputs(value);
  const qtyTotal = sharedMode
    ? draftNumber(value[0]?.quantity ?? "")
    : quantityTotal(parsed);
  const percentTotal = contributionTotal(parsed);
  const quantityOk = !requireTotal || qtyTotal - remainingQuantity <= 0.05;
  const finishedCount = sharedMode
    ? draftNumber(value[0]?.progressPercentage ?? "0") >= 100
      ? qtyTotal
      : 0
    : parsed.reduce(
        (sum, person) =>
          sum + (person.progressPercentage >= 100 ? Math.floor(person.quantity || 0) : 0),
        0,
      );

  const updatePerson = (index: number, patch: Partial<ContributorDraft>) => {
    onChange(value.map((person, i) => (i === index ? { ...person, ...patch } : person)));
  };

  const addPerson = () => {
    const used = new Set(value.map((person) => person.userId));
    const next = users.find((user) => !used.has(user.id)) ?? users[0];
    if (!next) return;
    const nextPeople = [...value, emptyDraft(next.id, next.name)];
    onChange(
      sharedMode
        ? balanceTogether(nextPeople, remainingQuantity, remainingHours, openUnitNos)
        : balanceSeparate(nextPeople, remainingQuantity, remainingHours),
    );
  };

  const removePerson = (index: number) => {
    const nextPeople = value.filter((_, i) => i !== index);
    onChange(
      sharedMode
        ? balanceTogether(nextPeople, remainingQuantity, remainingHours, openUnitNos)
        : nextPeople,
    );
  };

  const setSharedQuantity = (qty: string) => {
    const count = Math.max(0, Math.min(remainingQuantity, Math.floor(Number(qty) || 0)));
    const pool = openUnitNos.length
      ? openUnitNos
      : Array.from({ length: remainingQuantity }, (_, i) => i + 1);
    const nos = pool.slice(0, count).join(",");
    const percents = splitContributionEqually(Math.max(1, value.length));
    onChange(
      value.map((person, index) => ({
        ...person,
        quantity: index === 0 ? String(count) : "0",
        sharedUnitNos: nos,
        contributionPercent: String(percents[index] ?? CONTRIBUTION_TOTAL),
      })),
    );
  };

  const setSharedFinished = (finished: boolean) => {
    onChange(
      value.map((person) => ({
        ...person,
        progressPercentage: finished ? "100" : "50",
      })),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">Workforce allocation</p>
        </div>
        <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5">
          <ModeChip
            active={!sharedMode}
            onClick={() =>
              onChange(balanceSeparate(value, remainingQuantity, remainingHours))
            }
          >
            Separate qty
          </ModeChip>
          <ModeChip
            active={sharedMode}
            onClick={() =>
              onChange(
                balanceTogether(value, remainingQuantity, remainingHours, openUnitNos),
              )
            }
          >
            Shared qty
          </ModeChip>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {sharedMode
          ? "Multiple workers contribute to the same physical pieces. Save progress anytime; shares must total 100% to complete."
          : "Each worker owns their own pieces. Quantity cannot exceed open pieces."}
      </p>

      {sharedMode && (
        <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-3 sm:grid-cols-3">
          <Input
            label="Shared quantity"
            type="number"
            min={0}
            max={remainingQuantity}
            value={value[0]?.quantity ?? ""}
            onChange={(event) => setSharedQuantity(event.target.value)}
            hint={`Open ${remainingQuantity}`}
          />
          <div className="flex items-end pb-1 sm:col-span-2">
            <Switch
              label="Mark shared quantity finished"
              description="Sets all shared pieces to 100%"
              checked={draftNumber(value[0]?.progressPercentage ?? "0") >= 100}
              onChange={(event) => setSharedFinished(event.target.checked)}
            />
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Worker</th>
                {!sharedMode && <th className="w-24 px-2 py-2.5">Qty</th>}
                {sharedMode && <th className="w-24 px-2 py-2.5">Share %</th>}
                {!sharedMode && <th className="w-36 px-2 py-2.5">Outcome</th>}
                <th className="w-20 px-2 py-2.5 text-right">Hours</th>
                {labourOpen && (
                  <>
                    <th className="w-16 px-2 py-2.5 text-right">OT</th>
                    <th className="w-16 px-2 py-2.5 text-right">DOT</th>
                    <th className="w-16 px-2 py-2.5 text-right">Reject</th>
                    <th className="w-16 px-2 py-2.5 text-right">Waste</th>
                  </>
                )}
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {value.length === 0 ? (
                <tr>
                  <td
                    colSpan={labourOpen ? 9 : 5}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    No workers assigned. Add a worker to record progress.
                  </td>
                </tr>
              ) : (
                value.map((person, index) => {
                  const finished = draftNumber(person.progressPercentage) >= 100;
                  return (
                    <tr
                      key={`${person.userId}-${index}`}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2">
                        <Select
                          selectClassName="h-8 px-2 pr-8 text-xs"
                          value={person.userId}
                          onChange={(event) => {
                            const user = users.find((item) => item.id === event.target.value);
                            updatePerson(index, {
                              userId: event.target.value,
                              userName: user?.name ?? event.target.value,
                            });
                          }}
                          options={[
                            ...users.map((user) => ({ value: user.id, label: user.name })),
                            ...(!person.userId ||
                            users.some((user) => user.id === person.userId)
                              ? []
                              : [
                                  {
                                    value: person.userId,
                                    label: person.userName || person.userId,
                                  },
                                ]),
                          ]}
                        />
                      </td>
                      {!sharedMode && (
                        <td className="px-2 py-2">
                          <Input
                            size="sm"
                            type="number"
                            min={0}
                            max={remainingQuantity}
                            value={person.quantity}
                            onChange={(event) =>
                              updatePerson(index, { quantity: event.target.value })
                            }
                            inputClassName="h-8 px-1.5 text-xs tabular-nums"
                          />
                        </td>
                      )}
                      {sharedMode && (
                        <td className="px-2 py-2">
                          <Input
                            size="sm"
                            type="number"
                            min={0}
                            max={100}
                            value={person.contributionPercent}
                            onChange={(event) =>
                              updatePerson(index, {
                                contributionPercent: event.target.value,
                              })
                            }
                            inputClassName="h-8 px-1.5 text-xs tabular-nums"
                          />
                        </td>
                      )}
                      {!sharedMode && (
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2"
                            onClick={() =>
                              updatePerson(index, {
                                progressPercentage: finished ? "50" : "100",
                              })
                            }
                          >
                            <StatusBadge
                              variant={finished ? "success" : "warning"}
                              size="sm"
                            >
                              {finished ? "Finished" : "In progress"}
                            </StatusBadge>
                          </button>
                        </td>
                      )}
                      <td className="px-2 py-2">
                        <Input
                          size="sm"
                          type="number"
                          min={0}
                          step={0.05}
                          value={person.actualHours}
                          onChange={(event) =>
                            updatePerson(index, { actualHours: event.target.value })
                          }
                          inputClassName="h-8 px-1.5 text-right text-xs tabular-nums"
                        />
                      </td>
                      {labourOpen && (
                        <>
                          <td className="px-2 py-2">
                            <Input
                              size="sm"
                              type="number"
                              min={0}
                              step={0.05}
                              value={person.normalOvertimeHours}
                              onChange={(event) =>
                                updatePerson(index, {
                                  normalOvertimeHours: event.target.value,
                                })
                              }
                              inputClassName="h-8 px-1.5 text-right text-xs tabular-nums"
                              aria-label="Normal overtime hours"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              size="sm"
                              type="number"
                              min={0}
                              step={0.05}
                              value={person.doubleOvertimeHours}
                              onChange={(event) =>
                                updatePerson(index, {
                                  doubleOvertimeHours: event.target.value,
                                })
                              }
                              inputClassName="h-8 px-1.5 text-right text-xs tabular-nums"
                              aria-label="Double overtime hours"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              size="sm"
                              type="number"
                              min={0}
                              value={person.rejectedQuantity}
                              onChange={(event) =>
                                updatePerson(index, {
                                  rejectedQuantity: event.target.value,
                                })
                              }
                              inputClassName="h-8 px-1.5 text-right text-xs tabular-nums"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              size="sm"
                              type="number"
                              min={0}
                              value={person.wasteQuantity}
                              onChange={(event) =>
                                updatePerson(index, { wasteQuantity: event.target.value })
                              }
                              inputClassName="h-8 px-1.5 text-right text-xs tabular-nums"
                            />
                          </td>
                        </>
                      )}
                      <td className="px-2 py-2 text-center">
                        <IconButton
                          aria-label="Remove worker"
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          size="sm"
                          variant="ghost"
                          disabled={value.length <= 1}
                          onClick={() => removePerson(index)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              disabled={users.length === 0}
              onClick={addPerson}
            >
              Add worker
            </Button>
            {!sharedMode && value.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange(balanceSeparate(value, remainingQuantity, remainingHours))
                }
              >
                Split qty evenly
              </Button>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setLabourOpen((open) => !open)}
            >
              {labourOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Labour & quality
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge variant="info" size="sm">
              {qtyTotal} / {remainingQuantity} qty
            </StatusBadge>
            <StatusBadge variant={finishedCount > 0 ? "success" : "neutral"} size="sm">
              {finishedCount} finished
            </StatusBadge>
            {sharedMode && (
              <StatusBadge
                variant={Math.abs(percentTotal - CONTRIBUTION_TOTAL) <= 0.05 ? "success" : "warning"}
                size="sm"
              >
                Share {percentTotal}%
                {Math.abs(percentTotal - CONTRIBUTION_TOTAL) > 0.05 ? " · need 100% to complete" : ""}
              </StatusBadge>
            )}
          </div>
        </div>
      </div>

      {requireTotal && !quantityOk && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <p>Quantity exceeds open pieces ({remainingQuantity}).</p>
        </div>
      )}
    </div>
  );
}

function ModeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-xs"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function contributorDraftProgressLabel(drafts: ContributorDraft[]): string {
  const parsed = parsedContributorInputs(drafts);
  if (!parsed.length) return "—";
  return `${roundPercent(
    parsed.reduce((sum, person) => sum + (person.progressPercentage || 0), 0) / parsed.length,
  )}%`;
}
