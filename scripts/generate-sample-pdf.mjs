/**
 * Generate a sample PDF for testing text highlighting and TTS.
 *
 * Usage: node scripts/generate-sample-pdf.mjs [output-path]
 * Default output: public/sample.pdf
 */

import { jsPDF } from 'jspdf';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = process.argv[2] || resolve(__dirname, '..', 'public', 'sample.pdf');

const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 25;
const MARGIN_BOTTOM = 25;
const FONT_SIZE = 12;
const LINE_HEIGHT = 7;

const paragraphs = [
  'The history of artificial intelligence began in antiquity, with myths and stories of artificial beings endowed with intelligence. The seeds of modern AI were planted by philosophers who attempted to describe the process of human thinking as the mechanical manipulation of symbols. This work culminated in the invention of the programmable digital computer in the 1940s, a machine based on the abstract essence of mathematical reasoning.',

  'The field of AI research was founded at a workshop held on the campus of Dartmouth College during the summer of 1956. Those who attended would become the leaders of AI research for decades. Many of them predicted that a machine as intelligent as a human being would exist in no more than a generation, and they were given millions of dollars to make this vision come true.',

  'Eventually, it became obvious that researchers had grossly underestimated the difficulty of the project. In 1974, in response to the criticism from James Lighthill and ongoing pressure from Congress, the governments of the United States and the United Kingdom stopped funding undirected research into artificial intelligence. Seven years later, a visionary initiative by the Japanese Government inspired governments and industry to provide AI with billions of dollars, but by the late 1980s the investors became disillusioned and withdrew funding again.',

  'Investment and interest in AI boomed in the first decades of the 21st century when machine learning was successfully applied to many problems in academia and industry due to the availability of large amounts of data and faster computers. The application of artificial neural networks to natural language processing enabled significant advances in machine translation, text generation, and sentiment analysis.',

  'Deep learning breakthroughs drove advances in image recognition, speech processing, and game playing. By 2020, natural language processing models could generate coherent paragraphs of text, answer questions about documents, summarize long articles, and translate between dozens of languages with remarkable accuracy.',

  'Modern AI systems use techniques from statistics, computational intelligence, and traditional symbolic AI. Many AI applications have been integrated into the infrastructure of existing industries, including search engines, medical diagnosis systems, autonomous vehicles, digital assistants, and financial trading platforms.',

  'The ethical implications of artificial intelligence continue to be debated. Concerns include the potential for job displacement, algorithmic bias, privacy violations, and the concentration of power. Researchers and policymakers are working to develop frameworks for responsible AI development that balance innovation with safeguards for human welfare.',

  'Natural language processing has emerged as one of the most impactful subfields of artificial intelligence. Early approaches relied on hand-crafted rules and pattern matching. Statistical methods introduced in the 1990s improved accuracy significantly by learning patterns from large text corpora. The transformer architecture, introduced in 2017, revolutionized the field by enabling models to process entire sequences in parallel.',

  'Computer vision is another major area of AI research. The ability of machines to interpret and understand visual information from the world has applications ranging from medical imaging to autonomous navigation. Convolutional neural networks, first applied successfully to image classification in the early 2010s, remain a cornerstone of modern computer vision systems.',

  'Reinforcement learning enables AI agents to learn optimal behavior through trial and error. An agent interacts with an environment, receiving rewards or penalties for its actions, and gradually develops strategies to maximize cumulative reward. This approach has achieved remarkable results in game playing, robotics, and resource optimization.',

  'The future of artificial intelligence holds both tremendous promise and significant uncertainty. As AI systems become more capable, their potential to transform healthcare, education, scientific research, and creative endeavors grows. At the same time, ensuring that these powerful tools are developed and deployed responsibly remains one of the great challenges of our time.',

  'Transfer learning has become a fundamental technique in modern machine learning. Rather than training models from scratch for each new task, practitioners can fine-tune models that have been pre-trained on large datasets. This approach dramatically reduces the amount of task-specific data and computation required, making advanced AI capabilities accessible to a wider range of applications and organizations.',
];

const doc = new jsPDF({ unit: 'mm', format: 'a4' });
const pageWidth = doc.internal.pageSize.getWidth();
const maxWidth = pageWidth - MARGIN_LEFT - MARGIN_RIGHT;

doc.setFont('helvetica', 'normal');
doc.setFontSize(FONT_SIZE);

let y = MARGIN_TOP;
const pageHeight = doc.internal.pageSize.getHeight();

for (const paragraph of paragraphs) {
  const lines = doc.splitTextToSize(paragraph, maxWidth);
  const blockHeight = lines.length * LINE_HEIGHT;

  // Check if paragraph fits on current page
  if (y + blockHeight > pageHeight - MARGIN_BOTTOM) {
    doc.addPage();
    y = MARGIN_TOP;
  }

  doc.text(lines, MARGIN_LEFT, y, { lineHeightFactor: 1.5 });
  y += blockHeight + LINE_HEIGHT; // extra spacing between paragraphs
}

const pdfOutput = doc.output('arraybuffer');
writeFileSync(outputPath, Buffer.from(pdfOutput));

const fileSizeKB = (pdfOutput.byteLength / 1024).toFixed(1);
const numPages = doc.internal.getNumberOfPages();
console.log(`Generated ${outputPath}`);
console.log(`  Pages: ${numPages}`);
console.log(`  Size: ${fileSizeKB} KB`);
