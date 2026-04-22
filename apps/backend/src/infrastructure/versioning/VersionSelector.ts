import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { 
  IVersionSelector,
  IVersionComparator
} from '@/domain/versioning/services/IVersioningService';
import { 
  ContentVersion, 
  VersionComparison,
  VersionStatus
} from '@/domain/versioning/entities/Version';

export class VersionSelector implements IVersionSelector {
  private openai: OpenAI;
  private comparator: IVersionComparator;

  constructor(apiKey: string, comparator: IVersionComparator) {
    this.openai = new OpenAI({ apiKey });
    this.comparator = comparator;
  }

  async selectBestVersion(
    versions: ContentVersion[],
    criteria: string
  ): Promise<{
    bestVersion: ContentVersion;
    comparison: VersionComparison;
  }> {
    if (versions.length === 0) {
      throw new Error('No versions provided for selection');
    }

    if (versions.length === 1) {
      return {
        bestVersion: versions[0],
        comparison: this.createSingleVersionComparison(versions[0], criteria)
      };
    }

    try {
      // Compare versions based on criteria
      const comparison = await this.compareVersions(versions, [criteria]);
      
      // Find the best version based on rank
      const bestVersion = versions.find(v => v.id === comparison.bestVersionId);
      
      if (!bestVersion) {
        throw new Error('Best version not found in comparison results');
      }

      return {
        bestVersion,
        comparison
      };
    } catch (error) {
      // Fallback to simple quality-based selection
      const bestVersion = await this.selectByQuality(versions);
      return {
        bestVersion,
        comparison: this.createFallbackComparison(versions, bestVersion, criteria)
      };
    }
  }

  async compareVersions(
    versions: ContentVersion[],
    criteria: string[]
  ): Promise<VersionComparison> {
    const comparison: VersionComparison = {
      requestId: versions[0]?.requestId || '',
      versionIds: versions.map(v => v.id),
      comparisonCriteria: criteria,
      results: [],
      bestVersionId: '',
      comparisonSummary: '',
      comparedAt: new Date()
    };

    try {
      // Perform detailed comparison using AI
      const comparisonResult = await this.performAIComparison(versions, criteria);
      
      comparison.results = comparisonResult.results;
      comparison.bestVersionId = comparisonResult.bestVersionId;
      comparison.comparisonSummary = comparisonResult.summary;

      return comparison;
    } catch (error) {
      // Fallback to rule-based comparison
      return this.performRuleBasedComparison(versions, criteria);
    }
  }

  async rankVersions(
    versions: ContentVersion[],
    criteria: string
  ): Promise<ContentVersion[]> {
    try {
      const comparison = await this.compareVersions(versions, [criteria]);
      
      // Sort versions based on comparison results
      const rankedVersions = versions.sort((a, b) => {
        const resultA = comparison.results.find(r => r.versionId === a.id);
        const resultB = comparison.results.find(r => r.versionId === b.id);
        
        if (!resultA || !resultB) return 0;
        
        return resultA.rank - resultB.rank;
      });

      return rankedVersions;
    } catch (error) {
      // Fallback to quality-based ranking
      return versions.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    }
  }

  async selectByQuality(versions: ContentVersion[]): Promise<ContentVersion> {
    return versions.reduce((best, current) => {
      const bestScore = best.qualityScore || 0;
      const currentScore = current.qualityScore || 0;
      return currentScore > bestScore ? current : best;
    });
  }

  async selectByCost(versions: ContentVersion[]): Promise<ContentVersion> {
    return versions.reduce((best, current) => {
      const bestCost = best.metadata?.cost || Infinity;
      const currentCost = current.metadata?.cost || Infinity;
      return currentCost < bestCost ? current : best;
    });
  }

  async selectBySpeed(versions: ContentVersion[]): Promise<ContentVersion> {
    return versions.reduce((best, current) => {
      const bestTime = best.metadata?.processingTime || Infinity;
      const currentTime = current.metadata?.processingTime || Infinity;
      return currentTime < bestTime ? current : best;
    });
  }

  async selectByCustomCriteria(
    versions: ContentVersion[],
    criteria: Record<string, number>
  ): Promise<ContentVersion> {
    let bestVersion = versions[0];
    let bestScore = -Infinity;

    for (const version of versions) {
      let score = 0;
      
      // Calculate weighted score based on criteria
      for (const [key, weight] of Object.entries(criteria)) {
        if (key === 'quality') {
          score += (version.qualityScore || 0) * weight;
        } else if (key === 'cost') {
          const cost = version.metadata?.cost || 0;
          score += (1 / (cost + 1)) * weight; // Inverse cost (lower is better)
        } else if (key === 'speed') {
          const time = version.metadata?.processingTime || 0;
          score += (1 / (time + 1)) * weight; // Inverse time (lower is better)
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestVersion = version;
      }
    }

    return bestVersion;
  }

  async compareByQuality(versions: ContentVersion[]): Promise<VersionComparison> {
    return this.performRuleBasedComparison(versions, ['quality']);
  }

  async compareByContent(versions: ContentVersion[]): Promise<VersionComparison> {
    try {
      const comparisonResult = await this.performAIComparison(versions, ['content']);
      
      return {
        requestId: versions[0]?.requestId || '',
        versionIds: versions.map(v => v.id),
        comparisonCriteria: ['content'],
        results: comparisonResult.results,
        bestVersionId: comparisonResult.bestVersionId,
        comparisonSummary: comparisonResult.summary,
        comparedAt: new Date()
      };
    } catch (error) {
      return this.performRuleBasedComparison(versions, ['content']);
    }
  }

  async compareByMetrics(versions: ContentVersion[]): Promise<VersionComparison> {
    return this.performRuleBasedComparison(versions, ['quality', 'cost', 'speed']);
  }

  async compareByCustomCriteria(
    versions: ContentVersion[],
    criteria: string[]
  ): Promise<VersionComparison> {
    return this.performRuleBasedComparison(versions, criteria);
  }

  // Private helper methods

  private async performAIComparison(
    versions: ContentVersion[],
    criteria: string[]
  ): Promise<{
    results: Array<{
      versionId: string;
      rank: number;
      score: number;
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
    }>;
    bestVersionId: string;
    summary: string;
  }> {
    const prompt = this.buildComparisonPrompt(versions, criteria);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content evaluator. Compare multiple versions of content and provide detailed analysis. Return results in JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const parsed = JSON.parse(content);
      
      // Ensure all versions have results
      const results: any[] = [];
      for (const version of versions) {
        const result = parsed.results?.find((r: any) => r.versionId === version.id);
        if (result) {
          results.push(result);
        } else {
          results.push({
            versionId: version.id,
            rank: 999,
            score: 0,
            strengths: [],
            weaknesses: ['Not evaluated'],
            recommendations: []
          });
        }
      }
      
      return {
        results,
        bestVersionId: parsed.bestVersionId || versions[0]?.id || '',
        summary: parsed.summary || 'Comparison completed'
      };
    } catch (error) {
      throw new Error('Failed to parse AI comparison results');
    }
  }

  private performRuleBasedComparison(
    versions: ContentVersion[],
    criteria: string[]
  ): VersionComparison {
    const results: any[] = [];
    let bestVersionId = '';
    let bestScore = -Infinity;

    for (const version of versions) {
      let score = 0;
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      const recommendations: string[] = [];

      // Calculate score based on criteria
      if (criteria.includes('quality')) {
        const qualityScore = version.qualityScore || 0;
        score += qualityScore * 0.4;
        
        if (qualityScore >= 8) strengths.push('High quality score');
        else if (qualityScore < 6) weaknesses.push('Low quality score');
        else recommendations.push('Improve quality score');
      }

      if (criteria.includes('cost')) {
        const cost = version.metadata?.cost || 0;
        const costScore = Math.max(0, 10 - (cost * 100)); // Inverse cost scoring
        score += costScore * 0.2;
        
        if (cost < 0.01) strengths.push('Low cost');
        else if (cost > 0.05) weaknesses.push('High cost');
        else recommendations.push('Optimize cost efficiency');
      }

      if (criteria.includes('speed')) {
        const time = version.metadata?.processingTime || 0;
        const speedScore = Math.max(0, 10 - (time / 1000)); // Inverse time scoring
        score += speedScore * 0.2;
        
        if (time < 1000) strengths.push('Fast generation');
        else if (time > 5000) weaknesses.push('Slow generation');
        else recommendations.push('Improve generation speed');
      }

      if (criteria.includes('content')) {
        const contentLength = version.content.length;
        const lengthScore = Math.min(10, contentLength / 100);
        score += lengthScore * 0.2;
        
        if (contentLength > 500) strengths.push('Comprehensive content');
        else if (contentLength < 100) weaknesses.push('Brief content');
        else recommendations.push('Expand content length');
      }

      results.push({
        versionId: version.id,
        rank: 0, // Will be set after sorting
        score,
        strengths,
        weaknesses,
        recommendations
      });

      if (score > bestScore) {
        bestScore = score;
        bestVersionId = version.id;
      }
    }

    // Sort by score and assign ranks
    results.sort((a, b) => b.score - a.score);
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    return {
      requestId: versions[0]?.requestId || '',
      versionIds: versions.map(v => v.id),
      comparisonCriteria: criteria,
      results,
      bestVersionId,
      comparisonSummary: `Rule-based comparison completed. Best version selected based on: ${criteria.join(', ')}.`,
      comparedAt: new Date()
    };
  }

  private buildComparisonPrompt(versions: ContentVersion[], criteria: string[]): string {
    let prompt = `Compare the following content versions based on these criteria: ${criteria.join(', ')}.\n\n`;
    
    versions.forEach((version, index) => {
      prompt += `Version ${index + 1} (ID: ${version.id}):\n`;
      prompt += `Content: ${version.content}\n`;
      prompt += `Quality Score: ${version.qualityScore || 'N/A'}\n`;
      prompt += `Processing Time: ${version.metadata?.processingTime || 'N/A'}ms\n`;
      prompt += `Cost: $${version.metadata?.cost || 'N/A'}\n`;
      prompt += `---\n\n`;
    });
    
    prompt += `Please provide:
1. A ranking of all versions (1 being best)
2. A score (0-10) for each version
3. Strengths and weaknesses for each version
4. Recommendations for each version
5. The best version ID
6. A summary of the comparison

Return as JSON with this structure:
{
  "results": [
    {
      "versionId": "version_id",
      "rank": 1,
      "score": 8.5,
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1", "weakness2"],
      "recommendations": ["recommendation1", "recommendation2"]
    }
  ],
  "bestVersionId": "best_version_id",
  "summary": "Comparison summary text"
}`;

    return prompt;
  }

  private createSingleVersionComparison(
    version: ContentVersion,
    criteria: string
  ): VersionComparison {
    return {
      requestId: version.requestId,
      versionIds: [version.id],
      comparisonCriteria: [criteria],
      results: [{
        versionId: version.id,
        rank: 1,
        score: version.qualityScore || 0,
        strengths: ['Only version available'],
        weaknesses: [],
        recommendations: []
      }],
      bestVersionId: version.id,
      comparisonSummary: 'Single version comparison - automatically selected as best.',
      comparedAt: new Date()
    };
  }

  private createFallbackComparison(
    versions: ContentVersion[],
    bestVersion: ContentVersion,
    criteria: string
  ): VersionComparison {
    const results = versions.map((version, index) => ({
      versionId: version.id,
      rank: version.id === bestVersion.id ? 1 : index + 2,
      score: version.qualityScore || 0,
      strengths: version.id === bestVersion.id ? ['Selected as best'] : [],
      weaknesses: version.id !== bestVersion.id ? ['Not selected'] : [],
      recommendations: []
    }));

    return {
      requestId: versions[0]?.requestId || '',
      versionIds: versions.map(v => v.id),
      comparisonCriteria: [criteria],
      results,
      bestVersionId: bestVersion.id,
      comparisonSummary: 'Fallback comparison based on quality scores.',
      comparedAt: new Date()
    };
  }
}
