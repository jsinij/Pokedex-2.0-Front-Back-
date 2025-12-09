import './auth-buttons.css';

type Props = {
  isAuthenticated?: boolean;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLogoutClick?: () => void;
};

export default function AuthButtons({ 
  isAuthenticated = false, 
  onLoginClick, 
  onRegisterClick,
  onLogoutClick 
}: Props) {
  if (isAuthenticated) {
    return (
      <div className="auth-buttons">
        <button 
          className="auth-btn auth-btn-logout"
          onClick={onLogoutClick}
          aria-label="Cerrar sesión"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  return (
    <div className="auth-buttons">
      <button 
        className="auth-btn auth-btn-login"
        onClick={onLoginClick}
        aria-label="Iniciar sesión"
      >
        Iniciar Sesión
      </button>
      <button 
        className="auth-btn auth-btn-register"
        onClick={onRegisterClick}
        aria-label="Registrarse"
      >
        Registrarse
      </button>
    </div>
  );
}
