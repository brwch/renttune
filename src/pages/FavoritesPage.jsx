import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Star, MapPin, Music, DollarSign, Clock } from 'lucide-react';
import { useUser } from '../context/UserContext';
import './FavoritesPage.css';

const FavoritesPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        if (!user?.token) {
          setLoading(false);
          return;
        }

        const response = await fetch('http://localhost:5000/api/favorites', {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Nie udało się pobrać ulubionych ofert');
        }

        const data = await response.json();

        // Pobierz pełne dane ofert na podstawie ID
        const offersResponse = await fetch('http://localhost:5000/api/favorites/offers', {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!offersResponse.ok) {
          throw new Error('Nie udało się pobrać danych ofert');
        }

        const offersData = await offersResponse.json();
        setFavorites(offersData.offers || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user?.token]);

  const handleRemoveFavorite = async (offerId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/favorites/${offerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Nie udało się usunąć z ulubionych');
      }

      // Aktualizacja lokalnej listy
      setFavorites(prev => prev.filter(offer => offer._id !== offerId));
    } catch (err) {
      console.error('Błąd:', err);
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="favorites-loading">
        <div className="spinner"></div>
        <p>Ładowanie ulubionych ofert...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="favorites-error">
        <h3>Wystąpił błąd</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Spróbuj ponownie</button>
      </div>
    );
  }

  if (!user?.token) {
    return (
      <div className="favorites-login-prompt">
        <h2>Twoje ulubione oferty</h2>
        <p>Aby wyświetlić ulubione oferty, musisz być zalogowany.</p>
        <button onClick={() => navigate('/login')}>Zaloguj się</button>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="favorites-empty">
        <h2>Twoje ulubione oferty</h2>
        <p>Nie masz jeszcze żadnych ulubionych ofert.</p>
        <Link to="/" className="browse-offers-button">
          Przeglądaj oferty
        </Link>
      </div>
    );
  }

  return (
    <div className="favorites-container">
      <h2>Twoje ulubione oferty</h2>
      <div className="favorites-grid">
        {favorites.map(offer => (
          <div key={offer._id} className="favorite-card">
            {offer.photos?.[0] && (
              <div className="favorite-image">
                <img
                  src={`http://localhost:5000/api/files/${offer.photos[0]}`}
                  alt={offer.artistName}
                />
              </div>
            )}
            <div className="favorite-content">
              <h3>
                <Link to={`/offer/${offer._id}`}>{offer.artistName}</Link>
              </h3>

              <div className="offer-meta">
                <div className="meta-item">
                  <Music size={16} />
                  <span>{offer.performerType}</span>
                </div>
                <div className="meta-item">
                  <MapPin size={16} />
                  <span>{offer.location}</span>
                </div>
                {offer.averageRating && (
                  <div className="meta-item rating">
                    <Star fill="currentColor" size={16} />
                    <span>{offer.averageRating.toFixed(1)}</span>
                  </div>
                )}
                <div className="meta-item">
                  <DollarSign size={16} />
                  <span>{offer.price?.min} - {offer.price?.max} PLN</span>
                </div>
                <div className="meta-item">
                  <Clock size={16} />
                  <span>{offer.duration?.min} - {offer.duration?.max} h</span>
                </div>
              </div>

              <div className="favorite-actions">
                <button
                  onClick={() => handleRemoveFavorite(offer._id)}
                  className="remove-favorite"
                >
                  <Heart fill="currentColor" size={18} />
                  <span>Usuń z ulubionych</span>
                </button>
                <Link to={`/offer/${offer._id}`} className="view-details">
                  Zobacz szczegóły
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FavoritesPage;