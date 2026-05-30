import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        HOST: Joi.string().default('0.0.0.0'),
        TEMPLATE_DIR: Joi.string().default('./templates'),
        SCHEMA_URL: Joi.string().uri().optional().allow(''),
        SCHEMA_CACHE_TTL: Joi.number().default(60),
        API_KEY: Joi.string().optional().allow(''),
        STRICT_MODE: Joi.boolean().default(false),
        CORS_ORIGINS: Joi.string().default('*'),
      }),
    }),
  ],
})
export class ConfigModule {}
