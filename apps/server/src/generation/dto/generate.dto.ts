import { IsString, IsObject, IsOptional, IsBoolean } from 'class-validator';

export class GenerateDto {
  @IsString()
  templateId!: string;

  @IsObject()
  data!: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  strict?: boolean;
}
