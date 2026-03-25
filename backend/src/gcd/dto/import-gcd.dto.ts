import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportGcdDto {
  @ApiProperty({ example: 'gcd-12345' })
  @IsString()
  @IsNotEmpty()
  externalId: string;
}
