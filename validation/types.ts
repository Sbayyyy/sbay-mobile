export type ValidationIssue = {
  message: string;
  code?: string;
  path?: string;
  meta?: Record<string, unknown>;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export type ValidationContext = {
  field?: string;
  label?: string;
  locale?: string;
  values?: Record<string, unknown>;
};

export interface Validator<T> {
  validate(value: T, context?: ValidationContext): ValidationResult | Promise<ValidationResult>;
}

export interface TextValidator extends Validator<string> {
  normalize?(value: string): string;
}
