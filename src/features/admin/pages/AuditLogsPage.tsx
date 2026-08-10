import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/tables/DataTable";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { SearchBar } from "@/components/ui/SearchBar";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/format";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  severity: "info" | "warning" | "critical";
}

const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "aud-001",
    timestamp: "2025-07-21T14:30:00Z",
    user: "Mike Thompson",
    action: "Updated",
    entity: "ManufacturingJob",
    entityId: "mj-001",
    details: "Changed status to in_progress",
    severity: "info",
  },
  {
    id: "aud-002",
    timestamp: "2025-07-21T12:00:00Z",
    user: "Prabuddha Jayawardhana",
    action: "Created",
    entity: "Delivery",
    entityId: "del-003",
    details: "Created delivery DL-2025-0501",
    severity: "info",
  },
  {
    id: "aud-003",
    timestamp: "2025-07-20T16:45:00Z",
    user: "Admin",
    action: "Updated",
    entity: "Role",
    entityId: "rol-003",
    details: "Modified permissions for Production Manager",
    severity: "warning",
  },
  {
    id: "aud-004",
    timestamp: "2025-07-20T09:15:00Z",
    user: "Raj Patel",
    action: "Deleted",
    entity: "Quotation",
    entityId: "qt-089",
    details: "Deleted draft quotation",
    severity: "warning",
  },
  {
    id: "aud-005",
    timestamp: "2025-07-19T18:00:00Z",
    user: "System",
    action: "Failed Login",
    entity: "User",
    entityId: "usr-unknown",
    details: "3 failed login attempts from 192.168.1.45",
    severity: "critical",
  },
  {
    id: "aud-006",
    timestamp: "2025-07-19T10:30:00Z",
    user: "Sarah Chen",
    action: "Approved",
    entity: "SalesOrder",
    entityId: "so-001",
    details: "Confirmed sales order SO-2025-0089",
    severity: "info",
  },
];

export function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [severity, setSeverity] = useState("");

  const filtered = useMemo(() => {
    return MOCK_AUDIT_LOGS.filter((log) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !log.user.toLowerCase().includes(q) &&
          !log.details.toLowerCase().includes(q) &&
          !log.entityId.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (entity && log.entity !== entity) return false;
      if (severity && log.severity !== severity) return false;
      return true;
    });
  }, [search, entity, severity]);

  const entityOptions = useMemo(
    () => [...new Set(MOCK_AUDIT_LOGS.map((l) => l.entity))].map((e) => ({ value: e, label: e })),
    [],
  );

  const columns = useMemo<ColumnDef<AuditLogEntry>[]>(
    () => [
      {
        id: "timestamp",
        header: "Timestamp",
        cell: ({ row }) => formatDateTime(row.original.timestamp),
      },
      { id: "user", accessorKey: "user", header: "User" },
      { id: "action", accessorKey: "action", header: "Action" },
      {
        id: "entity",
        header: "Entity",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.entity}</p>
            <p className="text-xs text-muted-foreground">{row.original.entityId}</p>
          </div>
        ),
      },
      { id: "details", accessorKey: "details", header: "Details" },
      {
        id: "severity",
        header: "Severity",
        cell: ({ row }) => (
          <StatusBadge
            variant={
              row.original.severity === "critical"
                ? "danger"
                : row.original.severity === "warning"
                  ? "warning"
                  : "info"
            }
            size="sm"
          >
            {row.original.severity}
          </StatusBadge>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Audit Logs"
        description="Review system activity and audit trail."
        breadcrumbs={[{ label: "Administration" }, { label: "Audit Logs" }]}
      />

      <div className="mb-6">
        <FilterPanel
          onReset={() => {
            setSearch("");
            setEntity("");
            setSeverity("");
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search logs..."
            />
            <Select
              label="Entity"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              options={entityOptions}
              placeholder="All entities"
            />
            <Select
              label="Severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              options={[
                { value: "info", label: "Info" },
                { value: "warning", label: "Warning" },
                { value: "critical", label: "Critical" },
              ]}
              placeholder="All severities"
            />
          </div>
        </FilterPanel>
      </div>

      <DataTable data={filtered} columns={columns} pageSize={15} getRowId={(row) => row.id} />
    </PageContainer>
  );
}
