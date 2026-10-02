import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { creditNotesActions } from "@/features/finance/store/creditNotesSlice";
import type { ApplyCreditNoteInput, CreditNoteListFilters } from "@/services";
import type { CreditNote } from "@/types/credit-note";
import type { PaginatedResponse } from "@/types/common";

export function useCreditNotes(filters: CreditNoteListFilters) {
  return useEpicQuery<CreditNoteListFilters, PaginatedResponse<CreditNote>>({
    arg: filters,
    request: creditNotesActions.fetchListRequest,
    selectEntry: (state, key) => state.creditNotes.lists[key],
  });
}

export function useCreditNote(id: string) {
  return useEpicQuery<string, CreditNote>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: creditNotesActions.fetchDetailRequest,
    selectEntry: (state, key) => state.creditNotes.details[key],
  });
}

export function useApplyCreditNote() {
  return useEpicMutation<
    { id: string; data: ApplyCreditNoteInput },
    CreditNote
  >({
    request: creditNotesActions.applyRequest,
    selectMutation: (state: RootState) => state.creditNotes.apply,
  });
}
