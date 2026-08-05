import { delay } from "@/services/http";
import type { DashboardService } from "@/services/interfaces/dashboardService";
import { initialDashboardSummary } from "@/services/mock/data/dashboard";

export const mockDashboardService: DashboardService = {
  async getSummary() {
    await delay();
    return structuredClone(initialDashboardSummary);
  },
};
