import { Injectable } from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'crypto';
import { compare } from 'bcryptjs';

@Injectable()
export class AdminService {
  private sessionToken: string | null = null;

  async validatePassword(password: string): Promise<boolean> {
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash || !password) return false;
    return compare(password, hash);
  }

  createSession(): string {
    this.sessionToken = randomBytes(32).toString('hex');
    return this.sessionToken;
  }

  validateSession(token: string): boolean {
    if (!this.sessionToken || !token) return false;
    try {
      const a = Buffer.from(token);
      const b = Buffer.from(this.sessionToken);
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  invalidateSession(): void {
    this.sessionToken = null;
  }
}
