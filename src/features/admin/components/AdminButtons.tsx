import './admin-buttons.css';

type Props = {
  onAdminPanelClick: () => void;
};

export default function AdminButtons({ onAdminPanelClick }: Props) {
  return (
    <button 
      className="admin-btn"
      onClick={onAdminPanelClick}
      aria-label="Panel de administrador"
      title="Acceder al panel de administrador"
    >
      ⚙️ Admin
    </button>
  );
}
