import { useState, useEffect } from 'react';
import { getAllUsers, promoteUserToAdmin, demoteAdminToUser } from '../../../services/userService';
import './manage-users.css';

type User = {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  isFirstAdmin?: boolean; // Solo el primer admin puede quitar rol a otros
};

type Props = {
  users?: User[];
  currentUserId: string;
  isFirstAdmin: boolean;
  onPromoteUser?: (userId: string) => void;
  onDemoteUser?: (userId: string) => void;
  isLoading?: boolean;
};

export default function ManageUsersPanel({
  users: usersProp,
  currentUserId,
  isFirstAdmin,
  onPromoteUser,
  onDemoteUser,
  isLoading: isLoadingProp = false,
}: Props) {
  const [users, setUsers] = useState<User[]>(usersProp || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar usuarios al montar o cuando se pasa usersProp
  useEffect(() => {
    if (usersProp && usersProp.length > 0) {
      setUsers(usersProp);
    } else if (isFirstAdmin) {
      loadUsers();
    }
  }, [usersProp, isFirstAdmin]);

  const loadUsers = async () => {
    try {
      setError(null);
      const allUsers = await getAllUsers();
      setUsers(allUsers as User[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    }
  };

  const handlePromote = async (userId: string) => {
    try {
      setError(null);
      setIsLoading(true);
      await promoteUserToAdmin(userId);
      
      // Actualizar lista local
      setUsers(prev =>
        prev.map(u =>
          u.id === userId ? { ...u, isAdmin: true } : u
        )
      );

      if (onPromoteUser) {
        onPromoteUser(userId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al promover usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemote = async (userId: string) => {
    try {
      setError(null);
      setIsLoading(true);
      await demoteAdminToUser(userId);
      
      // Actualizar lista local
      setUsers(prev =>
        prev.map(u =>
          u.id === userId ? { ...u, isAdmin: false } : u
        )
      );

      if (onDemoteUser) {
        onDemoteUser(userId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al degradar usuario');
    } finally {
      setIsLoading(false);
    }
  };
  const adminUsers = users.filter(u => u.isAdmin);
  const regularUsers = users.filter(u => !u.isAdmin);

  return (
    <div className="manage-users-container">
      {error && <div className="error-box">{error}</div>}

      {/* Administradores */}
      <div className="users-section">
        <h3 className="section-title">Administradores ({adminUsers.length})</h3>
        <div className="users-list">
          {adminUsers.length === 0 ? (
            <p className="empty-message">No hay administradores</p>
          ) : (
            adminUsers.map(user => (
              <div key={user.id} className="user-card admin-card">
                <div className="user-info">
                  <h4 className="username">{user.username}</h4>
                  <p className="email">{user.email}</p>
                  <p className="created-at">
                    Creado: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                  {user.isFirstAdmin && (
                    <span className="badge badge-first-admin">Primer Admin</span>
                  )}
                </div>
                <div className="user-actions">
                  {isFirstAdmin && user.id !== currentUserId && (
                    <button
                      className="user-action-btn demote-btn"
                      onClick={() => handleDemote(user.id)}
                      disabled={isLoading || isLoadingProp || user.isFirstAdmin}
                      title={user.isFirstAdmin ? 'No puedes quitar el rol al primer administrador' : 'Quitar rol de administrador'}
                    >
                      Quitar Admin
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Usuarios Regulares */}
      <div className="users-section">
        <h3 className="section-title">Usuarios Regulares ({regularUsers.length})</h3>
        <div className="users-list">
          {regularUsers.length === 0 ? (
            <p className="empty-message">No hay usuarios regulares</p>
          ) : (
            regularUsers.map(user => (
              <div key={user.id} className="user-card regular-card">
                <div className="user-info">
                  <h4 className="username">{user.username}</h4>
                  <p className="email">{user.email}</p>
                  <p className="created-at">
                    Creado: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="user-actions">
                  {isFirstAdmin && (
                    <button
                      className="user-action-btn promote-btn"
                      onClick={() => handlePromote(user.id)}
                      disabled={isLoading || isLoadingProp}
                    >
                      Hacer Admin
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info si no eres el primer admin */}
      {!isFirstAdmin && (
        <div className="info-box">
          <p>Solo el primer administrador puede cambiar los roles de usuario.</p>
        </div>
      )}
    </div>
  );
}
