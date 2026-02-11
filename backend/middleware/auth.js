import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Brak tokenu autoryzacyjnego'
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('Brak JWT_SECRET w zmiennych środowiskowych');
    return res.status(500).json({
      success: false,
      message: 'Błąd serwera'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id || !ObjectId.isValid(decoded.id)) {
      return res.status(401).json({
        success: false,
        message: 'Nieprawidłowy format ID użytkownika w tokenie'
      });
    }

    const { db } = await getDb();
    const user = await db.collection('users').findOne({
      _id: new ObjectId(decoded.id)
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Użytkownik nie istnieje'
      });
    }

    req.user = {
      id: decoded.id,
      accountType: decoded.accountType
    };

    next();
  } catch (error) {
    console.error('Błąd weryfikacji tokena:', error);
    res.status(401).json({
      success: false,
      message: 'Nieprawidłowy token',
      error: error.message
    });
  }
};

export const isMusician = async (req, res, next) => {
  try {
    const { db } = await getDb();
    const user = await db.collection('users').findOne({
      _id: new ObjectId(req.user.id)
    });

    if (!user || user.accountType !== 'musician') {
      return res.status(403).json({
        success: false,
        message: 'Brak uprawnień - wymagane konto muzyka'
      });
    }

    next();
  } catch (error) {
    console.error('Błąd weryfikacji typu konta:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas weryfikacji uprawnień'
    });
  }
};