import { Route, Routes } from 'react-router';
import GameScreen from '../game/GameScreen';
import MainMenu from '../screens/MainMenu';
import NotFound from '../screens/NotFound';
import AppShell from './AppShell';

/**
 * All routes in one place (ADR 0003). The router and the data provider come from the
 * caller: main.tsx in the app, `renderApp()` in tests.
 */
function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<MainMenu />} />
        <Route path="play/:modeId" element={<GameScreen />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
