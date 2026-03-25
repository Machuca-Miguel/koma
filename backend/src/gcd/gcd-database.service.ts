import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mysql, { Pool } from 'mysql2/promise';

@Injectable()
export class GcdDatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool | null = null;
  readonly isAvailable: boolean;

  constructor(private readonly config: ConfigService) {
    this.isAvailable = !!this.config.get<string>('GCD_DB_HOST');
  }

  onModuleInit() {
    if (!this.isAvailable) return;
    this.pool = mysql.createPool({
      host: this.config.get<string>('GCD_DB_HOST'),
      port: Number(this.config.get('GCD_DB_PORT') ?? 3306),
      user: this.config.get<string>('GCD_DB_USER'),
      password: this.config.get<string>('GCD_DB_PASSWORD'),
      database: this.config.get<string>('GCD_DB_NAME') ?? 'comics_db',
      waitForConnections: true,
      connectionLimit: 5,
      charset: 'utf8mb4',
    });
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.pool) return [];
    const [rows] = await this.pool.query(sql, params);
    return rows as T[];
  }
}
