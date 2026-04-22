import { IAIGenerator } from '@/domain/services/IWorkflowEngine';

export interface GenerateContentRequest {
  type: 'content' | 'youtube_script' | 'seo_content';
  prompt: string;
  config?: Record<string, any>;
  keywords?: string[]; // For SEO content
}

export interface GenerateContentResponse {
  content: string;
  metadata?: Record<string, any>;
}

export class GenerateContent {
  constructor(private readonly aiGenerator: IAIGenerator) {}

  async execute(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    let content: string;

    switch (request.type) {
      case 'content':
        content = await this.aiGenerator.generateContent(request.prompt, request.config);
        break;
      
      case 'youtube_script':
        content = await this.aiGenerator.generateYouTubeScript(request.prompt, request.config);
        break;
      
      case 'seo_content':
        if (!request.keywords) {
          throw new Error('Keywords are required for SEO content generation');
        }
        content = await this.aiGenerator.generateSEOContent(
          request.prompt,
          request.keywords,
          request.config
        );
        break;
      
      default:
        throw new Error(`Unsupported content type: ${request.type}`);
    }

    return {
      content,
      metadata: {
        type: request.type,
        generatedAt: new Date().toISOString()
      }
    };
  }
}
