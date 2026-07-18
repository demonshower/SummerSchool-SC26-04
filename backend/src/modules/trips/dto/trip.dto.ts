import {
  IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsDateString, IsArray,
  ValidateNested, Min, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMeetingDto {
  @ApiProperty({ example: '项目研讨会' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: '2026-08-11' })
  @IsDateString()
  meetingDate: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ example: '杭州市西湖区' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  location: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class CreateTripDto {
  @ApiProperty({ example: '上海' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  originCity: string;

  @ApiProperty({ example: '杭州' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  destinationCity: string;

  @ApiProperty({ example: '2026-08-10' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-08-12' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: '2026-08-10T13:00:00+08:00' })
  @IsDateString()
  earliestDeparture: string;

  @ApiProperty({ example: '2026-08-12T21:00:00+08:00' })
  @IsDateString()
  latestReturn: string;

  @ApiProperty({ example: 200000, description: '预算（分），200000 = ¥2000' })
  @IsNumber()
  @Min(0)
  budgetMinor: number;

  @ApiPropertyOptional({ example: 'train', enum: ['any', 'flight', 'train'] })
  @IsOptional()
  @IsString()
  transportPreference?: string;

  @ApiProperty({ example: 40000, description: '酒店最高价/晚（分）' })
  @IsNumber()
  @Min(0)
  hotelMaxPriceMinor: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  wantsSightseeing?: boolean;

  @ApiPropertyOptional({ example: '自然', enum: ['any', '自然', '人文', '商业', '美食'] })
  @IsOptional()
  @IsString()
  attractionPreference?: string;

  @ApiPropertyOptional({ example: 'balanced', enum: ['relaxed', 'balanced', 'intense'] })
  @IsOptional()
  @IsString()
  pace?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ type: [CreateMeetingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMeetingDto)
  meetings?: CreateMeetingDto[];
}

export class UpdateTripDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMinor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transportPreference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  hotelMaxPriceMinor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  wantsSightseeing?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attractionPreference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pace?: string;

  @ApiPropertyOptional({ description: '乐观锁版本号' })
  @IsOptional()
  @IsNumber()
  version?: number;
}

export class TripQueryDto {
  @ApiPropertyOptional({ enum: ['draft', 'planning', 'ready', 'confirmed', 'archived'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pageSize?: number = 20;
}
