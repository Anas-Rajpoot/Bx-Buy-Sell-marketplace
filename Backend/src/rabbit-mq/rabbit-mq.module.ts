import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitMqService } from './rabbit-mq.service';

@Module({})
export class RabbitMqModule {
  static forRoot(): DynamicModule {
    // Build connection string with credentials if provided
    let rabbitMqUrl = process.env.RABBIT_MQ;
    const rabbitMqUser = process.env.RABBIT_MQ_USER || 'admin';
    const rabbitMqPass = process.env.RABBIT_MQ_PASS || 'admin';
    
    // If RABBIT_MQ is not set, return empty module
    if (!rabbitMqUrl) {
      return {
        module: RabbitMqModule,
        imports: [],
        exports: [],
        providers: [],
      };
    }
    
    // If RABBIT_MQ doesn't already contain @ (credentials), add them
    if (!rabbitMqUrl.includes('@')) {
      rabbitMqUrl = `${rabbitMqUser}:${rabbitMqPass}@${rabbitMqUrl}`;
    }
    
    const connectionUrl = `amqp://${rabbitMqUrl}`;
    console.log(`🔌 RabbitMQ connection URL: amqp://${rabbitMqUser}:***@${process.env.RABBIT_MQ}`);
    
    return {
      module: RabbitMqModule,
      imports: [
        ClientsModule.register([
          {
            name: 'LOG_SERVICE',
            transport: Transport.RMQ,
            options: {
              urls: [connectionUrl],
              queue: 'append_only_log',
              queueOptions: { durable: true },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
      providers: [],
    };
  }
}
