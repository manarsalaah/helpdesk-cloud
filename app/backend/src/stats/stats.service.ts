import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus, TicketPriority } from '../database/entities/ticket.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { Category } from '../database/entities/category.entity';
import { Comment } from '../database/entities/comment.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
  ) {}

  async getDashboardStats() {
    const totalTickets = await this.ticketRepo.count();

    const statusCounts: Record<string, number> = {
      [TicketStatus.NOUVEAU]: 0,
      [TicketStatus.EN_COURS]: 0,
      [TicketStatus.EN_ATTENTE]: 0,
      [TicketStatus.RESOLU]: 0,
      [TicketStatus.FERME]: 0,
    };

    const priorityCounts: Record<string, number> = {
      [TicketPriority.URGENTE]: 0,
      [TicketPriority.HAUTE]: 0,
      [TicketPriority.MOYENNE]: 0,
      [TicketPriority.BASSE]: 0,
    };

    const tickets = await this.ticketRepo.find({
      relations: ['category', 'assignedTo', 'createdBy'],
    });

    let slaBreachedCount = 0;
    const now = new Date();

    tickets.forEach((t) => {
      if (statusCounts[t.status] !== undefined) {
        statusCounts[t.status]++;
      }
      if (priorityCounts[t.priority] !== undefined) {
        priorityCounts[t.priority]++;
      }
      if (
        t.status !== TicketStatus.RESOLU &&
        t.status !== TicketStatus.FERME &&
        t.slaDeadline &&
        new Date(t.slaDeadline) < now
      ) {
        slaBreachedCount++;
      }
    });

    // Category distribution
    const categories = await this.categoryRepo.find();
    const categoryDistribution = categories.map((cat) => {
      const count = tickets.filter((t) => t.category?.id === cat.id).length;
      return {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        count,
      };
    });

    // Technicians workload
    const technicians = await this.userRepo.find({
      where: { role: UserRole.TECHNICIAN },
    });

    const technicianWorkload = technicians.map((tech) => {
      const activeTickets = tickets.filter(
        (t) =>
          t.assignedTo?.id === tech.id &&
          t.status !== TicketStatus.RESOLU &&
          t.status !== TicketStatus.FERME,
      ).length;
      const resolvedTickets = tickets.filter(
        (t) =>
          t.assignedTo?.id === tech.id &&
          (t.status === TicketStatus.RESOLU || t.status === TicketStatus.FERME),
      ).length;
      return {
        id: tech.id,
        name: `${tech.firstName} ${tech.lastName}`,
        email: tech.email,
        activeTickets,
        resolvedTickets,
      };
    });

    // Recent activities
    const recentActivities = await this.commentRepo.find({
      relations: ['author', 'ticket'],
      order: { createdAt: 'DESC' },
      take: 6,
    });

    return {
      kpi: {
        totalTickets,
        newTickets: statusCounts[TicketStatus.NOUVEAU],
        inProgressTickets: statusCounts[TicketStatus.EN_COURS],
        pendingTickets: statusCounts[TicketStatus.EN_ATTENTE],
        resolvedTickets: statusCounts[TicketStatus.RESOLU] + statusCounts[TicketStatus.FERME],
        slaBreachedCount,
      },
      statusDistribution: statusCounts,
      priorityDistribution: priorityCounts,
      categoryDistribution,
      technicianWorkload,
      recentActivities: recentActivities.map((a) => ({
        id: a.id,
        type: a.type,
        content: a.content,
        ticketNumber: a.ticket?.ticketNumber,
        ticketTitle: a.ticket?.title,
        ticketId: a.ticket?.id,
        authorName: a.author ? `${a.author.firstName} ${a.author.lastName}` : 'Système',
        authorRole: a.author?.role || 'SYSTEM',
        createdAt: a.createdAt,
      })),
    };
  }
}
