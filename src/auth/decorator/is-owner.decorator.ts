import { SetMetadata } from '@nestjs/common';

export const IS_OWNER_KEY = 'isOwnerMeta';

export interface IsOwnerOptions {
  model: string; // Prisma model name: 'room', 'post', etc.
  idParam: string; // param chứa id, ví dụ: 'id' hoặc 'roomId'
  ownerField: string; // field chứa owner id: 'creatorId', 'userId'
}

export const IsOwner = (options: IsOwnerOptions) => SetMetadata(IS_OWNER_KEY, options);
