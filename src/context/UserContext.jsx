import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    if (token && userId) {
      verifyToken(token, userId);
    } else {
      setLoading(false);
      setUser(null);
    }
  }, []);

  const verifyToken = async (token, userId) => {
    try {
      const response = await fetch('http://localhost:5000/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Nieprawidłowy token');
      }

      const data = await response.json();
      setUser({
        ...data.profile,
        token,
        id: userId, 
        accountType: data.profile.accountType
      });
    } catch (error) {
      console.error('Błąd weryfikacji tokena:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('accountType');
      localStorage.removeItem('userId');
    } finally {
      setLoading(false);
    }
  };

  const login = async (token, accountType, userId) => {
    localStorage.setItem('token', token);
    localStorage.setItem('accountType', accountType);
    localStorage.setItem('userId', userId);

    try {
      const response = await fetch('http://localhost:5000/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Nie udało się pobrać profilu');
      }

      const data = await response.json();
      setUser({
        ...data.profile,
        token,
        id: userId,
        accountType: data.profile.accountType
      });
    } catch (error) {
      console.error('Błąd logowania:', error);
      logout();
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accountType');
    localStorage.removeItem('userId');
    setUser(null);
    navigate('/login');
  };

  const updateUser = (updatedData) => {
    setUser(prev => ({
      ...prev,
      ...updatedData
    }));
  };

  return (
    <UserContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}