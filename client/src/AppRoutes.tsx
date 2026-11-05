import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ROUTES } from './constants';
import { LoginPage } from './pages/LoginPage';
import { PlaybooksPage } from './pages/PlaybooksPage';
import { SimulatePage } from './pages/SimulatePage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path={ROUTES.playbooks} element={<PlaybooksPage />} />
        <Route path={ROUTES.simulate} element={<SimulatePage />} />
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.playbooks} replace />} />
    </Routes>
  );
}
