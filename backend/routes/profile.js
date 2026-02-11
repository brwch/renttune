import express from 'express';
import multer from 'multer';
import { ObjectId } from 'mongodb';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


router.put('/', authenticate, upload.single('profileImage'), async (req, res) => {
  const session = req.dbClient.startSession();
  try {
    await session.startTransaction();

    const formData = req.body;
    const user = await req.db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { session }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
    }

    
    const updateData = {
      name: formData.name || '',
      displayName: formData.displayName || formData.name || '',
      phone: formData.phone || '',
      organizationName: formData.organizationName || '',
      contactPreference: formData.contactPreference || 'phone',
      updatedAt: new Date()
    };

    
    if (user.accountType === 'musician') {
      updateData.artistName = formData.artistName || '';
      updateData.technicalRequirements = formData.technicalRequirements || '';
      updateData.providesEquipment = Boolean(formData.providesEquipment);

      try {
        updateData.socialMedia = formData.socialMedia
          ? JSON.parse(formData.socialMedia)
          : { facebook: '', instagram: '', youtube: '', website: '' };
      } catch (e) {
        updateData.socialMedia = {
          facebook: '',
          instagram: '',
          youtube: '',
          website: ''
        };
      }
    }

    
    let profileImageId = null;
    if (req.file) {
      
      const existingProfile = await req.db.collection('profiles').findOne(
        { userId: new ObjectId(req.user.id) },
        { session }
      );

      if (existingProfile?.profileImage) {
        await req.gridFSBucket.delete(new ObjectId(existingProfile.profileImage));
      }

      
      const uploadStream = req.gridFSBucket.openUploadStream(
        `profile-${Date.now()}-${req.file.originalname}`,
        {
          contentType: req.file.mimetype,
          metadata: {
            originalName: req.file.originalname,
            userId: req.user.id
          }
        }
      );

      uploadStream.end(req.file.buffer);
      profileImageId = uploadStream.id.toString();
      updateData.profileImage = profileImageId;
    }

    
    await req.db.collection('profiles').updateOne(
      { userId: new ObjectId(req.user.id) },
      {
        $set: updateData,
        $setOnInsert: {
          userId: new ObjectId(req.user.id),
          email: user.email,
          accountType: user.accountType,
          createdAt: new Date()
        }
      },
      { session, upsert: true }
    );

    await session.commitTransaction();

    
    const updatedProfile = await req.db.collection('profiles').findOne(
      { userId: new ObjectId(req.user.id) },
      { session }
    );

    res.status(200).json({
      success: true,
      message: 'Profil zaktualizowany',
      profile: {
        ...updatedProfile,
        userId: updatedProfile.userId.toString(),
        accountType: user.accountType,
        email: user.email,
        profileImage: profileImageId ? `/api/files/${profileImageId}` :
          (updatedProfile.profileImage ? `/api/files/${updatedProfile.profileImage}` : null)
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Błąd aktualizacji profilu:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas aktualizacji profilu',
      error: error.message
    });
  } finally {
    session.endSession();
  }
});


router.get('/', authenticate, async (req, res) => {
  try {

    const profile = await req.db.collection('profiles').findOne({
      userId: new ObjectId(req.user.id)
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil nie znaleziony'
      });
    }

    
    const user = await req.db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { email: 1, accountType: 1 } }
    );

    const responseData = {
      ...(profile || {}),
      userId: req.user.id,
      avatar: profile.avatar || null,
      email: user.email,
      accountType: user.accountType 
    };

    if (profile.profileImage) {
      responseData.profileImageUrl = `/api/files/${profile.profileImage}`;
    }

    res.status(200).json({
      success: true,
      profile: responseData
    });
  } catch (error) {
    console.error('Błąd pobierania profilu:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania profilu'
    });
  }
});


router.delete('/profile-image', authenticate, async (req, res) => {
  const session = req.dbClient.startSession();
  try {
    await session.startTransaction();

    
    const profile = await req.db.collection('profiles').findOne(
      { userId: new ObjectId(req.user.id) },
      { session }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil nie znaleziony'
      });
    }

    
    if (!profile.profileImage) {
      return res.status(400).json({
        success: false,
        message: 'Brak zdjęcia profilowego do usunięcia'
      });
    }

    
    await req.gridFSBucket.delete(new ObjectId(profile.profileImage));

    
    await req.db.collection('profiles').updateOne(
      { userId: new ObjectId(req.user.id) },
      { $unset: { profileImage: "" } },
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Zdjęcie profilowe zostało usunięte'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Błąd usuwania zdjęcia profilowego:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas usuwania zdjęcia profilowego'
    });
  } finally {
    session.endSession();
  }
});

export default router;