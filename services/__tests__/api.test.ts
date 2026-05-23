import { apiRequest, ApiError } from "../api";

jest.mock("expo-constants", () => ({
  default: { expoConfig: null, easConfig: null },
}));

jest.mock("../auth-session", () => ({
  notifyUnauthorized: jest.fn(),
  refreshAuthToken: jest.fn().mockResolvedValue(null),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("apiRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns parsed JSON on a successful response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 1 }),
    });

    const result = await apiRequest<{ id: number }>("/test");
    expect(result).toEqual({ id: 1 });
  });

  it("returns undefined for a 204 No Content response", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    const result = await apiRequest("/no-content");
    expect(result).toBeUndefined();
  });

  it("throws ApiError with the server message on failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => JSON.stringify({ message: "Validation failed" }),
    });

    await expect(apiRequest("/fail")).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "Validation failed",
    });
  });

  it("throws ApiError with status 408 on request timeout", async () => {
    mockFetch.mockImplementation((_url: string, opts: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener("abort", () => {
          const err = new Error("AbortError");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    // maxRetries: 0 isolates the timeout behaviour without triggering retry delays
    const requestPromise = apiRequest("/slow", { timeoutMs: 100, maxRetries: 0 });
    jest.advanceTimersByTime(200);
    await expect(requestPromise).rejects.toMatchObject({ status: 408 });
  });

  it("passes the Content-Type header by default", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: async () => "" });
    await apiRequest("/headers");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });
});
