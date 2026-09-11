import type { Product } from "@/types/product";
import type { BomAlternative } from "@/types/product";

export type BomLineSeed = {
  id?: string;
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

export type ProductOperationSeed = {
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
  prerequisiteOperationIds?: string[];
  isQualityCheck?: boolean;
};

export type ProductSeed = Omit<
  Product,
  "versions" | "currentVersionId" | "productType" | "bom" | "operations"
> & {
  productType?: Product["productType"];
  bom?: BomLineSeed[];
  operations?: ProductOperationSeed[];
};

export const initialProducts: ProductSeed[] = [
  {
    id: "prd-001",
    sku: "AVK-PND-001",
    name: "Aurora LED Pendant",
    description:
      "Minimalist single-drop LED pendant with opal diffuser. Ideal for dining areas and kitchen islands. Dimmable 2700K–4000K.",
    categoryId: "cat-007",
    categoryName: "Pendant Lights",
    brandId: "brd-001",
    brandName: "Avikans Signature",
    customerId: "cus-001",
    customerName: "Colombo Grand Hotel",
    basePrice: 28500,
    costPrice: 14200,
    currency: "LKR",
    status: "active",
    images: [
      {
        id: "img-001",
        url: "/assets/products/aurora-pendant-1.jpg",
        alt: "Aurora LED Pendant - front view",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    operations: [
      { id: "prd-001-op-10", name: "Cutting", sequence: 10, description: "Cut aluminium tubes and sheet to size", workstation: "Fab Bay 1", estimatedHours: 0.5, labourCostRate: 500, machineName: "CNC Laser Cutter", machineCost: 200, isRequired: true, prerequisiteOperationIds: [] },
      { id: "prd-001-op-20", name: "Bending", sequence: 20, description: "Form pendant body curvature", workstation: "Fab Bay 1", estimatedHours: 0.33, labourCostRate: 500, machineName: "Press Brake", machineCost: 150, prerequisiteOperationIds: ["prd-001-op-10"] },
      { id: "prd-001-op-30", name: "Welding", sequence: 30, description: "TIG weld body joints", workstation: "Welding Bay", estimatedHours: 0.75, labourCostRate: 650, machineName: "TIG Welder", machineCost: 100, prerequisiteOperationIds: ["prd-001-op-20"] },
      { id: "prd-001-op-40", name: "Grinding", sequence: 40, description: "Smooth weld seams and surface prep", workstation: "Finishing Bay", estimatedHours: 0.33, labourCostRate: 450, prerequisiteOperationIds: ["prd-001-op-30"] },
      { id: "prd-001-op-50", name: "Powder Coating", sequence: 50, description: "Apply RAL 9005 jet black powder coat", workstation: "Coating Line A", estimatedHours: 2, labourCostRate: 400, machineName: "Powder Booth", machineCost: 300, prerequisiteOperationIds: ["prd-001-op-40"] },
      { id: "prd-001-op-60", name: "Wiring", sequence: 60, description: "Install LED module, driver and wiring harness", workstation: "Assembly Line 2", estimatedHours: 0.5, labourCostRate: 550, prerequisiteOperationIds: ["prd-001-op-50"] },
      { id: "prd-001-op-70", name: "Glass Installation", sequence: 70, description: "Mount opal glass diffuser with silicone gasket", workstation: "Assembly Line 2", estimatedHours: 0.33, labourCostRate: 500, prerequisiteOperationIds: ["prd-001-op-50"] },
      { id: "prd-001-op-80", name: "Mounting Bracket Installation", sequence: 80, description: "Attach ceiling canopy and suspension hardware", workstation: "Assembly Line 2", estimatedHours: 0.25, labourCostRate: 450, prerequisiteOperationIds: ["prd-001-op-50"] },
      { id: "prd-001-op-90", name: "Final Assembly", sequence: 90, description: "Complete assembly, cable management, label", workstation: "Assembly Line 2", estimatedHours: 0.5, labourCostRate: 500, prerequisiteOperationIds: ["prd-001-op-60", "prd-001-op-70", "prd-001-op-80"] },
      { id: "prd-001-op-100", name: "Testing", sequence: 100, description: "Electrical safety test, burn-in, lumen verification", workstation: "Test Lab", estimatedHours: 0.25, labourCostRate: 600, machineName: "Integrating Sphere", machineCost: 50, prerequisiteOperationIds: ["prd-001-op-90"] },
      { id: "prd-001-op-110", name: "QC", sequence: 110, description: "Final visual and functional quality check", workstation: "QC Station 1", estimatedHours: 0.33, labourCostRate: 500, isRequired: true, isQualityCheck: true, prerequisiteOperationIds: ["prd-001-op-100"] },
    ],
    bom: [
      {
        id: "bom-001",
        inventoryItemId: "inv-007",
        inventoryItemName: "Blown Glass Shade 180mm",
        sku: "RAW-GLS-SHADE-180",
        quantity: 1,
        unit: "pcs",
        unitCost: 32.0,
      },
      {
        id: "bom-002",
        inventoryItemId: "inv-002",
        inventoryItemName: "LED Driver 24V 60W Dimmable",
        sku: "RAW-DRV-24V-60W",
        quantity: 1,
        unit: "pcs",
        unitCost: 18.75,
      },
      {
        id: "bom-003",
        inventoryItemId: "inv-005",
        inventoryItemName: "3-Core Wiring Kit 1.5mm²",
        sku: "RAW-WIRE-KIT-3C",
        quantity: 1,
        unit: "set",
        unitCost: 4.25,
      },
    ],
    attributes: [
      { id: "attr-001", name: "Wattage", value: "24", unit: "W" },
      { id: "attr-002", name: "Color Temperature", value: "3000", unit: "K" },
      { id: "attr-003", name: "CRI", value: "90" },
      { id: "attr-004", name: "IP Rating", value: "IP20" },
    ],
    weightKg: 2.4,
    dimensions: "Ø180 × H350 mm",
    leadTimeDays: 14,
    minOrderQuantity: 1,
    tags: ["pendant", "residential", "dimmable"],
    createdAt: "2024-03-15T08:00:00Z",
    updatedAt: "2025-06-20T14:00:00Z",
    createdBy: "usr-001",
  },
  {
    id: "prd-002",
    sku: "AVK-WSC-002",
    name: "Horizon Wall Sconce",
    description:
      "Up/down wall sconce with brushed aluminum body. Perfect for corridors and accent lighting.",
    categoryId: "cat-004",
    categoryName: "Residential",
    brandId: "brd-001",
    brandName: "Avikans Signature",
    customerId: "cus-002",
    customerName: "Haritha Architects",
    basePrice: 18500,
    costPrice: 9200,
    currency: "LKR",
    status: "active",
    images: [
      {
        id: "img-002",
        url: "/assets/products/horizon-sconce-1.jpg",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    bom: [
      {
        id: "bom-004",
        inventoryItemId: "inv-003",
        inventoryItemName: "Aluminum Extrusion Profile 40mm",
        sku: "RAW-ALU-EXTR-40",
        quantity: 1,
        unit: "pcs",
        unitCost: 22.0,
      },
      {
        id: "bom-005",
        inventoryItemId: "inv-012",
        inventoryItemName: "LED Driver 12V 30W",
        sku: "RAW-DRV-12V-30W",
        quantity: 1,
        unit: "pcs",
        unitCost: 12.0,
      },
    ],
    attributes: [
      { id: "attr-005", name: "Wattage", value: "12", unit: "W" },
      { id: "attr-006", name: "Color Temperature", value: "4000", unit: "K" },
      { id: "attr-007", name: "IP Rating", value: "IP44" },
    ],
    weightKg: 1.1,
    dimensions: "W80 × H200 × D100 mm",
    leadTimeDays: 10,
    minOrderQuantity: 2,
    tags: ["wall", "residential", "outdoor-rated"],
    createdAt: "2024-04-01T08:00:00Z",
    updatedAt: "2025-05-15T10:00:00Z",
    createdBy: "usr-002",
  },
  {
    id: "prd-003",
    sku: "LMC-CLP-600",
    name: "LumenCraft Ceiling Panel 600×600",
    description:
      "600×600mm LED ceiling panel for commercial drop ceilings. 4000K, 3600lm output.",
    categoryId: "cat-003",
    categoryName: "Commercial",
    brandId: "brd-002",
    brandName: "LumenCraft",
    basePrice: 42000,
    costPrice: 24500,
    currency: "LKR",
    status: "active",
    images: [
      {
        id: "img-003",
        url: "/assets/products/ceiling-panel-600.jpg",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    bom: [
      {
        id: "bom-006",
        inventoryItemId: "inv-004",
        inventoryItemName: "Opal Acrylic Diffuser 300mm",
        sku: "RAW-DIFF-OPAL-300",
        quantity: 4,
        unit: "pcs",
        unitCost: 8.5,
      },
      {
        id: "bom-007",
        inventoryItemId: "inv-002",
        inventoryItemName: "LED Driver 24V 60W Dimmable",
        sku: "RAW-DRV-24V-60W",
        quantity: 1,
        unit: "pcs",
        unitCost: 18.75,
      },
    ],
    attributes: [
      { id: "attr-008", name: "Wattage", value: "36", unit: "W" },
      { id: "attr-009", name: "Luminous Flux", value: "3600", unit: "lm" },
      { id: "attr-010", name: "Color Temperature", value: "4000", unit: "K" },
    ],
    weightKg: 4.5,
    dimensions: "600 × 600 × 12 mm",
    leadTimeDays: 7,
    minOrderQuantity: 10,
    tags: ["commercial", "panel", "office"],
    createdAt: "2024-05-10T08:00:00Z",
    updatedAt: "2025-07-01T09:00:00Z",
    createdBy: "usr-002",
  },
  {
    id: "prd-004",
    sku: "AVK-TRK-004",
    name: "FlexTrack Spot Light",
    description:
      "Adjustable spot head for 3-circuit track systems. 15W COB LED, 24° beam angle.",
    categoryId: "cat-003",
    categoryName: "Commercial",
    brandId: "brd-001",
    brandName: "Avikans Signature",
    basePrice: 15800,
    costPrice: 7800,
    currency: "LKR",
    status: "active",
    images: [
      {
        id: "img-004",
        url: "/assets/products/flextrack-spot.jpg",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    bom: [
      {
        id: "bom-008",
        inventoryItemId: "inv-003",
        inventoryItemName: "Aluminum Extrusion Profile 40mm",
        sku: "RAW-ALU-EXTR-40",
        quantity: 0.5,
        unit: "pcs",
        unitCost: 22.0,
      },
    ],
    attributes: [
      { id: "attr-011", name: "Wattage", value: "15", unit: "W" },
      { id: "attr-012", name: "Beam Angle", value: "24", unit: "°" },
    ],
    weightKg: 0.6,
    dimensions: "Ø80 × H140 mm",
    leadTimeDays: 5,
    minOrderQuantity: 4,
    tags: ["track", "commercial", "retail"],
    createdAt: "2024-06-01T08:00:00Z",
    updatedAt: "2025-06-10T11:00:00Z",
    createdBy: "usr-003",
  },
  {
    id: "prd-005",
    sku: "CGO-OUT-005",
    name: "Coastal Glow Outdoor Lantern",
    description:
      "IP65 rated outdoor wall lantern with tempered glass. Marine-grade aluminum construction.",
    categoryId: "cat-002",
    categoryName: "Outdoor",
    brandId: "brd-003",
    brandName: "Coastal Glow",
    basePrice: 34500,
    costPrice: 19800,
    currency: "LKR",
    status: "active",
    images: [
      {
        id: "img-005",
        url: "/assets/products/coastal-lantern.jpg",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    bom: [
      {
        id: "bom-009",
        inventoryItemId: "inv-001",
        inventoryItemName: "Powder Coat RAL 9005 (Jet Black)",
        sku: "RAW-PC-RAL9005",
        quantity: 0.5,
        unit: "kg",
        unitCost: 12.5,
      },
      {
        id: "bom-010",
        inventoryItemId: "inv-006",
        inventoryItemName: "M4 Stainless Steel Screws (Box 500)",
        sku: "RAW-SCR-M4-SS",
        quantity: 0.02,
        unit: "box",
        unitCost: 6.8,
      },
    ],
    attributes: [
      { id: "attr-013", name: "Wattage", value: "18", unit: "W" },
      { id: "attr-014", name: "IP Rating", value: "IP65" },
    ],
    weightKg: 3.2,
    dimensions: "W200 × H350 × D180 mm",
    leadTimeDays: 21,
    minOrderQuantity: 1,
    tags: ["outdoor", "lantern", "weatherproof"],
    createdAt: "2024-07-01T08:00:00Z",
    updatedAt: "2025-06-25T16:00:00Z",
    createdBy: "usr-002",
  },
  {
    id: "prd-006",
    sku: "AMW-CHD-006",
    name: "Artisan Custom Chandelier",
    description:
      "Bespoke 12-arm chandelier with hand-forged brass arms and crystal drops. Made to order.",
    categoryId: "cat-006",
    categoryName: "Custom",
    brandId: "brd-004",
    brandName: "Artisan Metalworks",
    basePrice: 485000,
    costPrice: 285000,
    currency: "LKR",
    status: "active",
    images: [
      {
        id: "img-006",
        url: "/assets/products/artisan-chandelier.jpg",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    bom: [
      {
        id: "bom-011",
        inventoryItemId: "inv-010",
        inventoryItemName: "Decorative Chain 1m (Brass)",
        sku: "RAW-CBL-CHAIN-1M",
        quantity: 3,
        unit: "pcs",
        unitCost: 14.5,
      },
    ],
    attributes: [
      { id: "attr-015", name: "Arms", value: "12" },
      { id: "attr-016", name: "Material", value: "Brass & Crystal" },
    ],
    weightKg: 18.0,
    dimensions: "Ø900 × H1200 mm",
    leadTimeDays: 45,
    minOrderQuantity: 1,
    tags: ["custom", "chandelier", "luxury"],
    createdAt: "2024-08-01T08:00:00Z",
    updatedAt: "2025-07-15T10:00:00Z",
    createdBy: "usr-001",
  },
  {
    id: "prd-007",
    sku: "AVK-DSK-007",
    name: "Studio Desk Lamp",
    description:
      "Adjustable architect desk lamp with articulated arm and touch dimmer. 12V LED module.",
    categoryId: "cat-004",
    categoryName: "Residential",
    brandId: "brd-001",
    brandName: "Avikans Signature",
    basePrice: 22500,
    costPrice: 11500,
    currency: "LKR",
    status: "active",
    images: [
      {
        id: "img-007",
        url: "/assets/products/studio-desk-lamp.jpg",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    bom: [
      {
        id: "bom-012",
        inventoryItemId: "inv-012",
        inventoryItemName: "LED Driver 12V 30W",
        sku: "RAW-DRV-12V-30W",
        quantity: 1,
        unit: "pcs",
        unitCost: 12.0,
      },
      {
        id: "bom-013",
        inventoryItemId: "inv-009",
        inventoryItemName: "Universal Mounting Bracket",
        sku: "RAW-MNT-BRKT-UNIV",
        quantity: 1,
        unit: "pcs",
        unitCost: 3.75,
      },
    ],
    attributes: [
      { id: "attr-017", name: "Wattage", value: "8", unit: "W" },
      { id: "attr-018", name: "Color Temperature", value: "4000", unit: "K" },
    ],
    weightKg: 1.8,
    dimensions: "Reach 450 mm, Base Ø150 mm",
    leadTimeDays: 7,
    minOrderQuantity: 1,
    tags: ["desk", "office", "adjustable"],
    createdAt: "2024-09-01T08:00:00Z",
    updatedAt: "2025-06-05T09:00:00Z",
    createdBy: "usr-003",
  },
  {
    id: "prd-008",
    sku: "AVK-LNP-008",
    name: "Linear Pendant 1200mm",
    description:
      "Slim linear suspension light for conference rooms and reception areas. Direct/indirect output.",
    categoryId: "cat-003",
    categoryName: "Commercial",
    brandId: "brd-001",
    brandName: "Avikans Signature",
    basePrice: 68000,
    costPrice: 38500,
    currency: "LKR",
    status: "active",
    images: [
      {
        id: "img-008",
        url: "/assets/products/linear-pendant-1200.jpg",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    bom: [
      {
        id: "bom-014",
        inventoryItemId: "inv-003",
        inventoryItemName: "Aluminum Extrusion Profile 40mm",
        sku: "RAW-ALU-EXTR-40",
        quantity: 2,
        unit: "pcs",
        unitCost: 22.0,
      },
      {
        id: "bom-015",
        inventoryItemId: "inv-008",
        inventoryItemName: "LED Strip 24V 4000K CRI90",
        sku: "RAW-LED-STRIP-24V",
        quantity: 0.5,
        unit: "reel",
        unitCost: 45.0,
      },
      {
        id: "bom-016",
        inventoryItemId: "inv-002",
        inventoryItemName: "LED Driver 24V 60W Dimmable",
        sku: "RAW-DRV-24V-60W",
        quantity: 1,
        unit: "pcs",
        unitCost: 18.75,
      },
    ],
    attributes: [
      { id: "attr-019", name: "Wattage", value: "48", unit: "W" },
      { id: "attr-020", name: "Length", value: "1200", unit: "mm" },
      { id: "attr-021", name: "Luminous Flux", value: "4800", unit: "lm" },
    ],
    weightKg: 5.5,
    dimensions: "L1200 × W80 × H60 mm",
    leadTimeDays: 14,
    minOrderQuantity: 2,
    tags: ["linear", "commercial", "suspension"],
    createdAt: "2024-10-01T08:00:00Z",
    updatedAt: "2025-07-20T11:00:00Z",
    createdBy: "usr-002",
  },
  {
    id: "prd-009",
    sku: "AVK-ACC-009",
    name: "Track Rail 2m (3-Circuit)",
    description: "Surface-mount 3-circuit track rail, 2 meter length with end caps.",
    categoryId: "cat-005",
    categoryName: "Accessories",
    brandId: "brd-001",
    brandName: "Avikans Signature",
    basePrice: 12500,
    costPrice: 6200,
    currency: "LKR",
    status: "inactive",
    images: [],
    bom: [
      {
        id: "bom-017",
        inventoryItemId: "inv-003",
        inventoryItemName: "Aluminum Extrusion Profile 40mm",
        sku: "RAW-ALU-EXTR-40",
        quantity: 1,
        unit: "pcs",
        unitCost: 22.0,
      },
    ],
    attributes: [{ id: "attr-022", name: "Length", value: "2000", unit: "mm" }],
    weightKg: 2.0,
    dimensions: "L2000 × W45 × H35 mm",
    leadTimeDays: 3,
    minOrderQuantity: 5,
    tags: ["accessory", "track"],
    createdAt: "2024-11-01T08:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
    createdBy: "usr-003",
  },
];
