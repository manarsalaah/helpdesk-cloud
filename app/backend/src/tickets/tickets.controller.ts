import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../database/entities/user.entity';
import { TicketStatus, TicketPriority } from '../database/entities/ticket.entity';

// Ensure uploads folder exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const randomName = Array(16)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    cb(null, `${randomName}${extname(file.originalname)}`);
  },
});

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
    @Query('categoryId') categoryId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('createdById') createdById?: string,
    @Query('search') search?: string,
    @Query('my') my?: string,
  ) {
    return this.ticketsService.findAll({
      status,
      priority,
      categoryId,
      assignedToId,
      createdById,
      search,
      my: my === 'true',
      currentUser: user,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @Body()
    body: {
      title: string;
      description: string;
      categoryId?: string;
      priority?: TicketPriority;
    },
  ) {
    if (!body.title || !body.description) {
      throw new BadRequestException('Le titre et la description sont obligatoires');
    }
    return this.ticketsService.create(user, body);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('status') status: TicketStatus,
    @Body('resolutionNotes') resolutionNotes?: string,
  ) {
    return this.ticketsService.updateStatus(id, user, status, resolutionNotes);
  }

  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('technicianId') technicianId: string,
  ) {
    return this.ticketsService.assign(id, user, technicianId);
  }

  @Patch(':id/priority')
  updatePriority(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('priority') priority: TicketPriority,
  ) {
    return this.ticketsService.updatePriority(id, user, priority);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body()
    body: {
      content: string;
      isTechnicalNote?: boolean;
    },
  ) {
    if (!body.content || !body.content.trim()) {
      throw new BadRequestException('Le contenu du commentaire ne peut pas être vide');
    }
    return this.ticketsService.addComment(id, user, body);
  }

  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Fichier requis');
    }
    return this.ticketsService.addAttachment(id, {
      originalname: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
    });
  }
}
