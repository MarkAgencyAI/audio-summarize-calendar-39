
import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Recording, TextHighlight } from "@/context/RecordingsContext";
import { HighlightMenuPosition, SelectionRange } from "../types";
import { supabase } from "@/integrations/supabase/client";

// Type for database response with snake_case
interface TextHighlightDB {
  id: string;
  text: string;
  color: string;
  start_position: number;
  end_position: number;
  recording_id: string;
  created_at?: string;
}

// Convert from DB format (snake_case) to app format (camelCase)
const mapDBToTextHighlight = (highlight: TextHighlightDB): TextHighlight => ({
  id: highlight.id,
  text: highlight.text,
  color: highlight.color,
  startPosition: highlight.start_position,
  endPosition: highlight.end_position,
  recording_id: highlight.recording_id
});

// Convert from app format (camelCase) to DB format (snake_case)
const mapTextHighlightToDB = (highlight: TextHighlight): TextHighlightDB => ({
  id: highlight.id,
  text: highlight.text,
  color: highlight.color,
  start_position: highlight.startPosition,
  end_position: highlight.endPosition,
  recording_id: highlight.recording_id
});

export function useHighlights(
  recording: Recording, 
  updateRecording: (id: string, data: Partial<Recording>) => void
) {
  const [highlights, setHighlights] = useState<TextHighlight[]>(recording.highlights || []);
  const [selectedText, setSelectedText] = useState("");
  const [selectedColor, setSelectedColor] = useState("#FEF7CD");
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [highlightMenuPosition, setHighlightMenuPosition] = useState<HighlightMenuPosition>({ x: 0, y: 0 });
  const selectionRef = useRef<Selection | null>(null);
  const transcriptionRef = useRef<HTMLPreElement>(null);

  const getHighlightAtPosition = (position: number): TextHighlight | null => {
    return highlights.find(h => 
      position >= h.startPosition && position <= h.endPosition
    ) || null;
  };
  
  const getOverlappingHighlights = (start: number, end: number): TextHighlight[] => {
    return highlights.filter(h => 
      (start <= h.endPosition && end >= h.startPosition)
    );
  };
  
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === "") {
      setSelectedText("");
      setSelectionRange(null);
      setShowHighlightMenu(false);
      return;
    }
    
    if (transcriptionRef.current && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!transcriptionRef.current.contains(range.commonAncestorContainer)) {
        return;
      }
      
      const text = selection.toString().trim();
      setSelectedText(text);
      
      const textContent = recording.output || "";
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(transcriptionRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const startPosition = preSelectionRange.toString().length;
      
      setSelectionRange({
        start: startPosition,
        end: startPosition + text.length
      });
      
      selectionRef.current = selection;
      
      const existingHighlight = getHighlightAtPosition(startPosition);
      
      const rect = range.getBoundingClientRect();
      setHighlightMenuPosition({
        x: rect.left + (rect.width / 2),
        y: rect.top - 10
      });
      
      setShowHighlightMenu(true);
    }
  };

  useEffect(() => {
    const loadHighlights = async () => {
      try {
        const { data, error } = await supabase
          .from('text_highlights')
          .select('*')
          .eq('recording_id', recording.id);
        
        if (error) {
          throw error;
        }
        
        if (data) {
          // Convert from DB snake_case to app camelCase
          const mappedHighlights = data.map(mapDBToTextHighlight);
          setHighlights(mappedHighlights);
        }
      } catch (error) {
        console.error('Error loading highlights:', error);
        toast.error('Error al cargar los resaltados');
      }
    };

    if (recording.id) {
      loadHighlights();
    }
  }, [recording.id]);

  const applyHighlight = async (color: string) => {
    if (!selectionRange || !selectedText) return;
    
    const overlappingHighlights = getOverlappingHighlights(selectionRange.start, selectionRange.end);
    let updatedHighlights = [...highlights];
    
    if (overlappingHighlights.length > 0) {
      updatedHighlights = updatedHighlights.filter(
        highlight => !overlappingHighlights.some(oh => oh.id === highlight.id)
      );
      
      for (const highlight of overlappingHighlights) {
        try {
          await supabase
            .from('text_highlights')
            .delete()
            .eq('id', highlight.id);
        } catch (error) {
          console.error('Error removing highlight:', error);
        }
      }
    }
    
    const newHighlight: TextHighlight = {
      id: crypto.randomUUID(),
      text: selectedText,
      color,
      startPosition: selectionRange.start,
      endPosition: selectionRange.end,
      recording_id: recording.id
    };
    
    try {
      // Convert to DB format for insert
      const dbHighlight = mapTextHighlightToDB(newHighlight);
      
      const { error } = await supabase
        .from('text_highlights')
        .insert(dbHighlight);
      
      if (error) throw error;
      
      updatedHighlights.push(newHighlight);
      setHighlights(updatedHighlights);
      
      setSelectedText("");
      setSelectionRange(null);
      setShowHighlightMenu(false);
      window.getSelection()?.removeAllRanges();
      
      toast.success("Texto resaltado guardado");
      
    } catch (error) {
      console.error('Error saving highlight:', error);
      toast.error('Error al guardar el resaltado');
    }
  };
  
  const removeHighlight = async (highlightId: string) => {
    try {
      const { error } = await supabase
        .from('text_highlights')
        .delete()
        .eq('id', highlightId);
      
      if (error) throw error;
      
      const updatedHighlights = highlights.filter(h => h.id !== highlightId);
      setHighlights(updatedHighlights);
      
      toast.success("Resaltado eliminado");
    } catch (error) {
      console.error('Error removing highlight:', error);
      toast.error('Error al eliminar el resaltado');
    }
  };
  
  const removeHighlightAtSelection = () => {
    if (!selectionRange) return;
    
    const overlappingHighlights = getOverlappingHighlights(selectionRange.start, selectionRange.end);
    
    if (overlappingHighlights.length > 0) {
      const updatedHighlights = highlights.filter(
        highlight => !overlappingHighlights.some(oh => oh.id === highlight.id)
      );
      
      setHighlights(updatedHighlights);
      updateRecording(recording.id, {
        highlights: updatedHighlights
      });
      
      toast.success("Resaltado eliminado");
    }
    
    setSelectedText("");
    setSelectionRange(null);
    setShowHighlightMenu(false);
    window.getSelection()?.removeAllRanges();
  };
  
  const renderHighlightedText = (text?: string): React.ReactNode => {
    if (!text && !recording.output) return null;
    
    const content = text || recording.output || "";
    const sortedHighlights = [...highlights].sort((a, b) => a.startPosition - b.startPosition);
    
    const nonOverlappingHighlights = sortedHighlights.reduce((acc: TextHighlight[], highlight, index) => {
      const overlapsWithPrevious = acc.some(h => 
        (highlight.startPosition <= h.endPosition && highlight.endPosition >= h.startPosition)
      );
      
      if (!overlapsWithPrevious) {
        acc.push(highlight);
      }
      return acc;
    }, []);
    
    const segments: React.ReactNode[] = [];
    let currentPosition = 0;
    
    for (const highlight of nonOverlappingHighlights) {
      if (highlight.startPosition > currentPosition) {
        segments.push(
          <React.Fragment key={`text-${currentPosition}`}>
            {content.substring(currentPosition, highlight.startPosition)}
          </React.Fragment>
        );
      }
      
      segments.push(
        <mark 
          key={highlight.id}
          style={{ backgroundColor: highlight.color, position: 'relative', borderRadius: '2px' }}
          onDoubleClick={() => removeHighlight(highlight.id)}
          title="Doble clic para eliminar el resaltado"
        >
          {content.substring(highlight.startPosition, highlight.endPosition)}
        </mark>
      );
      
      currentPosition = highlight.endPosition;
    }
    
    if (currentPosition < content.length) {
      segments.push(
        <React.Fragment key="text-end">
          {content.substring(currentPosition)}
        </React.Fragment>
      );
    }
    
    return segments;
  };

  return {
    highlights,
    setHighlights,
    selectedText,
    setSelectedText,
    selectedColor,
    setSelectedColor,
    selectionRange,
    setSelectionRange,
    showHighlightMenu,
    setShowHighlightMenu,
    highlightMenuPosition,
    setHighlightMenuPosition,
    selectionRef,
    transcriptionRef,
    handleTextSelection,
    applyHighlight,
    removeHighlight,
    removeHighlightAtSelection,
    renderHighlightedText,
    getHighlightAtPosition,
    getOverlappingHighlights
  };
}
