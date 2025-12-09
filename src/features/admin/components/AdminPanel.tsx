import { useState } from 'react';
import { getToken } from '../../../services/authService';
import AddPokemonForm from './AddPokemonForm';
import ManageUsersPanel from './ManageUsersPanel';
import ManagePokemonEvolutions from './ManagePokemonEvolutions';
import './admin-panel.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AdminPanel({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'pokemon' | 'evolutions' | 'users'>('pokemon');
  const token = getToken();

  // Decodificar el token para obtener userId e isFirstAdmin
  const decodeToken = (tokenStr: string): { userId?: string; isAdmin?: boolean } | null => {
    try {
      const base64Url = tokenStr.split('.')[1];
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
  };

  const currentUser = token ? decodeToken(token) : null;

  if (!isOpen) return null;

  return (
    <div className="admin-panel-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
        {/* Botón X para cerrar */}
        <button 
          type="button"
          className="admin-panel-close" 
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>

        {/* Contenido del panel */}
        <div className="admin-panel-content">
          <h2 className="admin-panel-title">Panel de Administrador</h2>

          {/* Tabs */}
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'pokemon' ? 'active' : ''}`}
              onClick={() => setActiveTab('pokemon')}
            >
              Ingresar Pokémon
            </button>
            <button
              className={`admin-tab ${activeTab === 'evolutions' ? 'active' : ''}`}
              onClick={() => setActiveTab('evolutions')}
            >
              Evoluciones
            </button>
            <button
              className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Administrar Usuarios
            </button>
          </div>

          {/* Contenido de tabs */}
          <div className="admin-tab-content">
            {activeTab === 'pokemon' && (
              <div className="tab-pane">
                <h3>Ingresar Nuevo Pokémon</h3>
                <p className="tab-description">
                  Completa los siguientes campos para agregar un nuevo Pokémon al sistema.
                  El nuevo Pokémon tendrá un ID automático (empezando desde 1025).
                </p>
                <AddPokemonForm 
                  onSuccess={() => {
                    // Mostrar mensaje de éxito o recargar lista
                    console.log('Pokémon creado exitosamente');
                  }}
                />
              </div>
            )}

            {activeTab === 'evolutions' && (
              <div className="tab-pane">
                <ManagePokemonEvolutions />
              </div>
            )}

            {activeTab === 'users' && (
              <div className="tab-pane">
                <h3>Gestión de Usuarios</h3>
                <p className="tab-description">
                  Aquí puedes ver la lista de usuarios y cambiar sus roles.
                </p>
                <ManageUsersPanel
                  currentUserId={currentUser?.userId || ''}
                  isFirstAdmin={true}  // TODO: Obtener del backend si es el primer admin
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
