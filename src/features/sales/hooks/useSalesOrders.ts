import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { salesOrdersActions } from "@/features/sales/store/salesOrdersSlice";
import type {
  SalesOrderFormData,
  SalesOrderListFilters,
} from "@/services";
import type { SalesOrder } from "@/types/sales-order";
import type { PaginatedResponse } from "@/types/common";

export function useSalesOrders(filters: SalesOrderListFilters) {
  return useEpicQuery<SalesOrderListFilters, PaginatedResponse<SalesOrder>>({
    arg: filters,
    request: salesOrdersActions.fetchListRequest,
    selectEntry: (state, key) => state.salesOrders.lists[key],
  });
}

export function useSalesOrder(id: string) {
  return useEpicQuery<string, SalesOrder>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: salesOrdersActions.fetchDetailRequest,
    selectEntry: (state, key) => state.salesOrders.details[key],
  });
}

export function useCreateSalesOrder() {
  return useEpicMutation<SalesOrderFormData, SalesOrder>({
    request: salesOrdersActions.createRequest,
    selectMutation: (state: RootState) => state.salesOrders.create,
  });
}

export function useUpdateSalesOrder() {
  return useEpicMutation<
    { id: string; data: Partial<SalesOrderFormData> },
    SalesOrder
  >({
    request: salesOrdersActions.updateRequest,
    selectMutation: (state: RootState) => state.salesOrders.update,
  });
}

export function useConfirmSalesOrder() {
  return useEpicMutation<string, SalesOrder>({
    request: salesOrdersActions.confirmRequest,
    selectMutation: (state: RootState) => state.salesOrders.confirm,
  });
}

export function useCancelSalesOrder() {
  return useEpicMutation<{ id: string; reason?: string }, SalesOrder>({
    request: salesOrdersActions.cancelRequest,
    selectMutation: (state: RootState) => state.salesOrders.cancel,
  });
}

export function useDeleteSalesOrder() {
  return useEpicMutation<string, string>({
    request: salesOrdersActions.deleteRequest,
    selectMutation: (state: RootState) => state.salesOrders.remove,
  });
}

export function useAssignSalesOrder() {
  return useEpicMutation<{ id: string; userId: string }, SalesOrder>({
    request: salesOrdersActions.assignRequest,
    selectMutation: (state: RootState) => state.salesOrders.assign,
  });
}
