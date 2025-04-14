
import { useState, useRef, useCallback } from "react";
import { TextHighlight } from "@/context/RecordingsContext";
import { toast } from "sonner";

interface UseHighlightingProps {
  highlights: TextHighlight[];
  onSaveHighlight: (highlight: Omit<TextHighlight, "id">) => void;
  onRemoveHighlight: (highlightId: string) => void;
}

export function useHighlighting({
  highlights,
  onSaveHighlight,
  onRemoveHighlight
}: UseHighlightingProps) {
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [highlightMenuPosition, setHighlightMenuPosition] = useState({ x: 0, y: 0 });
  const [isHighlightMenuOpen, setIsHighlightMenuOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Función para manejar la selección de texto
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === "") {
      return;
    }
    
    const range = selection.getRangeAt(0);
    if (!contentRef.current?.contains(range.commonAncestorContainer)) {
      return;
    }
    
    const text = selection.toString().trim();
    if (text.length === 0) {
      return;
    }
    
    // Calcular la posición del rango para mostrar el menú
    const rect = range.getBoundingClientRect();
    setHighlightMenuPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    
    // Calcular la posición de inicio y fin en el texto completo
    const textContent = contentRef.current.textContent || "";
    const preSelectionRange = document.createRange();
    preSelectionRange.selectNodeContents(contentRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preSelectionRange.toString().length;
    
    setSelectedText(text);
    setSelectionRange({
      start: startOffset,
      end: startOffset + text.length
    });
    setIsHighlightMenuOpen(true);
  }, []);
  
  // Cerrar el menú de resaltado
  const closeHighlightMenu = useCallback(() => {
    setIsHighlightMenuOpen(false);
    setSelectedText("");
    setSelectionRange(null);
  }, []);
  
  // Aplicar un nuevo resaltado
  const applyHighlight = useCallback((color: string) => {
    if (!selectionRange || !selectedText) {
      return;
    }
    
    // Verificar si ya existe un resaltado en este rango
    const existingHighlight = highlights.find(h => 
      (selectionRange.start >= h.startPosition && selectionRange.start <= h.endPosition) ||
      (selectionRange.end >= h.startPosition && selectionRange.end <= h.endPosition) ||
      (selectionRange.start <= h.startPosition && selectionRange.end >= h.endPosition)
    );
    
    // Si existe, eliminar el resaltado anterior
    if (existingHighlight) {
      onRemoveHighlight(existingHighlight.id);
    }
    
    // Crear y guardar el nuevo resaltado
    onSaveHighlight({
      text: selectedText,
      color,
      startPosition: selectionRange.start,
      endPosition: selectionRange.end
    });
    
    closeHighlightMenu();
    window.getSelection()?.removeAllRanges();
    toast.success("Texto resaltado");
  }, [selectionRange, selectedText, highlights, onRemoveHighlight, onSaveHighlight, closeHighlightMenu]);
  
  // Copiar el texto seleccionado
  const copySelectedText = useCallback(() => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      toast.success("Texto copiado al portapapeles");
      closeHighlightMenu();
    }
  }, [selectedText, closeHighlightMenu]);
  
  // Eliminar un resaltado existente
  const removeHighlightAtSelection = useCallback(() => {
    if (!selectionRange) {
      return;
    }
    
    // Buscar todos los resaltados que se solapan con la selección actual
    const overlappingHighlights = highlights.filter(h => 
      (selectionRange.start >= h.startPosition && selectionRange.start <= h.endPosition) ||
      (selectionRange.end >= h.startPosition && selectionRange.end <= h.endPosition) ||
      (selectionRange.start <= h.startPosition && selectionRange.end >= h.endPosition)
    );
    
    if (overlappingHighlights.length > 0) {
      // Eliminar todos los resaltados que se solapan
      overlappingHighlights.forEach(h => {
        onRemoveHighlight(h.id);
      });
      
      toast.success("Resaltado eliminado");
    }
    
    closeHighlightMenu();
    window.getSelection()?.removeAllRanges();
  }, [selectionRange, highlights, onRemoveHighlight, closeHighlightMenu]);
  
  // Renderizar el texto con los resaltados
  const renderHighlightedText = useCallback((text: string) => {
    if (!text) {
      return null;
    }
    
    if (highlights.length === 0) {
      return <p className="whitespace-pre-wrap">{text}</p>;
    }
    
    // Ordenar los resaltados por posición
    const sortedHighlights = [...highlights].sort((a, b) => a.startPosition - b.startPosition);
    
    // Verificar y resolver solapamientos
    const nonOverlappingHighlights: TextHighlight[] = [];
    for (const highlight of sortedHighlights) {
      const overlaps = nonOverlappingHighlights.some(h => 
        (highlight.startPosition < h.endPosition && highlight.endPosition > h.startPosition)
      );
      
      if (!overlaps) {
        nonOverlappingHighlights.push(highlight);
      }
    }
    
    // Construir el texto con resaltados
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;
    
    for (const highlight of nonOverlappingHighlights) {
      if (highlight.startPosition > lastIndex) {
        segments.push(
          <span key={`text-${lastIndex}`}>
            {text.substring(lastIndex, highlight.startPosition)}
          </span>
        );
      }
      
      segments.push(
        <mark
          key={`highlight-${highlight.id}`}
          style={{ backgroundColor: highlight.color }}
          className="px-0.5 py-0.5 rounded relative group"
          onDoubleClick={() => onRemoveHighlight(highlight.id)}
          title="Doble clic para eliminar el resaltado"
        >
          {text.substring(highlight.startPosition, highlight.endPosition)}
          <span className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="secondary"
              className="h-4 w-4 rounded-full border border-white shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveHighlight(highlight.id);
              }}
            >
              <X className="h-2 w-2" />
              <span className="sr-only">Eliminar resaltado</span>
            </Button>
          </span>
        </mark>
      );
      
      lastIndex = highlight.endPosition;
    }
    
    if (lastIndex < text.length) {
      segments.push(
        <span key={`text-end`}>
          {text.substring(lastIndex)}
        </span>
      );
    }
    
    return <div className="whitespace-pre-wrap">{segments}</div>;
  }, [highlights, onRemoveHighlight]);
  
  return {
    selectedText,
    contentRef,
    highlightMenuPosition,
    isHighlightMenuOpen,
    handleTextSelection,
    closeHighlightMenu,
    applyHighlight,
    copySelectedText,
    removeHighlightAtSelection,
    renderHighlightedText
  };
}
