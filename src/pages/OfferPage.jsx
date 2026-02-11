import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, MessageSquare, Heart, MapPin, Music, DollarSign, Clock, ChevronLeft, ChevronRight, Mail, Phone, Calendar, Trash2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import Modal from '../components/Modal';
import BookingForm from '../components/BookingForm';
import LabelBadge from '../components/LabelBadge';
import AudioPlayer from '../components/AudioPlayer';
import './OfferPage.css';

const performerTypeOptions = [
    { value: 'solo', label: 'Solista' },
    { value: 'duet', label: 'Duet' },
    { value: 'band', label: 'Zespół' },
    { value: 'dj', label: 'DJ' },
    { value: 'trio', label: 'Trio' },
    { value: 'kwartet', label: 'Kwartet' },
    { value: 'kwintet', label: 'Kwintet' },
    { value: 'sextet', label: 'Sekstet' },
    { value: 'orkiestra', label: 'Orkiestra' },
    { value: 'chór', label: 'Chór' }
];

const OfferPage = () => {
    const { id } = useParams();
    const { user } = useUser();
    const navigate = useNavigate();
    const [offer, setOffer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [comments, setComments] = useState([]);
    const [userData, setUserData] = useState(null);
    const [commentAuthors, setCommentAuthors] = useState({});
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [commentsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOption, setSortOption] = useState('newest');
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const youtubeRef = useRef(null);

    const [replyingTo, setReplyingTo] = useState(null);
    const [replyContent, setReplyContent] = useState('');

    // Paginacja
    const indexOfLastComment = currentPage * commentsPerPage;
    const indexOfFirstComment = indexOfLastComment - commentsPerPage;
    const currentComments = comments.slice(indexOfFirstComment, indexOfLastComment);
    const totalPages = Math.ceil(comments.length / commentsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    useEffect(() => {
        setCurrentPage(1);
    }, [sortOption]);

    useEffect(() => {
        const fetchOffer = async () => {
            try {
                setLoading(true);
                const headers = user?.token ? {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                } : {};

                const [offerResponse, commentsResponse, userRatingResponse] = await Promise.all([
                    fetch(`http://localhost:5000/api/offers/${id}`, { headers }),
                    fetch(`http://localhost:5000/api/comments/${id}?sort=${sortOption}`, { headers }),
                    user?.token ? fetch(`http://localhost:5000/api/offers/${id}/user-rating`, { headers }) : Promise.resolve(null)
                ]);

                if (!offerResponse.ok) throw new Error('Nie znaleziono oferty');

                const offerData = await offerResponse.json();
                const commentsData = await commentsResponse.json();

                // Pobierz dane właściciela oferty
                if (offerData.offer?.userId) {
                    const ownerResponse = await fetch(`http://localhost:5000/api/user/${offerData.offer.userId}`, { headers });
                    const ownerData = await ownerResponse.json();
                    setUserData(ownerData);
                }

                setOffer(offerData.offer);
                setComments(commentsData.comments || []);

                // Pobierz dane autorów komentarzy
                if (commentsData.comments?.length > 0) {
                    const uniqueUserIds = [...new Set(commentsData.comments.map(c => c.userId))];
                    const authorsData = await Promise.all(
                        uniqueUserIds.map(userId =>
                            fetch(`http://localhost:5000/api/user/${userId}`, { headers })
                                .then(res => res.json())
                                .catch(() => null)
                        )
                    );

                    const authorsMap = {};
                    authorsData.forEach((author, index) => {
                        if (author) {
                            authorsMap[uniqueUserIds[index]] = author;
                        }
                    });
                    setCommentAuthors(authorsMap);
                }

                if (user?.token && userRatingResponse) {
                    const ratingData = await userRatingResponse.json();
                    setRating(ratingData.rating || 0);
                }

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchOffer();
        }
    }, [id, user?.token, user?.id, sortOption]);

    useEffect(() => {
        const checkFavorite = async () => {
            if (!user?.token) return;

            try {
                const response = await fetch(`http://localhost:5000/api/favorites/${id}/check`, {
                    headers: {
                        'Authorization': `Bearer ${user.token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setIsFavorite(data.isFavorite);
                }
            } catch (err) {
                console.error('Błąd sprawdzania ulubionych:', err);
            }
        };

        checkFavorite();
    }, [user?.token, id]);

    const handlePrevImage = () => {
        setCurrentImageIndex(prev =>
            prev === 0 ? (offer.photos.length - 1) : prev - 1
        );
    };

    const handleNextImage = () => {
        setCurrentImageIndex(prev =>
            prev === (offer.photos.length - 1) ? 0 : prev + 1
        );
    };

    const handleSubmitRating = async (e) => {
        e.preventDefault();
        if (!user?.token) return navigate('/login');

        try {
            const response = await fetch(`http://localhost:5000/api/offers/${id}/ratings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ rating })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Nie udało się zapisać oceny');
            }

            const offerResponse = await fetch(`http://localhost:5000/api/offers/${id}`);
            const offerData = await offerResponse.json();
            setOffer(offerData.offer);

        } catch (err) {
            console.error('Błąd przy ocenianiu:', err);
            alert(err.message || 'Wystąpił błąd podczas zapisywania oceny');
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!user?.token) return navigate('/login');

        try {
            const response = await fetch(`http://localhost:5000/api/comments/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    content: {
                        text: comment,
                        parentId: null
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Nie udało się dodać komentarza');
            }

            // Odśwież komentarze
            const updatedCommentsResponse = await fetch(`http://localhost:5000/api/comments/${id}?sort=${sortOption}`);
            const updatedCommentsData = await updatedCommentsResponse.json();
            setComments(updatedCommentsData.comments || []);

            setComment('');

        } catch (err) {
            console.error('Błąd przy dodawaniu komentarza:', err);
            alert(err.message || 'Wystąpił błąd podczas dodawania komentarza');
        }
    };

    const handleSubmitReply = async (e, parentId) => {
        e.preventDefault();
        if (!user?.token) return navigate('/login');

        try {
            const response = await fetch(`http://localhost:5000/api/comments/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    content: {
                        text: replyContent[parentId] || '',
                        parentId: parentId
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Nie udało się dodać odpowiedzi');
            }

            // Odśwież komentarze
            const updatedCommentsResponse = await fetch(`http://localhost:5000/api/comments/${id}?sort=${sortOption}`);
            const updatedCommentsData = await updatedCommentsResponse.json();
            setComments(updatedCommentsData.comments || []);

            setReplyContent(prev => ({
                ...prev,
                [parentId]: ''
            }));
            setReplyingTo(null);

        } catch (err) {
            console.error('Błąd przy dodawaniu odpowiedzi:', err);
            alert(err.message || 'Wystąpił błąd podczas dodawania odpowiedzi');
        }
    };

    const handleLikeComment = async (commentId) => {
        if (!user?.token) return navigate('/login');

        try {
            const response = await fetch(
                `http://localhost:5000/api/comments/${commentId}/like`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) throw new Error('Operacja nie powiodła się');

            const data = await response.json();

            // Pobierz zaktualizowaną listę komentarzy
            const updatedCommentsResponse = await fetch(`http://localhost:5000/api/comments/${id}?sort=${sortOption}`);
            const updatedCommentsData = await updatedCommentsResponse.json();
            setComments(updatedCommentsData.comments || []);

        } catch (err) {
            console.error('Błąd:', err);
            alert(err.message);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Czy na pewno chcesz usunąć ten komentarz?')) return;

        try {
            const response = await fetch(
                `http://localhost:5000/api/comments/${commentId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${user.token}`
                    }
                }
            );

            if (!response.ok) throw new Error('Nie udało się usunąć komentarza');

            // Pobierz zaktualizowaną listę komentarzy
            const updatedCommentsResponse = await fetch(`http://localhost:5000/api/comments/${id}?sort=${sortOption}`);
            const updatedCommentsData = await updatedCommentsResponse.json();
            setComments(updatedCommentsData.comments || []);

        } catch (err) {
            console.error('Błąd:', err);
            alert(err.message);
        }
    };

    const handleToggleFavorite = async () => {
        if (!user?.token) return navigate('/login');

        setFavoriteLoading(true);
        try {
            const method = isFavorite ? 'DELETE' : 'POST';
            const response = await fetch(`http://localhost:5000/api/favorites/${id}`, {
                method,
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setIsFavorite(!isFavorite);
            }
        } catch (err) {
            console.error('Błąd aktualizacji ulubionych:', err);
        } finally {
            setFavoriteLoading(false);
        }
    };

    const handleBookingClick = () => {
        if (!user?.token) {
            navigate('/login');
            return;
        }

        // Sprawdź typ konta użytkownika
        fetch('http://localhost:5000/api/profile', {
            headers: {
                'Authorization': `Bearer ${user.token}`
            }
        })
            .then(res => res.json())
            .then(profileData => {
                if (profileData.accountType === 'musician' || user.id === offer.userId) {
                    alert('Tylko klienci mogą składać rezerwacje');
                } else {
                    setShowBookingModal(true);
                }
            })
            .catch(error => {
                console.error('Błąd sprawdzania profilu:', error);
                alert('Wystąpił błąd podczas sprawdzania uprawnień');
            });
    };

    const getYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const youtubeId = offer?.videoDemo ? getYouTubeId(offer.videoDemo) : null;

    if (loading) {
        return (
            <div className="offer-loading-container">
                <div className="offer-loading-spinner"></div>
                <p>Ładowanie oferty...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="offer-error-container">
                <div className="offer-error-icon">!</div>
                <h3>Wystąpił błąd</h3>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>Spróbuj ponownie</button>
            </div>
        );
    }

    if (!offer) {
        return (
            <div className="offer-not-found-container">
                <h3>Oferta nie znaleziona</h3>
                <p>Przepraszamy, ale nie możemy znaleźć żądanej oferty.</p>
                <button onClick={() => navigate('/')}>Wróć do strony głównej</button>
            </div>
        );
    }

    return (
        <div className="offer-container">
            <div className="offer-header">
                <h1>{offer.artistName}</h1>
                <p className="offer-user">
                    Dodane przez: {' '}
                    <Link to={`/profile/${offer.userId}`} className="offer-user-link">
                        {userData?.displayName || 'Anonim'}
                    </Link>
                </p>
            </div>

            <div className="offer-content-grid">
                <div className="offer-main-section">
                    {offer.photos?.length > 0 && (
                        <div className="offer-gallery">
                            <div className="gallery-main">
                                <img
                                    src={`http://localhost:5000/api/files/${offer.photos[currentImageIndex]}`}
                                    alt={`${offer.artistName} - zdjęcie ${currentImageIndex + 1}`}
                                />
                                {offer.photos.length > 1 && (
                                    <>
                                        <button className="gallery-nav prev" onClick={handlePrevImage}>
                                            <ChevronLeft size={32} />
                                        </button>
                                        <button className="gallery-nav next" onClick={handleNextImage}>
                                            <ChevronRight size={32} />
                                        </button>
                                    </>
                                )}
                            </div>
                            {offer.photos.length > 1 && (
                                <div className="gallery-thumbnails">
                                    {offer.photos.map((photo, index) => (
                                        <div
                                            key={index}
                                            className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                                            onClick={() => setCurrentImageIndex(index)}
                                        >
                                            <img
                                                src={`http://localhost:5000/api/files/${photo}`}
                                                alt={`Miniatura ${index + 1}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="offer-description-section">
                        <h2>Opis oferty</h2>
                        <p>{offer.description}</p>
                    </div>

                    <div className="offer-reviews-section">
                        <div className="section-header">
                            <h2>Opinie</h2>
                            <div className="rating-summary">
                                <Star fill="currentColor" />
                                <span className="average">{offer.averageRating?.toFixed(1) || '0.0'}</span>
                                <span className="count">({offer.ratingsCount || 0})</span>
                            </div>
                        </div>

                        {user?.token ? (
                            <form onSubmit={handleSubmitRating} className="rating-form">
                                <div className="form-title">Oceń tę ofertę:</div>
                                <div className="stars-wrapper">
                                    <div className="stars">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                type="button"
                                                key={star}
                                                className={`star ${star <= rating ? 'active' : ''}`}
                                                onClick={() => setRating(star)}
                                            >
                                                <Star
                                                    fill={star <= rating ? 'currentColor' : 'none'}
                                                    size={24}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="add-offer-calendar-button"
                                    disabled={rating === 0}
                                >
                                    {rating === 0 ? 'Wybierz ocenę' : 'Zapisz ocenę'}
                                </button>
                            </form>
                        ) : (
                            <div className="login-prompt">
                                <MessageSquare size={24} />
                                <p>Aby ocenić lub skomentować ofertę, <Link to="/login">Zaloguj się</Link>.</p>
                            </div>
                        )}

                        <div className="comments-section">
                            <div className="comments-header">
                                <h3>Komentarze ({comments.length})</h3>

                                <div className="comments-filters">
                                    <select
                                        value={sortOption}
                                        onChange={(e) => setSortOption(e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="newest">Najnowsze</option>
                                        <option value="top-rated">Najlepiej oceniane</option>
                                        <option value="owner">Od właściciela</option>
                                        <option value="client">Od klientów</option>
                                        <option value="other">Od innych</option>
                                    </select>
                                </div>
                            </div>

                            {user?.token ? (
                                <form onSubmit={handleSubmitComment} className="comment-form">
                                    <div className="comment-input-container">
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Napisz swoją opinię..."
                                            required
                                            maxLength={500}
                                            className="comment-textarea"
                                        />
                                        <div className="comment-input-footer">
                                            <div className={`character-counter ${comment.length > 450 ? 'warning' : ''} ${comment.length >= 500 ? 'error' : ''}`}>
                                                {comment.length}/500
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button
                                            type="submit"
                                            className="submit-comment-button"
                                            disabled={comment.length === 0 || comment.length > 500}
                                        >
                                            Opublikuj komentarz
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="login-prompt">
                                    <MessageSquare size={24} />
                                    <p>Aby dodać komentarz, <Link to="/login">Zaloguj się</Link>.</p>
                                </div>
                            )}

                            <div className="comments-list">
                                {currentComments.length > 0 ? (
                                    currentComments.map((comment) => {
                                        const isLiked = comment.likedBy?.includes(user?.id) || false;
                                        const commentAuthor = commentAuthors[comment.userId] || {};
                                        const authorInitial = commentAuthor.displayName?.charAt(0) ||
                                            commentAuthor.name?.charAt(0) ||
                                            comment.authorName?.charAt(0) ||
                                            'A';
                                        const authorProfileImage = commentAuthor.profileImage ||
                                            commentAuthor.profileImageUrl;

                                        return (
                                            <div key={comment._id} className="comment">
                                                <div className="comment-header">
                                                    <div className="comment-author">
                                                        <div className="avatar">
                                                            {authorProfileImage ? (
                                                                <img
                                                                    src={`http://localhost:5000${authorProfileImage}`}
                                                                    alt={`Profil ${commentAuthor.displayName || commentAuthor.name}`}
                                                                />
                                                            ) : (
                                                                <span>{authorInitial}</span>
                                                            )}
                                                        </div>
                                                        <div className="author-info">
                                                            <span>{comment.authorName || 'Anonim'}</span>
                                                            <LabelBadge type={comment.type} />
                                                        </div>
                                                    </div>
                                                    <span className="comment-date">
                                                        {new Date(comment.createdAt).toLocaleDateString('pl-PL')}
                                                    </span>
                                                </div>

                                                <p className="comment-content">{comment.content}</p>

                                                <div className="comment-actions">
                                                    <div className="comment-actions-left">
                                                        <button
                                                            className={`like-button ${isLiked ? 'liked' : ''}`}
                                                            onClick={() => handleLikeComment(comment._id)}
                                                        >
                                                            <Heart
                                                                size={19}
                                                                fill={isLiked ? 'currentColor' : 'none'}
                                                            />
                                                            {comment.likes || 0}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="reply-button"
                                                            onClick={() => setReplyingTo(comment._id === replyingTo ? null : comment._id)}
                                                        >
                                                            Odpowiedz
                                                        </button>
                                                    </div>
                                                    {comment.userId === user?.id && (
                                                        <button className="delete-comment-button" onClick={() => handleDeleteComment(comment._id)}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>

                                                {replyingTo === comment._id && (
                                                    <form onSubmit={(e) => handleSubmitReply(e, comment._id)} className="comment-reply-form">
                                                        <div className="comment-input-container">
                                                            <textarea
                                                                value={replyContent[comment._id] || ''}
                                                                onChange={(e) => setReplyContent(prev => ({
                                                                    ...prev,
                                                                    [comment._id]: e.target.value
                                                                }))}
                                                                placeholder="Napisz odpowiedź..."
                                                                required
                                                                maxLength={500}
                                                                className="comment-textarea"
                                                            />
                                                            <div className="comment-input-footer">
                                                                <div className={`character-counter ${(replyContent[comment._id] || '').length > 450 ? 'warning' : ''} ${(replyContent[comment._id] || '').length >= 500 ? 'error' : ''}`}>
                                                                    {(replyContent[comment._id] || '').length}/500
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="form-actions">
                                                            <button
                                                                type="button"
                                                                className="cancel-reply-button"
                                                                onClick={() => {
                                                                    setReplyingTo(null);
                                                                    setReplyContent(prev => ({
                                                                        ...prev,
                                                                        [comment._id]: ''
                                                                    }));
                                                                }}
                                                            >
                                                                Anuluj
                                                            </button>
                                                            <button
                                                                type="submit"
                                                                className="submit-comment-button"
                                                                disabled={!replyContent[comment._id] || replyContent[comment._id].length > 500}
                                                            >
                                                                Opublikuj odpowiedź
                                                            </button>
                                                        </div>
                                                    </form>
                                                )}

                                                {/* Wyświetlanie odpowiedzi */}
                                                {comment.replies && comment.replies.length > 0 && (
                                                    <div className="comment-replies">
                                                        {comment.replies.map(reply => {
                                                            const replyAuthor = commentAuthors[reply.userId] || {};
                                                            const replyAuthorInitial = replyAuthor.displayName?.charAt(0) || 'A';
                                                            const replyAuthorProfileImage = replyAuthor.profileImage ||
                                                                replyAuthor.profileImageUrl;
                                                            const isReplyLiked = reply.likedBy?.includes(user?.id) || false;

                                                            return (
                                                                <div key={reply._id} className="comment reply">
                                                                    <div className="comment-header">
                                                                        <div className="comment-author">
                                                                            <div className="avatar">
                                                                                {replyAuthorProfileImage ? (
                                                                                    <img src={`http://localhost:5000${replyAuthorProfileImage}`} alt="Profil" />
                                                                                ) : (
                                                                                    <span>{replyAuthorInitial}</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="author-info">
                                                                                <span>{reply.authorName || 'Anonim'}</span>
                                                                                <LabelBadge type={reply.type} />
                                                                            </div>
                                                                        </div>
                                                                        <span className="comment-date">
                                                                            {new Date(reply.createdAt).toLocaleDateString('pl-PL')}
                                                                        </span>
                                                                    </div>
                                                                    <p className="comment-content">{reply.content}</p>

                                                                    <div className="comment-actions">
                                                                        <div className="comment-actions-left">
                                                                            <button
                                                                                className={`like-button ${isReplyLiked ? 'liked' : ''}`}
                                                                                onClick={() => handleLikeComment(reply._id)}
                                                                            >
                                                                                <Heart size={19} fill={isReplyLiked ? 'currentColor' : 'none'} />
                                                                                {reply.likes || 0}
                                                                            </button>
                                                                        </div>
                                                                        {reply.userId === user?.id && (
                                                                            <button
                                                                                className="delete-comment-button"
                                                                                onClick={() => handleDeleteComment(reply._id)}
                                                                            >
                                                                                <Trash2 size={18} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="no-comments">
                                        <MessageSquare size={48} />
                                        <p>Brak komentarzy spełniających kryteria</p>
                                    </div>
                                )}

                                {totalPages > 1 && (
                                    <div className="pagination">
                                        <button
                                            onClick={() => paginate(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            &laquo;
                                        </button>

                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => paginate(pageNum)}
                                                    className={currentPage === pageNum ? 'active' : ''}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}

                                        <button
                                            onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            &raquo;
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="offer-sidebar">
                    <div className="favorite-button-container">
                        <button
                            onClick={handleToggleFavorite}
                            disabled={favoriteLoading}
                            className={`favorite-button ${isFavorite ? 'active' : ''}`}
                            aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                        >
                            <Heart
                                size={24}
                                fill={isFavorite ? 'currentColor' : 'none'}
                                className="favorite-icon"
                            />
                            <span className="favorite-text">
                                {isFavorite ? 'W ulubionych' : 'Dodaj do ulubionych'}
                            </span>
                        </button>
                    </div>
                    <div className="info-card">
                        <h3>Podstawowe informacje</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <Music size={20} />
                                <span>Typ wykonawcy</span>
                                <strong>
                                    {performerTypeOptions.find(opt => opt.value === offer.performerType)?.label || offer.performerType}
                                </strong>
                            </div>
                            <div className="info-item">
                                <MapPin size={20} />
                                <span>Lokalizacja</span>
                                <strong>{offer.location}</strong>
                            </div>
                            <div className="info-item">
                                <DollarSign size={20} />
                                <span>Cena</span>
                                <strong>{offer.price?.min} - {offer.price?.max} PLN</strong>
                            </div>
                            <div className="info-item">
                                <Clock size={20} />
                                <span>Czas trwania</span>
                                <strong>{offer.duration?.min} - {offer.duration?.max} h</strong>
                            </div>
                        </div>
                    </div>

                    {(offer.musicStyles?.length > 0 || offer.eventTypes?.length > 0 || offer.instruments?.length > 0) && (
                        <div className="info-card">
                            <h3>Specjalizacja</h3>
                            <div className="tags-container">
                                {offer.musicStyles?.length > 0 && (
                                    <div className="tags-group">
                                        <h4>Gatunki muzyczne</h4>
                                        <div className="tags-list">
                                            {offer.musicStyles.map(style => (
                                                <span key={style} className="tag">{style}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {offer.eventTypes?.length > 0 && (
                                    <div className="tags-group">
                                        <h4>Typy wydarzeń</h4>
                                        <div className="tags-list">
                                            {offer.eventTypes.map(type => (
                                                <span key={type} className="tag">{type}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {offer.instruments?.length > 0 && (
                                    <div className="tags-group">
                                        <h4>Instrumenty</h4>
                                        <div className="tags-list">
                                            {offer.instruments.map(instrument => (
                                                <span key={instrument} className="tag">{instrument}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {offer.audioDemo && (
                        <div className="info-card">
                            <h3>Próbka audio</h3>
                            <AudioPlayer
                                audioUrl={`http://localhost:5000/api/files/${offer.audioDemo}`}
                                title={`Demo ${offer.artistName}`}
                            />
                        </div>
                    )}

                    {youtubeId && (
                        <div className="info-card">
                            <h3>Wideo prezentacja</h3>
                            <div className="video-container">
                                <iframe
                                    ref={youtubeRef}
                                    src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1`}
                                    title={`YouTube video player - ${offer.artistName}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        </div>
                    )}

                    {offer.availability && (
                        <div className="info-card">
                            <div className="availability-header">
                                <h3>Dostępność</h3>
                            </div>
                            <p className="availability-text">{offer.availability}</p>
                            <button
                                type="button"
                                className="add-offer-calendar-button"
                                onClick={() => {
                                    const newWindow = window.open('', '_blank');
                                    newWindow.location = (`/calendar/${offer.userId}`);
                                }}
                            >
                                <Calendar size={16} /> Przejdź do kalendarza występów
                            </button>
                        </div>
                    )}

                    <div className="info-card contact-card">
                        <h3>Kontakt i Zlecenie</h3>
                        <div className="contact-methods">
                            {offer.email && (
                                <div className="contact-item">
                                    <Mail size={18} />
                                    <span>{offer.email}</span>
                                </div>
                            )}
                            {offer.phone && (
                                <div className="contact-item">
                                    <Phone size={18} />
                                    <span>{offer.phone}</span>
                                </div>
                            )}
                        </div>
                        <button
                            className="contact-button"
                            onClick={handleBookingClick}
                        >
                            Wynajmij wykonawcę
                        </button>
                    </div>
                </div>
            </div>
            {showBookingModal && (
                <Modal size="large" onClose={() => setShowBookingModal(false)}>
                    <BookingForm
                        offer={offer}
                        onClose={() => setShowBookingModal(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

export default OfferPage;