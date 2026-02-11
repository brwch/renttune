import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Facebook, Instagram, Youtube, Globe, User, Loader2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { toast } from 'react-toastify';
import './ProfilePage.css';

// Stałe dla ograniczeń znaków
const MAX_TECHNICAL_REQUIREMENTS = 300;
const MAX_SOCIAL_MEDIA_URL = 100;

const ProfilePage = () => {
  const { user: contextUser, updateUser } = useUser();
  const { id: profileId } = useParams();
  const [userData, setUserData] = useState({
    name: '',
    displayName: '',
    email: '',
    phone: '',
    accountType: 'client',
    organizationName: '',
    artistName: '',
    contactPreference: 'phone',
    technicalRequirements: '',
    providesEquipment: false,
    socialMedia: {
      facebook: '',
      instagram: '',
      youtube: '',
      website: ''
    }
  });
  const [isEditing, setIsEditing] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const isViewMode = !!profileId && (!contextUser?.id || profileId !== contextUser.id);

  // Funkcje walidacyjne
  const validatePhone = (phone) => {
    const regex = /^[0-9]{3}-[0-9]{3}-[0-9]{3}$/;
    return regex.test(phone);
  };

  const validateSocialMedia = (url, platform) => {
    if (!url) return true;

    const domains = {
      facebook: ['facebook.com', 'fb.com', 'fb.me'],
      instagram: ['instagram.com', 'instagr.am'],
      youtube: ['youtube.com', 'youtu.be'],
      website: []
    };

    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const hostname = urlObj.hostname.replace('www.', '');

      if (platform !== 'website') {
        const validDomains = domains[platform];
        if (!validDomains.some(domain => hostname.includes(domain))) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  };

  const validateInputLength = (value, maxLength) => {
    return value.length <= maxLength;
  };

  const normalizeImageUrl = (image) => {
    if (!image) return null;

    const googleDomains = [
      'googleusercontent.com',
      'ggpht.com',
      'google.com'
    ];

    const isGoogleImage = googleDomains.some(domain => image.includes(domain));

    if (isGoogleImage) {
      return image.replace(/=s\d+(-c)?$/, '=s400-c');
    }

    if (image.includes('http') || image.includes('/api/files/')) {
      return image.includes('/api/files/') ? `${image}?t=${Date.now()}` : image;
    }

    return `/api/files/${image}?t=${Date.now()}`;
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setProfileImage(null);
        setPreviewImage('');
        const targetUserId = profileId || contextUser?.id;

        console.log('profileId:', profileId);
        console.log('contextUser.id:', contextUser?.id);
        console.log('targetUserId:', profileId || contextUser?.id);
        console.log('isViewMode:', isViewMode);

        if (!targetUserId) {
          navigate(isViewMode ? '/' : '/login');
          return;
        }
        const profileResponse = await axios.get(`/api/user/${targetUserId}`, {
          headers: contextUser?.token ? {
            Authorization: `Bearer ${contextUser.token}`
          } : {}
        });

        const profileData = profileResponse.data;

        let imageUrl = null;
        if (profileData.avatar) {
          imageUrl = normalizeImageUrl(profileData.avatar);
        }
        else if (profileData.profileImage) {
          imageUrl = normalizeImageUrl(profileData.profileImage);
        } else if (profileData.profileImageUrl) {
          imageUrl = normalizeImageUrl(profileData.profileImageUrl);
        }

        setUserData({
          ...profileData,
          userId: profileData._id || profileData.userId || targetUserId,
          socialMedia: profileData.socialMedia || {
            facebook: '',
            instagram: '',
            youtube: '',
            website: ''
          }
        });

        if (imageUrl) {
          setProfileImage(imageUrl);
        }

      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Błąd pobierania danych: ' + error.message, {
          containerId: 'global-toast'
        });
        navigate(isViewMode ? '/' : '/login');
      } finally {
        setIsLoading(false);
      }
    };

    if (contextUser?.id && contextUser?.token) {
      fetchUserData();
    }
  }, [profileId, contextUser?.id]);

  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 9)}`;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'phone') {
      const formattedValue = formatPhoneNumber(value);
      setUserData({ ...userData, phone: formattedValue });
      setErrors({ ...errors, phone: validatePhone(formattedValue) ? '' : 'Nieprawidłowy format telefonu (123-456-789)' });
      return;
    }

    if (name === 'technicalRequirements') {
      if (!validateInputLength(value, MAX_TECHNICAL_REQUIREMENTS)) {
        setErrors({ ...errors, [name]: `Maksymalnie ${MAX_TECHNICAL_REQUIREMENTS} znaków` });
        return;
      }
    }

    if (name.startsWith('socialMedia.')) {
      const socialMediaField = name.split('.')[1];

      if (!validateInputLength(value, MAX_SOCIAL_MEDIA_URL)) {
        setErrors({ ...errors, [name]: `Maksymalnie ${MAX_SOCIAL_MEDIA_URL} znaków` });
        return;
      }

      if (value && !validateSocialMedia(value, socialMediaField)) {
        setErrors({
          ...errors,
          [name]: `Nieprawidłowy link ${socialMediaField}. Upewnij się, że podajesz poprawny URL.`
        });
        return;
      }

      setUserData({
        ...userData,
        socialMedia: {
          ...userData.socialMedia,
          [socialMediaField]: value
        }
      });
      return;
    }

    setUserData({
      ...userData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const newErrors = {};
    if (!userData.name) newErrors.name = 'Imię i nazwisko jest wymagane';
    if (!userData.phone) newErrors.phone = 'Numer telefonu jest wymagany';
    else if (!validatePhone(userData.phone)) newErrors.phone = 'Nieprawidłowy format telefonu (123-456-789)';

    if (userData.accountType === 'musician') {
      if (!userData.artistName) newErrors.artistName = 'Pseudonim artystyczny jest wymagany';

      Object.entries(userData.socialMedia).forEach(([key, value]) => {
        if (value && !validateSocialMedia(value, key)) {
          newErrors[`socialMedia.${key}`] = 'Nieprawidłowy URL';
        }
      });
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Proszę poprawić błędy w formularzu", {
        containerId: 'global-toast'
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', userData.name || '');
      formData.append('displayName', userData.displayName || userData.name || '');
      formData.append('phone', userData.phone || '');
      formData.append('organizationName', userData.organizationName || '');
      formData.append('contactPreference', userData.contactPreference || 'phone');

      if (userData.accountType === 'musician') {
        formData.append('artistName', userData.artistName || '');
        formData.append('technicalRequirements', userData.technicalRequirements || '');
        formData.append('providesEquipment', userData.providesEquipment || false);
        formData.append('socialMedia', JSON.stringify({
          facebook: userData.socialMedia.facebook || '',
          instagram: userData.socialMedia.instagram || '',
          youtube: userData.socialMedia.youtube || '',
          website: userData.socialMedia.website || ''
        }));
      }

      if (e.target.profileImage?.files?.[0]) {
        formData.append('profileImage', e.target.profileImage.files[0]);
      }

      const response = await axios.put('/api/user/profile', formData, {
        headers: {
          'Authorization': `Bearer ${contextUser.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const updatedUser = {
        ...contextUser,
        displayName: response.data.profile.displayName || response.data.profile.name,
        profileImage: response.data.profile.profileImage || response.data.profile.profileImageUrl,
      };

      updateUser(updatedUser);
      setIsEditing(false);
      setProfileImage(normalizeImageUrl(response.data.profile?.profileImage));
      setUserData(prev => ({
        ...prev,
        ...response.data.profile,
        socialMedia: response.data.profile.socialMedia || {
          facebook: '',
          instagram: '',
          youtube: '',
          website: ''
        }
      }));
      setPreviewImage('');

      setIsSaving(false);
      toast.success("Profil został zaktualizowany", {
        containerId: 'global-toast'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Wystąpił błąd podczas aktualizacji profilu: " +
        (error.response?.data?.message || error.message), {
        containerId: 'global-toast'
      });
    }
  };

  const handleDeleteImage = async () => {
    try {
      setIsLoading(true);
      const response = await axios.delete('/api/user/profile/profile-image', {
        headers: {
          'Authorization': `Bearer ${contextUser.token}`
        }
      });

      setProfileImage(null);
      setPreviewImage('');
      updateUser({
        ...contextUser,
        profileImage: null
      });

      toast.success("Zdjęcie profilowe zostało usunięte", {
        containerId: 'global-toast'
      });
    } catch (error) {
      console.error('Error deleting profile image:', error);
      toast.error(
        error.response?.data?.message ||
        "Wystąpił błąd podczas usuwania zdjęcia profilowego",
        {
          containerId: 'global-toast'
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderDefaultAvatar = (size = 200) => {
    const name = userData?.displayName || userData?.name || 'U';
    const initial = name.charAt(0).toUpperCase();

    return (
      <div
        className="user-avatar-default"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <span className="avatar-initial">{initial}</span>
      </div>
    );
  };

  const renderProfileImage = () => {
    if (isLoading && contextUser?.id && !profileImage && !previewImage) {
      return (
        <div className="image-loading-spinner">
          <Loader2 className="spinner-icon" />
        </div>
      );
    }

    if (previewImage) {
      return <img src={previewImage} className="image-preview" />;
    }

    if (profileImage) {
      return (
        <img
          src={profileImage}
          className="profile-image"
          onLoad={() => setIsLoading(false)}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '';
            setProfileImage(null);
            setIsLoading(false);
          }}
        />
      );
    }

    return renderDefaultAvatar(200);
  };

  const renderSocialMediaLink = (url, platform) => {
    if (!url) return null;

    // Dodatkowa walidacja dla strony WWW
    if (platform === 'Strona' && !url.match(/^https?:\/\//)) {
      url = `https://${url}`;
    }

    let icon = null;
    let color = '';
    let displayUrl = url;

    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      displayUrl = urlObj.hostname.replace('www.', '');
    } catch {
      displayUrl = url;
    }

    switch (platform) {
      case 'Facebook':
        icon = <Facebook size={20} />;
        color = '#1877F2';
        break;
      case 'Instagram':
        icon = <Instagram size={20} />;
        color = '#E1306C';
        break;
      case 'YouTube':
        icon = <Youtube size={20} />;
        color = '#FF0000';
        break;
      case 'Strona':
        icon = <Globe size={20} />;
        color = '#2563EB';
        // Dla strony WWW pokazujemy przycisk nawet jeśli URL nie jest idealny
        return (
          <a
            href={url.startsWith('http') ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="social-media-icon"
            style={{ backgroundColor: color }}
            title={displayUrl}
          >
            {icon}
          </a>
        );
      default:
        icon = <Globe size={20} />;
    }

    return (
      <a
        href={url.startsWith('http') ? url : `https://${url}`}
        target="_blank"
        rel="noopener noreferrer"
        className="social-media-icon"
        style={{ backgroundColor: color }}
        title={platform}
      >
        {icon}
      </a>
    );
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <div>Ładowanie danych...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="profile-not-found">
        <h3>Profil nie znaleziony</h3>
        <p>Nie można załadować danych profilu.</p>
        <button onClick={() => navigate('/')}>Wróć do strony głównej</button>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {!isViewMode ? (
        <div className="profile-header">
          <h1>Twój profil</h1>
          {!isEditing ? (
            <button className="edit-button action-button" onClick={() => setIsEditing(true)}>
              Edytuj profil
            </button>
          ) : (
            <button className="cancel-button action-button" onClick={() => setIsEditing(false)}>
              Anuluj
            </button>
          )}
        </div>
      ) : (
        <div className="profile-header">
          <h1>Profil użytkownika</h1>
        </div>
      )}

      {isEditing && !isViewMode ? (
        <form onSubmit={handleSubmit} className="profile-form" encType="multipart/form-data">
          <div className="profile-image-edit">
            {renderProfileImage()}
            <div className="image-upload-buttons">
              <label className="image-upload-label action-button">
                Zmień zdjęcie
                <input
                  type="file"
                  name="profileImage"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="image-upload-input"
                />
              </label>
              {(profileImage || previewImage) && (
                <button
                  type="button"
                  className="delete-image-button action-button"
                  onClick={handleDeleteImage}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="spinner-icon" /> : 'Usuń zdjęcie'}
                </button>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Imię i nazwisko *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={userData.name}
                onChange={handleInputChange}
                className="form-control"
                required
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="displayName">Wyświetlana nazwa</label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={userData.displayName}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Opcjonalne"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="organizationName">Nazwa organizacji</label>
              <input
                type="text"
                id="organizationName"
                name="organizationName"
                value={userData.organizationName}
                onChange={handleInputChange}
                className="form-control"
              />
            </div>

            {userData.accountType === 'musician' && (
              <div className="form-group">
                <label htmlFor="artistName">Pseudonim artystyczny *</label>
                <input
                  type="text"
                  id="artistName"
                  name="artistName"
                  value={userData.artistName}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                />
                {errors.artistName && <span className="error-message">{errors.artistName}</span>}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={userData.email}
                readOnly
                className="form-control read-only-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Numer telefonu *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={userData.phone}
                onChange={handleInputChange}
                className="form-control"
                required
                placeholder="123-456-789"
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contactPreference">Preferowany kontakt *</label>
              <select
                id="contactPreference"
                name="contactPreference"
                value={userData.contactPreference}
                onChange={handleInputChange}
                className="form-control"
                required
              >
                <option value="phone">Telefon</option>
                <option value="email">Email</option>
                <option value="both">Telefon i email</option>
                {userData.accountType === 'musician' && (
                  <option value="social">Social media</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label>Typ konta</label>
              <input
                type="text"
                value={userData.accountType === 'musician' ? 'Muzyk' : 'Klient'}
                readOnly
                className="form-control read-only-input"
              />
            </div>
          </div>

          {userData.accountType === 'musician' && (
            <>
              <div className="form-group">
                <label htmlFor="technicalRequirements">Wymagania techniczne</label>
                <div className="technical-requirements-wrapper">
                  <textarea
                    id="technicalRequirements"
                    name="technicalRequirements"
                    value={userData.technicalRequirements}
                    onChange={handleInputChange}
                    className="form-control"
                    maxLength={MAX_TECHNICAL_REQUIREMENTS}
                    placeholder="Opisz swoje wymagania techniczne..."
                  />
                  <span className="textarea-counter">
                    {userData.technicalRequirements?.length || 0}/{MAX_TECHNICAL_REQUIREMENTS}
                  </span>
                </div>
                {errors.technicalRequirements && (
                  <span className="error-message">{errors.technicalRequirements}</span>
                )}
              </div>

              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="providesEquipment"
                  name="providesEquipment"
                  checked={userData.providesEquipment}
                  onChange={handleInputChange}
                />
                <label htmlFor="providesEquipment">Zapewniam własny sprzęt i nagłośnienie</label>
              </div>

              <div className="profile-section">
                <h3>Social media</h3>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="socialMedia.facebook">Facebook</label>
                    <input
                      type="text"
                      id="socialMedia.facebook"
                      name="socialMedia.facebook"
                      value={userData.socialMedia.facebook}
                      onChange={handleInputChange}
                      className="form-control"
                      maxLength={MAX_SOCIAL_MEDIA_URL}
                      placeholder="https://facebook.com/twojprofil"
                    />
                    {errors['socialMedia.facebook'] && (
                      <span className="error-message">{errors['socialMedia.facebook']}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="socialMedia.instagram">
                      Instagram
                    </label>
                    <input
                      type="text"
                      id="socialMedia.instagram"
                      name="socialMedia.instagram"
                      value={userData.socialMedia.instagram}
                      onChange={handleInputChange}
                      className="form-control"
                      maxLength={MAX_SOCIAL_MEDIA_URL}
                      placeholder="https://instagram.com/twojprofil"
                    />
                    {errors['socialMedia.instagram'] && (
                      <span className="error-message">{errors['socialMedia.instagram']}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="socialMedia.youtube">
                      YouTube
                    </label>
                    <input
                      type="text"
                      id="socialMedia.youtube"
                      name="socialMedia.youtube"
                      value={userData.socialMedia.youtube}
                      onChange={handleInputChange}
                      className="form-control"
                      maxLength={MAX_SOCIAL_MEDIA_URL}
                      placeholder="https://youtube.com/twojkanał"
                    />
                    {errors['socialMedia.youtube'] && (
                      <span className="error-message">{errors['socialMedia.youtube']}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="socialMedia.website">
                      Strona WWW
                    </label>
                    <input
                      type="text"
                      id="socialMedia.website"
                      name="socialMedia.website"
                      value={userData.socialMedia.website}
                      onChange={handleInputChange}
                      className="form-control"
                      maxLength={MAX_SOCIAL_MEDIA_URL}
                      placeholder="https://twojastrona.com"
                    />
                    {errors['socialMedia.website'] && (
                      <span className="error-message">{errors['socialMedia.website']}</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="save-button action-button"
              disabled={isSaving}
              style={{ minWidth: '160px' }} // Dodatkowe zabezpieczenie
            >
              {isSaving ? (
                <>
                  <Loader2 className="spinner-icon" size={20} />
                  <span>Zapisywanie</span>
                </>
              ) : (
                'Zapisz zmiany'
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-view">
          <div className="profile-image-container">
            {renderProfileImage()}
          </div>

          <div className="profile-info">
            <h2>{userData.displayName || userData.name}</h2>

            <div className="profile-detail">
              <span>Email:</span>
              <p>{userData.email}</p>
            </div>

            {userData.organizationName && (
              <div className="profile-detail">
                <span>Organizacja:</span>
                <p>{userData.organizationName}</p>
              </div>
            )}

            {userData.accountType === 'musician' && userData.artistName && (
              <div className="profile-detail">
                <span>Pseudonim:</span>
                <p>{userData.artistName}</p>
              </div>
            )}

            <div className="profile-detail">
              <span>Telefon:</span>
              <p>{userData.phone}</p>
            </div>

            <div className="profile-detail">
              <span>Kanał kontaktu:</span>
              <p>
                {userData.contactPreference === 'phone' ? 'Telefon' :
                  userData.contactPreference === 'email' ? 'Email' :
                    userData.contactPreference === 'both' ? 'Telefon i email' : 'Social media'}
              </p>
            </div>

            {!isViewMode && (
              <div className="profile-detail">
                <span>Typ konta:</span>
                <p>{userData.accountType === 'musician' ? 'Muzyk' : 'Klient'}</p>
              </div>
            )}

            {userData.accountType === 'musician' && (
              <>
                {userData.technicalRequirements && (
                  <div className="profile-section">
                    <h3>Wymagania techniczne</h3>
                    <p className="profile-technical">{userData.technicalRequirements}</p>
                  </div>
                )}

                <div className="profile-detail">
                  <span>Sprzęt:</span>
                  <p>{userData.providesEquipment ? 'Zapewniam własny' : 'Wymaga zapewnienia'}</p>
                </div>

                {(userData.socialMedia.facebook ||
                  userData.socialMedia.instagram ||
                  userData.socialMedia.youtube ||
                  userData.socialMedia.website) && (
                    <div className="profile-section">
                      <h3>Social media</h3>
                      <div className="social-media-container">
                        <div className="social-media-icons">
                          {userData.socialMedia.facebook && renderSocialMediaLink(userData.socialMedia.facebook, 'Facebook')}
                          {userData.socialMedia.instagram && renderSocialMediaLink(userData.socialMedia.instagram, 'Instagram')}
                          {userData.socialMedia.youtube && renderSocialMediaLink(userData.socialMedia.youtube, 'YouTube')}
                          {userData.socialMedia.website && renderSocialMediaLink(userData.socialMedia.website, 'Strona')}
                        </div>
                      </div>
                    </div>
                  )}
                {userData.accountType === 'musician' && (
                  <button
                    className="calendar-button action-button"
                    onClick={() => navigate(isViewMode
                      ? `/calendar/${userData.userId}`
                      : '/calendar'
                    )}
                  >
                    {isViewMode ? 'Zobacz kalendarz' : 'Zarządzaj kalendarzem'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;