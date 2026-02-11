import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import nodemailer from 'nodemailer';
import { authenticate } from '../middleware/auth.js'
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';

const router = Router();


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const generateToken = (userId, accountType) => {
  return jwt.sign(
    { id: userId, accountType },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};


passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { db } = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});


if (process.env.NODE_ENV !== 'test') {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    passReqToCallback: true,
    scope: ['profile', 'email'],
    proxy: true
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      const { db } = await getDb();
      const usersCollection = db.collection('users');
      const profilesCollection = db.collection('profiles');

      let user = await usersCollection.findOne({
        $or: [
          { googleId: profile.id },
          { email: profile.emails[0].value }
        ]
      });

      if (!user) {
        const newUser = {
          googleId: profile.id,
          email: profile.emails[0].value,
          accountType: 'unset',
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await usersCollection.insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };

        const nameParts = profile.displayName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        const newProfile = {
          userId: user._id,
          email: user.email,
          displayName: profile.displayName,
          firstName,
          lastName,
          avatar: profile.photos?.[0]?.value || '',
          accountType: 'unset',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await profilesCollection.insertOne(newProfile);
      } else if (!user.googleId) {
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { googleId: profile.id, updatedAt: new Date() } }
        );
      }

      return done(null, user);
    } catch (error) {
      console.error('Google auth error:', error);
      return done(error, null);
    }
  }));
}


router.post('/register', async (req, res) => {
  let session;
  try {
    const { email, password, accountType } = req.body;

    if (!email || !password || !accountType) {
      return res.status(400).json({ success: false, message: 'Wszystkie pola są wymagane' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Niepoprawny format emaila' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Hasło musi mieć co najmniej 6 znaków' });
    }

    const { db, client } = await getDb();
    const usersCollection = db.collection('users');
    const profilesCollection = db.collection('profiles');

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Użytkownik o podanym emailu już istnieje' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    session = client.startSession();
    session.startTransaction();

    const newUser = {
      email,
      password: hashedPassword,
      accountType,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const userResult = await usersCollection.insertOne(newUser, { session });
    const userId = userResult.insertedId;

    const newProfile = {
      userId,
      email,
      accountType,
      displayName: email.split('@')[0],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await profilesCollection.insertOne(newProfile, { session });
    await session.commitTransaction();

    const token = generateToken(userId, accountType);

    res.status(201).json({
      success: true,
      message: 'Rejestracja zakończona pomyślnie',
      token,
      userId,
      accountType
    });
  } catch (error) {
    if (session) await session.abortTransaction();
    console.error('Błąd rejestracji:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas rejestracji' });
  } finally {
    if (session) session.endSession();
  }
});


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email i hasło są wymagane' });
    }

    const { db } = await getDb();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Nieprawidłowy email lub hasło' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Nieprawidłowy email lub hasło' });
    }

    const token = generateToken(user._id, user.accountType);

    res.status(200).json({
      success: true,
      message: 'Logowanie zakończone pomyślnie',
      token,
      userId: user._id,
      accountType: user.accountType
    });
  } catch (error) {
    console.error('Błąd logowania:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas logowania' });
  }
});


router.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

router.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
    session: false
  }),
  async (req, res) => {
    try {
      if (!req.user) {
        throw new Error('Brak danych użytkownika');
      }

      if (req.user.accountType === 'unset') {
        const token = generateToken(req.user._id.toString(), 'unset');
        return res.redirect(`${process.env.FRONTEND_URL}/select-account-type?token=${token}&userId=${req.user._id.toString()}`);
      }

      const token = generateToken(req.user._id.toString(), req.user.accountType);
      res.redirect(`${process.env.FRONTEND_URL}/login/success?token=${token}&accountType=${req.user.accountType}&userId=${req.user._id.toString()}`);
    } catch (error) {
      console.error('Błąd w callbacku Google:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
    }
  }
);


router.post('/set-account-type', async (req, res) => {
  try {
    const { token, accountType, userId } = req.body;

    if (!token || !accountType || !userId) {
      return res.status(400).json({ success: false, message: 'Brak wymaganych danych' });
    }

    const { db } = await getDb();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.id !== userId) {
      return res.status(401).json({ success: false, message: 'Nieautoryzowany dostęp' });
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { accountType, updatedAt: new Date() } }
    );

    await db.collection('profiles').updateOne(
      { userId: new ObjectId(userId) },
      { $set: { accountType } }
    );

    const newToken = generateToken(userId, accountType);

    res.status(200).json({
      success: true,
      token: newToken,
      accountType,
      userId
    });
  } catch (error) {
    console.error('Błąd ustawiania typu konta:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas ustawiania typu konta' });
  }
});


router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email jest wymagany' });
    }

    const { db } = await getDb();
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Użytkownik o podanym emailu nie istnieje' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    const expires = Date.now() + 3600000;

    await db.collection('password_reset_tokens').insertOne({
      userId: user._id,
      token,
      expires: new Date(expires),
      email: user.email
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Resetowanie hasła - RentTune',
      html: `
        <p>Otrzymaliśmy prośbę o resetowanie hasła dla Twojego konta.</p>
        <p>Kliknij poniższy link, aby zresetować hasło:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>Link będzie aktywny przez 1 godzinę.</p>
        <p>Jeśli to nie Ty wysłałeś tę prośbę, zignoruj tę wiadomość.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Link do resetowania hasła został wysłany na podany email'
    });
  } catch (error) {
    console.error('Błąd resetowania hasła:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas przetwarzania żądania' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Hasło musi mieć co najmniej 6 znaków' });
    }

    const { db } = await getDb();
    const resetToken = await db.collection('password_reset_tokens').findOne({
      token,
      expires: { $gt: new Date() }
    });

    if (!resetToken) {
      return res.status(400).json({ success: false, message: 'Nieprawidłowy lub przedawniony token' });
    }

    const user = await db.collection('users').findOne({ _id: resetToken.userId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    await db.collection('password_reset_tokens').deleteOne({ token });

    res.status(200).json({
      success: true,
      message: 'Hasło zostało pomyślnie zresetowane'
    });
  } catch (error) {
    console.error('Błąd resetowania hasła:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas resetowania hasła' });
  }
});


router.post('/favorites/:offerId', authenticate, async (req, res) => {
  try {
    const offerId = req.params.offerId;
    const offer = await req.db.collection('offers').findOne({
      _id: new ObjectId(offerId),
      status: 'active'
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Oferta nie znaleziona' });
    }

    await req.db.collection('users').updateOne(
      { _id: new ObjectId(req.user.id) },
      { $addToSet: { favorites: new ObjectId(offerId) } }
    );

    res.status(200).json({ success: true, message: 'Dodano do ulubionych' });
  } catch (error) {
    console.error('Błąd dodawania do ulubionych:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd' });
  }
});

router.delete('/favorites/:offerId', authenticate, async (req, res) => {
  try {
    const offerId = req.params.offerId;
    await req.db.collection('users').updateOne(
      { _id: new ObjectId(req.user.id) },
      { $pull: { favorites: new ObjectId(offerId) } }
    );
    res.status(200).json({ success: true, message: 'Usunięto z ulubionych' });
  } catch (error) {
    console.error('Błąd usuwania z ulubionych:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd' });
  }
});

router.get('/favorites', authenticate, async (req, res) => {
  try {
    const user = await req.db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { favorites: 1 } }
    );
    res.status(200).json({
      success: true,
      favorites: user?.favorites?.map(id => id.toString()) || []
    });
  } catch (error) {
    console.error('Błąd pobierania ulubionych:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd' });
  }
});

router.get('/favorites/offers', authenticate, async (req, res) => {
  try {
    const user = await req.db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { favorites: 1 } }
    );

    if (!user?.favorites || user.favorites.length === 0) {
      return res.status(200).json({ success: true, offers: [] });
    }

    const offers = await req.db.collection('offers')
      .find({
        _id: { $in: user.favorites.map(id => new ObjectId(id)) },
        status: 'active'
      })
      .toArray();

    res.status(200).json({
      success: true,
      offers: offers.map(offer => ({
        ...offer,
        _id: offer._id.toString(),
        userId: offer.userId.toString()
      }))
    });
  } catch (error) {
    console.error('Błąd pobierania ulubionych ofert:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd' });
  }
});

router.get('/favorites/:offerId/check', authenticate, async (req, res) => {
  try {
    const offerId = req.params.offerId;
    const user = await req.db.collection('users').findOne({
      _id: new ObjectId(req.user.id),
      favorites: new ObjectId(offerId)
    });
    res.status(200).json({ success: true, isFavorite: !!user });
  } catch (error) {
    console.error('Błąd sprawdzania ulubionych:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd' });
  }
});


router.get('/profile', authenticate, async (req, res) => {
  try {
    const { db } = await getDb();
    const profile = await db.collection('profiles').findOne({
      userId: new ObjectId(req.user.id)
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profil nie znaleziony' });
    }

    res.status(200).json({
      success: true,
      profile: {
        ...profile,
        userId: profile.userId.toString()
      }
    });
  } catch (error) {
    console.error('Błąd pobierania profilu:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas pobierania profilu' });
  }
});

export default router;