import express from 'express';
import { ObjectId } from 'mongodb';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();


router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const ratings = await req.db.collection('ratings').find({
      userId: new ObjectId(req.params.userId)
    }).toArray();

    res.status(200).json({
      success: true,
      ratings: ratings.map(r => ({
        ...r,
        _id: r._id.toString(),
        userId: r.userId.toString(),
        offerId: r.offerId.toString()
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

export default router;