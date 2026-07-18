import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'zh-CN' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;
}
