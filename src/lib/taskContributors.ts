import { roundCost } from "@/lib/bomCosting";
import { calculateLaborCost, type LaborCostBreakdown } from "@/lib/laborCost";
import { loadCostingRates, type CostingRates } from "@/lib/costingRates";
import type {
  ManufacturingTask,
  TaskContributor,
  TaskContributorInput,
  TaskContributorStatus,
} from "@/types/manufacturing";

export const CONTRIBUTION_TOTAL = 100;
const TOLERANCE = 0.05;

export function roundPercent(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function contributionTotal(
  items: Array<{ contributionPercent?: number | null }>,
): number {
  return roundPercent(
    items.reduce((sum, item) => sum + (Number(item.contributionPercent) || 0), 0),
  );
}

export function quantityTotal(items: Array<{ quantity?: number | null }>): number {
  return roundPercent(items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0));
}

export function hasCompleteContribution(
  items: Array<{ contributionPercent?: number | null }>,
): boolean {
  return Math.abs(contributionTotal(items) - CONTRIBUTION_TOTAL) <= TOLERANCE;
}

export function hasCompleteQuantity(
  items: Array<{ quantity?: number | null }>,
  remaining: number,
): boolean {
  return Math.abs(quantityTotal(items) - remaining) <= TOLERANCE;
}

export function splitContributionEqually(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor((CONTRIBUTION_TOTAL * 100) / count) / 100;
  const parts = Array.from({ length: count }, () => base);
  parts[parts.length - 1] = roundPercent(CONTRIBUTION_TOTAL - base * (count - 1));
  return parts;
}

export function allocateByShares(total: number, shares: number[]): number[] {
  if (!shares.length) return [];
  const weight = shares.reduce((sum, share) => sum + Math.max(0, share), 0);
  if (weight <= 0) {
    const even = splitContributionEqually(shares.length);
    return allocateByShares(total, even);
  }
  const parts = shares.map((share, index) => {
    if (index === shares.length - 1) return 0;
    return roundPercent((total * Math.max(0, share)) / weight);
  });
  parts[parts.length - 1] = roundPercent(total - parts.reduce((sum, part) => sum + part, 0));
  return parts;
}

function parseAmount(value?: number | null): number {
  return roundPercent(Math.max(0, Number(value) || 0));
}

export function uniqueContributorInputs(inputs: TaskContributorInput[]): TaskContributorInput[] {
  const seen = new Set<string>();
  const next: TaskContributorInput[] = [];
  for (const input of inputs) {
    const userId = input.userId?.trim();
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    next.push({
      userId,
      userName: input.userName?.trim() || userId,
      contributionPercent: parseAmount(input.contributionPercent),
      quantity: parseAmount(input.quantity),
      rejectedQuantity: parseAmount(input.rejectedQuantity),
      wasteQuantity: parseAmount(input.wasteQuantity),
      actualHours: input.actualHours == null || Number.isNaN(Number(input.actualHours))
        ? undefined
        : parseAmount(input.actualHours),
      overtimeHours: input.overtimeHours == null || Number.isNaN(Number(input.overtimeHours))
        ? undefined
        : parseAmount(input.overtimeHours),
      normalOvertimeHours:
        input.normalOvertimeHours == null || Number.isNaN(Number(input.normalOvertimeHours))
          ? undefined
          : parseAmount(input.normalOvertimeHours),
      doubleOvertimeHours:
        input.doubleOvertimeHours == null || Number.isNaN(Number(input.doubleOvertimeHours))
          ? undefined
          : parseAmount(input.doubleOvertimeHours),
    });
  }
  return next;
}

export function contributorStatusFromTask(
  status: ManufacturingTask["status"],
): TaskContributorStatus {
  if (status === "completed") return "completed";
  if (status === "in_progress") return "in_progress";
  if (status === "on_hold") return "on_hold";
  if (status === "ready") return "paused";
  return "assigned";
}

export function emptyContributorWork(): Pick<
  TaskContributor,
  | "quantity"
  | "rejectedQuantity"
  | "wasteQuantity"
  | "actualHours"
  | "overtimeHours"
  | "normalOvertimeHours"
  | "doubleOvertimeHours"
  | "laborCost"
> {
  return {
    quantity: 0,
    rejectedQuantity: 0,
    wasteQuantity: 0,
    actualHours: 0,
    overtimeHours: 0,
    normalOvertimeHours: 0,
    doubleOvertimeHours: 0,
    laborCost: 0,
  };
}

export function setContributorStatus(
  contributors: TaskContributor[],
  status: TaskContributorStatus,
  now: string,
): TaskContributor[] {
  return contributors.map((person) => {
    if (status === "in_progress") {
      return {
        ...person,
        status,
        startedAt: person.startedAt ?? now,
        pausedAt: undefined,
      };
    }
    if (status === "paused" || status === "on_hold") {
      return { ...person, status, pausedAt: now };
    }
    if (status === "completed") {
      return {
        ...person,
        status,
        completedAt: person.completedAt ?? now,
        pausedAt: undefined,
      };
    }
    return { ...person, status };
  });
}

export function calculateContributorLabor(
  person: TaskContributorInput,
  task: Pick<ManufacturingTask, "estimatedHours" | "labourCostRate">,
  rates: CostingRates = loadCostingRates(),
): LaborCostBreakdown {
  const share = (Number(person.contributionPercent) || 0) / 100;
  const estimatedHours = roundCost(task.estimatedHours * share);
  const actualHours =
    person.actualHours == null || Number.isNaN(Number(person.actualHours))
      ? estimatedHours
      : Number(person.actualHours);
  return calculateLaborCost({
    actualHours,
    estimatedHours,
    overtimeHours: person.overtimeHours,
    normalOvertimeHours: person.normalOvertimeHours,
    doubleOvertimeHours: person.doubleOvertimeHours,
    labourCostRate: task.labourCostRate,
    rates,
  });
}

export function toTaskContributors(
  inputs: TaskContributorInput[],
  status: TaskContributorStatus,
  now: string,
  previous: TaskContributor[] = [],
  task?: Pick<ManufacturingTask, "estimatedHours" | "labourCostRate">,
): TaskContributor[] {
  const prevById = new Map(previous.map((person) => [person.userId, person]));
  const rates = loadCostingRates();
  return uniqueContributorInputs(inputs).map((input) => {
    const prev = prevById.get(input.userId);
    const labor = task ? calculateContributorLabor(input, task, rates) : null;
    return setContributorStatus(
      [
        {
          userId: input.userId,
          userName: input.userName || prev?.userName || input.userId,
          contributionPercent: input.contributionPercent ?? prev?.contributionPercent ?? 0,
          quantity: input.quantity ?? prev?.quantity ?? 0,
          rejectedQuantity: input.rejectedQuantity ?? prev?.rejectedQuantity ?? 0,
          wasteQuantity: input.wasteQuantity ?? prev?.wasteQuantity ?? 0,
          actualHours: labor?.actualHours ?? input.actualHours ?? prev?.actualHours ?? 0,
          overtimeHours: labor?.overtimeHours ?? input.overtimeHours ?? prev?.overtimeHours ?? 0,
          normalOvertimeHours:
            labor?.normalOvertimeHours ?? input.normalOvertimeHours ?? prev?.normalOvertimeHours ?? 0,
          doubleOvertimeHours:
            labor?.doubleOvertimeHours ?? input.doubleOvertimeHours ?? prev?.doubleOvertimeHours ?? 0,
          laborCost: labor?.laborCost ?? prev?.laborCost ?? 0,
          status: prev?.status ?? status,
          startedAt: prev?.startedAt,
          pausedAt: prev?.pausedAt,
          completedAt: prev?.completedAt,
        },
      ],
      status,
      now,
    )[0];
  });
}

export function resolveTaskContributors(
  task: Pick<
    ManufacturingTask,
    | "contributors"
    | "assignedTo"
    | "assignedToName"
    | "operatorId"
    | "operatorName"
    | "status"
  >,
): TaskContributor[] {
  if (task.contributors?.length) {
    return task.contributors.map((person) => ({
      ...emptyContributorWork(),
      ...person,
    }));
  }
  const userId = task.assignedTo ?? task.operatorId;
  if (!userId) return [];
  return [
    {
      userId,
      userName: task.assignedToName ?? task.operatorName ?? userId,
      contributionPercent: 0,
      ...emptyContributorWork(),
      status: contributorStatusFromTask(task.status),
    },
  ];
}

export function primaryContributor(contributors: TaskContributor[]) {
  const first = contributors[0];
  if (!first) {
    return {
      assignedTo: undefined as string | undefined,
      assignedToName: undefined as string | undefined,
      operatorId: undefined as string | undefined,
      operatorName: undefined as string | undefined,
    };
  }
  return {
    assignedTo: first.userId,
    assignedToName: first.userName,
    operatorId: first.userId,
    operatorName: first.userName,
  };
}

export function formatContributors(
  contributors: TaskContributor[] | undefined,
  withPercent = true,
): string {
  if (!contributors?.length) return "";
  return contributors
    .map((person) => {
      const parts = [person.userName];
      if (withPercent && person.contributionPercent > 0) {
        parts.push(`${roundPercent(person.contributionPercent)}%`);
      }
      if (person.quantity > 0) parts.push(`qty ${person.quantity}`);
      if ((person.rejectedQuantity ?? 0) > 0) parts.push(`rej ${person.rejectedQuantity}`);
      if ((person.wasteQuantity ?? 0) > 0) parts.push(`waste ${person.wasteQuantity}`);
      if (person.normalOvertimeHours > 0) parts.push(`OT ${person.normalOvertimeHours}h`);
      if (person.doubleOvertimeHours > 0) parts.push(`DOT ${person.doubleOvertimeHours}h`);
      return parts.join(" ");
    })
    .join(" · ");
}

export function aggregateContributorWork(contributors: TaskContributor[]) {
  return contributors.reduce(
    (sum, person) => ({
      quantity: roundPercent(sum.quantity + (person.quantity || 0)),
      rejectedQuantity: roundPercent(sum.rejectedQuantity + (person.rejectedQuantity || 0)),
      wasteQuantity: roundPercent(sum.wasteQuantity + (person.wasteQuantity || 0)),
      actualHours: roundPercent(sum.actualHours + (person.actualHours || 0)),
      overtimeHours: roundPercent(sum.overtimeHours + (person.overtimeHours || 0)),
      normalOvertimeHours: roundPercent(sum.normalOvertimeHours + (person.normalOvertimeHours || 0)),
      doubleOvertimeHours: roundPercent(sum.doubleOvertimeHours + (person.doubleOvertimeHours || 0)),
      laborCost: roundPercent(sum.laborCost + (person.laborCost || 0)),
    }),
    emptyContributorWork(),
  );
}

export function validateCompleteContributors(
  inputs: TaskContributorInput[],
  options?: { remainingQuantity?: number },
): void {
  const unique = uniqueContributorInputs(inputs);
  if (!unique.length) {
    throw {
      code: "INVALID_STATE",
      message: "Assign at least one person before completing this task.",
    };
  }
  if (unique.some((person) => person.contributionPercent < 0 || person.contributionPercent > 100)) {
    throw {
      code: "INVALID_STATE",
      message: "Each contribution must be between 0% and 100%.",
    };
  }
  if (!hasCompleteContribution(unique)) {
    throw {
      code: "INVALID_STATE",
      message: `Contributor percentages must add up to 100% (currently ${contributionTotal(unique)}%).`,
    };
  }
  if (options?.remainingQuantity != null && !hasCompleteQuantity(unique, options.remainingQuantity)) {
    throw {
      code: "INVALID_STATE",
      message: `Person quantities must add up to the remaining qty ${options.remainingQuantity} (currently ${quantityTotal(unique)}).`,
    };
  }
}

export function defaultCompleteContributors(
  existing: TaskContributor[],
  actor: { userId: string; userName: string },
  allocation?: { quantity: number; estimatedHours: number; actualHours?: number },
): TaskContributorInput[] {
  const people = existing.length
    ? existing
    : [
        {
          userId: actor.userId,
          userName: actor.userName,
          contributionPercent: CONTRIBUTION_TOTAL,
          ...emptyContributorWork(),
          status: "assigned" as const,
        },
      ];
  const percents = hasCompleteContribution(people)
    ? people.map((person) => person.contributionPercent)
    : splitContributionEqually(people.length);
  const quantities = allocateByShares(allocation?.quantity ?? 0, percents);
  const hoursSource = allocation?.estimatedHours ?? 0;
  const keepRecordedHours = people.some((person) => (person.actualHours ?? 0) > 0);
  const hours = keepRecordedHours
    ? people.map((person) => person.actualHours ?? 0)
    : allocateByShares(hoursSource, percents);
  return people.map((person, index) => ({
    userId: person.userId,
    userName: person.userName,
    contributionPercent: percents[index] ?? 0,
    quantity: quantities[index] ?? person.quantity ?? 0,
    rejectedQuantity: person.rejectedQuantity || undefined,
    wasteQuantity: person.wasteQuantity || undefined,
    actualHours: hours[index] ?? person.actualHours,
    overtimeHours: person.overtimeHours || undefined,
    normalOvertimeHours: person.normalOvertimeHours || undefined,
    doubleOvertimeHours: person.doubleOvertimeHours || undefined,
  }));
}

export function resetContributorProgress(contributors: TaskContributor[] | undefined): TaskContributor[] {
  return (contributors ?? []).map((person) => ({
    ...person,
    contributionPercent: 0,
    ...emptyContributorWork(),
    status: "assigned" as const,
    startedAt: undefined,
    pausedAt: undefined,
    completedAt: undefined,
  }));
}
