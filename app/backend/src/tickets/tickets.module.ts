import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../database/entities/ticket.entity';
import { Comment } from '../database/entities/comment.entity';
import { Category } from '../database/entities/category.entity';
import { User } from '../database/entities/user.entity';
import { Attachment } from '../database/entities/attachment.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Comment, Category, User, Attachment]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
