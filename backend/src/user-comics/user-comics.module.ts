import { Module } from '@nestjs/common';
import { UserComicsService } from './user-comics.service';
import { UserComicsController } from './user-comics.controller';
import { IsbndbModule } from '../isbndb/isbndb.module';

@Module({
  imports: [IsbndbModule],
  providers: [UserComicsService],
  controllers: [UserComicsController],
})
export class UserComicsModule {}
