import { combineEpics } from "redux-observable";
import type { AppEpic } from "@/app/store/async/createAsyncEpic";
import { authEpic } from "@/features/auth/store/authEpics";
import { salesOrdersEpic } from "@/features/sales/store/salesOrdersEpics";
import { quotationsEpic } from "@/features/sales/store/quotationsEpics";
import { customersEpic } from "@/features/customers/store/customersEpics";
import { productsEpic } from "@/features/products/store/productsEpics";
import { categoriesEpic } from "@/features/products/store/categoriesEpics";
import { brandsEpic } from "@/features/products/store/brandsEpics";
import { inventoryEpic } from "@/features/inventory/store/inventoryEpics";
import { warehousesEpic } from "@/features/inventory/store/warehousesEpics";
import { unitsOfMeasureEpic } from "@/features/inventory/store/unitsOfMeasureEpics";
import { deliveriesEpic } from "@/features/delivery/store/deliveriesEpics";
import { manufacturingEpic } from "@/features/manufacturing/store/manufacturingEpics";
import { productionTrackingEpic } from "@/features/manufacturing/store/productionTrackingEpics";
import { costingEpic } from "@/features/costing/store/costingEpics";
import { usersEpic } from "@/features/admin/store/usersEpics";
import { auditLogsEpic } from "@/features/admin/store/auditLogsEpics";
import { notificationsEpic } from "@/features/admin/store/notificationsEpics";
import { systemSettingsEpic } from "@/features/admin/store/systemSettingsEpics";
import { permissionsEpic } from "@/features/admin/store/permissionsEpics";
import { workflowEpic } from "@/features/admin/store/workflowEpics";
import { dashboardEpic } from "@/features/dashboard/store/dashboardEpics";
import { reportsEpic } from "@/features/reports/store/reportsEpics";
import { reprocessingEpic } from "@/features/reprocessing/store/reprocessingEpics";
import { endOfDayManagementEpic } from "@/features/end-of-day-management/store/endOfDayManagementEpics";
import { invoicesEpic } from "@/features/finance/store/invoicesEpics";
import { creditNotesEpic } from "@/features/finance/store/creditNotesEpics";

export const rootEpic: AppEpic = combineEpics(
  authEpic,
  salesOrdersEpic,
  quotationsEpic,
  customersEpic,
  productsEpic,
  categoriesEpic,
  brandsEpic,
  inventoryEpic,
  warehousesEpic,
  unitsOfMeasureEpic,
  deliveriesEpic,
  manufacturingEpic,
  productionTrackingEpic,
  costingEpic,
  usersEpic,
  auditLogsEpic,
  notificationsEpic,
  systemSettingsEpic,
  permissionsEpic,
  workflowEpic,
  dashboardEpic,
  reportsEpic,
  reprocessingEpic,
  endOfDayManagementEpic,
  invoicesEpic,
  creditNotesEpic,
);
