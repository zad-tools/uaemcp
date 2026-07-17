/** Typed errors so tools fail loudly with context instead of returning fake data. */

export class UaemcpError extends Error {
  code = "error";
}
export class SourceNotFound extends UaemcpError {
  code = "source_not_found";
}
export class SourceUnavailable extends UaemcpError {
  code = "source_unavailable";
}
export class BlockedRequest extends UaemcpError {
  code = "blocked_request";
}
export class Unauthorized extends UaemcpError {
  code = "unauthorized";
}
export class ValidationError extends UaemcpError {
  code = "validation_error";
}
