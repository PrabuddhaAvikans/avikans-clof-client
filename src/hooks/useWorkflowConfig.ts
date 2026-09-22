import { useCallback, useEffect, useState } from "react";
import {
  loadWorkflowCatalog,
  reloadWorkflowCatalog,
  saveWorkflowCatalog,
  WORKFLOW_CATALOG_UPDATED_EVENT,
} from "@/lib/workflow";
import type { WorkflowCatalog } from "@/types/workflow";

export function useWorkflowCatalog() {
  const [catalog, setCatalog] = useState(loadWorkflowCatalog);

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

  return { catalog, save, reload: () => setCatalog(reloadWorkflowCatalog()) };
}
