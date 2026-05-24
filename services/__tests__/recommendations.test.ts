import {
  getRecommendedListings,
  trackInteraction,
} from "../recommendations";
import * as api from "@/services/api";
import { getStoredToken } from "../auth";

jest.mock("@/services/api", () => ({
  API_BASE_URL: "https://api.example.test",
  apiRequest: jest.fn(),
}));

jest.mock("../auth", () => ({
  getStoredToken: jest.fn(),
}));

describe("Recommendations Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not fetch recommendations when signed out", async () => {
    (getStoredToken as jest.Mock).mockResolvedValue(null);

    await expect(getRecommendedListings()).resolves.toEqual([]);

    expect(api.apiRequest).not.toHaveBeenCalled();
  });

  it("fetches personalized listings when signed in", async () => {
    (getStoredToken as jest.Mock).mockResolvedValue("token");
    (api.apiRequest as jest.Mock).mockResolvedValue([
      {
        id: "listing-1",
        sellerId: "seller-1",
        priceAmount: 10,
        priceCurrency: "SYP",
        stock: 1,
        condition: "New",
        createdAt: "2026-01-01T00:00:00Z",
        title: "Phone",
        description: "Nice",
        thumbnailUrl: "/uploads/phone.png",
        images: [],
        imageUrls: [],
      },
    ]);

    const result = await getRecommendedListings(8);

    expect(api.apiRequest).toHaveBeenCalledWith("/api/recommendations/listings?pageSize=8", {
      headers: { Authorization: "Bearer token" },
    });
    expect(result[0].thumbnailUrl).toBe("https://api.example.test/uploads/phone.png");
  });

  it("tracks top-level categories best-effort", async () => {
    (getStoredToken as jest.Mock).mockResolvedValue("token");
    (api.apiRequest as jest.Mock).mockResolvedValue(undefined);

    await trackInteraction("electronics/phones", "view");

    expect(api.apiRequest).toHaveBeenCalledWith("/api/recommendations/track", {
      method: "POST",
      headers: { Authorization: "Bearer token" },
      body: JSON.stringify({ category: "electronics", type: "view" }),
      maxRetries: 0,
    });
  });
});
