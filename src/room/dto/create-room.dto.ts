import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateRoomDto {
  @ApiProperty()
  @IsString()
  name: string;
}

  