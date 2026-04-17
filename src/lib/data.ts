import fs from 'fs/promises';

export interface DailyBrief {
  date: string;
  generated: string;
  eventsAnalysed: string[];
  entitiesReferenced: string[];
  marketsReferenced: string[];
  confidenceFlag: string;
  title: string;
  topDevelopments: string;
  narrativeMap: string;
  divergenceAlerts: string;
  marketSignals: string;
  scenarioSpotlight: string;
  methodology: string;
  rawContent: string;
}

export interface MarketMover {
  market_id: string;
  question: string;
  event_title: string;
  yes_probability: number;
  volume: number;
  end_date: string;
  active: boolean;
}

export interface MarketMovers {
  generatedAt: string;
  date: string;
  topGeoMarkets: MarketMover[];
  shifts: {
    total: number;
    geoRelevant: MarketShift[];
  };
}

export interface MarketShift {
  market_id: string;
  question: string;
  event_title: string;
  old_price: number;
  new_price: number;
  delta: number;
  volume: number;
  from_snapshot: string;
  to_snapshot: string;
  geo_relevant: boolean;
}

export async function loadDailyBrief(date: string): Promise<DailyBrief | null> {
  const filePath = `/home/paperclip/signal-intelligence/daily-brief/${date}.md`;
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return parseBriefFile(content, date);
  } catch {
    return null;
  }
}

function parseBriefFile(content: string, date: string): DailyBrief {
  // Split frontmatter from body
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  let title = `Intelligence Briefing — ${date}`;
  let generated = date;
  let eventsAnalysed: string[] = [];
  let entitiesReferenced: string[] = [];
  let marketsReferenced: string[] = [];
  let confidenceFlag = '';
  let body = content;

  if (frontmatterMatch) {
    const [, frontmatter, rest] = frontmatterMatch;
    body = rest;

    // Parse YAML frontmatter
    const lines = frontmatter.split('\n');
    for (const line of lines) {
      const dateMatch = line.match(/^date:\s*(.+)$/);
      const generatedMatch = line.match(/^generated:\s*(.+)$/);
      const confidenceMatch = line.match(/^confidence_flag:\s*(.+)$/);
      if (dateMatch) title = `Intelligence Briefing — ${dateMatch[1].trim()}`;
      if (generatedMatch) generated = generatedMatch[1].trim();
      if (confidenceMatch) confidenceFlag = confidenceMatch[1].trim();
    }

    // Parse array fields
    const eventsMatch = frontmatter.match(/events_analysed:\s*\n((?:\s+-\s+.+\n?)*)/);
    if (eventsMatch) {
      eventsAnalysed = eventsMatch[1].split('\n').map(s => s.replace(/^\s+-\s+/, '').trim()).filter(Boolean);
    }

    const entitiesMatch = frontmatter.match(/entities_referenced:\s*\n((?:\s+-\s+.+\n?)*)/);
    if (entitiesMatch) {
      entitiesReferenced = entitiesMatch[1].split('\n').map(s => s.replace(/^\s+-\s+/, '').trim()).filter(Boolean);
    }

    const marketsMatch = frontmatter.match(/markets_referenced:\s*\n((?:\s+-\s+.+\n?)*)/);
    if (marketsMatch) {
      marketsReferenced = marketsMatch[1].split('\n').map(s => s.replace(/^\s+-\s+/, '').trim()).filter(Boolean);
    }
  }

  // Extract sections from body
  const sections = extractSections(body);

  return {
    date,
    generated,
    eventsAnalysed,
    entitiesReferenced,
    marketsReferenced,
    confidenceFlag,
    title,
    topDevelopments: findSection(sections, 'Top Developments'),
    narrativeMap: findSection(sections, 'Narrative Map'),
    divergenceAlerts: findSection(sections, 'Divergence Alerts'),
    marketSignals: findSection(sections, 'Market Shifts'),
    scenarioSpotlight: findSection(sections, 'Scenario Spotlight'),
    methodology: findSection(sections, 'Methodology'),
    rawContent: body,
  };
}

function findSection(sections: Record<string, string>, ...prefixes: string[]): string {
  for (const prefix of prefixes) {
    if (sections[prefix]) return sections[prefix];
    const key = Object.keys(sections).find(k => k.startsWith(prefix));
    if (key) return sections[key];
  }
  return '';
}

function extractSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {};

  // Match ## Section headers
  const headerRegex = /^##\s+(.+?)[\r\n]+([\s\S]*?)(?=^##\s+|\$)/gm;
  let match;
  while ((match = headerRegex.exec(body)) !== null) {
    const sectionName = match[1].trim().replace(/\r$/, '');
    const sectionContent = match[2].trim();
    if (!sections[sectionName]) {
      sections[sectionName] = sectionContent;
    }
  }

  return sections;
}

export async function loadMarketMovers(): Promise<MarketMovers | null> {
  try {
    const content = await fs.readFile('/home/paperclip/signal-intelligence/raw/market-movers.json', 'utf-8');
    const data = JSON.parse(content);

    return {
      generatedAt: data.generated_at || data.date || '',
      date: data.date || '',
      topGeoMarkets: data.top_geo_markets || [],
      shifts: {
        total: data.shifts?.total || 0,
        geoRelevant: data.shifts?.geo_relevant || [],
      },
    };
  } catch {
    return null;
  }
}
