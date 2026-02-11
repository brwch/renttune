import { jest } from '@jest/globals';
import { ObjectId } from 'mongodb';


const mockJwtVerify = jest.fn();
const mockDbFindOne = jest.fn();

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    verify: mockJwtVerify
  }
}));

jest.unstable_mockModule('../backend/db.js', () => ({
  getDb: jest.fn().mockResolvedValue({
    db: {
      collection: jest.fn().mockReturnValue({
        findOne: mockDbFindOne
      })
    }
  })
}));


const { default: jwt } = await import('jsonwebtoken');
const { getDb } = await import('../backend/db.js');
const { authenticate } = await import('../backend/middleware/auth.js');

describe('Authentication Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {},
      user: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();

    process.env.JWT_SECRET = 'test-secret';
  });

  
  test('should reject request without token', async () => {
    await authenticate(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Brak tokenu autoryzacyjnego'
    });
    expect(mockJwtVerify).not.toHaveBeenCalled();
    expect(mockDbFindOne).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  
  test('should validate correct token', async () => {
    mockReq.headers.authorization = 'Bearer valid.token.here';
    mockJwtVerify.mockReturnValue({
      id: '507f1f77bcf86cd799439011',
      accountType: 'client'
    });

    mockDbFindOne.mockResolvedValue({
      _id: new ObjectId('507f1f77bcf86cd799439011'),
      email: 'test@example.com'
    });

    await authenticate(mockReq, mockRes, mockNext);

    expect(mockJwtVerify).toHaveBeenCalledWith('valid.token.here', 'test-secret');
    expect(mockDbFindOne).toHaveBeenCalledWith(
      { _id: new ObjectId('507f1f77bcf86cd799439011') }
    );
    expect(mockReq.user).toEqual({
      id: '507f1f77bcf86cd799439011',
      accountType: 'client'
    });
    expect(mockNext).toHaveBeenCalled();
  });

  
  test('should reject invalid token', async () => {
    mockReq.headers.authorization = 'Bearer invalid.token';

    const error = new Error('Invalid token');
    error.name = 'JsonWebTokenError';
    mockJwtVerify.mockImplementation(() => {
      throw error;
    });

    await authenticate(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Nieprawidłowy token',
      error: 'Invalid token'
    });
    expect(mockDbFindOne).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  
  test('should reject invalid user ID format', async () => {
    mockReq.headers.authorization = 'Bearer valid.token.here';
    mockJwtVerify.mockReturnValue({
      id: 'invalid-id', 
      accountType: 'client'
    });

    await authenticate(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Nieprawidłowy format ID użytkownika w tokenie'
    });
    expect(mockDbFindOne).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  
  test('should reject when user not found in database', async () => {
    mockReq.headers.authorization = 'Bearer valid.token.here';
    mockJwtVerify.mockReturnValue({
      id: '507f1f77bcf86cd799439011',
      accountType: 'client'
    });

    mockDbFindOne.mockResolvedValue(null); 

    await authenticate(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Użytkownik nie istnieje'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  
  test('should handle missing JWT secret', async () => {
    const originalSecret = process.env.JWT_SECRET;

    delete process.env.JWT_SECRET;

    mockReq.headers.authorization = 'Bearer valid.token.here';

    await authenticate(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Błąd serwera'
    });

    process.env.JWT_SECRET = originalSecret;
  });
});