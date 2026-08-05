export type EntityStatus = "active" | "inactive";

export type SortDirection = "asc" | "desc";

export interface PaginatedRequest {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  traceId?: string;
}

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface ActivityLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  performedBy: string;
  performedByName: string;
  performedAt: string;
  metadata?: Record<string, unknown>;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Note {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}
