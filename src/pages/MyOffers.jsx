import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { toast } from 'react-toastify';
import { DollarSign, Clock, Eye, EyeOff, Edit, Trash2, Plus } from 'lucide-react';
import './MyOffers.css';

const MyOffers = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(null);
    const [loadingImages, setLoadingImages] = useState({});

    const handleImageLoad = (offerId) => {
        setLoadingImages(prev => ({ ...prev, [offerId]: false }));
    };

    const handleImageError = (offerId) => {
        setLoadingImages(prev => ({ ...prev, [offerId]: false }));
    };

    useEffect(() => {
        const fetchUserOffers = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/offers/my-offers', {
                    headers: {
                        'Authorization': `Bearer ${user.token}`
                    }
                });

                if (!response.ok) throw new Error('Błąd podczas ładowania ofert');

                const data = await response.json();

                if (data.success && Array.isArray(data.offers)) {
                    setOffers(data.offers);
                } else {
                    setOffers([]); // Ustaw pustą tablicę jeśli struktura jest nieprawidłowa
                    console.error('Nieprawidłowa struktura odpowiedzi:', data);
                }
            } catch (err) {
                console.error('Błąd pobierania ofert:', err);
                setError(err.message);
                setOffers([]); // Ustaw pustą tablicę w przypadku błędu
            } finally {
                setLoading(false);
            }
        };

        if (user?.token) {
            fetchUserOffers();
        }
    }, [user]);

    const handleDelete = async (offerId) => {
        if (!window.confirm('Czy na pewno chcesz usunąć tę ofertę?')) return;

        try {
            const response = await fetch(`http://localhost:5000/api/offers/${offerId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            if (!response.ok) throw new Error('Błąd podczas usuwania oferty');

            setOffers(offers.filter(offer => offer._id !== offerId));
            toast.success('Oferta została usunięta', { containerId: 'global-toast' });
        } catch (error) {
            toast.error(error.message, { containerId: 'global-toast' });
        }
    };

    const handleToggleStatus = async (offerId, currentStatus) => {
        setUpdatingStatus(offerId);

        try {
            const response = await fetch(`http://localhost:5000/api/offers/${offerId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ active: currentStatus !== 'active' })
            });

            if (!response.ok) {
                throw new Error('Błąd podczas aktualizacji statusu');
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Nie udało się zaktualizować statusu');
            }
            setOffers(offers.map(offer =>
                offer._id === offerId ? {
                    ...offer,
                    status: data.status
                } : offer
            ));

            toast.success(data.message, { containerId: 'global-toast' });
        } catch (error) {
            console.error('Błąd zmiany statusu:', error);
            toast.error(error.message || 'Wystąpił błąd podczas zmiany statusu', {
                containerId: 'global-toast'
            });
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleEdit = (offerId) => {
        const offerToEdit = offers.find(offer => offer._id === offerId);
        navigate('/edit-offer/${offerId', {
            state: {
                offerData: {
                    ...offerToEdit,
                    photos: offerToEdit.photos.map(photo => ({
                        id: typeof photo === 'string' ? photo : photo.id,
                        isExisting: true,
                        url: `http://localhost:5000/api/files/${typeof photo === 'string' ? photo : photo.id}`
                    })) || [],
                    audioDemo: offerToEdit.audioDemo?.id || offerToEdit.audioDemo,
                    audioOriginalName: offerToEdit.audioDemo?.originalName ||
                        offerToEdit.audioDemo?.name ||
                        'demo-audio.mp3'
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Ładowanie ofert...</p>
            </div>
        );
    }

    return (
        <div className="my-offers-container">
            <div className="my-offers-header">
                <h1>Moje ogłoszenia</h1>
                {offers.length > 0 && (
                    <button
                        className="add-new-button"
                        onClick={() => navigate('/create-offer')}
                    >
                        + Dodaj nowe ogłoszenie
                    </button>
                )}
            </div>

            {offers.length === 0 ? (
                <div className="no-offers">
                    <p>Nie masz jeszcze żadnych ogłoszeń</p>
                    <button
                        className="primary-button"
                        onClick={() => navigate('/create-offer')}
                    >
                        <Plus size={18} /> Utwórz pierwsze ogłoszenie
                    </button>
                </div>
            ) : (
                <div className="offers-grid">
                    {offers.map(offer => (
                        <div key={offer._id} className={`offer-card ${offer.status === 'inactive' ? 'inactive' : ''}`}>
                            <div className="offer-image">
                                {offer.photos?.[0] ? (
                                    <>
                                        <img
                                            src={`http://localhost:5000/api/files/${typeof offer.photos[0] === 'string'
                                                ? offer.photos[0]
                                                : offer.photos[0].id || offer.photos[0]
                                                }`}
                                            onLoad={() => handleImageLoad(offer._id)}
                                            onError={() => handleImageError(offer._id)}
                                            style={{
                                                display: loadingImages[offer._id] === false ? 'block' : 'none'
                                            }}
                                        />
                                        {(loadingImages[offer._id] === undefined || loadingImages[offer._id] === true) && (
                                            <div className="loading-spinner-container">
                                                <div className="loading-spinner-small" />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="no-image">Brak zdjęcia</div>
                                )}
                                {offer.photos?.[0] && (
                                    <div className="no-image" style={{ display: 'none' }}>Brak zdjęcia</div>
                                )}
                            </div>

                            <div className="offer-details">
                                <h3>{offer.artistName}</h3>
                                <p className="offer-type">{offer.performerType}</p>
                                <p className="offer-description">
                                    {offer.description?.length > 100
                                        ? `${offer.description.substring(0, 100)}...`
                                        : offer.description}
                                </p>
                                <p className="offer-location">{offer.location}</p>

                                <div className="offer-meta">
                                    <span><DollarSign size={14} /> {offer.price?.min} - {offer.price?.max} PLN</span>
                                    <span><Clock size={14} /> {offer.duration?.min} - {offer.duration?.max} h</span>
                                </div>

                                <div className="offer-actions">
                                    <button
                                        onClick={() => handleToggleStatus(offer._id, offer.status)}
                                        disabled={updatingStatus === offer._id}
                                        className={`status-button ${offer.status === 'active' ? 'active' : 'inactive'}`}
                                    >
                                        {updatingStatus === offer._id ? (
                                            <span className="loading-spinner-small-extra" />
                                        ) : (
                                            <>
                                                {offer.status === 'active' ? <EyeOff size={16} /> : <Eye size={16} />}
                                                {offer.status === 'active' ? 'Wygaś' : 'Aktywuj'}
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleEdit(offer._id)}
                                        className="edit-button"
                                    >
                                        <Edit size={16} /> Edytuj
                                    </button>

                                    <button
                                        onClick={() => handleDelete(offer._id)}
                                        className="delete-button"
                                    >
                                        <Trash2 size={16} /> Usuń
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyOffers;