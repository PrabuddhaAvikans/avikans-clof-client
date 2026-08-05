import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  DollarSign,
  FileText,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";
import { EntityStatusBadge } from "@/features/shared/components/EntityStatusBadge";
import { useCustomer } from "@/features/customers/hooks/useCustomers";
import { useQuotations } from "@/features/sales/hooks/useQuotations";
import { useSalesOrders } from "@/features/sales/hooks/useSalesOrders";
import { formatCurrency, formatDate } from "@/lib/format";
import { ActivityLog } from "@/components/ui/ActivityLog";
import { NotesPanel } from "@/components/ui/NotesPanel";
import { AttachmentPanel } from "@/components/ui/AttachmentPanel";
import { DataTable, type ColumnDef } from "@/components/tables/DataTable";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { QuotationStatus, SalesOrderStatus } from "@/types/status";
import type { Quotation } from "@/types/quotation";
import type { SalesOrder } from "@/types/sales-order";

export function CustomerDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { data: customer, isLoading, error } = useCustomer(id);
  const { data: quotations } = useQuotations({ page: 1, pageSize: 50, customerId: id });
  const { data: orders } = useSalesOrders({ page: 1, pageSize: 50, customerId: id });

  const primaryContact =
    customer?.contactPersons.find((c) => c.isPrimary) ?? customer?.contactPersons[0];

  const billingActiveAddress =
    customer?.billingAddresses?.[customer.activeBillingAddressIndex] ?? customer?.billingAddresses?.[0];

  const deliveryActiveAddress = customer
    ? customer.deliverySameAsBilling
      ? billingActiveAddress
      : customer.shippingAddresses?.[customer.activeShippingAddressIndex ?? 0] ?? billingActiveAddress
    : undefined;

  const quotationColumns = useMemo<ColumnDef<Quotation>[]>(
    () => [
      { accessorKey: "quotationNumber", header: "Quotation #" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <MappedStatusBadge statusMap={QuotationStatus} value={row.original.status} />
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Total",
        cell: ({ row }) => formatCurrency(row.original.totalAmount, row.original.currency),
      },
      {
        accessorKey: "validUntil",
        header: "Valid Until",
        cell: ({ row }) => formatDate(row.original.validUntil),
      },
    ],
    [],
  );

  const orderColumns = useMemo<ColumnDef<SalesOrder>[]>(
    () => [
      { accessorKey: "orderNumber", header: "Order #" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <MappedStatusBadge statusMap={SalesOrderStatus} value={row.original.status} />
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Total",
        cell: ({ row }) => formatCurrency(row.original.totalAmount, row.original.currency),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [],
  );

  const activityEntries = customer
    ? [
        {
          id: "1",
          user: "System",
          action: "Customer profile updated",
          timestamp: customer.updatedAt,
        },
        {
          id: "2",
          user: "System",
          action: "Customer account created",
          timestamp: customer.createdAt,
        },
      ]
    : [];

  return (
    <PageContainer maxWidth="wide">
      <PageContent isLoading={isLoading} error={error ? "Customer not found." : null}>
        {customer && (
          <>
            <PageHeader
              title={customer.name}
              description={customer.code}
              breadcrumbs={[
                { label: "Customers", href: ROUTES.customers.list },
                { label: customer.name },
              ]}
              actions={
                <>
                  <EntityStatusBadge status={customer.status} />
                  <Button
                    variant="outline"
                    leftIcon={<Pencil className="h-4 w-4" />}
                    onClick={() => navigate(ROUTES.customers.edit(customer.id))}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    leftIcon={<FileText className="h-4 w-4" />}
                    onClick={() =>
                      navigate(`${ROUTES.quotations.new}?customerId=${customer.id}`)
                    }
                  >
                    Create Quotation
                  </Button>
                  <Button
                    leftIcon={<ShoppingCart className="h-4 w-4" />}
                    onClick={() =>
                      navigate(`${ROUTES.salesOrders.new}?customerId=${customer.id}`)
                    }
                  >
                    Create Sales Order
                  </Button>
                </>
              }
            />

            <Tabs value={activeTab} onChange={setActiveTab}>
              <TabList className="overflow-x-auto">
                <Tab value="overview">Overview</Tab>
                <Tab value="quotations">Quotations</Tab>
                <Tab value="orders">Orders</Tab>
                <Tab value="invoices">Invoices</Tab>
                <Tab value="deliveries">Deliveries</Tab>
                <Tab value="communications">Communications</Tab>
                <Tab value="notes">Notes</Tab>
                <Tab value="attachments">Attachments</Tab>
                <Tab value="activity">Activity</Tab>
              </TabList>

              <TabPanel value="overview">
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard
                      title="Total Orders"
                      value={customer.totalOrders}
                      icon={<ShoppingCart className="h-5 w-5" />}
                    />
                    <SummaryCard
                      title="Total Revenue"
                      value={formatCurrency(customer.totalRevenue, "LKR")}
                      icon={<DollarSign className="h-5 w-5" />}
                    />
                    <SummaryCard
                      title="Credit Limit"
                      value={formatCurrency(customer.creditLimit ?? 0, "LKR")}
                      icon={<FileText className="h-5 w-5" />}
                    />
                    <SummaryCard
                      title="Payment Terms"
                      value={`${customer.paymentTermsDays} days`}
                      icon={<Package className="h-5 w-5" />}
                    />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-lg border border-border bg-card p-5">
                      <h3 className="mb-3 font-semibold">Contact Information</h3>
                      <dl className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{customer.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{customer.phone}</span>
                        </div>
                        {primaryContact && (
                          <div className="pt-2 border-t border-border">
                            <p className="font-medium">{primaryContact.name}</p>
                            {primaryContact.title && (
                              <p className="text-muted-foreground">{primaryContact.title}</p>
                            )}
                          </div>
                        )}
                      </dl>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-5">
                      <h3 className="mb-3 font-semibold">Billing Address</h3>
                      <div className="flex gap-2 text-sm">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <address className="not-italic">
                          {billingActiveAddress?.line1}
                          {billingActiveAddress?.line2 && (
                            <>, {billingActiveAddress?.line2}</>
                          )}
                          <br />
                          {billingActiveAddress?.city}, {billingActiveAddress?.state}{" "}
                          {billingActiveAddress?.postalCode}
                          <br />
                          {billingActiveAddress?.country}
                        </address>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-5">
                      <h3 className="mb-3 font-semibold">Delivery Address</h3>
                      <div className="flex gap-2 text-sm">
                        <Truck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <address className="not-italic">
                          {deliveryActiveAddress?.line1}
                          {deliveryActiveAddress?.line2 && (
                            <>, {deliveryActiveAddress?.line2}</>
                          )}
                          <br />
                          {deliveryActiveAddress?.city}, {deliveryActiveAddress?.state}{" "}
                          {deliveryActiveAddress?.postalCode}
                          <br />
                          {deliveryActiveAddress?.country}
                        </address>
                      </div>
                    </div>
                  </div>

                  {customer.taxId && (
                    <div className="rounded-lg border border-border bg-card p-5">
                      <h3 className="mb-2 font-semibold">Tax / Business</h3>
                      <p className="text-sm">Tax ID: {customer.taxId}</p>
                    </div>
                  )}
                </div>
              </TabPanel>

              <TabPanel value="quotations">
                <DataTable
                  data={quotations?.items ?? []}
                  columns={quotationColumns}
                  emptyMessage="No quotations"
                  getRowId={(row) => row.id}
                />
              </TabPanel>

              <TabPanel value="orders">
                <DataTable
                  data={orders?.items ?? []}
                  columns={orderColumns}
                  emptyMessage="No sales orders"
                  getRowId={(row) => row.id}
                />
              </TabPanel>

              <TabPanel value="invoices">
                <p className="text-sm text-muted-foreground">
                  Invoices will appear here once billing is integrated.
                </p>
              </TabPanel>

              <TabPanel value="deliveries">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  Delivery records linked to this customer&apos;s orders will appear here.
                </div>
              </TabPanel>

              <TabPanel value="communications">
                <p className="text-sm text-muted-foreground">
                  Email and WhatsApp communications sent to this customer will be logged here.
                </p>
              </TabPanel>

              <TabPanel value="notes">
                <NotesPanel notes={[]} onAddNote={() => undefined} />
              </TabPanel>

              <TabPanel value="attachments">
                <AttachmentPanel attachments={[]} />
              </TabPanel>

              <TabPanel value="activity">
                <ActivityLog entries={activityEntries} />
              </TabPanel>
            </Tabs>
          </>
        )}
      </PageContent>
    </PageContainer>
  );
}

export function CustomerGroupsPage() {
  return (
    <PageContainer>
      <PageHeader title="Customer Groups" description="Organize customers into groups." />
    </PageContainer>
  );
}

export function CustomerActivityPage() {
  return (
    <PageContainer>
      <PageHeader title="Customer Activity" description="View customer interaction history." />
    </PageContainer>
  );
}
