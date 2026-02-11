import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from 'react-toastify';
import { useUser } from "../context/UserContext";
import "./LoginRegisterPage.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useUser();

  useEffect(() => {
    if (errors.email && emailRef.current) {
      emailRef.current.focus();
    } else if (errors.password && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [errors]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const token = query.get('token');
    const accountType = query.get('accountType');
    const userId = query.get('userId');

    if (token && accountType && userId) {
      handleGoogleLoginSuccess(token, accountType, userId);
    }
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  const handleGoogleLoginSuccess = async (token, accountType, userId) => {
    try {
      await login(token, accountType, userId);

      console.log('Google login success:', { token, accountType, userId });

      if (accountType === 'unset') {
        navigate('/select-account-type', {
          state: { token, userId },
          replace: true
        });
        return; // Early return - nie wyświetlamy Toastu
      }

      // Tylko dla istniejących użytkowników wyświetlamy Toast
      toast.success('Zalogowano przez Google!', {
        autoClose: 2000,
        containerId: 'global-toast'
      });

      navigate('/');
    } catch (error) {
      console.error('Google login error:', error);
      toast.error("Błąd podczas logowania przez Google", {
        containerId: 'global-toast'
      });
    }
  };

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
        Trwa logowanie...
      </div>,
      {
        position: "bottom-right",
        closeButton: false,
        containerId: 'global-toast'
      }
    );

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Błąd logowania');
      }

      await login(data.token, data.accountType, data.userId);

      toast.update(toastId, {
        render: "Logowanie zakończone pomyślnie!",
        type: "success",
        isLoading: false,
        autoClose: 2000,
        closeButton: true,
        className: 'rotateY animated',
        containerId: 'global-toast'
      });

      navigate('/');
    } catch (error) {
      toast.update(toastId, {
        render: error.message || "Wystąpił błąd podczas logowania",
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

  const togglePassword = () => setShowPassword((prev) => !prev);

  return (
    <div className="login-page">
      <div className="login-card">
        <h2 className="login-title">Zaloguj się</h2>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
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

          <div className="forgot-password">
            <Link to="/forgot-password" className="forgot-password-link">
              Zapomniałeś hasła?
            </Link>
          </div>

          <button
            type="submit"
            className={`nav-button login-submit ${isSubmitting ? 'submitting' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="button-spinner" />ㅤ
              </>
            ) : (
              'Zaloguj się'
            )}
          </button>
        </form>

        <div className="login-separator">
          <span>lub</span>
        </div>

        <button
          className="nav-button google-login"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google icon"
            width="20"
            height="20"
            className="google-icon"
          />
          Zaloguj się przez Google
        </button>

        <p className="login-footer">
          Nie masz konta?{" "}
          <Link to="/register" className="login-link">
            Zarejestruj się
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;