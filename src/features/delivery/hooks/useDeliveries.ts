import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { deliveriesActions } from "@/features/delivery/store/deliveriesSlice";
import type { DeliveryFormData, DeliveryListFilters } from "@/services";
import type { Delivery, ProofOfDelivery } from "@/types/delivery";
import type { PaginatedResponse } from "@/types/common";
import type { DeliveryStatusValue } from "@/types/status";

export function useDeliveries(filters: DeliveryListFilters) {
  return useEpicQuery<DeliveryListFilters, PaginatedResponse<Delivery>>({
    arg: filters,
    request: deliveriesActions.fetchListRequest,
    selectEntry: (state, key) => state.deliveries.lists[key],
  });
}

export function useDelivery(id: string) {
  return useEpicQuery<string, Delivery>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: deliveriesActions.fetchDetailRequest,
    selectEntry: (state, key) => state.deliveries.details[key],
  });
}

export function useCreateDelivery() {
  return useEpicMutation<DeliveryFormData, Delivery>({
    request: deliveriesActions.createRequest,
    selectMutation: (state: RootState) => state.deliveries.create,
  });
}

export function useUpdateDelivery() {
  return useEpicMutation<
    { id: string; data: Partial<DeliveryFormData> },
    Delivery
  >({
    request: deliveriesActions.updateRequest,
    selectMutation: (state: RootState) => state.deliveries.update,
  });
}

export function useUpdateDeliveryStatus() {
  return useEpicMutation<
    { id: string; status: DeliveryStatusValue },
    Delivery
  >({
    request: deliveriesActions.updateStatusRequest,
    selectMutation: (state: RootState) => state.deliveries.updateStatus,
  });
}

export function useDispatchDelivery() {
  return useEpicMutation<string, Delivery>({
    request: deliveriesActions.dispatchRequest,
    selectMutation: (state: RootState) => state.deliveries.dispatch,
  });
}

export function useRecordProofOfDelivery() {
  return useEpicMutation<
    { id: string; proof: Omit<ProofOfDelivery, "id"> },
    Delivery
  >({
    request: deliveriesActions.recordProofRequest,
    selectMutation: (state: RootState) => state.deliveries.recordProof,
  });
}
