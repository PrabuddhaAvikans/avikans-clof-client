import { generateId, nowIso } from "@/services/http";
import type { InventoryFormData } from "@/services/interfaces/inventoryService";
import { mockInventoryService } from "@/services/mock/mockInventoryService";
import {
  computeCarriedValue,
  scrapLotSku,
  validateProductionMaterialBreakdown,
} from "@/lib/materialScrap";
import type {
  ManufacturingJob,
  MaterialRequirement,
  ProductionCompletionInput,
  ProductionMaterialOutcome,
} from "@/types/manufacturing";
import {
  InventoryItemType,
  PRODUCTION_ISSUABLE_ITEM_TYPES,
  type InventoryItem,
} from "@/types/inventory";

function invalidState(message: string): never {
  throw { code: "INVALID_STATE", message };
}

async function resolveIssuableLot(mr: MaterialRequirement): Promise<InventoryItem> {
  const primary = await mockInventoryService.getById(mr.inventoryItemId).catch(() => null);
  if (
    primary &&
    PRODUCTION_ISSUABLE_ITEM_TYPES.includes(primary.itemType) &&
    primary.quantityAvailable > 0
  ) {
    return primary;
  }

  // Prefer recovered / scrap lots that share the same base SKU before failing.
  const listing = await mockInventoryService.list({
    page: 1,
    pageSize: 200,
    status: "active",
  });
  const candidates = listing.items
    .filter(
      (item) =>
        PRODUCTION_ISSUABLE_ITEM_TYPES.includes(item.itemType) &&
        item.quantityAvailable > 0 &&
        (item.id === mr.inventoryItemId ||
          item.sku === mr.inventoryItemSku ||
          item.sku.startsWith(mr.inventoryItemSku) ||
          item.name.toLowerCase().includes(mr.inventoryItemName.toLowerCase().slice(0, 12))),
    )
    .sort((a, b) => {
      // Prefer recovered then reusable scrap then raw (reuse first).
      const rank = (t: InventoryItem["itemType"]) =>
        t === InventoryItemType.recovered_material
          ? 0
          : t === InventoryItemType.reusable_scrap
            ? 1
            : 2;
      return rank(a.itemType) - rank(b.itemType) || b.quantityAvailable - a.quantityAvailable;
    });

  if (candidates[0]) return candidates[0];
  if (primary) return primary;
  invalidState(`No issuable inventory lot found for ${mr.inventoryItemSku}.`);
}

export async function issueMaterialsForJob(job: ManufacturingJob): Promise<ManufacturingJob> {
  const updatedRequirements: MaterialRequirement[] = [];

  for (const mr of job.materialRequirements) {
    if (mr.status === "issued" && mr.issuedQuantity >= mr.requiredQuantity) {
      updatedRequirements.push(mr);
      continue;
    }

    const qtyToIssue = Math.max(0, mr.requiredQuantity - mr.issuedQuantity);
    if (qtyToIssue <= 0) {
      updatedRequirements.push({ ...mr, status: "issued" });
      continue;
    }

    const lot = await resolveIssuableLot(mr);
    if (lot.quantityAvailable < qtyToIssue) {
      invalidState(
        `Insufficient stock to issue ${qtyToIssue} ${mr.unit} of ${mr.inventoryItemSku}. Available: ${lot.quantityAvailable}.`,
      );
    }

    // Release reservation on the BOM-linked item (may differ from the lot we issue from).
    if (mr.reservedQuantity > 0) {
      await mockInventoryService.recordMovement(mr.inventoryItemId, "release", mr.reservedQuantity, {
        referenceType: "manufacturing_job",
        referenceId: job.id,
        notes: `Release reservation for ${job.jobNumber}`,
        trace: {
          sourceProductionOrderId: job.id,
          sourceProductionBatchId: job.jobNumber,
          sourceMaterialLotId: mr.inventoryItemId,
        },
      });
    }

    const issueMovement = await mockInventoryService.recordMovement(lot.id, "issue", qtyToIssue, {
      referenceType: "manufacturing_job",
      referenceId: job.id,
      notes: `Production issue for ${job.jobNumber}`,
      trace: {
        sourceProductionOrderId: job.id,
        sourceProductionBatchId: job.jobNumber,
        sourceMaterialLotId: lot.id,
        unitCost: lot.costPrice,
        carriedValue: computeCarriedValue(qtyToIssue, lot.costPrice),
      },
    });

    updatedRequirements.push({
      ...mr,
      issuedQuantity: mr.issuedQuantity + qtyToIssue,
      reservedQuantity: 0,
      status: "issued",
      issuedFromInventoryItemId: lot.id,
      issuedStockMovementId: issueMovement.id,
      issuedUnitCost: lot.costPrice,
    });
  }

  return {
    ...job,
    materialRequirements: updatedRequirements,
    updatedAt: nowIso(),
  };
}

async function upsertScrapLot(options: {
  source: InventoryItem;
  job: ManufacturingJob;
  quantity: number;
  unitCost: number;
  kind: "reusable_scrap" | "recoverable";
}): Promise<{ lot: InventoryItem; movementId: string }> {
  const { source, job, quantity, unitCost, kind } = options;
  const sku = scrapLotSku(source.sku, `${job.jobNumber}${kind === "recoverable" ? "-RCV" : ""}`);
  const existing = await mockInventoryService.findBySku(sku);

  let lot: InventoryItem;
  if (existing) {
    lot = await mockInventoryService.update(existing.id, {
      costPrice: unitCost,
      quantityOnHand: existing.quantityOnHand,
    });
  } else {
    const form: InventoryFormData = {
      sku,
      name:
        kind === "recoverable"
          ? `${source.name} (Recoverable · ${job.jobNumber})`
          : `${source.name} (Reusable Scrap · ${job.jobNumber})`,
      description: `Carried value from production ${job.jobNumber}. Not a new purchase.`,
      category: "Reusable Materials",
      itemType:
        kind === "recoverable"
          ? InventoryItemType.recovered_material
          : InventoryItemType.reusable_scrap,
      unit: source.unit,
      supplier: source.supplier,
      quantityOnHand: 0,
      warehouse: source.warehouse,
      location: kind === "recoverable" ? "Recovered Bin" : "Scrap Bin",
      minStock: 0,
      maxStock: source.maxStock,
      reorderLevel: 0,
      reorderQuantity: 0,
      buyingPrice: undefined,
      costPrice: unitCost,
      pricingMethod: "manual",
      markupPercent: 0,
      markupFixedAmount: 0,
      sellingPrice: 0,
      pricingEffectiveDate: nowIso().slice(0, 10),
      status: "active",
    };
    lot = await mockInventoryService.create(form);
  }

  const movement = await mockInventoryService.recordMovement(lot.id, "receipt", quantity, {
    referenceType: "manufacturing_job",
    referenceId: job.id,
    notes:
      kind === "recoverable"
        ? `Recoverable material from ${job.jobNumber}`
        : `Reusable scrap from ${job.jobNumber}`,
    trace: {
      sourceProductionOrderId: job.id,
      sourceProductionBatchId: job.jobNumber,
      sourceMaterialLotId: source.id,
      sourceInventoryTransactionId: job.materialRequirements.find(
        (mr) => mr.issuedFromInventoryItemId === source.id,
      )?.issuedStockMovementId,
      unitCost,
      carriedValue: computeCarriedValue(quantity, unitCost),
    },
  });

  // keep source unit cost
  if (lot.costPrice !== unitCost) {
    lot = await mockInventoryService.update(lot.id, { costPrice: unitCost });
  }

  return { lot, movementId: movement.id };
}

export async function postProductionMaterialOutcome(
  job: ManufacturingJob,
  completion: ProductionCompletionInput,
): Promise<{ job: ManufacturingJob; outcome: ProductionMaterialOutcome }> {
  if (job.materialOutcome) {
    return { job, outcome: job.materialOutcome };
  }

  const issuedQty = job.materialRequirements.reduce((sum, mr) => sum + mr.issuedQuantity, 0);
  if (issuedQty <= 0) {
    invalidState("Cannot complete material outcome: no materials have been issued.");
  }

  const recoverable = completion.recoverableQuantity ?? 0;
  const validation = validateProductionMaterialBreakdown({
    issuedQuantity: issuedQty,
    finishedMaterialQuantity: completion.finishedMaterialQuantity,
    reusableScrapQuantity: completion.reusableScrapQuantity,
    recoverableQuantity: recoverable,
    permanentWasteQuantity: completion.permanentWasteQuantity,
  });
  if (!validation.ok) {
    invalidState(validation.message);
  }

  // Allocate scrap/waste proportionally across issued lines by issued qty.
  const scrapLotIds: string[] = [];
  const recoverableLotIds: string[] = [];
  let remainingScrap = completion.reusableScrapQuantity;
  let remainingRecoverable = recoverable;

  const issuedLines = job.materialRequirements.filter((mr) => mr.issuedQuantity > 0);
  for (let i = 0; i < issuedLines.length; i++) {
    const mr = issuedLines[i];
    const isLast = i === issuedLines.length - 1;
    const share = mr.issuedQuantity / issuedQty;
    const scrapShare = isLast
      ? remainingScrap
      : Math.round(completion.reusableScrapQuantity * share * 1000) / 1000;
    const recoverableShare = isLast
      ? remainingRecoverable
      : Math.round(recoverable * share * 1000) / 1000;
    remainingScrap = Math.round((remainingScrap - scrapShare) * 1000) / 1000;
    remainingRecoverable = Math.round((remainingRecoverable - recoverableShare) * 1000) / 1000;

    const sourceId = mr.issuedFromInventoryItemId ?? mr.inventoryItemId;
    const source = await mockInventoryService.getById(sourceId);
    const unitCost = mr.issuedUnitCost ?? source.costPrice;

    if (scrapShare > 0) {
      const { lot } = await upsertScrapLot({
        source,
        job,
        quantity: scrapShare,
        unitCost,
        kind: "reusable_scrap",
      });
      scrapLotIds.push(lot.id);
    }

    if (recoverableShare > 0) {
      const { lot } = await upsertScrapLot({
        source,
        job,
        quantity: recoverableShare,
        unitCost,
        kind: "recoverable",
      });
      recoverableLotIds.push(lot.id);
    }
  }

  // Permanent waste stays out of inventory: quantity already left stock at production issue.
  // Outcome fields below are the audit trail for process loss (no second stock movement).

  const outcome: ProductionMaterialOutcome = {
    finishedMaterialQuantity: completion.finishedMaterialQuantity,
    reusableScrapQuantity: completion.reusableScrapQuantity,
    recoverableQuantity: recoverable,
    permanentWasteQuantity: completion.permanentWasteQuantity,
    postedAt: nowIso(),
    scrapLotIds,
    recoverableLotIds,
  };

  return {
    job: {
      ...job,
      materialOutcome: outcome,
      notes: completion.notes
        ? [job.notes, completion.notes].filter(Boolean).join("\n")
        : job.notes,
      updatedAt: nowIso(),
    },
    outcome,
  };
}

export function buildEmptyOutcomeId(): string {
  return generateId("pmo");
}
