import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AdminService } from './admin.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly adminService: AdminService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return false;
    return this.adminService.validateSession(authHeader.slice(7));
  }
}
