import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";
import { DataTable, type ColumnDef } from "@/components/tables/DataTable";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { useSalesOrder } from "@/features/sales/hooks/useSalesOrders";
import { formatCurrency, formatDate } from "@/lib/format";
import { PaymentStatus, SalesOrderStatus } from "@/types/status";
import type { SalesOrderLineItem } from "@/types/sales-order";

export function SalesOrderDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: order, isLoading, error } = useSalesOrder(id);

  const lineItemColumns = useMemo<ColumnDef<SalesOrderLineItem>[]>(
    () => [
      { accessorKey: "productSku", header: "SKU" },
      { accessorKey: "productName", header: "Product" },
      { accessorKey: "quantity", header: "Qty" },
      {
        accessorKey: "quantityInManufacturing",
        header: "In Mfg",
        cell: ({ row }) => row.original.quantityInManufacturing || "-",
      },
      {
        accessorKey: "quantityDelivered",
        header: "Delivered",
        cell: ({ row }) => row.original.quantityDelivered || "-",
      },
      {
        accessorKey: "lineTotal",
        header: "Total",
        cell: ({ row }) =>
          order ? formatCurrency(row.original.lineTotal, order.currency) : "-",
      },
    ],
    [order],
  );

  return (
    <PageContainer maxWidth="wide">
      <PageContent isLoading={isLoading} error={error ? "Sales order not found." : null}>
        {order && (
          <>
            <PageHeader
              title={`Order ${order.orderNumber}`}
              description={order.customerName}
              breadcrumbs={[
                { label: "Sales Orders", href: ROUTES.salesOrders.list },
                { label: order.orderNumber },
              ]}
              actions={
                <>
                  <MappedStatusBadge statusMap={SalesOrderStatus} value={order.status} dot />
                  {["draft", "pending_review"].includes(order.status) && (
                    <Button
                      variant="outline"
                      leftIcon={<Pencil className="h-4 w-4" />}
                      onClick={() => navigate(ROUTES.salesOrders.edit(order.id))}
                    >
                      Edit
                    </Button>
                  )}
                </>
              }
            />

            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard title="Order Total" value={formatCurrency(order.totalAmount, order.currency)} />
              <SummaryCard
                title="Payment Status"
                value={order.paymentStatus.replace(/_/g, " ")}
              />
              <SummaryCard
                title="Delivery Date"
                value={
                  order.requestedDeliveryDate
                    ? formatDate(order.requestedDeliveryDate)
                    : "Not set"
                }
              />
              <SummaryCard
                title="Manufacturing Jobs"
                value={order.manufacturingJobIds.length}
              />
            </div>

            <Tabs value={activeTab} onChange={setActiveTab}>
              <TabList className="overflow-x-auto">
                <Tab value="overview">Overview</Tab>
                <Tab value="lineItems">Line Items</Tab>
                <Tab value="delivery">Delivery</Tab>
                <Tab value="manufacturing">Manufacturing</Tab>
                <Tab value="payments">Payments</Tab>
                <Tab value="activity">Activity</Tab>
              </TabList>

              <TabPanel value="overview">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card p-5">
                    <h3 className="mb-3 font-semibold">Customer</h3>
                    <p>{order.customerName}</p>
                    <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                    {order.quotationNumber && (
                      <p className="mt-2 text-sm">
                        From quotation: <span className="font-medium">{order.quotationNumber}</span>
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border bg-card p-5">
                    <h3 className="mb-3 font-semibold">Delivery Address</h3>
                    <address className="text-sm not-italic text-muted-foreground">
                      {(order.shippingAddress ?? order.billingAddress).line1}
                      <br />
                      {(order.shippingAddress ?? order.billingAddress).city},{" "}
                      {(order.shippingAddress ?? order.billingAddress).state}
                    </address>
                  </div>
                </div>
                {order.notes && (
                  <p className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                    {order.notes}
                  </p>
                )}
              </TabPanel>

              <TabPanel value="lineItems">
                <DataTable
                  data={order.lineItems}
                  columns={lineItemColumns}
                  getRowId={(row) => row.id}
                  enableColumnVisibility={false}
                />
              </TabPanel>

              <TabPanel value="delivery">
                <p className="text-sm text-muted-foreground">
                  {order.deliveryIds.length > 0
                    ? `${order.deliveryIds.length} delivery record(s) linked.`
                    : "No deliveries scheduled yet."}
                </p>
              </TabPanel>

              <TabPanel value="manufacturing">
                <p className="text-sm text-muted-foreground">
                  {order.manufacturingJobIds.length > 0
                    ? `${order.manufacturingJobIds.length} manufacturing job(s) in progress.`
                    : "No manufacturing jobs assigned."}
                </p>
              </TabPanel>

              <TabPanel value="payments">
                <MappedStatusBadge statusMap={PaymentStatus} value={order.paymentStatus} dot />
              </TabPanel>

              <TabPanel value="activity">
                <ul className="space-y-3 text-sm">
                  {order.confirmedAt && (
                    <li>Confirmed: {formatDate(order.confirmedAt)}</li>
                  )}
                  <li>Created: {formatDate(order.createdAt)} by {order.createdByName}</li>
                </ul>
              </TabPanel>
            </Tabs>
          </>
        )}
      </PageContent>
    </PageContainer>
  );
}

export function PaymentsPage() {
  return (
    <PageContainer>
      <PageHeader title="Payments" description="Record and reconcile customer payments." />
    </PageContainer>
  );
}

export function InvoicesPage() {
  return (
    <PageContainer>
      <PageHeader title="Invoices" description="Manage billing and invoices." />
    </PageContainer>
  );
}
