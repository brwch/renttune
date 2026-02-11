import express from 'express';
import { ObjectId } from 'mongodb';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const deleteCommentAndReplies = async (db, commentId) => {
  const commentsToDelete = await db.collection('comments').find({
    $or: [
      { _id: new ObjectId(commentId) },
      { parentId: new ObjectId(commentId) }
    ]
  }).toArray();

  const deleteResult = await db.collection('comments').deleteMany({
    $or: [
      { _id: new ObjectId(commentId) },
      { parentId: new ObjectId(commentId) }
    ]
  });

  return deleteResult;
};


router.get('/:offerId', async (req, res) => {
  try {
    const { offerId } = req.params;
    const { sort } = req.query || 'newest';

    if (!ObjectId.isValid(offerId)) {
      return res.status(400).json({ success: false, message: 'Nieprawidłowy identyfikator oferty' });
    }

    const query = { offerId: new ObjectId(offerId) };

    
    if (sort === 'owner') {
      query.type = 'owner';
    } else if (sort === 'client') {
      query.type = 'client';
    } else if (sort === 'other') {
      query.type = { $nin: ['owner', 'client'] };
    }

    let sortOptions = { createdAt: -1 };

    if (sort === 'top-rated') {
      sortOptions = { likes: -1 };
    }

    
    const allComments = await req.db.collection('comments')
      .find(query)
      .sort(sortOptions)
      .toArray();

    
    const formattedComments = formatComments(allComments);
    const mainComments = formattedComments.filter(c => !c.parentId);
    const replies = formattedComments.filter(c => c.parentId);

    
    const commentsWithReplies = mainComments.map(comment => ({
      ...comment,
      replies: replies
        .filter(reply => reply.parentId.toString() === comment._id.toString())
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    }));

    res.status(200).json({
      success: true,
      comments: commentsWithReplies
    });
  } catch (error) {
    console.error('Błąd pobierania komentarzy:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd' });
  }
});


function formatComments(comments) {
  return comments.map(comment => ({
    ...comment,
    _id: comment._id.toString(),
    offerId: comment.offerId.toString(),
    userId: comment.userId.toString(),
    authorName: comment.authorName || 'Anonim',
    likes: comment.likes || 0,
    likedBy: (comment.likedBy || []).map(id => id.toString())
  }));
}


router.post('/:offerId', authenticate, async (req, res) => {
  try {
    
    if (!req.body || (typeof req.body.content !== 'string' && typeof req.body.content?.text !== 'string')) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy format danych. Oczekiwano obiektu z polem "content" typu string.'
      });
    }

    const content = typeof req.body.content === 'string'
      ? req.body.content
      : req.body.content?.text;
    const parentId = typeof req.body.content === 'string'
      ? req.body.parentId
      : req.body.content?.parentId;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Brak treści komentarza'
      });
    }

    const trimmedContent = content.trim();

    if (!trimmedContent || trimmedContent.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Komentarz jest zbyt krótki (min. 3 znaki)'
      });
    }

    
    const offer = await req.db.collection('offers').findOne({
      _id: new ObjectId(req.params.offerId)
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta nie znaleziona'
      });
    }

    const isOwner = offer.userId.equals(new ObjectId(req.user.id));

    
    const hasUsedService = await req.db.collection('bookings').countDocuments({
      offerId: new ObjectId(req.params.offerId),
      clientId: new ObjectId(req.user.id),
      status: 'confirmed'
    }) > 0;

    const commentType = isOwner ? 'owner' : hasUsedService ? 'client' : 'other';

    
    const user = await req.db.collection('profiles').findOne({
      userId: new ObjectId(req.user.id)
    });

    const newComment = {
      offerId: new ObjectId(req.params.offerId),
      userId: new ObjectId(req.user.id),
      authorName: user?.displayName || 'Anonim',
      content: trimmedContent,
      type: commentType,
      createdAt: new Date(),
      parentId: parentId ? new ObjectId(parentId) : null,
      likes: 0,
      likedBy: []
    };

    const result = await req.db.collection('comments').insertOne(newComment);

    res.status(201).json({
      success: true,
      comment: {
        ...newComment,
        _id: result.insertedId.toString(),
        offerId: newComment.offerId.toString(),
        userId: newComment.userId.toString(),
        parentId: newComment.parentId?.toString()
      }
    });

  } catch (error) {
    console.error('Błąd dodawania komentarza:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas dodawania komentarza',
      error: error.message
    });
  }
});


router.delete('/:commentId', authenticate, async (req, res) => {
  try {
    const comment = await req.db.collection('comments').findOne({
      _id: new ObjectId(req.params.commentId)
    });

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Komentarz nie znaleziony' });
    }

    
    if (!comment.userId.equals(new ObjectId(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Brak uprawnień' });
    }

    
    const result = await deleteCommentAndReplies(req.db, req.params.commentId);

    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Błąd usuwania komentarza:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd' });
  }
});


router.post('/:commentId/like', authenticate, async (req, res) => {
  try {
    const commentId = new ObjectId(req.params.commentId);
    const userId = new ObjectId(req.user.id);

    
    const comment = await req.db.collection('comments').findOne({
      _id: commentId
    });

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Komentarz nie znaleziony' });
    }

    
    const isLiked = comment.likedBy?.some(id => id.equals(userId)) || false;

    
    const update = isLiked
      ? {
        $pull: { likedBy: userId },
        $inc: { likes: -1 }
      }
      : {
        $addToSet: { likedBy: userId },
        $inc: { likes: 1 }
      };

    
    const result = await req.db.collection('comments').updateOne(
      { _id: commentId },
      update
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ success: false, message: 'Nie udało się zaktualizować' });
    }

    res.status(200).json({
      success: true,
      action: isLiked ? 'unliked' : 'liked'
    });

  } catch (error) {
    console.error('Błąd:', error);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});


router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const comments = await req.db.collection('comments').find({
      userId: new ObjectId(req.params.userId)
    }).toArray();

    res.status(200).json({
      success: true,
      comments: formatComments(comments)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

export default router;