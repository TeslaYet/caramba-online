export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "BAD_REQUEST",
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error(error instanceof Error ? `${error.name}: ${error.message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]")}` : "Server error");
  return Response.json(
    { error: "Something went wrong. Please try again.", code: "SERVER_ERROR" },
    { status: 500 },
  );
}
