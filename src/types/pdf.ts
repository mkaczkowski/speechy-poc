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

/**
 * Pre-computed bounding rect for one text content item in CSS-pixel
 * coordinates (relative to the page viewport origin, not the DOM container).
 * Built once from `page.getTextContent()` items + the viewport transform.
 */
export interface ItemRect extends HighlightRect {
  /** Number of characters in the text item's string. */
  charCount: number;
  /** Original text left in CSS px (before horizontal padding). */
  textLeft: number;
  /** Original text width in CSS px (before horizontal padding). */
  textWidth: number;
  /**
   * Cumulative character offset fractions (0→1) within the item.
   * `charOffsets[i]` is the fractional x-position where character `i` starts.
   * Length is `charCount + 1` (last entry is 1.0).
   * Enables accurate sub-item slicing for variable-width fonts.
   */
  charOffsets: Float32Array;
}

export interface PdfViewerProps {
  url: string;
}
