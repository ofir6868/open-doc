import { Injectable } from '@nestjs/common';
import { TemplatesService } from '../templates/templates.service';
import { DocxReader } from '../docx/reader';
import { DocxRenderer } from '../docx/renderer';
import type { GenerateDto } from './dto/generate.dto';

@Injectable()
export class GenerationService {
  constructor(
    private readonly templates: TemplatesService,
    private readonly reader: DocxReader,
    private readonly renderer: DocxRenderer,
  ) {}

  async generate(dto: GenerateDto): Promise<Buffer> {
    const buffer = await this.templates.getRaw(dto.templateId);
    const doc = this.reader.read(buffer);
    return this.renderer.render(doc, dto.data, dto.strict);
  }

  async preview(dto: GenerateDto): Promise<string> {
    const buffer = await this.templates.getRaw(dto.templateId);
    const doc = this.reader.read(buffer);
    return this.renderer.renderHtml(doc, dto.data);
  }
}
