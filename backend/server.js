import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { ObjectId } from 'mongodb';
import { getDb } from './db.js';
import passport from 'passport';
import authRoutes from './routes/authRoutes.js';
import offersRouter from './routes/offers.js';
import commentsRouter from './routes/comments.js';
import availabilityRouter from './routes/availability.js';
import usersRouter from './routes/users.js';
import bookingRouter from './routes/booking.js';
import profileRouter from './routes/profile.js';
import ratingsRouter from './routes/ratings.js';
import { GridFSBucket } from 'mongodb';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5173;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Cross-Origin-Resource-Policy']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Konfiguracja sesji
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    dbName: 'RentTune',
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60
  }),
  cookie: {
    maxAge: 14 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Middleware do obsługi połączenia z bazą danych
app.use(async (req, res, next) => {
  try {
    const { db, client } = await getDb();
    req.db = db;
    req.dbClient = client;
    req.gridFSBucket = new GridFSBucket(db, { bucketName: 'uploads' });
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ success: false, message: 'Database connection error' });
  }
});

// Inicjalizacja Passport
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Routes
app.use('/api', authRoutes);
app.use('/api/offers', offersRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/ratings', ratingsRouter);
app.use('/api/user', usersRouter);
app.use('/api/user/profile', profileRouter);

// Endpoint do pobierania plików
app.get('/api/files/:id', async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.id);

    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    const downloadStream = req.gridFSBucket.openDownloadStream(fileId);

    downloadStream.on('error', (error) => {
      if (error.message.includes('FileNotFound')) {
        return res.status(404).json({ success: false, message: 'Plik nie znaleziony' });
      }
      console.error('Błąd pobierania pliku:', error);
      res.status(500).json({ success: false, message: 'Błąd podczas pobierania pliku' });
    });

    downloadStream.on('file', (file) => {
      res.set('Content-Type', file.contentType);
      res.set('Content-Disposition', `inline; filename="${file.filename}"`);
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error('Błąd pobierania pliku:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas pobierania pliku' });
  }
});

// Endpoint do pobierania metadanych pliku
app.get('/api/files/:id/metadata', async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.id);
    const file = await req.db.collection('uploads.files').findOne({ _id: fileId });

    if (!file) {
      return res.status(404).json({ success: false, message: 'Plik nie znaleziony' });
    }

    res.status(200).json({
      success: true,
      file: {
        id: file._id,
        name: file.filename,
        size: file.length,
        contentType: file.contentType,
        uploadDate: file.uploadDate,
        metadata: file.metadata
      }
    });
  } catch (error) {
    console.error('Błąd pobierania metadanych pliku:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas pobierania metadanych pliku' });
  }
});

// Obsługa błędów
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Wewnętrzny błąd serwera' });
});

// Start serwera
async function startServer() {
  try {
    await getDb();
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Serwer działa na porcie ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

startServer();