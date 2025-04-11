
import { useState, useRef } from "react";
import { toast } from "sonner";

export function useSearch(content: string = "") {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const transcriptionRef = useRef<HTMLPreElement>(null);
  
  const handleSearch = () => {
    if (!searchQuery.trim() || !content) return;
    
    const query = searchQuery.toLowerCase();
    const text = content.toLowerCase();
    const results: number[] = [];
    let position = -1;
    
    while ((position = text.indexOf(query, position + 1)) !== -1) {
      results.push(position);
    }
    
    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
    
    if (results.length === 0) {
      toast.info("No se encontraron resultados");
    } else {
      setTimeout(() => scrollToHighlight(results[0], false), 100);
    }
  };
  
  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    
    setCurrentSearchIndex(newIndex);
    setTimeout(() => scrollToHighlight(searchResults[newIndex], false), 100);
  };
  
  const scrollToHighlight = (position: number, shouldScroll = true) => {
    if (!transcriptionRef.current) return;
    
    const range = document.createRange();
    const textNodes = getTextNodesIn(transcriptionRef.current);
    let currentPosition = 0;
    let targetNode = null;
    let targetOffset = 0;
    
    for (const node of textNodes) {
      if (currentPosition + node.textContent!.length > position) {
        targetNode = node;
        targetOffset = position - currentPosition;
        break;
      }
      currentPosition += node.textContent!.length;
    }
    
    if (targetNode) {
      range.setStart(targetNode, targetOffset);
      range.setEnd(targetNode, targetOffset + searchQuery.length);
      
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      if (shouldScroll) {
        const parentElement = targetNode.parentElement;
        if (parentElement) {
          const container = transcriptionRef.current.closest('.overflow-y-auto');
          if (container) {
            const nodeRect = parentElement.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            const scrollTop = parentElement.offsetTop - (container.clientHeight / 2) + (nodeRect.height / 2);
            container.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });
          }
        }
      }
    }
  };
  
  const getTextNodesIn = (node: Node): Text[] => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      node, 
      NodeFilter.SHOW_TEXT, 
      null
    );
    
    let n: Node | null;
    while(n = walker.nextNode()) {
      textNodes.push(n as Text);
    }
    
    return textNodes;
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    currentSearchIndex,
    transcriptionRef,
    handleSearch,
    navigateSearch
  };
}
