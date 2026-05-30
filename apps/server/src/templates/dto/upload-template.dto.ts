import { IsString, IsOptional } from 'class-validator';

export class UploadTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;
}
