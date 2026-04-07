import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum IsbndbSearchColumn {
  TITLE = 'title',
  AUTHOR = 'author',
  PUBLISHER = 'publisher',
  ISBN = 'isbn',
  SUBJECT = 'subject',
}

export class SearchBooksDto {
  @ApiProperty({ description: 'Texto a buscar' })
  @IsString()
  q!: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiProperty({
    required: false,
    enum: IsbndbSearchColumn,
    description: 'Campo donde buscar',
  })
  @IsOptional()
  @IsEnum(IsbndbSearchColumn)
  column?: IsbndbSearchColumn;

  @ApiProperty({
    required: false,
    description: 'Código de idioma (ej: "es", "en")',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    required: false,
    description: 'Filtrar por año de publicación',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @ApiProperty({ required: false, description: 'Filtrar por edición' })
  @IsOptional()
  @IsString()
  edition?: string;

  @ApiProperty({
    required: false,
    description: 'Todos los términos deben coincidir',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  shouldMatchAll?: boolean;
}
