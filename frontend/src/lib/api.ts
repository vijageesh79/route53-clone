import type { DNSRecord, HostedZone, PaginatedResponse, RecordType, User } from "./types";
import { toApiPathId } from "./paths";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: "Request failed" }));
    const detail = data.detail;
    const message = typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg : "Request failed";
    throw new ApiError(message || "Request failed", response.status);
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();

  return response.text() as unknown as T;
}

function zonePath(id: string) {
  return toApiPathId(id);
}

export const api = {
  login: (username: string, password: string) =>
    request<{ user: User; session_id: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request<{ message: string }>("/api/auth/logout", { method: "POST" }),

  me: () => request<User>("/api/auth/me"),

  listHostedZones: (params: { search?: string; type?: string; page?: number; page_size?: number }) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.type) query.set("type", params.type);
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    return request<PaginatedResponse<HostedZone>>(`/api/hosted-zones?${query}`);
  },

  getHostedZone: (id: string) => request<HostedZone>(`/api/hosted-zones/${zonePath(id)}`),

  createHostedZone: (data: {
    name: string;
    description?: string;
    comment?: string;
    type: "Public" | "Private";
    private_vpc?: string;
  }) =>
    request<HostedZone>("/api/hosted-zones", { method: "POST", body: JSON.stringify(data) }),

  updateHostedZone: (
    id: string,
    data: Partial<{ name: string; description: string; comment: string; type: "Public" | "Private"; private_vpc: string }>
  ) =>
    request<HostedZone>(`/api/hosted-zones/${zonePath(id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteHostedZone: (id: string) =>
    request<{ message: string }>(`/api/hosted-zones/${zonePath(id)}`, { method: "DELETE" }),

  bulkDeleteHostedZones: (ids: string[]) =>
    request<{ message: string; deleted_count: number }>("/api/hosted-zones/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  exportHostedZone: async (id: string, format: "json" | "bind") => {
    const response = await fetch(`${API_BASE}/api/hosted-zones/${zonePath(id)}/export?format=${format}`, {
      credentials: "include",
    });
    if (!response.ok) throw new ApiError("Export failed", response.status);
    return response.text();
  },

  listRecords: (zoneId: string, params: { search?: string; type?: string; page?: number; page_size?: number }) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.type) query.set("type", params.type);
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    return request<PaginatedResponse<DNSRecord>>(`/api/hosted-zones/${zonePath(zoneId)}/records?${query}`);
  },

  createRecord: (zoneId: string, data: { name: string; type: RecordType; ttl: number; value: string }) =>
    request<DNSRecord>(`/api/hosted-zones/${zonePath(zoneId)}/records`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateRecord: (
    zoneId: string,
    recordId: string,
    data: Partial<{ name: string; type: RecordType; ttl: number; value: string }>
  ) =>
    request<DNSRecord>(`/api/hosted-zones/${zonePath(zoneId)}/records/${zonePath(recordId)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteRecord: (zoneId: string, recordId: string) =>
    request<{ message: string }>(`/api/hosted-zones/${zonePath(zoneId)}/records/${zonePath(recordId)}`, {
      method: "DELETE",
    }),

  bulkDeleteRecords: (zoneId: string, ids: string[]) =>
    request<{ message: string; deleted_count: number }>(
      `/api/hosted-zones/${zonePath(zoneId)}/records/bulk-delete`,
      { method: "POST", body: JSON.stringify({ ids }) }
    ),

  importRecords: (zoneId: string, content: string) =>
    request<{ message: string; imported_count: number }>(
      `/api/hosted-zones/${zonePath(zoneId)}/records/import`,
      { method: "POST", body: JSON.stringify({ content, format: "bind" }) }
    ),
};

export { ApiError };
