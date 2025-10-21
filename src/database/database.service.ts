import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  pool!: mysql.Pool;
  // keep the config so we can recreate the pool on transient errors
  private poolConfig: mysql.PoolOptions | undefined;

  async onModuleInit() {
    this.poolConfig = {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };

    await this.createPool();
  }

  private async createPool() {
    if (!this.poolConfig) throw new Error('Pool config not set');
    this.pool = mysql.createPool(this.poolConfig as any);

    // attach basic listeners to surface connection-level errors in logs
    try {
      // pool from mysql2 is an EventEmitter
      // listen for connection creation and attach error handler to each connection
      (this.pool as any).on?.('connection', (conn: any) => {
        conn.on('error', (err: any) => {
          this.logger.warn(`MySQL connection error event: ${err && err.code}`);
        });
      });
    } catch (err) {
      // not critical; continue
      this.logger.debug('Could not attach pool connection listeners');
    }

    try {
      const conn = await this.pool.getConnection();
      await conn.ping();
      conn.release();
      this.logger.log('MySQL pool created');
    } catch (err) {
      this.logger.error('Error pinging MySQL during pool creation', err as any);
      throw err;
    }
  }

  private async reconnect() {
    this.logger.warn('Recreating MySQL pool after transient error');
    try {
      if (this.pool) {
        await this.pool.end();
      }
    } catch (e) {
      this.logger.debug('Error closing pool during reconnect', (e as any)?.message);
    }
    await this.createPool();
  }

  async onModuleDestroy() {
    try {
      await this.pool.end();
    } catch (err) {
      this.logger.debug('Error ending MySQL pool', (err as any)?.message);
    }
  }

  getPool() {
    return this.pool;
  }

  // wrapper to execute queries with a small retry for transient connection errors
  async execute(sql: string, params?: any[]): Promise<any> {
    const transient = ['ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'ECONNREFUSED', 'ETIMEDOUT'];
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.pool.execute(sql, params);
      } catch (err: any) {
        this.logger.warn(`MySQL execute error (attempt ${attempt + 1}): ${err && err.code}`);
        if (err && transient.includes(err.code) && attempt < 2) {
          // try to recreate the pool and retry
          try {
            await this.reconnect();
          } catch (reErr) {
            this.logger.error('Reconnect failed', reErr as any);
            throw err;
          }
          continue;
        }
        throw err;
      }
    }
  }
}