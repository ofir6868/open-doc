import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { SchemaDefinition } from '@open-doc/shared';

@Injectable()
export class SchemaService {
  private cache: SchemaDefinition | null = null;
  private cacheTime = 0;

  constructor(private readonly config: ConfigService) {}

  async getSchema(): Promise<SchemaDefinition> {
    const ttl = this.config.get<number>('SCHEMA_CACHE_TTL', 60) * 1000;
    if (this.cache && ttl > 0 && Date.now() - this.cacheTime < ttl) {
      return this.cache;
    }

    const schemaUrl = this.config.get<string>('SCHEMA_URL');
    if (schemaUrl) {
      const res = await fetch(schemaUrl);
      this.cache = (await res.json()) as SchemaDefinition;
    } else {
      const filePath = path.resolve('config/schema.json');
      const raw = await fs.readFile(filePath, 'utf-8');
      this.cache = JSON.parse(raw) as SchemaDefinition;
    }

    this.cacheTime = Date.now();
    return this.cache!;
  }
}
