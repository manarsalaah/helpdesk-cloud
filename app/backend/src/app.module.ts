import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { getDatabaseConfig } from './database/database.config';
import { SeedService } from './database/seeds/seed.service';
import { User } from './database/entities/user.entity';
import { Category } from './database/entities/category.entity';
import { Ticket } from './database/entities/ticket.entity';
import { Comment } from './database/entities/comment.entity';
import { Attachment } from './database/entities/attachment.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { TicketsModule } from './tickets/tickets.module';
import { StatsModule } from './stats/stats.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([User, Category, Ticket, Comment, Attachment]),
    AuthModule,
    UsersModule,
    CategoriesModule,
    TicketsModule,
    StatsModule,
    HealthModule,
  ],
  providers: [
    SeedService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
