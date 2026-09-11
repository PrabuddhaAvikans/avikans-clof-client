import { combineEpics } from "redux-observable";
import type { AppEpic } from "@/app/store/async/createAsyncEpic";
import { salesOrdersEpic } from "@/features/sales/store/salesOrdersEpics";
import { quotationsEpic } from "@/features/sales/store/quotationsEpics";
import { customersEpic } from "@/features/customers/store/customersEpics";
import { productsEpic } from "@/features/products/store/productsEpics";
import { categoriesEpic } from "@/features/products/store/categoriesEpics";
import { brandsEpic } from "@/features/products/store/brandsEpics";
import { inventoryEpic } from "@/features/inventory/store/inventoryEpics";
import { deliveriesEpic } from "@/features/delivery/store/deliveriesEpics";
import { manufacturingEpic } from "@/features/manufacturing/store/manufacturingEpics";
import { productionTrackingEpic } from "@/features/manufacturing/store/productionTrackingEpics";
import { costingEpic } from "@/features/costing/store/costingEpics";
import { usersEpic } from "@/features/admin/store/usersEpics";
import { notificationsEpic } from "@/features/admin/store/notificationsEpics";
import { dashboardEpic } from "@/features/dashboard/store/dashboardEpics";
import { reprocessingEpic } from "@/features/reprocessing/store/reprocessingEpics";

export const rootEpic: AppEpic = combineEpics(
  salesOrdersEpic,
  quotationsEpic,
  customersEpic,
  productsEpic,
  categoriesEpic,
  brandsEpic,
  inventoryEpic,
  deliveriesEpic,
  manufacturingEpic,
  productionTrackingEpic,
  costingEpic,
  usersEpic,
  notificationsEpic,
  dashboardEpic,
  reprocessingEpic,
);
