import { DatabaseConnection } from '../database/DatabaseConnection';

export interface ScoringResult {
  id: string;
  entityType: string;
  entityId: string;
  score: number;
  algorithm: string;
  factors: ScoringFactor[];
  breakdown: Record<string, number>;
  confidence: number;
  explanation: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface ScoringFactor {
  name: string;
  weight: number;
  value: number;
  description?: string;
  explanation?: string;
}

export interface CreateScoringResultData {
  entityType: string;
  entityId: string;
  score: number;
  algorithm: string;
  factors: ScoringFactor[];
  breakdown: Record<string, number>;
  confidence: number;
  explanation: string;
  metadata?: Record<string, any>;
}

export interface UpdateScoringResultData {
  score?: number;
  factors?: ScoringFactor[];
  breakdown?: Record<string, number>;
  confidence?: number;
  explanation?: string;
  metadata?: Record<string, any>;
}

export class ScoringResultRepository {
  constructor(private db: DatabaseConnection) {}

  async create(resultData: CreateScoringResultData): Promise<ScoringResult> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const query = `
      INSERT INTO scoring_results (
        id, entity_type, entity_id, score, algorithm, factors, breakdown,
        confidence, explanation, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      id,
      resultData.entityType,
      resultData.entityId,
      resultData.score,
      resultData.algorithm,
      JSON.stringify(resultData.factors),
      JSON.stringify(resultData.breakdown),
      resultData.confidence,
      resultData.explanation,
      JSON.stringify(resultData.metadata || {}),
      now
    ]);
    
    return this.mapToScoringResult(result);
  }

  async findById(id: string): Promise<ScoringResult | null> {
    const query = 'SELECT * FROM scoring_results WHERE id = $1';
    const result = await this.db.queryOne(query, [id]);
    return result ? this.mapToScoringResult(result) : null;
  }

  async findByEntity(entityType: string, entityId: string): Promise<ScoringResult[]> {
    const query = 'SELECT * FROM scoring_results WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC';
    const results = await this.db.query(query, [entityType, entityId]);
    return results.map(this.mapToScoringResult);
  }

  async findByEntityType(entityType: string): Promise<ScoringResult[]> {
    const query = 'SELECT * FROM scoring_results WHERE entity_type = $1 ORDER BY created_at DESC';
    const results = await this.db.query(query, [entityType]);
    return results.map(this.mapToScoringResult);
  }

  async findRecent(limit: number = 50): Promise<ScoringResult[]> {
    const query = 'SELECT * FROM scoring_results ORDER BY created_at DESC LIMIT $1';
    const results = await this.db.query(query, [limit]);
    return results.map(this.mapToScoringResult);
  }

  async findByScoreRange(minScore: number, maxScore: number): Promise<ScoringResult[]> {
    const query = 'SELECT * FROM scoring_results WHERE score >= $1 AND score <= $2 ORDER BY score DESC';
    const results = await this.db.query(query, [minScore, maxScore]);
    return results.map(this.mapToScoringResult);
  }

  async findByAlgorithm(algorithm: string): Promise<ScoringResult[]> {
    const query = 'SELECT * FROM scoring_results WHERE algorithm = $1 ORDER BY created_at DESC';
    const results = await this.db.query(query, [algorithm]);
    return results.map(this.mapToScoringResult);
  }

  async update(id: string, resultData: UpdateScoringResultData): Promise<ScoringResult | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (resultData.score !== undefined) {
      fields.push(`score = $${paramIndex++}`);
      values.push(resultData.score);
    }
    if (resultData.factors !== undefined) {
      fields.push(`factors = $${paramIndex++}`);
      values.push(JSON.stringify(resultData.factors));
    }
    if (resultData.breakdown !== undefined) {
      fields.push(`breakdown = $${paramIndex++}`);
      values.push(JSON.stringify(resultData.breakdown));
    }
    if (resultData.confidence !== undefined) {
      fields.push(`confidence = $${paramIndex++}`);
      values.push(resultData.confidence);
    }
    if (resultData.explanation !== undefined) {
      fields.push(`explanation = $${paramIndex++}`);
      values.push(resultData.explanation);
    }
    if (resultData.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(resultData.metadata));
    }

    if (fields.length === 0) {
      return await this.findById(id);
    }

    const query = `
      UPDATE scoring_results 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);

    const result = await this.db.queryOne(query, values);
    return result ? this.mapToScoringResult(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM scoring_results WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.length > 0;
  }

  async getStatistics(): Promise<{
    total: number;
    averageScore: number;
    algorithmUsage: Record<string, number>;
    entityTypeUsage: Record<string, number>;
  }> {
    const totalQuery = 'SELECT COUNT(*) as count FROM scoring_results';
    const avgQuery = 'SELECT AVG(score) as avg FROM scoring_results';
    const algoQuery = 'SELECT algorithm, COUNT(*) as count FROM scoring_results GROUP BY algorithm';
    const entityQuery = 'SELECT entity_type, COUNT(*) as count FROM scoring_results GROUP BY entity_type';

    const [totalResult, avgResult, algoResults, entityResults] = await Promise.all([
      this.db.queryOne(totalQuery),
      this.db.queryOne(avgQuery),
      this.db.query(algoQuery),
      this.db.query(entityQuery)
    ]);

    const algorithmUsage: Record<string, number> = {};
    algoResults.forEach((row: any) => {
      algorithmUsage[row.algorithm] = parseInt(row.count);
    });

    const entityTypeUsage: Record<string, number> = {};
    entityResults.forEach((row: any) => {
      entityTypeUsage[row.entity_type] = parseInt(row.count);
    });

    return {
      total: parseInt(totalResult.count),
      averageScore: parseFloat(avgResult.avg) || 0,
      algorithmUsage,
      entityTypeUsage
    };
  }

  async getTopScores(limit: number = 10): Promise<ScoringResult[]> {
    const query = 'SELECT * FROM scoring_results ORDER BY score DESC, created_at DESC LIMIT $1';
    const results = await this.db.query(query, [limit]);
    return results.map(this.mapToScoringResult);
  }

  async getScoreTrends(entityType: string, entityId: string, days: number = 30): Promise<{
    date: string;
    averageScore: number;
    count: number;
  }[]> {
    const query = `
      SELECT 
        DATE(created_at) as date,
        AVG(score) as average_score,
        COUNT(*) as count
      FROM scoring_results 
      WHERE entity_type = $1 
        AND entity_id = $2
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    const results = await this.db.query(query, [entityType, entityId]);
    return results.map((row: any) => ({
      date: row.date,
      averageScore: parseFloat(row.average_score),
      count: parseInt(row.count)
    }));
  }

  private mapToScoringResult(data: any): ScoringResult {
    return {
      id: data.id,
      entityType: data.entity_type,
      entityId: data.entity_id,
      score: data.score,
      algorithm: data.algorithm,
      factors: typeof data.factors === 'string' ? JSON.parse(data.factors) : data.factors,
      breakdown: typeof data.breakdown === 'string' ? JSON.parse(data.breakdown) : data.breakdown,
      confidence: data.confidence,
      explanation: data.explanation,
      metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata,
      createdAt: data.created_at
    };
  }
}
