import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Music, Video, Image, DollarSign, Clock, User, Mail, ChevronDown, Phone, MapPin, X } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./AddOfferForm.css"

const musicStyleOptions = [
    'Pop', 'Rock', 'Jazz', 'Klasyczna', 'Hip-hop', 'Elektroniczna',
    'Folk', 'R&B', 'Metal', 'Blues', 'Funk', 'Reggae', 'Disco', 'Inne'
];

const eventTypeOptions = [
    'Wesele', 'Ślub', 'Impreza firmowa', 'Koncert', 'Festyn', 'Urodziny',
    'Studniówka', 'Chrzciny', 'Komunia', 'Bal', 'Inne'
];

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

const instrumentOptions = [
    'Gitara', 'Perkusja', 'Pianino', 'Skrzypce', 'Saksofon',
    'Flet', 'Trąbka', 'Wiolonczela', 'Harfa', 'Akordeon', 'Inne'
];

const AddOfferForm = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [offerId, setOfferId] = useState(null);
    const [formData, setFormData] = useState({
        artistName: '',
        performerType: '',
        location: '',
        email: '',
        phone: '',
        description: '',
        musicStyles: [],
        eventTypes: [],
        instruments: [],
        priceMin: '',
        priceMax: '',
        durationMin: '',
        durationMax: '',
        photos: [],
        audioDemo: null,
        videoDemo: '',
        availability: ''
    });

    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const debounceTimer = useRef(null);

    useEffect(() => {
        if (formData.location.length < 3) {
            setLocationSuggestions([]);
            return;
        }

        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(async () => {
            try {
                setIsSearching(true);
                setSearchError(null);

                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?` +
                    new URLSearchParams({
                        q: formData.location,
                        countrycodes: 'pl',
                        format: 'json',
                        addressdetails: 1,
                        limit: 10,
                        'accept-language': 'pl',
                        featuretype: 'city,town,village'
                    })
                );

                if (!response.ok) throw new Error('Błąd podczas wyszukiwania');

                const data = await response.json();

                const uniqueLocations = data.reduce((acc, item) => {
                    const locationName = item.address.city || item.address.town || item.address.village;
                    if (locationName && !acc.some(loc => loc.name === locationName)) {
                        acc.push({
                            name: locationName,
                            type: item.type,
                            importance: item.importance,
                            displayName: item.display_name.split(',')[0] 
                        });
                    }
                    return acc;
                }, []);

                uniqueLocations.sort((a, b) => b.importance - a.importance);

                setLocationSuggestions(uniqueLocations);
            } catch (error) {
                console.error('Błąd wyszukiwania:', error);
                setSearchError('Nie udało się wczytać sugestii lokalizacji');
                setLocationSuggestions([]);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(debounceTimer.current);
    }, [formData.location, debounceTimer]);

    useEffect(() => {
        if (location.state?.offerData) {
            const { offerData } = location.state;
            setIsEditing(true);
            setOfferId(offerData._id);

            const transformedPhotos = offerData.photos?.map(photo => {
                // Jeśli photo jest stringiem (ID) lub obiektem z id
                const photoId = typeof photo === 'string' ? photo : photo.id;
                return {
                    id: photoId,
                    url: `http://localhost:5000/api/files/${photoId}`,
                    isExisting: true, 
                    isLoading: true
                };
            }) || [];

            const transformedAudio = offerData.audioDemo ? {
                id: offerData.audioDemo,
                url: `http://localhost:5000/api/files/${offerData.audioDemo}`,
                isExisting: true, 
                name: offerData.audioOriginalName,
                isLoading: false
            } : null;

            setFormData({
                artistName: offerData.artistName,
                performerType: offerData.performerType,
                location: offerData.location,
                email: offerData.email,
                phone: offerData.phone,
                description: offerData.description,
                musicStyles: offerData.musicStyles || [],
                eventTypes: offerData.eventTypes || [],
                instruments: offerData.instruments || [],
                priceMin: offerData.price?.min || '',
                priceMax: offerData.price?.max || '',
                durationMin: offerData.duration?.min || '',
                durationMax: offerData.duration?.max || '',
                photos: transformedPhotos,
                audioDemo: transformedAudio,
                videoDemo: offerData.videoDemo || '',
                availability: offerData.availability || ''
            });
        }
    }, [location.state, user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhoneChange = (e) => {
        const input = e.target.value.replace(/\D/g, '');
        const limitedInput = input.slice(0, 9);
        let formattedInput = '';
        for (let i = 0; i < limitedInput.length; i++) {
            if (i === 3 || i === 6) {
                formattedInput += ' ';
            }
            formattedInput += limitedInput[i];
        }

        setFormData(prev => ({ ...prev, phone: formattedInput }));
    };

    const handleArrayChange = (name, value, checked) => {
        setFormData(prev => {
            const newArray = checked
                ? [...prev[name], value]
                : prev[name].filter(item => item !== value);
            return { ...prev, [name]: newArray };
        });
    };

    const handlePhotoUpload = (e) => {
        const files = Array.from(e.target.files)
            .filter(file => file.size <= 5 * 1024 * 1024)
            .slice(0, 5 - formData.photos.length);

        const newPhotos = files.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            isExisting: false,
            isLoading: true
        }));

        setFormData(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }));
        const loadingTimeouts = newPhotos.map((_, index) => {
            return setTimeout(() => {
                setFormData(prev => ({
                    ...prev,
                    photos: prev.photos.map((photo, i) =>
                        i === prev.photos.length - newPhotos.length + index
                            ? { ...photo, isLoading: false }
                            : photo
                    )
                }));
            }, 1000 + index * 200); // Stopniowe ładowanie
        });
        return () => loadingTimeouts.forEach(timeout => clearTimeout(timeout));
    };

    const handlePhotoDelete = (index) => {
        const photoToDelete = formData.photos[index];
        // Zwolnij URL tylko dla nowych zdjęć
        if (!photoToDelete.isExisting) {
            URL.revokeObjectURL(photoToDelete.preview || photoToDelete.url);
        }
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index)
        }));
    };

    const handleAudioUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.size <= 10 * 1024 * 1024) {
            if (formData.audioDemo && !formData.audioDemo.isExisting) {
                URL.revokeObjectURL(formData.audioDemo.url);
            }
            setFormData(prev => ({
                ...prev,
                audioDemo: {
                    file,
                    url: URL.createObjectURL(file),
                    isExisting: false
                }
            }));
        }
    };

    const handleLocationSelect = (location) => {
        setFormData(prev => ({ ...prev, location: location.name }));
        setLocationSuggestions([]);
    };

    const extractYouTubeId = (url) => {
        const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|watch(?:_popup)?)(?:\.php)?(?:\?|\#!|\/)?(?:.*?v=|v\/|embed\/|shorts\/)?|youtu\.be\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Walidacja lokalizacji
        if (locationSuggestions.length > 0 && !locationSuggestions.some(loc => loc.name === formData.location)) {
            toast.error("Wybierz lokalizację z listy sugerowanych miast.", {
                containerId: 'global-toast'
            });
            setIsSubmitting(false);
            return;
        }

        // Walidacja podstawowych pól
        if (!formData.artistName || !formData.performerType || !formData.location) {
            toast.error("Wypełnij wymagane pola: Nazwa artysty, Rodzaj wykonawcy i Lokalizacja", {
                containerId: 'global-toast'
            });
            return;
        }

        // Walidacja rozmiaru plików
        const isPhotosValid = formData.photos.every(photo => {
            // Jeśli zdjęcie jest nowe (ma właściwość file), sprawdź rozmiar
            if (photo.file) {
                return photo.file.size <= 5 * 1024 * 1024;
            }
            // Jeśli zdjęcie istniejące, pomiń walidację rozmiaru
            return true;
        });

        if (!isPhotosValid) {
            toast.error('Niektóre zdjęcia są zbyt duże (max 5MB)', {
                containerId: 'global-toast'
            });
            setIsSubmitting(false);
            return;
        }

        if (formData.audioDemo && formData.audioDemo.file && formData.audioDemo.file.size > 10 * 1024 * 1024) {
            toast.error('Plik audio jest zbyt duży (max 10MB)', {
                containerId: 'global-toast'
            });
            setIsSubmitting(false);
            return;
        }

        try {
            // Przygotowanie danych formularza
            const formDataToSend = new FormData();
            formDataToSend.append('artistName', formData.artistName);
            formDataToSend.append('performerType', formData.performerType);
            formDataToSend.append('location', formData.location);
            formDataToSend.append('email', formData.email || user.email);
            formDataToSend.append('phone', formData.phone);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('musicStyles', JSON.stringify(formData.musicStyles));
            formDataToSend.append('eventTypes', JSON.stringify(formData.eventTypes));
            formDataToSend.append('instruments', JSON.stringify(formData.instruments));
            formDataToSend.append('priceMin', formData.priceMin);
            formDataToSend.append('priceMax', formData.priceMax);
            formDataToSend.append('durationMin', formData.durationMin);
            formDataToSend.append('durationMax', formData.durationMax);
            formDataToSend.append('videoDemo', formData.videoDemo);
            formDataToSend.append('availability', formData.availability);

            // Najpierw przygotuj listę istniejących i nowych zdjęć
            const existingPhotos = formData.photos
                .filter(photo => photo.isExisting && photo.id)
                .map(photo => photo.id.toString());

            const newPhotos = formData.photos
                .filter(photo => photo.file && !photo.isExisting);

            // Dodaj istniejące zdjęcia jako JSON
            if (existingPhotos.length > 0) {
                formDataToSend.append('existingPhotos', JSON.stringify(existingPhotos));
            } else {
                // Jeśli nie ma istniejących, wyślij pustą tablicę
                formDataToSend.append('existingPhotos', '[]');
            }

            // Dodaj nowe zdjęcia
            newPhotos.forEach(photo => {
                formDataToSend.append('photos', photo.file);
            });

            // Dodawanie pliku audio (jeśli istnieje)
            if (formData.audioDemo) {
                if (formData.audioDemo.file) {
                    formDataToSend.append('audioDemo', formData.audioDemo.file);
                } else if (formData.audioDemo.id) {
                    formDataToSend.append('existingAudioDemo', formData.audioDemo.id);
                }
            }

            // Wysłanie danych przez XMLHttpRequest dla progressu
            const url = isEditing
                ? `http://localhost:5000/api/offers/${offerId}`
                : 'http://localhost:5000/api/offers';
            const method = isEditing ? 'PUT' : 'POST';

            const xhr = new XMLHttpRequest();

            xhr.open(method, url);
            xhr.setRequestHeader('Authorization', `Bearer ${user.token}`);

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data = JSON.parse(xhr.response);
                    toast.success(isEditing
                        ? 'Oferta została pomyślnie zaktualizowana!'
                        : 'Oferta została pomyślnie dodana!', {
                        containerId: 'global-toast'
                    });

                    setTimeout(() => {
                        // Reset formularza po sukcesie
                        setFormData({
                            artistName: '',
                            performerType: '',
                            location: '',
                            email: '',
                            phone: '',
                            description: '',
                            musicStyles: [],
                            eventTypes: [],
                            instruments: [],
                            priceMin: '',
                            priceMax: '',
                            durationMin: '',
                            durationMax: '',
                            photos: [],
                            audioDemo: null,
                            videoDemo: '',
                            availability: ''
                        });

                        // Clean up object URLs
                        formData.photos.forEach(photo => {
                            if (photo.preview) URL.revokeObjectURL(photo.preview);
                        });
                        if (formData.audioDemo?.url && formData.audioDemo.file) {
                            URL.revokeObjectURL(formData.audioDemo.url);
                        }

                        navigate('/my-offers');
                    }, 2000); // 2 sekundy opóźnieniax
                } else {
                    const error = JSON.parse(xhr.responseText);
                    toast.error(error.message || 'Błąd podczas wysyłania oferty', {
                        containerId: 'global-toast'
                    });
                    setIsSubmitting(false);
                }
            };

            xhr.onerror = () => {
                toast.error('Błąd połączenia z serwerem', {
                    containerId: 'global-toast'
                });
                setIsSubmitting(false);
            };

            xhr.onabort = () => {
                toast.error('Wysyłanie zostało przerwane', {
                    containerId: 'global-toast'
                });
                setIsSubmitting(false);
            };

            xhr.send(formDataToSend);

        } catch (error) {
            console.error('Błąd:', error);
            toast.error(error.message || 'Wystąpił błąd', {
                containerId: 'global-toast'
            });
            setIsSubmitting(false);
        }
    };

    // Podświetlanie dopasowania w sugestiach
    const highlightMatch = (text, query) => {
        if (!query) return text;

        const index = text.toLowerCase().indexOf(query.toLowerCase());
        if (index === -1) return text;

        return (
            <>
                {text.substring(0, index)}
                <span className="highlight">{text.substring(index, index + query.length)}</span>
                {text.substring(index + query.length)}
            </>
        );
    };

    return (
        <div className="add-offer-form-container">
            <div className="add-offer-form-header">
                <h2>{isEditing ? 'Edytuj ogłoszenie' : 'Dodaj nowe ogłoszenie'}</h2>
                <p>{isEditing ? 'Zaktualizuj swoją ofertę' : 'Wypełnij formularz, aby dodać swoją ofertę'}</p>
            </div>

            <form onSubmit={handleSubmit} className="add-offer-form">
                {/* Sekcja: Dane podstawowe */}
                <fieldset className="add-offer-form-section">
                    <legend className="add-offer-form-legend"><User size={18} /> Dane podstawowe</legend>
                    <div className="add-offer-form-grid">
                        <div className="add-offer-form-group">
                            <label className="add-offer-form-label">Nazwa artysty/grupy</label>
                            <input
                                type="text"
                                name="artistName"
                                value={formData.artistName}
                                onChange={handleChange}
                                required
                                className="add-offer-form-input"
                            />
                        </div>

                        <div className="add-offer-form-group">
                            <label className="add-offer-form-label">Rodzaj wykonawcy</label>
                            <div className="add-offer-select-wrapper">
                                <select
                                    name="performerType"
                                    value={formData.performerType}
                                    onChange={handleChange}
                                    required
                                    className="add-offer-form-input add-offer-form-select"
                                >
                                    <option value="" disabled hidden>Wybierz...</option>
                                    {performerTypeOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="add-offer-select-icon" size={20} />
                            </div>
                        </div>

                        <div className="add-offer-form-group add-offer-location-group">
                            <label className="add-offer-form-label"><MapPin size={16} /> Lokalizacja</label>
                            <div className="add-offer-location-autocomplete">
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    required
                                    autoComplete="off"
                                    className={`add-offer-form-input add-offer-location-input ${(isSearching || locationSuggestions.length > 0 || searchError) ? 'dropdown-visible' : ''}`}
                                />
                                {isSearching && (
                                    <div className="add-offer-suggestions-dropdown">
                                        <div className="add-offer-suggestion-item add-offer-loading">Wyszukiwanie...</div>
                                    </div>
                                )}
                                {!isSearching && locationSuggestions.length > 0 && (
                                    <ul className="add-offer-suggestions-dropdown">
                                        {locationSuggestions.map((location, index) => (
                                            <li
                                                key={index}
                                                className="add-offer-suggestion-item"
                                                onClick={() => handleLocationSelect(location)}
                                            >
                                                <span>{highlightMatch(location.displayName, formData.location)}</span>
                                                <span className="add-offer-suggestion-type">{location.type}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {searchError && (
                                    <div className="add-offer-suggestions-dropdown">
                                        <div className="add-offer-suggestion-item add-offer-error">{searchError}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="add-offer-form-group">
                            <label className="add-offer-form-label"><Mail size={16} /> Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="add-offer-form-input"
                            />
                        </div>

                        <div className="add-offer-form-group">
                            <label className="add-offer-form-label"><Phone size={16} /> Telefon</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={handlePhoneChange}
                                pattern="[0-9]{3} [0-9]{3} [0-9]{3}"
                                placeholder="123 456 789"
                                required
                                className="add-offer-form-input"
                            />
                        </div>
                    </div>
                </fieldset>

                <fieldset className="add-offer-form-section">
                    <legend className="add-offer-form-legend"><Music size={18} /> Oferta i styl muzyczny</legend>

                    <div className="add-offer-form-group">
                        <label className="add-offer-form-label">Krótkie przedstawienie</label>
                        <div className="add-offer-textarea-wrapper">
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                maxLength={500}
                                placeholder="Opisz swoje doświadczenie, co oferujesz..."
                                required
                                className="add-offer-form-textarea"
                            />
                            <span className={`add-offer-char-counter ${formData.description.length > 400 ? 'warning' : ''
                                } ${formData.description.length >= 500 ? 'error' : ''
                                }`}>
                                {formData.description.length}/500
                            </span>
                        </div>
                    </div>

                    <div className="add-offer-form-group">
                        <label className="add-offer-form-label">Style muzyczne</label>
                        <div className="add-offer-checkbox-group">
                            {musicStyleOptions.map(style => (
                                <label key={style} className="add-offer-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.musicStyles.includes(style)}
                                        onChange={(e) => handleArrayChange('musicStyles', style, e.target.checked)}
                                    />
                                    <span className="add-offer-checkmark"></span>
                                    {style}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="add-offer-form-group">
                        <label className="add-offer-form-label">Instrumenty</label>
                        <div className="add-offer-checkbox-group">
                            {instrumentOptions.map(instrument => (
                                <label key={instrument} className="add-offer-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.instruments.includes(instrument)}
                                        onChange={(e) => handleArrayChange('instruments', instrument, e.target.checked)}
                                    />
                                    <span className="add-offer-checkmark"></span>
                                    {instrument}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="add-offer-form-group">
                        <label className="add-offer-form-label">Typy obsługiwanych wydarzeń</label>
                        <div className="add-offer-checkbox-group">
                            {eventTypeOptions.map(type => (
                                <label key={type} className="add-offer-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.eventTypes.includes(type)}
                                        onChange={(e) => handleArrayChange('eventTypes', type, e.target.checked)}
                                    />
                                    <span className="add-offer-checkmark"></span>
                                    {type}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="add-offer-price-duration-group">
                        <div className="add-offer-form-group">
                            <label className="add-offer-form-label"><DollarSign size={16} /> Przedział cenowy (PLN)</label>
                            <div className="add-offer-range-input-group">
                                <div className="add-offer-range-input">
                                    <input
                                        type="number"
                                        min="0"
                                        max="10000"
                                        value={formData.priceMin}
                                        onChange={(e) => {
                                            const value = Math.min(10000, Math.max(0, parseInt(e.target.value) || 0));
                                            setFormData(prev => ({
                                                ...prev,
                                                priceMin: value,
                                                priceMax: Math.max(value, prev.priceMax)
                                            }));
                                        }}

                                        placeholder="Min"
                                        className="add-offer-form-input"
                                    />
                                </div>
                                <div className="add-offer-range-input">
                                    <input
                                        type="number"
                                        min={formData.priceMin}
                                        max="15000"
                                        value={formData.priceMax}
                                        onChange={(e) => {
                                            const value = Math.min(
                                                15000,
                                                Math.max(formData.priceMin, parseInt(e.target.value) || formData.priceMin)
                                            );
                                            setFormData(prev => ({ ...prev, priceMax: value }));
                                        }}
                                        placeholder="Max"
                                        className="add-offer-form-input"
                                    />
                                </div>
                            </div>
                            <span className="add-offer-input-hint add-offer-price-hint">Dozwolony zakres</span>
                        </div>

                        <div className="add-offer-form-group">
                            <label className="add-offer-form-label"><Clock size={16} /> Czas trwania (godziny)</label>
                            <div className="add-offer-range-input-group">
                                <div className="add-offer-range-input">
                                    <input
                                        type="number"
                                        min="1"
                                        max="48"
                                        value={formData.durationMin}
                                        onChange={(e) => {
                                            const value = Math.min(48, Math.max(1, parseInt(e.target.value) || 1));
                                            setFormData(prev => ({
                                                ...prev,
                                                durationMin: value,
                                                durationMax: Math.max(value, prev.durationMax)
                                            }));
                                        }}
                                        placeholder="Min"
                                        className="add-offer-form-input"
                                    />
                                </div>
                                <div className="add-offer-range-input">
                                    <input
                                        type="number"
                                        min={formData.durationMin}
                                        max="48"
                                        value={formData.durationMax}
                                        onChange={(e) => {
                                            const value = Math.min(
                                                48,
                                                Math.max(formData.durationMin, parseInt(e.target.value) || formData.durationMin)
                                            );
                                            setFormData(prev => ({ ...prev, durationMax: value }));
                                        }}
                                        placeholder="Max"
                                        className="add-offer-form-input"
                                    />
                                </div>
                            </div>
                            <span className="add-offer-input-hint add-offer-duration-hint">Dozwolony zakres</span>
                        </div>
                    </div>
                </fieldset>

                <fieldset className="add-offer-form-section">
                    <legend className="add-offer-form-legend"><Image size={18} /> Materiały multimedialne</legend>

                    <div className="add-offer-form-group">
                        <label className="add-offer-form-label">Zdjęcia promocyjne (max 5)</label>
                        <div className="add-offer-file-input-wrapper">
                            <input
                                type="file"
                                id="photo-upload"
                                accept="image/*"
                                multiple
                                onChange={handlePhotoUpload}
                                disabled={formData.photos.length >= 5}
                                className="add-offer-file-input"
                            />
                            <label htmlFor="photo-upload" className="add-offer-file-input-label">
                                <Image size={16} /> Wybierz zdjęcia
                            </label>
                        </div>
                        <small className="add-offer-file-hint">Maksymalny rozmiar pliku: 5MB</small>

                        <div className="add-offer-thumbnails">
                            {formData.photos.map((photo, index) => (
                                <div
                                    key={photo.id || index}
                                    className="add-offer-thumbnail"
                                    onClick={() => !photo.isLoading && handlePhotoDelete(index)}
                                >
                                    {photo.isLoading && (
                                        <div className="thumbnail-loading-overlay">
                                            <div className="loading-spinner"></div>
                                        </div>
                                    )}
                                    <img
                                        src={photo.preview || photo.url}
                                        onLoad={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                photos: prev.photos.map((p, i) =>
                                                    i === index ? { ...p, isLoading: false } : p
                                                )
                                            }));
                                        }}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            setFormData(prev => ({
                                                ...prev,
                                                photos: prev.photos.map((p, i) =>
                                                    i === index ? { ...p, isLoading: false } : p
                                                )
                                            }));
                                        }}
                                        style={{ display: photo.isLoading ? 'none' : 'block' }}
                                        alt={`Miniatura ${index + 1}`}
                                    />
                                    {!photo.isLoading && (
                                        <div className="add-offer-delete-overlay">
                                            <X size={20} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="add-offer-form-group">
                        <label className="add-offer-form-label">Demo audio</label>
                        <div className="add-offer-file-input-wrapper">
                            <input
                                type="file"
                                id="audio-upload"
                                accept="audio/*"
                                onChange={handleAudioUpload}
                                className="add-offer-file-input"
                            />
                            <label htmlFor="audio-upload" className="add-offer-file-input-label">
                                <Music size={16} /> Wybierz plik audio
                            </label>
                        </div>
                        <small className="add-offer-file-hint">Maksymalny rozmiar pliku: 10MB</small>

                        {formData.audioDemo && (
                            <div className="add-offer-audio-player">
                                <div className="add-offer-audio-info">
                                    {formData.audioDemo.name}
                                    {formData.audioDemo.isExisting && (
                                        <span className="add-offer-existing-badge">
                                            (Oryginalny plik)
                                        </span>
                                    )}
                                </div>
                                <div className="add-offer-audio-controls">
                                    <audio controls src={formData.audioDemo.url} />
                                    <button
                                        type="button"
                                        className="add-offer-audio-delete-btn"
                                        onClick={() => {
                                            if (!formData.audioDemo.isExisting) {
                                                URL.revokeObjectURL(formData.audioDemo.url);
                                            }
                                            setFormData(prev => ({ ...prev, audioDemo: null }));
                                        }}
                                    >
                                        Usuń
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="add-offer-form-group">
                        <label className="add-offer-form-label">Demo video (link YouTube)</label>
                        <div className="add-offer-youtube-input-group">
                            <input
                                type="url"
                                name="videoDemo"
                                value={formData.videoDemo}
                                onChange={handleChange}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="add-offer-form-input"
                            />
                            <span className="add-offer-youtube-badge">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                                </svg>
                                YouTube
                            </span>
                        </div>

                        {formData.videoDemo && (
                            <div className="add-offer-youtube-preview">
                                <iframe
                                    width="75%"
                                    height="300"
                                    src={`https://www.youtube.com/embed/${extractYouTubeId(formData.videoDemo)}`}
                                    title="YouTube demo video"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}
                    </div>
                </fieldset>

                <fieldset className="add-offer-form-section">
                    <legend className="add-offer-form-legend"><Calendar size={18} /> Dostępność terminów</legend>

                    <div className="add-offer-form-group">
                        <label className="add-offer-form-label">Ogólna dostępność</label>
                        <div className="add-offer-textarea-wrapper">
                            <textarea
                                name="availability"
                                value={formData.availability}
                                onChange={handleChange}
                                maxLength={300}
                                placeholder="Opisz swoją ogólną dostępność..."
                                className="add-offer-form-textarea"
                                rows={3}
                            />
                            <span className={`add-offer-char-counter ${formData.availability.length > 250 ? 'warning' : ''
                                } ${formData.availability.length >= 300 ? 'error' : ''
                                }`}>
                                {formData.availability.length}/300
                            </span>
                        </div>
                    </div>

                    <div className="add-offer-form-group">
                        <button
                            type="button"
                            className="add-offer-calendar-button"
                            onClick={() => {
                                const newWindow = window.open('', '_blank');
                                newWindow.location = '/calendar';
                            }}
                        >
                            <Calendar size={16} /> Przejdź do kalendarza występów
                        </button>
                        <small className="add-offer-calendar-hint">Dodaj szczegółowe terminy w kalendarzu</small>
                    </div>
                </fieldset>

                <div className="add-offer-form-actions">
                    <button
                        type="submit"
                        className="add-offer-submit-button"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                <span className="ms-2">
                                    {isEditing ? 'Aktualizowanie...' : 'Publikowanie...'}
                                </span>
                            </>
                        ) : isEditing ? 'Zaktualizuj ogłoszenie' : 'Opublikuj ogłoszenie'}
                    </button>
                </div>
            </form>
        </div >
    );
};

export default AddOfferForm;