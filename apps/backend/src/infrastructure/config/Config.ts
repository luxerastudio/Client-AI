import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  openai: {
    apiKey: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  rateLimit: {
    max: number;
    window: string;
  };
  logging: {
    level: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3002'),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_saas'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || ''
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    window: process.env.RATE_LIMIT_WINDOW || '15m'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
