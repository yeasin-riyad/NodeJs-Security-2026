import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js";
import helmet from "helmet";

dotenv.config();

const app = express();

app.disable("x-powered-by");

//apiLimiter → general API protection
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests, please try again later",
  },
});


// authLimiter → specific protection for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many auth attempts, please try again later",
  },
});

app.use(helmet());  //👉 helmet automatically তোমার app-এ অনেকগুলো security headers add করে
                    //👉 এটা XSS, clickjacking, MIME sniffing, HSTS, etc. থেকে protection দেয়
                    //👉 এটা attack surface কমায় এবং security improve করে
                    //👉 helmet-এ অনেকগুলো middleware আছে, যেমন: contentSecurityPolicy, xPoweredBy, frameguard, etc.
                    //👉 তুমি helmet-কে customize করতে পারো, যেমন: app.use(helmet({ contentSecurityPolicy: false })) যদি তুমি contentSecurityPolicy disable করতে চাও
                    //⚠️ Important: Helmet সব security solve করে না, এটা শুধু headers level protection দেয়, তোমাকে এখনও লাগবে CSRF protection, validation, rate limiting, etc. তোমার app-এ security ensure করার জন্য।
                   //🧠 সহজভাবে analogy 
                        // 👉 Helmet =
                        // motorcycle helmet 🪖
                        // 👉 accident পুরো stop করে না
                        // 👉 কিন্তু damage অনেক কমায় ✔️

//allowlist
// *
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(",") || [];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/refresh", authLimiter);


app.get("/", (_req, res) => {
  res.json({
    message: "Hello From Server!",
  });
});
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    message: "Server is running",
  });
});

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "";

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server start failed", error);
    process.exit(1);
  }
}

startServer();
