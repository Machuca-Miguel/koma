import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class AddComicDto {
  @ApiProperty({ description: 'ID del cómic a agregar' })
  @IsString()
  comicId: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isOwned?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isWishlist?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({ example: 'Una obra maestra del género noir.' })
  @IsString()
  @IsOptional()
  notes?: string;
}
