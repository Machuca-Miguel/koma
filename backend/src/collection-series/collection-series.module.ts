import { Module } from '@nestjs/common';
import { CollectionSeriesController } from './collection-series.controller';
import { CollectionSeriesService } from './collection-series.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CollectionSeriesController],
  providers: [CollectionSeriesService],
  exports: [CollectionSeriesService],
})
export class CollectionSeriesModule {}
