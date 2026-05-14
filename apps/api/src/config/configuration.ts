export const configuration = () => ({
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  port: parseInt(process.env["API_PORT"] ?? "3000", 10),
  apiUrl: process.env["API_URL"] ?? "http://localhost:3000",

  database: {
    url: process.env["DATABASE_URL"] ?? "",
    directUrl: process.env["DIRECT_URL"] ?? "",
  },

  jwt: {
    accessSecret: process.env["JWT_ACCESS_SECRET"] ?? "change-me",
    refreshSecret: process.env["JWT_REFRESH_SECRET"] ?? "change-me-refresh",
    platformSecret: process.env["JWT_PLATFORM_SECRET"] ?? "change-me-platform",
    accessExpiresIn: process.env["JWT_ACCESS_EXPIRES_IN"] ?? "15m",
    refreshExpiresIn: process.env["JWT_REFRESH_EXPIRES_IN"] ?? "30d",
  },

  redis: {
    url: process.env["REDIS_URL"] ?? "redis://localhost:6379",
  },

  supabase: {
    url: process.env["SUPABASE_URL"] ?? "",
    anonKey: process.env["SUPABASE_ANON_KEY"] ?? "",
    serviceRoleKey: process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "",
    jwtSecret: process.env["SUPABASE_JWT_SECRET"] ?? "",
  },

  whatsapp: {
    bsp: process.env["WHATSAPP_BSP"] ?? "gupshup",
    gupshupApiKey: process.env["GUPSHUP_API_KEY"] ?? "",
    gupshupAppName: process.env["GUPSHUP_APP_NAME"] ?? "grwfit",
    gupshupSrcPhone: process.env["GUPSHUP_SRC_PHONE"] ?? "",
    watiEndpoint: process.env["WATI_API_ENDPOINT"] ?? "",
    watiToken: process.env["WATI_ACCESS_TOKEN"] ?? "",
    webhookSecret: process.env["WHATSAPP_WEBHOOK_SECRET"] ?? "",
  },

  razorpay: {
    keyId: process.env["RAZORPAY_KEY_ID"] ?? "",
    keySecret: process.env["RAZORPAY_KEY_SECRET"] ?? "",
    webhookSecret: process.env["RAZORPAY_WEBHOOK_SECRET"] ?? "",
  },

  storage: {
    bucket: process.env["STORAGE_BUCKET"] ?? "grwfit-dev",
    awsRegion: process.env["AWS_REGION"] ?? "ap-south-1",
    awsAccessKeyId: process.env["AWS_ACCESS_KEY_ID"] ?? "",
    awsSecretAccessKey: process.env["AWS_SECRET_ACCESS_KEY"] ?? "",
    awsS3Bucket: process.env["AWS_S3_BUCKET"] ?? "",
  },

  throttle: {
    ttl: 60000,
    limit: 60,
  },
});

export type AppConfig = ReturnType<typeof configuration>;
