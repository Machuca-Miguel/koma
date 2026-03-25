import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, IsUrl } from 'class-validator';

export class CreateComicDto {
  @ApiProperty({ example: 'Batman: Year One' })
  @IsString()
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
    enum: ['comic_vine', 'marvel'],
  })
  @IsString()
  @IsOptional()
  externalApi?: string;
}
