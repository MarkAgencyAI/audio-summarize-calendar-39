
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface OutputEditorProps {
  editedOutput: string;
  setEditedOutput: (output: string) => void;
  handleSaveOutput: () => void;
  handleCancelOutputEdit: () => void;
}

export function OutputEditor({
  editedOutput,
  setEditedOutput,
  handleSaveOutput,
  handleCancelOutputEdit
}: OutputEditorProps) {
  return (
    <div className="space-y-4 w-full">
      <Textarea 
        value={editedOutput}
        onChange={e => setEditedOutput(e.target.value)}
        className="min-h-[200px] sm:min-h-[300px] font-mono text-sm w-full resize-y"
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancelOutputEdit}>
          Cancelar
        </Button>
        <Button onClick={handleSaveOutput}>
          Guardar
        </Button>
      </div>
    </div>
  );
}
