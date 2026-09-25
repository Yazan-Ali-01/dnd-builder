import { useState } from 'react';
import { Canvas } from './components/Canvas';
import { Notices } from './components/Notices';
import { Palette } from './components/Palette';
import { Preview } from './components/Preview';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Toolbar } from './components/Toolbar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  useKeyboardShortcuts();

  return (
    <div className="app">
      <Toolbar mode={mode} onModeChange={setMode} />
      {mode === 'edit' ? (
        <main className="workspace">
          <Palette />
          <Canvas />
          <PropertiesPanel />
        </main>
      ) : (
        <main className="workspace workspace-preview">
          <Preview />
        </main>
      )}
      <Notices />
    </div>
  );
}
