import type { EntityStatus } from "@/types/common";
import type { ProductVersionStatusValue } from "@/types/status";

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface BomAlternative {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  sku: string;
  unit: string;
  unitCost: number;
  isApproved: boolean;
  notes?: string;
}

export interface BomItem {
  id: string;
  sequence: number;
  inventoryItemId: string;
  inventoryItemName: string;
  sku: string;
  quantity: number;
  unit: string;
  wastePercent: number;
  requiredQuantity: number;
  unitCost: number;
  lineCost: number;
  isRequired: boolean;
  notes?: string;
  alternatives: BomAlternative[];
}

export interface ProductOperation {
  id: string;
  name: string;
  sequence: number;
  description?: string;
  workstation: string;
  estimatedHours: number;
  labourCostRate?: number;
  machineName?: string;
  machineCost?: number;
  isRequired: boolean;
  isEnabled: boolean;
  notes?: string;
}

export type ProductOperationInput = {
  id?: string;
  name: string;
  sequence?: number;
  description?: string;
  workstation: string;
  estimatedHours: number;
  labourCostRate?: number;
  machineName?: string;
  machineCost?: number;
  isRequired?: boolean;
  isEnabled?: boolean;
  notes?: string;
};

export type BomLineInput = {
  inventoryItemId: string;
  inventoryItemName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitCost: number;
  wastePercent?: number;
  isRequired?: boolean;
  notes?: string;
  sequence?: number;
  alternatives?: Array<Omit<BomAlternative, "id"> & { id?: string }>;
};

export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
  unit?: string;
}

export const ProductType = {
  custom_lighting: "custom_lighting",
  standard_fixture: "standard_fixture",
  component_kit: "component_kit",
  finished_good: "finished_good",
} as const;

export type ProductTypeValue = (typeof ProductType)[keyof typeof ProductType];

export const ProductTypeLabels: Record<ProductTypeValue, string> = {
  custom_lighting: "Custom Lighting",
  standard_fixture: "Standard Fixture",
  component_kit: "Component Kit",
  finished_good: "Finished Good",
};

export interface ProductSpecifications {
  weightKg?: number;
  dimensions?: string;
  size?: string;
  shape?: string;
  design?: string;
  finish?: string;
  colour?: string;
  glass?: string;
  wiring?: string;
  mountingType?: string;
  mountingBracket?: string;
  voltage?: string;
  wattage?: number;
  ledType?: string;
  colorTemperature?: string;
  driver?: string;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  diameterMm?: number;
  lumenOutput?: number;
  efficacy?: number;
  cri?: string;
  beamAngle?: string;
  ipRating?: string;
  inputVoltage?: string;
  powerFactor?: number;
  dimming?: string;
  opTempMin?: number;
  opTempMax?: number;
  inputPower?: number;
  inputCurrent?: number;
  driverType?: string;
  driverBrand?: string;
  coatingFinish?: string;
  coatingProcess?: string;
  materialPrimary?: string;
  materialSecondary?: string;
  certifications?: string;
  warranty?: string;
  manufacturingNotes?: string;
}

export interface CostBreakdown {
  materialCost: number;
  labourCost: number;
  coatingFinishingCost: number;
  machineCost: number;
  overheadCost: number;
  otherCost: number;
  notes?: string;
}

export type CostBreakdownInput = Partial<CostBreakdown>;

export function computeTotalCost(breakdown: CostBreakdown): number {
  return (
    breakdown.materialCost +
    breakdown.labourCost +
    breakdown.coatingFinishingCost +
    breakdown.machineCost +
    breakdown.overheadCost +
    breakdown.otherCost
  );
}

export function emptyCostBreakdown(): CostBreakdown {
  return {
    materialCost: 0,
    labourCost: 0,
    coatingFinishingCost: 0,
    machineCost: 0,
    overheadCost: 0,
    otherCost: 0,
  };
}

export interface ProductVersion {
  id: string;
  productId: string;
  versionNumber: number;
  label: string;
  status: ProductVersionStatusValue;
  isLocked: boolean;
  specifications: ProductSpecifications;
  bom: BomItem[];
  operations: ProductOperation[];
  attributes: ProductAttribute[];
  images: ProductImage[];
  costBreakdown: CostBreakdown;
  basePrice: number;
  costPrice: number;
  leadTimeDays: number;
  minOrderQuantity: number;
  tags: string[];
  revisionNotes?: string;
  createdAt: string;
  updatedAt: string;
  releasedAt?: string;
  releasedBy?: string;
  approvedAt?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  brandId: string;
  brandName: string;
  productType: ProductTypeValue;
  customerId?: string;
  customerName?: string;
  projectId?: string;
  projectName?: string;
  currency: string;
  status: EntityStatus;
  currentVersionId: string;
  versions: ProductVersion[];
  /** Mirrored from current version for list views and backward compatibility */
  basePrice: number;
  costPrice: number;
  images: ProductImage[];
  bom: BomItem[];
  operations: ProductOperation[];
  attributes: ProductAttribute[];
  weightKg?: number;
  dimensions?: string;
  leadTimeDays: number;
  minOrderQuantity: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  productType: ProductTypeValue;
  customerId?: string;
  projectId?: string;
  projectName?: string;
  basePrice: number;
  costPrice: number;
  status: EntityStatus;
  attributes: Omit<ProductAttribute, "id">[];
  leadTimeDays: number;
  minOrderQuantity: number;
  tags: string[];
  weightKg?: number;
  dimensions?: string;
  specifications?: Partial<ProductSpecifications>;
  bom?: BomLineInput[];
  operations?: ProductOperationInput[];
  costBreakdown?: CostBreakdownInput;
  revisionNotes?: string;
  images?: ProductImage[];
}

export interface ProductVersionFormData {
  specifications?: Partial<ProductSpecifications>;
  bom?: ProductFormData["bom"];
  operations?: ProductFormData["operations"];
  attributes?: Omit<ProductAttribute, "id">[];
  costBreakdown?: CostBreakdownInput;
  basePrice?: number;
  costPrice?: number;
  leadTimeDays?: number;
  minOrderQuantity?: number;
  tags?: string[];
  revisionNotes?: string;
  images?: ProductImage[];
}

export interface ProductHeaderFormData {
  sku?: string;
  name?: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  productType?: ProductTypeValue;
  customerId?: string;
  projectId?: string;
  projectName?: string;
  status?: EntityStatus;
}
