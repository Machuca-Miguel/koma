import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { CollectionStatus } from '@prisma/client';

export class AddComicDto {
  @ApiProperty({ description: 'ID del cómic a agregar' })
  @IsString()
  comicId: string;

  @ApiPropertyOptional({
    enum: CollectionStatus,
    default: 'IN_COLLECTION',
    description: 'Initial collection status (defaults to IN_COLLECTION)',
  })
  @IsIn(Object.values(CollectionStatus))
  @IsOptional()
  collectionStatus?: CollectionStatus;

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
