import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchPlacesDto {
  @ApiPropertyOptional({ example: '杭州' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '西湖' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['attraction', 'restaurant', 'hotel', 'station', 'shopping'] })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;
}
