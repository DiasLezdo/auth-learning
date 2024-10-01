// middleware/rateLimitMiddleware.js
const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const Redis = require("redis");


// Initialize Redis client for distributed rate limiting
const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  // password: process.env.REDIS_PASSWORD || undefined, // Uncomment if using Redis authentication
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

// User-based rate limiter
const userRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.send_command(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each user to 100 requests per windowMs
  message: {
    status: 429,
    message:
      "Too many requests from this user, please try again after 15 minutes.",
  },
  keyGenerator: (req, res) => {
    return req.user ? req.user._id.toString() : req.ip;
  },
  skipFailedRequests: true, // Do not count failed requests (status >= 400)
  headers: true, // Send rate limit info in the `RateLimit-*` headers
});

module.exports = { userRateLimiter };
