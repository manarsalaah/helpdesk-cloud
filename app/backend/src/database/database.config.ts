import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Category } from './entities/category.entity';
import { Ticket } from './entities/ticket.entity';
import { Comment } from './entities/comment.entity';
import { Attachment } from './entities/attachment.entity';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const dbType = process.env.DB_TYPE || (process.env.DB_HOST ? 'postgres' : 'sqlite');

  if (dbType === 'postgres') {
    return {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'helpdesk',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      entities: [User, Category, Ticket, Comment, Attachment],
      synchronize: true, // Auto-create schema in development/demo
      logging: process.env.NODE_ENV === 'development',
    };
  }

  return {
    type: 'sqlite',
    database: process.env.DB_FILE || 'helpdesk.sqlite',
    entities: [User, Category, Ticket, Comment, Attachment],
    synchronize: true,
    logging: false,
  };
};
