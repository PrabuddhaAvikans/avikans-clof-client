import { useEffect, useState } from "react";
import { FieldArray, useFormikContext } from "formik";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import {
  FormikCheckbox,
  FormikInput,
  FormikSelect,
} from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { CustomerFormValues } from "@/features/customers/schemas/customerSchema";
import {
  formatAddressLines,
  isAddressDraft,
  resolveActiveAddress,
} from "@/features/customers/utils/customerAddressUtils";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY } from "@/lib/countries";
import { cn } from "@/lib/utils";
import type { Address } from "@/types/common";

const EMPTY_ADDRESS: Address = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: DEFAULT_COUNTRY,
};

function AddressFormFields({ prefix }: { prefix: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormikInput
        name={`${prefix}.line1`}
        label="Street address"
        placeholder="Building no., street name"
        required
        className="sm:col-span-2"
      />
      <FormikInput
        name={`${prefix}.line2`}
        label="Apartment, suite, etc."
        placeholder="Optional"
        className="sm:col-span-2"
      />
      <FormikInput name={`${prefix}.city`} label="City" required />
      <FormikInput name={`${prefix}.state`} label="State / province" required />
      <FormikInput name={`${prefix}.postalCode`} label="Postal code" required />
      <FormikSelect
        name={`${prefix}.country`}
        label="Country"
        options={[...COUNTRY_OPTIONS]}
        required
      />
    </div>
  );
}

type AddressFormModalProps = {
  open: boolean;
  title: string;
  fieldPrefix: string;
  isNew: boolean;
  onClose: (discardDraft: boolean) => void;
};

function AddressFormModal({
  open,
  title,
  fieldPrefix,
  isNew,
  onClose,
}: AddressFormModalProps) {
  const { values } = useFormikContext<CustomerFormValues>();
  const index = Number(fieldPrefix.split(".").pop());
  const listKey = fieldPrefix.startsWith("billing") ? "billingAddresses" : "shippingAddresses";
  const address = (values[listKey] as Address[] | undefined)?.[index];

  const handleSave = () => {
    onClose(isNew && !address?.line1?.trim());
  };

  return (
    <Modal
      open={open}
      onClose={() => onClose(isNew)}
      title={title}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onClose(isNew)}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSave}>
            Save address
          </Button>
        </div>
      }
    >
      <AddressFormFields prefix={fieldPrefix} />
    </Modal>
  );
}

function AddressDisplayCard({
  address,
  isActive,
  canRemove,
  onSetActive,
  onEdit,
  onRemove,
}: {
  address: Address;
  isActive: boolean;
  canRemove: boolean;
  onSetActive: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { headline, lines } = formatAddressLines(address);

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        isActive
          ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
          : "border-border bg-card hover:border-muted-foreground/25",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground",
          )}
        >
          <MapPin className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{headline}</p>
            {isActive && (
              <StatusBadge variant="success" size="sm" dot>
                Active
              </StatusBadge>
            )}
          </div>
          {lines.map((line) => (
            <p key={line} className="text-sm text-muted-foreground">{line}</p>
          ))}
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Edit address"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
            aria-label="Remove address"
            disabled={!canRemove}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {!isActive && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 h-8 text-xs"
          onClick={onSetActive}
        >
          Set as active
        </Button>
      )}
    </div>
  );
}

type AddressColumnProps = {
  title: string;
  name: "billingAddresses" | "shippingAddresses";
  activeField: "activeBillingAddressIndex" | "activeShippingAddressIndex";
  addresses: Address[];
  activeIndex: number;
  addLabel: string;
  modalTitleNew: string;
  modalTitleEdit: string;
};

function AddressColumn({
  title,
  name,
  activeField,
  addresses,
  activeIndex,
  addLabel,
  modalTitleNew,
  modalTitleEdit,
}: AddressColumnProps) {
  const { setFieldValue } = useFormikContext<CustomerFormValues>();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const savedAddresses = addresses.filter((a) => !isAddressDraft(a));
  const modalOpen = editingIndex !== null;
  const isNew =
    editingIndex !== null && isAddressDraft(addresses[editingIndex]);

  return (
    <FieldArray name={name}>
      {({ push, remove }) => {
        const finishModal = (discardDraft: boolean) => {
          if (editingIndex === null) return;
          if (discardDraft && isAddressDraft(addresses[editingIndex])) {
            const active = activeIndex;
            const nextActive =
              active === editingIndex
                ? Math.max(0, editingIndex - 1)
                : active > editingIndex
                  ? active - 1
                  : active;
            remove(editingIndex);
            void setFieldValue(activeField, nextActive);
          }
          setEditingIndex(null);
        };

        return (
          <div className="space-y-3">
            {title ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {title}
              </p>
            ) : null}

            {savedAddresses.length === 0 && !modalOpen ? (
              <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                <MapPin className="mb-2 h-9 w-9 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No addresses yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add an address for invoices and documents
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => {
                    const nextIndex = addresses.length;
                    void push({ ...EMPTY_ADDRESS });
                    void setFieldValue(activeField, nextIndex);
                    setEditingIndex(nextIndex);
                  }}
                >
                  {addLabel}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((address, index) => {
                  if (isAddressDraft(address) && editingIndex !== index) return null;

                  return (
                    <AddressDisplayCard
                      key={index}
                      address={address}
                      isActive={activeIndex === index}
                      canRemove={savedAddresses.length > 1}
                      onSetActive={() => void setFieldValue(activeField, index)}
                      onEdit={() => setEditingIndex(index)}
                      onRemove={() => {
                        const active = activeIndex;
                        const nextActive =
                          active === index
                            ? Math.max(0, index - 1)
                            : active > index
                              ? active - 1
                              : active;
                        remove(index);
                        void setFieldValue(activeField, nextActive);
                      }}
                    />
                  );
                })}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-full text-sm text-muted-foreground"
                  leftIcon={<Plus className="h-4 w-4" />}
                  disabled={modalOpen}
                  onClick={() => {
                    const nextIndex = addresses.length;
                    void push({ ...EMPTY_ADDRESS });
                    void setFieldValue(activeField, nextIndex);
                    setEditingIndex(nextIndex);
                  }}
                >
                  {addLabel}
                </Button>
              </div>
            )}

            {modalOpen && editingIndex !== null && (
              <AddressFormModal
                open={modalOpen}
                title={isNew ? modalTitleNew : modalTitleEdit}
                fieldPrefix={`${name}.${editingIndex}`}
                isNew={isNew}
                onClose={finishModal}
              />
            )}
          </div>
        );
      }}
    </FieldArray>
  );
}

function MirroredAddressCard({ address }: { address: Address | undefined }) {
  const { headline, lines } = formatAddressLines(address);

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <MapPin className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Using billing address</p>
          <p className="mt-1 text-sm font-medium text-foreground">{headline}</p>
          {lines.map((line) => (
            <p key={line} className="text-sm text-muted-foreground">{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CustomerAddressManager() {
  const { values, setFieldValue } = useFormikContext<CustomerFormValues>();

  useEffect(() => {
    if (values.deliverySameAsBilling) return;
    if ((values.shippingAddresses?.length ?? 0) > 0) return;

    const billingActive = resolveActiveAddress(
      values.billingAddresses,
      values.activeBillingAddressIndex ?? 0,
    );
    if (!billingActive) return;

    void setFieldValue("shippingAddresses", [billingActive]);
    void setFieldValue("activeShippingAddressIndex", 0);
  }, [
    values.deliverySameAsBilling,
    values.shippingAddresses,
    values.billingAddresses,
    values.activeBillingAddressIndex,
    setFieldValue,
  ]);

  const billingActiveIndex = values.activeBillingAddressIndex ?? 0;
  const shippingActiveIndex = values.activeShippingAddressIndex ?? 0;
  const billingActive = resolveActiveAddress(values.billingAddresses, billingActiveIndex);

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Addresses</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Manage billing and delivery locations. One active address per type.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AddressColumn
          title="Billing"
          name="billingAddresses"
          activeField="activeBillingAddressIndex"
          addresses={values.billingAddresses}
          activeIndex={billingActiveIndex}
          addLabel="Add billing address"
          modalTitleNew="Add billing address"
          modalTitleEdit="Edit billing address"
        />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Delivery
            </p>
            <FormikCheckbox
              name="deliverySameAsBilling"
              label="Same as billing address"
            />
          </div>

          {values.deliverySameAsBilling ? (
            <MirroredAddressCard address={billingActive} />
          ) : (
            <AddressColumn
              title=""
              name="shippingAddresses"
              activeField="activeShippingAddressIndex"
              addresses={values.shippingAddresses ?? []}
              activeIndex={shippingActiveIndex}
              addLabel="Add delivery address"
              modalTitleNew="Add delivery address"
              modalTitleEdit="Edit delivery address"
            />
          )}
        </div>
      </div>
    </section>
  );
}
