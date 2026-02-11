import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import Footer from "./components/Footer";
import AddOfferForm from "./pages/AddOfferForm";
import { UserProvider, useUser } from "./context/UserContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { ToastContainer } from "react-toastify";
import MyOffers from "./pages/MyOffers";
import OfferPage from "./pages/OfferPage";
import CalendarPage from "./pages/CalendarPage";
import ProfilePage from "./pages/ProfilePage";
import FavoritesPage from "./pages/FavoritesPage";
import MyReviewsPage from "./pages/MyReviewsPage";
import ContractPage from "./pages/ContractPage";
import SelectAccountType from "./pages/SelectAccountType";
import 'react-toastify/dist/ReactToastify.css';
import GoogleLoginSuccess from "./pages/GoogleLoginSuccess";
import BookingPage from "./pages/BookingPage";
import AboutPage from "./pages/AboutPage";

const ProtectedRoute = ({ children, allowedRoles, redirectTo = "/" }) => {
  const { user, loading } = useUser();
  
  if (loading) {
    return <div>Loading...</div>; // Możesz zastąpić komponentem ładowania
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.accountType)) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return children;
};

// Komponent dla ścieżek dostępnych tylko dla niezalogowanych
const GuestOnlyRoute = ({ children }) => {
  const { user, loading } = useUser();
  
  if (loading) {
    return <div>Loading...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <UserProvider>
          <NotificationsProvider>
            <div className="app-wrapper">
              <Navbar />
              <main>
                <Routes>
                  {/* Ścieżki dostępne dla wszystkich */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/offer/:id" element={<OfferPage />} />
                  <Route path="/profile/:id" element={<ProfilePage />} />
                  <Route path="/calendar/:userId?" element={<CalendarPage />} />
                  
                  {/* Ścieżki tylko dla niezalogowanych */}
                  <Route path="/login" element={
                    <GuestOnlyRoute>
                      <LoginPage />
                    </GuestOnlyRoute>
                  } />
                  <Route path="/login/success" element={
                    <GuestOnlyRoute>
                      <GoogleLoginSuccess />
                    </GuestOnlyRoute>
                  } />
                  <Route path="/register" element={
                    <GuestOnlyRoute>
                      <RegisterPage />
                    </GuestOnlyRoute>
                  } />
                  <Route path="/forgot-password" element={
                    <GuestOnlyRoute>
                      <ForgotPasswordPage />
                    </GuestOnlyRoute>
                  } />
                  <Route path="/reset-password/:token" element={
                    <GuestOnlyRoute>
                      <ResetPasswordPage />
                    </GuestOnlyRoute>
                  } />
                  <Route path="/select-account-type" element={
                    <GuestOnlyRoute>
                      <SelectAccountType />
                    </GuestOnlyRoute>
                  } />
                  
                  {/* Ścieżki tylko dla zalogowanych użytkowników */}
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/contract/:id" element={
                    <ProtectedRoute>
                      <ContractPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/bookings" element={
                    <ProtectedRoute>
                      <BookingPage />
                    </ProtectedRoute>
                  } />
                  
                  {/* Ścieżki tylko dla klientów */}
                  <Route path="/favorites" element={
                    <ProtectedRoute allowedRoles={['client']} redirectTo="/profile">
                      <FavoritesPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/my-reviews" element={
                    <ProtectedRoute allowedRoles={['client']} redirectTo="/profile">
                      <MyReviewsPage />
                    </ProtectedRoute>
                  } />
                  
                  {/* Ścieżki tylko dla muzyków */}
                  <Route path="/create-offer" element={
                    <ProtectedRoute allowedRoles={['musician']} redirectTo="/profile">
                      <AddOfferForm />
                    </ProtectedRoute>
                  } />
                  <Route path="/my-offers" element={
                    <ProtectedRoute allowedRoles={['musician']} redirectTo="/profile">
                      <MyOffers />
                    </ProtectedRoute>
                  } />
                  <Route path="/edit-offer/:id" element={
                    <ProtectedRoute allowedRoles={['musician']} redirectTo="/profile">
                      <AddOfferForm />
                    </ProtectedRoute>
                  } />  
                  
                  {/* Ścieżka fallback - gdy żadna inna nie pasuje */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
              <ToastContainer
                position="bottom-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                limit={3}
                containerId="global-toast"
                enableMultiContainer={false}
              />
            </div>
          </NotificationsProvider>
        </UserProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;