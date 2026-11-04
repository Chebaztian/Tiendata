import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import logo from '../assets/images/logo.svg'
import './layout.css'

/* ── Iconos SVG inline (sin emojis) ── */
const Icon = {
  Home: () => (
    <svg className="icon-svg" viewBox="0 0 24 24">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  Users: () => (
    <svg className="icon-svg" viewBox="0 0 24 24">
      <circle cx="9" cy="7" r="4"/>
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
      <path d="M21 21v-2a4 4 0 00-3-3.85"/>
    </svg>
  ),
  Tag: () => (
    <svg className="icon-svg" viewBox="0 0 24 24">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  Box: () => (
    <svg className="icon-svg" viewBox="0 0 24 24">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  Search: () => (
    <svg className="icon-svg" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Receipt: () => (
    <svg className="icon-svg" viewBox="0 0 24 24">
      <path d="M4 2h16v20l-4-2-4 2-4-2-4 2V2z"/>
      <line x1="8" y1="9" x2="16" y2="9"/>
      <line x1="8" y1="13" x2="14" y2="13"/>
    </svg>
  ),
  History: () => (
    <svg className="icon-svg" viewBox="0 0 24 24">
      <polyline points="12 8 12 12 14 14"/>
      <path d="M3.05 11a9 9 0 1 0 .5-4H1"/>
      <polyline points="1 3 1 7 5 7"/>
    </svg>
  ),
  Alert: () => (
    <svg className="icon-svg" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Chart: () => (
    <svg className="icon-svg" viewBox="0 0 24 24">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6"  y1="20" x2="6"  y2="14"/>
      <line x1="2"  y1="20" x2="22" y2="20"/>
    </svg>
  ),
  Profile: () => (
    <svg className="icon-svg" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  Logout: () => (
    <svg className="icon-svg" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Truck: () => (
  <svg className="icon-svg" viewBox="0 0 24 24">
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
),
  Barcode: () => (
    <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <line x1="3"  y1="5" x2="3"  y2="19"/>
      <line x1="6"  y1="5" x2="6"  y2="19"/>
      <line x1="9"  y1="5" x2="9"  y2="19"/>
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="15" y1="5" x2="15" y2="19"/>
      <line x1="18" y1="5" x2="18" y2="19"/>
      <line x1="21" y1="5" x2="21" y2="19"/>
    </svg>
  ),
  Settings: () => (
    <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93A10 10 0 1 1 4.93 19.07"/>
      <path d="M20 12a8 8 0 0 0-8-8"/>
    </svg>
  ),
}

/* ── Rutas de navegación por rol ── */
const NAV_ADMIN = [
  { to: '/dashboard',  icon: <Icon.Home />,    label: 'Inicio' },
  { to: '/usuarios',   icon: <Icon.Users />,   label: 'Usuarios' },
  { to: '/categorias', icon: <Icon.Tag />,     label: 'Categorías' },
  { to: '/proveedores', icon: <Icon.Truck />, label: 'Proveedores' },
  { to: '/productos',  icon: <Icon.Box />,     label: 'Productos' },      
  { to: '/inventario',     icon: <Icon.Receipt />, label: 'Inventario' },
  { to: '/alertas',    icon: <Icon.Alert />,   label: 'Alertas' },
  { to: '/auditoria',  icon: <Icon.History />, label: 'Auditoría' },
  { to: '/codigos-barras',   icon: <Icon.Barcode />,  label: 'Códigos de barras' },
  { to: '/configuracion',    icon: <Icon.Settings />, label: 'Configuración' },
  { to: '/reportes',   icon: <Icon.Chart />,   label: 'Reportes' },
]
 
const NAV_OPERADOR = [
  { to: '/dashboard', icon: <Icon.Home />,    label: 'Inicio' },
  { to: '/productos', icon: <Icon.Box />,     label: 'Productos' },          
  { to: '/inventario',    icon: <Icon.Receipt />, label: 'Inventario' },
  { to: '/alertas',   icon: <Icon.Alert />,   label: 'Alertas' },
  { to: '/codigos-barras', icon: <Icon.Barcode />, label: 'Códigos de barras' },
  { to: '/reportes',  icon: <Icon.Chart />,   label: 'Reportes' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navItems = user?.rol === 'Administrador' ? NAV_ADMIN : NAV_OPERADOR

  const currentLabel =
    navItems.find(i => location.pathname.startsWith(i.to))?.label ?? 'Inicio'

  return (
    <div className="layout">

      {/* ══ SIDEBAR ══ */}
      <aside className="sidebar">

        <div className="brand">
          <div className="logo">
            <img src={logo} alt="Tiendata" />
          </div>
          <div className="brand-text">
            <h1>TIENDATA</h1>
            <p>Gestión de inventario</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="nav">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `nav-item${isActive ? ' active' : ''}`
              }
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer: usuario + cerrar sesión */}
        
      </aside>

      {/* ══ ÁREA PRINCIPAL ══ */}
      <div className="main">

        {/* Topbar */}
        <header className="topbar">
          <div className="breadcrumb">
            <span className="breadcrumb-home">Inicio</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{currentLabel}</span>
          </div>

          <div className="topbar-right">
            <span className="topbar-name">Hola, {user?.nombre}</span>
            <div className="topbar-divider" />
            <span className="role-chip">{user?.rol}</span>
            <div className="topbar-divider" />
            <button
              className="topbar-logout"
              onClick={logout}
            >
              <Icon.Logout />
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* Contenido dinámico */}
        <main className="content">
          {children}
        </main>

      </div>
    </div>
  )
}
