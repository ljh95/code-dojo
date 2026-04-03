import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface Props {
  content: string;
}

const components: Components = {
  pre({ children }) {
    return <>{children}</>;
  },
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    if (match) {
      return (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{
            margin: '16px 0',
            borderRadius: '6px',
            fontSize: '14px',
            lineHeight: '1.5',
            padding: '20px',
            overflow: 'auto',
            maxHeight: 'none',
          }}
          codeTagProps={{
            style: {
              fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace",
            },
          }}
        >
          {codeString}
        </SyntaxHighlighter>
      );
    }

    return (
      <code
        className={className}
        style={{
          background: '#1e1e1e',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '13px',
          fontFamily: "'Fira Code', 'Consolas', monospace",
          color: '#d4d4d4',
        }}
        {...props}
      >
        {children}
      </code>
    );
  },
  h2({ children }) {
    return <h2 style={{ color: '#e6e6e6', borderBottom: '1px solid #333', paddingBottom: '8px', marginTop: '32px' }}>{children}</h2>;
  },
  h3({ children }) {
    return <h3 style={{ color: '#cccccc', marginTop: '24px' }}>{children}</h3>;
  },
  p({ children }) {
    return <p style={{ color: '#b0b0b0', lineHeight: '1.8', margin: '12px 0' }}>{children}</p>;
  },
  strong({ children }) {
    return <strong style={{ color: '#e0e0e0' }}>{children}</strong>;
  },
  ol({ children }) {
    return <ol style={{ color: '#b0b0b0', lineHeight: '1.8', paddingLeft: '24px' }}>{children}</ol>;
  },
  ul({ children }) {
    return <ul style={{ color: '#b0b0b0', lineHeight: '1.8', paddingLeft: '24px' }}>{children}</ul>;
  },
  blockquote({ children }) {
    return (
      <blockquote style={{
        borderLeft: '3px solid #569cd6',
        paddingLeft: '16px',
        margin: '16px 0',
        color: '#9cdcfe',
        fontStyle: 'italic',
      }}>
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '32px 0' }} />;
  },
};

export function MarkdownRenderer({ content }: Props) {
  if (!content) return null;

  try {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    );
  } catch (e) {
    console.error('MarkdownRenderer error:', e);
    return <pre style={{ color: '#ff6b6b' }}>{String(e)}</pre>;
  }
}
