import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsArray, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchQuotesDto {
  @ApiProperty({ enum: ['flight', 'train', 'hotel', 'ticket'] })
  @IsEnum(['flight', 'train', 'hotel', 'ticket'])
  productType: string;

  @ApiProperty({ description: '搜索条件 JSON' })
  @IsObject()
  criteria: Record<string, any>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  providerCodes?: string[];
}

export class QuoteQueryDto {
  @ApiPropertyOptional({ enum: ['flight', 'train', 'hotel', 'ticket'] })
  @IsOptional()
  @IsString()
  productType?: string;
}
