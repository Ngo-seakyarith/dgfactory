import { z } from "zod";

export const clientFormSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Client name is required."),
  email: z.string().trim().pipe(z.union([z.email("Enter a valid email address."), z.literal("")])),
  sector: z.string(),
  contactPerson: z.string(),
  contactPosition: z.string(),
  accountOwner: z.string(),
  clientType: z.string(),
  relationshipHistory: z.string(),
  nextAction: z.string(),
  phone: z.string(),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
