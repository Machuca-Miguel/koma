import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class UpdateUserComicDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isOwned?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isWishlist?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isLoaned?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  loanedTo?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
