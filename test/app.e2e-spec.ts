import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: NestExpressApplication;
  let moduleFixture: TestingModule;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.setBaseViewsDir('views');
    app.setViewEngine('ejs');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  it('/archives (GET)', () => {
    return request(app.getHttpServer()).get('/archives').expect(200);
  });

  it('/score (POST) - redirect', async () => {
    // Ensure there is an active seed in the DB before posting a score
    const seedRepo = moduleFixture.get('WeeklySeedRepository');
    await seedRepo.save({
      seedUrl: 'http://test-seed.com',
      preset: 'test-preset',
      version: '1.0',
      settings: '{}',
      isActive: true,
    });

    return request(app.getHttpServer())
      .post('/score')
      .send({ playerName: 'E2E Player', time: '1:00:00' })
      .expect(302)
      .expect('Location', '/');
  });

  it('/admin/generate-seed (POST) - redirect', () => {
    return request(app.getHttpServer())
      .post('/admin/generate-seed')
      .expect(302)
      .expect('Location', '/');
  });
});
