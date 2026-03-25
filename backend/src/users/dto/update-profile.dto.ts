import { IsString, IsOptional, MinLength, MaxLength, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ minLength: 3, maxLength: 30 })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ enum: ['es', 'en'] })
  @IsString()
  @IsIn(['es', 'en'])
  @IsOptional()
  language?: string;
}
