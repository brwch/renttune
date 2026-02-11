import { useState, useRef, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import { Eye, EyeOff } from "lucide-react";
import "./LoginRegisterPage.css";

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (errors.password && passwordRef.current) {
      passwordRef.current.focus();
    } else if (errors.confirmPassword && confirmPasswordRef.current) {
      confirmPasswordRef.current.focus();
    }
  }, [errors]);

  const validate = () => {
    const newErrors = {};
    
    if (!password) {
      newErrors.password = "Hasło jest wymagane.";
    } else if (password.length < 6) {
      newErrors.password = "Hasło musi mieć co najmniej 6 znaków.";
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Hasła nie są identyczne.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    
    if (Object.keys(validationErrors).length > 0) {
      return setErrors(validationErrors);
    }

    setIsSubmitting(true);
    
    const toastId = toast.loading(
      <div>
        <span className="loading-spinner" />
        Resetowanie hasła...
      </div>,
      {
        position: "bottom-right",
        closeButton: false,
        containerId: 'global-toast'
      }
    );

    try {
      const response = await fetch(`http://localhost:5000/api/reset-password/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Błąd podczas resetowania hasła');
      }

      toast.update(toastId, {
        render: "Hasło zostało pomyślnie zresetowane!",
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
        render: error.message || "Wystąpił błąd podczas resetowania hasła",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
        className: 'shake',
        containerId: 'global-toast'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePassword = () => setShowPassword(prev => !prev);
  const toggleConfirmPassword = () => setShowConfirmPassword(prev => !prev);

  return (
    <div className="login-page">
      <div className="login-card">
        <h2 className="login-title">Zresetuj hasło</h2>
        <p className="register-subtitle">Wprowadź nowe hasło dla swojego konta</p>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
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
            <label htmlFor="password">Nowe hasło</label>
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
            <label htmlFor="confirmPassword">Potwierdź nowe hasło</label>
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
            className={`nav-button login-submit ${isSubmitting ? 'submitting' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="button-spinner" />
                Resetowanie...
              </>
            ) : (
              'Zresetuj hasło'
            )}
          </button>
        </form>

        <p className="login-footer">
          <Link to="/login" className="login-link">
            Powrót do logowania
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPasswordPage;