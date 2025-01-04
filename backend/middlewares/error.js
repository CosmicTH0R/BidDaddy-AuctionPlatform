class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorMiddleware = (error, req, res, next) => {
  error.message = error.message || "Internal server error.";
  error.statusCode = error.statusCode || 500;

  // Specific error handling
  if (error.name === "JsonWebTokenError") {
    error = new ErrorHandler("Json web token is invalid, Try again.", 400);
  }

  if (error.name === "TokenExpiredError") {
    error = new ErrorHandler("Json web token is expired, Try again.", 400);
  }

  if (error.name === "CastError") {
    error = new ErrorHandler(`Invalid ${error.path}`, 400);
  }

  // Extract and format error messages if present
  const errorMessage = error.errors
    ? Object.values(error.errors)
        .map((err) => err.message)
        .join(" ")
    : error.message;

  // Send response
  return res.status(error.statusCode).json({
    success: false,
    message: errorMessage,
  });
};

export default ErrorHandler;
