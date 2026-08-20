import { Link } from "react-router-dom";
import { Calculator, FileText, Send } from "lucide-react";
import { FormikForm } from "@/components/forms/FormikForm";
import { FormikInput } from "@/components/forms/FormikInput";
import { FormikSelect } from "@/components/forms/FormikSelect";
import { FormikTextarea } from "@/components/forms/FormikTextarea";
import { ROUTES } from "@/app/config/routes";
import { Button } from "@/components/ui/Button";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import {
  coatingSubmitSchema,
  type CoatingSubmitFormValues,
} from "@/features/costing/schemas/costingSchema";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workspacePanelBody, workspacePanelEmpty, workspacePanelShell } from "@/lib/panelLayout";
import type { CostingRequest } from "@/types/costing";
import { CoatingStatus, CostingRequestStatus } from "@/types/status";

const FINISH_OPTIONS = [
  { value: "Powder Coating", label: "Powder Coating" },
  { value: "Anodized", label: "Anodized" },
  { value: "Wet Paint", label: "Wet Paint" },
  { value: "Galvanized", label: "Galvanized" },
  { value: "Clear Coat", label: "Clear Coat" },
];

const PROCESS_OPTIONS = [
  { value: "Batch spray", label: "Batch spray" },
  { value: "Electrostatic", label: "Electrostatic" },
  { value: "Dip", label: "Dip" },
  { value: "Manual spray", label: "Manual spray" },
];

export type CoatingDetailPanelProps = {
  request: CostingRequest | null;
  onSubmitCoating?: (values: CoatingSubmitFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  className?: string;
};

export function CoatingDetailPanel({
  request,
  onSubmitCoating,
  isSubmitting,
  className,
}: CoatingDetailPanelProps) {
  if (!request) {
    return (
      <div className={cn(workspacePanelEmpty, className)}>
        <p className="text-sm text-muted-foreground">
          Select a coating request linked to a sales order.
        </p>
      </div>
    );
  }

  const canEdit = request.coatingStatus === "pending" || request.status === "changes_requested";
  const coatingTotal = request.coatingItems.reduce((sum, item) => sum + item.lineTotal, 0);

  return (
    <div className={cn(workspacePanelShell, className)}>
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Coating estimate</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {request.requestNumber} · {request.customerName}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <MappedStatusBadge statusMap={CoatingStatus} value={request.coatingStatus} dot />
            <MappedStatusBadge statusMap={CostingRequestStatus} value={request.status} dot />
          </div>
        </div>
      </div>

      <div className={workspacePanelBody}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {request.salesOrderId && request.salesOrderNumber && (
            <Link
              to={ROUTES.salesOrders.detail(request.salesOrderId)}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40"
            >
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sales Order</p>
              <p className="mt-0.5 font-medium text-primary">{request.salesOrderNumber}</p>
            </Link>
          )}
          {request.quotationId && request.quotationNumber && (
            <Link
              to={ROUTES.quotations.detail(request.quotationId)}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40"
            >
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quotation</p>
              <p className="mt-0.5 font-medium text-primary">{request.quotationNumber}</p>
            </Link>
          )}
        </div>

        {canEdit ? (
          <FormikForm<CoatingSubmitFormValues>
            initialValues={{
              items: request.coatingItems.map((item) => ({
                id: item.id,
                productId: item.productId,
                productName: item.productName,
                finish: item.finish || "Powder Coating",
                process: item.process || "Batch spray",
                quantity: item.quantity,
                unitCost: item.unitCost,
              })),
              materials: [],
              notes: request.notes,
            }}
            validationSchema={coatingSubmitSchema}
            enableReinitialize
            onSubmit={async (values, { setSubmitting }) => {
              await onSubmitCoating?.(values);
              setSubmitting(false);
            }}
            className="space-y-3"
          >
            {({ values, isSubmitting: formSubmitting }) => {
              const liveTotal = values.items.reduce(
                (sum, item) => sum + (Number(item.unitCost) || 0) * (Number(item.quantity) || 0),
                0,
              );

              return (
                <>
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full min-w-[40rem] text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-xs text-muted-foreground">
                          <th className="px-2 py-2 text-left font-medium">Product</th>
                          <th className="px-2 py-2 text-left font-medium">Finish</th>
                          <th className="px-2 py-2 text-left font-medium">Process</th>
                          <th className="px-2 py-2 text-right font-medium">Qty</th>
                          <th className="px-2 py-2 text-right font-medium">Unit cost</th>
                          <th className="px-2 py-2 text-right font-medium">Line</th>
                        </tr>
                      </thead>
                      <tbody>
                        {values.items.map((item, index) => (
                          <tr key={item.id} className="border-t border-border">
                            <td className="px-2 py-2 font-medium">{item.productName}</td>
                            <td className="px-2 py-1.5">
                              <FormikSelect
                                name={`items.${index}.finish`}
                                options={FINISH_OPTIONS}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <FormikSelect
                                name={`items.${index}.process`}
                                options={PROCESS_OPTIONS}
                              />
                            </td>
                            <td className="w-20 px-2 py-1.5">
                              <FormikInput name={`items.${index}.quantity`} type="number" min={1} />
                            </td>
                            <td className="w-28 px-2 py-1.5">
                              <FormikInput name={`items.${index}.unitCost`} type="number" min={0} />
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums">
                              {formatCurrency(
                                (Number(item.unitCost) || 0) * (Number(item.quantity) || 0),
                                request.currency,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-border bg-muted/30">
                        <tr>
                          <td colSpan={5} className="px-2 py-2 font-semibold">
                            Coating total
                          </td>
                          <td className="px-2 py-2 text-right font-semibold tabular-nums">
                            {formatCurrency(liveTotal, request.currency)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <FormikTextarea
                    name="notes"
                    rows={3}
                    label="Coating notes"
                    placeholder="Finish colour, batch notes, special handling…"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    leftIcon={<Send className="h-4 w-4" />}
                    loading={formSubmitting || isSubmitting}
                  >
                    Submit coating for costing approval
                  </Button>
                </>
              );
            }}
          </FormikForm>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Product</th>
                    <th className="px-3 py-2 text-left font-medium">Finish</th>
                    <th className="px-3 py-2 text-left font-medium">Process</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Unit cost</th>
                    <th className="px-3 py-2 text-right font-medium">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {request.coatingItems.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.finish}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.process}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(item.unitCost, request.currency)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(item.lineTotal, request.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-muted/30">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 font-semibold">
                      Coating total
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatCurrency(coatingTotal, request.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {request.notes && <p className="text-sm text-muted-foreground">{request.notes}</p>}
            {request.salesOrderId && (
              <Link to={ROUTES.costing.forOrder(request.salesOrderId)} className="inline-flex">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Calculator className="h-4 w-4" />}
                >
                  Open costing approval
                </Button>
              </Link>
            )}
          </>
        )}

        <section className="rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Flow: Quotation → Sales Order → Coating → Costing Approval → Confirm Order.
              Confirm is blocked until costing is fully approved.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
