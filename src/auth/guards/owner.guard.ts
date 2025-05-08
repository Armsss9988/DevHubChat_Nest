import { PrismaService } from '@/src/prisma/prisma.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_OWNER_KEY, IsOwnerOptions } from '../decorator/is-owner.decorator';

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService, 
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<IsOwnerOptions>(
      IS_OWNER_KEY,
      context.getHandler(),
    );
    if (!options) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const itemId = request.params[options.idParam];

    const repo = (this.prisma[options.model] ?? null) as {
      findUnique: Function;
    };

    if (!repo) {
      throw new InternalServerErrorException(
        `Model ${options.model} not found in Prisma`,
      );
    }

    const item = await repo.findUnique({
      where: { id: itemId },
    });

    if (!item || item[options.ownerField] !== user.id) {
      throw new ForbiddenException('Permission denied');
    }

    return true;
  }
}
