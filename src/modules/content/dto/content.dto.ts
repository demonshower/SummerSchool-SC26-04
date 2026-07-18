import { IsString, IsNotEmpty, IsOptional, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportTextDto {
  @ApiProperty({ description: '攻略文本内容' })
  @IsString()
  @IsNotEmpty()
  rawText: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tripId?: string;
}

export class ImportLinkDto {
  @ApiProperty({ example: 'https://www.xiaohongshu.com/explore/...' })
  @IsString()
  @IsNotEmpty()
  sourceUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tripId?: string;
}
