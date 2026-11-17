import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { Comment } from './comment.entity';
import { Attachment } from './attachment.entity';

export enum TicketStatus {
  NOUVEAU = 'NOUVEAU',
  EN_COURS = 'EN_COURS',
  EN_ATTENTE = 'EN_ATTENTE',
  RESOLU = 'RESOLU',
  FERME = 'FERME',
}

export enum TicketPriority {
  BASSE = 'BASSE',
  MOYENNE = 'MOYENNE',
  HAUTE = 'HAUTE',
  URGENTE = 'URGENTE',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  ticketNumber: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'varchar',
    default: TicketStatus.NOUVEAU,
  })
  status: TicketStatus;

  @Column({
    type: 'varchar',
    default: TicketPriority.MOYENNE,
  })
  priority: TicketPriority;

  @ManyToOne(() => Category, (category) => category.tickets, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => User, (user) => user.createdTickets, { eager: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  createdById: string;

  @ManyToOne(() => User, (user) => user.assignedTickets, { eager: true, nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  @Column({ nullable: true })
  assignedToId: string;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string;

  @Column({ nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  closedAt: Date;

  @Column({ nullable: true })
  slaDeadline: Date;

  @OneToMany(() => Comment, (comment) => comment.ticket, { cascade: true })
  comments: Comment[];

  @OneToMany(() => Attachment, (attachment) => attachment.ticket, { cascade: true })
  attachments: Attachment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
