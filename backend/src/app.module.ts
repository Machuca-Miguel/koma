import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ComicsModule } from './comics/comics.module';
import { UserComicsModule } from './user-comics/user-comics.module';
import { CollectionsModule } from './collections/collections.module';
import { CollectionSeriesModule } from './collection-series/collection-series.module';
import { AiModule } from './ai/ai.module';
import { IsbndbModule } from './isbndb/isbndb.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ComicsModule,
    UserComicsModule,
    CollectionsModule,
    CollectionSeriesModule,
    AiModule,
    IsbndbModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
