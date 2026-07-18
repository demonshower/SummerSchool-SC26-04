import { IsOptional, IsString, IsArray, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiPropertyOptional({ enum: ['budget', 'balanced', 'comfort'], default: 'balanced' })
  @IsOptional()
  @IsString()
  strategy?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  useTravelProfile?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  lockedItemIds?: string[];
}
