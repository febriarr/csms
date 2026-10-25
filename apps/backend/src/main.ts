import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bodyParser: false,
    });
    app.setGlobalPrefix('api');
    app.enableCors({
        origin: [process.env.WEB_URL!], // URL Vite
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        // lets the browser read thw file name of a report download
        exposedHeaders: ['Content-Disposition'],
    });
    app.enableShutdownHooks();
    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
