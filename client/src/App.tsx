import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import AuthModal from './components/auth/AuthModal';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import SearchPage from './pages/SearchPage';

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <AuthModal />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/u/:username" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route
          path="*"
          element={
            <div className="page-container">
              <div className="card card-body">Page not found (404)</div>
            </div>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
