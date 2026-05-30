import { Module } from '@nestjs/common';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [TemplatesModule],
  controllers: [GenerationController],
  providers: [GenerationService],
})
export class GenerationModule {}
