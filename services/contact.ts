import { apiRequest } from "@/services/api";

export type ContactPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
  pageUrl?: string;
  userAgent?: string;
};

export type ContactResponse = {
  id: string;
  createdAt: string;
};

export async function sendContactMessage(
  payload: ContactPayload,
): Promise<ContactResponse> {
  return apiRequest<ContactResponse>("/api/contact", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
