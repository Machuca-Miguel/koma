import { Module } from '@nestjs/common';
import { SeriesService } from './series.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SeriesService],
  exports: [SeriesService],
})
export class SeriesModule {}
