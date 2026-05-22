import jwt from "jsonwebtoken";

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authorization token is required",
    });
  }

  const secret = process.env.JWT_SECRET || process.env.JWT_KEY;

  if (!secret) {
    return res.status(500).json({
      success: false,
      message: "JWT secret is not configured",
    });
  }

  try {
    req.user = jwt.verify(token, secret);
    // Defense-in-depth: reject tokens explicitly marked unverified. Tokens
    // signed before this claim was introduced won't have it — treat missing
    // as "trust the issuer", since every issue path already gated on
    // isVerified at sign time.
    if (req.user && req.user.verified === false) {
      return res.status(403).json({
        success: false,
        message: "Email not verified. Please verify your account to continue.",
      });
    }
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export { authenticateToken };