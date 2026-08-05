import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { store } from "@/app/store";

export type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Provider store={store}>
      <BrowserRouter>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </BrowserRouter>
    </Provider>
  );
}
