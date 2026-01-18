export type {
  ValidationContext,
  ValidationIssue,
  ValidationResult,
  Validator,
  TextValidator,
} from "./types";

import { type ValidationIssue, type ValidationResult } from "./types";

const sqlInjectionPattern =
  /(\b(select|insert|update|delete|drop|alter|create|truncate|exec|execute|union)\b|--|;|\/\*|\*\/|@@|char\(|nchar\(|varchar\(|nvarchar\(|xp_)/i;

const xssPattern =
  /(<\s*script|<\/\s*script|on\w+\s*=|javascript:|data:text\/html|<\s*iframe|<\s*img|<\s*svg|<\s*object|<\s*embed|<\s*link|<\s*meta)/i;

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, "");
};

export const validateSafeText = (value: string): ValidationResult => {
  const issues: ValidationIssue[] = [];

  if (sqlInjectionPattern.test(value)) {
    issues.push({ message: "Input contains disallowed SQL-like patterns." });
  }

  if (xssPattern.test(value)) {
    issues.push({ message: "Input contains disallowed HTML or script content." });
  }

  return { valid: issues.length === 0, issues };
};
