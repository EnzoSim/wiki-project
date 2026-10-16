export type RichSegment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
  href?: string;
};

export type ContentNode = {
  id: string;
  type: string;
  rich: RichSegment[];
  source?: string;
  caption?: string;
  children: ContentNode[];
};

export type Artwork = { full: string; thumbnail?: string };
