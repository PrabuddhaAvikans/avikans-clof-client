import * as yup from 'yup';

const entityStatusSchema = yup.string().oneOf(['active', 'inactive'] as const).required();

export const productAttributeSchema = yup.object({
  name: yup.string().required('Attribute name is required'),
  value: yup.string().required('Attribute value is required'),
  unit: yup.string().optional(),
});

function coerceNumber() {
  return yup.number().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) {
      return undefined;
    }
    return Number.isNaN(value) ? undefined : value;
  });
}

export const productOperationSchema = yup.object({
  id: yup.string().optional(),
  name: yup.string().required('Operation name is required'),
  sequence: yup.number().min(1).optional(),
  description: yup.string().optional(),
  workstation: yup.string().optional().default(''),
  estimatedHours: coerceNumber().min(0).default(0),
  labourCostRate: coerceNumber().min(0).optional(),
  machineName: yup.string().optional(),
  machineCost: coerceNumber().min(0).optional(),
  isRequired: yup.boolean().default(true),
  isEnabled: yup.boolean().default(true),
  notes: yup.string().optional(),
  prerequisiteOperationIds: yup.array(yup.string().required()).optional(),
  isQualityCheck: yup.boolean().optional(),
});

export const bomAlternativeSchema = yup.object({
  inventoryItemId: yup.string().required('Alternative item is required'),
  inventoryItemName: yup.string().required(),
  sku: yup.string().required(),
  unit: yup.string().required(),
  unitCost: yup.number().min(0).required(),
  isApproved: yup.boolean().required(),
  notes: yup.string().optional(),
});

export const bomItemSchema = yup.object({
  inventoryItemId: yup.string().required('Inventory item is required'),
  inventoryItemName: yup.string().required(),
  sku: yup.string().required(),
  quantity: yup.number().positive('Quantity must be greater than zero').required(),
  unit: yup.string().min(1).required(),
  unitCost: yup.number().min(0).required(),
  wastePercent: yup.number().min(0).max(100).default(0),
  isRequired: yup.boolean().default(true),
  notes: yup.string().optional(),
  sequence: yup.number().min(1).optional(),
  alternatives: yup.array(bomAlternativeSchema).default([]),
});

export const pricingRowSchema = yup.object({
  minQty: yup.number().min(1).required(),
  maxQty: yup.number().min(1).required(),
  unitPrice: yup.number().min(0).required(),
  currency: yup.string().required(),
  discountPercent: yup.number().min(0).max(100).required(),
});

export const optionGroupSchema = yup.object({
  name: yup.string().required(),
  type: yup.string().required(),
  required: yup.boolean().required(),
  optionsText: yup.string().optional(),
});

export const accessorySchema = yup.object({
  id: yup.string().optional(),
  handle: yup.string().optional().default(''),
  name: yup.string().optional().default(''),
  sku: yup.string().optional().default(''),
  quantity: yup.number().min(1).default(1),
});

export const costSheetLineSchema = yup.object({
  id: yup.string().required(),
  handle: yup.string().default(""),
  amount: yup.number().min(0).default(0),
});

export const costBreakdownSchema = yup.object({
  materialCost: yup.number().min(0).default(0),
  labourCost: yup.number().min(0).default(0),
  coatingFinishingCost: yup.number().min(0).default(0),
  machineCost: yup.number().min(0).default(0),
  overheadCost: yup.number().min(0).default(0),
  otherCost: yup.number().min(0).default(0),
  extraLines: yup.array(costSheetLineSchema).default([]),
  configurationId: yup.string().default("default"),
  notes: yup.string().optional(),
  overrideMaterial: yup.boolean().default(false),
  overrideLabour: yup.boolean().default(false),
  overrideCoating: yup.boolean().default(false),
  overrideMachine: yup.boolean().default(false),
  overrideOverhead: yup.boolean().default(false),
});

export const productFormSchema = yup.object({
  name: yup.string().min(2, 'Product name must be at least 2 characters').required(),
  code: yup.string().optional(),
  sku: yup.string().min(2, 'Product code is required').required(),
  description: yup.string().min(1, 'Description is required').required(),
  shortDescription: yup.string().optional(),
  categoryId: yup.string().min(1, 'Category is required').required(),
  brandId: yup.string().min(1, 'Brand is required').required(),
  productType: yup.string().min(1, 'Product type is required').required(),
  baseModel: yup.string().optional(),
  productFamily: yup.string().optional(),
  status: entityStatusSchema,
  availability: yup.string().optional(),
  tags: yup.array(yup.string().required()).required(),
  basePrice: yup.number().min(0, 'Base price must be zero or greater').required(),
  costPrice: yup.number().min(0, 'Cost price must be zero or greater').required(),
  leadTimeDays: yup.number().min(0).required(),
  minOrderQuantity: yup.number().min(1).required(),
  weightKg: yup.number().min(0).optional(),
  dimensions: yup.string().optional(),
  lengthMm: yup.number().min(0).optional(),
  widthMm: yup.number().min(0).optional(),
  heightMm: yup.number().min(0).optional(),
  wattage: yup.number().min(0).optional(),
  lumenOutput: yup.number().min(0).optional(),
  efficacy: yup.number().min(0).optional(),
  colorTemperature: yup.string().optional(),
  cri: yup.string().optional(),
  beamAngle: yup.string().optional(),
  ipRating: yup.string().optional(),
  inputVoltage: yup.string().optional(),
  powerFactor: yup.number().min(0).max(1).optional(),
  dimming: yup.string().optional(),
  opTempMin: yup.number().optional(),
  opTempMax: yup.number().optional(),
  inputPower: yup.number().min(0).optional(),
  inputCurrent: yup.number().min(0).optional(),
  driverType: yup.string().optional(),
  driverBrand: yup.string().optional(),
  certifications: yup.string().optional(),
  warranty: yup.string().optional(),
  coatingFinish: yup.string().optional(),
  coatingProcess: yup.string().optional(),
  materialPrimary: yup.string().optional(),
  materialSecondary: yup.string().optional(),
  attributes: yup.array(productAttributeSchema).required(),
  bom: yup.array(bomItemSchema).required(),
  operations: yup.array(productOperationSchema).default([]),
  costBreakdown: costBreakdownSchema.default(undefined),
  pricingRows: yup.array(pricingRowSchema).required(),
  optionGroups: yup.array(optionGroupSchema).required(),
  accessories: yup.array(accessorySchema).required(),
  manufacturingNotes: yup.string().optional(),
});

export type ProductFormSchemaValues = yup.InferType<typeof productFormSchema>;

export const categoryFormSchema = yup.object({
  name: yup.string().min(2, 'Category name is required').required(),
  slug: yup.string().min(2, 'Code is required').required(),
  description: yup.string().optional(),
  parentId: yup.string().nullable().defined(),
  sortOrder: yup.number().min(0).required(),
  status: entityStatusSchema,
});

export type CategoryFormSchemaValues = yup.InferType<typeof categoryFormSchema>;

export const brandFormSchema = yup.object({
  name: yup.string().min(2, 'Brand name is required').required(),
  slug: yup.string().min(2, 'Code is required').required(),
  description: yup.string().optional(),
  website: yup.string().optional(),
  countryOfOrigin: yup.string().optional(),
  status: entityStatusSchema,
});

export type BrandFormSchemaValues = yup.InferType<typeof brandFormSchema>;
