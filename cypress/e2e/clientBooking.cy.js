describe('Rezerwacja oferty DJ Marko', () => {
  const FRONTEND_URL = 'http://localhost:5173';
  const BACKEND_URL = 'http://localhost:5000';
  const TEST_EMAIL = 'asd@asd.a';
  const TEST_PASSWORD = 'asdasd';

  beforeEach(() => {
    
    cy.intercept('POST', `${BACKEND_URL}/api/login`, {
      statusCode: 200,
      body: {
        token: 'test-token',
        accountType: 'client',
        userId: 'client123'
      }
    }).as('loginRequest');

    cy.intercept('GET', `${BACKEND_URL}/api/offers/search*`, {
      statusCode: 200,
      body: {
        offers: [{
          _id: 'djmarko123',
          artistName: 'DJ Marko',
          performerType: 'Solista',
          description: 'Profesjonalny DJ na każdą okazję',
          price: { min: 1000, max: 3000 },
          duration: { min: 2, max: 6 },
          eventTypes: ['Wesele', 'Impreza firmowa'],
          instruments: ['Mikser', 'Kontroler DJ']
        }],
        totalCount: 1
      }
    }).as('searchResults');

    cy.intercept('GET', `${BACKEND_URL}/api/offers/djmarko123`, {
      statusCode: 200,
      body: {
        offer: {
          _id: 'djmarko123',
          artistName: 'DJ Marko',
          performerType: 'Solista',
          description: 'Profesjonalny DJ na każdą okazję',
          price: { min: 1000, max: 3000 },
          duration: { min: 2, max: 6 },
          eventTypes: ['Wesele', 'Impreza firmowa'],
          instruments: ['Mikser', 'Kontroler DJ'],
          userId: 'artist123'
        }
      }
    }).as('offerDetails');

    cy.intercept('GET', `${BACKEND_URL}/api/availabilities/artist123`, {
      statusCode: 200,
      body: {
        availability: {
          '2023-12-31': { status: 'available' },
          '2024-01-01': { status: 'available' }
        }
      }
    }).as('availabilityCheck');

    cy.intercept('POST', `${BACKEND_URL}/api/bookings`, {
      statusCode: 201,
      body: { message: 'Rezerwacja została wysłana' }
    }).as('submitBooking');

    cy.visit(FRONTEND_URL);
  });

  it('Powinna zalogować użytkownika i zarezerwować ofertę DJ Marko', () => {
    
    cy.get('body').then(($body) => {
      if ($body.find('.nav-button.login-button').length > 0) {
        cy.get('.nav-button.login-button').click();
        cy.get('#email').type(TEST_EMAIL);
        cy.get('#password').type(TEST_PASSWORD);
        cy.get('.login-submit').click();
        cy.wait('@loginRequest');
      }
    });

    
    cy.get('.search-bar input').type('DJ Marko{enter}');
    cy.wait('@searchResults');

    
    cy.get('.home-offer-card').first().find('.home-order-button').click();
    cy.wait('@offerDetails');

    
    cy.get('.offer-order-button').click();

    
    
    cy.get('input[name="clientName"]').should('have.value', '').type('Jan Kowalski');
    cy.get('input[name="clientContact"]').should('have.value', '').type('jan@kowalski.pl');
    cy.get('input[name="clientAddress"]').type('ul. Testowa 123, Warszawa');
    cy.get('input[name="clientPeselNip"]').type('12345678901');

    
    cy.get('select[name="eventType"]').select('Wesele');
    
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    cy.get('input[name="eventDate"]').type(dateString);
    
    cy.get('input[name="startTime"]').clear().type('19:00');
    cy.get('input[name="duration"]').clear().type('4');
    cy.get('input[name="eventLocation"]').type('Restauracja Testowa, Warszawa');

    
    cy.get('textarea[name="eventDescription"]').type('Wesele dla 100 osób, preferowane utwory disco polo i dance');

    
    cy.get('input[id="instrument-Mikser"]').check();
    cy.get('input[id="instrument-Kontroler DJ"]').check();

    
    cy.get('input[name="totalPrice"]').type('2000');
    cy.get('select[name="paymentTerms"]').select('50% zaliczki, 50% w dniu wydarzenia');
    cy.get('input[name="depositAmount"]').type('1000');

    

    
    cy.get('button[type="submit"]').click();

    
    cy.wait('@submitBooking').then((interception) => {
      expect(interception.request.body).to.include({
        clientName: 'Jan Kowalski',
        eventType: 'Wesele',
        totalPrice: '2000'
      });
    });

    
    cy.get('.booking-success').should('be.visible');
    cy.get('.booking-success h3').should('contain', 'Rezerwacja wysłana!');
  });

  it('Powinna wyświetlić błędy walidacji formularza rezerwacji', () => {
    
    cy.get('body').then(($body) => {
      if ($body.find('.nav-button.login-button').length > 0) {
        cy.get('.nav-button.login-button').click();
        cy.get('#email').type(TEST_EMAIL);
        cy.get('#password').type(TEST_PASSWORD);
        cy.get('.login-submit').click();
        cy.wait('@loginRequest');
      }
    });

    
    cy.get('.search-bar input').type('DJ Marko{enter}');
    cy.wait('@searchResults');
    cy.get('.home-offer-card').first().find('.home-order-button').click();
    cy.wait('@offerDetails');

    
    cy.get('.offer-order-button').click();

    
    cy.get('button[type="submit"]').click();

    
    cy.contains('.error', 'To pole jest wymagane').should('be.visible'); 
    cy.contains('.error', 'To pole jest wymagane').should('be.visible'); 
    cy.contains('.error', 'To pole jest wymagane').should('be.visible'); 
    cy.contains('.error', 'To pole jest wymagane').should('be.visible'); 
    cy.contains('.error', 'Podaj poprawną kwotę').should('be.visible'); 
    cy.contains('.error', 'Wybierz co najmniej jeden instrument').should('be.visible'); 
    cy.contains('.error', 'Podaj czas trwania').should('be.visible'); 
  });
});