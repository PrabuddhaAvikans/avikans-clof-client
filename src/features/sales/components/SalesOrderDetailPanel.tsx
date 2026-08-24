import { Link } from "react-router-dom";
import { Copy, ExternalLink, FileText, Package } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { Button } from "@/components/ui/Button";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { TaxBreakdownRows } from "@/features/sales/components/TaxBreakdownRows";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { formatCurrency, formatDate, formatDateTime, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workspacePanelBody, workspacePanelEmpty, workspacePanelShell } from "@/lib/panelLayout";
import type { Address } from "@/types/common";
import type { SalesOrder } from "@/types/sales-order";
import { PaymentStatus, SalesOrderStatus } from "@/types/status";

function formatAddress(address: Address): string {
  return [address.line1, address.line2, `${address.city}, ${address.state} ${address.postalCode}`, address.country]
    .filter(Boolean)
    .join(", ");
}

export type SalesOrderDetailPanelProps = {
  order: SalesOrder | null;
  className?: string;
};

export function SalesOrderDetailPanel({ order, className }: SalesOrderDetailPanelProps) {
  if (!order) {
    return (
      <div className={cn(workspacePanelEmpty, className)}>
        <p className="text-sm text-muted-foreground">Select a sales order to view details.</p>
      </div>
    );
  }

  const discountPercent =
    order.subtotal > 0 ? (order.discountAmount / order.subtotal) * 100 : 0;
  const preTax = order.subtotal - order.discountAmount;
  const taxCountry =
    order.billingAddress?.country || order.shippingAddress?.country || DEFAULT_COUNTRY;

  return (
    <div className={cn(workspacePanelShell, className)}>
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Sales Order & Fulfillment
              </h2>
              <MappedStatusBadge statusMap={SalesOrderStatus} value={order.status} dot />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Link
                to={ROUTES.salesOrders.detail(order.id)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                {order.orderNumber}
              </Link>
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Copy order number"
                onClick={() => {
                  void navigator.clipboard.writeText(order.orderNumber);
                  toast.success("Order number copied");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <MappedStatusBadge statusMap={PaymentStatus} value={order.paymentStatus} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Created on {formatDateTime(order.createdAt)} by {order.createdByName}
            </p>
            {order.requestedDeliveryDate && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Requested delivery {formatDate(order.requestedDeliveryDate)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={ROUTES.salesOrders.detail(order.id)}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<ExternalLink className="h-4 w-4" />}
              >
                Open Order Page
              </Button>
            </Link>
            {order.quotationId && order.quotationNumber && (
              <Link to={ROUTES.quotations.detail(order.quotationId)}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<FileText className="h-4 w-4" />}
                >
                  Quotation {order.quotationNumber}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className={workspacePanelBody}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <section className="rounded-md border border-border p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Customer Information
            </h3>
            <dl className="space-y-1.5 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Customer Name</dt>
                <dd className="font-medium">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="font-medium">{order.customerEmail}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Billing Address</dt>
                <dd className="font-medium leading-snug">
                  {formatAddress(order.billingAddress)}
                </dd>
              </div>
            </dl>
            <Link
              to={ROUTES.customers.detail(order.customerId)}
              className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
            >
              View Customer Profile
            </Link>
          </section>

          <section className="rounded-md border border-border p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Order Information
            </h3>
            <dl className="space-y-1.5 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Priority</dt>
                <dd className="font-medium capitalize">{order.priority}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Assigned To</dt>
                <dd className="font-medium">{order.assignedToName ?? "Unassigned"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Source Quotation</dt>
                <dd className="font-medium">
                  {order.quotationId && order.quotationNumber ? (
                    <Link
                      to={ROUTES.quotations.detail(order.quotationId)}
                      className="text-primary hover:underline"
                    >
                      {order.quotationNumber}
                    </Link>
                  ) : (
                    "Manual order"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Shipping Address</dt>
                <dd className="font-medium leading-snug">
                  {order.shippingAddress
                    ? formatAddress(order.shippingAddress)
                    : "Same as billing"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-border p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Financial Summary
            </h3>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Sub Total</dt>
                <dd className="tabular-nums font-medium">
                  {formatCurrency(order.subtotal, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">
                  Discount ({formatPercent(discountPercent, 2)})
                </dt>
                <dd className="tabular-nums font-medium">
                  −{formatCurrency(order.discountAmount, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Pre-Tax Total</dt>
                <dd className="tabular-nums font-medium">
                  {formatCurrency(preTax, order.currency)}
                </dd>
              </div>
              <TaxBreakdownRows
                taxAmount={order.taxAmount}
                taxableAmount={preTax}
                currency={order.currency}
                country={taxCountry}
              />
              <div className="mt-1 flex justify-between gap-2 border-t border-border pt-2">
                <dt className="font-semibold text-foreground">Grand Total</dt>
                <dd className="tabular-nums text-base font-semibold text-foreground">
                  {formatCurrency(order.totalAmount, order.currency)}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Order Items
            </h3>
            <span className="text-xs text-muted-foreground">
              {order.lineItems.length} item{order.lineItems.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ul className="divide-y divide-border rounded-md border border-border">
            {order.lineItems.map((item, index) => (
              <li key={item.id} className="flex gap-3 px-3 py-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-[11px] font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border bg-muted/40">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={ROUTES.products.detail(item.productId)}
                        className="truncate text-sm font-medium text-primary hover:underline"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-xs text-muted-foreground">{item.productSku}</p>
                    </div>
                    <p className="shrink-0 tabular-nums text-sm font-semibold">
                      {formatCurrency(item.lineTotal, order.currency)}
                    </p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>
                      Qty: <span className="text-foreground">{item.quantity}</span>
                    </span>
                    <span>
                      In mfg:{" "}
                      <span className="text-foreground">
                        {item.quantityInManufacturing || 0}
                      </span>
                    </span>
                    <span>
                      Delivered:{" "}
                      <span className="text-foreground">
                        {item.quantityDelivered || 0}
                      </span>
                    </span>
                    <span>
                      Unit:{" "}
                      <span className="text-foreground">
                        {formatCurrency(item.unitPrice, order.currency)}
                      </span>
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <section className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Notes</h3>
            </div>
            <div className="p-4 text-sm text-foreground">
              {order.notes?.trim() || "No notes added."}
            </div>
          </section>

          <section className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Fulfillment Links</h3>
            </div>
            <ul className="divide-y divide-border text-sm">
              <li className="flex justify-between gap-2 px-4 py-2.5">
                <span className="text-muted-foreground">Manufacturing jobs</span>
                <span className="font-medium">
                  {order.manufacturingJobIds.length || "None"}
                </span>
              </li>
              <li className="flex justify-between gap-2 px-4 py-2.5">
                <span className="text-muted-foreground">Deliveries</span>
                <span className="font-medium">
                  {order.deliveryIds.length || "None"}
                </span>
              </li>
              <li className="flex justify-between gap-2 px-4 py-2.5">
                <span className="text-muted-foreground">Confirmed</span>
                <span className="font-medium">
                  {order.confirmedAt ? formatDateTime(order.confirmedAt) : "-"}
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
