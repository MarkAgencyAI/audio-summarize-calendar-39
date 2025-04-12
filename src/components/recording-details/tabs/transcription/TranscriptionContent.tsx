
import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { EmptyTranscription } from "./EmptyTranscription";

interface TranscriptionContentProps {
  output?: string;
  transcriptionRef: RefObject<HTMLPreElement>;
  onTextSelection: () => void;
  renderHighlightedText: () => React.ReactNode;
  isEditingOutput: boolean;
  setIsEditingOutput: (editing: boolean) => void;
  generateOutputWithGroq: () => void;
  isGeneratingOutput: boolean;
}

export function TranscriptionContent({
  output,
  transcriptionRef,
  onTextSelection,
  renderHighlightedText,
  isEditingOutput,
  setIsEditingOutput,
  generateOutputWithGroq,
  isGeneratingOutput
}: TranscriptionContentProps) {
  if (!output) {
    return (
      <EmptyTranscription 
        generateOutputWithGroq={generateOutputWithGroq}
        isGeneratingOutput={isGeneratingOutput}
      />
    );
  }

  return (
    <>
      <pre 
        ref={transcriptionRef} 
        className="whitespace-pre-wrap text-sm break-words max-w-full overflow-x-hidden overflow-wrap-anywhere transcription-text" 
        onMouseUp={onTextSelection}
      >
        {renderHighlightedText()}
      </pre>
      
      <div className="flex justify-end mt-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsEditingOutput(true)}
        >
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </div>
    </>
  );
}
