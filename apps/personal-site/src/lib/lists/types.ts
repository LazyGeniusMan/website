export interface ListOption {
  id: string;
  label: string;
  group?: string;
}

export interface ListGroup {
  key: string;
  label: string;
  options: ListOption[];
}

export interface ListItem {
  id: string;
  title: string;
  detail: string;
  meta: string;
  href: string;
  facets: Record<string, string[]>;
  badges?: string[];
  badgeHrefs?: (string | null)[];
  hashBadges?: boolean;
  thumbSrc?: string;
  thumbAlt?: string;
  date?: string;
  dateEnd?: string | null;
}
