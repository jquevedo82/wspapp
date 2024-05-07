import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); /// quita error cors
  await app.listen(3000);
  console.log(3000);
  console.log(`listening on port ${await app.getUrl()}`);
}
bootstrap();
