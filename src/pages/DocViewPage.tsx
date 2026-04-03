import { useParams, Link } from 'react-router-dom';
import { getDocById, getDocs } from '../hooks/useDocs';
import { getCards } from '../hooks/useCards';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

export function DocViewPage() {
  const { id } = useParams<{ id: string }>();
  const docId = Number(id);
  const doc = getDocById(docId);
  const docs = getDocs();

  if (!doc) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
        문서를 찾을 수 없습니다.
        <br />
        <Link to="/docs" style={{ color: '#569cd6', marginTop: '16px', display: 'inline-block' }}>
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const currentIndex = docs.findIndex(d => d.id === docId);
  const prevDoc = currentIndex > 0 ? docs[currentIndex - 1] : null;
  const nextDoc = currentIndex < docs.length - 1 ? docs[currentIndex + 1] : null;

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
        <Link to="/docs" style={{
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
          {currentIndex + 1} / {docs.length}
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          {prevDoc && (
            <Link to={`/doc/${prevDoc.id}`} style={{
              color: '#888',
              textDecoration: 'none',
              fontSize: '14px',
              padding: '6px 12px',
            }}>
              &larr; 이전
            </Link>
          )}
          {nextDoc && (
            <Link to={`/doc/${nextDoc.id}`} style={{
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

      {/* 문서 헤더 */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 0' }}>
        <h1 style={{
          color: '#e0e0e0',
          fontSize: '32px',
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: '16px',
        }}>
          {doc.title}
        </h1>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '12px',
        }}>
          {doc.author && (
            <span style={{ color: '#9cdcfe', fontSize: '14px' }}>
              {doc.author}
            </span>
          )}
          {doc.date && (
            <span style={{ color: '#666', fontSize: '13px' }}>
              {doc.date}
            </span>
          )}
        </div>

        {doc.source && (
          <a
            href={doc.source}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#569cd6',
              fontSize: '13px',
              textDecoration: 'none',
              display: 'inline-block',
              marginBottom: '8px',
            }}
          >
            원문 보기 &rarr;
          </a>
        )}

        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {doc.tags.map(tag => (
            <span
              key={tag}
              style={{
                background: '#1a3a2a',
                color: '#6bcb77',
                padding: '3px 12px',
                borderRadius: '12px',
                fontSize: '12px',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 관련 플래시 카드 - 본문 위에 배치 */}
        {(() => {
          const relatedCards = getCards().filter(c => c.sourceDoc.includes(docId));
          if (relatedCards.length === 0) return null;
          return (
            <div style={{
              background: '#1a1a2e',
              border: '1px solid #2a2a4a',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '24px',
            }}>
              <div style={{ color: '#9cdcfe', fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>
                Flash Cards ({relatedCards.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {relatedCards.map(card => (
                  <Link
                    key={card.id}
                    to={`/card/${card.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#252540',
                      border: '1px solid #333355',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#555577';
                      e.currentTarget.style.background = '#2a2a50';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#333355';
                      e.currentTarget.style.background = '#252540';
                    }}
                  >
                    <div>
                      <span style={{ color: '#666', fontSize: '12px', marginRight: '8px' }}>#{card.id}</span>
                      <span style={{ color: '#d4d4d4', fontSize: '14px' }}>{card.title}</span>
                    </div>
                    <span style={{
                      background: card.difficulty === 'easy' ? '#1a3a1a' : card.difficulty === 'hard' ? '#3a1a1a' : '#3a3a1a',
                      color: card.difficulty === 'easy' ? '#6bcb77' : card.difficulty === 'hard' ? '#ff6b6b' : '#ffd93d',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 500,
                      flexShrink: 0,
                    }}>
                      {card.difficulty}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        <hr style={{ border: 'none', borderTop: '1px solid #333', marginBottom: '32px' }} />

        {/* 본문 */}
        <div style={{ fontSize: '16px', lineHeight: 1.8 }}>
          <MarkdownRenderer content={doc.content} />
        </div>

      </div>
    </div>
  );
}
