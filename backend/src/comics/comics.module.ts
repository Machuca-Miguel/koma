import { Module } from '@nestjs/common';
import { ComicsService } from './comics.service';
import { ComicsController } from './comics.controller';

@Module({
  providers: [ComicsService],
  controllers: [ComicsController],
  exports: [ComicsService],
})
export class ComicsModule {}
