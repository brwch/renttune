import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { ObjectId } from 'mongodb';


const mockAuth = {
  authenticate: (req, res, next) => {
    req.user = { id: '507f1f77bcf86cd799439011' };
    next();
  }
};
jest.unstable_mockModule('../backend/middleware/auth.js', () => mockAuth);


let createdBucket;

const mockGridFSBucketInstance = {
  delete: jest.fn().mockResolvedValue(true),
  find: jest.fn().mockReturnThis(),
  next: jest.fn(),
  openUploadStream: jest.fn()
};

const mockMongo = {
  ...await import('mongodb'),
  GridFSBucket: jest.fn().mockImplementation((...args) => {
    createdBucket = mockGridFSBucketInstance;
    return mockGridFSBucketInstance;
  })
};
jest.unstable_mockModule('mongodb', () => mockMongo);


const { default: offersRouter } = await import('../backend/routes/offers.js');

const app = express();
app.use(express.json());


const mockCollection = () => ({
  findOne: jest.fn(),
  find: jest.fn().mockReturnThis(),
  toArray: jest.fn(),
  insertOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lookup: jest.fn().mockReturnThis(),
  addFields: jest.fn().mockReturnThis(),
  project: jest.fn().mockReturnThis(),
  match: jest.fn().mockReturnThis()
});


const mockDb = {
  collection: jest.fn().mockImplementation((name) => {
    const collection = mockCollection();

    if (name === 'offers') {
      collection.aggregate.mockImplementation(() => ({
        toArray: jest.fn().mockResolvedValue([{
          _id: new ObjectId(),
          artistName: 'Test Artist',
          status: 'active',
          userId: new ObjectId('507f1f77bcf86cd799439011'),
          photos: [],
          musicStyles: [],
          eventTypes: [],
          instruments: [],
          price: { min: 100, max: 500 },
          duration: { min: 1, max: 3 },
          ratings: [],
          comments: []
        }])
      }));
      collection.countDocuments.mockResolvedValue(1);
    }

    if (name === 'ratings') {
      collection.aggregate.mockImplementation(() => ({
        toArray: jest.fn().mockResolvedValue([{
          _id: null,
          average: 4.5,
          count: 10
        }])
      }));
    }

    if (name === 'comments') {
      collection.countDocuments.mockResolvedValue(5);
    }

    return collection;
  })
};

beforeAll(() => {
  app.use((req, res, next) => {
    req.db = mockDb;
    req.gridFSBucket = createdBucket;
    req.dbClient = {
      startSession: jest.fn(() => ({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
        withTransaction: jest.fn(async (fn) => await fn())
      }))
    };
    next();
  });

  app.use('/api/offers', offersRouter);
});

describe('Offers API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/offers/active - should return active offers', async () => {
    const res = await request(app)
      .get('/api/offers/active')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.offers).toBeDefined();
    expect(res.body.offers.length).toBeGreaterThan(0);
  });

  test('POST /api/offers - should validate required fields', async () => {
    const res = await request(app)
      .post('/api/offers')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Wypełnij wymagane pola');
  });

  test('GET /api/offers/:id - should return 404 for non-existent offer', async () => {
    mockDb.collection('offers').findOne.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/offers/507f1f77bcf86cd799439011')
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  test('DELETE /api/offers/:id - should delete offer', async () => {
    const offerId = new ObjectId('507f1f77bcf86cd799439011');
    const userId = new ObjectId('507f1f77bcf86cd799439011');
    const photoId1 = new ObjectId();
    const photoId2 = new ObjectId();
    const audioDemoId = new ObjectId();

    const mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn()
    };

    const mockDbClient = {
      startSession: jest.fn(() => mockSession)
    };

    
    mockDb.collection.mockImplementation((name) => {
      if (name === 'offers') {
        return {
          findOne: jest.fn().mockImplementation((query) => {
            if (query._id.equals(offerId)) {
              return Promise.resolve({
                _id: offerId,
                userId,
                photos: [photoId1, photoId2],
                audioDemo: audioDemoId
              });
            }
            return Promise.resolve(null);
          }),
          deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
        };
      }
      return mockCollection();
    });

    
    app.use((req, res, next) => {
      req.db = mockDb;
      req.gridFSBucket = createdBucket;
      req.dbClient = mockDbClient;
      req.user = { id: userId.toString() };
      next();
    });

    const res = await request(app)
      .delete(`/api/offers/${offerId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mockMongo.GridFSBucket).toHaveBeenCalledWith(expect.anything(), { bucketName: 'uploads' });
    expect(createdBucket.delete).toHaveBeenCalledTimes(3);
    expect(createdBucket.delete).toHaveBeenCalledWith(photoId1);
    expect(createdBucket.delete).toHaveBeenCalledWith(photoId2);
    expect(createdBucket.delete).toHaveBeenCalledWith(audioDemoId);
  });
});
