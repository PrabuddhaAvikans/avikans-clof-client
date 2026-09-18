import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/format";
import { calculateContributorLabor } from "@/lib/taskContributors";
import {
  CONTRIBUTION_TOTAL,
  allocateByShares,
  contributionTotal,
  hasCompleteContribution,
  hasCompleteQuantity,
  quantityTotal,
  splitContributionEqually,
} from "@/lib/taskContributors";
import type { ManufacturingTask } from "@/types/manufacturing";

export type UserOption = { id: string; name: string };

export type ContributorDraft = {
  userId: string;
  userName: string;
  contributionPercent: string;
  quantity: string;
  rejectedQuantity: string;
  wasteQuantity: string;
  actualHours: string;
  normalOvertimeHours: string;
  doubleOvertimeHours: string;
};

type Props = {
  users: UserOption[];
  value: ContributorDraft[];
  onChange: (next: ContributorDraft[]) => void;
  task: Pick<ManufacturingTask, "estimatedHours" | "labourCostRate" | "plannedQuantity">;
  remainingQuantity: number;
  remainingHours: number;
  requireTotal?: boolean;
};

function emptyDraft(userId = "", userName = ""): ContributorDraft {
  return {
    userId,
    userName,
    contributionPercent: "",
    quantity: "",
    rejectedQuantity: "",
    wasteQuantity: "",
    actualHours: "",
    normalOvertimeHours: "",
    doubleOvertimeHours: "",
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
    rejectedQuantity?: number;
    wasteQuantity?: number;
    actualHours?: number;
    normalOvertimeHours?: number;
    doubleOvertimeHours?: number;
  }>,
): ContributorDraft[] {
  return inputs.map((person) => ({
    userId: person.userId,
    userName: person.userName,
    contributionPercent: numericDraft(person.contributionPercent),
    quantity: numericDraft(person.quantity),
    rejectedQuantity: numericDraft(person.rejectedQuantity),
    wasteQuantity: numericDraft(person.wasteQuantity),
    actualHours: numericDraft(person.actualHours),
    normalOvertimeHours: numericDraft(person.normalOvertimeHours),
    doubleOvertimeHours: numericDraft(person.doubleOvertimeHours),
  }));
}

function draftNumber(value: string) {
  return value === "" ? 0 : Number(value);
}

function withBalancedShares(
  people: ContributorDraft[],
  remainingQuantity: number,
  remainingHours: number,
): ContributorDraft[] {
  if (!people.length) return people;
  const percents = splitContributionEqually(people.length);
  const quantities = allocateByShares(remainingQuantity, percents);
  const hours = allocateByShares(remainingHours, percents);
  return people.map((person, index) => ({
    ...person,
    contributionPercent: String(percents[index] ?? 0),
    quantity: String(quantities[index] ?? 0),
    actualHours: String(hours[index] ?? 0),
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
      rejectedQuantity: draftNumber(person.rejectedQuantity),
      wasteQuantity: draftNumber(person.wasteQuantity),
      actualHours: person.actualHours === "" ? undefined : Number(person.actualHours),
      normalOvertimeHours:
        person.normalOvertimeHours === "" ? undefined : Number(person.normalOvertimeHours),
      doubleOvertimeHours:
        person.doubleOvertimeHours === "" ? undefined : Number(person.doubleOvertimeHours),
    }));
}

export function TaskContributorsEditor({
  users,
  value,
  onChange,
  task,
  remainingQuantity,
  remainingHours,
  requireTotal = true,
}: Props) {
  const usedIds = new Set(value.map((person) => person.userId));
  const parsed = parsedContributorInputs(value);
  const percentTotal = contributionTotal(parsed);
  const qtyTotal = quantityTotal(parsed);
  const rejectedTotal = parsed.reduce((sum, person) => sum + (person.rejectedQuantity ?? 0), 0);
  const wasteTotal = parsed.reduce((sum, person) => sum + (person.wasteQuantity ?? 0), 0);
  const percentOk = hasCompleteContribution(parsed);
  const quantityOk = !requireTotal || hasCompleteQuantity(parsed, remainingQuantity);
  const available = users.filter((user) => !usedIds.has(user.id));

  const updatePerson = (index: number, patch: Partial<ContributorDraft>) => {
    onChange(value.map((person, i) => (i === index ? { ...person, ...patch } : person)));
  };

  const addPerson = () => {
    const next = available[0];
    if (!next) return;
    onChange(
      withBalancedShares(
        [...value, emptyDraft(next.id, next.name)],
        remainingQuantity,
        remainingHours,
      ),
    );
  };

  const removePerson = (index: number) => {
    onChange(
      withBalancedShares(
        value.filter((_, i) => i !== index),
        remainingQuantity,
        remainingHours,
      ),
    );
  };

  const splitEqually = () => {
    onChange(withBalancedShares(value, remainingQuantity, remainingHours));
  };

  const laborTotal = parsed.reduce(
    (sum, person) => sum + calculateContributorLabor(person, task).laborCost,
    0,
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">People</p>
        <div className="flex gap-1.5">
          {value.length > 1 && (
            <Button type="button" variant="ghost" size="sm" onClick={splitEqually}>
              Split equally
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            disabled={available.length === 0}
            onClick={addPerson}
          >
            Add person
          </Button>
        </div>
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">Add the people who worked this task.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[52rem] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-1.5 font-medium">Person</th>
                <th className="w-20 px-1.5 py-1.5 font-medium">Qty</th>
                <th className="w-20 px-1.5 py-1.5 font-medium">Share %</th>
                <th className="w-20 px-1.5 py-1.5 font-medium">Hours</th>
                <th className="w-20 px-1.5 py-1.5 font-medium">OT</th>
                <th className="w-20 px-1.5 py-1.5 font-medium">DOT</th>
                <th className="w-20 px-1.5 py-1.5 font-medium">Rejected</th>
                <th className="w-20 px-1.5 py-1.5 font-medium">Waste</th>
                <th className="w-24 px-2 py-1.5 text-right font-medium">Labour</th>
                <th className="w-9 px-1 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {value.map((person, index) => {
                const labor = person.userId
                  ? calculateContributorLabor(parsedContributorInputs([person])[0], task)
                  : null;
                return (
                  <tr key={`${person.userId}-${index}`} className="border-b border-border last:border-0">
                    <td className="px-2 py-1.5">
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
                          ...users
                            .filter((user) => user.id === person.userId || !usedIds.has(user.id))
                            .map((user) => ({ value: user.id, label: user.name })),
                          ...(!person.userId || users.some((user) => user.id === person.userId)
                            ? []
                            : [{ value: person.userId, label: person.userName || person.userId }]),
                        ]}
                      />
                    </td>
                    <NumberCell
                      value={person.quantity}
                      onChange={(value) => updatePerson(index, { quantity: value })}
                    />
                    <NumberCell
                      max={100}
                      step={0.1}
                      value={person.contributionPercent}
                      onChange={(value) => updatePerson(index, { contributionPercent: value })}
                    />
                    <NumberCell
                      step={0.05}
                      value={person.actualHours}
                      onChange={(value) => updatePerson(index, { actualHours: value })}
                    />
                    <NumberCell
                      step={0.05}
                      value={person.normalOvertimeHours}
                      onChange={(value) => updatePerson(index, { normalOvertimeHours: value })}
                    />
                    <NumberCell
                      step={0.05}
                      value={person.doubleOvertimeHours}
                      onChange={(value) => updatePerson(index, { doubleOvertimeHours: value })}
                    />
                    <NumberCell
                      value={person.rejectedQuantity}
                      onChange={(value) => updatePerson(index, { rejectedQuantity: value })}
                    />
                    <NumberCell
                      value={person.wasteQuantity}
                      onChange={(value) => updatePerson(index, { wasteQuantity: value })}
                    />
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                      {labor ? formatCurrency(labor.laborCost) : "—"}
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <IconButton
                        aria-label={`Remove ${person.userName || "person"}`}
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        size="sm"
                        variant="ghost"
                        disabled={value.length <= 1}
                        onClick={() => removePerson(index)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 text-[11px]">
                <td className="px-2 py-1.5 font-medium text-foreground">Total</td>
                <td className="px-1.5 py-1.5 tabular-nums">
                  {qtyTotal}
                  {requireTotal ? ` / ${remainingQuantity}` : ""}
                </td>
                <td className="px-1.5 py-1.5 tabular-nums">
                  {percentTotal} / {CONTRIBUTION_TOTAL}
                </td>
                <td className="px-1.5 py-1.5" />
                <td className="px-1.5 py-1.5" />
                <td className="px-1.5 py-1.5" />
                <td className="px-1.5 py-1.5 tabular-nums">{rejectedTotal}</td>
                <td className="px-1.5 py-1.5 tabular-nums">{wasteTotal}</td>
                <td className="px-2 py-1.5 text-right tabular-nums font-medium">
                  {formatCurrency(laborTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {requireTotal && (!percentOk || !quantityOk) && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1.5 text-[11px] text-destructive">
          {!percentOk && <p>Share % must add up to 100% across all people.</p>}
          {!quantityOk && (
            <p>Qty must add up to remaining {remainingQuantity}, not {qtyTotal}.</p>
          )}
        </div>
      )}
    </div>
  );
}

function NumberCell({
  value,
  onChange,
  min = 0,
  max,
  step = 0.01,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <td className="px-1.5 py-1.5">
      <Input
        size="sm"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputClassName="h-8 min-w-[4.25rem] px-1.5 text-xs tabular-nums"
      />
    </td>
  );
}
