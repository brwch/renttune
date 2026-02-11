describe('Logowanie użytkownika', () => {
  const FRONTEND_URL = 'http://localhost:5173';
  const BACKEND_URL = 'http://localhost:5000';
  const TEST_EMAIL = 'asd@asd.asd';
  const TEST_PASSWORD = 'asdasd';

  beforeEach(() => {
    cy.intercept('POST', `${BACKEND_URL}/api/login`).as('loginRequest');
    cy.visit(FRONTEND_URL);
  });

  it('Powinna zalogować użytkownika poprawnymi danymi', () => {
    cy.get('.nav-button.login-button').click();
    cy.url().should('include', '/login');

    cy.get('#email').type(TEST_EMAIL);
    cy.get('#password').type(TEST_PASSWORD);

    cy.get('.login-submit').click();
    cy.wait('@loginRequest');


    cy.get('.Toastify__toast--success').should('be.visible');
    cy.get('.Toastify__toast--success').should('contain', 'Logowanie zakończone pomyślnie!');

    cy.url().should('eq', `${FRONTEND_URL}/`);
    cy.get('.user-name').should('be.visible');
  });

  it('Powinna wyświetlić błąd przy niepoprawnych danych', () => {
    cy.visit(`${FRONTEND_URL}/login`);

    cy.get('#email').type('niepoprawny@email.com');
    cy.get('#password').type('zlehaslo');

    cy.get('.login-submit').click();
    cy.wait('@loginRequest');


    cy.get('.Toastify__toast--error').should('be.visible');
    cy.get('.Toastify__toast--error').should('contain', 'Nieprawidłowy email lub hasło');
  });

  it('Powinna wyświetlić walidację formularza dla pustych pól', () => {
    cy.visit(`${FRONTEND_URL}/login`);
    cy.get('.login-submit').click();


    cy.get('.input-group.has-error').should('have.length', 2);
    cy.contains('.error-message', 'Email jest wymagany.').should('be.visible');
    cy.contains('.error-message', 'Hasło jest wymagane.').should('be.visible');
  });

  it('Powinna wyświetlić walidację dla niepoprawnego emaila', () => {
    cy.visit(`${FRONTEND_URL}/login`);

    cy.get('#email').type('zlyemail');
    cy.get('#password').type('haslo');
    cy.get('.login-submit').click();


    cy.contains('.error-message', 'Niepoprawny format emaila.').should('be.visible');
  });

  it('Powinna przejść do strony rejestracji', () => {
    cy.visit(`${FRONTEND_URL}/login`);
    cy.get('.login-link').click();
    cy.url().should('include', '/register');
  });
});