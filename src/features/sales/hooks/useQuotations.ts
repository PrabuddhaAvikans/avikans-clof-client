import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { quotationsActions } from "@/features/sales/store/quotationsSlice";
import type {
  QuotationContactInput,
  QuotationFormData,
  QuotationListFilters,
} from "@/services";
import type { Quotation } from "@/types/quotation";
import type { SalesOrder } from "@/types/sales-order";
import type { PaginatedResponse } from "@/types/common";

export function useQuotations(filters: QuotationListFilters) {
  return useEpicQuery<QuotationListFilters, PaginatedResponse<Quotation>>({
    arg: filters,
    request: quotationsActions.fetchListRequest,
    selectEntry: (state, key) => state.quotations.lists[key],
  });
}

export function useQuotation(id: string) {
  return useEpicQuery<string, Quotation>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: quotationsActions.fetchDetailRequest,
    selectEntry: (state, key) => state.quotations.details[key],
  });
}

export function useCreateQuotation() {
  return useEpicMutation<QuotationFormData, Quotation>({
    request: quotationsActions.createRequest,
    selectMutation: (state: RootState) => state.quotations.create,
  });
}

export function useUpdateQuotation() {
  return useEpicMutation<
    { id: string; data: Partial<QuotationFormData> },
    Quotation
  >({
    request: quotationsActions.updateRequest,
    selectMutation: (state: RootState) => state.quotations.update,
  });
}

export function useSendQuotation() {
  return useEpicMutation<string, Quotation>({
    request: quotationsActions.sendRequest,
    selectMutation: (state: RootState) => state.quotations.send,
  });
}

export function useConvertQuotationToSalesOrder() {
  return useEpicMutation<string, SalesOrder>({
    request: quotationsActions.convertRequest,
    selectMutation: (state: RootState) => state.quotations.convert,
  });
}

export function useDeleteQuotation() {
  return useEpicMutation<string, string>({
    request: quotationsActions.deleteRequest,
    selectMutation: (state: RootState) => state.quotations.remove,
  });
}

export function useAddQuotationContact() {
  return useEpicMutation<
    { id: string; data: QuotationContactInput },
    Quotation
  >({
    request: quotationsActions.addContactRequest,
    selectMutation: (state: RootState) => state.quotations.addContact,
  });
}
