import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DeckPage } from './pages/DeckPage';
import { StudyPage } from './pages/StudyPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DeckPage />} />
        <Route path="/card/:id" element={<StudyPage />} />
      </Routes>
    </BrowserRouter>
  );
}
