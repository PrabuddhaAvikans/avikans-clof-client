import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { EntityStatus } from "@/types/common";
import type { Customer, CustomerTypeValue } from "@/types/customer";

export interface CustomerListFilters extends PaginatedRequest {
  type?: CustomerTypeValue;
  status?: EntityStatus;
}

export interface CustomerFormData {
  code: string;
  name: string;
  type: CustomerTypeValue;
  email: string;
  phone: string;
  billingAddresses: Customer["billingAddresses"];
  activeBillingAddressIndex: Customer["activeBillingAddressIndex"];
  deliverySameAsBilling: Customer["deliverySameAsBilling"];
  shippingAddresses?: Customer["shippingAddresses"];
  activeShippingAddressIndex?: Customer["activeShippingAddressIndex"];
  contactPersons: Omit<Customer["contactPersons"][number], "id">[];
  taxId?: string;
  creditLimit?: number;
  paymentTermsDays: number;
  notes?: string;
  status: EntityStatus;
}

export interface CustomerService {
  list(filters: CustomerListFilters): Promise<PaginatedResponse<Customer>>;
  getById(id: string): Promise<Customer>;
  create(data: CustomerFormData): Promise<Customer>;
  update(id: string, data: Partial<CustomerFormData>): Promise<Customer>;
  delete(id: string): Promise<void>;
}
