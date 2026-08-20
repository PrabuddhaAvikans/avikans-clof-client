import type { DynamicFormSection } from "@/components/forms/types";
import {
  InventoryItemType,
  InventoryItemTypeLabels,
  PricingMethod,
  PricingMethodLabels,
} from "@/types/inventory";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ITEM_TYPE_OPTIONS = Object.entries(InventoryItemTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

const PRICING_METHOD_OPTIONS = Object.entries(PricingMethodLabels).map(([value, label]) => ({
  value,
  label,
}));

export const inventoryGeneralSections: DynamicFormSection[] = [
  {
    id: "item-details",
    title: "Item Details",
    columns: 3,
    fields: [
      { name: "sku", label: "Item Code (SKU)", type: "text", required: true },
      { name: "name", label: "Item Name", type: "text", required: true },
      {
        name: "itemType",
        label: "Item Type",
        type: "select",
        required: true,
        options: ITEM_TYPE_OPTIONS,
      },
      { name: "category", label: "Category", type: "text", required: true },
      { name: "unit", label: "Unit of Measure", type: "text", required: true },
      { name: "brand", label: "Brand", type: "text" },
      { name: "supplier", label: "Supplier", type: "text" },
      { name: "taxCode", label: "Tax Code", type: "text" },
      {
        name: "status",
        label: "Active / Inactive",
        type: "select",
        options: STATUS_OPTIONS,
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        rows: 2,
        colSpan: 3,
      },
    ],
  },
];

export const inventoryStockSections: DynamicFormSection[] = [
  {
    id: "stock-levels",
    title: "Stock Levels",
    columns: 4,
    fields: [
      { name: "quantityOnHand", label: "Quantity On Hand", type: "number", min: 0 },
      { name: "minStock", label: "Minimum Stock", type: "number", min: 0 },
      { name: "maxStock", label: "Maximum Stock", type: "number", min: 0 },
      { name: "reorderLevel", label: "Reorder Level", type: "number", min: 0 },
      { name: "reorderQuantity", label: "Reorder Quantity", type: "number", min: 0 },
    ],
  },
  {
    id: "warehouse-location",
    title: "Warehouse & Location",
    columns: 2,
    fields: [
      { name: "warehouse", label: "Warehouse", type: "text", required: true },
      { name: "location", label: "Location / Bin", type: "text", required: true },
    ],
  },
];

export const inventoryCostSections: DynamicFormSection[] = [
  {
    id: "cost-prices",
    title: "Cost Prices",
    description: "Cost price is used for BOM and manufacturing costing — not the selling price.",
    columns: 2,
    fields: [
      {
        name: "buyingPrice",
        label: "Buying Price (Optional)",
        type: "number",
        min: 0,
        step: 0.01,
        placeholder: "Supplier purchase price",
      },
      {
        name: "costPrice",
        label: "Cost Price",
        type: "number",
        min: 0,
        step: 0.01,
        required: true,
      },
    ],
  },
];

export const inventoryPricingSections: DynamicFormSection[] = [
  {
    id: "pricing-rules",
    title: "Pricing Rules",
    description: "Selling price applies to direct inventory sales only.",
    columns: 3,
    fields: [
      {
        name: "pricingMethod",
        label: "Pricing Method",
        type: "select",
        required: true,
        options: PRICING_METHOD_OPTIONS,
      },
      {
        name: "markupPercent",
        label: "Markup %",
        type: "number",
        min: 0,
        step: 0.01,
        placeholder: "e.g. 20",
        hidden: (values) => values.pricingMethod !== "percentage_markup",
      },
      {
        name: "markupFixedAmount",
        label: "Fixed Markup Amount",
        type: "number",
        min: 0,
        step: 0.01,
        placeholder: "e.g. 1500",
        hidden: (values) => values.pricingMethod !== "fixed_markup",
      },
      {
        name: "sellingPrice",
        label: "Final Selling Price",
        type: "number",
        min: 0,
        step: 0.01,
        hidden: (values) => values.pricingMethod !== "manual",
      },
      {
        name: "pricingEffectiveDate",
        label: "Effective Date",
        type: "date",
        required: true,
      },
    ],
  },
];

/** @deprecated Use tab-specific section exports */
export const inventoryFormSections: DynamicFormSection[] = [
  ...inventoryGeneralSections,
  ...inventoryStockSections,
  ...inventoryCostSections,
  ...inventoryPricingSections,
];

import type { DynamicFieldConfig, FieldOption } from "@/components/forms/types";

const MOVEMENT_TYPE_OPTIONS: FieldOption[] = [
  { value: "receipt", label: "Stock In" },
  { value: "issue", label: "Stock Out" },
  { value: "adjustment", label: "Adjustment" },
  { value: "reservation", label: "Reservation" },
  { value: "transfer", label: "Transfer" },
  { value: "release", label: "Release Reservation" },
];

export function createStockMovementFormFields(
  itemOptions: FieldOption[] = [],
): DynamicFieldConfig[] {
  return [
    {
      name: "inventoryItemId",
      label: "Inventory Item",
      type: "searchable-select",
      required: true,
      placeholder: "Select item...",
      options: itemOptions,
    },
    {
      name: "type",
      label: "Movement Type",
      type: "select",
      required: true,
      options: MOVEMENT_TYPE_OPTIONS,
    },
    {
      name: "quantity",
      label: "Quantity",
      type: "number",
      required: true,
      min: 0,
      step: 0.01,
    },
    {
      name: "notes",
      label: "Notes",
      type: "textarea",
      rows: 2,
      colSpan: 2,
    },
  ];
}

/** @deprecated Use createStockMovementFormFields instead */
export const stockMovementFormFields = createStockMovementFormFields();

export { InventoryItemType, PricingMethod };
