import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { Ticket, TicketStatus, TicketPriority } from '../entities/ticket.entity';
import { Comment, CommentType } from '../entities/comment.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
  ) {}

  async onApplicationBootstrap() {
    await this.seed();
  }

  async seed() {
    const userCount = await this.userRepo.count();
    if (userCount > 0) {
      this.logger.log('Database already initialized. Skipping seed.');
      return;
    }

    this.logger.log('🌱 Seeding initial HelpDesk Cloud data...');

    const salt = await bcrypt.genSalt(10);
    const hash = async (pwd: string) => bcrypt.hash(pwd, salt);

    // 1. Create Users
    const admin = await this.userRepo.save(
      this.userRepo.create({
        email: 'admin@helpdesk.cloud',
        password: await hash('Admin123!'),
        firstName: 'Admin',
        lastName: 'Système',
        role: UserRole.ADMIN,
        department: 'Direction IT & Sécurité',
      }),
    );

    const tech1 = await this.userRepo.save(
      this.userRepo.create({
        email: 'sarah.tech@helpdesk.cloud',
        password: await hash('Tech123!'),
        firstName: 'Sarah',
        lastName: 'Ben Salem',
        role: UserRole.TECHNICIAN,
        department: 'Support IT Niveau 2',
      }),
    );

    const tech2 = await this.userRepo.save(
      this.userRepo.create({
        email: 'karim.tech@helpdesk.cloud',
        password: await hash('Tech123!'),
        firstName: 'Karim',
        lastName: 'Gharbi',
        role: UserRole.TECHNICIAN,
        department: 'Infrastructure & Réseaux',
      }),
    );

    const user1 = await this.userRepo.save(
      this.userRepo.create({
        email: 'manar.user@helpdesk.cloud',
        password: await hash('User123!'),
        firstName: 'Manar',
        lastName: 'Salah',
        role: UserRole.USER,
        department: 'Ingénierie & Développement',
      }),
    );

    const user2 = await this.userRepo.save(
      this.userRepo.create({
        email: 'alice.user@helpdesk.cloud',
        password: await hash('User123!'),
        firstName: 'Alice',
        lastName: 'Martin',
        role: UserRole.USER,
        department: 'Finance & Comptabilité',
      }),
    );

    // 2. Create Categories
    const catReseau = await this.categoryRepo.save(
      this.categoryRepo.create({
        name: 'Réseau & Wi-Fi',
        description: "Problèmes de connexion Internet, VPN, coupure Wi-Fi et routage",
        color: '#2563EB',
        icon: 'Wifi',
      }),
    );

    const catMateriel = await this.categoryRepo.save(
      this.categoryRepo.create({
        name: 'Matériel & Postes',
        description: "Pannes PC portable, écran noir, clavier défectueux, imprimantes",
        color: '#DC2626',
        icon: 'Monitor',
      }),
    );

    const catLogiciel = await this.categoryRepo.save(
      this.categoryRepo.create({
        name: 'Logiciels & Suites',
        description: "Microsoft 365, Teams, Slack, suites bureautiques et licences",
        color: '#059669',
        icon: 'Laptop',
      }),
    );

    const catSecurite = await this.categoryRepo.save(
      this.categoryRepo.create({
        name: 'Sécurité & Accès',
        description: "Réinitialisation de mot de passe, badges d'accès, permissions",
        color: '#D97706',
        icon: 'ShieldAlert',
      }),
    );

    const catCloud = await this.categoryRepo.save(
      this.categoryRepo.create({
        name: 'Cloud & Infrastructure AWS',
        description: "Accès AWS Academy, RDS, S3, clés d'API et instances EC2",
        color: '#7C3AED',
        icon: 'Cloud',
      }),
    );

    // 3. Create Sample Tickets
    const now = new Date();

    // Ticket 1: En cours
    const ticket1 = await this.ticketRepo.save(
      this.ticketRepo.create({
        ticketNumber: 'TICK-1001',
        title: 'Connexion VPN entreprise impossible en télétravail',
        description: "Depuis ce matin, le client VPN renvoie une erreur 'Certificat d'authentification invalide' lors de la tentative de connexion aux serveurs internes.",
        status: TicketStatus.EN_COURS,
        priority: TicketPriority.HAUTE,
        category: catReseau,
        createdBy: user1,
        assignedTo: tech1,
        slaDeadline: new Date(now.getTime() + 24 * 3600 * 1000), // 24h
        createdAt: new Date(now.getTime() - 4 * 3600 * 1000),
      }),
    );

    await this.commentRepo.save([
      this.commentRepo.create({
        ticket: ticket1,
        author: tech1,
        type: CommentType.STATUS_CHANGE,
        content: "Statut mis à jour : NOUVEAU → EN_COURS",
        oldValue: 'NOUVEAU',
        newValue: 'EN_COURS',
      }),
      this.commentRepo.create({
        ticket: ticket1,
        author: tech1,
        type: CommentType.COMMENT,
        content: "Bonjour Manar, j'ai régénéré votre profil OpenVPN. Pouvez-vous tester à nouveau après avoir retéléchargé le profil dans votre client ?",
      }),
    ]);

    // Ticket 2: Nouveau & Urgent
    await this.ticketRepo.save(
      this.ticketRepo.create({
        ticketNumber: 'TICK-1002',
        title: 'Écran noir et bips continus au démarrage du poste Dell',
        description: "Lors de la mise sous tension de la tour au bureau 204, l'écran reste noir et l'unité centrale émet 3 bips successifs. Impossible d'accéder au BIOS.",
        status: TicketStatus.NOUVEAU,
        priority: TicketPriority.URGENTE,
        category: catMateriel,
        createdBy: user2,
        slaDeadline: new Date(now.getTime() + 4 * 3600 * 1000), // 4h
        createdAt: new Date(now.getTime() - 1 * 3600 * 1000),
      }),
    );

    // Ticket 3: Résolu
    const ticket3 = await this.ticketRepo.save(
      this.ticketRepo.create({
        ticketNumber: 'TICK-1003',
        title: "Demande d'accès au bucket S3 helpdesk-attachments",
        description: "Besoin de permissions en lecture/écriture sur le bucket S3 pour les tests d'upload des pièces jointes du livrable L3.",
        status: TicketStatus.RESOLU,
        priority: TicketPriority.MOYENNE,
        category: catCloud,
        createdBy: user1,
        assignedTo: tech2,
        resolutionNotes: "Politique IAM attachée au profil LabInstanceProfile avec actions s3:PutObject et s3:GetObject.",
        resolvedAt: new Date(now.getTime() - 2 * 3600 * 1000),
        slaDeadline: new Date(now.getTime() + 48 * 3600 * 1000),
        createdAt: new Date(now.getTime() - 24 * 3600 * 1000),
      }),
    );

    await this.commentRepo.save([
      this.commentRepo.create({
        ticket: ticket3,
        author: tech2,
        type: CommentType.STATUS_CHANGE,
        content: "Statut mis à jour : EN_COURS → RESOLU",
        oldValue: 'EN_COURS',
        newValue: 'RESOLU',
      }),
      this.commentRepo.create({
        ticket: ticket3,
        author: tech2,
        type: CommentType.COMMENT,
        content: "Accès validé et testé avec succès sur us-east-1.",
      }),
    ]);

    // Ticket 4: En attente
    const ticket4 = await this.ticketRepo.save(
      this.ticketRepo.create({
        ticketNumber: 'TICK-1004',
        title: 'Mise à jour licence Microsoft 365 expirée',
        description: "Le message 'Votre licence Office expire bientôt' s'affiche sur Word et Excel.",
        status: TicketStatus.EN_ATTENTE,
        priority: TicketPriority.BASSE,
        category: catLogiciel,
        createdBy: user2,
        assignedTo: tech1,
        slaDeadline: new Date(now.getTime() + 72 * 3600 * 1000),
        createdAt: new Date(now.getTime() - 12 * 3600 * 1000),
      }),
    );

    await this.commentRepo.save(
      this.commentRepo.create({
        ticket: ticket4,
        author: tech1,
        type: CommentType.COMMENT,
        content: "Demande de renouvellement envoyée au responsable des achats. En attente du bon de commande.",
      }),
    );

    this.logger.log('✅ Seed completed successfully! 5 Users, 5 Categories, 4 Tickets created.');
  }
}
