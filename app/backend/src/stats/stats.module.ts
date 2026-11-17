import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../database/entities/ticket.entity';
import { User } from '../database/entities/user.entity';
import { Category } from '../database/entities/category.entity';
import { Comment } from '../database/entities/comment.entity';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, User, Category, Comment])],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
