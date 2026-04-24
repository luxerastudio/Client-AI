# AI SaaS Backend - Production-Grade Core System

A production-grade AI SaaS backend system built with clean architecture principles, TypeScript, and Fastify. This system provides AI workflow automation capabilities including content generation, YouTube script creation, SEO writing, and automation pipelines.

## Architecture Overview

This system follows **Clean Architecture** principles with clear separation of concerns:

```
src/
  domain/           # Business logic and entities
    entities/       # Core domain entities
    repositories/   # Repository interfaces
    services/       # Domain service interfaces
  
  application/      # Use cases and application logic
    usecases/       # Business use cases
  
  infrastructure/   # External concerns
    ai/            # AI service implementations
    database/      # Database repositories and schema
    workflow/      # Workflow engine and processors
    config/        # Configuration management
    logging/       # Logging infrastructure
    di/            # Dependency injection container
  
  presentation/     # API layer
    controllers/   # Request handlers
    routes/        # Route definitions
```

## Features

- **Clean Architecture**: Modular, testable, and maintainable codebase
- **Type-Safe**: Full TypeScript implementation with Zod validation
- **AI Workflows**: Configurable workflow engine for AI automation
- **Multiple AI Services**: Content generation, YouTube scripts, SEO writing
- **Database Layer**: Prisma ORM with PostgreSQL
- **API Documentation**: Auto-generated Swagger/OpenAPI docs
- **Error Handling**: Comprehensive error handling and logging
- **Rate Limiting**: Built-in rate limiting and security
- **Dependency Injection**: IoC container for easy testing

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis (optional, for caching)
- OpenAI API key

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd backend
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up the database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the development server:**
   ```bash
   pnpm run dev
   ```

The server will start on `http://localhost:3001`

### API Documentation

Visit `http://localhost:3001/docs` for interactive API documentation.

## API Endpoints

### Workflows

- `POST /api/v1/workflows` - Create a new workflow
- `POST /api/v1/workflows/:workflowId/execute` - Execute a workflow
- `GET /api/v1/workflows/executions/:executionId/status` - Get execution status

### Content Generation

- `POST /api/v1/content/generate` - Generate AI content

### Health Check

- `GET /health` - System health check

## Usage Examples

### Create a Content Generation Workflow

```bash
curl -X POST http://localhost:3001/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Blog Post Generator",
    "type": "content_generation",
    "userId": "user123",
    "steps": [
      {
        "id": "step1",
        "name": "Generate Content",
        "type": "ai_generation",
        "config": {
          "generationType": "content",
          "prompt": "Write a blog post about AI automation",
          "maxTokens": 1000
        },
        "order": 0
      }
    ]
  }'
```

### Generate Content Directly

```bash
curl -X POST http://localhost:3001/api/v1/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "content",
    "prompt": "Write a professional email about project updates",
    "config": {
      "maxTokens": 500,
      "temperature": 0.7
    }
  }'
```

### Generate YouTube Script

```bash
curl -X POST http://localhost:3001/api/v1/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "youtube_script",
    "prompt": "Machine Learning for Beginners",
    "config": {
      "duration": "10 minutes",
      "style": "educational"
    }
  }'
```

### Generate SEO Content

```bash
curl -X POST http://localhost:3001/api/v1/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "seo_content",
    "prompt": "AI is revolutionizing content creation...",
    "keywords": ["AI", "content creation", "automation", "machine learning"],
    "config": {
      "maxTokens": 1500
    }
  }'
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | JWT signing secret | - |
| `RATE_LIMIT_MAX` | Rate limit requests | `100` |
| `RATE_LIMIT_WINDOW` | Rate limit window | `15m` |
| `LOG_LEVEL` | Logging level | `info` |

## Development

### Scripts

- `pnpm run dev` - Start development server with hot reload
- `pnpm run build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests
- `pnpm run lint` - Run ESLint
- `pnpm run lint:fix` - Fix ESLint issues

### Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# View database
npx prisma studio
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch
```

## Architecture Details

### Domain Layer

Contains core business logic and entities:
- `Workflow` - Represents automation workflows
- `WorkflowExecution` - Tracks workflow execution
- `User` - User management entity

### Application Layer

Implements business use cases:
- `CreateWorkflow` - Create new workflows
- `ExecuteWorkflow` - Execute workflows
- `GenerateContent` - Generate AI content

### Infrastructure Layer

Handles external concerns:
- `OpenAIGenerator` - OpenAI integration
- `WorkflowEngine` - Workflow execution engine
- `PrismaWorkflowRepository` - Database operations
- `Container` - Dependency injection

### Presentation Layer

API layer with controllers and routes:
- `WorkflowController` - Handles workflow requests
- Swagger documentation
- Request validation and error handling

## Security Features

- Rate limiting
- CORS protection
- Helmet security headers
- Input validation with Zod schemas
- Error sanitization

## Monitoring & Logging

- Winston logger with structured logging
- Request/response logging
- Error tracking
- Health check endpoint

## Production Deployment

1. Build the application:
   ```bash
   pnpm run build
   ```

2. Set production environment variables

3. Start the server:
   ```bash
   pnpm start
   ```

4. Use a process manager like PM2 for production:
   ```bash
   pm2 start dist/index.js --name ai-saas-backend
   ```

## Contributing

1. Follow the existing code structure and patterns
2. Add tests for new features
3. Update documentation
4. Use TypeScript strict mode
5. Follow clean architecture principles

## License

MIT License - see LICENSE file for details.
