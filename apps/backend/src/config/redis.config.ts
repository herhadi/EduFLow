import { ConfigService } from '@nestjs/config';

export function createRedisConnection(configService: ConfigService) {
  return {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
  };
}

