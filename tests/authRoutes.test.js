process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { ObjectId } from 'mongodb';


const mockPassport = {
  authenticate: () => (req, res, next) => next(),
  use: jest.fn(),
  serializeUser: jest.fn(),
  deserializeUser: jest.fn()
};

jest.unstable_mockModule('passport', () => ({
  default: mockPassport
}));


jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockResolvedValue('hashedPassword'),
    compare: jest.fn().mockResolvedValue(true)
  }
}));


jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn().mockReturnValue('test-token')
  }
}));


const usersCollectionMock = {
  findOne: jest.fn(),
  insertOne: jest.fn(),
  updateOne: jest.fn()
};

const profilesCollectionMock = {
  insertOne: jest.fn(),
  updateOne: jest.fn()
};

const mockDb = {
  collection: jest.fn((name) => {
    if (name === 'users') return usersCollectionMock;
    if (name === 'profiles') return profilesCollectionMock;
    return {};
  })
};

const mockClient = {
  startSession: jest.fn().mockReturnValue({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn()
  })
};

jest.unstable_mockModule('../backend/db.js', () => ({
  getDb: jest.fn().mockResolvedValue({
    db: mockDb,
    client: mockClient
  })
}));


const { default: authRouter } = await import('../backend/routes/authRoutes.js');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

beforeEach(() => {
  jest.clearAllMocks();

  usersCollectionMock.findOne.mockResolvedValue(null);
  usersCollectionMock.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
  usersCollectionMock.updateOne.mockResolvedValue({});

  profilesCollectionMock.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
  profilesCollectionMock.updateOne.mockResolvedValue({});
});

describe('Standard Authentication', () => {
  describe('POST /register', () => {
    test('should register user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          accountType: 'client'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe('test-token');
    });

    test('should reject registration with missing data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /login', () => {
    test('should login with valid credentials', async () => {
      usersCollectionMock.findOne.mockResolvedValueOnce({
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        email: 'test@example.com',
        password: 'hashedPassword',
        accountType: 'client'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('test-token');
      expect(response.body.success).toBe(true);
    });

    test('should reject login with invalid credentials', async () => {
      usersCollectionMock.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpass'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
