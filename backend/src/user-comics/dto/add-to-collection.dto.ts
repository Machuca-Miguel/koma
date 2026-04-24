import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, MinLength, ArrayMinSize } from 'class-validator';

export class AddComicsToCollectionDto {
  @ApiProperty({ type: [String], description: 'IDs de los comics a asignar' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  comicIds: string[];

  @ApiProperty({ description: 'ID de la CollectionSeries destino' })
  @IsString()
  @MinLength(1)
  collectionSeriesId: string;
}
