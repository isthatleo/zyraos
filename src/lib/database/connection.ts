// Database connection utilities
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Database configuration
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool | null = null;
  private db: any = null;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async connect(config: DatabaseConfig): Promise<void> {
    try {
      this.pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl || false,
        max: config.maxConnections || 20,
        idleTimeoutMillis: config.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      console.log('Database connected successfully');

      // Initialize Drizzle
      this.db = drizzle(this.pool);
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool;
  }

  getDb() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
      console.log('Database disconnected');
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    if (!this.pool) {
      return { healthy: false, error: 'Database not connected' };
    }

    const start = Date.now();
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  async getConnectionStats(): Promise<{
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  }> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Export singleton instance
export const dbConnection = DatabaseConnection.getInstance();
