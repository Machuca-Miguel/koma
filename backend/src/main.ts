import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const session = require('express-session') as typeof import('express-session');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // Necesario para que passport-google-oauth20 almacene el state CSRF entre
  // el redirect a Google y el callback
  app.use(
    session({
      secret: process.env.JWT_SECRET ?? 'session-secret',
      resave: false,
      saveUninitialized: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Koma API')
    .setDescription('API para gestionar tu colección de cómics')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
