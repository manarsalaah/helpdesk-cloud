import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserRole } from '../database/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll() {
    return this.userRepo.find({
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'department', 'isActive', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  async findTechnicians() {
    return this.userRepo.find({
      where: {
        role: In([UserRole.TECHNICIAN, UserRole.ADMIN]),
        isActive: true,
      },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'department'],
      order: { firstName: 'ASC' },
    });
  }

  async findById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'department', 'isActive', 'createdAt'],
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return user;
  }

  async updateRole(id: string, role: UserRole) {
    const user = await this.findById(id);
    user.role = role;
    return this.userRepo.save(user);
  }

  async toggleActive(id: string) {
    const user = await this.findById(id);
    user.isActive = !user.isActive;
    return this.userRepo.save(user);
  }
}
