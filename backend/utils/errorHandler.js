export function formatError(error) {
  // Always ensure it's an Error instance
  const err = error instanceof Error ? error : new Error(String(error));
  
  let msg = err.message || "Unknown error";
  
  // Guard against single-character/corrupted messages like 't'
  if (typeof msg === 'string' && msg.trim().length <= 1) {
    msg = "An unexpected server error occurred.";
  }
  
  return err;
}

export const globalErrorHandler = (err, req, res, next) => {
  const formattedErr = formatError(err);
  
  console.error("❌ UNHANDLED GLOBAL ERROR:");
  console.error("   Message:", formattedErr.message);
  console.error("   Stack:", formattedErr.stack);
  
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  
  res.status(statusCode).json({
    success: false,
    message: formattedErr.message,
  });
};
