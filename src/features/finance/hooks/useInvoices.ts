import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import { invoicesActions } from "@/features/finance/store/invoicesSlice";
import type { InvoiceListFilters } from "@/services";
import type { Invoice } from "@/types/invoice";
import type { PaginatedResponse } from "@/types/common";

export function useInvoices(filters: InvoiceListFilters) {
  return useEpicQuery<InvoiceListFilters, PaginatedResponse<Invoice>>({
    arg: filters,
    request: invoicesActions.fetchListRequest,
    selectEntry: (state, key) => state.invoices.lists[key],
  });
}

export function useInvoice(id: string) {
  return useEpicQuery<string, Invoice>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: invoicesActions.fetchDetailRequest,
    selectEntry: (state, key) => state.invoices.details[key],
  });
}
