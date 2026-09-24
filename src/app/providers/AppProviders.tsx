import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { store } from "@/app/store";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";

export type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster
          theme="light"
          position="top-right"
          offset={{ top: 72, right: 20 }}
          mobileOffset={{ top: 16, right: 16, left: 16 }}
          gap={12}
          visibleToasts={4}
        />
      </BrowserRouter>
    </Provider>
  );
}
