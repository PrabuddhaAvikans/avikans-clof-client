import type { DashboardSummary } from "@/types/dashboard";

export interface DashboardService {
  getSummary(): Promise<DashboardSummary>;
}
