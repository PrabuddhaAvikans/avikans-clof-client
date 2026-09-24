import type { ReactNode } from "react";
import { toast as sonnerToast } from "sonner";
import {
  AppToastCard,
  TOAST_DURATION_MS,
  type AppToastAction,
  type AppToastType,
} from "./AppToastCard";

type ToastOptions = {
  description?: ReactNode;
  duration?: number;
  id?: string | number;
  action?: AppToastAction;
};

function show(type: AppToastType, title: ReactNode, options?: ToastOptions) {
  const duration = options?.duration ?? (type === "loading" ? Number.POSITIVE_INFINITY : TOAST_DURATION_MS);

  return sonnerToast.custom(
    (id) => (
      <AppToastCard
        id={id}
        type={type}
        title={title}
        description={options?.description}
        action={options?.action}
      />
    ),
    {
      duration,
      ...(options?.id != null ? { id: options.id } : {}),
    },
  );
}

export const toast = {
  success: (title: ReactNode, options?: ToastOptions) => show("success", title, options),
  error: (title: ReactNode, options?: ToastOptions) => show("error", title, options),
  warning: (title: ReactNode, options?: ToastOptions) => show("warning", title, options),
  info: (title: ReactNode, options?: ToastOptions) => show("info", title, options),
  message: (title: ReactNode, options?: ToastOptions) => show("message", title, options),
  loading: (title: ReactNode, options?: ToastOptions) => show("loading", title, options),
  dismiss: sonnerToast.dismiss,
  promise: sonnerToast.promise,
};
