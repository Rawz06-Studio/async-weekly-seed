import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: NestExpressApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as any);

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.setBaseViewsDir('views');
    app.setViewEngine('ejs');
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  it('/archives (GET)', () => {
    return request(app.getHttpServer()).get('/archives').expect(200);
  });

  it('/score (POST) - redirects on submission', () => {
    return request(app.getHttpServer())
      .post('/score')
      .send({ playerName: 'E2E Player', time: '1:00:00', leaderboardId: '1' })
      .expect(302);
  });

  it('/admin/generate-seed (POST) - redirect', () => {
    return request(app.getHttpServer())
      .post('/admin/generate-seed')
      .expect(302)
      .expect('Location', '/');
  });
});
