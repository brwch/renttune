import express from 'express';
import multer from 'multer';
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';
import { authenticate } from '../middleware/auth.js';
import { GridFSBucket } from 'mongodb';

const allowedMimeTypes = {
  photos: ['image/jpeg', 'image/png', 'image/webp'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/mp3']
};

const router = express.Router();


const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, 
    files: 6
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'audio/mpeg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nieprawidłowy typ pliku'), false);
    }
  }
});


const saveFileToGridFS = async (bucket, file, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(
      `${folder}/${Date.now()}-${file.originalname}`,
      {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          size: file.size,
          uploadDate: new Date()
        }
      }
    );

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve(uploadStream.id.toString()));
    uploadStream.end(file.buffer);
  });
};

router.post('/track-activity', authenticate, async (req, res) => {
  try {
    const { offerId, activityType, metadata } = req.body;

    await req.db.collection('userActivities').insertOne({
      userId: new ObjectId(req.user.id),
      offerId: new ObjectId(offerId),
      type: activityType,
      metadata: metadata || {},
      timestamp: new Date()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Błąd zapisywania aktywności:', error);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});


router.get('/recommendations', authenticate, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Nieautoryzowany dostęp' });
    }

    
    const user = await req.db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      {
        projection: {
          preferences: 1,
          favorites: 1,
          accountType: 1,
          searchHistory: 1,
          bookingHistory: 1
        }
      }
    );

    
    const [bookings, viewedOffers, ratedOffers] = await Promise.all([
      req.db.collection('bookings').find({
        userId: new ObjectId(req.user.id),
        status: 'completed'
      }).toArray(),
      req.db.collection('userActivities').find({
        userId: new ObjectId(req.user.id),
        type: 'offerView'
      }).sort({ timestamp: -1 }).limit(20).toArray(),
      req.db.collection('ratings').find({
        userId: new ObjectId(req.user.id),
        rating: { $gte: 4 } 
      }).toArray()
    ]);

    
    const userPreferences = {
      
      categoryWeights: {
        musicStyles: 0.4,    
        eventTypes: 0.3,     
        instruments: 0.2,    
        performerType: 0.1   
      },

      
      preferredMusicStyles: [],
      preferredEventTypes: [],
      preferredInstruments: [],
      preferredPerformerTypes: [],

      
      priceRange: { min: null, max: null },
      locationPreferences: []
    };

    
    if (user.favorites && user.favorites.length > 0) {
      const favoriteOffers = await req.db.collection('offers').find({
        _id: { $in: user.favorites.map(id => new ObjectId(id)) }
      }).toArray();

      
      const tagAnalysis = analyzeTags(favoriteOffers);

      userPreferences.preferredMusicStyles = tagAnalysis.musicStyles;
      userPreferences.preferredEventTypes = tagAnalysis.eventTypes;
      userPreferences.preferredInstruments = tagAnalysis.instruments;
      userPreferences.preferredPerformerTypes = tagAnalysis.performerTypes;

      
      userPreferences.priceRange = calculatePriceRange(favoriteOffers);
    }

    
    if (bookings.length > 0) {
      const bookedOffers = await req.db.collection('offers').find({
        _id: { $in: bookings.map(b => new ObjectId(b.offerId)) }
      }).toArray();

      const bookedTagAnalysis = analyzeTags(bookedOffers);

      
      userPreferences.preferredMusicStyles = mergeTagArrays(
        userPreferences.preferredMusicStyles,
        bookedTagAnalysis.musicStyles,
        1.5
      );
      userPreferences.preferredEventTypes = mergeTagArrays(
        userPreferences.preferredEventTypes,
        bookedTagAnalysis.eventTypes,
        1.5
      );
      
      userPreferences.preferredInstruments = mergeTagArrays(
        userPreferences.preferredInstruments,
        bookedTagAnalysis.instruments
      );
      userPreferences.preferredPerformerTypes = mergeTagArrays(
        userPreferences.preferredPerformerTypes,
        bookedTagAnalysis.performerTypes
      );

      
      const bookedPriceRange = calculatePriceRange(bookedOffers);
      userPreferences.priceRange = mergePriceRanges(
        userPreferences.priceRange,
        bookedPriceRange
      );
    }

    
    if (viewedOffers.length > 0) {
      const viewedOfferIds = viewedOffers.map(v => new ObjectId(v.offerId));
      const viewedOffersData = await req.db.collection('offers').find({
        _id: { $in: viewedOfferIds }
      }).toArray();

      const viewedTagAnalysis = analyzeTags(viewedOffersData);

      
      userPreferences.preferredMusicStyles = mergeTagArrays(
        userPreferences.preferredMusicStyles,
        viewedTagAnalysis.musicStyles,
        0.8
      );
      userPreferences.preferredEventTypes = mergeTagArrays(
        userPreferences.preferredEventTypes,
        viewedTagAnalysis.eventTypes,
        0.8
      );
      userPreferences.preferredInstruments = mergeTagArrays(
        userPreferences.preferredInstruments,
        viewedTagAnalysis.instruments,
        0.8
      );
      userPreferences.preferredPerformerTypes = mergeTagArrays(
        userPreferences.preferredPerformerTypes,
        viewedTagAnalysis.performerTypes,
        0.8
      );
    }

    
    if (ratedOffers.length > 0) {
      const ratedOfferIds = ratedOffers.map(r => new ObjectId(r.offerId));
      const ratedOffersData = await req.db.collection('offers').find({
        _id: { $in: ratedOfferIds }
      }).toArray();

      const ratedTagAnalysis = analyzeTags(ratedOffersData);

      
      userPreferences.preferredMusicStyles = mergeTagArrays(
        userPreferences.preferredMusicStyles,
        ratedTagAnalysis.musicStyles,
        1.2
      );
      userPreferences.preferredEventTypes = mergeTagArrays(
        userPreferences.preferredEventTypes,
        ratedTagAnalysis.eventTypes,
        1.2
      );
      userPreferences.preferredInstruments = mergeTagArrays(
        userPreferences.preferredInstruments,
        ratedTagAnalysis.instruments,
        1.2
      );
      userPreferences.preferredPerformerTypes = mergeTagArrays(
        userPreferences.preferredPerformerTypes,
        ratedTagAnalysis.performerTypes,
        1.2
      );
    }

    
    userPreferences.preferredMusicStyles.sort((a, b) => b.count - a.count);
    userPreferences.preferredEventTypes.sort((a, b) => b.count - a.count);
    userPreferences.preferredInstruments.sort((a, b) => b.count - a.count);
    userPreferences.preferredPerformerTypes.sort((a, b) => b.count - a.count);

    
    const allActiveOffers = await req.db.collection('offers')
      .aggregate([
        { $match: { status: 'active' } },
        {
          $lookup: {
            from: 'ratings',
            localField: '_id',
            foreignField: 'offerId',
            as: 'ratings'
          }
        },
        {
          $lookup: {
            from: 'comments',
            localField: '_id',
            foreignField: 'offerId',
            as: 'comments'
          }
        },
        {
          $addFields: {
            averageRating: {
              $avg: '$ratings.rating'
            },
            commentsCount: {
              $size: '$comments'
            }
          }
        }
      ])
      .toArray();

    
    const scoredOffers = allActiveOffers.map(offer => {
      const score = calculateOfferScore(offer, userPreferences);
      return {
        ...offer,
        score,
        
        averageRating: offer.averageRating || 0,
        commentsCount: offer.commentsCount || 0
      };
    });

    
    scoredOffers.sort((a, b) => b.score - a.score);

    
    const recommendedOffers = scoredOffers.slice(0, 12).map(offer => ({
      ...offer,
      _id: offer._id.toString(),
      userId: offer.userId.toString(),
      
      averageRating: offer.averageRating || 0,
      commentsCount: offer.commentsCount || 0
    }));

    res.status(200).json({
      success: true,
      offers: recommendedOffers,
      userPreferences 
    });
  } catch (error) {
    console.error('Błąd generowania rekomendacji:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas generowania rekomendacji'
    });
  }
});



function analyzeTags(offers) {
  const result = {
    musicStyles: [],
    eventTypes: [],
    instruments: [],
    performerTypes: []
  };

  const allMusicStyles = {};
  const allEventTypes = {};
  const allInstruments = {};
  const allPerformerTypes = {};

  offers.forEach(offer => {
    
    (offer.musicStyles || []).forEach(style => {
      allMusicStyles[style] = (allMusicStyles[style] || 0) + 1;
    });

    
    (offer.eventTypes || []).forEach(type => {
      allEventTypes[type] = (allEventTypes[type] || 0) + 1;
    });

    
    (offer.instruments || []).forEach(instrument => {
      allInstruments[instrument] = (allInstruments[instrument] || 0) + 1;
    });

    
    if (offer.performerType) {
      allPerformerTypes[offer.performerType] = (allPerformerTypes[offer.performerType] || 0) + 1;
    }
  });

  
  result.musicStyles = Object.entries(allMusicStyles).map(([tag, count]) => ({ tag, count }));
  result.eventTypes = Object.entries(allEventTypes).map(([tag, count]) => ({ tag, count }));
  result.instruments = Object.entries(allInstruments).map(([tag, count]) => ({ tag, count }));
  result.performerTypes = Object.entries(allPerformerTypes).map(([tag, count]) => ({ tag, count }));

  return result;
}

function mergeTagArrays(baseArray, newArray, weight = 1) {
  const merged = [...baseArray];

  newArray.forEach(newItem => {
    const existingItem = merged.find(item => item.tag === newItem.tag);
    if (existingItem) {
      existingItem.count += newItem.count * weight;
    } else {
      merged.push({
        tag: newItem.tag,
        count: newItem.count * weight
      });
    }
  });

  return merged;
}

function calculatePriceRange(offers) {
  if (offers.length === 0) return { min: null, max: null };

  const prices = offers.map(offer => offer.price?.min || 0)
    .concat(offers.map(offer => offer.price?.max || 0))
    .filter(price => price > 0);

  if (prices.length === 0) return { min: null, max: null };

  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };
}

function mergePriceRanges(range1, range2) {
  if (!range1.min && !range1.max) return range2;
  if (!range2.min && !range2.max) return range1;

  return {
    min: Math.min(range1.min || Infinity, range2.min || Infinity),
    max: Math.max(range1.max || 0, range2.max || 0)
  };
}

function calculateOfferScore(offer, userPreferences) {
  let score = 0;

  
  const musicStyleMatch = calculateTagMatchScore(
    offer.musicStyles || [],
    userPreferences.preferredMusicStyles,
    userPreferences.categoryWeights.musicStyles
  );

  
  const eventTypeMatch = calculateTagMatchScore(
    offer.eventTypes || [],
    userPreferences.preferredEventTypes,
    userPreferences.categoryWeights.eventTypes
  );

  
  const instrumentMatch = calculateTagMatchScore(
    offer.instruments || [],
    userPreferences.preferredInstruments,
    userPreferences.categoryWeights.instruments
  );

  
  const performerTypeMatch = userPreferences.preferredPerformerTypes.some(
    pref => pref.tag === offer.performerType
  ) ? userPreferences.categoryWeights.performerType * 0.5 : 0;

  
  const priceMatch = calculatePriceMatchScore(
    offer.price,
    userPreferences.priceRange
  );

  
  const popularityScore = (offer.averageRating || 0) / 5 * 0.2;

  
  score = musicStyleMatch + eventTypeMatch + instrumentMatch +
    performerTypeMatch + priceMatch + popularityScore;

  return score;
}

function calculateTagMatchScore(offerTags, preferredTags, categoryWeight) {
  if (preferredTags.length === 0 || offerTags.length === 0) return 0;

  
  const maxPreferenceCount = Math.max(...preferredTags.map(t => t.count));

  let matchScore = 0;

  offerTags.forEach(tag => {
    const preference = preferredTags.find(t => t.tag === tag);
    if (preference) {
      
      const tagRank = preferredTags.findIndex(t => t.tag === tag);
      const positionWeight = tagRank < 3 ? 1.5 : 1;

      matchScore += (preference.count / maxPreferenceCount) * positionWeight;
    }
  });

  
  const normalizedScore = matchScore / offerTags.length;
  return normalizedScore * categoryWeight;
}

function calculatePriceMatchScore(offerPrice, userPriceRange) {
  if (!userPriceRange.min && !userPriceRange.max) return 0;
  if (!offerPrice || !offerPrice.min) return 0;

  const offerMin = offerPrice.min;
  const userMin = userPriceRange.min || 0;
  const userMax = userPriceRange.max || Infinity;

  if (offerMin >= userMin && offerMin <= userMax) {
    
    return 0.3;
  } else if (offerMin < userMin) {
    
    const difference = userMin - offerMin;
    const penalty = Math.min(difference / userMin, 1); 
    return 0.3 * (1 - penalty * 0.5); 
  } else {
    
    const difference = offerMin - userMax;
    const penalty = Math.min(difference / userMax, 1); 
    return 0.3 * (1 - penalty * 0.8); 
  }
}


router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regexPattern = new RegExp(escapedQuery.split('').join('.*'), 'i');

    const filter = {
      status: 'active',
      $or: [
        { artistName: { $regex: regexPattern } },
        { description: { $regex: regexPattern } },
        { musicStyles: { $in: [regexPattern] } },
        { eventTypes: { $in: [regexPattern] } },
        { instruments: { $in: [regexPattern] } }
      ]
    };

    const [offers, totalCount] = await Promise.all([
      req.db.collection('offers')
        .aggregate([
          { $match: filter },
          {
            $lookup: {
              from: 'ratings',
              localField: '_id',
              foreignField: 'offerId',
              as: 'ratings'
            }
          },
          {
            $addFields: {
              averageRating: {
                $avg: '$ratings.rating'
              }
            }
          },
          { $sort: { averageRating: -1 } },
          { $skip: skip },
          { $limit: limit }
        ])
        .toArray(),
      req.db.collection('offers').countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      offers: offers.map(offer => ({
        ...offer,
        _id: offer._id.toString(),
        userId: offer.userId.toString()
      })),
      totalCount
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});


router.get('/active', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = parseInt(req.query.sortOrder) || -1;

    
    const filter = { status: 'active' };

    
    if (req.query.gatunek) {
      filter.musicStyles = { $in: req.query.gatunek.split(',') };
    }
    if (req.query.wydarzenie) {
      filter.eventTypes = { $in: req.query.wydarzenie.split(',') };
    }
    if (req.query.skład) {
      filter.performerType = { $in: req.query.skład.split(',') };
    }
    if (req.query.instrumenty) {
      filter.instruments = { $in: req.query.instrumenty.split(',') };
    }

    
    if (req.query.minPrice) {
      filter['price.min'] = { $gte: parseFloat(req.query.minPrice) };
    }
    if (req.query.maxPrice) {
      filter['price.max'] = { $lte: parseFloat(req.query.maxPrice) };
    }

    
    if (req.query.minDuration) {
      filter['duration.min'] = { $gte: parseInt(req.query.minDuration) };
    }
    if (req.query.maxDuration) {
      filter['duration.max'] = { $lte: parseInt(req.query.maxDuration) };
    }

    
    const sortOptions = {
      createdAt: { createdAt: sortOrder },
      price: { 'price.min': sortOrder },
      rating: { averageRating: sortOrder },
      comments: { commentsCount: sortOrder }
    };

    
    const sort = sortOptions[sortBy] || sortOptions.createdAt;

    
    const [offers, totalCount] = await Promise.all([
      req.db.collection('offers')
        .aggregate([
          { $match: filter },
          {
            $lookup: {
              from: 'ratings',
              localField: '_id',
              foreignField: 'offerId',
              as: 'ratings'
            }
          },
          {
            $lookup: {
              from: 'comments',
              localField: '_id',
              foreignField: 'offerId',
              as: 'comments'
            }
          },
          {
            $addFields: {
              averageRating: {
                $avg: {
                  $map: {
                    input: '$ratings',
                    as: 'r',
                    in: '$$r.rating'
                  }
                }
              },
              commentsCount: { $size: '$comments' }
            }
          },
          { $sort: sort },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              ratings: 0,
              comments: 0
            }
          }
        ])
        .toArray(),
      req.db.collection('offers').countDocuments(filter)
    ]);

    
    const offersWithDetails = await Promise.all(
      offers.map(async (offer) => {
        
        const ratings = await req.db.collection('ratings')
          .aggregate([
            { $match: { offerId: offer._id } },
            { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } }
          ])
          .toArray();

        
        const commentsCount = await req.db.collection('comments')
          .countDocuments({ offerId: offer._id });

        return {
          ...offer,
          _id: offer._id.toString(),
          userId: offer.userId.toString(),
          averageRating: ratings[0]?.average || 0,
          ratingsCount: ratings[0]?.count || 0,
          commentsCount: commentsCount || 0
        };
      })
    );

    res.status(200).json({
      success: true,
      offers: offersWithDetails,
      totalCount
    });
  } catch (error) {
    console.error('Błąd pobierania aktywnych ofert:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania ofert'
    });
  }
});


router.post('/', authenticate, upload.fields([
  { name: 'photos', maxCount: 5 },
  { name: 'audioDemo', maxCount: 1 }
]), async (req, res) => {
  const session = req.dbClient.startSession();
  try {
    const {
      artistName,
      performerType,
      location,
      email,
      phone,
      description,
      musicStyles,
      eventTypes,
      instruments,
      priceMin,
      priceMax,
      durationMin,
      durationMax,
      videoDemo,
      availability
    } = req.body;

    
    if (!artistName || !performerType || !location) {
      return res.status(400).json({ success: false, message: 'Wypełnij wymagane pola' });
    }

    session.startTransaction();

    
    let photoIds = [];
    if (req.files['photos']) {
      for (const photo of req.files['photos']) {
        const fileId = await saveFileToGridFS(req.gridFSBucket, photo, 'photos');
        photoIds.push(fileId);
      }
    }

    
    let audioDemoId = null;
    if (req.files['audioDemo']) {
      audioDemoId = await saveFileToGridFS(req.gridFSBucket, req.files['audioDemo'][0], 'audio');
    }

    
    const newOffer = {
      userId: new ObjectId(req.user.id),
      artistName,
      performerType,
      location,
      email,
      phone,
      description,
      musicStyles: JSON.parse(musicStyles),
      eventTypes: JSON.parse(eventTypes),
      instruments: JSON.parse(instruments),
      price: {
        min: parseFloat(priceMin),
        max: parseFloat(priceMax)
      },
      duration: {
        min: parseInt(durationMin),
        max: parseInt(durationMax)
      },
      photos: photoIds,
      audioDemo: audioDemoId,
      videoDemo,
      availability,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await req.db.collection('offers').insertOne(newOffer, { session });
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Ogłoszenie zostało dodane',
      offerId: result.insertedId
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Błąd dodawania ogłoszenia:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas dodawania ogłoszenia' });
  } finally {
    session.endSession();
  }
});


router.get('/my-offers', authenticate, async (req, res) => {
  try {
    
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Nieautoryzowany dostęp',
        offers: []
      });
    }

    
    const offers = await req.db.collection('offers')
      .find({
        userId: new ObjectId(req.user.id)
      })
      .sort({ createdAt: -1 }) 
      .toArray();

    
    const offersWithFiles = await Promise.all(
      offers.map(async (offer) => {
        try {
          const bucket = new GridFSBucket(req.db, { bucketName: 'uploads' });

          
          const photosInfo = await Promise.all(
            (offer.photos || []).map(async (photoId) => {
              try {
                const file = await bucket.find({ _id: new ObjectId(photoId) }).next();
                return file ? {
                  id: photoId.toString(),
                  url: `/api/files/${photoId.toString()}`,
                  name: file.filename,
                  size: file.length,
                  type: file.contentType
                } : null;
              } catch (error) {
                console.error(`Błąd pobierania zdjęcia ${photoId}:`, error);
                return null;
              }
            })
          );

          
          let audioInfo = null;
          if (offer.audioDemo) {
            try {
              const audioFile = await bucket.find({ _id: new ObjectId(offer.audioDemo) }).next();
              if (audioFile) {
                audioInfo = {
                  id: offer.audioDemo.toString(),
                  url: `/api/files/${offer.audioDemo.toString()}`,
                  originalName: audioFile.metadata?.originalName || audioFile.filename,
                  name: audioFile.filename,
                  size: audioFile.length,
                  type: audioFile.contentType
                };
              }
            } catch (error) {
              console.error(`Błąd pobierania audio ${offer.audioDemo}:`, error);
            }
          }

          
          return {
            ...offer,
            _id: offer._id.toString(),
            userId: offer.userId.toString(),
            photos: photosInfo.filter(photo => photo !== null),
            audioDemo: audioInfo
          };
        } catch (error) {
          console.error(`Błąd przetwarzania oferty ${offer._id}:`, error);
          return {
            ...offer,
            _id: offer._id.toString(),
            userId: offer.userId.toString(),
            photos: [],
            audioDemo: null
          };
        }
      })
    );

    
    res.status(200).json({
      success: true,
      message: 'Pobrano oferty użytkownika',
      offers: offersWithFiles || [] 
    });

  } catch (error) {
    console.error('Błąd w endpointcie /my-offers:', error);
    res.status(500).json({
      success: false,
      message: 'Wewnętrzny błąd serwera',
      offers: [] 
    });
  }
});


router.get('/:id/user-rating', authenticate, async (req, res) => {
  try {
    const rating = await req.db.collection('ratings').findOne({
      offerId: new ObjectId(req.params.id),
      userId: new ObjectId(req.user.id)
    });

    res.status(200).json({
      success: true,
      rating: rating?.rating || 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});


router.delete('/:id', authenticate, async (req, res) => {
  const session = req.dbClient.startSession();
  try {
    const offerId = new ObjectId(req.params.id);

    session.startTransaction();

    
    const offer = await req.db.collection('offers').findOne(
      { _id: offerId },
      { session }
    );

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Oferta nie znaleziona' });
    }

    if (!offer.userId.equals(new ObjectId(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Brak uprawnień' });
    }

    
    const bucket = new GridFSBucket(req.db, { bucketName: 'uploads' });

    
    await Promise.all(
      (offer.photos || []).map(photoId =>
        bucket.delete(new ObjectId(photoId)).catch(() => { })
      )
    );
    
    if (offer.audioDemo) {
      await bucket.delete(new ObjectId(offer.audioDemo)).catch(() => { });
    }

    
    await req.db.collection('offers').deleteOne(
      { _id: offerId },
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Oferta została usunięta'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Błąd usuwania oferty:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas usuwania oferty'
    });
  } finally {
    session.endSession();
  }
});


router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const offerId = new ObjectId(req.params.id);
    const { active } = req.body;

    
    const offer = await req.db.collection('offers').findOne({
      _id: offerId,
      userId: new ObjectId(req.user.id)
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta nie znaleziona lub brak uprawnień'
      });
    }

    
    const result = await req.db.collection('offers').updateOne(
      { _id: offerId },
      {
        $set: {
          status: active ? 'active' : 'inactive',
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nie udało się zaktualizować statusu'
      });
    }

    res.status(200).json({
      success: true,
      message: `Oferta ${active ? 'aktywna' : 'wygasła'}`,
      status: active ? 'active' : 'inactive'
    });
  } catch (error) {
    console.error('Błąd aktualizacji statusu:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas aktualizacji statusu'
    });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const offerId = new ObjectId(req.params.id);

    
    const isOwner = req.user?.id &&
      await req.db.collection('offers').countDocuments({
        _id: offerId,
        userId: new ObjectId(req.user.id)
      }) > 0;

    
    const offer = await req.db.collection('offers').findOne({
      _id: offerId,
      $or: [
        { status: 'active' },
        ...(isOwner ? [{ status: 'inactive' }] : [])
      ]
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta nie znaleziona'
      });
    }

    
    const ratings = await req.db.collection('ratings').aggregate([
      { $match: { offerId: offer._id } },
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    
    let photosWithInfo = offer.photos || [];
    let audioInfo = offer.audioDemo || null;

    if (isOwner) {
      const bucket = new GridFSBucket(req.db, { bucketName: 'uploads' });

      photosWithInfo = await Promise.all(
        (offer.photos || []).map(async photoId => {
          const file = await bucket.find({ _id: new ObjectId(photoId) }).next();
          return file ? {
            id: photoId.toString(),
            url: `/api/files/${photoId.toString()}`,
            name: file.filename,
            size: file.length,
            type: file.contentType
          } : null;
        })
      );

      if (offer.audioDemo) {
        const audioFile = await bucket.find({ _id: new ObjectId(offer.audioDemo) }).next();
        if (audioFile) {
          audioInfo = {
            id: offer.audioDemo.toString(),
            url: `/api/files/${offer.audioDemo.toString()}`,
            originalName: audioFile.metadata?.originalName || audioFile.filename,
            name: audioFile.filename,
            size: audioFile.length,
            type: audioFile.contentType
          };
        }
      }
    }

    res.status(200).json({
      success: true,
      offer: {
        ...offer,
        _id: offer._id.toString(),
        userId: offer.userId.toString(),
        photos: photosWithInfo,
        audioDemo: audioInfo,
        averageRating: ratings[0]?.average || 0,
        ratingsCount: ratings[0]?.count || 0,
        musicStyles: offer.musicStyles || [],
        eventTypes: offer.eventTypes || [],
        instruments: offer.instruments || []
      },
      
      isOwner: !!isOwner
    });
  } catch (error) {
    console.error('Błąd pobierania oferty:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania oferty'
    });
  }
});


router.post('/:id/ratings', authenticate, async (req, res) => {
  try {
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Nieprawidłowa ocena' });
    }

    await req.db.collection('ratings').updateOne(
      {
        offerId: new ObjectId(req.params.id),
        userId: new ObjectId(req.user.id)
      },
      {
        $set: {
          rating: parseInt(rating),
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Błąd dodawania oceny:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd' });
  }
});


router.get('/:id/name', async (req, res) => {
  try {
    const offer = await req.db.collection('offers').findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { artistName: 1 } }
    );

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta nie znaleziona'
      });
    }

    res.status(200).json({
      success: true,
      artistName: offer.artistName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania nazwy oferty'
    });
  }
});


router.put('/:id', authenticate, upload.fields([
  { name: 'photos', maxCount: 5 },
  { name: 'audioDemo', maxCount: 1 }
]), async (req, res) => {
  const session = req.dbClient.startSession();
  try {
    const offerId = new ObjectId(req.params.id);

    
    let musicStyles = [];
    let eventTypes = [];
    let instruments = [];
    try {
      if (req.body.musicStyles) {
        musicStyles = typeof req.body.musicStyles === 'string'
          ? JSON.parse(req.body.musicStyles.replace(/^"|"$/g, ''))
          : req.body.musicStyles;
      }

      if (req.body.eventTypes) {
        eventTypes = typeof req.body.eventTypes === 'string'
          ? JSON.parse(req.body.eventTypes.replace(/^"|"$/g, ''))
          : req.body.eventTypes;
      }

      if (req.body.instruments) {
        instruments = typeof req.body.instruments === 'string'
          ? JSON.parse(req.body.instruments.replace(/^"|"$/g, ''))
          : req.body.instruments;
      }
    } catch (parseError) {
      console.error('Błąd parsowania danych:', parseError);
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy format danych'
      });
    }

    const {
      artistName,
      performerType,
      location,
      email,
      phone,
      description,
      priceMin,
      priceMax,
      durationMin,
      durationMax,
      videoDemo,
      availability,
      existingPhotos 
    } = req.body;

    session.startTransaction();

    
    const existingOffer = await req.db.collection('offers').findOne(
      { _id: offerId, userId: new ObjectId(req.user.id) },
      { session }
    );

    if (!existingOffer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta nie znaleziona lub brak uprawnień'
      });
    }

    const bucket = new GridFSBucket(req.db, { bucketName: 'uploads' });

    
    let allPhotoIds = [...existingOffer.photos]; 

    
    if (existingPhotos) {
      let parsedExistingPhotos = [];
      try {
        parsedExistingPhotos = typeof existingPhotos === 'string'
          ? JSON.parse(existingPhotos.replace(/^"|"$/g, ''))
          : existingPhotos;
      } catch (e) {
        console.error('Błąd parsowania existingPhotos:', e);
      }

      
      if (Array.isArray(parsedExistingPhotos) && parsedExistingPhotos.length > 0) {
        
        const existingPhotoStrings = existingOffer.photos.map(id => id.toString());

        
        const photosToDelete = existingOffer.photos.filter(photoId =>
          !parsedExistingPhotos.includes(photoId.toString())
        );

        
        await Promise.all(
          photosToDelete.map(photoId =>
            bucket.delete(new ObjectId(photoId)).catch(e =>
              console.error('Błąd usuwania zdjęcia:', e))
          ));

        
        allPhotoIds = existingOffer.photos.filter(photoId =>
          parsedExistingPhotos.includes(photoId.toString())
        );
      }
    }

    
    if (req.files['photos']) {
      for (const file of req.files['photos']) {
        try {
          const fileId = await saveFileToGridFS(bucket, file, 'photos');
          allPhotoIds.push(fileId);
        } catch (e) {
          console.error('Błąd zapisywania nowego zdjęcia:', e);
        }
      }
    }

    
    let audioDemoId = existingOffer.audioDemo;
    if (req.files['audioDemo']) {
      if (audioDemoId) {
        await bucket.delete(new ObjectId(audioDemoId)).catch(() => { });
      }
      audioDemoId = await saveFileToGridFS(bucket, req.files['audioDemo'][0], 'audio');
    } else if (req.body.existingAudioDemo === 'null') {
      if (audioDemoId) {
        await bucket.delete(new ObjectId(audioDemoId)).catch(() => { });
      }
      audioDemoId = null;
    }

    const updatedOffer = {
      artistName,
      performerType,
      location,
      email,
      phone,
      description,
      musicStyles,
      eventTypes,
      instruments,
      price: {
        min: parseFloat(priceMin),
        max: parseFloat(priceMax)
      },
      duration: {
        min: parseInt(durationMin),
        max: parseInt(durationMax)
      },
      photos: allPhotoIds,
      audioDemo: audioDemoId,
      videoDemo,
      availability,
      updatedAt: new Date()
    };

    await req.db.collection('offers').updateOne(
      { _id: offerId },
      { $set: updatedOffer },
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Oferta została zaktualizowana',
      offerId: offerId.toString()
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Błąd aktualizacji oferty:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas aktualizacji oferty',
      error: error.message
    });
  } finally {
    session.endSession();
  }
});

export default router;