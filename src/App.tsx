import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DeckPage } from './pages/DeckPage';
import { StudyPage } from './pages/StudyPage';
import { DocsPage } from './pages/DocsPage';
import { DocViewPage } from './pages/DocViewPage';

export default function App() {
  return (
    <BrowserRouter basename="/code-dojo">
      <Routes>
        <Route path="/" element={<DeckPage />} />
        <Route path="/card/:id" element={<StudyPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/doc/:id" element={<DocViewPage />} />
      </Routes>
    </BrowserRouter>
  );
}
