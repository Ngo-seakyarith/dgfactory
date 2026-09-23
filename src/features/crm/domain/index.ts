export type Client = {
  id: string;
  name: string;
  sector: string;
  contactPerson: string;
  contactPosition: string;
  accountOwner: string;
  clientType: string;
  relationshipHistory: string;
  nextAction: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientProfileInput = {
  id?: string;
  name: string;
  sector?: string;
  contactPerson?: string;
  contactPosition?: string;
  email?: string;
  phone?: string;
};

export function clientNameKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeNumber(value: unknown, defaultValue = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export function createEmptyClient(): Client {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "",
    sector: "",
    contactPerson: "",
    contactPosition: "",
    accountOwner: "",
    clientType: "",
    relationshipHistory: "",
    nextAction: "",
    email: "",
    phone: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeClient(value: Partial<Client>): Client {
  const now = new Date().toISOString();
  return {
    id: value.id || crypto.randomUUID(),
    name: String(value.name ?? "").trim(),
    sector: String(value.sector ?? "").trim(),
    contactPerson: String(value.contactPerson ?? "").trim(),
    contactPosition: String(value.contactPosition ?? "").trim(),
    accountOwner: String(value.accountOwner ?? "").trim(),
    clientType: String(value.clientType ?? "").trim(),
    relationshipHistory: String(value.relationshipHistory ?? "").trim(),
    nextAction: String(value.nextAction ?? "").trim(),
    email: String(value.email ?? "").trim(),
    phone: String(value.phone ?? "").trim(),
    notes: String(value.notes ?? "").trim(),
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}
