import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryComicDto {
  @ApiPropertyOptional({ description: 'Búsqueda por título o editorial' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'DC Comics' })
  @IsString()
  @IsOptional()
  publisher?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Buscar por ISBN exacto' })
  @IsString()
  @IsOptional()
  isbn?: string;
}
