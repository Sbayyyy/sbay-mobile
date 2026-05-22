import {
  getSponsoredAds,
  trackSponsoredAdClick,
  trackSponsoredAdImpression,
} from "../ads";
import * as api from "@/services/api";

jest.mock("@/services/api", () => ({
  API_BASE_URL: "https://api.example.test",
  apiRequest: jest.fn(),
}));

describe("Ads Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads sponsored ads and resolves relative image URLs", async () => {
    (api.apiRequest as jest.Mock).mockResolvedValue([
      {
        id: "ad-1",
        type: "ad",
        title: "Sponsored",
        description: "Placement",
        imageUrl: "/uploads/ad.png",
        ctaText: "Learn more",
        targetUrl: "/listing/listing-1",
        priority: 10,
        impressions: 2,
        clicks: 1,
      },
    ]);

    const result = await getSponsoredAds();

    expect(api.apiRequest).toHaveBeenCalledWith("/api/ads");
    expect(result[0].imageUrl).toBe("https://api.example.test/uploads/ad.png");
  });

  it("tracks ad impressions", async () => {
    (api.apiRequest as jest.Mock).mockResolvedValue(undefined);

    await trackSponsoredAdImpression("ad-1");

    expect(api.apiRequest).toHaveBeenCalledWith("/api/ads/ad-1/impression", {
      method: "POST",
    });
  });

  it("tracks ad clicks", async () => {
    (api.apiRequest as jest.Mock).mockResolvedValue(undefined);

    await trackSponsoredAdClick("ad-1");

    expect(api.apiRequest).toHaveBeenCalledWith("/api/ads/ad-1/click", {
      method: "POST",
    });
  });
});
