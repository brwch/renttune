import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '../context/UserContext';

function GoogleLoginSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useUser();

  useEffect(() => {
    const token = searchParams.get('token');
    const accountType = searchParams.get('accountType');
    const userId = searchParams.get('userId');

    if (token && accountType && userId) {
      const loginUser = async () => {
        try {
          await login(token, accountType, userId);
          navigate('/');
        } catch (error) {
          navigate('/login');
        }
      };

      loginUser();
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate, login]);

  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Trwa logowanie...</p>
    </div>
  );
}

export default GoogleLoginSuccess;