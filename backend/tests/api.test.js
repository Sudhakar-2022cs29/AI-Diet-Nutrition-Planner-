// Automated integration test suite using Vitest and Supertest
import { describe, it, expect } from 'vitest';
const request = require('supertest');
const app = require('../server');

describe('AI Diet & Nutrition Platform API Tests', () => {
  it('GET / should return healthy status and OpenAPI documentation path', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.documentation).toBe('/api/docs');
  });

  it('GET /non-existent-route should return 404 fail response', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('fail');
  });

  it('POST /api/auth/signup should reject invalid email format with 400', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'John Doe',
        email: 'invalid-email-format',
        password: 'password123'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' })
      ])
    );
  });

  it('POST /api/auth/signup should reject short password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'John Doe',
        email: 'valid@example.com',
        password: '123'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('POST /api/food/detect without auth token should return 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/food/detect')
      .send({ foodName: 'pizza' });

    expect(res.statusCode).toBe(401);
  });

  it('POST /api/auth/signup should accept stringified numbers for weight, height, age and coerce them', async () => {
    const uniqueEmail = `test_${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Test Coercion',
        email: uniqueEmail,
        password: 'password123',
        weight: '75',
        height: '180',
        age: '28'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.weight).toBe(75);
    expect(res.body.height).toBe(180);
    expect(res.body.age).toBe(28);
  });

  it('POST /api/auth/signup should handle empty string numeric inputs gracefully with defaults', async () => {
    const uniqueEmail = `empty_test_${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Empty Field Tester',
        email: uniqueEmail,
        password: 'password123',
        weight: '',
        height: '',
        age: ''
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.weight).toBe(70);
    expect(res.body.height).toBe(170);
    expect(res.body.age).toBe(25);
  });
});

