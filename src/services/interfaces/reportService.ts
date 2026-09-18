import type { ReportDataset, ReportId } from "@/types/report";

export interface ReportService {
  getReport(reportId: ReportId): Promise<ReportDataset>;
}
