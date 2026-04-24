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
  ai: {
    model: string;
    maxTokens: number;
    temperature: number;
  };
  scoring: {
    algorithm: string;
    weights: Record<string, number>;
  };
  versioning: {
    enabled: boolean;
    maxVersions: number;
  };
  security: {
    enabled: boolean;
    cors: {
      origin: string[];
    };
    helmet: boolean;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3002'),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '' // Empty string means no database configured
  },
  redis: {
    url: process.env.REDIS_URL || '' // Empty string means no redis configured
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
  },
  ai: {
    model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000'),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7')
  },
  scoring: {
    algorithm: process.env.SCORING_ALGORITHM || 'weighted',
    weights: {
      relevance: parseFloat(process.env.SCORING_WEIGHT_RELEVANCE || '0.4'),
      quality: parseFloat(process.env.SCORING_WEIGHT_QUALITY || '0.3'),
      engagement: parseFloat(process.env.SCORING_WEIGHT_ENGAGEMENT || '0.3')
    }
  },
  versioning: {
    enabled: process.env.VERSIONING_ENABLED === 'true',
    maxVersions: parseInt(process.env.VERSIONING_MAX_VERSIONS || '10')
  },
  security: {
    enabled: process.env.SECURITY_ENABLED !== 'false',
    cors: {
      origin: (process.env.CORS_ORIGIN || '*').split(',').map(origin => origin.trim())
    },
    helmet: process.env.HELMET_ENABLED !== 'false'
  }
};
