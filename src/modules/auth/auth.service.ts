import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException, ErrorCode } from '../../common';
import { RegisterDto, LoginDto, GuestLoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 用户注册
   */
  async register(dto: RegisterDto) {
    // 检查用户名是否已存在
    const existing = await this.prisma.user.findFirst({
      where: { username: dto.username, deletedAt: null },
    });
    if (existing) {
      throw new BusinessException(
        ErrorCode.USER_ALREADY_EXISTS,
        `用户名 '${dto.username}' 已存在`,
        undefined,
        409,
      );
    }

    // 检查邮箱
    if (dto.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { email: dto.email, deletedAt: null },
      });
      if (existingEmail) {
        throw new BusinessException(
          ErrorCode.USER_ALREADY_EXISTS,
          `邮箱 '${dto.email}' 已被注册`,
          undefined,
          409,
        );
      }
    }

    // 创建用户
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        isGuest: false,
      },
    });

    const token = this.generateToken(user.id, user.isGuest);
    return {
      user: this.sanitizeUser(user),
      accessToken: token,
    };
  }

  /**
   * 用户登录
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { username: dto.username, deletedAt: null },
    });
    if (!user) {
      throw new BusinessException(
        ErrorCode.INVALID_CREDENTIALS,
        '用户名或密码错误',
        undefined,
        401,
      );
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new BusinessException(
        ErrorCode.INVALID_CREDENTIALS,
        '用户名或密码错误',
        undefined,
        401,
      );
    }

    const token = this.generateToken(user.id, user.isGuest);
    return {
      user: this.sanitizeUser(user),
      accessToken: token,
    };
  }

  /**
   * 游客登录
   */
  async guestLogin(dto?: GuestLoginDto) {
    const username = dto?.username || `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);

    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash,
        isGuest: true,
      },
    });

    const token = this.generateToken(user.id, user.isGuest);
    return {
      user: this.sanitizeUser(user),
      accessToken: token,
    };
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.deletedAt) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '用户不存在', undefined, 404);
    }
    return this.sanitizeUser(user);
  }

  /**
   * 验证 JWT payload
   */
  async validateUser(payload: { sub: string; isGuest: boolean }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.deletedAt) {
      return null;
    }
    return { id: user.id, isGuest: user.isGuest };
  }

  /**
   * 生成 JWT Token
   */
  private generateToken(userId: string, isGuest: boolean): string {
    return this.jwtService.sign({
      sub: userId,
      isGuest,
    });
  }

  /**
   * 移除敏感字段
   */
  private sanitizeUser(user: any) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
