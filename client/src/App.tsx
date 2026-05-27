import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAppData } from '@/hooks/useAppData';
import { Settings } from '@/types';
import Layout from '@/components/Layout';
import FrontPage from '@/pages/FrontPage';
import SettingsPage from '@/pages/SettingsPage';
import DonatePage from '@/pages/DonatePage';

function AppRoutes() {
  const { settings, updateSettings } = useAppData();

  const handleSaveSettings = async (data: Partial<Settings>) => {
    await updateSettings(data);
  };

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<FrontPage />} />
        <Route path="/settings" element={<SettingsPage settings={settings} onSave={handleSaveSettings} />} />
        <Route path="/donate" element={<DonatePage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
