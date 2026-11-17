import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../database/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    delete user.password;
    return user;
  }

  async login(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
      },
    };
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    department?: string;
  }) {
    const existing = await this.userRepo.findOne({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const user = this.userRepo.create({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      department: data.department || 'Général',
      role: UserRole.USER,
    });

    const saved = await this.userRepo.save(user);
    return this.login(saved);
  }

  getDemoAccounts() {
    return [
      {
        role: 'ADMIN',
        title: 'Administrateur IT',
        email: 'admin@helpdesk.cloud',
        password: 'Admin123!',
        description: 'Gestion globale, catégories, affectation et statistiques',
      },
      {
        role: 'TECHNICIAN',
        title: 'Technicienne Support (Sarah)',
        email: 'sarah.tech@helpdesk.cloud',
        password: 'Tech123!',
        description: 'Traitement des incidents, notes techniques, résolution',
      },
      {
        role: 'USER',
        title: 'Utilisatrice (Manar)',
        email: 'manar.user@helpdesk.cloud',
        password: 'User123!',
        description: 'Création et suivi de tickets informatiques',
      },
    ];
  }
}
