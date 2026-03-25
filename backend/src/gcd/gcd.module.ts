import { Module } from '@nestjs/common';
import { GcdDatabaseService } from './gcd-database.service';
import { GcdService } from './gcd.service';
import { GcdController } from './gcd.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GcdDatabaseService, GcdService],
  controllers: [GcdController],
  exports: [GcdService],
})
export class GcdModule {}
