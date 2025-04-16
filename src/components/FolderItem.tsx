
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder as FolderIcon, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Folder } from '@/context/RecordingsContext';

interface FolderItemProps {
  folder: Folder;
}

export function FolderItem({ folder }: FolderItemProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/folder/${folder.id}`);
  };

  return (
    <Card 
      className="p-3 cursor-pointer hover:bg-accent/50 flex items-center justify-between" 
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <div 
          className="h-8 w-8 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: `${folder.color}30`,
            color: folder.color
          }}
        >
          <FolderIcon className="h-4 w-4" />
        </div>
        <div className="font-medium">{folder.name}</div>
      </div>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </Card>
  );
}
