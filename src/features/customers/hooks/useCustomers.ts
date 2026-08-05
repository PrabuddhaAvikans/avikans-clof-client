import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { customersActions } from "@/features/customers/store/customersSlice";
import type { CustomerFormData, CustomerListFilters } from "@/services";
import type { Customer } from "@/types/customer";
import type { PaginatedResponse } from "@/types/common";

export function useCustomers(filters: CustomerListFilters) {
  return useEpicQuery<CustomerListFilters, PaginatedResponse<Customer>>({
    arg: filters,
    request: customersActions.fetchListRequest,
    selectEntry: (state, key) => state.customers.lists[key],
  });
}

export function useCustomer(id: string) {
  return useEpicQuery<string, Customer>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: customersActions.fetchDetailRequest,
    selectEntry: (state, key) => state.customers.details[key],
  });
}

export function useCreateCustomer() {
  return useEpicMutation<CustomerFormData, Customer>({
    request: customersActions.createRequest,
    selectMutation: (state: RootState) => state.customers.create,
  });
}

export function useUpdateCustomer() {
  return useEpicMutation<
    { id: string; data: Partial<CustomerFormData> },
    Customer
  >({
    request: customersActions.updateRequest,
    selectMutation: (state: RootState) => state.customers.update,
  });
}

export function useDeleteCustomer() {
  return useEpicMutation<string, string>({
    request: customersActions.deleteRequest,
    selectMutation: (state: RootState) => state.customers.remove,
  });
}
