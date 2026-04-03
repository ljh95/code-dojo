export interface DocData {
  id: number;
  title: string;
  author: string;
  source: string;
  tags: string[];
  date: string;
  content: string;
}

const docModules = import.meta.glob('../data/docs/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

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

function parseDoc(raw: string): DocData {
  const { data: fm, content } = parseFrontmatter(raw);

  return {
    id: fm.id as number,
    title: fm.title as string,
    author: (fm.author as string) ?? '',
    source: (fm.source as string) ?? '',
    tags: (fm.tags as string[]) ?? [],
    date: (fm.date as string) ?? '',
    content: content.trim(),
  };
}

export function getDocs(): DocData[] {
  return Object.values(docModules)
    .map(parseDoc)
    .sort((a, b) => a.id - b.id);
}

export function getDocById(id: number): DocData | undefined {
  return getDocs().find(doc => doc.id === id);
}
