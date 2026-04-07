import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateCollectionDto {
  @ApiProperty({ example: 'Mi colección de Batman' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Todos los cómics de Batman que tengo.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Si es pública, otros usuarios pueden verla',
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ example: 4, description: 'Puntuación 1-5' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;
}
