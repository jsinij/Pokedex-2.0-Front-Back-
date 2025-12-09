import { useState } from 'react';
import { login } from '../../../services/authService';
import './auth-modal.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
};

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos');
      return;
    }

    try {
      setIsLoading(true);
      await login({ email, password });
      
      // Éxito
      setEmail('');
      setPassword('');
      
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Botón X para cerrar */}
        <button 
          type="button"
          className="auth-modal-close" 
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>

        {/* Contenido del modal */}
        <div className="auth-modal-content">
          <h2 className="auth-modal-title">Iniciar Sesión</h2>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
