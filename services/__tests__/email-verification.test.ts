import { isEmailVerified, isUnverifiedEmailError } from "../email-verification";

jest.mock("../auth", () => ({ requestEmailVerification: jest.fn() }));

describe("isEmailVerified", () => {
  it("returns false when value is null or undefined", () => {
    expect(isEmailVerified(null)).toBe(false);
    expect(isEmailVerified(undefined)).toBe(false);
  });

  it("returns false as the final fallback for an unknown shape", () => {
    expect(isEmailVerified({})).toBe(false);
  });

  it("respects the `verified` boolean field", () => {
    expect(isEmailVerified({ verified: true })).toBe(true);
    expect(isEmailVerified({ verified: false })).toBe(false);
  });

  it("respects the `emailVerified` field", () => {
    expect(isEmailVerified({ emailVerified: true })).toBe(true);
    expect(isEmailVerified({ emailVerified: false })).toBe(false);
  });

  it("respects the `isEmailVerified` field", () => {
    expect(isEmailVerified({ isEmailVerified: true })).toBe(true);
    expect(isEmailVerified({ isEmailVerified: false })).toBe(false);
  });

  it("respects the `emailConfirmed` field", () => {
    expect(isEmailVerified({ emailConfirmed: true })).toBe(true);
    expect(isEmailVerified({ emailConfirmed: false })).toBe(false);
  });

  it("respects the `isVerified` field", () => {
    expect(isEmailVerified({ isVerified: true })).toBe(true);
    expect(isEmailVerified({ isVerified: false })).toBe(false);
  });

  it("returns true when `emailVerifiedAt` is set", () => {
    expect(isEmailVerified({ emailVerifiedAt: "2024-01-01T00:00:00Z" })).toBe(true);
  });

  it("returns true when `emailConfirmedAt` is set", () => {
    expect(isEmailVerified({ emailConfirmedAt: "2024-01-01T00:00:00Z" })).toBe(true);
  });

  it("returns false when timestamp fields are null", () => {
    expect(isEmailVerified({ emailVerifiedAt: null, emailConfirmedAt: null })).toBe(false);
  });

  it("prioritises boolean fields over timestamps", () => {
    expect(isEmailVerified({ verified: false, emailVerifiedAt: "2024-01-01T00:00:00Z" })).toBe(false);
  });
});

describe("isUnverifiedEmailError", () => {
  it("detects a 403 with a known unverified message", () => {
    const error = Object.assign(new Error("email is not verified"), { status: 403 });
    expect(isUnverifiedEmailError(error)).toBe(true);
  });

  it("returns false for a non-403 status", () => {
    const error = Object.assign(new Error("email is not verified"), { status: 401 });
    expect(isUnverifiedEmailError(error)).toBe(false);
  });

  it("treats a generic 403 forbidden as a verified-only failure", () => {
    const error = Object.assign(new Error("forbidden"), { status: 403 });
    expect(isUnverifiedEmailError(error)).toBe(true);
  });
});
