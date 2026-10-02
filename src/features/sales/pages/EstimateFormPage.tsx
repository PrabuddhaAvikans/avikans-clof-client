import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, Save, Send } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { FormikForm } from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { QuotationFormEditor } from "@/features/sales/components/QuotationFormEditor";
import { SendQuotationModal } from "@/features/sales/components/SendQuotationModal";
import {
  quotationFormSchema,
  type QuotationFormValues,
} from "@/features/sales/schemas/quotationSchema";
import {
  useCreateQuotation,
  useQuotation,
  useUpdateQuotation,
} from "@/features/sales/hooks/useQuotations";
import { currentQuotationRevision } from "@/lib/quotationRevisions";
import { buildQuotationFormPayload } from "@/features/sales/lib/duplicateQuotation";
import { quotationAttachmentsToForm } from "@/features/sales/lib/quotationAttachments";
import { isIssuedQuotation } from "@/features/sales/lib/quotationLifecycle";
import type { Quotation } from "@/types/quotation";
import { loadSystemSettings, quotationValidUntilDate } from "@/lib/systemSettings";
import { toast } from "@/components/feedback/toast";
import type { FormikProps } from "formik";

type QuotationAction = "draft" | "save" | "preview" | "send";

function firstFormError(errors: unknown): string | null {
  if (!errors) return null;
  if (typeof errors === "string") return errors;
  if (Array.isArray(errors)) {
    for (const item of errors) {
      const found = firstFormError(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof errors === "object") {
    for (const value of Object.values(errors as Record<string, unknown>)) {
      const found = firstFormError(value);
      if (found) return found;
    }
  }
  return null;
}

function createDefaultValues(): QuotationFormValues {
  const settings = loadSystemSettings();
  return {
    customerId: "",
    customerName: "",
    quoteDate: new Date().toISOString().slice(0, 10),
    validUntil: quotationValidUntilDate(),
    priority: "medium",
    lineItems: [],
    discountAmount: 0,
    notes: "",
    termsAndConditions:
      settings.paymentTerms || "Payment due within 30 days. Prices valid until the date specified.",
    attachments: [],
  };
}

export function EstimateFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId");

  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [pendingSendQuotation, setPendingSendQuotation] = useState<Quotation | null>(null);
  const [pendingAction, setPendingAction] = useState<QuotationAction>("draft");
  const pendingActionRef = useRef<QuotationAction>(pendingAction);
  const setAction = (action: QuotationAction) => {
    pendingActionRef.current = action;
    setPendingAction(action);
  };

  const { data: quotation, isLoading, error } = useQuotation(id ?? "");
  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation();

  const initialValues = useMemo<QuotationFormValues>(() => {
    if (quotation) {
      return {
        customerId: quotation.customerId,
        customerName: quotation.customerName,
        quoteDate: quotation.createdAt.slice(0, 10),
        validUntil: quotation.validUntil.slice(0, 10),
        priority: quotation.priority,
        lineItems: quotation.lineItems.map((item) => ({
          productId: item.productId,
          productSku: item.productSku,
          productName: item.productName,
          description: item.description,
          productVersionId: item.productVersionId,
          productVersionLabel: item.productVersionLabel,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          taxPercent: item.taxPercent,
          isCustomized: item.isCustomized,
          ...(item.customization != null ? { customization: item.customization } : {}),
        })),
        discountAmount: quotation.discountAmount,
        notes: quotation.notes ?? "",
        termsAndConditions: quotation.termsAndConditions ?? "",
        attachments: quotationAttachmentsToForm(quotation.attachments),
      };
    }
    return {
      ...createDefaultValues(),
      customerId: preselectedCustomerId ?? "",
    };
  }, [quotation, preselectedCustomerId]);

  const busy = createQuotation.isPending || updateQuotation.isPending;
  const showSaveDraft = !isEdit || quotation?.status === "draft" || isIssuedQuotation(quotation?.status ?? "draft");
  const isPostSendEdit = Boolean(quotation && isIssuedQuotation(quotation.status));

  const persistQuotation = async (values: QuotationFormValues) => {
    const action = pendingActionRef.current;
    const saveMode = action === "save" || action === "send" ? "save" : "draft";
    const payload = buildQuotationFormPayload(values, {
      saveMode,
      existingAttachments: quotation?.attachments,
    });

    return isEdit && id
      ? updateQuotation.mutateAsync({ id, data: payload })
      : createQuotation.mutateAsync(payload);
  };

  const handleSubmit = async (values: QuotationFormValues) => {
    const action = pendingActionRef.current;

    try {
      const saved = await persistQuotation(values);
      const revision = currentQuotationRevision(saved.revisions);

      if (action === "send") {
        setPendingSendQuotation(saved);
        setSendModalOpen(true);
        return;
      }

      if (action === "preview") {
        navigate(ROUTES.quotations.preview(saved.id));
        return;
      }

      if (action === "draft") {
        toast.success(
          revision
            ? isPostSendEdit
              ? `Draft revision saved as ${revision.label}`
              : `Draft saved as ${revision.label}`
            : "Draft saved",
        );
        if (!isEdit) navigate(ROUTES.quotations.edit(saved.id));
        return;
      }

      toast.success(
        revision
          ? isPostSendEdit
            ? `Revision ${revision.label} saved. Previous issued versions remain in history.`
            : `Saved ${revision.label}`
          : "Quotation saved",
      );
      navigate(ROUTES.quotations.detail(saved.id));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : "Failed to save quotation";
      toast.error(message);
    }
  };

  const runAction = async (
    formik: FormikProps<QuotationFormValues>,
    action: QuotationAction,
  ) => {
    setAction(action);
    const errors = await formik.validateForm();
    const message = firstFormError(errors);
    if (message) {
      await formik.setTouched(
        {
          customerId: true,
          customerName: true,
          quoteDate: true,
          validUntil: true,
          priority: true,
          lineItems: true,
          discountAmount: true,
          notes: true,
          termsAndConditions: true,
          attachments: true,
        },
        true,
      );
      toast.error(message);
      return;
    }
    await formik.submitForm();
  };

  return (
    <PageContainer maxWidth="full" className="!px-2 !py-2 sm:!px-3 lg:!px-4">
      <PageContent isLoading={isEdit && isLoading} error={error ? "Quotation not found." : null}>
        <FormikForm<QuotationFormValues>
          initialValues={initialValues}
          validationSchema={quotationFormSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {(formik) => (
            <>
              <PageHeader
                title={isEdit ? "Edit Quotation" : "Add / Configure Quotation"}
                description={
                  isEdit
                    ? isPostSendEdit
                      ? "Saving creates a new revision. Previously issued versions stay in Revision History."
                      : "Save records a new version in Revision History. Save Draft updates the current draft only."
                    : "Create a quotation with products, pricing, and commercial terms."
                }
                className="mb-2"
                breadcrumbs={[
                  { label: "Sales", href: ROUTES.quotations.list },
                  { label: "Quotations", href: ROUTES.quotations.list },
                  { label: isEdit ? "Edit Quotation" : "Add / Configure Quotation" },
                ]}
                actions={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link to={ROUTES.quotations.list}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                      >
                        Back to Quotations
                      </Button>
                    </Link>
                    {showSaveDraft && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<Save className="h-3.5 w-3.5" />}
                        loading={busy && pendingAction === "draft"}
                        disabled={busy}
                        onClick={() => void runAction(formik, "draft")}
                      >
                        Save Draft
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Save className="h-3.5 w-3.5" />}
                      loading={busy && pendingAction === "save"}
                      disabled={busy}
                      onClick={() => void runAction(formik, "save")}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      loading={busy && pendingAction === "preview"}
                      disabled={busy}
                      onClick={() => void runAction(formik, "preview")}
                    >
                      Preview
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      leftIcon={<Send className="h-3.5 w-3.5" />}
                      loading={busy && pendingAction === "send"}
                      disabled={busy}
                      onClick={() => void runAction(formik, "send")}
                    >
                      Send Quotation
                    </Button>
                  </div>
                }
              />

              <QuotationFormEditor
                variant="page"
                onPreview={() => void runAction(formik, "preview")}
                onSend={() => void runAction(formik, "send")}
              />
            </>
          )}
        </FormikForm>
      </PageContent>

      {pendingSendQuotation && (
        <SendQuotationModal
          open={sendModalOpen}
          onClose={() => {
            setSendModalOpen(false);
            setPendingSendQuotation(null);
          }}
          quotation={pendingSendQuotation}
          onSent={() => navigate(ROUTES.quotations.detail(pendingSendQuotation.id))}
        />
      )}
    </PageContainer>
  );
}
