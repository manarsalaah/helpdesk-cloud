import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, FindOptionsWhere } from 'typeorm';
import { Ticket, TicketStatus, TicketPriority } from '../database/entities/ticket.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { Category } from '../database/entities/category.entity';
import { Comment, CommentType } from '../database/entities/comment.entity';
import { Attachment } from '../database/entities/attachment.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Attachment)
    private readonly attachmentRepo: Repository<Attachment>,
  ) {}

  private calculateSla(priority: TicketPriority): Date {
    const now = new Date();
    const hoursMap: Record<TicketPriority, number> = {
      [TicketPriority.URGENTE]: 4,
      [TicketPriority.HAUTE]: 24,
      [TicketPriority.MOYENNE]: 48,
      [TicketPriority.BASSE]: 72,
    };
    const hours = hoursMap[priority] || 48;
    return new Date(now.getTime() + hours * 3600 * 1000);
  }

  private async generateTicketNumber(): Promise<string> {
    const count = await this.ticketRepo.count();
    return `TICK-${1000 + count + 1}`;
  }

  async findAll(query: {
    status?: TicketStatus;
    priority?: TicketPriority;
    categoryId?: string;
    assignedToId?: string;
    createdById?: string;
    search?: string;
    my?: boolean;
    currentUser?: User;
  }) {
    const qb = this.ticketRepo
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.category', 'category')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.assignedTo', 'assignedTo')
      .leftJoinAndSelect('ticket.attachments', 'attachments')
      .orderBy('ticket.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }

    if (query.priority) {
      qb.andWhere('ticket.priority = :priority', { priority: query.priority });
    }

    if (query.categoryId) {
      qb.andWhere('ticket.categoryId = :categoryId', { categoryId: query.categoryId });
    }

    if (query.assignedToId) {
      qb.andWhere('ticket.assignedToId = :assignedToId', { assignedToId: query.assignedToId });
    }

    if (query.createdById) {
      qb.andWhere('ticket.createdById = :createdById', { createdById: query.createdById });
    }

    if (query.my && query.currentUser) {
      if (query.currentUser.role === UserRole.TECHNICIAN) {
        qb.andWhere('ticket.assignedToId = :me', { me: query.currentUser.id });
      } else {
        qb.andWhere('ticket.createdById = :me', { me: query.currentUser.id });
      }
    }

    if (query.search) {
      qb.andWhere(
        '(LOWER(ticket.title) LIKE LOWER(:search) OR LOWER(ticket.description) LIKE LOWER(:search) OR LOWER(ticket.ticketNumber) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    return qb.getMany();
  }

  async findOne(id: string) {
    const ticket = await this.ticketRepo.findOne({
      where: [{ id }, { ticketNumber: id }],
      relations: ['category', 'createdBy', 'assignedTo', 'attachments'],
    });

    if (!ticket) {
      throw new NotFoundException(`Incident #${id} non trouvé`);
    }

    const comments = await this.commentRepo.find({
      where: { ticketId: ticket.id },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    return {
      ...ticket,
      comments,
    };
  }

  async create(
    user: User,
    data: {
      title: string;
      description: string;
      categoryId?: string;
      priority?: TicketPriority;
    },
  ) {
    const ticketNumber = await this.generateTicketNumber();
    const priority = data.priority || TicketPriority.MOYENNE;
    const slaDeadline = this.calculateSla(priority);

    let category: Category | null = null;
    if (data.categoryId) {
      category = await this.categoryRepo.findOne({ where: { id: data.categoryId } });
    }

    const ticket = this.ticketRepo.create({
      ticketNumber,
      title: data.title,
      description: data.description,
      status: TicketStatus.NOUVEAU,
      priority,
      category: category || undefined,
      createdBy: user,
      slaDeadline,
    });

    const savedTicket = await this.ticketRepo.save(ticket);

    // Initial log activity
    await this.commentRepo.save(
      this.commentRepo.create({
        ticket: savedTicket,
        author: user,
        type: CommentType.STATUS_CHANGE,
        content: `Incident créé avec le statut NOUVEAU et priorité ${priority}`,
        oldValue: '',
        newValue: TicketStatus.NOUVEAU,
      }),
    );

    return this.findOne(savedTicket.id);
  }

  async updateStatus(
    id: string,
    user: User,
    status: TicketStatus,
    resolutionNotes?: string,
  ) {
    const ticket = await this.findOne(id);
    const oldStatus = ticket.status;

    if (oldStatus === status) {
      return ticket;
    }

    ticket.status = status;

    if (status === TicketStatus.RESOLU) {
      ticket.resolvedAt = new Date();
      if (resolutionNotes) {
        ticket.resolutionNotes = resolutionNotes;
      }
    } else if (status === TicketStatus.FERME) {
      ticket.closedAt = new Date();
    }

    await this.ticketRepo.save(ticket);

    // Activity log
    await this.commentRepo.save(
      this.commentRepo.create({
        ticketId: ticket.id,
        author: user,
        type: CommentType.STATUS_CHANGE,
        content: `Statut mis à jour : ${oldStatus} → ${status}${
          resolutionNotes ? ` (Solution : ${resolutionNotes})` : ''
        }`,
        oldValue: oldStatus,
        newValue: status,
      }),
    );

    return this.findOne(ticket.id);
  }

  async assign(id: string, user: User, technicianId: string) {
    const ticket = await this.findOne(id);
    const technician = await this.userRepo.findOne({ where: { id: technicianId } });

    if (!technician) {
      throw new NotFoundException('Technicien introuvable');
    }

    const oldTechName = ticket.assignedTo
      ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
      : 'Non assigné';

    ticket.assignedTo = technician;
    if (ticket.status === TicketStatus.NOUVEAU) {
      ticket.status = TicketStatus.EN_COURS;
    }

    await this.ticketRepo.save(ticket);

    const newTechName = `${technician.firstName} ${technician.lastName}`;
    await this.commentRepo.save(
      this.commentRepo.create({
        ticketId: ticket.id,
        author: user,
        type: CommentType.ASSIGNMENT,
        content: `Ticket assigné à ${newTechName} (précédemment : ${oldTechName})`,
        oldValue: oldTechName,
        newValue: newTechName,
      }),
    );

    return this.findOne(ticket.id);
  }

  async updatePriority(id: string, user: User, priority: TicketPriority) {
    const ticket = await this.findOne(id);
    const oldPriority = ticket.priority;

    ticket.priority = priority;
    ticket.slaDeadline = this.calculateSla(priority);

    await this.ticketRepo.save(ticket);

    await this.commentRepo.save(
      this.commentRepo.create({
        ticketId: ticket.id,
        author: user,
        type: CommentType.PRIORITY_CHANGE,
        content: `Priorité modifiée : ${oldPriority} → ${priority}`,
        oldValue: oldPriority,
        newValue: priority,
      }),
    );

    return this.findOne(ticket.id);
  }

  async addComment(
    id: string,
    user: User,
    data: { content: string; isTechnicalNote?: boolean },
  ) {
    const ticket = await this.findOne(id);

    const comment = this.commentRepo.create({
      ticketId: ticket.id,
      author: user,
      type: data.isTechnicalNote ? CommentType.TECHNICAL_NOTE : CommentType.COMMENT,
      content: data.content,
    });

    await this.commentRepo.save(comment);

    return this.findOne(ticket.id);
  }

  async addAttachment(
    id: string,
    file: {
      originalname: string;
      filename: string;
      size: number;
      mimetype: string;
      path: string;
      s3Key?: string;
    },
  ) {
    const ticket = await this.findOne(id);

    const fileUrl = file.s3Key
      ? `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${file.s3Key}`
      : `/uploads/${file.filename}`;

    const attachment = this.attachmentRepo.create({
      ticketId: ticket.id,
      fileName: file.originalname,
      fileUrl,
      fileSize: file.size,
      mimeType: file.mimetype,
      s3Key: file.s3Key,
    });

    await this.attachmentRepo.save(attachment);

    return this.findOne(ticket.id);
  }
}
