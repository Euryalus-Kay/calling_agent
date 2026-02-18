import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '8080', 10),
  WS_DOMAIN: process.env.WS_DOMAIN || 'localhost:8080',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID!,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN!,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER!,
  // Comma-separated list of Twilio numbers for scaling (e.g., "+1XXX,+1YYY,+1ZZZ")
  TWILIO_PHONE_NUMBERS: process.env.TWILIO_PHONE_NUMBERS?.split(',').map(n => n.trim()).filter(Boolean) || [],
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  REDIS_URL: process.env.REDIS_URL!,
};
