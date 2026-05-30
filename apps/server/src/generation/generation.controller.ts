import { Body, Controller, Header, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { GenerationService } from './generation.service';
import { GenerateDto } from './dto/generate.dto';

@Controller()
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('generate')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  async generate(@Body() dto: GenerateDto, @Res() res: Response) {
    const buffer = await this.generationService.generate(dto);
    // HTTP headers must be ASCII — strip any non-ASCII (e.g. Hebrew) from the filename.
    const safeName = `${dto.templateId}-generated.docx`.replace(/[^\x20-\x7E]/g, '_');
    res.set('Content-Disposition', `attachment; filename="${safeName}"`);
    res.end(buffer);
  }

  @Post('generate/preview')
  async preview(@Body() dto: GenerateDto): Promise<{ html: string }> {
    const html = await this.generationService.preview(dto);
    return { html };
  }
}
