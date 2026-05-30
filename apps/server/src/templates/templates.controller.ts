import {
  Controller, Get, Post, Put, Patch, Delete, Param, UploadedFile,
  UseInterceptors, Body, Res, HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { TemplatesService } from './templates.service';
import { UploadTemplateDto } from './dto/upload-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import * as path from 'path';
import { DocxReader } from '../docx/reader';
import { DocxRenderer, FIELD_SENTINEL } from '../docx/renderer';
import { set } from 'lodash';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function decodeFilename(raw: string): string {
  try {
    return Buffer.from(raw, 'latin1').toString('utf8');
  } catch {
    return raw;
  }
}

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_');
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

@Controller('templates')
export class TemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly docxReader: DocxReader,
    private readonly docxRenderer: DocxRenderer,
  ) { }

  @Get()
  list() {
    return this.templatesService.list();
  }

  @Post('prepare')
  @UseInterceptors(FileInterceptor('file'))
  async prepare(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
    const originalName = decodeFilename(file.originalname);
    const { buffer, filename } = this.templatesService.prepare(file.buffer, originalName);
    res.set('Content-Type', DOCX_MIME);
    res.set('Content-Disposition', contentDisposition(filename));
    res.end(buffer);
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  preview(@UploadedFile() file: Express.Multer.File) {
    return this.templatesService.preview(file.buffer, decodeFilename(file.originalname));
  }

  @Post('preview-html')
  @UseInterceptors(FileInterceptor('file'))
  previewHtml(@UploadedFile() file: Express.Multer.File) {
    const doc = this.docxReader.read(file.buffer);
    const fields = doc.contentControls.map(cc => cc.tag);
    const data: Record<string, unknown> = {};
    for (const tag of fields) {
      set(data, tag, FIELD_SENTINEL + tag);
    }
    const html = this.docxRenderer.renderHtml(doc, data);
    return { html };
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadTemplateDto) {
    const originalName = decodeFilename(file.originalname);
    const id = path.basename(originalName, '.docx');
    const name = dto.name || originalName;
    return this.templatesService.upload(id, file.buffer, name);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.templatesService.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.updateMeta(id, dto);
  }

  @Put(':id/file')
  @UseInterceptors(FileInterceptor('file'))
  replace(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.templatesService.replace(id, file.buffer);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.templatesService.duplicate(id);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id') id: string) {
    return this.templatesService.delete(id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.templatesService.download(id);
    res.set('Content-Type', DOCX_MIME);
    res.set('Content-Disposition', contentDisposition(`${id}.docx`));
    res.end(buffer);
  }
}
