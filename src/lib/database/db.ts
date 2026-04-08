// Database instance and utilities
import { dbConnection } from './connection';

// Export the database instance
export const db = dbConnection.getDb();

// Database utilities
export class DatabaseUtils {
  // Query execution with error handling
  static async executeQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
    try {
      const pool = dbConnection.getPool();
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Transaction wrapper
  static async executeTransaction<T>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    const pool = dbConnection.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Health check
  static async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    return dbConnection.healthCheck();
  }

  // Connection stats
  static async getStats(): Promise<{
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  }> {
    return dbConnection.getConnectionStats();
  }

  // Database maintenance
  static async vacuumTable(tableName: string): Promise<void> {
    await this.executeQuery(`VACUUM ${tableName}`);
  }

  static async analyzeTable(tableName: string): Promise<void> {
    await this.executeQuery(`ANALYZE ${tableName}`);
  }

  static async reindexTable(tableName: string): Promise<void> {
    await this.executeQuery(`REINDEX TABLE ${tableName}`);
  }

  // Backup utilities (basic)
  static async createBackup(tableName: string): Promise<any[]> {
    const query = `SELECT * FROM ${tableName}`;
    return this.executeQuery(query);
  }

  // Migration helpers
  static async tableExists(tableName: string): Promise<boolean> {
    const result = await this.executeQuery(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      )
    `, [tableName]);

    return result[0].exists;
  }

  static async columnExists(tableName: string, columnName: string): Promise<boolean> {
    const result = await this.executeQuery(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      )
    `, [tableName, columnName]);

    return result[0].exists;
  }

  // Bulk operations
  static async bulkInsert(tableName: string, data: Record<string, any>[]): Promise<void> {
    if (data.length === 0) return;

    const columns = Object.keys(data[0]);
    const values = data.map(row => `(${columns.map((_, i) => `$${i + 1}`).join(', ')})`).join(', ');
    const flattenedValues = data.flatMap(row => columns.map(col => row[col]));

    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${values}`;
    await this.executeQuery(query, flattenedValues);
  }

  static async bulkUpdate(
    tableName: string,
    updates: Array<{ id: any; data: Record<string, any> }>
  ): Promise<void> {
    const client = dbConnection.getPool().connect();

    try {
      await (await client).query('BEGIN');

      for (const update of updates) {
        const columns = Object.keys(update.data);
        const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
        const values = columns.map(col => update.data[col]);

        const query = `UPDATE ${tableName} SET ${setClause} WHERE id = $${columns.length + 1}`;
        await (await client).query(query, [...values, update.id]);
      }

      await (await client).query('COMMIT');
    } catch (error) {
      await (await client).query('ROLLBACK');
      throw error;
    } finally {
      (await client).release();
    }
  }
}
