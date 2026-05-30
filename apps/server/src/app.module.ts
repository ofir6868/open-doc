import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigModule } from './config/config.module';
import { StorageModule } from './storage/storage.module';
import { DocxModule } from './docx/docx.module';
import { SchemaModule } from './schema/schema.module';
import { TemplatesModule } from './templates/templates.module';
import { GenerationModule } from './generation/generation.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true }),
    ConfigModule,
    StorageModule,
    DocxModule,
    SchemaModule,
    TemplatesModule,
    GenerationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
