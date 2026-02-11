describe('Dodawanie nowej oferty', () => {
  const FRONTEND_URL = 'http://localhost:5173';
  const BACKEND_URL = 'http://localhost:5000';
  const TEST_EMAIL = 'asd@asd.asd';
  const TEST_PASSWORD = 'asdasd';

  // Dane testowej oferty
  const TEST_OFFER = {
    artistName: 'Testowy Zespół',
    performerType: 'band',
    location: 'Warszawa',
    email: 'test@test.com',
    phone: '123 456 789',
    description: 'To jest opis testowej oferty stworzonej przez Cypress',
    musicStyles: ['Rock', 'Pop'],
    eventTypes: ['Wesele', 'Impreza firmowa'],
    instruments: ['Gitara', 'Perkusja'],
    priceMin: '1000',
    priceMax: '3000',
    durationMin: '2',
    durationMax: '6',
    availability: 'Dostępny w weekendy i święta'
  };

  beforeEach(() => {
    // Mockowanie odpowiedzi API
    cy.intercept('POST', `${BACKEND_URL}/api/login`, {
      statusCode: 200,
      body: {
        token: 'test-token',
        accountType: 'musician',
        userId: '123'
      }
    }).as('loginRequest');

    cy.intercept('POST', `${BACKEND_URL}/api/offers`, {
      statusCode: 201,
      body: { message: 'Oferta dodana pomyślnie' }
    }).as('createOffer');

    cy.intercept('GET', `${BACKEND_URL}/api/offers/active*`, {
      statusCode: 200,
      body: { offers: [], totalCount: 0 }
    }).as('getOffers');

    cy.visit(FRONTEND_URL);
  });

  it('Powinna zalogować użytkownika i dodać nową ofertę', () => {
    // 1. Logowanie jeśli nie jesteśmy zalogowani
    cy.get('body').then(($body) => {
      if ($body.find('.nav-button.login-button').length > 0) {
        cy.get('.nav-button.login-button').click();
        cy.get('#email').type(TEST_EMAIL);
        cy.get('#password').type(TEST_PASSWORD);
        cy.get('.login-submit').click();
        cy.wait('@loginRequest');
      }
    });

    // 2. Przejdź do "Moje oferty"
    cy.get('.user-dropdown').click();
    cy.contains('.dropdown-item', 'Moje oferty').click();

    // 3. Kliknij "Dodaj ofertę"
    cy.contains('Dodaj nową ofertę').click();

    // 4. Wypełnij formularz
    // Sekcja: Dane podstawowe
    cy.get('input[name="artistName"]').type(TEST_OFFER.artistName);
    cy.get('select[name="performerType"]').select(TEST_OFFER.performerType);
    cy.get('input[name="location"]').type(TEST_OFFER.location);
    cy.get('input[name="email"]').type(TEST_OFFER.email);
    cy.get('input[type="tel"]').type(TEST_OFFER.phone);

    // Sekcja: Oferta i styl muzyczny
    cy.get('textarea[name="description"]').type(TEST_OFFER.description);
    
    // Zaznacz style muzyczne
    TEST_OFFER.musicStyles.forEach(style => {
      cy.contains('.add-offer-checkbox-label', style).click();
    });

    // Zaznacz instrumenty
    TEST_OFFER.instruments.forEach(instrument => {
      cy.contains('.add-offer-checkbox-label', instrument).click();
    });

    // Zaznacz typy wydarzeń
    TEST_OFFER.eventTypes.forEach(type => {
      cy.contains('.add-offer-checkbox-label', type).click();
    });

    // Wprowadź cenę
    cy.get('input[placeholder="Min"]').first().type(TEST_OFFER.priceMin);
    cy.get('input[placeholder="Max"]').first().type(TEST_OFFER.priceMax);

    // Wprowadź czas trwania
    cy.get('input[placeholder="Min"]').last().type(TEST_OFFER.durationMin);
    cy.get('input[placeholder="Max"]').last().type(TEST_OFFER.durationMax);

    // cy.get('input[type="file"]').first().selectFile('cypress/fixtures/test-image.jpg', { force: true });

    // Wprowadź link YouTube
    cy.get('input[name="videoDemo"]').type('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    // Sekcja: Dostępność terminów
    cy.get('textarea[name="availability"]').type(TEST_OFFER.availability);

    // 5. Wyślij formularz
    cy.contains('button', 'Opublikuj ogłoszenie').click();

    // 6. Sprawdź czy request został wysłany
    cy.wait('@createOffer').then((interception) => {
      expect(interception.request.body).to.include({
        artistName: TEST_OFFER.artistName,
        performerType: TEST_OFFER.performerType,
        location: TEST_OFFER.location
      });
    });

    // 7. Sprawdź toast z potwierdzeniem
    cy.get('.Toastify__toast--success').should('contain', 'Oferta została pomyślnie dodana!');

    // 8. Sprawdź przekierowanie
    cy.url().should('include', '/my-offers');
  });

  it('Powinna wyświetlić błędy walidacji formularza', () => {
    // Logowanie jeśli potrzebne
    cy.get('body').then(($body) => {
      if ($body.find('.nav-button.login-button').length > 0) {
        cy.get('.nav-button.login-button').click();
        cy.get('#email').type(TEST_EMAIL);
        cy.get('#password').type(TEST_PASSWORD);
        cy.get('.login-submit').click();
        cy.wait('@loginRequest');
      }
    });


    cy.visit(`${FRONTEND_URL}/add-offer`);
    cy.contains('button', 'Opublikuj ogłoszenie').click();

    cy.contains('.error-message', 'Nazwa artysty/grupy jest wymagana').should('be.visible');
    cy.contains('.error-message', 'Rodzaj wykonawcy jest wymagany').should('be.visible');
    cy.contains('.error-message', 'Lokalizacja jest wymagana').should('be.visible');
    cy.contains('.error-message', 'Email jest wymagany').should('be.visible');
    cy.contains('.error-message', 'Telefon jest wymagany').should('be.visible');
    cy.contains('.error-message', 'Opis jest wymagany').should('be.visible');
  });
});