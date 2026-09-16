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
import deliveriesReducer from "@/features/delivery/store/deliveriesSlice";
import manufacturingReducer from "@/features/manufacturing/store/manufacturingSlice";
import productionTrackingReducer from "@/features/manufacturing/store/productionTrackingSlice";
import costingReducer from "@/features/costing/store/costingSlice";
import usersReducer from "@/features/admin/store/usersSlice";
import auditLogsReducer from "@/features/admin/store/auditLogsSlice";
import notificationsReducer from "@/features/admin/store/notificationsSlice";
import dashboardReducer from "@/features/dashboard/store/dashboardSlice";
import reprocessingReducer from "@/features/reprocessing/store/reprocessingSlice";

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
    deliveries: deliveriesReducer,
    manufacturing: manufacturingReducer,
    productionTracking: productionTrackingReducer,
    costing: costingReducer,
    users: usersReducer,
    auditLogs: auditLogsReducer,
    notifications: notificationsReducer,
    dashboard: dashboardReducer,
    reprocessing: reprocessingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(epicMiddleware as Middleware),
});

epicMiddleware.run(rootEpic);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
