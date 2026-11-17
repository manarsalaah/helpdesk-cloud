import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('HelpDeskBootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for Next.js frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Global prefix for API endpoints
  app.setGlobalPrefix('api');

  // Support /health directly without prefix for ALB target groups
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/health', (req, res) => {
    res.redirect('/api/health');
  });

  // Serve static files for uploaded attachments
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 HelpDesk Cloud Backend running on http://localhost:${port}/api`);
  logger.log(`🩺 Health check available on http://localhost:${port}/health`);
}
bootstrap();
