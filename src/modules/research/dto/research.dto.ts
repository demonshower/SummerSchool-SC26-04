import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class WebSearchDto {
  @ApiProperty({ example: '杭州 三日游 攻略' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  query: string;

  @ApiPropertyOptional({ example: 'oneYear' })
  @IsOptional()
  @IsString()
  freshness?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  summary?: boolean;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  count?: number;

  @ApiPropertyOptional({ example: 'xiaohongshu.com', description: '站点限定' })
  @IsOptional()
  @IsString()
  site?: string;
}

export class TripResearchDto {
  @ApiPropertyOptional({ description: '自定义检索词；不传则按行程自动生成' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  queries?: string[];

  @ApiPropertyOptional({ default: 5, description: '每组检索返回条数' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(15)
  countPerQuery?: number;

  @ApiPropertyOptional({ default: true, description: '是否用 LLM 从摘要抽取地点/建议' })
  @IsOptional()
  @IsBoolean()
  extractInsights?: boolean;

  @ApiPropertyOptional({ default: true, description: '是否持久化为 ContentSource' })
  @IsOptional()
  @IsBoolean()
  persist?: boolean;

  @ApiPropertyOptional({ default: 'oneYear' })
  @IsOptional()
  @IsString()
  freshness?: string;

  @ApiPropertyOptional({ description: '最多使用几组检索词', default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  maxQueries?: number;
}
