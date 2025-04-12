
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, PaintBucket } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: () => void;
  toggleHighlightMode: () => void;
  searchResults: number[];
  currentSearchIndex: number;
  navigateSearch: (direction: 'prev' | 'next') => void;
}

export function SearchBar({
  searchQuery,
  setSearchQuery,
  handleSearch,
  toggleHighlightMode,
  searchResults,
  currentSearchIndex,
  navigateSearch
}: SearchBarProps) {
  const isMobile = useIsMobile();
  
  const searchControlsClass = isMobile ? "flex-col w-full" : "flex-row items-center";
  const searchActionButtonsClass = isMobile ? "mt-2 grid grid-cols-2 gap-1" : "flex gap-1 ml-2";
  
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 bg-muted/20 rounded-md">
      <div className={`flex ${searchControlsClass} gap-2 flex-1 min-w-[200px]`}>
        <Input 
          placeholder="Buscar en la transcripción..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)}
          className="h-9 flex-1"
        />
        <div className={searchActionButtonsClass}>
          <Button onClick={handleSearch} variant="secondary" size="sm" className="h-9">
            <Search className="h-4 w-4 mr-1" />
            <span className="whitespace-nowrap">Buscar</span>
          </Button>
          
          <Button 
            onClick={toggleHighlightMode} 
            variant="ghost" 
            size="sm"
            className="h-9 flex items-center gap-1"
          >
            <PaintBucket className="h-4 w-4" />
            <span className="whitespace-nowrap">Resaltar</span>
          </Button>
        </div>
      </div>
      
      {searchResults.length > 0 && (
        <div className="flex items-center gap-1 w-full sm:w-auto mt-2 sm:mt-0">
          <Button 
            onClick={() => navigateSearch('prev')} 
            variant="outline" 
            size="sm"
            className="h-8 px-2"
          >
            Anterior
          </Button>
          <span className="text-xs">
            {currentSearchIndex + 1}/{searchResults.length}
          </span>
          <Button 
            onClick={() => navigateSearch('next')} 
            variant="outline" 
            size="sm"
            className="h-8 px-2"
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
