export type StorageErrorCode =
  | 'open_failed'
  | 'migration_failed'
  | 'unsupported_version'
  | 'query_failed'
  | 'invalid_input'
  | 'not_found';

/** A storage failure with a code for logic and a plain-language message safe to show users. */
export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StorageError';
    this.code = code;
  }
}

export function toStorageError(code: StorageErrorCode, message: string, cause: unknown) {
  return cause instanceof StorageError ? cause : new StorageError(code, message, { cause });
}

export type ValidationIssue = { field: string; message: string };

/** Rejected input. `issues` has a plain-language message per field so forms can show it inline. */
export class ValidationError extends StorageError {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super('invalid_input', issues.map((i) => i.message).join(' '));
    this.name = 'ValidationError';
    this.issues = issues;
  }
}
