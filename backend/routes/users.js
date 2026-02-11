import { ObjectId } from 'mongodb';
import express from 'express';

const router = express.Router();


router.get('/:userId', async (req, res) => {
  try {
    
    if (!req.params.userId || !ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy format ID użytkownika'
      });
    }

    const userId = new ObjectId(req.params.userId);

    
    const profile = await req.db.collection('profiles').findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil użytkownika nie znaleziony'
      });
    }

    
    const user = await req.db.collection('users').findOne(
      { _id: userId },
      { projection: { email: 1, accountType: 1 } }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie znaleziony'
      });
    }

    
    const response = {
      displayName: profile.displayName || '',
      email: user.email || '',
      accountType: user.accountType || 'client',
      name: profile.name || '',
      phone: profile.phone || '',
      organizationName: profile.organizationName || '',
      artistName: profile.artistName || '',
      contactPreference: profile.contactPreference || 'phone',
      technicalRequirements: profile.technicalRequirements || '',
      providesEquipment: profile.providesEquipment || false,
      socialMedia: profile.socialMedia || {
        facebook: '',
        instagram: '',
        youtube: '',
        website: ''
      }
    };

    if (profile.profileImage) {
      response.profileImageUrl = `/api/files/${profile.profileImage}`;
    }

    res.status(200).json({ success: true, ...response });
  } catch (error) {
    console.error('Błąd pobierania danych użytkownika:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd serwera',
      error: error.message
    });
  }
});

export default router;