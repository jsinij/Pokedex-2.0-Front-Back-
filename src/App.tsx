import { useState } from 'react';
import { getToken, removeToken } from './services/authService';
import Pokedex from './features/pokemon/components/Pokedex';
import EvolutionChain from './features/pokemon/components/EvolutionChain';
import Album from './features/pokemon/components/Album';
import AuthButtons from './features/auth/components/AuthButtons';
import LoginModal from './features/auth/components/LoginModal';
import RegisterModal from './features/auth/components/RegisterModal';
import AdminButtons from './features/admin/components/AdminButtons';
import AdminPanel from './features/admin/components/AdminPanel';

/**
 * Orquesta la pokédex grande + el panel de evolución a la derecha.
 * Mantiene el “evoTarget” que recibe desde <Pokedex /> y se lo pasa a <EvolutionChain />.
 */

type ViewMode = 'pokedex' | 'album';

// Función para decodificar JWT y obtener datos del usuario
function decodeToken(token: string): { isAdmin?: boolean; userId?: string } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
}

export default function App() {
  const [evoTarget, setEvoTarget] = useState<string | number | undefined>(
    'chansey'
  );
  const [view, setView] = useState<ViewMode>('pokedex');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getToken());
  const [isAdmin, setIsAdmin] = useState(() => {
    const token = getToken();
    if (!token) return false;
    const decoded = decodeToken(token);
    return decoded?.isAdmin || false;
  });

  const toggleView = () =>
    setView((v) => (v === 'pokedex' ? 'album' : 'pokedex'));

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    const token = getToken();
    if (token) {
      const decoded = decodeToken(token);
      setIsAdmin(decoded?.isAdmin || false);
    }
  };

  const handleRegisterSuccess = () => {
    setIsAuthenticated(true);
    const token = getToken();
    if (token) {
      const decoded = decodeToken(token);
      setIsAdmin(decoded?.isAdmin || false);
    }
  };

  const handleLogout = () => {
    removeToken();
    setIsAuthenticated(false);
    setIsAdmin(false);
  };

  return (
    <div className="layout">
      {/* Botones de autenticación */}
      <AuthButtons
        isAuthenticated={isAuthenticated}
        onLoginClick={() => setLoginModalOpen(true)}
        onRegisterClick={() => setRegisterModalOpen(true)}
        onLogoutClick={handleLogout}
      />

      {/* Botón de Admin (solo visible si es admin) */}
      {isAdmin && (
        <AdminButtons
          onAdminPanelClick={() => setAdminPanelOpen(true)}
        />
      )}

      {/* Modales de autenticación */}
      <LoginModal 
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      <RegisterModal 
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onRegisterSuccess={handleRegisterSuccess}
      />

      {/* Panel de Admin */}
      <AdminPanel
        isOpen={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
      />

      {/* Botón fijo arriba/izquierda, fuera del componente pokedex */}
      <button className="view-toggle" onClick={toggleView}>
        {view === 'pokedex' ? 'Álbum' : 'Pokédex'}
      </button>

      {view === 'pokedex' ? (
        <div className="pokedex-container">
          {/* Pokédex grande */}
          <Pokedex onChangeTarget={setEvoTarget} />

          {/* Pokédex pequeña (panel a la derecha) */}
          <aside className="evolution-panel">
            <EvolutionChain target={evoTarget} />
          </aside>
        </div>
      ) : (
        <Album />
      )}
    </div>
  );
}
