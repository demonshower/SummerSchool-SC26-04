import {
  IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsDateString, IsEnum,
  IsArray, ValidateNested, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ItemKind {
  transport = 'transport',
  commute = 'commute',
  hotel = 'hotel',
  meal = 'meal',
  attraction = 'attraction',
  meeting = 'meeting',
  fixed = 'fixed',
  free_time = 'free_time',
}

export class CreateItemDto {
  @ApiProperty({ description: '所属天 ID' })
  @IsString()
  @IsNotEmpty()
  dayId: string;

  @ApiProperty({ enum: ItemKind })
  @IsEnum(ItemKind)
  kind: ItemKind;

  @ApiProperty({ example: '西湖风景区' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  position?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationText?: string;

  @ApiPropertyOptional({ description: '费用（分）' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costMinor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFixed?: boolean;
}

export class UpdateItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costMinor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ description: '乐观锁版本号' })
  @IsOptional()
  @IsNumber()
  version?: number;
}

export class MoveItemDto {
  @ApiProperty({ description: '目标天 ID' })
  @IsString()
  @IsNotEmpty()
  toDayId: string;

  @ApiPropertyOptional({ description: '插入到哪个项目之前' })
  @IsOptional()
  @IsString()
  beforeItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  position?: number;

  @ApiProperty({ description: '当前版本号（乐观锁）' })
  @IsNumber()
  baseVersion: number;
}

export class LockItemDto {
  @ApiProperty()
  @IsBoolean()
  locked: boolean;
}

export class ReorderItemEntry {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsNumber()
  position: number;
}

export class ReorderItemsDto {
  @ApiProperty({ type: [ReorderItemEntry] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemEntry)
  items: ReorderItemEntry[];

  @ApiProperty({ description: '当前版本号' })
  @IsNumber()
  baseVersion: number;
}
