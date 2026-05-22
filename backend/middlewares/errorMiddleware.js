import { sendResponse } from '../utils/responseHelper.js';

const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode =
    res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  console.error("Server error:", err.message);
  
  sendResponse(res, false, err.message || "Internal server error", undefined, statusCode);
};

export { notFound, errorHandler };
