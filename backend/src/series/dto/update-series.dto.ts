import { IsString, IsOptional, IsInt, Min, Max, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSeriesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  publisher?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1800)
  @Max(2099)
  yearBegan?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1800)
  @Max(2099)
  yearEnded?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsUrl()
  coverUrl?: string;
}
