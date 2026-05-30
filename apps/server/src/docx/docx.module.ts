import { Global, Module } from '@nestjs/common';
import { DocxReader } from './reader';
import { DocxRenderer } from './renderer';

@Global()
@Module({
  providers: [DocxReader, DocxRenderer],
  exports: [DocxReader, DocxRenderer],
})
export class DocxModule {}
