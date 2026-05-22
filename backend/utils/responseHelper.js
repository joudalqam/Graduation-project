export function sendResponse(res, success, message, data = undefined, statusCode = null) {
  // Coerce message to a string, safely extracting from Error objects if accidentally passed
  let finalMessage = "Unknown error";
  
  if (typeof message === 'string') {
    finalMessage = message;
  } else if (message instanceof Error) {
    finalMessage = message.message;
  } else if (message && typeof message.message === 'string') {
    finalMessage = message.message;
  } else if (message !== undefined && message !== null) {
    finalMessage = String(message);
  }

  // Prevent single-character or blank fallback errors
  if (finalMessage.trim().length <= 1) {
    finalMessage = "An unexpected server error occurred.";
  }

  const responseBody = {
    success: Boolean(success),
    message: finalMessage,
  };

  if (data !== undefined) {
    responseBody.data = data;
  }

  const status = statusCode !== null ? statusCode : (success ? 200 : 500);

  // Log FINAL RESPONSE
  console.log(`[API RESPONSE] [${status}]`, JSON.stringify(responseBody));

  return res.status(status).json(responseBody);
}
