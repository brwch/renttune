import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import "./LoginRegisterPage.css";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (errors.email && emailRef.current) {
      emailRef.current.focus();
    }
  }, [errors]);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = "Email jest wymagany.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Niepoprawny format emaila.";
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
        Wysyłanie linku do resetowania hasła...
      </div>,
      {
        position: "bottom-right",
        closeButton: false,
        containerId: 'global-toast'
      }
    );

    try {
      const response = await fetch('http://localhost:5000/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Błąd podczas wysyłania linku');
      }

      toast.update(toastId, {
        render: "Link do resetowania hasła został wysłany na podany email!",
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
        render: error.message || "Wystąpił błąd podczas wysyłania linku",
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

  return (
    <div className="login-page">
      <div className="login-card">
        <h2 className="login-title">Resetowanie hasła</h2>
        <p className="register-subtitle">
          Podaj adres email powiązany z Twoim kontem, a wyślemy Ci link do resetowania hasła
        </p>

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

          <button
            type="submit"
            className={`nav-button login-submit ${isSubmitting ? 'submitting' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="button-spinner" />
                Wysyłanie...
              </>
            ) : (
              'Wyślij link resetujący'
            )}
          </button>
        </form>

        <p className="login-footer">
          Przypomniałeś sobie hasło?{" "}
          <Link to="/login" className="login-link">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;