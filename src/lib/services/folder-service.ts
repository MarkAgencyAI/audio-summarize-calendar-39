
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class FolderService {
  static async getFolders() {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Error al cargar las carpetas');
      return [];
    }
  }

  static async createFolder(folderData: any) {
    try {
      const { data, error } = await supabase
        .from('folders')
        .insert(folderData)
        .select()
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Error al crear la carpeta');
      throw error;
    }
  }

  static async updateFolder(id: string, folderData: any) {
    try {
      const { data, error } = await supabase
        .from('folders')
        .update(folderData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error updating folder:', error);
      toast.error('Error al actualizar la carpeta');
      throw error;
    }
  }

  static async deleteFolder(id: string) {
    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Error al eliminar la carpeta');
      throw error;
    }
  }
}
