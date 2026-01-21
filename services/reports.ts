import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";

export type ReportTargetType = "UserProfile" | "Listing" | "Message";
export type ReportReason = "Spam" | "Harassment" | "Scam" | "Inappropriate" | "Other";

export type CreateReportPayload = {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string | null;
  evidenceUrls?: string[];
  blockUser?: boolean;
};

export async function createReport(payload: CreateReportPayload): Promise<void> {
  const token = await getStoredToken();
  if (!token) {
    throw new Error("Missing auth token (Authorization header not set).");
  }

  await apiRequest<void>("/api/reports", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      targetType: payload.targetType,
      targetId: payload.targetId,
      reason: payload.reason,
      description: payload.description ?? null,
      evidenceUrls: payload.evidenceUrls ?? [],
      blockUser: payload.blockUser ?? false,
    }),
  });
}
