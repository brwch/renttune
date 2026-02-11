import express from 'express'
import { ObjectId } from 'mongodb'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()


router.get('/', authenticate, async (req, res) => {
  try {
    const user = await req.db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { availability: 1 } }
    )

    console.log('Dostępność przed wysłaniem:', JSON.stringify(user.availability, null, 2));

    res.status(200).json({
      success: true,
      availability: user?.availability || {}
    })
  } catch (error) {
    console.error('Błąd pobierania dostępności:', error)
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania dostępności'
    })
  }
})


router.get('/:userId', async (req, res) => {
  try {
    const user = await req.db.collection('users').findOne(
      { _id: new ObjectId(req.params.userId) },
      { projection: { availability: 1 } }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie znaleziony'
      });
    }

    res.status(200).json({
      success: true,
      availability: user?.availability || {}
    });
  } catch (error) {
    console.error('Błąd pobierania dostępności:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania dostępności'
    });
  }
});


router.post('/', authenticate, async (req, res) => {
  try {
    const { availability } = req.body

    if (!availability || typeof availability !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy format danych'
      })
    }

    await req.db.collection('users').updateOne(
      { _id: new ObjectId(req.user.id) },
      { $set: { availability } }
    )

    res.status(200).json({
      success: true,
      message: 'Dostępność zaktualizowana pomyślnie'
    })
  } catch (error) {
    console.error('Błąd aktualizacji dostępności:', error)
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas aktualizacji dostępności'
    })
  }
})

export default router