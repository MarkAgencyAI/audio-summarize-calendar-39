
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, MoreVertical, Trash2, Edit, Check, X, Filter, BookOpen } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRecordings } from "@/context/RecordingsContext";
import { toast } from "sonner";

interface RecordingItemProps {
  recording: any;
  onAddToCalendar?: (recording: any) => void;
  showActions?: boolean;
}

export function RecordingItem({ recording, onAddToCalendar, showActions = true }: RecordingItemProps) {
  const navigate = useNavigate();
  const { deleteRecording, updateRecording } = useRecordings();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleViewRecording = () => {
    navigate(`/recordings/${recording.id}`);
  };

  const handleDeleteRecording = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setTimeout(() => {
      deleteRecording(recording.id);
      toast.success("Grabación eliminada");
      setIsDeleting(false);
    }, 500);
  };

  const handleAddToCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCalendar) {
      onAddToCalendar(recording);
    }
  };

  const toggleUnderstood = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = !recording.understood;
    updateRecording(recording.id, { understood: newValue });
    toast.success(newValue ? "Marcada como entendida" : "Marcada como no entendida");
  };

  return (
    <Card
      className={`mb-2 hover:shadow-md transition-all cursor-pointer ${
        isDeleting ? "opacity-50" : ""
      }`}
      onClick={handleViewRecording}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-start space-x-3 min-w-0">
            <div className="bg-blue-100 dark:bg-blue-950 p-2 rounded-md mt-1 shrink-0">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1 min-w-0 flex-grow">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-sm truncate">
                  {recording.name}
                </h3>
                <div className="inline-flex items-center gap-2 shrink-0">
                  <ToggleGroup 
                    type="single" 
                    value={recording.understood ? "understood" : "not-understood"}
                    onValueChange={(value) => {
                      if (value) { // Only update if a value is selected (prevents deselection)
                        const newValue = value === "understood";
                        updateRecording(recording.id, { understood: newValue });
                        toast.success(newValue ? "Marcada como entendida" : "Marcada como no entendida");
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="border rounded-md overflow-hidden"
                  >
                    <ToggleGroupItem 
                      value="understood" 
                      aria-label="Entendida" 
                      className={`${recording.understood ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50' : ''} 
                        flex items-center gap-1 px-2 py-0.5 rounded-l-md h-7 data-[state=on]:border-green-500`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Check className="h-3 w-3" />
                      <span className="text-xs">Entendida</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="not-understood" 
                      aria-label="No entendida" 
                      className={`${!recording.understood ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50' : ''} 
                        flex items-center gap-1 px-2 py-0.5 rounded-r-md h-7 data-[state=on]:border-amber-500`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <X className="h-3 w-3" />
                      <span className="text-xs">No entendida</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(recording.date), {
                  addSuffix: true,
                  locale: es,
                })}
                <span className="mx-1">•</span>
                {format(new Date(recording.date), "d MMM, yyyy", { locale: es })}
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {recording.language && (
                  <Badge variant="secondary" className="text-xs">
                    {recording.language === "es" ? "Español" : recording.language}
                  </Badge>
                )}
                <Badge 
                  variant={recording.understood ? "success" : "warning"} 
                  className="text-xs flex items-center gap-1"
                >
                  {recording.understood ? (
                    <>
                      <Check className="h-3 w-3" /> Entendida
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3" /> Sin entender
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleViewRecording}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Ver detalles</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddToCalendar}>
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Añadir a calendario</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={toggleUnderstood}
                  className="flex items-center gap-2"
                >
                  {recording.understood ? (
                    <>
                      <X className="mr-2 h-4 w-4 text-amber-600" />
                      <span>Marcar no entendida</span>
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      <span>Marcar entendida</span>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleDeleteRecording}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Eliminar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
