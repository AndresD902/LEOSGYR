import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void>{
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({
            logger: true,
        }),
    );

    app.setGlobalPrefix('api/v1');

    app.enableCors({
        origin: true,
        credentials: true,
    });

    const swaggerConfig = new DocumentBuilder()
        .setTitle('LEOSGYR API')
        .setDescription('REST API for the LEOSGYR livestock management system')
        .setVersion('0.1.0')
        .addBearerAuth()
        .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument);

    const port = Number(process.env['API_PORT'] ?? 3001);
    await app.listen(port, '0.0.0.0');
};

void bootstrap();
