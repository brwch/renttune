import React from 'react';
import './AboutPage.css';
import logoDark from "../assets/logoDt.svg";
import logoLight from "../assets/logoLt.svg";
import { useTheme } from '../context/ThemeContext';

const AboutPage = () => {
  const { theme } = useTheme();
  const logo = theme === 'dark' ? logoLight : logoDark;

  return (
    <div className="about-page-container">
      <header className="about-page-header">
        <div className="about-page-logo-container">
          <img src={logo} alt="RentTune Logo" className="about-page-logo" />
        </div>
        <h1>Witamy w RentTune!</h1>
        <p>Twoje miejsce do wynajmu muzyków na każdą okazję</p>
      </header>

      <section className="about-page-section">
        <h2>O naszym serwisie</h2>
        <p>
          RentTune to platforma, która łączy klientów poszukujących muzyków na różne wydarzenia 
          (wesela, urodziny, imprezy firmowe) z artystami gotowymi zapewnić niezapomniane wrażenia. 
          Dzięki naszemu systemowi rekomendacji, znajdziesz idealnego wykonawcę dopasowanego do Twoich preferencji!
        </p>
      </section>

      <section className="about-page-section">
        <h2>Rodzaje kont</h2>
        <div className="account-types">
          <div className="account-card">
            <h3>Klient</h3>
            <ul>
              <li>Przeglądaj oferty muzyków i zespołów</li>
              <li>Rezerwuj artystów na wybrane daty</li>
              <li>Wystawiaj opinie po wydarzeniu</li>
              <li>Korzystaj z systemu rekomendacji</li>
            </ul>
          </div>
          <div className="account-card">
            <h3>Muzyk/Zespół</h3>
            <ul>
              <li>Wystawiaj oferty z opisem usługi</li>
              <li>Zarządzaj kalendarzem dostępności</li>
              <li>Otrzymuj zapytania od klientów</li>
              <li>Potwierdzaj rezerwacje poprzez umowę przedwstępną</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="about-page-section">
        <h2>Proces rezerwacji</h2>
        <p>
          Po znalezieniu odpowiedniego wykonawcy, klient może wysłać zapytanie o rezerwację. Muzyk otrzymuje powiadomienie i może potwierdzić dostępność, wysyłając <strong>umowę przedwstępną</strong>.
        </p>
        <div className="notice-box">
          <p>
            <strong>Ważne:</strong> Umowa przedwstępna nie ma mocy prawnej i nie jest wiążąca. Służy jedynie jako potwierdzenie wstępnego zainteresowania obu stron. Ostateczne warunki są ustalane indywidualnie między klientem a muzykiem.
          </p>
        </div>
      </section>

      <section className="about-page-section tips-section">
        <h2>Porady dla muzyków</h2>
        <div className="tip-card">
          <h3>Jak zwiększyć swoje szanse?</h3>
          <ul>
            <li><strong>Pełny opis oferty</strong> - im więcej szczegółów (repertuar, wyposażenie, doświadczenie), tym lepiej!</li>
            <li><strong>Jakościowe zdjęcia i nagrania</strong> - pozwalają klientom lepiej ocenić Twój styl</li>
            <li><strong>Aktualny kalendarz</strong> - unikniesz nieporozumień co do dostępności</li>
            <li><strong>Konkurencyjne ceny</strong> - uwzględnij różne pakiety usług</li>
          </ul>
        </div>
      </section>

      <section className="about-page-section">
        <h2>Regulamin i kultura</h2>
        <p>
          Dbamy o przyjazną atmosferę w naszym serwisie. Prosimy o:
        </p>
        <ul className="rules-list">
          <li>Kulturalne zachowanie w komentarzach i wiadomościach</li>
          <li>Rzetelne opisywanie ofert (bez wprowadzania w błąd)</li>
          <li>Terminowe odpowiadanie na zapytania</li>
          <li>Przestrzeganie zasad ochrony danych osobowych</li>
        </ul>
      </section>

      <section className="about-page-section about-page-contact">
        <h2>Kontakt z administracją</h2>
        <p>
          W przypadku pytań, wątpliwości lub zgłoszenia nadużyć, prosimy o kontakt:
        </p>
        <div className="about-contact-details">
          <p><strong>Email:</strong> kontakt@renttune.pl</p>
          <p><strong>Telefon:</strong> +48 123 456 789</p>
          <p><strong>Godziny pracy:</strong> Pon-Pt 9:00-17:00</p>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;