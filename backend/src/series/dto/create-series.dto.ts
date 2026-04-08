import { IsString, IsOptional, IsInt, Min, Max, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSeriesDto {
  @ApiProperty({ description: 'Nombre de la serie' })
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  publisher?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1800)
  @Max(2099)
  yearBegan?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1800)
  @Max(2099)
  yearEnded?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  coverUrl?: string;
}
