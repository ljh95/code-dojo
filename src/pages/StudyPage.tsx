import { useParams, Link } from 'react-router-dom';
import { getCardById, getCards } from '../hooks/useCards';
import { FlashCard } from '../components/FlashCard';

export function StudyPage() {
  const { id } = useParams<{ id: string }>();
  const cardId = Number(id);
  const card = getCardById(cardId);
  const cards = getCards();

  if (!card) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
        카드를 찾을 수 없습니다.
        <br />
        <Link to="/" style={{ color: '#569cd6', marginTop: '16px', display: 'inline-block' }}>
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const currentIndex = cards.findIndex(c => c.id === cardId);
  const prevCard = currentIndex > 0 ? cards[currentIndex - 1] : null;
  const nextCard = currentIndex < cards.length - 1 ? cards[currentIndex + 1] : null;

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* 상단 네비게이션 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: '1px solid #2a2a2a',
        position: 'sticky',
        top: 0,
        background: '#181818',
        zIndex: 10,
      }}>
        <Link to="/" style={{
          color: '#888',
          textDecoration: 'none',
          fontSize: '14px',
          padding: '6px 12px',
          borderRadius: '4px',
          transition: 'color 0.15s',
        }}>
          &larr; 목록
        </Link>

        <span style={{ color: '#666', fontSize: '13px' }}>
          {currentIndex + 1} / {cards.length}
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          {prevCard && (
            <Link to={`/card/${prevCard.id}`} style={{
              color: '#888',
              textDecoration: 'none',
              fontSize: '14px',
              padding: '6px 12px',
            }}>
              &larr; 이전
            </Link>
          )}
          {nextCard && (
            <Link to={`/card/${nextCard.id}`} style={{
              color: '#888',
              textDecoration: 'none',
              fontSize: '14px',
              padding: '6px 12px',
            }}>
              다음 &rarr;
            </Link>
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <FlashCard card={card} />
      </div>
    </div>
  );
}
