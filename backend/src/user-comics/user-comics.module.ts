import { Module } from '@nestjs/common';
import { UserComicsService } from './user-comics.service';
import { UserComicsController } from './user-comics.controller';

@Module({
  providers: [UserComicsService],
  controllers: [UserComicsController],
})
export class UserComicsModule {}
