
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUp, ArrowDown, Highlighter } from "lucide-react";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: () => void;
  toggleHighlightMode: () => void;
  searchResults: number;
  currentSearchIndex: number;
  navigateSearch: (direction: "next" | "prev") => void;
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
  return (
    <div className="flex items-center space-x-2 w-full">
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder="Buscar en la transcripción..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="pr-10 pl-9 h-9 border-slate-200 dark:border-slate-700 dark:bg-slate-800"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        
        {searchResults > 0 && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-500 dark:text-slate-400 pointer-events-none">
            {currentSearchIndex + 1}/{searchResults}
          </div>
        )}
      </div>
      
      {searchQuery && (
        <>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateSearch("prev")}
            disabled={searchResults === 0}
            className="h-9 w-9 p-0 border-slate-200 dark:border-slate-700"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateSearch("next")}
            disabled={searchResults === 0}
            className="h-9 w-9 p-0 border-slate-200 dark:border-slate-700"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </>
      )}
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={toggleHighlightMode}
        className="h-9 px-3 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/40"
      >
        <Highlighter className="h-4 w-4 mr-1.5" />
        <span className="text-xs">Resaltar</span>
      </Button>
    </div>
  );
}
