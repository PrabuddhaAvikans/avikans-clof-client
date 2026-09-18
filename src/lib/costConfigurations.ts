import { DEFAULT_COSTING_RATES, computeStandardCosts, loadCostingRates, saveCostingRates, type CostingBomInput, type CostingOperationInput, type CostingRates } from "@/lib/costingRates";
import { generateId } from "@/services/http";
import type { CostSheetLine } from "@/types/product";

export type CostConfiguration = {
  id: string;
  name: string;
  labourRatePerHour: number;
  overtimeMultiplier: number;
  normalOvertimeMultiplier: number;
  doubleOvertimeMultiplier: number;
  machineRatePerHour: number;
  coatingCostPerUnit: number;
  overheadPercent: number;
  materialCost: number;
  labourCost: number;
  coatingFinishingCost: number;
  machineCost: number;
  overheadCost: number;
  otherCost: number;
  extraLines: CostSheetLine[];
};

type DefaultProfileState = {
  materialCost: number;
  labourCost: number;
  coatingFinishingCost: number;
  machineCost: number;
  overheadCost: number;
  otherCost: number;
  extraLines: CostSheetLine[];
};

export const DEFAULT_COST_CONFIGURATION_ID = "default";
export const COST_CONFIGURATIONS_UPDATED_EVENT = "ats-cost-configurations-updated";
const STORAGE_KEY = "ats.costConfigurations";
const DEFAULT_EXTRAS_KEY = "ats.costConfigurationDefault";

function emptyDefaultProfileState(): DefaultProfileState {
  return {
    materialCost: 0,
    labourCost: 0,
    coatingFinishingCost: 0,
    machineCost: 0,
    overheadCost: 0,
    otherCost: 0,
    extraLines: [],
  };
}

function loadDefaultProfileExtras(): DefaultProfileState {
  try {
    const raw = localStorage.getItem(DEFAULT_EXTRAS_KEY);
    if (!raw) return emptyDefaultProfileState();
    const parsed = JSON.parse(raw) as Partial<DefaultProfileState>;
    return {
      materialCost: toNumber(parsed.materialCost, 0),
      labourCost: toNumber(parsed.labourCost, 0),
      coatingFinishingCost: toNumber(parsed.coatingFinishingCost, 0),
      machineCost: toNumber(parsed.machineCost, 0),
      overheadCost: toNumber(parsed.overheadCost, 0),
      otherCost: toNumber(parsed.otherCost, 0),
      extraLines: normalizeExtraLines(parsed.extraLines),
    };
  } catch {
    return emptyDefaultProfileState();
  }
}

function saveDefaultProfileExtras(state: DefaultProfileState): void {
  localStorage.setItem(DEFAULT_EXTRAS_KEY, JSON.stringify(state));
}

function companyStandardConfiguration(): CostConfiguration {
  const rates = loadCostingRates();
  const extras = loadDefaultProfileExtras();
  return {
    id: DEFAULT_COST_CONFIGURATION_ID,
    name: "Company standard",
    labourRatePerHour: rates.labourRatePerHour,
    overtimeMultiplier: rates.normalOvertimeMultiplier,
    normalOvertimeMultiplier: rates.normalOvertimeMultiplier,
    doubleOvertimeMultiplier: rates.doubleOvertimeMultiplier,
    machineRatePerHour: rates.machineRatePerHour,
    coatingCostPerUnit: rates.coatingCostPerUnit,
    overheadPercent: rates.overheadPercent,
    materialCost: extras.materialCost,
    labourCost: extras.labourCost,
    coatingFinishingCost: extras.coatingFinishingCost,
    machineCost: extras.machineCost,
    overheadCost: extras.overheadCost,
    otherCost: extras.otherCost,
    extraLines: extras.extraLines,
  };
}

export function cloneCostConfigurationLines(lines?: CostSheetLine[]): CostSheetLine[] {
  return (lines ?? []).map((line) => ({
    id: generateId("csh"),
    handle: line.handle,
    amount: Number(line.amount) || 0,
  }));
}

export function resolveInitialCosts(
  config: CostConfiguration,
  bom: CostingBomInput[] = [],
  operations: CostingOperationInput[] = [],
) {
  const fromBom = computeStandardCosts(bom, operations, toCostingRates(config));
  return {
    materialCost: fromBom.materialCost > 0 ? fromBom.materialCost : config.materialCost,
    labourCost: fromBom.labourCost > 0 ? fromBom.labourCost : config.labourCost,
    coatingFinishingCost:
      fromBom.coatingFinishingCost > 0 ? fromBom.coatingFinishingCost : config.coatingFinishingCost,
    machineCost: fromBom.machineCost > 0 ? fromBom.machineCost : config.machineCost,
    overheadCost: fromBom.overheadCost > 0 ? fromBom.overheadCost : config.overheadCost,
    otherCost: config.otherCost,
  };
}

export function toCostingRates(config: CostConfiguration): CostingRates {
  const normalOvertimeMultiplier =
    config.normalOvertimeMultiplier ?? config.overtimeMultiplier;
  return {
    labourRatePerHour: config.labourRatePerHour,
    overtimeMultiplier: normalOvertimeMultiplier,
    normalOvertimeMultiplier,
    doubleOvertimeMultiplier:
      config.doubleOvertimeMultiplier ?? DEFAULT_COSTING_RATES.doubleOvertimeMultiplier,
    machineRatePerHour: config.machineRatePerHour,
    coatingCostPerUnit: config.coatingCostPerUnit,
    overheadPercent: config.overheadPercent,
  };
}

export function toCostConfigurationOptions(configs: CostConfiguration[]) {
  return configs.map((config) => ({
    value: config.id,
    label: config.id === DEFAULT_COST_CONFIGURATION_ID ? `${config.name} (default)` : config.name,
  }));
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "config";
}

function isConfig(value: unknown): value is CostConfiguration {
  if (!value || typeof value !== "object") return false;
  const config = value as Partial<CostConfiguration>;
  return typeof config.id === "string" && typeof config.name === "string";
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isLine(value: unknown): value is Partial<CostSheetLine> {
  return Boolean(value) && typeof value === "object";
}

function normalizeExtraLines(value: unknown): CostSheetLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isLine).map((line, index) => ({
    id: typeof line.id === "string" && line.id.trim() ? line.id.trim() : generateId(`csh-${index}`),
    handle: typeof line.handle === "string" ? line.handle.trim() : "",
    amount: toNumber(line.amount, 0),
  }));
}

function normalizeConfig(config: Partial<CostConfiguration>): CostConfiguration {
  return {
    id: (config.id ?? "").trim(),
    name: (config.name ?? "").trim(),
    labourRatePerHour: toNumber(config.labourRatePerHour, DEFAULT_COSTING_RATES.labourRatePerHour),
    overtimeMultiplier: toNumber(
      config.normalOvertimeMultiplier ?? config.overtimeMultiplier,
      DEFAULT_COSTING_RATES.normalOvertimeMultiplier,
    ),
    normalOvertimeMultiplier: toNumber(
      config.normalOvertimeMultiplier ?? config.overtimeMultiplier,
      DEFAULT_COSTING_RATES.normalOvertimeMultiplier,
    ),
    doubleOvertimeMultiplier: toNumber(
      config.doubleOvertimeMultiplier,
      DEFAULT_COSTING_RATES.doubleOvertimeMultiplier,
    ),
    machineRatePerHour: toNumber(config.machineRatePerHour, DEFAULT_COSTING_RATES.machineRatePerHour),
    coatingCostPerUnit: toNumber(config.coatingCostPerUnit, 0),
    overheadPercent: toNumber(config.overheadPercent, DEFAULT_COSTING_RATES.overheadPercent),
    materialCost: toNumber(config.materialCost, 0),
    labourCost: toNumber(config.labourCost, 0),
    coatingFinishingCost: toNumber(config.coatingFinishingCost, 0),
    machineCost: toNumber(config.machineCost, 0),
    overheadCost: toNumber(config.overheadCost, 0),
    otherCost: toNumber(config.otherCost, 0),
    extraLines: normalizeExtraLines(config.extraLines),
  };
}

function loadCustomConfigurations(): CostConfiguration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isConfig)
      .map(normalizeConfig)
      .filter((config) => config.id && config.name && config.id !== DEFAULT_COST_CONFIGURATION_ID);
  } catch {
    return [];
  }
}

function saveCustomConfigurations(configs: CostConfiguration[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  window.dispatchEvent(new Event(COST_CONFIGURATIONS_UPDATED_EVENT));
}

function sameId(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function loadCostConfigurations(): CostConfiguration[] {
  return [companyStandardConfiguration(), ...loadCustomConfigurations()];
}

export function findCostConfiguration(id?: string | null): CostConfiguration | undefined {
  if (!id) return companyStandardConfiguration();
  return loadCostConfigurations().find((config) => sameId(config.id, id));
}

export function resolveCostConfiguration(id?: string | null): CostConfiguration {
  return findCostConfiguration(id) ?? companyStandardConfiguration();
}

export function resolveCostConfigurationRates(id?: string | null): CostingRates {
  return toCostingRates(resolveCostConfiguration(id));
}

export function addCostConfiguration(
  input: Omit<CostConfiguration, "id"> & { id?: string },
): CostConfiguration {
  const name = input.name.trim();
  const custom = loadCustomConfigurations();
  const existing = custom.find((config) => config.name.trim().toLowerCase() === name.toLowerCase());
  if (existing) {
    const updated = normalizeConfig({ ...existing, ...input, id: existing.id, name: existing.name });
    saveCustomConfigurations(custom.map((config) => (sameId(config.id, existing.id) ? updated : config)));
    return updated;
  }

  const baseId = slugify(name);
  const configs = loadCostConfigurations();
  let id = input.id?.trim() || baseId;
  let suffix = 2;
  while (configs.some((config) => sameId(config.id, id))) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  const next = normalizeConfig({ ...input, id, name });
  saveCustomConfigurations([...custom, next]);
  return next;
}

export function updateCostConfiguration(
  id: string,
  input: Partial<Omit<CostConfiguration, "id">>,
): CostConfiguration | undefined {
  if (sameId(id, DEFAULT_COST_CONFIGURATION_ID)) {
    const current = companyStandardConfiguration();
    const updated = normalizeConfig({
      ...current,
      ...input,
      id: DEFAULT_COST_CONFIGURATION_ID,
      name: current.name,
    });
    saveCostingRates(toCostingRates(updated));
    saveDefaultProfileExtras({
      materialCost: updated.materialCost,
      labourCost: updated.labourCost,
      coatingFinishingCost: updated.coatingFinishingCost,
      machineCost: updated.machineCost,
      overheadCost: updated.overheadCost,
      otherCost: updated.otherCost,
      extraLines: updated.extraLines,
    });
    window.dispatchEvent(new Event(COST_CONFIGURATIONS_UPDATED_EVENT));
    return updated;
  }

  const custom = loadCustomConfigurations();
  const current = custom.find((config) => sameId(config.id, id));
  if (!current) return undefined;
  const updated = normalizeConfig({ ...current, ...input, id: current.id });
  saveCustomConfigurations(custom.map((config) => (sameId(config.id, id) ? updated : config)));
  return updated;
}
