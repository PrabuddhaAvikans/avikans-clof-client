import { delay, generateId, notFoundError, nowIso } from "@/services/http";
import type { InventoryFormData } from "@/services/interfaces/inventoryService";
import type { ReprocessingService } from "@/services/interfaces/reprocessingService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { mockInventoryService } from "@/services/mock/mockInventoryService";
import {
  computeCarriedValue,
  computeRecoveredUnitCost,
  recoveredLotSku,
  sumReprocessingCosts,
  validateReprocessingOutput,
} from "@/lib/materialScrap";
import { InventoryItemType } from "@/types/inventory";
import type {
  CompleteReprocessingInput,
  CreateReprocessingBatchInput,
  ReprocessingBatch,
  ReprocessingCostBreakdown,
} from "@/types/reprocessing";

let batches: ReprocessingBatch[] = [];

const ACTOR = {
  userId: "usr-005",
  userName: "Chaminda Jayasuriya",
};

function emptyCosts(partial?: Partial<ReprocessingCostBreakdown>): ReprocessingCostBreakdown {
  return {
    labour: Number(partial?.labour) || 0,
    electricity: Number(partial?.electricity) || 0,
    machine: Number(partial?.machine) || 0,
    gas: Number(partial?.gas) || 0,
    furnace: Number(partial?.furnace) || 0,
    subcontract: Number(partial?.subcontract) || 0,
    other: Number(partial?.other) || 0,
  };
}

function nextBatchNumber(): string {
  const used = batches
    .map((batch) => Number.parseInt(batch.batchNumber.replace(/\D/g, ""), 10))
    .filter((value) => Number.isFinite(value));
  const next = Math.max(1000, ...used, 1000) + 1;
  return `RP-${next}`;
}

function requireBatch(id: string): ReprocessingBatch {
  const batch = batches.find((item) => item.id === id);
  if (!batch) notFoundError("ReprocessingBatch", id);
  return batch;
}

function replaceBatch(batch: ReprocessingBatch): ReprocessingBatch {
  const index = batches.findIndex((item) => item.id === batch.id);
  if (index === -1) batches.push(batch);
  else batches[index] = batch;
  return batch;
}

function invalidState(message: string): never {
  throw { code: "INVALID_STATE", message };
}

export const mockReprocessingService: ReprocessingService = {
  async list(filters) {
    await delay();
    return applyListQuery(
      cloneData(batches),
      filters,
      ["batchNumber", "inputScrapSku", "inputScrapName", "recoveredLotSku"],
      (item) => {
        if (filters.status && item.status !== filters.status) return false;
        if (filters.inputScrapLotId && item.inputScrapLotId !== filters.inputScrapLotId) {
          return false;
        }
        return true;
      },
    );
  },

  async getById(id) {
    await delay();
    return requireBatch(id);
  },

  async listReusableScrapLots() {
    await delay();
    const listing = await mockInventoryService.list({
      page: 1,
      pageSize: 200,
      status: "active",
      itemType: InventoryItemType.reusable_scrap,
    });
    return listing.items
      .filter((item) => item.quantityAvailable > 0)
      .map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        quantityAvailable: item.quantityAvailable,
        unit: item.unit,
        costPrice: item.costPrice,
      }));
  },

  async create(data: CreateReprocessingBatchInput) {
    await delay();
    const scrap = await mockInventoryService.getById(data.inputScrapLotId);
    if (scrap.itemType !== InventoryItemType.reusable_scrap) {
      invalidState("Reprocessing input must be a reusable scrap inventory lot.");
    }
    const qty = Number(data.inputQuantity) || 0;
    if (qty <= 0) invalidState("Input quantity must be greater than zero.");
    if (qty > scrap.quantityAvailable + 1e-9) {
      invalidState(
        `Insufficient scrap. Available: ${scrap.quantityAvailable} ${scrap.unit}, requested: ${qty}.`,
      );
    }

    const costs = emptyCosts(data.costs);
    const timestamp = nowIso();
    const batch: ReprocessingBatch = {
      id: generateId("rp"),
      batchNumber: nextBatchNumber(),
      status: "draft",
      inputScrapLotId: scrap.id,
      inputScrapSku: scrap.sku,
      inputScrapName: scrap.name,
      inputQuantity: qty,
      inputUnit: scrap.unit,
      inputUnitCost: scrap.costPrice,
      costs,
      totalProcessingCost: sumReprocessingCosts(costs),
      sourceProductionOrderId: data.sourceProductionOrderId,
      notes: data.notes,
      createdBy: ACTOR.userId,
      createdByName: ACTOR.userName,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    batches.unshift(batch);
    return batch;
  },

  async start(id) {
    await delay();
    const batch = requireBatch(id);
    if (batch.status === "completed") {
      invalidState("Completed reprocessing batches cannot be started again.");
    }
    if (batch.status === "in_progress" && batch.wipLotId) {
      return batch;
    }
    if (batch.status === "cancelled") {
      invalidState("Cancelled reprocessing batches cannot be started.");
    }

    const scrap = await mockInventoryService.getById(batch.inputScrapLotId);
    if (scrap.quantityAvailable < batch.inputQuantity) {
      invalidState(
        `Insufficient scrap to start. Available: ${scrap.quantityAvailable}, required: ${batch.inputQuantity}.`,
      );
    }

    const issueMovement = await mockInventoryService.recordMovement(
      scrap.id,
      "issue",
      batch.inputQuantity,
      {
        referenceType: "reprocessing_batch",
        referenceId: batch.id,
        notes: `Reprocessing issue ${batch.batchNumber}`,
        trace: {
          reprocessingBatchId: batch.id,
          sourceMaterialLotId: scrap.id,
          sourceProductionOrderId: batch.sourceProductionOrderId,
          unitCost: batch.inputUnitCost,
          carriedValue: computeCarriedValue(batch.inputQuantity, batch.inputUnitCost),
        },
      },
    );

    const wipSku = `WIP-${batch.batchNumber}`;
    let wip = await mockInventoryService.findBySku(wipSku);
    if (!wip) {
      const form: InventoryFormData = {
        sku: wipSku,
        name: `${scrap.name} (Reprocessing WIP · ${batch.batchNumber})`,
        description: `Under melting / reprocessing for ${batch.batchNumber}. Carried scrap value — not a purchase.`,
        category: "Reusable Materials",
        itemType: InventoryItemType.reprocessing_wip,
        unit: scrap.unit,
        supplier: scrap.supplier,
        quantityOnHand: 0,
        warehouse: scrap.warehouse,
        location: "Furnace / Reprocessing",
        minStock: 0,
        maxStock: scrap.maxStock,
        reorderLevel: 0,
        reorderQuantity: 0,
        costPrice: batch.inputUnitCost,
        pricingMethod: "manual",
        markupPercent: 0,
        markupFixedAmount: 0,
        sellingPrice: 0,
        pricingEffectiveDate: nowIso().slice(0, 10),
        status: "active",
      };
      wip = await mockInventoryService.create(form);
    }

    await mockInventoryService.recordMovement(wip.id, "receipt", batch.inputQuantity, {
      referenceType: "reprocessing_batch",
      referenceId: batch.id,
      notes: `Reprocessing WIP receipt ${batch.batchNumber}`,
      trace: {
        reprocessingBatchId: batch.id,
        sourceMaterialLotId: scrap.id,
        parentMaterialTransactionId: issueMovement.id,
        unitCost: batch.inputUnitCost,
        carriedValue: computeCarriedValue(batch.inputQuantity, batch.inputUnitCost),
      },
    });

    const updated: ReprocessingBatch = {
      ...batch,
      status: "in_progress",
      wipLotId: wip.id,
      issueMovementId: issueMovement.id,
      startedAt: nowIso(),
      updatedAt: nowIso(),
    };
    return replaceBatch(updated);
  },

  async complete(id, data: CompleteReprocessingInput) {
    await delay();
    let batch = requireBatch(id);

    if (batch.status === "completed") {
      return batch;
    }
    if (batch.status === "cancelled") {
      invalidState("Cancelled reprocessing batches cannot be completed.");
    }
    if (batch.status === "draft" || !batch.wipLotId) {
      batch = await this.start(id);
    }

    const costs = emptyCosts({ ...batch.costs, ...data.costs });
    const totalProcessingCost = sumReprocessingCosts(costs);
    const recoveredQty = Number(data.recoveredQuantity) || 0;
    const lossQty = Number(data.processLossQuantity) || 0;

    const validation = validateReprocessingOutput({
      inputQuantity: batch.inputQuantity,
      recoveredQuantity: recoveredQty,
      processLossQuantity: lossQty,
    });
    if (!validation.ok) invalidState(validation.message);

    const recoveredUnitCost = computeRecoveredUnitCost({
      inputQuantity: batch.inputQuantity,
      inputUnitCost: batch.inputUnitCost,
      processingCost: totalProcessingCost,
      recoveredQuantity: recoveredQty,
    });

    const wipId = batch.wipLotId!;
    // Issue full WIP qty out (recovered + loss leave reprocessing).
    await mockInventoryService.recordMovement(wipId, "issue", batch.inputQuantity, {
      referenceType: "reprocessing_batch",
      referenceId: batch.id,
      notes: `Complete reprocessing ${batch.batchNumber} (recover ${recoveredQty}, loss ${lossQty})`,
      trace: {
        reprocessingBatchId: batch.id,
        sourceMaterialLotId: batch.inputScrapLotId,
        parentMaterialTransactionId: batch.issueMovementId,
        unitCost: batch.inputUnitCost,
        carriedValue: computeCarriedValue(batch.inputQuantity, batch.inputUnitCost),
      },
    });

    const lotSku = recoveredLotSku(batch.inputScrapSku, batch.batchNumber);
    let recoveredLot = await mockInventoryService.findBySku(lotSku);
    if (!recoveredLot) {
      const scrap = await mockInventoryService.getById(batch.inputScrapLotId);
      const form: InventoryFormData = {
        sku: lotSku,
        name: `${scrap.name.replace(/\(Reusable Scrap.*\)/, "").trim()} (Recovered · ${batch.batchNumber})`,
        description: `Recovered from ${batch.batchNumber}. Unit cost = carried scrap value + processing costs only (no purchase).`,
        category: "Reusable Materials",
        itemType: InventoryItemType.recovered_material,
        unit: batch.inputUnit,
        supplier: scrap.supplier,
        quantityOnHand: 0,
        warehouse: scrap.warehouse,
        location: "Recovered Bin",
        minStock: 0,
        maxStock: scrap.maxStock,
        reorderLevel: 0,
        reorderQuantity: 0,
        costPrice: recoveredUnitCost,
        pricingMethod: "manual",
        markupPercent: 0,
        markupFixedAmount: 0,
        sellingPrice: 0,
        pricingEffectiveDate: nowIso().slice(0, 10),
        status: "active",
      };
      recoveredLot = await mockInventoryService.create(form);
    } else {
      recoveredLot = await mockInventoryService.update(recoveredLot.id, {
        costPrice: recoveredUnitCost,
      });
    }

    await mockInventoryService.recordMovement(recoveredLot.id, "receipt", recoveredQty, {
      referenceType: "reprocessing_batch",
      referenceId: batch.id,
      notes: `Recovered material ${batch.batchNumber} @ ${recoveredUnitCost}/unit (carried + processing)`,
      trace: {
        reprocessingBatchId: batch.id,
        sourceMaterialLotId: batch.inputScrapLotId,
        parentMaterialTransactionId: batch.issueMovementId,
        unitCost: recoveredUnitCost,
        carriedValue: computeCarriedValue(recoveredQty, recoveredUnitCost),
      },
    });

    const completed: ReprocessingBatch = {
      ...batch,
      status: "completed",
      costs,
      totalProcessingCost,
      recoveredQuantity: recoveredQty,
      processLossQuantity: lossQty,
      recoveredUnitCost,
      recoveredLotId: recoveredLot.id,
      recoveredLotSku: recoveredLot.sku,
      notes: data.notes ? [batch.notes, data.notes].filter(Boolean).join("\n") : batch.notes,
      completedAt: nowIso(),
      updatedAt: nowIso(),
    };
    return replaceBatch(completed);
  },

  async cancel(id, reason) {
    await delay();
    const batch = requireBatch(id);
    if (batch.status === "completed") {
      invalidState("Completed reprocessing batches cannot be cancelled.");
    }
    if (batch.status === "in_progress") {
      invalidState("In-progress batches already issued scrap to WIP and cannot be cancelled in this prototype.");
    }
    const updated: ReprocessingBatch = {
      ...batch,
      status: "cancelled",
      notes: reason ? [batch.notes, `Cancelled: ${reason}`].filter(Boolean).join("\n") : batch.notes,
      updatedAt: nowIso(),
    };
    return replaceBatch(updated);
  },
};
