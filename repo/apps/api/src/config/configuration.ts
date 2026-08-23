export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    name: process.env.DB_NAME ?? 'kag_mall',
    ssl: process.env.DB_SSL === 'true',
    // Connects as the `app_superadmin` BYPASSRLS role (see docs/schema.sql) so
    // the superadmin panel can see across all tenants. Falls back to the main
    // app credentials for local dev, where that role typically doesn't exist yet.
    // `||` (not `??`) so an empty string in .env also falls back, not just unset.
    superadminUsername: process.env.SUPERADMIN_DB_USERNAME || process.env.DB_USERNAME || 'postgres',
    superadminPassword: process.env.SUPERADMIN_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  },
  otp: {
    ttlMinutes: parseInt(process.env.OTP_TTL_MINUTES ?? '5', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10),
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM ?? 'no-reply@agrokhata.app',
      fromName: process.env.EMAIL_FROM_NAME ?? 'AgroKhata',
    },
    // Brevo transactional email REST API - used instead of SMTP when set.
    brevo: {
      apiKey: process.env.BREVO_API_KEY,
      from: process.env.SMTP_FROM ?? 'no-reply@agrokhata.app',
      fromName: process.env.EMAIL_FROM_NAME ?? 'AgroKhata',
    },
  },
  superadmin: {
    jwtSecret: process.env.SUPERADMIN_JWT_SECRET ?? process.env.JWT_SECRET ?? 'dev-secret-change-me',
    expiresIn: process.env.SUPERADMIN_JWT_EXPIRES_IN ?? '8h',
    // Bootstraps the first platform admin account on startup if none exists yet.
    bootstrapEmail: process.env.SUPERADMIN_BOOTSTRAP_EMAIL,
    bootstrapPassword: process.env.SUPERADMIN_BOOTSTRAP_PASSWORD,
    bootstrapName: process.env.SUPERADMIN_BOOTSTRAP_NAME ?? 'Platform Admin',
  },
});
