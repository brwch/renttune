<p align="center">
  <img src="https://github.com/user-attachments/assets/b7c4eb85-4649-4185-ac47-cc1946a5dd06" width="300"/>
</p>

**RentTune** is a full-stack web application for artist management and event booking. The platform centralizes artist discovery, contract negotiation, and booking management. Access to core features is restricted to verified accounts to maintain a professional environment and secure transaction flow.

>The project demonstrates the implementation of complex business logic, including real-time negotiation state machines and data-driven recommendation engines.

## Features

### Intelligent Recommendation Engine

The matching engine is based on a **Behavioral Analysis** layer that processes user signals, specifically profile views, bookings, and favorites to maintain an evolving preference model.

This model serves as the input for a **weighted scoring mechanism**. The algorithm calculates compatibility scores by cross-referencing user data against music styles, event types, instrumentation, and performer categories. This architecture allows the system to provide baseline relevance for new users (**cold start**) while increasing recommendation precision as the interaction dataset grows.

### Booking & Negotiation Workflow

The system facilitates end-to-end bookings through a dedicated negotiation module. This component allows parties to finalize terms such as pricing, duration, and specific requirements directly within the application. To maintain data integrity, the system integrates **calendar synchronization** that automatically updates artist availability upon booking confirmation, preventing scheduling conflicts. Real-time **status tracking** provides persistent visibility into the contract lifecycle, from the initial request through to final execution.

### Dynamic Dashboard & Analytics

The application provides a dashboard-driven interface that aggregates key metrics based on user roles. For artists, the system processes engagement statistics and schedule management, while the client interface focuses on booking history and expenditure tracking. This centralized architecture provides direct access to the messaging subsystem, profile configuration, and offer generation tools without unnecessary navigational overhead.

##  Screenshots

<img width="1920" height="1080" alt="1 1" src="https://github.com/user-attachments/assets/dd8c9b3e-4c35-4058-ad31-71bcbf54d302" />
&nbsp;&nbsp;
<div align="right"> <details>
  <summary>📸 View more</summary>
    <br>
      <img width="1000" src="https://github.com/user-attachments/assets/ffb006d7-a7a7-4503-995b-15dfd3a9917e" />
      &nbsp;&nbsp;
      <img width="1000" src="https://github.com/user-attachments/assets/364d3b7e-50bc-4160-be7d-3ba2fa419d3a" /> 
      &nbsp;&nbsp;
      <img width="1000" src="https://github.com/user-attachments/assets/a5e7c600-1843-4933-b123-14d3c36789ce" />
       &nbsp;&nbsp;
        <p align="center">
          <a href="https://docs.google.com/presentation/d/1hrjEWS7jR6lBMA304_u9NTs1dsGSZkUX8Sk1uiSzgdI/present">
            <img src="https://img.shields.io/badge/Prezentacja-Google%20Slides-orange?style=for-the-badge&logo=google-slides" alt="Google Slides">
          </a>
        </p>
</details> </div>

## Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB (Local or Atlas URI)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/renttune.git
   cd renttune
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

### Configuration

1. **Root Environment**
   Rename `.env.example` to `.env` (creates empty config for testing if needed).

2. **Backend Environment**
   Navigate to `backend/` and rename `.env.example` to `.env`. Fill in your secrets:
   ```env
   port=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

### Running the App

1. **Start the Backend**
   ```bash
   # In /backend directory
   npm start
   # or for development
   npm run dev
   ```

2. **Start the Frontend**
   ```bash
   # In root directory
   npm run dev
   ```

The application will be available at `http://localhost:5173`.

## Tech Stack

### Frontend
[![React][React.js]][React-url]
[![React Router][ReactRouter]][ReactRouter-url]
[![Tailwind CSS][TailwindCSS]][TailwindCSS-url]
[![Vite][Vite]][Vite-url]

### Backend / Services
[![Node.js][Node.js]][Node-url]
[![Express.js][Express.js]][Express-url]
[![MongoDB][MongoDB]][MongoDB-url]
[![Passport][Passport]][Passport-url]

### Testing
[![Jest][Jest]][Jest-url]
[![Cypress][Cypress]][Cypress-url]

[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Vite]: https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white
[Vite-url]: https://vitejs.dev/
[TailwindCSS]: https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white
[TailwindCSS-url]: https://tailwindcss.com/
[ReactRouter]: https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white
[ReactRouter-url]: https://reactrouter.com/
[Node.js]: https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white
[Node-url]: https://nodejs.org/
[Express.js]: https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB
[Express-url]: https://expressjs.com/
[MongoDB]: https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white
[MongoDB-url]: https://www.mongodb.com/
[Passport]: https://img.shields.io/badge/passport-%2334E27A.svg?style=for-the-badge&logo=passport&logoColor=white
[Passport-url]: https://www.passportjs.org/
[Jest]: https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white
[Jest-url]: https://jestjs.io/
[Cypress]: https://img.shields.io/badge/-cypress-%23E5E5E5?style=for-the-badge&logo=cypress&logoColor=058a5e
[Cypress-url]: https://www.cypress.io/
[AWS-S3]: https://img.shields.io/badge/AWS%20S3-569A31?style=for-the-badge&logo=amazon-s3&logoColor=white
[AWS-url]: https://aws.amazon.com/s3/
[NPM]: https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white
[NPM-url]: https://www.npmjs.com/

## Project Structure

```bash
renttune/
├── backend/
│   ├── routes/         # API endpoints (Auth, Offers, Bookings, Recommendations)
│   ├── middleware/     # Auth verification & Error handling
│   ├── db.js           # Database connection & Indexing logic
│   └── server.js       # App entry point & Server configuration
├── src/
│   ├── components/     # Reusable UI components (Navbar, Footer, Forms)
│   ├── pages/          # Full page views (Dashboard, Profile, Booking logic)
│   ├── context/        # Global state management (User, Theme, Notifications)
│   ├── hooks/          # Custom React hooks
│   └── styles/         # Global styles & CSS variables
└── ...
```

## Project Status

RentTune was developed as a technical Proof of Concept (PoC) to demonstrate a streamlined discovery and negotiation workflow. The project has reached its intended milestones, successfully implementing the "handshake" logic and contract finalization between artists and clients. Currently, the repository serves as a stable demonstration of these core features and is not undergoing further active development.

**Future Evolution**

The roadmap for a production-ready version would require the integration of payment modules (e.g., Stripe Connect) to handle escrow services and automated commission collection, shifting financial responsibility to the platform.

---

Built as a personal learning project focused on practical frontend and backend development.
