import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ExternalSource {
  COMIC_VINE = 'comic_vine',
  METRON = 'metron',
}

export class SearchExternalDto {
  @ApiProperty({ description: 'Término de búsqueda', example: 'batman year one' })
  @IsString()
  q: string;

  @ApiProperty({ enum: ExternalSource, example: ExternalSource.COMIC_VINE })
  @IsEnum(ExternalSource)
  source: ExternalSource;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;
}

export class ImportExternalDto {
  @ApiProperty({ description: 'ID del cómic en la API externa', example: '4000-123456' })
  @IsString()
  externalId: string;

  @ApiProperty({ enum: ExternalSource })
  @IsEnum(ExternalSource)
  source: ExternalSource;
}
