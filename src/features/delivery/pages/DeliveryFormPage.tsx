import { useEffect, useMemo } from "react";
import { useFormikContext } from "formik";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/components/feedback/toast";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { FormikForm, DynamicForm, FormikInput } from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { useCreateDelivery } from "@/features/delivery/hooks/useDeliveries";
import { createDeliveryFormSections } from "@/features/delivery/forms/deliveryFormFields";
import {
  deliveryFormSchema,
  type DeliveryFormValues,
} from "@/features/delivery/schemas/deliverySchema";
import { useSalesOrders } from "@/features/sales/hooks/useSalesOrders";
import { useUsers } from "@/features/admin/hooks/useUsers";
import { Priority, type PriorityValue } from "@/types/status";

const PRIORITY_OPTIONS = Object.keys(Priority).map((value) => ({
  value,
  label: Priority[value as PriorityValue].label,
}));

const defaultValues: DeliveryFormValues = {
  salesOrderId: "",
  scheduledDate: "",
  priority: "medium",
  carrier: "",
  driverId: "",
  vehicleNumber: "",
  notes: "",
  items: [],
};

function SalesOrderItemsSync() {
  const { values, setFieldValue } = useFormikContext<DeliveryFormValues>();
  const { data: salesOrders } = useSalesOrders({ page: 1, pageSize: 50 });

  const selectedOrder = salesOrders?.items.find((o) => o.id === values.salesOrderId);

  useEffect(() => {
    if (!selectedOrder) {
      void setFieldValue("items", []);
      return;
    }
    void setFieldValue("priority", selectedOrder.priority);
    void setFieldValue(
      "items",
      selectedOrder.lineItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        quantityOrdered: item.quantity,
        quantityDelivered: item.quantityDelivered,
        unit: "pcs",
        quantityToDeliver: item.quantity - item.quantityDelivered,
      })),
    );
  }, [selectedOrder, setFieldValue]);

  return null;
}

function DeliveryItemsTable() {
  const { values } = useFormikContext<DeliveryFormValues>();

  if (values.items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Select a sales order to load items.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 pr-4">Product</th>
            <th className="pb-2 pr-4 text-right">Ordered</th>
            <th className="pb-2 pr-4 text-right">Already Delivered</th>
            <th className="pb-2 pr-4 text-right">Deliver Qty</th>
            <th className="pb-2 text-right">Remaining</th>
          </tr>
        </thead>
        <tbody>
          {values.items.map((item, index) => {
            const remaining =
              item.quantityOrdered - item.quantityDelivered - item.quantityToDeliver;
            return (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="py-2.5 pr-4">
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">{item.productSku}</p>
                </td>
                <td className="py-2.5 pr-4 text-right">
                  {item.quantityOrdered} {item.unit}
                </td>
                <td className="py-2.5 pr-4 text-right">
                  {item.quantityDelivered} {item.unit}
                </td>
                <td className="py-2.5 pr-4 text-right">
                  <FormikInput
                    name={`items.${index}.quantityToDeliver`}
                    type="number"
                    min={0}
                    max={item.quantityOrdered}
                    className="ml-auto max-w-24"
                  />
                </td>
                <td className="py-2.5 text-right">
                  {Math.max(0, remaining)} {item.unit}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DeliveryFormPage() {
  const navigate = useNavigate();
  const createDelivery = useCreateDelivery();
  const { data: salesOrders } = useSalesOrders({ page: 1, pageSize: 50 });
  const { data: users } = useUsers({ page: 1, pageSize: 50 });

  const sections = useMemo(
    () =>
      createDeliveryFormSections({
        salesOrderOptions: (salesOrders?.items ?? []).map((o) => ({
          value: o.id,
          label: `${o.orderNumber} - ${o.customerName}`,
        })),
        driverOptions: (users?.items ?? []).map((u) => ({
          value: u.id,
          label: u.displayName,
        })),
        priorityOptions: PRIORITY_OPTIONS,
      }),
    [salesOrders?.items, users?.items],
  );

  const handleSubmit = async (values: DeliveryFormValues) => {
    try {
      const delivery = await createDelivery.mutateAsync({
        salesOrderId: values.salesOrderId,
        scheduledDate: new Date(values.scheduledDate).toISOString(),
        priority: values.priority,
        carrier: values.carrier || undefined,
        driverId: values.driverId || undefined,
        vehicleNumber: values.vehicleNumber || undefined,
        notes: values.notes || undefined,
        items: values.items.map(({ quantityToDeliver, ...item }) => ({
          ...item,
          quantityDelivered: quantityToDeliver,
        })),
      });
      toast.success(`Delivery ${delivery.deliveryNumber} created`);
      navigate(ROUTES.deliveries.detail(delivery.id));
    } catch {
      toast.error("Failed to create delivery");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Create Delivery"
        description="Schedule a new delivery with item quantities."
        breadcrumbs={[
          { label: "Delivery", href: ROUTES.deliveries.list },
          { label: "Create" },
        ]}
        actions={
          <Link to={ROUTES.deliveries.list}>
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
        }
      />

      <FormikForm<DeliveryFormValues>
        initialValues={defaultValues}
        validationSchema={deliveryFormSchema}
        onSubmit={handleSubmit}
      >
        {(formik) => (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4">
              <SalesOrderItemsSync />
              <DynamicForm sections={sections} columns={1} />
              <FormikInput name="scheduledDate" label="Scheduled Date" type="datetime-local" required />
            </div>

            <div className="rounded-lg border border-border bg-card p-6 lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold">Delivery Items</h2>
              <DeliveryItemsTable />
              <Button
                type="submit"
                variant="primary"
                className="mt-6"
                loading={formik.isSubmitting || createDelivery.isPending}
              >
                Create Delivery
              </Button>
            </div>
          </div>
        )}
      </FormikForm>
    </PageContainer>
  );
}
