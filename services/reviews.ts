import { apiRequest } from "@/services/api";

export type ReviewStats = {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<string, number>;
};

export type Review = {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string | null;
  listingId?: string | null;
  sellerId: string;
  orderId?: string | null;
  rating: number;
  comment: string;
  helpfulCount: number;
  isHelpful: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getSellerReviews(
  sellerId: string,
  page = 1,
  limit = 10,
): Promise<{ reviews: Review[]; stats: ReviewStats; total: number }> {
  return apiRequest<{ reviews: Review[]; stats: ReviewStats; total: number }>(
    `/api/reviews/seller/${sellerId}?page=${page}&limit=${limit}`,
  );
}
