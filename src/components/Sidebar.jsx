import { X, UserPlus, LogIn, Moon, Sun, User, Calendar, Heart, MessageSquare, Users, LogOut, PlusCircle, List, Star, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import "../styles/navbar.css";

const Sidebar = ({ isOpen, toggleSidebar, user, logout }) => {
  const { theme, toggleTheme } = useTheme();
  const { loading } = useUser();

  // Funkcja renderująca specyficzne opcje dla muzyka
  const renderMusicianOptions = () => (
    <>
      <Link
        to="/create-offer"
        className="nav-button"
        onClick={toggleSidebar}
      >
        <PlusCircle size={18} />
        <span>Stwórz ogłoszenie</span>
      </Link>
      <Link
        to="/my-offers"
        className="nav-button"
        onClick={toggleSidebar}
      >
        <List size={18} />
        <span>Moje oferty</span>
      </Link>
      <Link
        to="/bookings"
        className="nav-button"
        onClick={toggleSidebar}
      >
        <MessageSquare size={18} />
        <span>Moje zgłoszenia</span>
      </Link>
      <Link
        to="/calendar"
        className="nav-button"
        onClick={toggleSidebar}
      >
        <Calendar size={18} />
        <span>Kalendarz występów</span>
      </Link>
    </>
  );

  // Funkcja renderująca specyficzne opcje dla klienta
  const renderClientOptions = () => (
    <>
      <Link
        to="/favorites"
        className="nav-button"
        onClick={toggleSidebar}
      >
        <Heart size={18} />
        <span>Ulubieni muzycy</span>
      </Link>
      <Link
        to="/bookings"
        className="nav-button"
        onClick={toggleSidebar}
      >
        <Calendar size={18} />
        <span>Moje rezerwacje</span>
      </Link>
      <Link
        to="/my-reviews"
        className="nav-button"
        onClick={toggleSidebar}
      >
        <Star size={18} />
        <span>Moje opinie</span>
      </Link>
    </>
  );

  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`}>
      <button className="close-btn" onClick={toggleSidebar}>
        <X size={24} />
      </button>

      <nav className="sidebar-menu">
        {!loading && (
          <>
            {user ? (
              <>
                <Link
                  to={`/profile/${user.userId}`}
                  className="nav-button profile-item"
                  onClick={toggleSidebar}
                >
                  <User size={18} />
                  <span>Mój profil</span>
                </Link>

                {user.accountType === 'musician'
                  ? renderMusicianOptions()
                  : renderClientOptions()}

                <div className="sidebar-divider"></div>

                <Link
                  to="/about"
                  className="nav-button"
                  onClick={toggleSidebar}
                >
                  <Users size={18} />
                  <span>O nas</span>
                </Link>
                <button
                  className="nav-button logout"
                  onClick={() => {
                    logout();
                    toggleSidebar();
                  }}
                >
                  <LogOut size={18} />
                  <span>Wyloguj się</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="nav-button"
                  onClick={toggleSidebar}
                >
                  <UserPlus size={18} />
                  <span>Zarejestruj</span>
                </Link>
                <Link
                  to="/login"
                  className="nav-button"
                  onClick={toggleSidebar}
                >
                  <LogIn size={18} />
                  <span>Zaloguj</span>
                </Link>
              </>
            )}
            <button
              className="nav-button dark-mode-toggle"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === "dark" ? "Tryb jasny" : "Tryb nocny"}</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;