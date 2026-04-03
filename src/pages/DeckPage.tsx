import { Link } from 'react-router-dom';
import { getCards } from '../hooks/useCards';

const difficultyColors: Record<string, { bg: string; text: string }> = {
  easy: { bg: '#1a3a1a', text: '#6bcb77' },
  medium: { bg: '#3a3a1a', text: '#ffd93d' },
  hard: { bg: '#3a1a1a', text: '#ff6b6b' },
};

export function DeckPage() {
  const cards = getCards();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h1 style={{ color: '#e0e0e0', fontSize: '28px', margin: 0 }}>
          Code Flash Cards
        </h1>
        <Link to="/docs" style={{
          color: '#888',
          textDecoration: 'none',
          fontSize: '14px',
          padding: '6px 14px',
          borderRadius: '6px',
          border: '1px solid #333',
          transition: 'all 0.15s',
        }}>
          Reading Docs
        </Link>
      </div>
      <p style={{ color: '#888', marginBottom: '32px', fontSize: '15px' }}>
        코드 패턴을 보고 문제점을 파악하고, 개선된 설계를 떠올려보세요.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {cards.map(card => {
          const dc = difficultyColors[card.difficulty] ?? difficultyColors.medium;
          return (
            <Link
              key={card.id}
              to={`/card/${card.id}`}
              style={{
                display: 'block',
                background: '#1e1e1e',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '20px 24px',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#555';
                e.currentTarget.style.background = '#252525';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#333';
                e.currentTarget.style.background = '#1e1e1e';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ color: '#666', fontSize: '14px', marginRight: '8px' }}>
                    #{card.id}
                  </span>
                  <span style={{ color: '#d4d4d4', fontSize: '16px', fontWeight: 500 }}>
                    {card.title}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{
                    background: dc.bg,
                    color: dc.text,
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}>
                    {card.difficulty}
                  </span>
                  {card.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      style={{
                        background: '#264f78',
                        color: '#9cdcfe',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
