import type { InventoryItem } from "@/types/inventory";

type LegacyInventorySeed = Omit<
  InventoryItem,
  | "itemType"
  | "warehouse"
  | "minStock"
  | "maxStock"
  | "costPrice"
  | "pricingMethod"
  | "markupPercent"
  | "markupFixedAmount"
  | "sellingPrice"
  | "pricingEffectiveDate"
> & {
  itemType?: InventoryItem["itemType"];
  warehouse?: string;
  minStock?: number;
  maxStock?: number;
  costPrice?: number;
  pricingMethod?: InventoryItem["pricingMethod"];
  markupPercent?: number;
  markupFixedAmount?: number;
  sellingPrice?: number;
  pricingEffectiveDate?: string;
};

function seedItem(
  item: LegacyInventorySeed,
  defaults: {
    itemType: InventoryItem["itemType"];
    markupPercent?: number;
    markupFixedAmount?: number;
    pricingMethod?: InventoryItem["pricingMethod"];
    sellingPrice?: number;
    buyingPrice?: number;
    brand?: string;
    taxCode?: string;
  },
): InventoryItem {
  const costPrice = item.costPrice ?? item.unitCost;
  const pricingMethod = item.pricingMethod ?? defaults.pricingMethod ?? "percentage_markup";
  const markupPercent = item.markupPercent ?? defaults.markupPercent ?? 20;
  const markupFixedAmount = item.markupFixedAmount ?? defaults.markupFixedAmount ?? 0;
  const sellingPrice =
    item.sellingPrice ??
    (pricingMethod === "fixed_markup"
      ? costPrice + markupFixedAmount
      : Math.round(costPrice * (1 + markupPercent / 100) * 100) / 100);

  return {
    ...item,
    itemType: item.itemType ?? defaults.itemType,
    brand: item.brand ?? defaults.brand,
    taxCode: item.taxCode ?? defaults.taxCode,
    warehouse: item.warehouse ?? "Main Warehouse",
    minStock: item.minStock ?? Math.floor(item.reorderLevel * 0.5),
    maxStock: item.maxStock ?? item.reorderQuantity * 4,
    buyingPrice: item.buyingPrice ?? defaults.buyingPrice,
    costPrice,
    unitCost: costPrice,
    pricingMethod,
    markupPercent,
    markupFixedAmount,
    sellingPrice,
    pricingEffectiveDate: item.pricingEffectiveDate ?? item.createdAt.slice(0, 10),
  };
}

export const initialInventoryItems: InventoryItem[] = [
  seedItem(
    {
      id: "inv-001",
      sku: "RAW-PC-RAL9005",
      name: "Powder Coat RAL 9005 (Jet Black)",
      description: "Electrostatic powder coating finish, 25kg drum.",
      category: "Finishing",
      unit: "kg",
      quantityOnHand: 180,
      quantityReserved: 25,
      quantityAvailable: 155,
      reorderLevel: 50,
      reorderQuantity: 100,
      unitCost: 12.5,
      location: "Warehouse A - Shelf B3",
      supplier: "ColorTech Coatings",
      stockStatus: "in_stock",
      status: "active",
      lastRestockedAt: "2025-07-10T09:00:00Z",
      createdAt: "2024-01-10T08:00:00Z",
      updatedAt: "2025-07-10T09:00:00Z",
    },
    { itemType: "coating", buyingPrice: 10.5, markupPercent: 19 },
  ),
  seedItem(
    {
      id: "inv-002",
      sku: "RAW-DRV-24V-60W",
      name: "LED Driver 24V 60W Dimmable",
      description: "Triac dimmable constant voltage driver, IP20.",
      category: "Electronics",
      unit: "pcs",
      quantityOnHand: 420,
      quantityReserved: 80,
      quantityAvailable: 340,
      reorderLevel: 100,
      reorderQuantity: 200,
      unitCost: 18.75,
      location: "Warehouse A - Shelf E1",
      supplier: "Mean Well",
      stockStatus: "in_stock",
      status: "active",
      lastRestockedAt: "2025-07-05T11:00:00Z",
      createdAt: "2024-01-10T08:00:00Z",
      updatedAt: "2025-07-05T11:00:00Z",
    },
    { itemType: "component", brand: "Mean Well", buyingPrice: 17.25, markupPercent: 20 },
  ),
  seedItem(
    {
      id: "inv-003",
      sku: "RAW-ALU-EXTR-40",
      name: "Aluminum Extrusion Profile 40mm",
      description: "Anodized aluminum channel for linear fixtures, 3m length.",
      category: "Raw Materials",
      unit: "pcs",
      quantityOnHand: 95,
      quantityReserved: 30,
      quantityAvailable: 65,
      reorderLevel: 40,
      reorderQuantity: 60,
      unitCost: 22.0,
      location: "Warehouse B - Rack 12",
      supplier: "AluPro Industries",
      stockStatus: "in_stock",
      status: "active",
      lastRestockedAt: "2025-06-28T14:00:00Z",
      createdAt: "2024-01-10T08:00:00Z",
      updatedAt: "2025-06-28T14:00:00Z",
    },
    { itemType: "raw_material", buyingPrice: 19.5, markupPercent: 12.8 },
  ),
  seedItem(
    {
      id: "inv-004",
      sku: "RAW-DIFF-OPAL-300",
      name: "Opal Acrylic Diffuser 300mm",
      description: "Frosted opal diffuser panel for ceiling panels.",
      category: "Components",
      unit: "pcs",
      quantityOnHand: 28,
      quantityReserved: 12,
      quantityAvailable: 16,
      reorderLevel: 30,
      reorderQuantity: 50,
      unitCost: 8.5,
      location: "Warehouse A - Shelf C2",
      supplier: "PlastLite",
      stockStatus: "low_stock",
      status: "active",
      lastRestockedAt: "2025-06-15T10:00:00Z",
      createdAt: "2024-02-01T08:00:00Z",
      updatedAt: "2025-06-15T10:00:00Z",
    },
    { itemType: "component", buyingPrice: 7.2, markupPercent: 18 },
  ),
  seedItem(
    {
      id: "inv-005",
      sku: "RAW-WIRE-KIT-3C",
      name: "3-Core Wiring Kit 1.5mm²",
      description: "Pre-cut wiring harness with terminal blocks.",
      category: "Components",
      unit: "set",
      quantityOnHand: 350,
      quantityReserved: 45,
      quantityAvailable: 305,
      reorderLevel: 80,
      reorderQuantity: 150,
      unitCost: 4.25,
      location: "Warehouse A - Shelf D4",
      supplier: "ElectroSupply LK",
      stockStatus: "in_stock",
      status: "active",
      lastRestockedAt: "2025-07-12T08:30:00Z",
      createdAt: "2024-02-01T08:00:00Z",
      updatedAt: "2025-07-12T08:30:00Z",
    },
    { itemType: "component", buyingPrice: 3.6, markupPercent: 18 },
  ),
  seedItem(
    {
      id: "inv-006",
      sku: "RAW-SCR-M4-SS",
      name: "M4 Stainless Steel Screws (Box 500)",
      description: "A2 stainless pan head screws for fixture assembly.",
      category: "Hardware",
      unit: "box",
      quantityOnHand: 62,
      quantityReserved: 8,
      quantityAvailable: 54,
      reorderLevel: 20,
      reorderQuantity: 40,
      unitCost: 6.8,
      location: "Warehouse A - Bin F7",
      supplier: "FastenPro",
      stockStatus: "in_stock",
      status: "active",
      lastRestockedAt: "2025-07-01T09:00:00Z",
      createdAt: "2024-02-01T08:00:00Z",
      updatedAt: "2025-07-01T09:00:00Z",
    },
    { itemType: "consumable", buyingPrice: 5.9, markupPercent: 15 },
  ),
  seedItem(
    {
      id: "inv-007",
      sku: "RAW-GLS-SHADE-180",
      name: "Blown Glass Shade 180mm",
      description: "Clear hand-blown glass shade for pendant fixtures.",
      category: "Components",
      unit: "pcs",
      quantityOnHand: 45,
      quantityReserved: 15,
      quantityAvailable: 30,
      reorderLevel: 20,
      reorderQuantity: 30,
      unitCost: 32.0,
      location: "Warehouse A - Shelf A1",
      supplier: "GlassArt Studio",
      stockStatus: "in_stock",
      status: "active",
      lastRestockedAt: "2025-06-20T13:00:00Z",
      createdAt: "2024-03-01T08:00:00Z",
      updatedAt: "2025-06-20T13:00:00Z",
    },
    {
      itemType: "component",
      buyingPrice: 26.0,
      pricingMethod: "manual",
      sellingPrice: 48.0,
      markupPercent: 0,
    },
  ),
  seedItem(
    {
      id: "inv-008",
      sku: "RAW-LED-STRIP-24V",
      name: "LED Strip 24V 4000K CRI90",
      description: "High-density LED strip, 120 LEDs/m, 5m reel.",
      category: "Electronics",
      unit: "reel",
      quantityOnHand: 18,
      quantityReserved: 10,
      quantityAvailable: 8,
      reorderLevel: 15,
      reorderQuantity: 25,
      unitCost: 45.0,
      location: "Warehouse A - Shelf E3",
      supplier: "Osram",
      stockStatus: "low_stock",
      status: "active",
      lastRestockedAt: "2025-06-01T10:00:00Z",
      createdAt: "2024-03-01T08:00:00Z",
      updatedAt: "2025-06-01T10:00:00Z",
    },
    { itemType: "component", brand: "Osram", buyingPrice: 38.0, markupPercent: 18.4 },
  ),
  seedItem(
    {
      id: "inv-009",
      sku: "RAW-MNT-BRKT-UNIV",
      name: "Universal Mounting Bracket",
      description: "Adjustable ceiling/wall mounting bracket, powder coated.",
      category: "Hardware",
      unit: "pcs",
      quantityOnHand: 210,
      quantityReserved: 35,
      quantityAvailable: 175,
      reorderLevel: 50,
      reorderQuantity: 100,
      unitCost: 3.75,
      location: "Warehouse B - Rack 5",
      supplier: "Avikans In-house",
      stockStatus: "in_stock",
      status: "active",
      lastRestockedAt: "2025-07-08T15:00:00Z",
      createdAt: "2024-04-01T08:00:00Z",
      updatedAt: "2025-07-08T15:00:00Z",
    },
    { itemType: "component", pricingMethod: "fixed_markup", markupFixedAmount: 1.25 },
  ),
  seedItem(
    {
      id: "inv-010",
      sku: "RAW-CBL-CHAIN-1M",
      name: "Decorative Chain 1m (Brass)",
      description: "Solid brass suspension chain for pendant lights.",
      category: "Components",
      unit: "pcs",
      quantityOnHand: 0,
      quantityReserved: 0,
      quantityAvailable: 0,
      reorderLevel: 25,
      reorderQuantity: 50,
      unitCost: 14.5,
      location: "Warehouse A - Shelf A3",
      supplier: "ChainWorks",
      stockStatus: "out_of_stock",
      status: "active",
      lastRestockedAt: "2025-05-10T10:00:00Z",
      createdAt: "2024-04-01T08:00:00Z",
      updatedAt: "2025-05-10T10:00:00Z",
    },
    { itemType: "component", buyingPrice: 12.0, markupPercent: 20.8 },
  ),
  seedItem(
    {
      id: "inv-011",
      sku: "RAW-PC-RAL9016",
      name: "Powder Coat RAL 9016 (Traffic White)",
      category: "Finishing",
      unit: "kg",
      quantityOnHand: 120,
      quantityReserved: 10,
      quantityAvailable: 110,
      reorderLevel: 40,
      reorderQuantity: 80,
      unitCost: 11.8,
      location: "Warehouse A - Shelf B3",
      supplier: "ColorTech Coatings",
      stockStatus: "in_stock",
      status: "active",
      lastRestockedAt: "2025-07-02T09:00:00Z",
      createdAt: "2024-05-01T08:00:00Z",
      updatedAt: "2025-07-02T09:00:00Z",
    },
    { itemType: "coating", buyingPrice: 9.8, markupPercent: 20.4 },
  ),
  seedItem(
    {
      id: "inv-012",
      sku: "RAW-DRV-12V-30W",
      name: "LED Driver 12V 30W",
      description: "Constant voltage driver for desk and accent lights.",
      category: "Electronics",
      unit: "pcs",
      quantityOnHand: 85,
      quantityReserved: 20,
      quantityAvailable: 65,
      reorderLevel: 30,
      reorderQuantity: 60,
      unitCost: 12.0,
      location: "Warehouse A - Shelf E1",
      supplier: "Mean Well",
      stockStatus: "in_stock",
      status: "active",
      lastRestockedAt: "2025-06-25T11:00:00Z",
      createdAt: "2024-05-01T08:00:00Z",
      updatedAt: "2025-06-25T11:00:00Z",
    },
    { itemType: "component", brand: "Mean Well", buyingPrice: 10.5, markupPercent: 14.3 },
  ),
];
