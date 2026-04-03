import { Link } from 'react-router-dom';
import { getDocs } from '../hooks/useDocs';

export function DocsPage() {
  const docs = getDocs();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h1 style={{ color: '#e0e0e0', fontSize: '28px', margin: 0 }}>
          Reading Docs
        </h1>
        <Link to="/" style={{
          color: '#888',
          textDecoration: 'none',
          fontSize: '14px',
          padding: '6px 14px',
          borderRadius: '6px',
          border: '1px solid #333',
          transition: 'all 0.15s',
        }}>
          Flash Cards
        </Link>
      </div>
      <p style={{ color: '#888', marginBottom: '32px', fontSize: '15px' }}>
        일관된 형식으로 정리된 아티클과 문서를 읽어보세요.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {docs.map(doc => (
          <Link
            key={doc.id}
            to={`/doc/${doc.id}`}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>#{doc.id}</span>
                <span style={{ color: '#d4d4d4', fontSize: '16px', fontWeight: 500 }}>
                  {doc.title}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {doc.author && (
                  <span style={{ color: '#888', fontSize: '13px' }}>
                    {doc.author}
                  </span>
                )}
                {doc.date && (
                  <span style={{ color: '#666', fontSize: '12px' }}>
                    {doc.date}
                  </span>
                )}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {doc.tags.slice(0, 4).map(tag => (
                    <span
                      key={tag}
                      style={{
                        background: '#1a3a2a',
                        color: '#6bcb77',
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
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
