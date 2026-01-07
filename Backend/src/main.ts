import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from 'common/interceptor/http-exception.interceptor';
import { ResponseInterceptor } from 'common/interceptor/response.interceptor';
import { AuthGuard } from 'common/guard/auth.guard';
import { RolesGuard } from 'common/guard/role.guard';
import { RedisAdapterService } from './redis-adapter/redis-adapter.service';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { LogInterceptor } from 'common/interceptor/log.interceptor';
import { ActivityLogModule } from './activity-log/activity-log.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
  });
  app.useGlobalGuards(app.get(AuthGuard), app.get(RolesGuard));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    app.get(ResponseInterceptor),
    app.get(LogInterceptor),
  );
  
  const config = new DocumentBuilder()
    .setTitle('ExBuySell - Api Documentation')
    .setDescription('')
    .setVersion('1.0')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory, {
  jsonDocumentUrl: 'swagger/json',
  
});

//config: RabbitMQ Microservices (Optional - only start if RABBIT_MQ is configured)
if (process.env.RABBIT_MQ) {
  try {
    // Build connection string with credentials if provided
    let rabbitMqUrl = process.env.RABBIT_MQ;
    const rabbitMqUser = process.env.RABBIT_MQ_USER || 'admin';
    const rabbitMqPass = process.env.RABBIT_MQ_PASS || 'admin';
    
    // If RABBIT_MQ doesn't already contain @ (credentials), add them
    if (!rabbitMqUrl.includes('@')) {
      rabbitMqUrl = `${rabbitMqUser}:${rabbitMqPass}@${rabbitMqUrl}`;
    }
    
    const connectionUrl = `amqp://${rabbitMqUrl}`;
    console.log(`🔌 Connecting to RabbitMQ: amqp://${rabbitMqUser}:***@${process.env.RABBIT_MQ}`);
    
    const logQueue = await NestFactory.createMicroservice<MicroserviceOptions>(
      ActivityLogModule,
      {
        transport: Transport.RMQ,
        options: {
          urls: [connectionUrl],
          queue: 'append_only_log',
          queueOptions: {
            durable: true,
          },
        },
      },
    );
    await logQueue.listen();
    console.log('✅ RabbitMQ microservice connected successfully');
  } catch (error) {
    console.warn('⚠️  RabbitMQ connection failed. Activity logging will be disabled.');
    console.warn('   To enable: Start RabbitMQ server or set RABBIT_MQ environment variable');
    console.warn('   Error:', error instanceof Error ? error.message : error);
  }
} else {
  console.log('ℹ️  RabbitMQ not configured. Activity logging microservice skipped.');
  console.log('   To enable: Set RABBIT_MQ environment variable (e.g., localhost:5672)');
}

  // //config: Redis
  // const redisIoAdapter = app.get(RedisAdapterService);
  // await redisIoAdapter.connectToRedis();
  // app.useWebSocketAdapter(redisIoAdapter);

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📡 WebSocket Gateway is available at: ws://localhost:${port}`);
}
bootstrap();
