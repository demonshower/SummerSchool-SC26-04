import { IsString, IsOptional, IsEmail, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'zhangsan' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ example: 'zhangsan@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'zhangsan' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}

export class GuestLoginDto {
  @ApiPropertyOptional({ example: 'guest_abc123' })
  @IsOptional()
  @IsString()
  username?: string;
}

export class MergeGuestDto {
  @ApiProperty({ description: '游客 token' })
  @IsString()
  guestToken: string;

  @ApiProperty({ description: '注册账号的用户名' })
  @IsString()
  username: string;

  @ApiProperty({ description: '注册账号的密码' })
  @IsString()
  password: string;
}
