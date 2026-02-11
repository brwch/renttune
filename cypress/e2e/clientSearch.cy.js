describe('Wyszukiwanie oferty DJ Marko', () => {
  const FRONTEND_URL = 'http://localhost:5173';
  const BACKEND_URL = 'http://localhost:5000';

  beforeEach(() => {
    
    cy.intercept('GET', `${BACKEND_URL}/api/offers/search*`).as('searchResults');
    cy.intercept('GET', `${BACKEND_URL}/api/offers/*`).as('offerDetails');

    cy.visit(FRONTEND_URL);
  });

  it('Powinna znaleźć ofertę DJ Marco i przejść do szczegółów', () => {
    
    cy.get('.search-bar input')
      .type('DJ Marko')
      .should('have.value', 'DJ Marko');

    
    cy.get('.search-bar input').type('{enter}');

    
    cy.url().should('include', '/?search=DJ%20Marko');

    
    cy.wait('@searchResults');

    
    cy.get('.home-offers-grid').should('be.visible');

    
    cy.get('.home-offer-card').first()
      .find('h3')
      .should('contain', 'DJ Marko');

    
    cy.get('.home-offer-card').first()
      .find('.home-order-button')
      .click();

    
    cy.wait('@offerDetails');

    
    cy.url().should('match', new RegExp(`${FRONTEND_URL}/offer/\\w+`));

    
    cy.get('.offer-header h1').should('contain', 'DJ Marko');
    cy.get('.offer-sidebar .info-card').first()
      .should('contain', 'Typ wykonawcy')
      .and('contain', 'Solista');
  });

  it('Powinna wyświetlić komunikat gdy nie ma wyników', () => {
    
    cy.get('.search-bar input')
      .type('CośCoNieIstnieje123')
      .type('{enter}');

    cy.wait('@searchResults');

    
    cy.get('.home-no-results-container').should('be.visible');
    cy.get('.home-no-results-title').should('contain', 'Nie znaleziono wyników');
  });

  it('Powinna wyczyścić wyszukiwanie', () => {
    
    cy.get('.search-bar input')
      .type('DJ Marko')
      .should('have.value', 'DJ Marko');

    
    cy.get('.clear-search').click();

    
    cy.get('.search-bar input').should('have.value', '');

    
    cy.url().should('eq', `${FRONTEND_URL}/`);
  });
});
