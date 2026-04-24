import { DatabaseConnection } from '../../database/DatabaseConnection';
import { ErrorHandler } from '../errors/ErrorHandler';

export abstract class BaseRepository<T> {
  constructor(protected readonly db: DatabaseConnection) {}

  protected async executeQuery<T, R = T>(
    operation: string,
    query: string,
    params: any[] = [],
    userId?: string
  ): Promise<R> {
    try {
      if (operation === 'SELECT') {
        const results = await this.db.query<T[]>(query, params);
        return (results.length > 0 ? results[0] : null) as R;
      } else {
        const result = await this.db.queryOne<T>(query, params);
        return result as R;
      }
    } catch (error) {
      if (userId) {
        ErrorHandler.handleDatabaseError(operation, error, userId);
      } else {
        ErrorHandler.handleDatabaseError(operation, error);
      }
    }
  }

  protected async executeQueryMany<T>(
    operation: string,
    query: string,
    params: any[] = [],
    userId?: string
  ): Promise<T[]> {
    try {
      const results = await this.db.query<T[]>(query, params);
      return results[0] || [];
    } catch (error) {
      if (userId) {
        ErrorHandler.handleDatabaseError(operation, error, userId);
      } else {
        ErrorHandler.handleDatabaseError(operation, error);
      }
    }
  }

  protected async executeInsert<T>(
    entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    tableName: string,
    userId?: string
  ): Promise<T> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const columns = Object.keys(entity);
    const values = Object.values(entity);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')}, created_at, updated_at)
      VALUES (${placeholders.join(', ')}, $${columns.length + 1}, $${columns.length + 2})
      RETURNING *
    `;
    
    try {
      const result = await this.db.queryOne(query, [...values, id, now, now]);
      return result;
    } catch (error) {
      if (userId) {
        ErrorHandler.handleDatabaseError('INSERT', error, userId);
      } else {
        ErrorHandler.handleDatabaseError('INSERT', error);
      }
    }
  }

  protected async executeUpdate<T>(
    id: string,
    updates: Partial<T>,
    tableName: string,
    userId?: string
  ): Promise<T | null> {
    const updateColumns = Object.keys(updates);
    const updateValues = Object.values(updates);
    const updatePlaceholders = updateColumns.map((_, index) => `$${index + 1}`);
    
    const setClause = updateColumns.map((col, index) => `${col} = ${updatePlaceholders[index]}`).join(', ');
    
    const query = `
      UPDATE ${tableName}
      SET ${setClause}, updated_at = $${updateColumns.length + 1}
      WHERE id = $${updateColumns.length + 2}
      RETURNING *
    `;
    
    try {
      const result = await this.db.queryOne(query, [...updateValues, new Date(), id]);
      return result;
    } catch (error) {
      if (userId) {
        ErrorHandler.handleDatabaseError('UPDATE', error, userId);
      } else {
        ErrorHandler.handleDatabaseError('UPDATE', error);
      }
    }
  }

  protected async executeDelete(
    id: string,
    tableName: string,
    userId?: string
  ): Promise<void> {
    const query = `DELETE FROM ${tableName} WHERE id = $1`;
    
    try {
      await this.db.query(query, [id]);
    } catch (error) {
      if (userId) {
        ErrorHandler.handleDatabaseError('DELETE', error, userId);
      } else {
        ErrorHandler.handleDatabaseError('DELETE', error);
      }
    }
  }

  protected async executeCount(
    tableName: string,
    whereClause: string = '',
    params: any[] = [],
    userId?: string
  ): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM ${tableName}${whereClause}`;
    
    try {
      const result = await this.db.queryOne(query, params);
      return parseInt(result.count);
    } catch (error) {
      if (userId) {
        ErrorHandler.handleDatabaseError('COUNT', error, userId);
      } else {
        ErrorHandler.handleDatabaseError('COUNT', error);
      }
    }
  }
}
