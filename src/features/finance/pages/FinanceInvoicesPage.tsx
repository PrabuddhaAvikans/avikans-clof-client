import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { DataTable, type ColumnDef } from "@/components/tables/DataTable";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import type { Invoice } from "@/types/invoice";
import { formatCurrency, formatDate } from "@/lib/format";
import { initialInvoices } from "@/features/finance/mock/mockInvoices";
import { InvoiceStatus } from "@/types/status";
import { Input } from "@/components/ui/Input";

export function FinanceInvoicesPage() {
  const navigate = useNavigate();
  const [invoices] = useState<Invoice[]>(initialInvoices);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        (inv.salesOrderNumber ?? "").toLowerCase().includes(q),
    );
  }, [invoices, search]);

  const columns = useMemo<ColumnDef<Invoice>[]>(() => {
    return [
      { accessorKey: "invoiceNumber", header: "Invoice #" },
      { accessorKey: "customerName", header: "Customer" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <MappedStatusBadge statusMap={InvoiceStatus} value={row.original.status} dot />
        ),
      },
      {
        accessorKey: "issueDate",
        header: "Issue Date",
        cell: ({ row }) => formatDate(row.original.issueDate),
      },
      {
        accessorKey: "outstandingAmount",
        header: "Outstanding",
        cell: ({ row }) => formatCurrency(row.original.outstandingAmount, row.original.currency),
      },
      {
        accessorKey: "amountPaid",
        header: "Paid",
        cell: ({ row }) => formatCurrency(row.original.amountPaid, row.original.currency),
      },
      {
        accessorKey: "amountCredited",
        header: "Credited",
        cell: ({ row }) => formatCurrency(row.original.amountCredited, row.original.currency),
      },
    ];
  }, []);

  return (
    <PageContainer maxWidth="wide" className="py-3">
      <PageHeader
        title="Invoices"
        description="View invoice balances. Apply credit notes from the Credit Notes screen."
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<ArrowRightLeft className="h-4 w-4" />}
            // onClick={() => {
            //   toast.message("Opening credit notes…");
            //   navigate(ROUTES.finance.creditNotes);
            // }}
          >
            Apply Credit Notes
          </Button>
        }
      />

      <PageContent>
        <div className="mb-4 max-w-md">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Invoice, customer, sales order…"
          />
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(row) => row.id}
          enableColumnVisibility={false}
          forceTable
          density="compact"
          emptyMessage="No invoices found."
        />
      </PageContent>
    </PageContainer>
  );
}

