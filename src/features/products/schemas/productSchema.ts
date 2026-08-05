import * as yup from 'yup';

const entityStatusSchema = yup.string().oneOf(['active', 'inactive'] as const).required();

export const productAttributeSchema = yup.object({
  name: yup.string().required('Attribute name is required'),
  value: yup.string().required('Attribute value is required'),
  unit: yup.string().optional(),
});

export const bomItemSchema = yup.object({
  inventoryItemId: yup.string().required('Inventory item is required'),
  inventoryItemName: yup.string().required(),
  sku: yup.string().required(),
  quantity: yup.number().positive('Quantity must be greater than zero').required(),
  unit: yup.string().min(1).required(),
  unitCost: yup.number().min(0).required(),
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
  name: yup.string().required(),
  sku: yup.string().required(),
  type: yup.string().required(),
});

export const productFormSchema = yup.object({
  name: yup.string().min(2, 'Product name must be at least 2 characters').required(),
  code: yup.string().optional(),
  sku: yup.string().min(2, 'SKU is required').required(),
  description: yup.string().min(1, 'Description is required').required(),
  shortDescription: yup.string().optional(),
  categoryId: yup.string().min(1, 'Category is required').required(),
  brandId: yup.string().min(1, 'Brand is required').required(),
  productType: yup.string().min(1, 'Product type is required').required(),
  baseModel: yup.string().optional(),
  productFamily: yup.string().optional(),
  status: entityStatusSchema,
  availability: yup.string().optional(),
  isActive: yup.boolean().optional(),
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
