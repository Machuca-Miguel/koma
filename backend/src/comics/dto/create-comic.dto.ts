import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsUrl,
  IsEnum,
} from 'class-validator';
import { BindingFormat } from '@prisma/client';

export class CreateComicDto {
  @ApiProperty({ example: 'Batman: Year One' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: '1' })
  @IsString()
  @IsOptional()
  issueNumber?: string;

  @ApiPropertyOptional({ example: 'DC Comics' })
  @IsString()
  @IsOptional()
  publisher?: string;

  @ApiPropertyOptional({ example: 1987 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ example: 'Bruce Wayne descubre su camino...' })
  @IsString()
  @IsOptional()
  synopsis?: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg' })
  @IsUrl()
  @IsOptional()
  coverUrl?: string;

  @ApiProperty({ example: '978-84-679-1234-5', description: 'ISBN obligatorio, no editable tras creación' })
  @IsString()
  @IsNotEmpty()
  isbn: string;

  @ApiPropertyOptional({ enum: BindingFormat, nullable: true })
  @IsEnum(BindingFormat)
  @IsOptional()
  binding?: BindingFormat | null;

  @ApiPropertyOptional({ example: 'Ligne Claire' })
  @IsString()
  @IsOptional()
  drawingStyle?: string;

  @ApiPropertyOptional({ example: 'Frank Miller, David Mazzucchelli' })
  @IsString()
  @IsOptional()
  authors?: string;

  @ApiPropertyOptional({ example: 'Frank Miller' })
  @IsString()
  @IsOptional()
  scriptwriter?: string;

  @ApiPropertyOptional({ example: 'David Mazzucchelli' })
  @IsString()
  @IsOptional()
  artist?: string;

}
