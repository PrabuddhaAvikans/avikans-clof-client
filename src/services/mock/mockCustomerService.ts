import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type { CustomerService } from "@/services/interfaces/customerService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialCustomers } from "@/services/mock/data/customers";
import type { Customer } from "@/types/customer";

let customers = cloneData(initialCustomers);

export const mockCustomerService: CustomerService = {
  async list(filters) {
    await delay();
    return applyListQuery(
      customers,
      filters,
      ["name", "code", "email", "phone"],
      (item) => {
        if (filters.type && item.type !== filters.type) return false;
        if (filters.status && item.status !== filters.status) return false;
        return true;
      },
    );
  },

  async getById(id) {
    await delay();
    const customer = customers.find((c) => c.id === id);
    if (!customer) notFoundError("Customer", id);
    return customer;
  },

  async create(data) {
    await delay();
    const timestamp = nowIso();
    const customer: Customer = {
      id: generateId("cus"),
      ...data,
      contactPersons: data.contactPersons.map((cp) => ({
        ...cp,
        id: generateId("cp"),
      })),
      totalOrders: 0,
      totalRevenue: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    customers.push(customer);
    return customer;
  },

  async update(id, data) {
    await delay();
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) notFoundError("Customer", id);

    const existing = customers[index];
    customers[index] = {
      ...existing,
      ...data,
      contactPersons: data.contactPersons
        ? data.contactPersons.map((cp) => ({
            ...cp,
            id: generateId("cp"),
          }))
        : existing.contactPersons,
      updatedAt: nowIso(),
    };
    return customers[index];
  },

  async delete(id) {
    await delay();
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) notFoundError("Customer", id);
    customers[index] = {
      ...customers[index],
      status: "inactive",
      updatedAt: nowIso(),
    };
  },
};
