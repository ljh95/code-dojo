import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { CardData } from '../hooks/useCards';
import { getDocs } from '../hooks/useDocs';

interface Props {
  card: CardData;
}

export function FlashCard({ card }: Props) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      {/* 카드 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <h1 style={{
          fontSize: '20px',
          color: '#e0e0e0',
          margin: 0,
          fontWeight: 600,
        }}>
          #{card.id} {card.title}
        </h1>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {card.tags.map(tag => (
            <span
              key={tag}
              style={{
                background: '#264f78',
                color: '#9cdcfe',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '12px',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 관련 문서 링크 */}
      {card.sourceDoc.length > 0 && (() => {
        const allDocs = getDocs();
        const linked = card.sourceDoc.map(id => allDocs.find(d => d.id === id)).filter(Boolean);
        if (linked.length === 0) return null;
        return (
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <span style={{ color: '#666', fontSize: '13px' }}>Reading:</span>
            {linked.map(doc => (
              <Link
                key={doc!.id}
                to={`/doc/${doc!.id}`}
                style={{
                  color: '#9cdcfe',
                  fontSize: '13px',
                  textDecoration: 'none',
                  background: '#1a1a2e',
                  border: '1px solid #2a2a4a',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#252540';
                  e.currentTarget.style.borderColor = '#3a3a6a';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#1a1a2e';
                  e.currentTarget.style.borderColor = '#2a2a4a';
                }}
              >
                {doc!.title}
              </Link>
            ))}
          </div>
        );
      })()}

      {/* 질문 카드 */}
      <div style={{
        background: '#1e1e1e',
        borderRadius: '8px',
        padding: '24px',
        border: '1px solid #333',
        marginBottom: '20px',
      }}>
        <div style={{
          display: 'inline-block',
          background: '#c53030',
          color: '#fff',
          padding: '2px 12px',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '16px',
          letterSpacing: '0.5px',
        }}>
          QUESTION
        </div>
        <MarkdownRenderer content={card.question} />
      </div>

      {/* 정답 토글 버튼 */}
      {!showAnswer ? (
        <button
          onClick={() => setShowAnswer(true)}
          style={{
            width: '100%',
            padding: '16px',
            background: '#2d5a27',
            color: '#a8d8a0',
            border: '1px solid #3d7a37',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '0.5px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#3d7a37';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#2d5a27';
          }}
        >
          정답 보기
        </button>
      ) : (
        <>
          {/* 정답 카드 */}
          <div style={{
            background: '#1e1e1e',
            borderRadius: '8px',
            padding: '24px',
            border: '1px solid #2d5a27',
            marginBottom: '20px',
          }}>
            <div style={{
              display: 'inline-block',
              background: '#2d5a27',
              color: '#a8d8a0',
              padding: '2px 12px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
              letterSpacing: '0.5px',
            }}>
              ANSWER
            </div>
            <MarkdownRenderer content={card.answer} />
          </div>

          <button
            onClick={() => setShowAnswer(false)}
            style={{
              width: '100%',
              padding: '12px',
              background: '#333',
              color: '#999',
              border: '1px solid #444',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#444';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#333';
            }}
          >
            정답 숨기기
          </button>
        </>
      )}
    </div>
  );
}
