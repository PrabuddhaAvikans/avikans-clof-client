import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Factory,
  Lightbulb,
  Lock,
  Mail,
  Package,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { BrandLogo } from "@/components/layout/BrandLogo";
import {
  FormikCheckbox,
  FormikForm,
  FormikInput,
} from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import {
  loginFormSchema,
  loginInitialValues,
  type LoginFormValues,
} from "@/features/auth/schemas/loginSchema";
import { authService } from "@/services";
import {
  DEMO_LOGIN_EMAIL,
  DEMO_LOGIN_PASSWORD,
} from "@/services/mock/mockAuthService";

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: string }).message);
  }
  return "Unable to sign in. Please try again.";
}

const HIGHLIGHTS = [
  {
    icon: Package,
    title: "Product catalog",
    description: "Manage lighting SKUs, versions, and price lists.",
  },
  {
    icon: Factory,
    title: "Manufacturing",
    description: "Track jobs, materials, and quality from one board.",
  },
  {
    icon: Truck,
    title: "Delivery",
    description: "Schedule dispatch and capture proof of delivery.",
  },
] as const;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInUser } = useAuthSession();
  const [showPassword, setShowPassword] = useState(false);

  const fromPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const redirectTo =
    fromPath && fromPath !== ROUTES.login ? fromPath : ROUTES.dashboard;

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] bg-[size:22px_22px] opacity-70"
      />

      <main className="relative flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid w-full max-w-[960px] overflow-hidden rounded-lg border border-border bg-card shadow-md lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden flex-col justify-between border-r border-border bg-muted/40 p-10 lg:flex">
            <div>
              <BrandLogo className="h-9 max-w-[176px]" />
              <div className="mt-3 h-0.5 w-12 rounded-full bg-warning" />
              <p className="mt-6 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                Custom Lighting Product Management
              </p>
            </div>

            <div className="mt-10 space-y-6">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5 text-warning" aria-hidden />
                  Workspace
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  Sign in to Avikans Solution
                </h1>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Quotations, manufacturing, inventory, and delivery in one
                  enterprise workspace.
                </p>
              </div>

              <ul className="space-y-3">
                {HIGHLIGHTS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.title}
                      className="flex gap-3 rounded-md border border-border bg-card p-3 shadow-xs"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-foreground">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <p className="mt-10 text-[11px] text-muted-foreground">
              Avikans Solution · Lighting operations
            </p>
          </section>

          <section className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12">
            <div className="mb-8 lg:hidden">
              <BrandLogo className="h-8 max-w-[160px]" />
              <div className="mt-3 h-0.5 w-10 rounded-full bg-warning" />
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Welcome back
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter your credentials to continue.
              </p>
            </div>

            <FormikForm<LoginFormValues>
              initialValues={loginInitialValues}
              validationSchema={loginFormSchema}
              className="space-y-5"
              onSubmit={async (values, helpers) => {
                try {
                  const user = await authService.login({
                    email: values.email,
                    password: values.password,
                  });
                  signInUser(user, values.rememberMe);
                  toast.success(`Welcome back, ${user.firstName}.`);
                  navigate(redirectTo, { replace: true });
                } catch (error) {
                  toast.error(getErrorMessage(error));
                  helpers.setSubmitting(false);
                }
              }}
            >
              {(formik) => (
                <>
                  <FormikInput
                    name="email"
                    type="email"
                    label="Email"
                    placeholder="name@avikans.com"
                    autoComplete="username"
                    required
                    leftAddon={<Mail className="h-4 w-4" />}
                  />

                  <FormikInput
                    name="password"
                    type={showPassword ? "text" : "password"}
                    label="Password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    leftAddon={<Lock className="h-4 w-4" />}
                    rightAddon={
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((open) => !open)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    }
                  />

                  <div className="flex items-center justify-between gap-3">
                    <FormikCheckbox name="rememberMe" label="Remember me" />
                    <button
                      type="button"
                      className="text-xs font-medium text-info hover:underline"
                      onClick={() =>
                        toast.message("Password reset", {
                          description:
                            "Contact your administrator to reset your password.",
                        })
                      }
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    loading={formik.isSubmitting}
                  >
                    Sign in
                  </Button>

                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
                    <p className="text-[11px] font-medium text-foreground">
                      Demo access
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {DEMO_LOGIN_EMAIL}
                      <span className="mx-1.5 text-border">·</span>
                      {DEMO_LOGIN_PASSWORD}
                    </p>
                    <button
                      type="button"
                      className="mt-1.5 text-[11px] font-medium text-info hover:underline"
                      onClick={() => {
                        void formik.setValues({
                          email: DEMO_LOGIN_EMAIL,
                          password: DEMO_LOGIN_PASSWORD,
                          rememberMe: formik.values.rememberMe,
                        });
                      }}
                    >
                      Fill demo credentials
                    </button>
                  </div>
                </>
              )}
            </FormikForm>
          </section>
        </div>
      </main>

      <footer className="relative shrink-0 border-t border-border bg-card px-4 py-2.5 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} Avikans Solution. All rights reserved.
      </footer>
    </div>
  );
}
