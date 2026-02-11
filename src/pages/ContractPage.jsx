import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, Check, Edit, Clock, X, AlertCircle, Mail, Phone,
  Calendar, User, MapPin, Music, Users, DollarSign, AlertTriangle, Info, Link
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import './ContractPage.css';

const ContractPage = () => {
  const { id } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [statusMessage, setStatusMessage] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [customPaymentTerms, setCustomPaymentTerms] = useState('');
  const [characterCounts, setCharacterCounts] = useState({});

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/bookings/${id}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Nie znaleziono umowy');

        const data = await response.json();
        setContract(data.booking);

        const originalFields = {};
        Object.keys(data.booking).forEach(key => {
          if (key.startsWith('original')) {
            originalFields[key] = data.booking[key];
          }
        });
        setOriginalData(originalFields);

        const paymentTerms = data.booking.paymentTerms;
        const isCustomPayment = paymentTerms && ![
          '50% zaliczki, 50% w dniu wydarzenia',
          '100% z góry',
          '100% w dniu wydarzenia'
        ].includes(paymentTerms);

        setFormData({
          eventDate: data.booking.eventDate,
          startTime: data.booking.startTime,
          endTime: data.booking.endTime,
          endDate: data.booking.endDate || data.booking.eventDate,
          eventLocation: data.booking.eventLocation,
          eventType: data.booking.eventType,
          eventDescription: data.booking.eventDescription,
          bandComposition: data.booking.bandComposition,
          instruments: data.booking.instruments || [],
          totalPrice: data.booking.totalPrice,
          paymentTerms: isCustomPayment ? 'inny' : data.booking.paymentTerms,
          depositAmount: data.booking.depositAmount || '',
          depositRefundable: data.booking.depositRefundable || false,
          clientResponsibilities: data.booking.clientResponsibilities,
          artistResponsibilities: data.booking.artistResponsibilities,
          cancellationTerms: data.booking.cancellationTerms,
          finalContractDeadline: data.booking.finalContractDeadline
        });

        setCustomPaymentTerms(isCustomPayment ? paymentTerms : '');

        setCharacterCounts({
          eventDescription: data.booking.eventDescription?.length || 0,
          clientResponsibilities: data.booking.clientResponsibilities?.length || 0,
          artistResponsibilities: data.booking.artistResponsibilities?.length || 0,
          cancellationTerms: data.booking.cancellationTerms?.length || 0
        });
      } catch (err) {
        setError(err.message);
        toast.error("Wystąpił błąd podczas ładowania umowy", {
          containerId: 'global-toast'
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.token && id) {
      fetchContract();
    }
  }, [id, user?.token]);

  useEffect(() => {
    if (contract?.status !== 'modified') {
      setShowDiff(false);
    }
  }, [contract?.status]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (['eventDescription', 'clientResponsibilities', 'artistResponsibilities', 'cancellationTerms'].includes(name)) {
      setCharacterCounts(prev => ({
        ...prev,
        [name]: value.length
      }));
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleInstrumentChange = (instrument) => {
    setFormData(prev => {
      const newInstruments = prev.instruments.includes(instrument)
        ? prev.instruments.filter(i => i !== instrument)
        : [...prev.instruments, instrument];
      return { ...prev, instruments: newInstruments };
    });
  };

  const validateDate = (dateString) => {
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  };

  const handleSubmitChanges = async () => {
    try {
      if (!validateDate(formData.eventDate)) {
        toast.error("Data wydarzenia nie może być w przeszłości", {
          containerId: 'global-toast'
        });
        return;
      }

      if (formData.finalContractDeadline && !validateDate(formData.finalContractDeadline)) {
        toast.error("Termin podpisania umowy nie może być w przeszłości", {
          containerId: 'global-toast'
        });
        return;
      }

      const paymentTermsToSave = formData.paymentTerms === 'inny'
        ? customPaymentTerms
        : formData.paymentTerms;

      const response = await fetch(`http://localhost:5000/api/bookings/${id}/modify`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          paymentTerms: paymentTermsToSave,
          instruments: formData.instruments.join(', '),
          endDate: formData.endDate || formData.eventDate
        })
      });

      if (!response.ok) throw new Error('Nie udało się zaktualizować umowy');

      const data = await response.json();
      setContract(data.booking);
      setIsEditing(false);
      setStatusMessage('Zmiany zostały zapisane i wysłane do akceptacji');
      toast.success("Zmiany zostały zapisane i wysłane do akceptacji", {
        containerId: 'global-toast'
      });
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      setError(err.message);
      toast.error("Nie udało się zaktualizować umowy", {
        containerId: 'global-toast'
      });
    }
  };

  const handleApprove = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'confirmed',
          action: contract.status === 'modified' ? 'accept_modification' : 'confirm'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.conflictingBookings) {
          // Pokaż modal z informacją o kolizji
          setConflictModalData({
            show: true,
            message: errorData.message,
            conflicts: errorData.conflictingBookings
          });
          return;
        }
        throw new Error(errorData.message || 'Nie udało się zaakceptować umowy');
      }

      const data = await response.json();
      setContract(data.booking);
      setStatusMessage('Umowa została zaakceptowana');
      toast.success("Umowa została zaakceptowana", {
        containerId: 'global-toast'
      });
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Nie udało się zaakceptować umowy", {
        containerId: 'global-toast'
      });
    }
  };

  // Dodaj stan dla modala konfliktu
  const [conflictModalData, setConflictModalData] = useState({
    show: false,
    message: '',
    conflicts: []
  });

  const handleReject = async () => {
    try {
      const endpoint = contract.status === 'modified'
        ? `${id}/reject-modification`
        : `${id}/status`;

      const body = contract.status === 'modified'
        ? null
        : JSON.stringify({ status: 'rejected' });

      const response = await fetch(`http://localhost:5000/api/bookings/${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body
      });

      if (!response.ok) throw new Error('Nie udało się odrzucić umowy');

      if (contract.status === 'modified') {
        const data = await response.json();
        setContract(data.booking);
        setStatusMessage('Modyfikacje zostały odrzucone - przywrócono oryginalną wersję');
        toast.success("Modyfikacje zostały odrzucone", {
          containerId: 'global-toast'
        });
        setTimeout(() => setStatusMessage(''), 3000);
      } else {
        navigate('/my-bookings');
        toast.success("Umowa została odrzucona", {
          containerId: 'global-toast'
        });
      }
    } catch (err) {
      setError(err.message);
      toast.error("Nie udało się odrzucić umowy", {
        containerId: 'global-toast'
      });
    }
  };

  const formatDiffValue = (value, isDate, isBoolean, isArray) => {
    if (value === null || value === undefined || value === '') return 'Brak';
    if (isBoolean) return value ? 'Tak' : 'Nie';
    if (isDate) return new Date(value).toLocaleDateString('pl-PL');
    if (isArray) {
      const arr = Array.isArray(value) ? value : (value ? value.split(/\s*,\s*/) : []);
      return arr.length > 0 ? arr.join(', ') : 'Nie wskazano instrumentów';
    }
    return value;
  };

  const hasChanges = (fieldName) => {
    if (!showDiff || !originalData || !contract) return false;

    const fieldConfig = {
      eventType: { originalName: 'originalEventType' },
      eventDescription: { originalName: 'originalEventDescription' },
      eventDate: { originalName: 'originalEventDate', isDate: true },
      startTime: { originalName: 'originalStartTime' },
      endTime: { originalName: 'originalEndTime' },
      endDate: { originalName: 'originalEndDate', isDate: true },
      eventLocation: { originalName: 'originalEventLocation' },
      bandComposition: { originalName: 'originalBandComposition' },
      instruments: { originalName: 'originalInstruments', isArray: true },
      totalPrice: { originalName: 'originalTotalPrice' },
      paymentTerms: { originalName: 'originalPaymentTerms' },
      depositAmount: { originalName: 'originalDepositAmount' },
      depositRefundable: { originalName: 'originalDepositRefundable', isBoolean: true },
      clientResponsibilities: { originalName: 'originalClientResponsibilities' },
      artistResponsibilities: { originalName: 'originalArtistResponsibilities' },
      cancellationTerms: { originalName: 'originalCancellationTerms' },
      finalContractDeadline: { originalName: 'originalFinalContractDeadline', isDate: true }
    };

    const config = fieldConfig[fieldName];
    if (!config) return false;

    const originalValue = originalData[config.originalName];
    const currentValue = contract[fieldName];

    if (originalValue === undefined || currentValue === undefined) return false;

    if (config.isArray) {
      const originalArr = Array.isArray(originalValue) ? originalValue :
        (originalValue ? originalValue.split(/\s*,\s*/) : []);
      const currentArr = Array.isArray(currentValue) ? currentValue :
        (currentValue ? currentValue.split(/\s*,\s*/) : []);
      return JSON.stringify(originalArr.sort()) !== JSON.stringify(currentArr.sort());
    }

    return String(originalValue).trim() !== String(currentValue).trim();
  };

  const renderFieldDiff = (fieldName, label) => {
    if (!hasChanges(fieldName)) return null;

    const fieldConfig = {
      eventType: { originalName: 'originalEventType' },
      eventDescription: { originalName: 'originalEventDescription' },
      eventDate: { originalName: 'originalEventDate', isDate: true },
      startTime: { originalName: 'originalStartTime' },
      endTime: { originalName: 'originalEndTime' },
      endDate: { originalName: 'originalEndDate', isDate: true },
      eventLocation: { originalName: 'originalEventLocation' },
      bandComposition: { originalName: 'originalBandComposition' },
      instruments: { originalName: 'originalInstruments', isArray: true },
      totalPrice: { originalName: 'originalTotalPrice' },
      paymentTerms: { originalName: 'originalPaymentTerms' },
      depositAmount: { originalName: 'originalDepositAmount' },
      depositRefundable: { originalName: 'originalDepositRefundable', isBoolean: true },
      clientResponsibilities: { originalName: 'originalClientResponsibilities' },
      artistResponsibilities: { originalName: 'originalArtistResponsibilities' },
      cancellationTerms: { originalName: 'originalCancellationTerms' },
      finalContractDeadline: { originalName: 'originalFinalContractDeadline', isDate: true }
    };

    const config = fieldConfig[fieldName];
    const originalValue = originalData[config.originalName];
    const currentValue = contract[fieldName];

    return (
      <div className="field-diff">
        <div className="diff-values">
          <div className="diff-value original">
            <span className="diff-value-label">Poprzednio: </span>
            <span>{formatDiffValue(originalValue, config.isDate, config.isBoolean, config.isArray)}</span>
          </div>
          <div className="diff-value current">
            <span className="diff-value-label">Teraz: </span>
            <span>{formatDiffValue(currentValue, config.isDate, config.isBoolean, config.isArray)}</span>
          </div>
        </div>
      </div>
    );
  };

  const handleActionClick = (action) => {
    setModalAction(action);
    setShowConfirmModal(true);
  };

  const confirmAction = () => {
    setShowConfirmModal(false);
    switch (modalAction) {
      case 'approve':
        handleApprove();
        break;
      case 'reject':
        handleReject();
        break;
      case 'submit':
        handleSubmitChanges();
        break;
      case 'edit':
        setIsEditing(true);
        break;
      default:
        break;
    }
  };

  const getMaxLength = (fieldName) => {
    switch (fieldName) {
      case 'eventDescription':
        return 600;
      case 'clientResponsibilities':
      case 'artistResponsibilities':
      case 'cancellationTerms':
        return 500;
      default:
        return 150;
    }
  };

  const renderCharacterCounter = (fieldName) => {
    const maxLength = getMaxLength(fieldName);
    return (
      <div className="character-counter">
        {characterCounts[fieldName] || 0}/{maxLength}
      </div>
    );
  };

  const isFieldLocked = (fieldName) => {
    const fieldToOriginalMap = {
      eventType: 'originalEventType',
      eventDescription: 'originalEventDescription',
      eventDate: 'originalEventDate',
      startTime: 'originalStartTime',
      endTime: 'originalEndTime',
      endDate: 'originalEndDate',
      eventLocation: 'originalEventLocation',
      bandComposition: 'originalBandComposition',
      instruments: 'originalInstruments',
      totalPrice: 'originalTotalPrice',
      paymentTerms: 'originalPaymentTerms',
      depositAmount: 'originalDepositAmount',
      depositRefundable: 'originalDepositRefundable',
      clientResponsibilities: 'originalClientResponsibilities',
      artistResponsibilities: 'originalArtistResponsibilities',
      cancellationTerms: 'originalCancellationTerms',
      finalContractDeadline: 'originalFinalContractDeadline'
    };

    return !originalData || !originalData[fieldToOriginalMap[fieldName]];
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Ładowanie umowy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <AlertCircle size={24} />
        <h3>Błąd podczas ładowania umowy</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Spróbuj ponownie</button>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="not-found-state">
        <h3>Umowa nie znaleziona</h3>
        <p>Nie można znaleźć żądanej umowy.</p>
        <button onClick={() => navigate('/my-bookings')}>Powrót do zgłoszeń</button>
      </div>
    );
  }

  const isClient = user.id === contract.clientId;
  const isArtist = user.id === contract.artistId;
  const canEdit = isArtist && contract.status === 'pending';
  const canApprove = (isArtist && contract.status === 'pending') ||
    (isClient && contract.status === 'modified');
  const canReject = (isArtist && contract.status === 'pending') ||
    (isClient && contract.status === 'modified');
  const showModificationNotice = isClient && contract.status === 'modified';

  return (
    <div className="contract-page-container">
      <div className="contract-page-header">
        <FileText size={32} />
        <h1>Umowa przedwstępna - {contract.offerName}</h1>
        <span className={`contract-page-status ${contract.status}`}>
          {contract.status === 'pending' && 'OCZEKUJĄCE'}
          {contract.status === 'confirmed' && 'POTWIERDZONE'}
          {contract.status === 'modified' && 'ZMODYFIKOWANE'}
          {contract.status === 'rejected' && 'ODRZUCONE'}
        </span>
      </div>

      {showModificationNotice && (
        <div className="contract-page-modification-notice">
          <Info size={20} />
          <p>Wykonawca wprowadził zmiany w umowie. Proszę przejrzeć i zaakceptować lub odrzucić modyfikacje.</p>
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="contract-page-diff-toggle"
          >
            {showDiff ? 'Ukryj zmiany' : 'Pokaż zmiany'}
          </button>
        </div>
      )}

      <div className="contract-page-details">
        <div className={`form-section ${isEditing ? 'editing' : ''}`}>
          <h2><User size={20} /> Dane stron</h2>
          <div className="parties-container">
            <div className="party-card">
              <div className="party-header">
                <h3>
                  <a href={`/profile/${contract.artistId}`} className="party-name">
                    {contract.artistName}
                  </a>
                </h3>
                <span className="party-role">Wykonawca</span>
              </div>
              <div className="party-details">
                <div className="party-detail">
                  <Mail size={16} className="detail-icon" />
                  <a href={`mailto:${contract.artistContact}`} className="detail-value">
                    {contract.artistContact}
                  </a>
                </div>
                {contract.artistPhone && (
                  <div className="party-detail">
                    <Phone size={16} className="detail-icon" />
                    <a href={`tel:${contract.artistPhone}`} className="detail-value">
                      {contract.artistPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="party-card">
              <div className="party-header">
                <h3>
                  <a href={`/profile/${contract.clientId}`} className="party-name">
                    {contract.clientName}
                  </a>
                </h3>
                <span className="party-role">Klient</span>
              </div>
              <div className="party-details">
                <div className="party-detail">
                  <Mail size={16} className="detail-icon" />
                  <a href={`mailto:${contract.clientContact}`} className="detail-value">
                    {contract.clientContact}
                  </a>
                </div>
                {contract.clientPhone && (
                  <div className="party-detail">
                    <Phone size={16} className="detail-icon" />
                    <a href={`tel:${contract.clientPhone}`} className="detail-value">
                      {contract.clientPhone}
                    </a>
                  </div>
                )}
                {contract.clientPeselNip && (
                  <div className="party-detail">
                    <User size={16} className="detail-icon" />
                    <span className="detail-value">{contract.clientPeselNip}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`form-section ${isEditing ? 'editing' : ''}`}>
          <h2><Calendar size={20} /> Szczegóły wydarzenia</h2>
          {isEditing ? (
            <div className="contract-page-form">
              <div className="form-group">
                <label>Rodzaj wydarzenia</label>
                <input
                  type="text"
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleChange}
                  maxLength={150}
                  className="form-control"
                  disabled={isFieldLocked('eventType')}
                />
                {renderFieldDiff('eventType', 'Rodzaj wydarzenia')}
              </div>
              <div className="form-group">
                <label>Opis wydarzenia</label>
                <div className="textarea-container">
                  <textarea
                    name="eventDescription"
                    value={formData.eventDescription}
                    onChange={handleChange}
                    rows="3"
                    maxLength={600}
                    className="form-control"
                    disabled={isFieldLocked('eventDescription')}
                  />
                  {renderCharacterCounter('eventDescription')}
                </div>
                {renderFieldDiff('eventDescription', 'Opis wydarzenia')}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data rozpoczęcia</label>
                  <input
                    type="date"
                    name="eventDate"
                    value={formData.eventDate ? new Date(formData.eventDate).toISOString().split('T')[0] : ''}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="form-control form-date"
                    disabled={isFieldLocked('eventDate')}
                  />
                  {renderFieldDiff('eventDate', 'Data rozpoczęcia')}
                </div>
                <div className="form-group">
                  <label>Godzina rozpoczęcia</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className="form-control form-time"
                    disabled={isFieldLocked('startTime')}
                  />
                  {renderFieldDiff('startTime', 'Godzina rozpoczęcia')}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data zakończenia</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ''}
                    onChange={handleChange}
                    min={formData.eventDate || new Date().toISOString().split('T')[0]}
                    className="form-control form-date"
                    disabled={isFieldLocked('endDate')}
                  />
                  {renderFieldDiff('endDate', 'Data zakończenia')}
                </div>
                <div className="form-group">
                  <label>Godzina zakończenia</label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    className="form-control form-time"
                    disabled={isFieldLocked('endTime')}
                  />
                  {renderFieldDiff('endTime', 'Godzina zakończenia')}
                </div>
              </div>

              <div className="form-group">
                <label>Miejsce wydarzenia</label>
                <input
                  type="text"
                  name="eventLocation"
                  value={formData.eventLocation}
                  onChange={handleChange}
                  maxLength={150}
                  className="form-control"
                  disabled={isFieldLocked('eventLocation')}
                />
                {renderFieldDiff('eventLocation', 'Miejsce wydarzenia')}
              </div>
              <div className="form-group">
                <label>Skład</label>
                <input
                  type="text"
                  name="bandComposition"
                  value={formData.bandComposition}
                  onChange={handleChange}
                  maxLength={150}
                  className="form-control"
                  disabled={isFieldLocked('bandComposition')}
                />
                {renderFieldDiff('bandComposition', 'Skład')}
              </div>
              {contract.offerInstruments?.length > 0 ? (
                <div className="form-group">
                  <label>Instrumenty</label>
                  <div className="instruments-grid">
                    {contract.offerInstruments.map(instrument => (
                      <div key={instrument} className="instrument-item">
                        <input
                          type="checkbox"
                          id={`instrument-${instrument}`}
                          checked={formData.instruments.includes(instrument)}
                          onChange={() => handleInstrumentChange(instrument)}
                          disabled={isFieldLocked('instruments')}
                        />
                        <label htmlFor={`instrument-${instrument}`} className="checkbox-label">
                          {instrument}
                        </label>
                      </div>
                    ))}
                  </div>
                  {renderFieldDiff('instruments', 'Instrumenty')}
                </div>
              ) : (
                <div className="form-group">
                  <label>Instrumenty</label>
                  <p className="detail-value instruments-empty">Nie wskazano</p>
                </div>
              )}
            </div>
          ) : (
            <div className="detail-content">
              <div className="detail-grid">
                <div className="detail-column">
                  <div className="detail-field">
                    <span className="detail-label">Rodzaj wydarzenia:</span>
                    <p className="detail-value">{contract.eventType}</p>
                    {renderFieldDiff('eventType', 'Rodzaj wydarzenia')}
                  </div>

                  <div className="detail-field date-range">
                    <span className="detail-label">Termin wydarzenia:</span>
                    <div className="date-range-display">
                      <span>
                        {new Date(contract.eventDate).toLocaleDateString('pl-PL')} {contract.startTime}
                      </span>
                      <span className="date-range-separator">→</span>
                      <span>
                        {contract.endDate && contract.endDate !== contract.eventDate
                          ? `${new Date(contract.endDate).toLocaleDateString('pl-PL')} ${contract.endTime}`
                          : contract.endTime}
                      </span>
                    </div>
                    {renderFieldDiff('eventDate', 'Data rozpoczęcia')}
                    {renderFieldDiff('startTime', 'Godzina rozpoczęcia')}
                    {renderFieldDiff('endDate', 'Data zakończenia')}
                    {renderFieldDiff('endTime', 'Godzina zakończenia')}
                  </div>

                  <div className="detail-field">
                    <span className="detail-label">Miejsce:</span>
                    <p className="detail-value">{contract.eventLocation}</p>
                    {renderFieldDiff('eventLocation', 'Miejsce wydarzenia')}
                  </div>

                  <div className="detail-field">
                    <span className="detail-label">Instrumenty:</span>
                    <p className="detail-value">
                      {contract.instruments &&
                        contract.instruments.length > 0 &&
                        contract.instruments.some(instr => instr.trim() !== '')
                        ? contract.instruments.filter(instr => instr.trim() !== '').join(', ')
                        : 'nie wskazano'}
                    </p>
                    {renderFieldDiff('instruments', 'Instrumenty')}
                  </div>
                </div>

                <div className="detail-column">
                  <div className="detail-field">
                    <span className="detail-label">Opis wydarzenia:</span>
                    <p className="detail-value">{contract.eventDescription || 'Brak opisu'}</p>
                    {renderFieldDiff('eventDescription', 'Opis wydarzenia')}
                  </div>

                  <div className="detail-field">
                    <span className="detail-label">Skład:</span>
                    <p className="detail-value">{contract.bandComposition}</p>
                    {renderFieldDiff('bandComposition', 'Skład')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`form-section ${isEditing ? 'editing' : ''}`}>
          <h2><DollarSign size={20} /> Warunki finansowe</h2>
          {isEditing ? (
            <div className="contract-page-form">
              <div className="form-group">
                <label>Kwota całkowita (PLN)</label>
                <input
                  type="number"
                  name="totalPrice"
                  value={formData.totalPrice}
                  onChange={handleChange}
                  className="form-control"
                />
                {renderFieldDiff('totalPrice', 'Kwota całkowita')}
              </div>
              <div className="form-group">
                <label>Warunki płatności</label>
                <select
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
                  className="form-control form-select"
                >
                  <option value="50% zaliczki, 50% w dniu wydarzenia">50% zaliczki, 50% w dniu wydarzenia</option>
                  <option value="100% z góry">100% z góry</option>
                  <option value="100% w dniu wydarzenia">100% w dniu wydarzenia</option>
                  <option value="inny">Inny (określ w uwagach)</option>
                </select>
                {formData.paymentTerms === 'inny' && (
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Własne warunki płatności</label>
                    <input
                      type="text"
                      value={customPaymentTerms}
                      onChange={(e) => setCustomPaymentTerms(e.target.value)}
                      maxLength={150}
                      className="form-control"
                    />
                  </div>
                )}
                {renderFieldDiff('paymentTerms', 'Warunki płatności')}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Wysokość zaliczki (PLN)</label>
                  <input
                    type="number"
                    name="depositAmount"
                    value={formData.depositAmount}
                    onChange={handleChange}
                    className="form-control"
                  />
                  {renderFieldDiff('depositAmount', 'Wysokość zaliczki')}
                </div>
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="depositRefundable"
                    name="depositRefundable"
                    checked={formData.depositRefundable}
                    onChange={handleChange}
                  />
                  <label htmlFor="depositRefundable" className="checkbox-label">
                    Zaliczka zwrotna
                  </label>
                  {renderFieldDiff('depositRefundable', 'Zaliczka zwrotna')}
                </div>
              </div>
            </div>
          ) : (
            <div className="detail-content">
              <div className="detail-row">
                <div className="detail-field">
                  <span className="detail-label">Kwota całkowita:</span>
                  <p className="detail-value">{contract.totalPrice} PLN</p>
                  {renderFieldDiff('totalPrice', 'Kwota całkowita')}
                </div>
                <div className="detail-field">
                  <span className="detail-label">Warunki płatności:</span>
                  <p className="detail-value">{contract.paymentTerms}</p>
                  {renderFieldDiff('paymentTerms', 'Warunki płatności')}
                </div>
              </div>
              {contract.depositAmount && (
                <div className="detail-row">
                  <div className="detail-field">
                    <span className="detail-label">Zaliczka:</span>
                    <p className="detail-value">{contract.depositAmount} PLN</p>
                    {renderFieldDiff('depositAmount', 'Wysokość zaliczki')}
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Status zaliczki:</span>
                    <p className="detail-value">{contract.depositRefundable ? 'zwrotna' : 'niezwrotna'}</p>
                    {renderFieldDiff('depositRefundable', 'Zaliczka zwrotna')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`form-section ${isEditing ? 'editing' : ''}`}>
          <h2><Users size={20} /> Obowiązki stron</h2>
          {isEditing ? (
            <div className="contract-page-form">
              <div className="form-group">
                <label>Obowiązki zamawiającego</label>
                <div className="textarea-container">
                  <textarea
                    name="clientResponsibilities"
                    value={formData.clientResponsibilities}
                    onChange={handleChange}
                    rows="4"
                    maxLength={500}
                    className="form-control"
                  />
                  {renderCharacterCounter('clientResponsibilities')}
                </div>
                {renderFieldDiff('clientResponsibilities', 'Obowiązki zamawiającego')}
              </div>
              <div className="form-group">
                <label>Obowiązki wykonawcy</label>
                <div className="textarea-container">
                  <textarea
                    name="artistResponsibilities"
                    value={formData.artistResponsibilities}
                    onChange={handleChange}
                    rows="4"
                    maxLength={500}
                    className="form-control"
                  />
                  {renderCharacterCounter('artistResponsibilities')}
                </div>
                {renderFieldDiff('artistResponsibilities', 'Obowiązki wykonawcy')}
              </div>
              <div className="form-group">
                <label>Warunki rezygnacji</label>
                <div className="textarea-container">
                  <textarea
                    name="cancellationTerms"
                    value={formData.cancellationTerms}
                    onChange={handleChange}
                    rows="4"
                    maxLength={500}
                    className="form-control"
                  />
                  {renderCharacterCounter('cancellationTerms')}
                </div>
                {renderFieldDiff('cancellationTerms', 'Warunki rezygnacji')}
              </div>
              <div className="form-group">
                <label>Termin podpisania umowy ostatecznej</label>
                <input
                  type="date"
                  name="finalContractDeadline"
                  value={formData.finalContractDeadline ? new Date(formData.finalContractDeadline).toISOString().split('T')[0] : ''}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="form-control form-date"
                />
                {renderFieldDiff('finalContractDeadline', 'Termin podpisania umowy')}
              </div>
            </div>
          ) : (
            <div className="detail-content">
              <div className="responsibility-item">
                <h3>Obowiązki zamawiającego</h3>
                <p>{contract.clientResponsibilities}</p>
                {renderFieldDiff('clientResponsibilities', 'Obowiązki zamawiającego')}
              </div>
              <div className="responsibility-item">
                <h3>Obowiązki wykonawcy</h3>
                <p>{contract.artistResponsibilities}</p>
                {renderFieldDiff('artistResponsibilities', 'Obowiązki wykonawcy')}
              </div>
              <div className="responsibility-item">
                <h3>Warunki rezygnacji</h3>
                <p>{contract.cancellationTerms}</p>
                {renderFieldDiff('cancellationTerms', 'Warunki rezygnacji')}
              </div>
              {contract.finalContractDeadline && (
                <div className="detail-field">
                  <span className="detail-label">Termin podpisania umowy ostatecznej:</span>
                  <p className="detail-value">{new Date(contract.finalContractDeadline).toLocaleDateString('pl-PL')}</p>
                  {renderFieldDiff('finalContractDeadline', 'Termin podpisania umowy')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="actions-section">
        {statusMessage && (
          <div className="status-message">
            {statusMessage}
          </div>
        )}

        {isEditing ? (
          <>
            <button
              onClick={() => handleActionClick('submit')}
              className="action-button primary"
            >
              <Check size={18} /> Zatwierdź zmiany
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="action-button secondary"
            >
              <X size={18} /> Anuluj
            </button>
          </>
        ) : (
          <>
            {canEdit && (
              <button
                onClick={() => handleActionClick('edit')}
                className="action-button edit"
              >
                <Edit size={18} /> Modyfikuj umowę
              </button>
            )}
            {canApprove && (
              <button
                onClick={() => handleActionClick('approve')}
                className="action-button primary"
              >
                <Check size={18} /> {contract.status === 'modified' ? 'Zaakceptuj zmiany' : 'Zatwierdź umowę'}
              </button>
            )}
            {canReject && (
              <button
                onClick={() => handleActionClick('reject')}
                className="action-button danger"
              >
                <X size={18} /> {contract.status === 'modified' ? 'Odrzuć zmiany' : 'Odrzuć umowę'}
              </button>
            )}
          </>
        )}
      </div>

      {showConfirmModal && (
        <Modal size="small" onClose={() => setShowConfirmModal(false)}>
          <h3>Potwierdź akcję</h3>
          <p>
            {modalAction === 'approve' && 'Czy na pewno chcesz zaakceptować tę umowę?'}
            {modalAction === 'reject' && 'Czy na pewno chcesz odrzucić tę umowę?'}
            {modalAction === 'submit' && 'Czy na pewno chcesz wysłać zmiany do akceptacji?'}
            {modalAction === 'edit' && 'Czy na pewno chcesz edytować tę umowę?'}
          </p>
          <div className="modal-actions">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="action-button secondary"
            >
              Anuluj
            </button>
            <button
              onClick={confirmAction}
              className="action-button primary"
            >
              Potwierdź
            </button>
          </div>
        </Modal>
      )}

      {conflictModalData.show && (
        <Modal size="medium" onClose={() => setConflictModalData({ show: false, message: '', conflicts: [] })}>
          <h3>Konflikt terminów</h3>
          <p>{conflictModalData.message}</p>

          <div className="conflicts-list">
            <h4>Zajęte terminy:</h4>
            <ul>
              {conflictModalData.conflicts.map((conflict, index) => (
                <li key={index}>
                  <strong>{new Date(conflict.eventDate).toLocaleDateString('pl-PL')}</strong> -
                  {conflict.startTime} do {conflict.endTime} ({conflict.eventType})
                </li>
              ))}
            </ul>
          </div>

          <div className="modal-actions">
            <button
              onClick={() => setConflictModalData({ show: false, message: '', conflicts: [] })}
              className="action-button primary"
            >
              Rozumiem
            </button>
          </div>
        </Modal>
      )}
      
    </div>
  );
};

export default ContractPage;