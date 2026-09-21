import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { useConfirmSalesOrder, useSalesOrder } from "@/features/sales/hooks/useSalesOrders";
import { useCostingBySalesOrder } from "@/features/costing/hooks/useCosting";
import { getConfirmBlockReason } from "@/features/sales/lib/salesOrderFlow";
import { useInventoryItems } from "@/features/inventory/hooks/useInventory";
import { formatCurrency, formatDate } from "@/lib/format";
import { SalesOrderStatus } from "@/types/status";

type ReviewIssue = {
  id: string;
  severity: "warning" | "error";
  message: string;
};

export function SalesOrderReviewPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading, error } = useSalesOrder(id);
  const { data: costing } = useCostingBySalesOrder(id);
  const { data: inventory } = useInventoryItems({ page: 1, pageSize: 500 });
  const confirmOrder = useConfirmSalesOrder();

  const issues = useMemo<ReviewIssue[]>(() => {
    if (!order) return [];

    const list: ReviewIssue[] = [];

    if (!order.shippingAddress?.line1 && !order.billingAddress.line1) {
      list.push({ id: "addr", severity: "error", message: "Delivery address is missing." });
    }

    if (!order.requestedDeliveryDate) {
      list.push({ id: "date", severity: "warning", message: "Requested delivery date not set." });
    }

    if (order.lineItems.length === 0) {
      list.push({ id: "items", severity: "error", message: "No line items on this order." });
    }

    const costingBlock = getConfirmBlockReason(order, costing);
    if (costingBlock) {
      list.push({ id: "costing", severity: "error", message: costingBlock });
    }

    for (const item of order.lineItems) {
      const stock = inventory?.items.find(
        (inv) => inv.sku === item.productSku || inv.name === item.productName,
      );
      if (stock && stock.quantityAvailable < item.quantity) {
        list.push({
          id: `stock-${item.id}`,
          severity: "warning",
          message: `Insufficient stock for ${item.productName}: need ${item.quantity}, available ${stock.quantityAvailable}.`,
        });
      }
    }

    return list;
  }, [order, inventory, costing]);

  const hasErrors = issues.some((i) => i.severity === "error");

  const handleConfirm = async () => {
    await confirmOrder.mutateAsync(id);
    navigate(ROUTES.salesOrders.detail(id));
  };

  return (
    <PageContainer maxWidth="wide">
      <PageContent isLoading={isLoading} error={error ? "Sales order not found." : null}>
        {order && (
          <>
            <PageHeader
              title={`Review Order ${order.orderNumber}`}
              description="Verify order details before confirming submission."
              breadcrumbs={[
                { label: "Sales Orders", href: ROUTES.salesOrders.list },
                { label: order.orderNumber },
                { label: "Review" },
              ]}
              actions={
                <MappedStatusBadge statusMap={SalesOrderStatus} value={order.status} dot />
              }
            />

            {issues.length > 0 && (
              <div className="mb-6 space-y-2">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
                      issue.severity === "error"
                        ? "border-destructive/30 bg-destructive/5 text-destructive"
                        : "border-warning/30 bg-warning/5 text-warning"
                    }`}
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {issue.message}
                  </div>
                ))}
              </div>
            )}

            {issues.length === 0 && (
              <div className="mb-6 flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-4 text-sm text-success">
                <CheckCircle2 className="h-5 w-5" />
                All checks passed. Ready to confirm.
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-4 font-semibold">Order Summary</h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt>Customer</dt><dd>{order.customerName}</dd></div>
                  <div className="flex justify-between"><dt>Priority</dt><dd className="capitalize">{order.priority}</dd></div>
                  <div className="flex justify-between"><dt>Delivery Date</dt><dd>{order.requestedDeliveryDate ? formatDate(order.requestedDeliveryDate) : "-"}</dd></div>
                  <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>Total</dt><dd>{formatCurrency(order.totalAmount, order.currency)}</dd></div>
                </dl>
              </section>

              <section className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-4 font-semibold">Line Items ({order.lineItems.length})</h2>
                <ul className="space-y-2 text-sm">
                  {order.lineItems.map((item) => (
                    <li key={item.id} className="flex justify-between border-b border-border pb-2">
                      <span>{item.productName} × {item.quantity}</span>
                      <span>{formatCurrency(item.lineTotal, order.currency)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {costing && costing.coatingStatus !== "pending" && costing.status !== "approved" && (
                <Button onClick={() => navigate(ROUTES.costing.forOrder(order.id))}>
                  Go to costing approval
                </Button>
              )}
              {costing?.coatingStatus === "pending" && (
                <Button onClick={() => navigate(ROUTES.estimation.forOrder(order.id))}>
                  Open product estimation
                </Button>
              )}
              <Button
                onClick={() => void handleConfirm()}
                loading={confirmOrder.isPending}
                disabled={hasErrors}
              >
                Confirm and Submit
              </Button>
              <Button variant="outline" onClick={() => navigate(ROUTES.salesOrders.edit(order.id))}>
                Edit Order
              </Button>
              <Button variant="ghost" onClick={() => navigate(ROUTES.salesOrders.list)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </PageContent>
    </PageContainer>
  );
}
