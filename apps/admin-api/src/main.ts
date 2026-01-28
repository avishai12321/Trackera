import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS for local development
    app.enableCors({
        origin: ['http://localhost:3002', 'http://127.0.0.1:3002'],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });

    const port = process.env.ADMIN_API_PORT || 4000;
    await app.listen(port);
    console.log(`🚀 Admin API running on http://localhost:${port}`);
}
bootstrap();
