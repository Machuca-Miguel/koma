import { Module } from '@nestjs/common';
import { ExternalComicsService } from './external-comics.service';
import { ExternalComicsController } from './external-comics.controller';
import { ComicVineService } from './providers/comic-vine.service';
import { MetronService } from './providers/metron.service';

@Module({
  providers: [ExternalComicsService, ComicVineService, MetronService],
  controllers: [ExternalComicsController],
})
export class ExternalComicsModule {}
