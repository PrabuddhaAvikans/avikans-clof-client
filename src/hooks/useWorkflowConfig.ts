import { useCallback, useEffect, useState } from "react";
import {
  loadWorkflowCatalog,
  reloadWorkflowCatalog,
  saveWorkflowCatalog,
  WORKFLOW_CATALOG_UPDATED_EVENT,
} from "@/lib/workflow";
import type { WorkflowCatalog } from "@/types/workflow";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import {
  WORKFLOW_CATALOG_KEY,
  workflowActions,
} from "@/features/admin/store/workflowSlice";

export function useWorkflowCatalog() {
  const query = useEpicQuery<void, WorkflowCatalog>({
    arg: undefined,
    getKey: () => WORKFLOW_CATALOG_KEY,
    request: workflowActions.fetchCatalogRequest,
    selectEntry: (state, key) => state.workflow.catalog[key],
  });
  const remote = query.data;

  const [catalog, setCatalog] = useState(loadWorkflowCatalog);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!remote) return;
    if (remote.definitions.length > 0 || remote.versions.length > 0) {
      setCatalog(saveWorkflowCatalog(remote));
    }
    setSynced(true);
  }, [remote]);

  useEffect(() => {
    const onUpdated = () => setCatalog(loadWorkflowCatalog());
    const onStorage = () => setCatalog(reloadWorkflowCatalog());
    window.addEventListener(WORKFLOW_CATALOG_UPDATED_EVENT, onUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(WORKFLOW_CATALOG_UPDATED_EVENT, onUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const save = useCallback((next: WorkflowCatalog) => {
    setCatalog(saveWorkflowCatalog(next));
  }, []);

  return {
    catalog,
    save,
    reload: query.refetch,
    refetch: query.refetch,
    synced,
    isLoading: !synced && !query.isError,
    isError: query.isError && !synced,
    error: query.error,
  };
}
