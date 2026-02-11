import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
let cachedDb = null;
let clientInstance = null;

export async function getDb() {
  if (cachedDb && clientInstance) {
    return { db: cachedDb, client: clientInstance };
  }

  try {
    clientInstance = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 50,
      minPoolSize: 5,
      retryWrites: true,
      retryReads: true
    });

    await clientInstance.connect();
    const db = clientInstance.db("RentTune");
    
    
    if (!cachedDb) {
      await db.collection('users').createIndex({ email: 1 }, { unique: true }, { unreadBookings: 1 });
      await db.collection('profiles').createIndex({ userId: 1 }, { unique: true });
      await db.collection('offers').createIndex({ userId: 1 });
      await db.collection('offers').createIndex({ 
        location: 'text', 
        artistName: 'text',
        description: 'text'
      }, {
        weights: {
          artistName: 3,
          location: 2,
          description: 1
        },
        name: 'offer_search_index'
      });
      await db.collection('offers').createIndex({ status: 1 });
      await db.collection('offers').createIndex({ createdAt: -1 });
      await db.collection('offers').createIndex({ 
        'price.min': 1, 
        'price.max': 1 
      });
    }
    
    cachedDb = db;
    return { db, client: clientInstance };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function closeConnection() {
  if (clientInstance) {
    await clientInstance.close();
    cachedDb = null;
    clientInstance = null;
  }
}

process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});