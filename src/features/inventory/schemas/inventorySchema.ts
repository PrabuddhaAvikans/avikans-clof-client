import * as yup from 'yup';

function coerceNumber() {
  return yup.number().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) {
      return undefined;
    }
    return Number.isNaN(value) ? undefined : value;
  });
}

export const inventoryFormSchema = yup.object({
  sku: yup.string().required('SKU is required'),
  name: yup.string().required('Name is required'),
  description: yup.string().optional(),
  category: yup.string().required('Category is required'),
  unit: yup.string().required('Unit is required'),
  quantityOnHand: coerceNumber().required().min(0, 'Quantity must be 0 or more'),
  reorderLevel: coerceNumber().required().min(0, 'Reorder level must be 0 or more'),
  reorderQuantity: coerceNumber().required().min(0, 'Reorder quantity must be 0 or more'),
  unitCost: coerceNumber().required().min(0, 'Unit cost must be 0 or more'),
  location: yup.string().required('Location is required'),
  supplier: yup.string().optional(),
  status: yup.string().oneOf(['active', 'inactive'] as const).required(),
});

export type InventoryFormValues = yup.InferType<typeof inventoryFormSchema>;

export const stockMovementFormSchema = yup.object({
  inventoryItemId: yup.string().required('Select an inventory item'),
  type: yup
    .string()
    .oneOf(['receipt', 'issue', 'transfer', 'adjustment', 'reservation', 'release'] as const)
    .required(),
  quantity: coerceNumber().required().positive('Quantity must be greater than 0'),
  notes: yup.string().optional(),
});

export type StockMovementFormValues = yup.InferType<typeof stockMovementFormSchema>;
