import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty()
  @IsUUID()
  roomId: string;

  @ApiProperty()
  @IsUUID()
  userId: string;
}