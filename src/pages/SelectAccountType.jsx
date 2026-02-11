import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { User, Mic2, ArrowRight, Check } from 'lucide-react';
import "./SelectAccountType.css"

function SelectAccountType() {
  const [searchParams] = useSearchParams();
  const [accountType, setAccountType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const userId = searchParams.get('userId');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!accountType) {
      toast.error('Wybierz typ konta, aby kontynuować', { containerId: 'global-toast' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/set-account-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          accountType,
          userId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Wystąpił błąd podczas wyboru typu konta');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('accountType', data.accountType);
      localStorage.setItem('userId', data.userId);

      toast.success(
        `Witaj! Twoje konto zostało utworzone jako ${accountType === 'client' ? 'Klient' : 'Muzyk'}`,
        { containerId: 'global-toast' }
      );

      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Wystąpił błąd', { containerId: 'global-toast' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="account-type-container">
      <div className="account-type-header">
        <h1>Rozpocznij swoją muzyczną przygodę</h1>
        <p className="subtitle">Wybierz typ konta, który najlepiej odpowiada Twoim potrzebom</p>
      </div>
      
      <form onSubmit={handleSubmit} className="account-type-form">
        <div className="account-type-options">
          <label className="account-type-label">
            <input
              type="radio"
              name="accountType"
              value="client"
              checked={accountType === 'client'}
              onChange={() => setAccountType('client')}
              className="account-type-input"
            />
            <div className="account-type-card">
              <div className="account-type-icon">
                <User size={32} />
              </div>
              <h3>Klient</h3>
              <p className="card-description">Idealne jeśli szukasz muzyków na swoje wydarzenie</p>
              <div className="divider"></div>
              <ul className="account-type-features">
                <li><Check size={16} className="feature-icon" /> Przeglądaj profile muzyków</li>
                <li><Check size={16} className="feature-icon" /> Rezerwuj wykonawców online</li>
                <li><Check size={16} className="feature-icon" /> Zarządzaj swoimi wydarzeniami</li>
                <li><Check size={16} className="feature-icon" /> Oceniaj wykonawców po koncercie</li>
              </ul>
              <div className="recommended-badge">Dla organizatorów</div>
            </div>
          </label>

          <label className="account-type-label">
            <input
              type="radio"
              name="accountType"
              value="musician"
              checked={accountType === 'musician'}
              onChange={() => setAccountType('musician')}
              className="account-type-input"
            />
            <div className="account-type-card">
              <div className="account-type-icon">
                <Mic2 size={32} />
              </div>
              <h3>Muzyk</h3>
              <p className="card-description">Perfekcyjne dla artystów szukających występów</p>
              <div className="divider"></div>
              <ul className="account-type-features">
                <li><Check size={16} className="feature-icon" /> Stwórz profesjonalny profil</li>
                <li><Check size={16} className="feature-icon" /> Odbieraj propozycje współpracy</li>
                <li><Check size={16} className="feature-icon" /> Zarządzaj kalendarzem występów</li>
                <li><Check size={16} className="feature-icon" /> Buduj swoją reputację</li>
              </ul>
              <div className="recommended-badge">Dla artystów</div>
            </div>
          </label>
        </div>

        <div className="action-section">
          <button
            type="submit"
            disabled={isSubmitting || !accountType}
            className={`account-type-submit ${isSubmitting ? 'submitting' : ''}`}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                <span>Tworzenie konta...</span>
              </>
            ) : (
              <>
                <span>Potwierdź wybór</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
          <p className="help-text">Możesz zmienić ustawienia później w panelu użytkownika</p>
        </div>
      </form>
    </div>
  );
}

export default SelectAccountType;