import { AppError } from "@/exceptions/app-error";

export class NotFoundError extends AppError {
  readonly statusCode = 404;

  constructor(message = "Resource not found") {
    super(message);
  }
}
