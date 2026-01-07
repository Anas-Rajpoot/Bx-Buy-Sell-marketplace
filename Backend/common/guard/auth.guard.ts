import {
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core/services';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from 'common/decorator/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // 💡 See this condition
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      console.error('❌ AuthGuard: No token found in Authorization header');
      throw new UnauthorizedException('No token provided');
    }
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ AuthGuard: JWT_SECRET is not set in environment variables');
      throw new UnauthorizedException('Server configuration error');
    }
    
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
      });
      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      request['user'] = payload;
      console.log('✅ AuthGuard: Token verified successfully', {
        userId: payload.id,
        email: payload.email,
        role: payload.role
      });
    } catch (error: any) {
      console.error('❌ AuthGuard: Token verification failed', {
        error: error.message,
        errorName: error.name,
        tokenPreview: token.substring(0, 50) + '...',
        jwtSecretSet: !!jwtSecret,
        jwtSecretLength: jwtSecret?.length
      });
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] =
      (request.headers as any).authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
