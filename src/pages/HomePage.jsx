import { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { Heart, Play, Pause, Star, MessageSquare, Music, MapPin, DollarSign, ChevronRight, ChevronLeft, Clock, AlertCircle, FilterX, ArrowDown, ArrowUp, ArrowUpDown, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './HomePage.css';

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

const categories = {
  Gatunek: ['Pop', 'Rock', 'Jazz', 'Klasyczna', 'Hip-hop', 'Elektroniczna', 'Folk', 'R&B', 'Metal', 'Blues', 'Funk', 'Reggae', 'Disco', 'Inne'],
  Wydarzenie: ['Wesele', 'Ślub', 'Impreza firmowa', 'Koncert', 'Festyn', 'Urodziny', 'Studniówka', 'Chrzciny', 'Komunia', 'Bal', 'Inne'],
  Skład: performerTypeOptions.map(opt => opt.value),
  Instrumenty: ['Gitara', 'Perkusja', 'Pianino', 'Skrzypce', 'Saksofon', 'Flet', 'Trąbka', 'Wiolonczela', 'Harfa', 'Akordeon', 'Inne']
};

const HomePage = () => {
  const { user } = useUser();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const audioRef = useRef(null);
  const [loadingImages, setLoadingImages] = useState({});

  const [currentPage, setCurrentPage] = useState(1);
  const [offersPerPage] = useState(6);
  const [totalOffers, setTotalOffers] = useState(0);

  const [sortOption, setSortOption] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState(-1);

  const [tempPriceRange, setTempPriceRange] = useState({ min: '', max: '' });
  const [tempDurationRange, setTempDurationRange] = useState({ min: '', max: '' });
  const navigate = useNavigate();
  const location = useLocation();

  const [recommendedOffers, setRecommendedOffers] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [isRecommendationsMinimized, setIsRecommendationsMinimized] = useState(false);

  // Filtry
  const [selectedOptions, setSelectedOptions] = useState({
    Gatunek: [],
    Wydarzenie: [],
    Skład: [],
    Instrumenty: []
  });

  const [tempSelectedOptions, setTempSelectedOptions] = useState({
    Gatunek: [],
    Wydarzenie: [],
    Skład: [],
    Instrumenty: []
  });

  const [currentRecommendationIndex, setCurrentRecommendationIndex] = useState(0);

  const handleNextRecommendations = () => {
    setCurrentRecommendationIndex(prev =>
      Math.min(prev + 1, Math.ceil(recommendedOffers.length / 3) - 1)
    );
  };

  const handlePrevRecommendations = () => {
    setCurrentRecommendationIndex(prev => Math.max(prev - 1, 0));
  };

  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      handleNextRecommendations();
    }

    if (touchStart - touchEnd < -50) {
      handlePrevRecommendations();
    }
  };

  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [durationRange, setDurationRange] = useState({ min: '', max: '' });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState({
    Gatunek: false,
    Wydarzenie: false,
    Skład: false,
    Instrumenty: false
  });
  const dropdownRef = useRef(null);
  const sliderRef = useRef(null);

  // Pobieranie ofert
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const searchQueryParam = searchParams.get('search');
    setSearchQuery(searchQueryParam || '');

    const fetchAllOffers = async () => {
      try {
        setLoading(true);

        if (searchQueryParam === '') {
          navigate('/');
          return;
        }
        let url = 'http://localhost:5000/api/offers/';
        const params = new URLSearchParams();

        // Dla wyszukiwania używamy endpointu search, który już uwzględnia tylko aktywne oferty
        if (searchQueryParam) {
          url += `search?query=${encodeURIComponent(searchQueryParam)}`;
        } else {
          url += 'active';
        }

        // Dodajemy filtry tylko jeśli nie ma wyszukiwania
        if (!searchQueryParam) {
          // Filtry kategorii
          Object.entries(selectedOptions).forEach(([category, values]) => {
            if (values.length > 0) {
              params.append(category.toLowerCase(), values.join(','));
            }
          });

          // Filtry cenowe
          if (priceRange.min) params.append('minPrice', priceRange.min);
          if (priceRange.max) params.append('maxPrice', priceRange.max);

          // Filtry czasu trwania
          if (durationRange.min) params.append('minDuration', durationRange.min);
          if (durationRange.max) params.append('maxDuration', durationRange.max);
        }

        // Parametry wspólne
        params.append('sortBy', sortOption);
        params.append('sortOrder', sortOrder);
        params.append('page', currentPage);
        params.append('limit', offersPerPage);

        if (params.toString()) {
          url += searchQueryParam ? '&' : '?';
          url += params.toString();
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Błąd podczas ładowania ofert');

        const data = await response.json();
        setOffers(data.offers || []);
        setTotalOffers(data.totalCount || 0);
        setError(null);
      } catch (err) {
        console.error('Błąd pobierania ofert:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchFavorites = async () => {
      if (!user?.token) return;

      try {
        const response = await fetch('http://localhost:5000/api/favorites', {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setFavorites(data.favorites || []);
        }
      } catch (error) {
        console.error('Błąd pobierania ulubionych:', error);
      }
    };

    fetchAllOffers();
    fetchFavorites();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [user, selectedOptions, priceRange, durationRange, currentPage, sortOption, sortOrder, location.search]);


  useEffect(() => {
    if (!user?.token) {
      setLoadingRecommendations(false);
      return;
    }

    const fetchRecommendations = async () => {
      try {
        setLoadingRecommendations(true);
        const response = await fetch('http://localhost:5000/api/offers/recommendations', {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setRecommendedOffers(data.offers || []);
        }
      } catch (error) {
        console.error('Błąd pobierania rekomendacji:', error);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [user]);


  useEffect(() => {
    if (openDropdown) {
      setTempSelectedOptions(prev => ({
        ...prev,
        [openDropdown]: selectedOptions[openDropdown]
      }));
    }
  }, [openDropdown]);

  useEffect(() => {
    if (openDropdown === 'Cena') {
      setTempPriceRange(priceRange);
    }
    if (openDropdown === 'Czas trwania') {
      setTempDurationRange(durationRange);
    }
  }, [openDropdown]);

  // Obsługa kliknięć poza dropdownem
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        // Przy zamykaniu bez zatwierdzania przywróć poprzednie wybory
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFavorite = async (offerId) => {
    if (!user?.token) {
      alert('Zaloguj się, aby dodawać do ulubionych');
      return;
    }

    try {
      const isFavorite = favorites.includes(offerId);
      const method = isFavorite ? 'DELETE' : 'POST';

      const response = await fetch(`http://localhost:5000/api/favorites/${offerId}`, {
        method,
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        setFavorites(prev =>
          isFavorite
            ? prev.filter(id => id !== offerId)
            : [...prev, offerId]
        );
      }
    } catch (error) {
      console.error('Błąd aktualizacji ulubionych:', error);
    }
  };

  const togglePlay = (offerId, audioUrl) => {
    if (currentlyPlaying === offerId) {
      audioRef.current.pause();
      setCurrentlyPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      audioRef.current = new Audio(`http://localhost:5000/api/files/${audioUrl}`);
      audioRef.current.play()
        .then(() => setCurrentlyPlaying(offerId))
        .catch(error => console.error('Błąd odtwarzania:', error));

      audioRef.current.onended = () => setCurrentlyPlaying(null);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    navigate("/", { replace: true });
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Funkcja do zmiany sortowania
  const handleSortChange = (option) => {
    if (sortOption === option) {
      // Jeśli kliknięto to samo pole, zmień kolejność
      setSortOrder(sortOrder === -1 ? 1 : -1);
    } else {
      // Jeśli kliknięto nowe pole, ustaw domyślną kolejność (malejąco)
      setSortOption(option);
      setSortOrder(-1);
    }
    setCurrentPage(1); // Resetuj paginację przy zmianie sortowania
  };

  const handleImageLoad = (offerId) => {
    setLoadingImages(prev => ({ ...prev, [offerId]: false }));
  };

  const handleImageError = (offerId) => {
    setLoadingImages(prev => ({ ...prev, [offerId]: false }));
  };

  // Funkcje pomocnicze dla filtrów
  const updateCategory = (category, newSelection) => {
    setSelectedOptions({ ...selectedOptions, [category]: newSelection });
    setCurrentPage(1);
  };

  const getSortIcon = (option) => {
    if (sortOption !== option) return <ArrowUpDown size={16} strokeWidth={1.5} />;
    return sortOrder === -1
      ? <ArrowDown size={16} strokeWidth={1.5} />
      : <ArrowUp size={16} strokeWidth={1.5} />;
  };

  const removeTag = (category, value) => {
    updateCategory(
      category,
      selectedOptions[category].filter((v) => v !== value)
    );
  };

  const removePriceTag = () => {
    setPriceRange({ min: '', max: '' });
    setCurrentPage(1);
  };

  const removeDurationTag = () => {
    setDurationRange({ min: '', max: '' });
    setCurrentPage(1);
  };

  const clearAllTags = () => {
    setSelectedOptions({
      Gatunek: [],
      Wydarzenie: [],
      Skład: [],
      Instrumenty: []
    });
    setPriceRange({ min: '', max: '' });
    setDurationRange({ min: '', max: '' });
    setCurrentPage(1);
  };

  const hasAnyTag =
    Object.values(selectedOptions).some((arr) => arr.length > 0) ||
    priceRange.min || priceRange.max ||
    durationRange.min || durationRange.max;

  const totalPages = Math.ceil(totalOffers / offersPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="home-loading-container">
        <div className="home-loading-spinner"></div>
        <p>Ładowanie ofert...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-error-container">
        <p>Wystąpił błąd: {error}</p>
        <button onClick={() => window.location.reload()}>Spróbuj ponownie</button>
      </div>
    );
  }

  return (
    <main className="home-container" ref={dropdownRef}>
      <h1 className="home-page-title">Znajdź idealnego muzyka na Twoje wydarzenie</h1>
      <p className="home-page-subtitle">
        Dopasuj wykonawcę do rodzaju imprezy, instrumentu, budżetu i terminu.
      </p>

      {/* Filtry */}
      {!searchQuery && (
        <div className="home-filters">
          {Object.entries(categories).map(([category, options]) => (
            <div key={category} className="home-filter-block">
              <button
                className={`home-filter-button ${openDropdown === category ? 'active' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === category ? null : category)}
              >
                {category}
                <span className="home-dropdown-arrow">{openDropdown === category ? '▲' : '▼'}</span>
              </button>

              {openDropdown === category && (
                <div className="home-dropdown">
                  <div className={`home-options-list ${showAll[category] ? 'expanded' : ''}`}>
                    {options.slice(0, showAll[category] ? options.length : 4).map((option) => (
                      <label key={option} className="home-checkbox-item">
                        <input
                          type="checkbox"
                          checked={tempSelectedOptions[category].includes(option)}
                          onChange={() => {
                            const newSelection = tempSelectedOptions[category].includes(option)
                              ? tempSelectedOptions[category].filter(o => o !== option)
                              : [...tempSelectedOptions[category], option];
                            setTempSelectedOptions(prev => ({
                              ...prev,
                              [category]: newSelection
                            }));
                          }}
                        />
                        <span className="home-checkmark"></span>
                        {category === 'Skład'
                          ? performerTypeOptions.find(opt => opt.value === option)?.label || option
                          : option}
                      </label>
                    ))}
                  </div>

                  {options.length > 4 && (
                    <button
                      className="home-more-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAll(prev => ({ ...prev, [category]: !prev[category] }));
                      }}
                    >
                      {showAll[category] ? 'Zobacz mniej' : 'Zobacz więcej'}
                    </button>
                  )}

                  <div className="home-dropdown-actions">
                    <button
                      className="home-action-button confirm"
                      onClick={() => {
                        setSelectedOptions(prev => ({
                          ...prev,
                          [category]: tempSelectedOptions[category]
                        }));
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      Zatwierdź
                    </button>
                    <button
                      className="home-action-button clear"
                      onClick={() => {
                        setTempSelectedOptions(prev => ({
                          ...prev,
                          [category]: []
                        }));
                      }}
                    >
                      Wyczyść
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Filtr cenowy */}
          <div className="home-filter-block">
            <button
              className={`home-filter-button ${openDropdown === 'Cena' ? 'active' : ''}`}
              onClick={() => setOpenDropdown(openDropdown === 'Cena' ? null : 'Cena')}
            >
              Cena
              <span className="home-dropdown-arrow">{openDropdown === 'Cena' ? '▲' : '▼'}</span>
            </button>

            {openDropdown === 'Cena' && (
              <div className="home-dropdown">
                <div className="home-options-list home-price-range">
                  <label className="home-price-input">
                    Od:
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={tempPriceRange.min}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*$/.test(value)) {
                          setTempPriceRange(prev => ({
                            ...prev,
                            min: value
                          }));
                        }
                      }}
                      placeholder="Min (PLN)"
                    />
                  </label>
                  <label className="home-price-input">
                    Do:
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={tempPriceRange.max}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*$/.test(value)) {
                          setTempPriceRange(prev => ({
                            ...prev,
                            max: value
                          }));
                        }
                      }}
                      placeholder="Max (PLN)"
                    />
                  </label>
                </div>

                <div className="home-dropdown-actions">
                  <button
                    className="home-action-button confirm"
                    onClick={() => {
                      setPriceRange(tempPriceRange);
                      setOpenDropdown(null);
                      setCurrentPage(1);
                    }}
                  >
                    Zatwierdź
                  </button>
                  <button
                    className="home-action-button clear"
                    onClick={() => setPriceRange({ min: '', max: '' })}
                  >
                    Wyczyść
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filtr czasu trwania */}
          <div className="home-filter-block">
            <button
              className={`home-filter-button ${openDropdown === 'Czas trwania' ? 'active' : ''}`}
              onClick={() => setOpenDropdown(openDropdown === 'Czas trwania' ? null : 'Czas trwania')}
            >
              Czas trwania
              <span className="home-dropdown-arrow">{openDropdown === 'Czas trwania' ? '▲' : '▼'}</span>
            </button>

            {openDropdown === 'Czas trwania' && (
              <div className="home-dropdown">
                <div className="home-options-list home-price-range">
                  <label className="home-price-input">
                    Od:
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={tempDurationRange.min}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*$/.test(value)) {
                          setTempDurationRange(prev => ({
                            ...prev,
                            min: value
                          }));
                        }
                      }}
                      placeholder="Min (Godziny)"
                    />
                  </label>
                  <label className="home-price-input">
                    Do:
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={tempDurationRange.max}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*$/.test(value)) {
                          setTempDurationRange(prev => ({
                            ...prev,
                            max: value
                          }));
                        }
                      }}
                      placeholder="Max (Godziny)"
                    />
                  </label>
                </div>

                <div className="home-dropdown-actions">
                  <button
                    className="home-action-button confirm"
                    onClick={() => {
                      setDurationRange(tempDurationRange);
                      setOpenDropdown(null);
                      setCurrentPage(1);
                    }}
                  >
                    Zatwierdź
                  </button>
                  <button
                    className="home-action-button clear"
                    onClick={() => setDurationRange({ min: '', max: '' })}
                  >
                    Wyczyść
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wybrane filtry i wyszukiwanie */}
      <div className="home-tags-container">
        {searchQuery && (
          <div className="home-search-tag-container">
            <div className="home-search-tag">
              <span className="home-search-tag-text">
                Wyniki wyszukiwania dla: <em>{searchQuery}</em>
              </span>
              <button
                className="home-search-tag-close"
                onClick={clearSearch}
                aria-label="Wyczyść wyszukiwanie"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {hasAnyTag && (
          <div className="home-tags">
            {Object.entries(selectedOptions).map(([category, values]) =>
              values.map((value) => (
                <span key={value} className="home-tag">
                  {category === 'Skład'
                    ? performerTypeOptions.find(opt => opt.value === value)?.label || value
                    : value}
                  <button
                    className="home-tag-remove"
                    onClick={() => removeTag(category, value)}
                    aria-label={`Usuń ${value}`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
            {priceRange.min && (
              <span className="home-tag">
                Cena od {priceRange.min} zł
                <button
                  className="home-tag-remove"
                  onClick={() => removePriceTag()}
                  aria-label="Usuń cena od"
                >
                  ×
                </button>
              </span>
            )}
            {priceRange.max && (
              <span className="home-tag">
                Cena do {priceRange.max} zł
                <button
                  className="home-tag-remove"
                  onClick={() => removePriceTag()}
                  aria-label="Usuń cena do"
                >
                  ×
                </button>
              </span>
            )}
            {durationRange.min && (
              <span className="home-tag">
                Czas od {durationRange.min} h
                <button
                  className="home-tag-remove"
                  onClick={() => removeDurationTag()}
                  aria-label="Usuń czas od"
                >
                  ×
                </button>
              </span>
            )}
            {durationRange.max && (
              <span className="home-tag">
                Czas do {durationRange.max} h
                <button
                  className="home-tag-remove"
                  onClick={() => removeDurationTag()}
                  aria-label="Usuń czas do"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        {(hasAnyTag || searchQuery) && (
          <button className="home-clear-all" onClick={() => {
            clearAllTags();
            clearSearch();
          }}>
            Usuń wszystkie
          </button>
        )}
      </div>

      {/* Sortowanie */}
      <div className="home-sorting">
        <span className="home-sorting-label">Sortuj według:</span>
        <button
          className={`home-sorting-button ${sortOption === 'createdAt' ? 'active' : ''}`}
          onClick={() => handleSortChange('createdAt')}
        >
          Najnowsze {getSortIcon('createdAt')}
        </button>
        <button
          className={`home-sorting-button ${sortOption === 'price' ? 'active' : ''}`}
          onClick={() => handleSortChange('price')}
        >
          Cena {getSortIcon('price')}
        </button>
        <button
          className={`home-sorting-button ${sortOption === 'rating' ? 'active' : ''}`}
          onClick={() => handleSortChange('rating')}
        >
          Ocena {getSortIcon('rating')}
        </button>
        <button
          className={`home-sorting-button ${sortOption === 'comments' ? 'active' : ''}`}
          onClick={() => handleSortChange('comments')}
        >
          Komentarze {getSortIcon('comments')}
        </button>
      </div>

      {/* Sekcja rekomendacji */}
      {user?.token && recommendedOffers.length > 0 && (
        <div className="home-recommendations-section">
          <div className="home-recommendations-header">
            <h2 className="home-section-title">
              Rekomendowane dla Ciebie
            </h2>

            <div className="home-recommendations-controls">
              {recommendedOffers.length > 3 && (
                <div className="home-recommendations-nav">
                  <button
                    onClick={handlePrevRecommendations}
                    disabled={currentRecommendationIndex === 0}
                    aria-label="Poprzednie rekomendacje"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={handleNextRecommendations}
                    disabled={currentRecommendationIndex >= Math.ceil(recommendedOffers.length / 3) - 1}
                    aria-label="Następne rekomendacje"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}

              <button
                className="home-recommendations-toggle"
                onClick={() => setIsRecommendationsMinimized(!isRecommendationsMinimized)}
                aria-label={isRecommendationsMinimized ? "Rozwiń rekomendacje" : "Zminimalizuj rekomendacje"}
              >
                {isRecommendationsMinimized ? <ArrowDown size={20} /> : <ArrowUp size={20} />}
              </button>
            </div>
          </div>

          {!isRecommendationsMinimized && (
            <>
              {loadingRecommendations ? (
                <div className="home-loading-container">
                  <div className="home-loading-spinner"></div>
                  <p>Ładowanie rekomendacji...</p>
                </div>
              ) : (
                <div className="home-recommendations-container">
                  <div
                    className="home-recommendations-slider"
                    ref={sliderRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{
                      transform: `translateX(calc(-${currentRecommendationIndex * 100}% - ${currentRecommendationIndex * 2}rem))`
                    }}
                  >
                    {Array.from({ length: Math.ceil(recommendedOffers.length / 3) }).map((_, groupIndex) => (
                      <div key={groupIndex} className="home-recommendations-offers">
                        {recommendedOffers
                          .slice(groupIndex * 3, groupIndex * 3 + 3)
                          .map(offer => (
                            <div key={offer._id} className="home-offer-card">
                              <div className="home-offer-image">
                                {offer.photos?.[0] ? (
                                  <>
                                    <img
                                      src={`http://localhost:5000/api/files/${typeof offer.photos[0] === 'string'
                                        ? offer.photos[0]
                                        : offer.photos[0].id || offer.photos[0]
                                        }`}
                                      alt={`${offer.artistName} - ${offer.performerType}`}
                                      onLoad={() => handleImageLoad(offer._id)}
                                      onError={() => handleImageError(offer._id)}
                                      style={{
                                        display: loadingImages[offer._id] === false ? 'block' : 'none'
                                      }}
                                    />
                                    {(loadingImages[offer._id] === undefined || loadingImages[offer._id] === true) && (
                                      <div className="home-loading-spinner-container">
                                        <div className="home-loading-spinner-small" />
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="home-no-image">Brak zdjęcia</div>
                                )}
                              </div>

                              <div className="home-offer-details">
                                <div className="home-offer-header">
                                  <h3>{offer.artistName}</h3>
                                  <button
                                    className={`home-favorite-button ${favorites.includes(offer._id) ? 'active' : ''}`}
                                    onClick={() => toggleFavorite(offer._id)}
                                    aria-label={favorites.includes(offer._id) ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                                  >
                                    <Heart
                                      size={20}
                                      fill={favorites.includes(offer._id) ? 'currentColor' : 'none'}
                                    />
                                  </button>
                                </div>

                                <div className="home-offer-meta-group">
                                  <span className="home-offer-type">
                                    <Music size={16} />
                                    {performerTypeOptions.find(opt => opt.value === offer.performerType)?.label || offer.performerType}
                                  </span>
                                  <span className="home-offer-location">
                                    <MapPin size={16} />
                                    {offer.location}
                                  </span>
                                </div>

                                <div className="home-offer-meta-group">
                                  <span className="home-offer-price">
                                    <DollarSign size={16} />
                                    {offer.price?.min} - {offer.price?.max} PLN
                                  </span>
                                  <span className="home-offer-duration">
                                    <Clock size={16} />
                                    {offer.duration?.min} - {offer.duration?.max} h
                                  </span>
                                </div>

                                <div className="home-offer-ratings">
                                  <span>
                                    <Star size={16} fill="currentColor" />
                                    {offer.averageRating?.toFixed(1) || 'Brak'}
                                  </span>
                                  <span>
                                    <MessageSquare size={16} />
                                    {offer.commentsCount || 0}
                                  </span>
                                </div>

                                <div className="home-offer-actions">
                                  {offer.audioDemo && (
                                    <button
                                      className={`home-play-button ${currentlyPlaying === offer._id ? 'playing' : ''}`}
                                      onClick={() => togglePlay(offer._id, offer.audioDemo)}
                                    >
                                      {currentlyPlaying === offer._id ? (
                                        <Pause size={16} />
                                      ) : (
                                        <Play size={16} />
                                      )}
                                      <span>{currentlyPlaying === offer._id ? 'Zatrzymaj' : 'Demo'}</span>
                                    </button>
                                  )}
                                  <button
                                    className="home-order-button"
                                    onClick={() => navigate(`/offer/${offer._id}`)}
                                  >
                                    Zamów
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Lista ofert */}
      {offers.length > 0 ? (
        <>
          <div className="home-offers-grid">
            {offers.map(offer => (
              <div key={offer._id} className="home-offer-card">
                <div className="home-offer-image">
                  {offer.photos?.[0] ? (
                    <>
                      <img
                        src={`http://localhost:5000/api/files/${typeof offer.photos[0] === 'string'
                          ? offer.photos[0]
                          : offer.photos[0].id || offer.photos[0]
                          }`}
                        alt={`${offer.artistName} - ${offer.performerType}`}
                        onLoad={() => handleImageLoad(offer._id)}
                        onError={() => handleImageError(offer._id)}
                        style={{
                          display: loadingImages[offer._id] === false ? 'block' : 'none'
                        }}
                      />
                      {(loadingImages[offer._id] === undefined || loadingImages[offer._id] === true) && (
                        <div className="home-loading-spinner-container">
                          <div className="home-loading-spinner-small" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="home-no-image">Brak zdjęcia</div>
                  )}
                </div>

                <div className="home-offer-details">
                  <div className="home-offer-header">
                    <h3>{offer.artistName}</h3>
                    <button
                      className={`home-favorite-button ${favorites.includes(offer._id) ? 'active' : ''}`}
                      onClick={() => toggleFavorite(offer._id)}
                      aria-label={favorites.includes(offer._id) ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                    >
                      <Heart
                        size={20}
                        fill={favorites.includes(offer._id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>

                  <div className="home-offer-meta-group">
                    <span className="home-offer-type">
                      <Music size={16} />
                      {performerTypeOptions.find(opt => opt.value === offer.performerType)?.label || offer.performerType}
                    </span>
                    <span className="home-offer-location">
                      <MapPin size={16} />
                      {offer.location}
                    </span>
                  </div>

                  {offer.description && (
                    <p className="home-offer-description">
                      {offer.description.length > 120
                        ? `${offer.description.substring(0, 120)}...`
                        : offer.description}
                    </p>
                  )}

                  <div className="home-offer-tags">
                    {offer.musicStyles?.slice(0, 3).map(style => (
                      <span key={style} className="home-tag-small" data-category="Gatunek">{style}</span>
                    ))}
                    {offer.eventTypes?.slice(0, 2).map(type => (
                      <span key={type} className="home-tag-small" data-category="Wydarzenie">{type}</span>
                    ))}
                    {offer.instruments?.slice(0, 1).map(instrument => (
                      <span key={instrument} className="home-tag-small" data-category="Instrumenty">{instrument}</span>
                    ))}
                  </div>

                  <div className="home-offer-meta-group">
                    <span className="home-offer-price">
                      <DollarSign size={16} />
                      {offer.price?.min} - {offer.price?.max} PLN
                    </span>
                    <span className="home-offer-duration">
                      <Clock size={16} />
                      {offer.duration?.min} - {offer.duration?.max} h
                    </span>
                  </div>

                  <div className="home-offer-ratings">
                    <span>
                      <Star size={16} fill="currentColor" />
                      {offer.averageRating?.toFixed(1) || 'Brak'}
                    </span>
                    <span>
                      <MessageSquare size={16} />
                      {offer.commentsCount || 0}
                    </span>
                  </div>

                  <div className="home-offer-actions">
                    {offer.audioDemo && (
                      <button
                        className={`home-play-button ${currentlyPlaying === offer._id ? 'playing' : ''}`}
                        onClick={() => togglePlay(offer._id, offer.audioDemo)}
                      >
                        {currentlyPlaying === offer._id ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} />
                        )}
                        <span>{currentlyPlaying === offer._id ? 'Zatrzymaj' : 'Demo'}</span>
                      </button>
                    )}
                    <button
                      className="home-order-button"
                      onClick={() => navigate(`/offer/${offer._id}`)}
                    >
                      Zamów
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginacja */}
          {totalPages > 1 && (
            <div className="home-pagination">
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
        </>
      ) : (
        <div className="home-no-results-wrapper">
          <div className="home-no-results-container">
            <AlertCircle className="home-no-results-icon" size={64} strokeWidth={1.5} />
            <h3 className="home-no-results-title">
              {searchQuery
                ? `Nie znaleziono wyników dla "${searchQuery}"`
                : 'Nie znaleziono pasujących ofert'}
            </h3>
            <p className="home-no-results-message">
              {searchQuery
                ? 'Spróbuj zmienić zapytanie wyszukiwania lub wyczyść filtry.'
                : 'Twoje kryteria wyszukiwania nie pasują do żadnej dostępnej oferty. Spróbuj zmienić filtry lub poszerzyć zakres wyszukiwania.'}
            </p>
            <div className="home-no-results-actions">
              {searchQuery && (
                <button
                  className="home-no-results-button"
                  onClick={clearSearch}
                >
                  Wyczyść wyszukiwanie
                </button>
              )}
              {hasAnyTag && (
                <button
                  className="home-no-results-button"
                  onClick={clearAllTags}
                >
                  <FilterX size={18} className="button-icon" strokeWidth={1.75} />
                  Wyczyść wszystkie filtry
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default HomePage;