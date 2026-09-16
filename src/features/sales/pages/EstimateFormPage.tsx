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
import type { Quotation } from "@/types/quotation";
import { loadSystemSettings, quotationValidUntilDate } from "@/lib/systemSettings";
import { toast } from "sonner";

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
  const [pendingAction, setPendingAction] = useState<"draft" | "save" | "preview" | "send">("draft");
  const pendingActionRef = useRef(pendingAction);
  const setAction = (action: typeof pendingAction) => {
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
          customization: item.customization,
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
  const showSaveDraft = !isEdit || quotation?.status === "draft";

  const handleSubmit = async (values: QuotationFormValues) => {
    const action = pendingActionRef.current;
    const saveMode = action === "save" || action === "send" ? "save" : "draft";
    const payload = buildQuotationFormPayload(values, {
      saveMode,
      existingAttachments: quotation?.attachments,
    });

    const saved =
      isEdit && id
        ? await updateQuotation.mutateAsync({ id, data: payload })
        : await createQuotation.mutateAsync(payload);

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
        revision ? `Draft saved as ${revision.label}` : "Draft saved",
      );
      if (!isEdit) navigate(ROUTES.quotations.edit(saved.id));
      return;
    }

    toast.success(revision ? `Saved ${revision.label}` : "Quotation saved");
    navigate(ROUTES.quotations.detail(saved.id));
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
          <>
            <PageHeader
              title={isEdit ? "Edit Quotation" : "Add / Configure Quotation"}
              description={
                isEdit
                  ? "Save records a new version in Revision History. Save Draft updates the current draft only."
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
                      type="submit"
                      variant="outline"
                      size="sm"
                      leftIcon={<Save className="h-3.5 w-3.5" />}
                      loading={busy && pendingAction === "draft"}
                      onClick={() => setAction("draft")}
                    >
                      Save Draft
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    leftIcon={<Save className="h-3.5 w-3.5" />}
                    loading={busy && pendingAction === "save"}
                    onClick={() => setAction("save")}
                  >
                    Save
                  </Button>
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    leftIcon={<Eye className="h-3.5 w-3.5" />}
                    loading={busy && pendingAction === "preview"}
                    onClick={() => setAction("preview")}
                  >
                    Preview
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    leftIcon={<Send className="h-3.5 w-3.5" />}
                    onClick={() => setAction("send")}
                  >
                    Send Quotation
                  </Button>
                </div>
              }
            />

            <QuotationFormEditor variant="page" />
          </>
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
