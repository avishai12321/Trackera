import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

let appPromise: Promise<any>;

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bodyParser: true,
        rawBody: false,
    });

    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.enableCors({
        origin: ['http://localhost:3000', 'http://localhost:3001', 'https://trackera-api.vercel.app/', /https:\/\/.*\.vercel\.app/],
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'x-tenant-id', 'X-Requested-With'],
        exposedHeaders: ['Content-Disposition'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });

    await app.init();
    return app.getHttpAdapter().getInstance();
}

export default async function handler(req: any, res: any) {
    if (!appPromise) {
        appPromise = bootstrap();
    }
    const app = await appPromise;
    app(req, res);
}
