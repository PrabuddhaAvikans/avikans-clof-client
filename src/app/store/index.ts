import {
  configureStore,
  type Middleware,
  type UnknownAction,
} from "@reduxjs/toolkit";
import { createEpicMiddleware } from "redux-observable";
import authReducer from "@/app/store/authSlice";
import uiReducer from "@/app/store/uiSlice";
import { rootEpic } from "@/app/store/rootEpic";
import salesOrdersReducer from "@/features/sales/store/salesOrdersSlice";
import quotationsReducer from "@/features/sales/store/quotationsSlice";
import customersReducer from "@/features/customers/store/customersSlice";
import productsReducer from "@/features/products/store/productsSlice";
import categoriesReducer from "@/features/products/store/categoriesSlice";
import brandsReducer from "@/features/products/store/brandsSlice";
import inventoryReducer from "@/features/inventory/store/inventorySlice";
import warehousesReducer from "@/features/inventory/store/warehousesSlice";
import unitsOfMeasureReducer from "@/features/inventory/store/unitsOfMeasureSlice";
import deliveriesReducer from "@/features/delivery/store/deliveriesSlice";
import manufacturingReducer from "@/features/manufacturing/store/manufacturingSlice";
import productionTrackingReducer from "@/features/manufacturing/store/productionTrackingSlice";
import costingReducer from "@/features/costing/store/costingSlice";
import usersReducer from "@/features/admin/store/usersSlice";
import auditLogsReducer from "@/features/admin/store/auditLogsSlice";
import notificationsReducer from "@/features/admin/store/notificationsSlice";
import systemSettingsReducer from "@/features/admin/store/systemSettingsSlice";
import permissionsReducer from "@/features/admin/store/permissionsSlice";
import workflowReducer from "@/features/admin/store/workflowSlice";
import dashboardReducer from "@/features/dashboard/store/dashboardSlice";
import reportsReducer from "@/features/reports/store/reportsSlice";
import reprocessingReducer from "@/features/reprocessing/store/reprocessingSlice";
import endOfDayManagementReducer from "@/features/end-of-day-management/store/endOfDayManagementSlice";
import invoicesReducer from "@/features/finance/store/invoicesSlice";
import creditNotesReducer from "@/features/finance/store/creditNotesSlice";

const epicMiddleware = createEpicMiddleware<
  UnknownAction
>();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    salesOrders: salesOrdersReducer,
    quotations: quotationsReducer,
    customers: customersReducer,
    products: productsReducer,
    categories: categoriesReducer,
    brands: brandsReducer,
    inventory: inventoryReducer,
    warehouses: warehousesReducer,
    unitsOfMeasure: unitsOfMeasureReducer,
    deliveries: deliveriesReducer,
    manufacturing: manufacturingReducer,
    productionTracking: productionTrackingReducer,
    costing: costingReducer,
    users: usersReducer,
    auditLogs: auditLogsReducer,
    notifications: notificationsReducer,
    systemSettings: systemSettingsReducer,
    permissions: permissionsReducer,
    workflow: workflowReducer,
    dashboard: dashboardReducer,
    reports: reportsReducer,
    reprocessing: reprocessingReducer,
    endOfDayManagement: endOfDayManagementReducer,
    invoices: invoicesReducer,
    creditNotes: creditNotesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(epicMiddleware as Middleware),
});

epicMiddleware.run(rootEpic);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
