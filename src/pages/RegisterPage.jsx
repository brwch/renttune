import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from 'react-toastify';
import "./LoginRegisterPage.css";

function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const accountTypeRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (errors.email && emailRef.current) {
      emailRef.current.focus();
    } else if (errors.password && passwordRef.current) {
      passwordRef.current.focus();
    } else if (errors.confirmPassword && confirmPasswordRef.current) {
      confirmPasswordRef.current.focus();
    } else if (errors.accountType && accountTypeRef.current) {
      accountTypeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      accountTypeRef.current.classList.add('shake');
      setTimeout(() => {
        accountTypeRef.current.classList.remove('shake');
      }, 500);
    }
  }, [errors]);

  const validate = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email jest wymagany.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Niepoprawny format emaila.";
    }

    if (!password) {
      newErrors.password = "Hasło jest wymagane.";
    } else if (password.length < 6) {
      newErrors.password = "Hasło musi mieć co najmniej 6 znaków.";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Hasła nie są identyczne.";
    }

    if (!accountType) {
      newErrors.accountType = "Wybierz typ konta.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    const toastId = toast.loading(
      <div>
        <span className="loading-spinner" />
        Trwa rejestracja...
      </div>,
      {
        position: "bottom-right",
        closeButton: false,
        containerId: 'global-toast'
      }
    );

    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          accountType
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Błąd rejestracji');
      }

      toast.update(toastId, {
        render: "Rejestracja zakończona pomyślnie!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
        className: 'rotateY animated',
        containerId: 'global-toast'
      });

      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      toast.update(toastId, {
        render: error.message || "Wystąpił błąd podczas rejestracji",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
        containerId: 'global-toast'
      });

      setErrors({ form: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePassword = () => setShowPassword(prev => !prev);
  const toggleConfirmPassword = () => setShowConfirmPassword(prev => !prev);

  return (
    <div className="register-page">
      <div className="register-card">
        <h2 className="register-title">Zarejestruj się</h2>
        <p className="register-subtitle">Wybierz typ konta aby rozpocząć</p>

        <form onSubmit={handleSubmit} className="register-form" noValidate>
          <div className={`account-type-selector ${errors.accountType ? "has-error" : ""}`}
            ref={accountTypeRef}
          >
            <div className="account-type-options">
              <button
                type="button"
                className={`account-type-btn ${accountType === 'musician' ? 'active' : ''}`}
                onClick={() => setAccountType('musician')}
                disabled={isSubmitting}
              >
                <div className="account-icon">🎵</div>
                <h3>Jestem muzykiem</h3>
                <p>Chcę wystawiać swoje oferty</p>
              </button>

              <button
                type="button"
                className={`account-type-btn ${accountType === 'client' ? 'active' : ''}`}
                onClick={() => setAccountType('client')}
                disabled={isSubmitting}
              >
                <div className="account-icon">🎤</div>
                <h3>Szukam muzyka</h3>
                <p>Chcę wynająć artystę</p>
              </button>
            </div>
            {errors.accountType && <span className="error-message">{errors.accountType}</span>}
          </div>

          <div className={`input-group ${errors.email ? "has-error" : ""}`}>
            <input
              type="email"
              id="email"
              ref={emailRef}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              disabled={isSubmitting}
            />
            <label htmlFor="email">Email</label>
            <div className="input-error-space">
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
          </div>

          <div className={`input-group password-group ${errors.password ? "has-error" : ""}`}>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              ref={passwordRef}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              disabled={isSubmitting}
            />
            <label htmlFor="password">Hasło</label>
            {password && (
              <button
                type="button"
                className="toggle-password"
                onClick={togglePassword}
                aria-label="Pokaż/Ukryj hasło"
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
            <div className="input-error-space">
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>
          </div>

          <div className={`input-group password-group ${errors.confirmPassword ? "has-error" : ""}`}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              ref={confirmPasswordRef}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder=" "
              disabled={isSubmitting}
            />
            <label htmlFor="confirmPassword">Potwierdź hasło</label>
            {confirmPassword && (
              <button
                type="button"
                className="toggle-password"
                onClick={toggleConfirmPassword}
                aria-label="Pokaż/Ukryj hasło"
                disabled={isSubmitting}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
            <div className="input-error-space">
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>
          </div>

          <button
            type="submit"
            className={`nav-button register-submit ${isSubmitting ? 'submitting' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="button-spinner" />
                Trwa rejestracja...
              </>
            ) : (
              'Zarejestruj się'
            )}
          </button>
        </form>

        <p className="register-footer">
          Masz już konto?{" "}
          <Link to="/login" className="register-link">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;