import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { ObjectId } from 'mongodb';


jest.unstable_mockModule('../backend/middleware/auth.js', () => ({
  authenticate: (req, res, next) => {
    req.user = {
      id: '507f1f77bcf86cd799439011',
      accountType: 'client'
    };
    next();
  },
  isMusician: (req, res, next) => next()
}));


const { default: bookingRouter } = await import('../backend/routes/booking.js');

const app = express();
app.use(express.json());


const mockCollection = () => ({
  findOne: jest.fn(),
  find: jest.fn().mockReturnThis(),
  toArray: jest.fn(),
  insertOne: jest.fn(),
  updateOne: jest.fn(),
  aggregate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis()
});

const mockDb = {
  collection: jest.fn().mockImplementation(collectionName => mockCollection())
};

beforeAll(() => {
  app.use((req, res, next) => {
    req.db = mockDb;
    next();
  });

  app.use('/api/bookings', bookingRouter);
});

describe('Booking API', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    
    mockDb.collection.mockImplementation(collectionName => {
      const collection = mockCollection();

      if (collectionName === 'profiles') {
        collection.findOne.mockResolvedValue({
          accountType: 'client',
          displayName: 'Test User',
          artistName: 'Test Artist'
        });
      }

      if (collectionName === 'offers') {
        collection.findOne.mockResolvedValue({
          artistName: 'Test Artist',
          eventTypes: ['concert'],
          instruments: ['guitar'],
          performerType: 'band',
          duration: { min: 1, max: 8 }
        });
      }

      if (collectionName === 'bookings') {
        collection.find.mockReturnThis();
        collection.sort.mockReturnThis();
        collection.toArray.mockResolvedValue([{
          _id: new ObjectId('507f1f77bcf86cd799439011'),
          clientId: new ObjectId('507f1f77bcf86cd799439011'),
          artistId: new ObjectId('607f1f77bcf86cd799439011'),
          offerId: new ObjectId('707f1f77bcf86cd799439011'),
          status: 'pending',
          eventDate: new Date()
        }]);
      }

      return collection;
    });
  });

  test('POST /api/bookings - should validate required fields', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({}) 
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Wypełnij wymagane pola');
  });

  test('GET /api/bookings - should return user bookings', async () => {
    
    mockDb.collection('bookings').find.mockImplementation(() => ({
      sort: () => ({
        toArray: () => Promise.resolve([{
          _id: new ObjectId(),
          clientId: new ObjectId('507f1f77bcf86cd799439011'),
          artistId: new ObjectId('607f1f77bcf86cd799439011'),
          offerId: new ObjectId('707f1f77bcf86cd799439011'),
          status: 'pending',
          eventDate: new Date()
        }])
      })
    }));

    const res = await request(app)
      .get('/api/bookings')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.bookings).toHaveLength(1);
  });

  test('PATCH /api/bookings/:id/status - should validate booking status', async () => {
    mockDb.collection().findOne.mockResolvedValue({
      _id: new ObjectId('507f1f77bcf86cd799439011'),
      clientId: new ObjectId('507f1f77bcf86cd799439011'),
      artistId: new ObjectId('507f1f77bcf86cd799439011'),
      status: 'pending'
    });

    const res = await request(app)
      .patch('/api/bookings/507f1f77bcf86cd799439011/status')
      .send({ status: 'invalid-status' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('GET /api/bookings/:id - should return booking details', async () => {
    
    mockDb.collection.mockImplementationOnce((collectionName) => {
      const collection = mockCollection();
      if (collectionName === 'bookings') {
        collection.findOne.mockResolvedValueOnce({
          _id: new ObjectId('507f1f77bcf86cd799439011'),
          clientId: new ObjectId('507f1f77bcf86cd799439011'),
          artistId: new ObjectId('607f1f77bcf86cd799439011'),
          offerId: new ObjectId('707f1f77bcf86cd799439011'),
          status: 'pending'
        });
      }
      return collection;
    });

    
    mockDb.collection.mockImplementationOnce((collectionName) => {
      const collection = mockCollection();
      if (collectionName === 'offers') {
        collection.findOne.mockResolvedValueOnce({
          artistName: 'Test Offer',
          eventTypes: ['concert'],
          instruments: ['guitar']
        });
      }
      return collection;
    });

    
    mockDb.collection.mockImplementationOnce((collectionName) => {
      const collection = mockCollection();
      if (collectionName === 'profiles') {
        collection.findOne.mockResolvedValueOnce({
          displayName: 'Test Artist',
          artistName: 'Test Artist'
        });
      }
      return collection;
    });

    
    mockDb.collection.mockImplementationOnce((collectionName) => {
      const collection = mockCollection();
      if (collectionName === 'profiles') {
        collection.findOne.mockResolvedValueOnce({
          displayName: 'Test Client'
        });
      }
      return collection;
    });

    const res = await request(app)
      .get('/api/bookings/507f1f77bcf86cd799439011')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.booking).toBeDefined();
  });
});