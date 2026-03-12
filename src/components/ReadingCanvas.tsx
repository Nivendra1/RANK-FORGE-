import React, { useState, useRef, useEffect } from 'react';
import { Upload, Type, FileText, Loader2, X, Check, Brain, Search } from 'lucide-react';
import { getWordDefinition, gradeFeynmanExplanation } from '../services/ai';
import { WordEntry } from '../types';
import Tesseract from 'tesseract.js';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker using unpkg CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const pdfOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

interface ReadingCanvasProps {
  onSaveWord: (word: WordEntry) => void;
  addXp: (amount: number) => void;
}

export default function ReadingCanvas({ onSaveWord, addXp }: ReadingCanvasProps) {
  const [text, setText] = useState<string>('');
  const [pdfFile, setPdfFile] = useState<File | string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [lensResult, setLensResult] = useState<string | null>(null);
  const [lensLoading, setLensLoading] = useState(false);
  const [lensMode, setLensMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [contextSentence, setContextSentence] = useState<string>('');
  const [wordDetails, setWordDetails] = useState<any>(null);
  const [isFeynmanMode, setIsFeynmanMode] = useState(false);
  const [feynmanInput, setFeynmanInput] = useState('');
  const [feynmanResult, setFeynmanResult] = useState<any>(null);
  const [sourceName, setSourceName] = useState('Pasted Text');

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [pdfWidth, setPdfWidth] = useState<number>(800);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setPdfWidth(entries[0].contentRect.width);
      }
    });
    if (pdfContainerRef.current) {
      observer.observe(pdfContainerRef.current);
    }
    return () => observer.disconnect();
  }, [pdfFile]);

  useEffect(() => {
    if (!text) {
      setPages([]);
      setCurrentPage(0);
      return;
    }
    
    // Split text into pages of roughly 1200 characters, respecting paragraph boundaries
    const paragraphs = text.split(/(\n\n|\n)/).filter(Boolean);
    const newPages: string[] = [];
    let currentPageText = '';

    for (const para of paragraphs) {
      if (para === '\n\n' || para === '\n') {
        currentPageText += para;
        continue;
      }
      if (currentPageText.length + para.length > 1200 && currentPageText.trim().length > 0) {
        newPages.push(currentPageText);
        currentPageText = para;
      } else {
        currentPageText += para;
      }
    }
    if (currentPageText.trim().length > 0) {
      newPages.push(currentPageText);
    }
    setPages(newPages.length > 0 ? newPages : ['']);
    setCurrentPage(0);
  }, [text]);

  const [confusedResult, setConfusedResult] = useState<{label: string, text: string} | null>(null);
  const [confusedLoading, setConfusedLoading] = useState(false);

  const EXPLAIN_LEVELS = [
    { label: "Simpler", icon: "🧒", prompt: (w: string) => `Explain "${w}" to a curious 10-year-old in 2 sentences. Zero jargon.` },
    { label: "Example", icon: "🔍", prompt: (w: string) => `Give ONE vivid real-life example of "${w}" a teenager instantly gets. 2-3 sentences.` },
    { label: "Story",   icon: "📖", prompt: (w: string) => `Write a tiny 3-sentence story where "${w}" is the hero. Fun and memorable.` },
  ];

  const handleConfused = async (level: any) => {
    setConfusedLoading(true);
    try {
      const { explainWord } = await import('../services/ai');
      const text = await explainWord(selectedWord!, level.prompt(selectedWord!));
      setConfusedResult({ label: level.label, text });
    } catch (e) {
      setConfusedResult({ label: level.label, text: "Failed to load explanation. Try again." });
    } finally {
      setConfusedLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setSourceName(file.name);
    setText('');
    setPdfFile(null);
    setPageNumber(1);

    try {
      if (file.type === 'application/pdf') {
        if (typeof pdfFile === 'string') {
          URL.revokeObjectURL(pdfFile);
        }
        setPdfFile(URL.createObjectURL(file));
      } else if (file.type.startsWith('image/')) {
        const result = await Tesseract.recognize(file, 'eng');
        setText(result.data.text);
      } else if (file.type === 'text/plain') {
        const text = await file.text();
        setText(text);
      } else {
        alert('Unsupported file type. Please upload PDF, Image, or TXT.');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again. If it is a scanned PDF, try taking a screenshot and uploading it as an image.');
    } finally {
      setLoading(false);
    }
  };

  const handleWordClick = async (word: string, sentence: string) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    if (!cleanWord || cleanWord.length < 3) return;

    setSelectedWord(cleanWord);
    setContextSentence(sentence);
    setWordDetails(null);
    setIsFeynmanMode(false);
    setFeynmanInput('');
    setFeynmanResult(null);
    setConfusedResult(null);

    try {
      const details = await getWordDefinition(cleanWord, sentence);
      setWordDetails(details);
    } catch (error) {
      console.error('Error fetching definition:', error);
      alert('Failed to get definition. Please try again.');
      setSelectedWord(null);
    }
  };

  const submitFeynman = async () => {
    if (!feynmanInput.trim() || !wordDetails) return;
    
    setLoading(true);
    try {
      const result = await gradeFeynmanExplanation(selectedWord!, wordDetails.definition, feynmanInput);
      setFeynmanResult(result);
      if (result.score >= 70) {
        addXp(50); // Bonus XP for good explanation
      }
    } catch (error) {
      console.error('Error grading:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveToVault = () => {
    if (!wordDetails || !selectedWord) return;
    
    const entry: WordEntry = {
      id: Date.now().toString(),
      word: selectedWord,
      definition: wordDetails.definition,
      syllableBreakdown: wordDetails.syllableBreakdown,
      analogy: wordDetails.analogy,
      partOfSpeech: wordDetails.partOfSpeech,
      originalSentence: contextSentence,
      sourceDocument: sourceName,
      dateAdded: Date.now(),
      feynmanScore: feynmanResult?.score,
      feynmanFeedback: feynmanResult?.feedback
    };
    
    onSaveWord(entry);
    setSelectedWord(null);
  };

  const getContextSentence = (word: string, fullText: string) => {
    const sentences = fullText.split(/[.!?]+/);
    const sentence = sentences.find(s => s.toLowerCase().includes(word.toLowerCase()));
    return sentence ? sentence.trim().slice(0, 150) + (sentence.length > 150 ? '...' : '') : '';
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.split(/\s+/).length > 3) return; // Only single words or short phrases
    
    let context = selectedText;
    if (selection.anchorNode && selection.anchorNode.parentElement) {
      context = selection.anchorNode.parentElement.textContent || selectedText;
    }
    
    handleWordClick(selectedText, context);
  };

  const handlePdfClick = async (e: React.MouseEvent) => {
    if (!lensMode) return;
    
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return; // They are selecting text

    // They clicked without selecting text. Trigger Lens!
    const canvas = document.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement;
    if (!canvas) return;

    setLensLoading(true);
    try {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(canvas, 0, 0);

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      ctx.beginPath();
      ctx.arc(x * scaleX, y * scaleY, 60 * scaleX, 0, 2 * Math.PI);
      ctx.strokeStyle = '#f59e0b'; // amber-500
      ctx.lineWidth = 6 * scaleX;
      ctx.stroke();
      ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
      ctx.fill();

      const base64 = tempCanvas.toDataURL('image/jpeg', 0.8);
      
      const { analyzeVisualElement } = await import('../services/ai');
      const result = await analyzeVisualElement(base64, "The user clicked on the highlighted circle in this document page. Explain what this image, diagram, or element is.");
      setLensResult(result);
    } catch (err) {
      console.error(err);
      alert("Failed to analyze image.");
    } finally {
      setLensLoading(false);
      setLensMode(false); // turn off after one use
    }
  };

  const renderClickableText = () => {
    if (pages.length === 0) return null;
    const pageText = pages[currentPage];
    if (!pageText) return null;
    
    return pageText.split(/(\n\n|\n)/).map((para, pIdx) => {
      if (para === '\n\n' || para === '\n') return <br key={pIdx} />;
      
      const words = para.split(/(\s+)/).filter(Boolean);
      return (
        <p key={pIdx} className="mb-6 leading-loose">
          {words.map((word, wIdx) => {
            const cleanWord = word.replace(/[^a-zA-Z]/g, '');
            const isClickable = cleanWord.length >= 3;
            
            return isClickable ? (
              <span key={wIdx}>
                <span 
                  className={`cursor-pointer transition-colors rounded px-1 py-0.5 ${selectedWord === cleanWord ? 'bg-amber-500 text-amber-950 font-bold' : 'hover:bg-amber-500/30 hover:text-amber-900'}`}
                  onClick={() => handleWordClick(cleanWord, getContextSentence(cleanWord, text))}
                >
                  {word}
                </span>
                {' '}
              </span>
            ) : (
              <span key={wIdx}>{word} </span>
            );
          })}
        </p>
      );
    });
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Header / Input Area */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between z-10">
        <h2 className="font-cinzel text-xl text-amber-500">Reading Canvas</h2>
        
        <div className="flex gap-4">
          <label className="rpg-button px-4 py-2 rounded cursor-pointer flex items-center gap-2 text-sm">
            <Upload size={16} />
            <span>Upload PDF/Image</span>
            <input type="file" className="hidden" accept=".pdf,image/*,.txt" onChange={handleFileUpload} />
          </label>
          
          <button 
            className="rpg-button px-4 py-2 rounded flex items-center gap-2 text-sm"
            onClick={() => setIsPasteModalOpen(true)}
          >
            <Type size={16} />
            <span>Paste Text</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto p-8 parchment-canvas relative" onMouseUp={handleMouseUp}>
        
        {/* Floating Lens Button */}
        {pdfFile && (
          <button 
            onClick={() => setLensMode(!lensMode)}
            className={`fixed bottom-8 right-8 z-40 p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center gap-3 ${
              lensMode 
                ? 'bg-amber-500 text-zinc-950 scale-110 ring-4 ring-amber-500/30' 
                : 'bg-zinc-900 text-amber-500 hover:bg-zinc-800 border border-amber-500/30 hover:scale-105'
            }`}
            title="Click here, then click any image in the PDF to analyze it"
          >
            <Search size={24} className={lensMode ? 'animate-pulse' : ''} />
            {lensMode && <span className="font-cinzel font-bold pr-2">Lens Active</span>}
          </button>
        )}

        {loading && !selectedWord && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="rpg-panel p-6 rounded-lg flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-amber-500" size={32} />
              <p className="font-cinzel text-amber-500">Processing Document...</p>
            </div>
          </div>
        )}

        {lensLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="rpg-panel p-6 rounded-lg flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-amber-500" size={32} />
              <p className="font-cinzel text-amber-500">Analyzing Image...</p>
            </div>
          </div>
        )}

        {!text && !pdfFile ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-50">
            <FileText size={64} className="mb-4" />
            <p className="font-cinzel text-xl">Upload a document to begin your journey</p>
          </div>
        ) : pdfFile ? (
          <div className="flex flex-col items-center min-h-full">
            <div className="mb-4 text-amber-900/60 font-cinzel text-sm text-center">
              Highlight any word to define it. <br/>
              Click "Lens Mode" then click an image to analyze it.
            </div>
            <div className="w-full max-w-4xl flex justify-center min-h-[800px]" ref={pdfContainerRef}>
              <div className={`bg-white shadow-2xl transition-all duration-300 ${lensMode ? 'cursor-crosshair ring-4 ring-amber-500/50' : ''}`} onClick={handlePdfClick}>
                <Document
                  file={pdfFile}
                  options={pdfOptions}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  onItemClick={({ pageNumber }) => {
                    if (pageNumber) setPageNumber(pageNumber);
                  }}
                  loading={
                    <div className="flex items-center justify-center h-[800px] w-full bg-zinc-100/50">
                      <Loader2 className="animate-spin text-amber-500" size={32} />
                    </div>
                  }
                >
                  <Page 
                    pageNumber={pageNumber} 
                    renderTextLayer={true} 
                    renderAnnotationLayer={true}
                    width={pdfWidth}
                    loading={
                      <div className="flex items-center justify-center h-[800px] w-full bg-zinc-100/50">
                        <Loader2 className="animate-spin text-amber-500" size={32} />
                      </div>
                    }
                  />
                </Document>
              </div>
            </div>
            
            {numPages && numPages > 0 && (
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-amber-900/20 pb-4 w-full max-w-3xl">
                <button
                  onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                  className="rpg-button px-4 py-2 rounded disabled:opacity-50 transition-opacity"
                >
                  Previous Page
                </button>
                <span className="font-cinzel text-amber-900/60 font-bold">
                  Page {pageNumber} of {numPages}
                </span>
                <button
                  onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                  disabled={pageNumber >= numPages}
                  className="rpg-button px-4 py-2 rounded disabled:opacity-50 transition-opacity"
                >
                  Next Page
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col min-h-full">
            <div className="flex-1 text-lg leading-relaxed whitespace-pre-wrap font-serif">
              {renderClickableText()}
            </div>
            
            {pages.length > 0 && (
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-amber-900/20 pb-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="rpg-button px-4 py-2 rounded disabled:opacity-50 transition-opacity"
                >
                  Previous Page
                </button>
                <span className="font-cinzel text-amber-900/60 font-bold">
                  Page {currentPage + 1} of {pages.length}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
                  disabled={currentPage === pages.length - 1}
                  className="rpg-button px-4 py-2 rounded disabled:opacity-50 transition-opacity"
                >
                  Next Page
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Paste Modal */}
      {isPasteModalOpen && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 w-full max-w-2xl rounded-xl border border-amber-500/30 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-cinzel text-xl text-amber-500">Paste Text</h3>
              <button onClick={() => setIsPasteModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <textarea
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Paste your article, chapter, or notes here..."
              className="w-full h-64 bg-zinc-950 border border-zinc-800 rounded p-4 text-zinc-200 focus:border-amber-500 focus:outline-none resize-none mb-4 font-serif leading-relaxed"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 rounded text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pasteInput.trim()) {
                    setText(pasteInput);
                    setSourceName("Pasted Text");
                    setIsPasteModalOpen(false);
                    setPasteInput('');
                  }
                }}
                disabled={!pasteInput.trim()}
                className="rpg-button px-6 py-2 rounded disabled:opacity-50 transition-opacity"
              >
                Load Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lens Result Modal */}
      {lensResult && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="rpg-panel w-full max-w-lg rounded-xl overflow-hidden shadow-2xl shadow-amber-900/20 border border-amber-500/30">
            <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-cinzel text-xl text-amber-500 flex items-center gap-2">
                <Search size={20} />
                Lens Analysis
              </h3>
              <button onClick={() => setLensResult(null)} className="text-zinc-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="text-zinc-200 leading-relaxed font-serif whitespace-pre-wrap">
                {lensResult}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Word Details Modal */}
      {selectedWord && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="rpg-panel w-full max-w-md rounded-xl overflow-hidden shadow-2xl shadow-amber-900/20 border border-amber-500/30">
            <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-cinzel text-2xl text-amber-500 uppercase tracking-widest">{selectedWord}</h3>
              <button onClick={() => setSelectedWord(null)} className="text-zinc-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {!wordDetails ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="animate-spin text-amber-500 mb-4" size={32} />
                  <p className="text-zinc-400 font-cinzel">Consulting the Oracle...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-xs text-amber-500/70 uppercase tracking-widest border border-amber-500/30 px-2 py-0.5 rounded">
                        {wordDetails.partOfSpeech}
                      </span>
                      <span className="text-sm text-zinc-400 italic">
                        {wordDetails.syllableBreakdown}
                      </span>
                    </div>
                    <p className="text-lg text-zinc-200">{wordDetails.definition}</p>
                  </div>

                  <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
                    <h4 className="text-xs text-amber-500 uppercase tracking-wider mb-1">Analogy</h4>
                    <p className="text-sm text-zinc-300 italic">"{wordDetails.analogy}"</p>
                  </div>

                  {confusedResult && (
                    <div className="bg-green-950/30 p-4 rounded border border-green-900 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs text-green-500 uppercase tracking-wider font-bold">
                          {confusedResult.label} Explanation
                        </h4>
                        <button onClick={() => setConfusedResult(null)} className="text-green-600 hover:text-green-400 text-xs">
                          Clear
                        </button>
                      </div>
                      <p className="text-sm text-zinc-200 leading-relaxed">{confusedResult.text}</p>
                    </div>
                  )}

                  {!isFeynmanMode && !confusedResult && (
                    <div className="pt-2">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-2 font-bold">Still Confused?</h4>
                      <div className="flex gap-2 flex-wrap">
                        {EXPLAIN_LEVELS.map((level) => (
                          <button
                            key={level.label}
                            onClick={() => handleConfused(level)}
                            disabled={confusedLoading}
                            className="bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
                          >
                            <span>{level.icon}</span>
                            <span className="text-zinc-300 font-medium">{level.label}</span>
                          </button>
                        ))}
                      </div>
                      {confusedLoading && (
                        <div className="flex items-center gap-2 mt-3 text-zinc-400 text-xs">
                          <Loader2 className="animate-spin" size={12} />
                          <span>Generating simpler explanation...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {!isFeynmanMode ? (
                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={saveToVault}
                        className="flex-1 rpg-button py-3 rounded flex items-center justify-center gap-2"
                      >
                        <Check size={18} />
                        <span>Save to Vault (+10 XP)</span>
                      </button>
                      <button 
                        onClick={() => setIsFeynmanMode(true)}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-amber-500 border border-zinc-700 py-3 rounded flex items-center justify-center gap-2 transition-colors font-cinzel uppercase tracking-wide text-sm"
                      >
                        <Brain size={18} />
                        <span>Feynman Challenge</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                      <h4 className="font-cinzel text-amber-500">The Feynman Challenge</h4>
                      <p className="text-xs text-zinc-400">Explain this word simply, as if teaching a beginner. AI will grade your understanding.</p>
                      
                      <textarea
                        value={feynmanInput}
                        onChange={(e) => setFeynmanInput(e.target.value)}
                        placeholder="Type your explanation here..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none h-24 resize-none"
                      />
                      
                      {feynmanResult ? (
                        <div className={`p-4 rounded border ${feynmanResult.score >= 70 ? 'bg-green-950/30 border-green-900' : 'bg-red-950/30 border-red-900'}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-cinzel font-bold">Score:</span>
                            <span className={`text-xl font-bold ${feynmanResult.score >= 70 ? 'text-green-500' : 'text-red-500'}`}>
                              {feynmanResult.score}/100
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300">{feynmanResult.feedback}</p>
                          
                          <button 
                            onClick={saveToVault}
                            className="w-full mt-4 rpg-button py-2 rounded text-sm"
                          >
                            Save to Vault & Continue
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={submitFeynman}
                          disabled={loading || !feynmanInput.trim()}
                          className="w-full rpg-button py-2 rounded flex items-center justify-center gap-2"
                        >
                          {loading ? <Loader2 className="animate-spin" size={16} /> : <span>Submit for Grading</span>}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
