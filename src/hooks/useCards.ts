export interface CardData {
  id: number;
  title: string;
  tags: string[];
  difficulty: string;
  question: string;
  answer: string;
}

const ANSWER_SEPARATOR = '---answer---';

const cardModules = import.meta.glob('../data/cards/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// gray-matter 대신 브라우저 호환 frontmatter 파서
function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const yamlBlock = match[1];
  const content = match[2];
  const data: Record<string, unknown> = {};

  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value: unknown = line.slice(colonIdx + 1).trim();

    // 간단한 YAML 파싱: 숫자, 문자열, 배열
    const str = value as string;
    if (str.startsWith('[') && str.endsWith(']')) {
      value = str.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    } else if (str.startsWith('"') && str.endsWith('"')) {
      value = str.slice(1, -1);
    } else if (!isNaN(Number(str)) && str !== '') {
      value = Number(str);
    }

    data[key] = value;
  }

  return { data, content };
}

function parseCard(raw: string): CardData {
  const { data: fm, content } = parseFrontmatter(raw);
  const [question, answer] = content.split(ANSWER_SEPARATOR);

  return {
    id: fm.id as number,
    title: fm.title as string,
    tags: (fm.tags as string[]) ?? [],
    difficulty: (fm.difficulty as string) ?? 'medium',
    question: question.trim(),
    answer: (answer ?? '').trim(),
  };
}

export function getCards(): CardData[] {
  return Object.values(cardModules)
    .map(parseCard)
    .sort((a, b) => a.id - b.id);
}

export function getCardById(id: number): CardData | undefined {
  return getCards().find(card => card.id === id);
}
