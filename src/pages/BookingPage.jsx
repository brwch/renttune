import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  User, 
  Music, 
  Check, 
  X, 
  AlertCircle, 
  FileText,
  Circle,
  Bell
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import './BookingPage.css';

const BookingPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadBookings, setUnreadBookings] = useState(new Set());
  const [hasNewBookings, setHasNewBookings] = useState(false);

  useEffect(() => {
    const fetchBookingsAndNotifications = async () => {
      try {
        setLoading(true);
        
        // Fetch bookings
        const bookingsResponse = await fetch(`http://localhost:5000/api/bookings?status=${filter}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!bookingsResponse.ok) throw new Error('Failed to fetch bookings');
        const bookingsData = await bookingsResponse.json();

        // Fetch unread bookings from server
        const unreadResponse = await fetch('http://localhost:5000/api/bookings/unread', {
          headers: {
            'Authorization': `Bearer ${user.token}`,
          }
        });
        
        const unreadData = await unreadResponse.json();
        const unreadIds = unreadData.unreadBookings || [];
        
        setBookings(bookingsData.bookings);
        setUnreadBookings(new Set(unreadIds));
        setHasNewBookings(unreadIds.length > 0);
        
        // Store in localStorage for persistence
        localStorage.setItem(`unreadBookings_${user.id}`, JSON.stringify(unreadIds));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?.token) {
      fetchBookingsAndNotifications();
    }
  }, [user?.token, filter]);

  const handleBookingClick = async (bookingId) => {
    // Mark as read locally
    const newUnread = new Set(unreadBookings);
    newUnread.delete(bookingId);
    setUnreadBookings(newUnread);
    setHasNewBookings(newUnread.size > 0);
    localStorage.setItem(`unreadBookings_${user.id}`, JSON.stringify(Array.from(newUnread)));
    
    // Mark as read on server
    try {
      await fetch(`http://localhost:5000/api/bookings/${bookingId}/mark-as-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        }
      });
    } catch (err) {
      console.error('Error marking as read:', err);
    }
    
    navigate(`/contract/${bookingId}`);
  };

  const getStatusBadge = (status, bookingId) => {
    const isUnread = unreadBookings.has(bookingId);
    const statusText = {
      'pending': 'Oczekujące',
      'confirmed': 'Potwierdzone',
      'modified': 'Zmodyfikowane',
      'rejected': 'Anulowane',
      'cancelled': 'Anulowane'
    };

    const statusIcons = {
      'pending': <Clock size={14} />,
      'confirmed': <Check size={14} />,
      'modified': <FileText size={14} />,
      'rejected': <X size={14} />,
      'cancelled': <X size={14} />
    };

    return (
      <div className="status-badge-container">
        <span className={`status-badge ${status} ${isUnread ? 'unread' : ''}`}>
          {statusIcons[status]}
          {statusText[status]}
        </span>
        {isUnread && <Circle size={8} className="unread-dot" fill="currentColor" />}
      </div>
    );
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.offerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.artistName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pl-PL', options);
  };

  if (loading) {
    return (
      <div className="booking-loading">
        <div className="spinner"></div>
        <p>Ładowanie zgłoszeń...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-error">
        <AlertCircle size={24} />
        <h3>Wystąpił błąd</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Spróbuj ponownie</button>
      </div>
    );
  }

  return (
    <div className="booking-container">
      <div className="booking-header">
        <div className="booking-title-wrapper">
          <h1>Moje zgłoszenia</h1>
          {hasNewBookings && (
            <div className="new-bookings-badge">
              <Bell size={16} />
              <span>Nowe zgłoszenia</span>
            </div>
          )}
        </div>
        
        <div className="booking-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Wyszukaj zgłoszenia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              Wszystkie
            </button>
            <button
              className={filter === 'pending' ? 'active' : ''}
              onClick={() => setFilter('pending')}
            >
              Oczekujące
            </button>
            <button
              className={filter === 'confirmed' ? 'active' : ''}
              onClick={() => setFilter('confirmed')}
            >
              Potwierdzone
            </button>
            <button
              className={filter === 'modified' ? 'active' : ''}
              onClick={() => setFilter('modified')}
            >
              Zmodyfikowane
            </button>
          </div>
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="no-bookings">
          <FileText size={48} />
          <p>Brak zgłoszeń spełniających kryteria</p>
          <Link to="/offers" className="primary-button">
            Przeglądaj oferty
          </Link>
        </div>
      ) : (
        <div className="booking-list">
          {filteredBookings.map((booking) => (
            <div 
              key={booking._id} 
              className={`booking-card ${unreadBookings.has(booking._id) ? 'unread' : ''}`}
              onClick={() => handleBookingClick(booking._id)}
            >
              <div className="booking-card-header">
                <h3>{booking.offerName || 'Brak nazwy oferty'}</h3>
                {getStatusBadge(booking.status, booking._id)}
              </div>
              <div className="booking-details">
                <div className="detail-item">
                  <Calendar size={16} />
                  <span>{formatDate(booking.eventDate)}</span>
                </div>
                <div className="detail-item">
                  <Clock size={16} />
                  <span>
                    {booking.startTime ? formatTimeForDisplay(booking.startTime) : '--:--'} - 
                    {booking.endTime ? formatTimeForDisplay(booking.endTime) : '--:--'}
                  </span>
                </div>
                <div className="detail-item">
                  <User size={16} />
                  <span>
                    {user.id === booking.clientId ? (
                      <>Wykonawca: <strong>{booking.artistName || 'Nieznany'}</strong></>
                    ) : (
                      <>Klient: <strong>{booking.clientName || 'Nieznany'}</strong></>
                    )}
                  </span>
                </div>
                <div className="detail-item">
                  <Music size={16} />
                  <span>{booking.eventType || 'Brak typu wydarzenia'}</span>
                </div>
              </div>
              <div className="booking-price">
                <span className="price-label">Kwota:</span>
                <span className="price-value">{booking.totalPrice || '0'} PLN</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper function to format time display
const formatTimeForDisplay = (timeStr) => {
  if (!timeStr) return '--:--';
  const [hours, minutes] = timeStr.split(':');
  return `${hours.padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}`;
};

export default BookingPage;