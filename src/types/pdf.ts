export interface CharMapEntry {
  node: Text;
  offsetInNode: number;
}

export interface CharMap {
  flatText: string;
  entries: CharMapEntry[];
  nodeOffsetIndex?: WeakMap<Text, Map<number, number>>;
}

export interface TextSegment {
  text: string;
  startChar: number;
  endChar: number;
}

export type SentenceSegment = TextSegment;

export type WordSegment = TextSegment;

export interface SegmentedText {
  sentences: SentenceSegment[];
  words: WordSegment[];
}

export interface HighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PdfViewerProps {
  url: string;
}
