import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { CollectionStatus, ReadStatus, SaleStatus } from '@prisma/client';

const COLLECTION_STATUS_VALUES = [...Object.values(CollectionStatus), null];
const READ_STATUS_VALUES = [...Object.values(ReadStatus), null];
const SALE_STATUS_VALUES = [...Object.values(SaleStatus), null];

export class UpdateUserComicDto {
  @ApiPropertyOptional({ enum: CollectionStatus, nullable: true,
    description: 'Group 1 — Collection status. null only when saleStatus=SOLD' })
  @IsIn(COLLECTION_STATUS_VALUES)
  @IsOptional()
  collectionStatus?: CollectionStatus | null;

  @ApiPropertyOptional({ enum: ReadStatus, nullable: true,
    description: 'Grupo 2 — Estado de lectura' })
  @IsIn(READ_STATUS_VALUES)
  @IsOptional()
  readStatus?: ReadStatus | null;

  @ApiPropertyOptional({ enum: SaleStatus, nullable: true,
    description: 'Group 3 — Sale status. SOLD clears collectionStatus automatically' })
  @IsIn(SALE_STATUS_VALUES)
  @IsOptional()
  saleStatus?: SaleStatus | null;

  @ApiPropertyOptional({ description: 'Who the comic is loaned to (only applies with LOANED)' })
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
