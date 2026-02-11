import { Link, useNavigate } from "react-router-dom";
import { Menu, Search, Moon, Sun, User, Calendar, Heart, MessageSquare, Users, LogOut, PlusCircle, List, Star, Bell, X, Book } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useDebounce } from "../hooks/useDebounce";
import Sidebar from "./Sidebar";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import { useNotifications } from "../context/NotificationsContext";
import logoDark from "../assets/logoDt.svg";
import logoLight from "../assets/logoLt.svg";
import "../styles/navbar.css";

const Navbar = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, loading, logout } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showClearButton, setShowClearButton] = useState(false);
  const { notificationCount } = useNotifications();
  const [unreadCount, setUnreadCount] = useState(0);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const normalizeImageUrl = (image) => {
    if (!image) return null;
    if (image.includes('http') || image.includes('/api/files/')) {
      return image.includes('/api/files/') ? `${image}?t=${Date.now()}` : image;
    }
    return `/api/files/${image}?t=${Date.now()}`;
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(false);
        setDropdownOpen(false);
      }
    };

    const handleClickOutside = (e) => {
      if (dropdownOpen && !e.target.closest('.user-dropdown')) {
        setDropdownOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/bookings/unread-count', {
          headers: {
            'Authorization': `Bearer ${user.token}`,
          }
        });
        const data = await response.json();
        setUnreadCount(data.count);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    if (user?.token) {
      fetchUnreadCount();
    }
  }, [user?.token, notificationCount]);

  useEffect(() => {
    if (user?.profileImage) {
      const imageUrl = normalizeImageUrl(user.profileImage);
      const img = new Image();
      img.src = imageUrl;

      img.onload = () => {
        setProfileImage(imageUrl);
      };

      img.onerror = () => {
        setProfileImage(null);
      };
    } else if (user?.profileImageUrl) {
      const imageUrl = normalizeImageUrl(user.profileImageUrl);
      const img = new Image();
      img.src = imageUrl;

      img.onload = () => {
        setProfileImage(imageUrl);
      };

      img.onerror = () => {
        setProfileImage(null);
      };
    } else {
      setProfileImage(null);
    }
  }, [user]);

  useEffect(() => {
    setShowClearButton(searchQuery.length > 0);
  }, [searchQuery]);

  useEffect(() => {
    setUnreadCount(notificationCount);
  }, [notificationCount]);

  useEffect(() => {
    // Jeśli searchQuery się zmienia (użytkownik wpisuje coś w searchbar)
    // ale NIE jesteśmy już na stronie głównej, to nie wymuszaj nawigacji
    if (debouncedSearchQuery && window.location.pathname === '/') {
      navigate(`/?search=${encodeURIComponent(debouncedSearchQuery)}`, { replace: true });
    }
  }, [debouncedSearchQuery, navigate]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    navigate("/");
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const renderUserAvatar = () => {
    return (
      <div className="avatar-container">
        {profileImage ? (
          <img
            src={profileImage}
            className="user-avatar"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '';
              setProfileImage(null);
            }}
          />
        ) : (
          <div className="user-avatar-default">
            <User size={16} />
          </div>
        )}
      </div>
    );
  };

  // Funkcja renderująca specyficzne opcje dla muzyka
  const renderMusicianOptions = () => (
    <>
      <Link
        to="/create-offer"
        className="dropdown-item"
        onClick={() => setDropdownOpen(false)}
      >
        <PlusCircle size={16} className="dropdown-icon" />
        Stwórz ogłoszenie
      </Link>
      <Link
        to="/my-offers"
        className="dropdown-item"
        onClick={() => setDropdownOpen(false)}
      >
        <List size={16} className="dropdown-icon" />
        Moje oferty
      </Link>
      <Link
        to="/bookings"
        className="dropdown-item"
        onClick={() => setDropdownOpen(false)}
      >
        <MessageSquare size={16} className="dropdown-icon" />
        Moje zgłoszenia
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount}
          </span>
        )}
      </Link>
      <Link
        to="/calendar"
        className="dropdown-item"
        onClick={() => setDropdownOpen(false)}
      >
        <Calendar size={16} className="dropdown-icon" />
        Kalendarz występów
      </Link>
    </>
  );

  // Funkcja renderująca specyficzne opcje dla klienta
  const renderClientOptions = () => (
    <>
      <Link
        to="/favorites"
        className="dropdown-item"
        onClick={() => setDropdownOpen(false)}
      >
        <Heart size={16} className="dropdown-icon" />
        Ulubieni muzycy
      </Link>
      <Link
        to="/bookings"
        className="dropdown-item"
        onClick={() => setDropdownOpen(false)}
      >
        <MessageSquare size={16} className="dropdown-icon" />
        Moje rezerwacje
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount}
          </span>
        )}
      </Link>
      <Link
        to="/my-reviews"
        className="dropdown-item"
        onClick={() => setDropdownOpen(false)}
      >
        <Star size={16} className="dropdown-icon" />
        Moje opinie
      </Link>
    </>
  );

  return (
    <>
      <nav className="navbar">
        {/* Hamburger */}
        <button className="hamburger" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>

        {/* Logo */}
        <Link to="/" className="logo-link">
          <img
            src={theme === "dark" ? logoLight : logoDark}
            alt="Logo"
            className="logo"
          />
        </Link>

        {/* Enhanced Search Bar */}
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Szukaj..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            ref={searchInputRef}
          />
          {showClearButton && (
            <button className="clear-search" onClick={clearSearch}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Przyciski */}
        <div className="nav-buttons">
          {!loading && (
            <>
              {user ? (
                <div className="user-dropdown">
                  <button
                    className="user-profile-button"
                    onClick={toggleDropdown}
                    aria-label="Profil użytkownika"
                  >
                    {renderUserAvatar()}
                    <span className="user-name">{user.displayName}</span>
                  </button>

                  {dropdownOpen && (
                    <div className="dropdown-menu">
                      <Link
                        to="/profile"
                        className="dropdown-item profile-item"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <User size={16} className="dropdown-icon" />
                        Mój profil
                      </Link>

                      {user.accountType === 'musician'
                        ? renderMusicianOptions()
                        : renderClientOptions()}

                      <div className="dropdown-divider"></div>

                      <Link
                        to="/about"
                        className="dropdown-item"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Users  size={16} className="dropdown-icon" />
                        O nas
                      </Link>
                      <button
                        className="dropdown-item logout"
                        onClick={logout}
                      >
                        <LogOut size={16} className="dropdown-icon" />
                        Wyloguj się
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/register" className="nav-button desktop">Zarejestruj</Link>
                  <Link to="/login" className="nav-button login-button">Zaloguj</Link>
                </>
              )}
              <button className="nav-button dark-mode-toggle desktop" onClick={toggleTheme}>
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </>
          )}
        </div>
      </nav>

      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} user={user} logout={logout} />
    </>
  );
};

export default Navbar;