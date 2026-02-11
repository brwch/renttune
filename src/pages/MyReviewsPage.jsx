import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Star, MessageSquare, Trash2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import './MyReviewsPage.css';

const MyReviewsPage = () => {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offerNames, setOfferNames] = useState({});

  useEffect(() => {
    // Dodaj to sprawdzenie
    if (!userLoading && !user?.token) {
      navigate('/login');
      return;
    }
  }, [userLoading, user, navigate]);

  useEffect(() => {
    const fetchUserReviews = async () => {
      try {
        if (!user?.token) return;

        setLoading(true);

        const [ratingsResponse, commentsResponse] = await Promise.all([
          fetch(`http://localhost:5000/api/ratings/user/${user.id}`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
          }),
          fetch(`http://localhost:5000/api/comments/user/${user.id}`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
          })
        ]);

        if (!ratingsResponse.ok || !commentsResponse.ok) {
          throw new Error('Nie udało się pobrać danych');
        }

        const ratingsData = await ratingsResponse.json();
        const commentsData = await commentsResponse.json();

        const combinedReviews = [
          ...ratingsData.ratings.map(r => ({ ...r, type: 'rating' })),
          ...commentsData.comments.map(c => ({ ...c, type: 'comment' }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Pobierz nazwy ofert
        const names = {};
        await Promise.all(
          combinedReviews.map(async review => {
            if (!names[review.offerId]) {
              try {
                const response = await fetch(
                  `http://localhost:5000/api/offers/${review.offerId}/name`,
                  {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                  }
                );
                if (response.ok) {
                  const data = await response.json();
                  names[review.offerId] = data.artistName;
                }
              } catch (err) {
                console.error(`Błąd pobierania nazwy oferty: ${err}`);
                names[review.offerId] = "Nieznana oferta";
              }
            }
          })
        );

        setOfferNames(names);
        setReviews(combinedReviews);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?.token) {
      fetchUserReviews();
    }
  }, [user]);

  const handleDeleteReview = async (reviewId, type) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę opinię?')) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/${type}s/${reviewId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${user.token}` }
        }
      );

      if (!response.ok) throw new Error('Nie udało się usunąć');
      setReviews(prev => prev.filter(r => r._id !== reviewId));
    } catch (err) {
      console.error('Błąd usuwania:', err);
      alert(err.message);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="reviews-loading-container">
        <div className="reviews-loading-spinner"></div>
        <p>Ładowanie Twoich opinii...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reviews-error-container">
        <div className="reviews-error-icon">!</div>
        <h3>Wystąpił błąd</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try again</button>
      </div>
    );
  }

  return (
    <div className="my-reviews-container">
      <h1>Twoje opinie i komentarze</h1>

      {reviews.length === 0 ? (
        <div className="no-reviews">
          <MessageSquare size={48} />
          <p>Nie wystawiłeś jeszcze żadnych opinii ani komentarzy</p>
          <Link to="/" className="explore-button">Przeglądaj oferty</Link>
        </div>
      ) : (
        <div className="reviews-list">
          {reviews.map(review => (
            <div key={`${review.type}-${review._id}`} className="review-item">
              <div className="review-header">
                <div className="review-type">
                  {review.type === 'rating' ? (
                    <>
                      <Star fill="currentColor" size={18} />
                      <span>Ocena</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare size={18} />
                      <span>Komentarz</span>
                    </>
                  )}
                </div>
                <span className="review-date">
                  {new Date(review.createdAt).toLocaleDateString('pl-PL')}
                </span>
              </div>

              <div className="review-offer-name">
                {offerNames[review.offerId] || "Ładowanie nazwy oferty..."}
              </div>

              <div className="review-content">
                {review.type === 'rating' ? (
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        fill={star <= review.rating ? 'currentColor' : 'none'}
                        size={20}
                      />
                    ))}
                  </div>
                ) : (
                  <p>{review.content}</p>
                )}
              </div>

              <div className="review-footer">
                <Link
                  to={`/offer/${review.offerId}`}
                  className="offer-link"
                >
                  Zobacz ofertę
                </Link>

                <button
                  onClick={() => handleDeleteReview(review._id, review.type)}
                  className="delete-review-button"
                  aria-label="Usuń opinię"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReviewsPage;