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

  @ApiPropertyOptional({
    example: 'Bruce Wayne descubre su camino hacia convertirse en Batman...',
  })
  @IsString()
  @IsOptional()
  synopsis?: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg' })
  @IsUrl()
  @IsOptional()
  coverUrl?: string;

  @ApiPropertyOptional({ example: '12345' })
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional({
    example: 'comic_vine',
    enum: ['comic_vine', 'marvel', 'gcd'],
  })
  @IsString()
  @IsOptional()
  externalApi?: string;

  @ApiPropertyOptional({ example: '978-84-679-1234-5' })
  @IsString()
  @IsOptional()
  isbn?: string;

  @ApiPropertyOptional({ enum: BindingFormat })
  @IsEnum(BindingFormat)
  @IsOptional()
  binding?: BindingFormat;

  @ApiPropertyOptional({ example: 'Ligne Claire' })
  @IsString()
  @IsOptional()
  drawingStyle?: string;

  @ApiPropertyOptional({ example: 'Astérix' })
  @IsString()
  @IsOptional()
  series?: string;

  @ApiPropertyOptional({ example: 'Frank Miller, David Mazzucchelli' })
  @IsString()
  @IsOptional()
  authors?: string;

  @ApiPropertyOptional({ description: 'ID de la Serie a la que pertenece este cómic' })
  @IsString()
  @IsOptional()
  seriesId?: string;
}
