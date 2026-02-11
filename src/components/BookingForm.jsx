import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock, User, MapPin, Music, Users, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { format, addHours, isSameDay } from 'date-fns';
import './BookingForm.css';

const BookingForm = ({ offer, onClose }) => {
  const { id } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    clientName: '',
    clientContact: '',
    clientAddress: '',
    clientPeselNip: '',
    eventType: offer?.eventTypes?.[0] || '',
    eventDate: '',
    startTime: '18:00',
    endTime: '22:00',
    endDate: null,
    duration: 4,
    eventLocation: '',
    bandComposition: offer?.performerType || '',
    instruments: [],
    eventDescription: '',
    totalPrice: '',
    paymentTerms: '50% zaliczki, 50% w dniu wydarzenia',
    customPaymentTerms: '',
    depositAmount: '',
    depositRefundable: true,
    clientResponsibilities: 'Zapewnienie dostępu do prądu, odpowiedniej przestrzeni do występu, parkingu dla zespołu',
    artistResponsibilities: 'Przybycie na miejsce minimum 1 godzinę przed rozpoczęciem, wykonanie ustalonego repertuaru',
    cancellationTerms: 'Rezygnacja na mniej niż 30 dni przed wydarzeniem wiąże się z utratą zaliczki',
    finalContractDeadline: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [artistAvailability, setArtistAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [showCustomPaymentTerms, setShowCustomPaymentTerms] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const maxWordCount = 500;

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.token || !offer?.userId) return;

      try {
        const profileResponse = await fetch('http://localhost:5000/api/profile', {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setFormData(prev => ({
            ...prev,
            clientName: profileData.profile.name ||
              profileData.profile.organizationName ||
              profileData.profile.displayName || '',
            clientContact: profileData.profile.phone || user.email || '',
            clientAddress: profileData.profile.address || '',
            clientPeselNip: profileData.profile.nip || profileData.profile.pesel || ''
          }));
        }

        const availabilityResponse = await fetch(
          `http://localhost:5000/api/availabilities/${offer.userId}`,
          {
            headers: {
              'Authorization': `Bearer ${user.token}`
            }
          }
        );

        if (!availabilityResponse.ok) {
          console.error('Błąd pobierania dostępności:', await availabilityResponse.text());
          return;
        }

        if (availabilityResponse.ok) {
          const availabilityData = await availabilityResponse.json();
          setArtistAvailability(availabilityData.availability);
        }
      } catch (error) {
        console.error('Błąd pobierania danych:', error);
      } finally {
        setLoadingAvailability(false);
      }
    };

    fetchData();
  }, [user, offer]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDescriptionChange = (e) => {
    const text = e.target.value;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    setWordCount(words);

    if (words <= maxWordCount) {
      handleChange(e);
    }
  };

  const handleNumericChange = (e) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/[^0-9.]/g, '');
    if (!isNaN(numericValue)) {
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    }
  };

  const handleInstrumentChange = (instrument) => {
    setFormData(prev => {
      const newInstruments = prev.instruments.includes(instrument)
        ? prev.instruments.filter(i => i !== instrument)
        : [...prev.instruments, instrument];

      return {
        ...prev,
        instruments: newInstruments
      };
    });
  };

  const handleDurationChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const duration = value ? parseInt(value) : '';

    setFormData(prev => ({
      ...prev,
      duration
    }));

    if (duration && formData.eventDate && formData.startTime) {
      updateEndTime(duration);
    }
  };

  const updateEndTime = (duration) => {
    const [hours, minutes] = formData.startTime.split(':').map(Number);
    const startDate = new Date(formData.eventDate);
    startDate.setHours(hours, minutes);

    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + duration);

    const isNextDay = !isSameDay(startDate, endDate);

    setFormData(prev => ({
      ...prev,
      endTime: format(endDate, 'HH:mm'),
      endDate: isNextDay ? format(endDate, 'yyyy-MM-dd') : null
    }));
  };

  const isDateAvailable = (date) => {
    if (!artistAvailability) return true;
    const dateStr = new Date(date).toISOString().split('T')[0];
    return artistAvailability[dateStr]?.status === 'available';
  };

  const validate = () => {
    const newErrors = {};
    let isValid = true;

    // Required fields validation
    const requiredFields = [
      'clientName', 'clientContact', 'eventDate',
      'eventLocation', 'totalPrice', 'eventType'
    ];

    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'To pole jest wymagane';
        isValid = false;
      }
    });

    // Numeric validation
    if (!formData.totalPrice || isNaN(formData.totalPrice)) {
      newErrors.totalPrice = 'Podaj poprawną kwotę';
      isValid = false;
    }

    // Instruments validation
    if (offer?.instruments?.length > 0 && formData.instruments.length === 0) {
      newErrors.instruments = 'Wybierz co najmniej jeden instrument';
      isValid = false;
    }

    // Duration validation
    if (!formData.duration) {
      newErrors.duration = 'Podaj czas trwania';
      isValid = false;
    } else {
      const minDuration = offer?.duration?.min || 1;
      const maxDuration = offer?.duration?.max || 8;

      if (formData.duration < minDuration || formData.duration > maxDuration) {
        newErrors.duration = `Czas trwania musi być między ${minDuration} a ${maxDuration} godzinami`;
        isValid = false;
      }
    }

    // Date availability check
    if (formData.eventDate && artistAvailability) {
      const selectedDate = new Date(formData.eventDate).toISOString().split('T')[0];
      const dayAvailability = artistAvailability[selectedDate];

      if (!dayAvailability || dayAvailability.status !== 'available') {
        newErrors.eventDate = 'Artysta nie jest dostępny w wybranym terminie';
        isValid = false;
      }
    }

    console.log('Validation errors:', newErrors);
    setErrors(newErrors);
    return isValid;
  };

  useEffect(() => {
    console.log('Current form data:', formData);
  }, [formData]);

  useEffect(() => {
    console.log('Current errors:', errors);
  }, [errors]);

  console.log('Checking required fields:', {
    clientName: !!formData.clientName,
    clientContact: !!formData.clientContact,
    eventDate: !!formData.eventDate,
    eventLocation: !!formData.eventLocation,
    totalPrice: !!formData.totalPrice,
    eventType: !!formData.eventType,
    duration: !!formData.duration
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submit clicked');

    const isValid = validate();
    console.log('Validation result:', isValid, 'Errors:', errors);

    if (!isValid) {
      console.log('Form invalid, not submitting');
      return;
    }

    setIsSubmitting(true);
    console.log('Submitting form data:', formData);

    try {
      const response = await fetch('http://localhost:5000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          offerId: id,
          ...formData,
          instruments: formData.instruments.join(', ')
        })
      });

      const data = await response.json();
      console.log('Response:', data);

      if (!response.ok) throw new Error(data.message || 'Błąd serwera');

      setSuccess(true);
      setTimeout(() => {
        onClose();
        navigate('/bookings');
      }, 2000);
    } catch (error) {
      console.error('Submission error:', error);
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  if (success) {
    return (
      <div className="booking-success">
        <h3>Rezerwacja wysłana!</h3>
        <p>Twoja prośba o rezerwację została wysłana do wykonawcy.</p>
        <p>Oczekuj na potwierdzenie.</p>
      </div>
    );
  }

  if (loadingAvailability) {
    return (
      <div className="booking-loading">
        <p>Sprawdzanie dostępności artysty...</p>
      </div>
    );
  }

  return (
    <div className="booking-form-container">
      <h2>Formularz rezerwacji</h2>
      <p className="booking-subtitle">Umowa przedwstępna - {offer?.artistName}</p>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3><User size={18} /> Dane zamawiającego</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Imię i nazwisko / Nazwa firmy</label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                required
                className={errors.clientName ? 'error-input' : ''}
              />
              {errors.clientName && <span className="error">{errors.clientName}</span>}
            </div>

            <div className="form-group">
              <label>Kontakt (telefon/email)</label>
              <input
                type="text"
                name="clientContact"
                value={formData.clientContact}
                onChange={handleChange}
                required
                className={errors.clientContact ? 'error-input' : ''}
              />
              {errors.clientContact && <span className="error">{errors.clientContact}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Adres</label>
              <input
                type="text"
                name="clientAddress"
                value={formData.clientAddress}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>PESEL / NIP</label>
              <input
                type="text"
                name="clientPeselNip"
                value={formData.clientPeselNip}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3><Calendar size={18} /> Szczegóły wydarzenia</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Rodzaj wydarzenia</label>
              <select
                name="eventType"
                value={formData.eventType}
                onChange={handleChange}
                className={errors.eventType ? 'error-input' : ''}
              >
                <option value="">Wybierz rodzaj wydarzenia</option>
                {offer?.eventTypes?.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.eventType && <span className="error">{errors.eventType}</span>}
            </div>

            <div className="form-group">
              <label>Data wydarzenia</label>
              <input
                type="date"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
                className={errors.eventDate ? 'error-input' : ''}
                onFocus={(e) => {
                  if (!artistAvailability) return;
                  const today = new Date().toISOString().split('T')[0];
                  const input = e.target;

                  input.min = today;

                  input.addEventListener('input', function () {
                    const selectedDate = this.value;
                    if (selectedDate && !isDateAvailable(selectedDate)) {
                      this.setCustomValidity('Artysta nie jest dostępny w wybranym terminie');
                      this.reportValidity();
                      this.value = '';
                    } else {
                      this.setCustomValidity('');
                    }
                  });
                }}
              />
              {errors.eventDate && <span className="error">{errors.eventDate}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Godzina rozpoczęcia</label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={(e) => {
                  handleChange(e);
                  if (formData.duration) {
                    updateEndTime(formData.duration);
                  }
                }}
                required
              />
            </div>

            <div className="form-group">
              <label>Czas trwania (godziny)</label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleDurationChange}
                required
                className={errors.duration ? 'error-input' : ''}
              />
              <div className="form-hint">
                Dozwolony zakres: {offer?.duration?.min || 1} - {offer?.duration?.max || 8} godzin
              </div>
              {errors.duration && <span className="error">{errors.duration}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Godzina zakończenia</label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                readOnly
                className="read-only-input"
              />
            </div>

            {formData.endDate && (
              <div className="form-group">
                <label>Data zakończenia</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  readOnly
                  className="read-only-input"
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label><MapPin size={18} /> Miejsce wydarzenia (adres, sala)</label>
            <input
              type="text"
              name="eventLocation"
              value={formData.eventLocation}
              onChange={handleChange}
              required
              className={errors.eventLocation ? 'error-input' : ''}
            />
            {errors.eventLocation && <span className="error">{errors.eventLocation}</span>}
          </div>

          <div className="form-group">
            <label>Opis wydarzenia</label>
            <div className="textarea-container">
              <textarea
                name="eventDescription"
                value={formData.eventDescription}
                onChange={handleDescriptionChange}
                rows="4"
                placeholder="Opisz szczegóły wydarzenia, oczekiwania, tematykę itp."
              />
              <div className="character-counter">
                {wordCount}/{maxWordCount} słów
              </div>
            </div>
          </div>

          <div className="form-group">
            <label><Music size={18} /> Skład</label>
            <input
              type="text"
              name="bandComposition"
              value={offer?.performerType || ''}
              readOnly
              className="read-only-input"
            />
          </div>
        </div>

        {offer?.instruments?.length > 0 && (
          <div className="form-section">
            <h3><Music size={18} /> Instrumenty</h3>
            <div className="instruments-checkboxes">
              {offer.instruments.map(instrument => (
                <div key={instrument} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`instrument-${instrument}`}
                    checked={formData.instruments.includes(instrument)}
                    onChange={() => handleInstrumentChange(instrument)}
                  />
                  <label htmlFor={`instrument-${instrument}`}>{instrument}</label>
                </div>
              ))}
            </div>
            {errors.instruments && <span className="error">{errors.instruments}</span>}
          </div>
        )}

        <div className="form-section">
          <h3><DollarSign size={18} /> Wynagrodzenie</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Kwota brutto (PLN)</label>
              <input
                type="text"
                name="totalPrice"
                value={formData.totalPrice}
                onChange={handleNumericChange}
                required
                className={errors.totalPrice ? 'error-input' : ''}
              />
              <div className="form-hint">
                Sugerowany zakres: {offer?.price?.min || 0} - {offer?.price?.max || 10000} PLN
              </div>
              {errors.totalPrice && <span className="error">{errors.totalPrice}</span>}
            </div>

            <div className="form-group">
              <label>Warunki płatności</label>
              <select
                name="paymentTerms"
                value={formData.paymentTerms}
                onChange={(e) => {
                  setShowCustomPaymentTerms(e.target.value === 'inny');
                  handleChange(e);
                }}
              >
                <option value="50% zaliczki, 50% w dniu wydarzenia">50% zaliczki, 50% w dniu wydarzenia</option>
                <option value="100% z góry">100% z góry</option>
                <option value="100% w dniu wydarzenia">100% w dniu wydarzenia</option>
                <option value="inny">Inne (określ poniżej)</option>
              </select>
            </div>
          </div>

          {showCustomPaymentTerms && (
            <div className="form-group">
              <label>Niestandardowe warunki płatności</label>
              <textarea
                name="customPaymentTerms"
                value={formData.customPaymentTerms}
                onChange={handleChange}
                rows="2"
                placeholder="Wpisz swoje warunki płatności..."
              />
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Zaliczka (PLN)</label>
              <input
                type="text"
                name="depositAmount"
                value={formData.depositAmount}
                onChange={handleNumericChange}
              />
            </div>

            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="depositRefundable"
                name="depositRefundable"
                checked={formData.depositRefundable}
                onChange={handleChange}
              />
              <label htmlFor="depositRefundable">Zaliczka zwrotna w przypadku rezygnacji</label>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3><Users size={18} /> Obowiązki stron</h3>
          <div className="form-group">
            <label>Obowiązki zamawiającego</label>
            <textarea
              name="clientResponsibilities"
              value={formData.clientResponsibilities}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Obowiązki wykonawcy</label>
            <textarea
              name="artistResponsibilities"
              value={formData.artistResponsibilities}
              onChange={handleChange}
              rows="3"
            />
          </div>
        </div>

        <div className="form-section">
          <h3><AlertCircle size={18} /> Warunki odstąpienia</h3>
          <div className="form-group">
            <label>Zasady rezygnacji</label>
            <textarea
              name="cancellationTerms"
              value={formData.cancellationTerms}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Termin podpisania umowy ostatecznej (opcjonalnie)</label>
            <input
              type="date"
              name="finalContractDeadline"
              value={formData.finalContractDeadline}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {errors.submit && (
          <div className="form-error">
            <AlertCircle size={16} />
            <span>{errors.submit}</span>
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={onClose} className="secondary">
            Anuluj
          </button>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Wysyłanie...' : 'Wyślij prośbę o rezerwację'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;