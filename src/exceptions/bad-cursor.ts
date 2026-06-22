import { AppError } from "@/exceptions/app-error";

export class BadCursorError extends AppError {
  readonly statusCode = 400;

  constructor(message = "Invalid pagination cursor") {
    super(message);
  }
}
