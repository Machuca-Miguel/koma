import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IsbndbService } from './isbndb.service';
import { IsbndbController } from './isbndb.controller';

@Module({
  imports: [PrismaModule],
  providers: [IsbndbService],
  controllers: [IsbndbController],
  exports: [IsbndbService],
})
export class IsbndbModule {}
