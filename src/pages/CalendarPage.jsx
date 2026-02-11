import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isWeekend } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Check, X, Sun, Moon, Hourglass, Bookmark } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './CalendarPage.css';

const timeSlots = [
  '00:00 - 02:00', '02:00 - 04:00', '04:00 - 06:00',
  '06:00 - 08:00', '08:00 - 10:00', '10:00 - 12:00',
  '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00',
  '18:00 - 20:00', '20:00 - 22:00', '22:00 - 00:00'
];

const CalendarPage = () => {
  const { user } = useUser();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [timeRange, setTimeRange] = useState('day');
  const [isChanging, setIsChanging] = useState(false);
  const calendarRef = useRef(null);
  const isViewMode = !!userId;

  // Pobieranie danych kalendarza
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Pobierz dostępność
        const availabilityUrl = isViewMode
          ? `http://localhost:5000/api/availability/${userId}`
          : 'http://localhost:5000/api/availability';

        const availabilityResponse = await fetch(availabilityUrl, {
          headers: user?.token ? { 'Authorization': `Bearer ${user.token}` } : {},
          cache: 'no-cache'
        });

        if (!availabilityResponse.ok) throw new Error('Nie udało się pobrać danych kalendarza');
        const availabilityData = await availabilityResponse.json();
        setAvailability(availabilityData.availability || {});

        // W trybie podglądu pobierz dane użytkownika
        if (isViewMode) {
          const userResponse = await fetch(`http://localhost:5000/api/users/${userId}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserData(userData);
          }
        }
      } catch (error) {
        console.error('Błąd pobierania danych:', error);
        toast.error('Nie udało się załadować kalendarza');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, userId, isViewMode]);

  const TimeRangeToggle = () => {
    const ranges = [
      { id: 'day', label: '8:00-20:00', icon: <Sun className="range-icon" /> },
      { id: 'night', label: '20:00-8:00', icon: <Moon className="range-icon" /> },
      { id: 'full', label: 'Cała doba', icon: <Hourglass className="range-icon" /> },
    ];

    // Znajdź początkowy indeks na podstawie timeRange
    const initialIndex = ranges.findIndex(range => range.id === timeRange);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const handleClick = () => {
      setIsChanging(true);
      const newIndex = (currentIndex + 1) % ranges.length;
      setCurrentIndex(newIndex);
      setTimeout(() => {
        setTimeRange(ranges[newIndex].id);
        setIsChanging(false);
      }, 300);
    };

    const currentRange = ranges[currentIndex];

    return (
      <div>
        <button
          onClick={handleClick}
          className="time-range-toggle-button"
        >
          <span className="time-range-icon">{currentRange.icon}</span>
          <span className="time-range-label">{currentRange.label}</span>
        </button>
      </div>
    );
  };

  const getVisibleTimeSlots = () => {
    switch (timeRange) {
      case 'day':
        return timeSlots.filter(slot => {
          const hour = parseInt(slot.split(':')[0]);
          return hour >= 8 && hour < 20;
        });
      case 'night':
        return [
          '20:00 - 22:00', '22:00 - 00:00',
          '00:00 - 02:00', '02:00 - 04:00',
          '04:00 - 06:00', '06:00 - 08:00'
        ];
      case 'full':
      default:
        return timeSlots;
    }
  };

  // Generowanie dni w miesiącu
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Funkcje zarządzania dostępnością
  const toggleDayAvailability = (day) => {
    if (isViewMode) return;

    const dateKey = format(day, 'yyyy-MM-dd');
    const newAvailability = { ...availability };
    const currentDay = newAvailability[dateKey] || { timeSlots: {} };
    const isDayAvailable = !currentDay.isAvailable;

    // Zachowaj istniejące rezerwacje
    const updatedTimeSlots = timeSlots.reduce((acc, slot) => {
      if (currentDay.timeSlots[slot]?.isBooked) {
        acc[slot] = currentDay.timeSlots[slot];
      } else {
        acc[slot] = isDayAvailable;
      }
      return acc;
    }, {});

    newAvailability[dateKey] = {
      ...currentDay,
      isAvailable: isDayAvailable,
      timeSlots: updatedTimeSlots
    };

    setAvailability(newAvailability);
  };

  const toggleTimeSlot = (day, timeSlot) => {
    if (isViewMode) return;

    const dateKey = format(day, 'yyyy-MM-dd');
    const newAvailability = { ...availability };

    if (!newAvailability[dateKey]) {
      newAvailability[dateKey] = {
        isAvailable: true,
        timeSlots: { [timeSlot]: true }
      };
    } else {
      newAvailability[dateKey].timeSlots = {
        ...newAvailability[dateKey].timeSlots,
        [timeSlot]: !newAvailability[dateKey].timeSlots[timeSlot]
      };

      // Aktualizacja dostępności dnia
      const allSlotsUnavailable = Object.values(newAvailability[dateKey].timeSlots).every(val => !val);
      newAvailability[dateKey].isAvailable = !allSlotsUnavailable;
    }

    setAvailability(newAvailability);
  };

  const toggleMonthAvailability = () => {
    if (isViewMode) return;

    const newAvailability = { ...availability };
    const allAvailable = daysInMonth.every(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return newAvailability[dateKey]?.isAvailable;
    });

    daysInMonth.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const currentDay = newAvailability[dateKey] || { timeSlots: {} };

      // Zachowaj istniejące rezerwacje
      const updatedTimeSlots = timeSlots.reduce((acc, slot) => {
        if (currentDay.timeSlots[slot]?.isBooked) {
          acc[slot] = currentDay.timeSlots[slot];
        } else {
          acc[slot] = !allAvailable;
        }
        return acc;
      }, {});

      newAvailability[dateKey] = {
        ...currentDay,
        isAvailable: !allAvailable,
        timeSlots: updatedTimeSlots
      };
    });

    setAvailability(newAvailability);
  };

  const toggleWeekendsAvailability = () => {
    if (isViewMode) return;

    const newAvailability = { ...availability };
    const allWeekendsAvailable = daysInMonth
      .filter(day => isWeekend(day))
      .every(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return newAvailability[dateKey]?.isAvailable;
      });

    daysInMonth.forEach(day => {
      if (isWeekend(day)) {
        const dateKey = format(day, 'yyyy-MM-dd');
        const currentDay = newAvailability[dateKey] || { timeSlots: {} };

        // Zachowaj istniejące rezerwacje
        const updatedTimeSlots = timeSlots.reduce((acc, slot) => {
          if (currentDay.timeSlots[slot]?.isBooked) {
            acc[slot] = currentDay.timeSlots[slot];
          } else {
            acc[slot] = !allWeekendsAvailable;
          }
          return acc;
        }, {});

        newAvailability[dateKey] = {
          ...currentDay,
          isAvailable: !allWeekendsAvailable,
          timeSlots: updatedTimeSlots
        };
      }
    });

    setAvailability(newAvailability);
  };

  // Nawigacja między miesiącami
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Zapisywanie zmian
  const saveAvailability = async () => {
    if (isViewMode) return;

    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:5000/api/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ availability })
      });

      if (!response.ok) throw new Error('Nie udało się zapisać zmian');
      toast.success("Dostępność zapisana pomyślnie!");
      navigate('/my-offers');
    } catch (error) {
      console.error('Błąd zapisywania dostępności:', error);
      toast.error("Wystąpił błąd podczas zapisywania");
    } finally {
      setIsSaving(false);
    }
  };

  const BookingIcon = () => (
    <div className="booking-icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
      </svg>
    </div>
  );

  // Ekran ładowania
  if (isLoading) {
    return (
      <div className="calendar-loading">
        <div className="spinner"></div>
        <p>Ładowanie kalendarza...</p>
      </div>
    );
  }

  return (
    <div className={`calendar-page ${isViewMode ? 'view-mode' : ''}`}>
      {/* Nagłówek kalendarza */}
      <div className="calendar-header">
        <h1>
          <Calendar size={24} /> Kalendarz występów
        </h1>
        {isViewMode && userData && (
          <p className="viewing-user">
            {userData.displayName} ({userData.email})
          </p>
        )}
        <p>
          {isViewMode
            ? 'Podgląd dostępności wykonawcy'
            : 'Zaznacz dni i godziny, w których jesteś dostępny'}
        </p>
      </div>

      {/* Kontrolki kalendarza */}
      <div className="calendar-controls">
        <div className="calendar-nav-group">
          <button onClick={handlePrevMonth} className="month-nav-button">
            <ChevronLeft size={20} /> Poprzedni
          </button>
          <p className="month-title">
            {format(currentMonth, 'LLLL yyyy', { locale: pl })}
          </p>
          <button onClick={handleNextMonth} className="month-nav-button">
            Następny <ChevronRight size={20} />
          </button>
        </div>
        <TimeRangeToggle />
        {!isViewMode && (
          <div className="calendar-action-group">
            <button onClick={toggleMonthAvailability} className="action-button">
              Zaznacz/Odznacz miesiąc
            </button>
            <button onClick={toggleWeekendsAvailability} className="action-button">
              Zaznacz/Odznacz weekendy
            </button>
          </div>
        )}
      </div>

      {/* Główna część kalendarza */}
      <div
        className={`calendar-container ${timeRange === 'full' ? 'full-day' : ''} ${isChanging ? 'changing' : ''}`}
        ref={calendarRef}
      >
        <div className="calendar-grid">
          {/* Nagłówki kolumn z godzinami */}
          <div className="time-slots-header">
            <div className="day-header">Dzień</div>
            {getVisibleTimeSlots().map(slot => (
              <div key={slot} className="time-slot-header">
                {slot}
              </div>
            ))}
          </div>

          {/* Wiersze z dniami */}
          {daysInMonth.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayAvailability = availability[dateKey] || {
              isAvailable: false,
              timeSlots: {}
            };

            return (
              <div key={day.toString()} className={`day-row ${dayAvailability.isAvailable ? 'available' : 'unavailable'} ${isWeekend(day) ? 'weekend' : ''}`}>
                {/* Nagłówek dnia */}
                <div
                  className="day-header"
                  onClick={() => toggleDayAvailability(day)}
                >
                  <div className="day-name">
                    {format(day, 'EEEE', { locale: pl })}
                  </div>
                  <div className="day-number">
                    {format(day, 'd')}
                  </div>
                </div>

                {/* Komórki z godzinami */}
                {getVisibleTimeSlots().map(slot => {
                  const slotData = dayAvailability.timeSlots[slot];
                  const isBooked = slotData?.isBooked;
                  const isFirstSlot = slotData?.isFirstSlot;
                  const isLastSlot = slotData?.isLastSlot;

                  return (
                    <div
                      key={slot}
                      className={`time-slot ${isBooked ? 'booked' :
                        dayAvailability.timeSlots[slot] ? 'available' : 'unavailable'
                        }`}
                      onClick={() => !isBooked && !isViewMode && toggleTimeSlot(day, slot)}
                    >
                      {isBooked ? (
                        isViewMode ? (
                          <Bookmark size={16} className="booked-icon" strokeWidth={1} />
                        ) : (
                          <div className="booking-info">
                            {/* Oznaczenie początku rezerwacji */}
                            {isFirstSlot && (
                              <div className="booking-marker start">
                                START: {slotData.exactStartTime}
                              </div>
                            )}

                            {/* Podstawowe informacje o rezerwacji */}
                            <div className="event-type">
                              {slotData.eventType}
                            </div>

                            {!isFirstSlot && !isLastSlot && (
                              <div className="event-location">
                                {slotData.eventLocation}
                              </div>
                            )}

                            {/* Oznaczenie końca rezerwacji */}
                            {isLastSlot && (
                              <div className="booking-marker end">
                                KONIEC: {slotData.exactEndTime}
                              </div>
                            )}

                            {/* Link do umowy */}
                            <Link
                              to={slotData.bookingUrl}
                              className="booking-link"
                            >
                              Zobacz umowę
                            </Link>
                          </div>
                        )
                      ) : (
                        // Ikony dostępności
                        dayAvailability.timeSlots[slot] ? (
                          <Check size={16} className="slot-icon" />
                        ) : (
                          <X size={16} className="slot-icon" />
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Przyciski akcji */}
      {!isViewMode && (
        <div className="calendar-actions">
          <button
            onClick={() => navigate('/my-offers')}
            className="cancel-button"
          >
            Anuluj
          </button>
          <button
            onClick={saveAvailability}
            className="save-button"
            disabled={isSaving}
          >
            {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </button>
        </div>
      )}

      {/* Legenda */}
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color available"></div>
          <span>Dostępny</span>
        </div>
        <div className="legend-item">
          <div className="legend-color unavailable"></div>
          <span>Niedostępny</span>
        </div>
        <div className="legend-item">
          <div className="legend-color booked"></div>
          <span>Zarezerwowany</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;