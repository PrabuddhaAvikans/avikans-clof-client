import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "@/components/feedback/toast";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { SearchBar } from "@/components/ui/SearchBar";
import { Select } from "@/components/ui/Select";
import { AuditLogDetailPanel } from "@/features/admin/components/AuditLogDetailPanel";
import { AuditLogListPanel } from "@/features/admin/components/AuditLogListPanel";
import { AuditMetricCards } from "@/features/admin/components/AuditMetricCards";
import { useAuditLogSummary, useAuditLogs } from "@/features/admin/hooks/useAuditLogs";
import { useUsers } from "@/features/admin/hooks/useUsers";
import { AUDIT_ACTION_LABELS, AUDIT_SEVERITY_LABELS } from "@/features/admin/lib/auditLabels";
import { downloadAuditLogsCsv } from "@/features/admin/lib/exportAuditLogs";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermissions } from "@/hooks/usePermissions";
import { workspaceGrid, workspaceGridCol } from "@/lib/panelLayout";
import { cn } from "@/lib/utils";
import { auditService } from "@/services";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  AUDIT_SEVERITIES,
  type AuditAction,
  type AuditEntity,
  type AuditSeverity,
} from "@/types/audit";

function todayIsoDate(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function AuditLogsPage() {
  const { hasPermission } = usePermissions();
  const canExport = hasPermission("audit_logs:export");

  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [severity, setSeverity] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectEdge, setSelectEdge] = useState<"first" | "last">("first");

  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, entity, action, severity, userId, from, to]);

  const listFilters = {
    page,
    pageSize,
    search: debouncedSearch.trim() || undefined,
    entity: (entity as AuditEntity) || undefined,
    action: (action as AuditAction) || undefined,
    severity: (severity as AuditSeverity) || undefined,
    userId: userId || undefined,
    from: from || undefined,
    to: to || undefined,
  };

  const { data, isLoading, error, refetch } = useAuditLogs(listFilters);
  const { data: summary } = useAuditLogSummary({
    search: listFilters.search,
    entity: listFilters.entity,
    action: listFilters.action,
    severity: listFilters.severity,
    userId: listFilters.userId,
    from: listFilters.from,
    to: listFilters.to,
  });
  const { data: users } = useUsers({ page: 1, pageSize: 100, status: "active" });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;

  useEffect(() => {
    if (items.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      const index = selectEdge === "last" ? items.length - 1 : 0;
      setSelectedId(items[index].id);
    }
  }, [items, selectedId, selectEdge]);

  const goToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < items.length) {
        setSelectedId(items[index].id);
        return;
      }
      if (index >= items.length && page < totalPages) {
        setSelectEdge("first");
        setPage((current) => current + 1);
        return;
      }
      if (index < 0 && page > 1) {
        setSelectEdge("last");
        setPage((current) => current - 1);
      }
    },
    [items, page, totalPages],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) {
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        goToIndex(Math.max(0, selectedIndex) + 1);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        goToIndex(selectedIndex - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToIndex, selectedIndex]);

  const hasFilters = Boolean(search || entity || action || severity || userId || from || to);
  const today = todayIsoDate();
  const todayActive = from === today && to === today;
  const activeMetric =
    severity === "critical"
      ? "critical"
      : severity === "warning"
        ? "warning"
        : todayActive
          ? "today"
          : "all";

  const resetFilters = () => {
    setSearch("");
    setEntity("");
    setAction("");
    setSeverity("");
    setUserId("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const handleMetricSelect = (id: "all" | "today" | "warning" | "critical") => {
    if (id === "all") {
      resetFilters();
      return;
    }
    if (id === "today") {
      setFrom(today);
      setTo(today);
      setSeverity("");
      setPage(1);
      return;
    }
    setFrom("");
    setTo("");
    setSeverity(id);
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const result = await auditService.list({
        ...listFilters,
        page: 1,
        pageSize: Math.max(totalCount, pageSize),
      });
      if (result.items.length === 0) {
        toast.error("No audit events to export");
        return;
      }
      downloadAuditLogsCsv(result.items);
      toast.success(`Exported ${result.items.length} audit events`);
    } catch {
      toast.error("Failed to export audit logs");
    }
  };

  const handlePageChange = (nextPage: number, nextSize: number) => {
    setSelectEdge("first");
    setPage(nextPage);
    setPageSize(nextSize);
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Audit Logs"
        description="Review system activity, permission changes, and security events."
        breadcrumbs={[{ label: "Administration" }, { label: "Audit Logs" }]}
        actions={
          canExport ? (
            <Button
              variant="outline"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => void handleExport()}
            >
              Export CSV
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <AuditMetricCards summary={summary} active={activeMetric} onSelect={handleMetricSelect} />

        <FilterPanel variant="toolbar" onReset={hasFilters ? resetFilters : undefined}>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <SearchBar
              label="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search logs..."
            />
            <Select
              label="Entity"
              value={entity}
              onChange={(event) => setEntity(event.target.value)}
              options={[
                { value: "", label: "All entities" },
                ...AUDIT_ENTITIES.map((value) => ({ value, label: value })),
              ]}
            />
            <Select
              label="Action"
              value={action}
              onChange={(event) => setAction(event.target.value)}
              options={[
                { value: "", label: "All actions" },
                ...AUDIT_ACTIONS.map((value) => ({
                  value,
                  label: AUDIT_ACTION_LABELS[value],
                })),
              ]}
            />
            <Select
              label="User"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              options={[
                { value: "", label: "All users" },
                { value: "system", label: "System" },
                ...(users?.items ?? []).map((user) => ({
                  value: user.id,
                  label: user.displayName,
                })),
              ]}
            />
            <Select
              label="Severity"
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
              options={[
                { value: "", label: "All severities" },
                ...AUDIT_SEVERITIES.map((value) => ({
                  value,
                  label: AUDIT_SEVERITY_LABELS[value],
                })),
              ]}
            />
            <div className="sm:col-span-2">
              <DateRangePicker
                label="Date range"
                value={{ from, to }}
                onChange={(range) => {
                  setFrom(range.from ?? "");
                  setTo(range.to ?? "");
                }}
              />
            </div>
          </div>
        </FilterPanel>

        <PageContent
          error={error ? "Failed to load audit logs" : null}
          onRetry={() => void refetch()}
        >
          <div className={workspaceGrid}>
            <div className={cn(workspaceGridCol, "lg:col-span-5")}>
              <AuditLogListPanel
                items={items}
                totalCount={totalCount}
                selectedId={selectedId}
                onSelect={setSelectedId}
                page={page}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                isLoading={isLoading && items.length === 0}
              />
            </div>
            <div className={cn(workspaceGridCol, "lg:col-span-7")}>
              <AuditLogDetailPanel
                log={selected}
                hasPrevious={selectedIndex > 0 || page > 1}
                hasNext={selectedIndex < items.length - 1 || page < totalPages}
                onPrevious={() => goToIndex(selectedIndex - 1)}
                onNext={() => goToIndex(Math.max(0, selectedIndex) + 1)}
              />
            </div>
          </div>
        </PageContent>
      </div>
    </PageContainer>
  );
}
