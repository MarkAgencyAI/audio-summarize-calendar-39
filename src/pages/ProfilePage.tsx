import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
export default function ProfilePage() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    logout
  } = useAuth();
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    career: ""
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else if (profile) {
      setProfileData({
        name: profile.name,
        email: profile.email,
        career: profile.career || ""
      });
    }
  }, [user, profile, navigate]);
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        name: profileData.name,
        career: profileData.career
      }).eq('id', user.id);
      if (error) throw error;
      toast.success("Perfil actualizado");
    } catch (error) {
      console.error("Error actualizando perfil:", error);
      toast.error("Error al actualizar el perfil");
    }
  };
  return <Layout>
      <div className="space-y-6 w-full max-w-full">
        <h1 className="text-2xl md:text-3xl font-bold text-custom-primary dark:text-custom-accent dark:text-white">
          Perfil
        </h1>
        
        <div className="glassmorphism rounded-xl p-4 md:p-6 shadow-lg w-full max-w-md">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={profileData.name} onChange={e => setProfileData({
                ...profileData,
                name: e.target.value
              })} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" value={profileData.email} readOnly />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="career">Carrera</Label>
                <Input id="career" value={profileData.career} onChange={e => setProfileData({
                ...profileData,
                career: e.target.value
              })} />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
              <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
                Cerrar sesión
              </Button>
              <Button onClick={handleSaveProfile} className="text-black w-full sm:w-auto">
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>;
}