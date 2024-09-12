const errorHandler = (err, req, res, next) => {
  // Set status code (default 500 if none exists)
  const statusCode = res.statusCode || 500;

  // Log the error
  console.error("Error:", err);

  // Send JSON response with error message and optional stack trace
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined, // Hides stack in production
  });
};

module.exports = errorHandler;