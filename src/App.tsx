import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/AppProvider';
import { ToastProvider } from './components/ui';
import { AppShell } from './components/AppShell';
import { PwaUpdateToast } from './pwa/PwaUpdateToast';
import { HomePage } from './pages/HomePage';
import { ProgressPage } from './pages/ProgressPage';
import { WorkoutPage } from './pages/WorkoutPage';
import { HistoryPage } from './pages/HistoryPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { LibraryPage } from './pages/LibraryPage';
/** Recharts is heavy — load the one chart-bearing screen on demand. */
const ExerciseDetailPage = lazy(() =>
  import('./pages/ExerciseDetailPage').then((m) => ({ default: m.ExerciseDetailPage }))
);
import { TemplatesPage } from './pages/TemplatesPage';
import { TemplateEditorPage } from './pages/TemplateEditorPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <HashRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/workout" element={<WorkoutPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/history/:id" element={<SessionDetailPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route
                path="/library/:id"
                element={
                  <Suspense fallback={null}>
                    <ExerciseDetailPage />
                  </Suspense>
                }
              />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/templates/:id" element={<TemplateEditorPage />} />
              <Route path="/templates/new" element={<TemplateEditorPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </AppShell>
        </HashRouter>
        <PwaUpdateToast />
      </ToastProvider>
    </AppProvider>
  );
}
