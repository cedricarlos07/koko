import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Interface pour les paramètres système
interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export function SystemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les paramètres système
  const { data: settings, isLoading } = useQuery<SystemSetting[]>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings");
      return res.json();
    },
  });

  // Mutation pour mettre à jour un paramètre système
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest("PUT", `/api/settings/${key}`, { value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Paramètre mis à jour",
        description: "Le paramètre système a été mis à jour avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la mise à jour du paramètre: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation pour réinitialiser le planificateur
  const resetSchedulerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/scheduler/reset");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Planificateur réinitialisé",
        description: "Le planificateur a été réinitialisé avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la réinitialisation du planificateur: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Fonction pour obtenir la valeur d'un paramètre
  const getSettingValue = (key: string): string => {
    const setting = settings?.find((s) => s.key === key);
    return setting ? setting.value : "";
  };

  // Fonction pour mettre à jour un paramètre booléen
  const updateBooleanSetting = (key: string, value: boolean) => {
    updateSettingMutation.mutate({ key, value: value.toString() });
  };

  // Fonction pour mettre à jour un paramètre numérique
  const updateNumericSetting = (key: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      updateSettingMutation.mutate({ key, value });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Paramètres système</CardTitle>
          <CardDescription>Configurez les paramètres du système</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Paramètres système
        </CardTitle>
        <CardDescription>Configurez les paramètres du système</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="simulation-mode" className="text-base">Mode simulation</Label>
              <p className="text-sm text-gray-500">
                Activez ce mode pour simuler les actions sans envoyer de messages réels
              </p>
            </div>
            <Switch
              id="simulation-mode"
              checked={getSettingValue("simulation_mode") === "true"}
              onCheckedChange={(checked) => updateBooleanSetting("simulation_mode", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-minutes" className="text-base">Minutes avant le rappel</Label>
            <p className="text-sm text-gray-500 mb-2">
              Nombre de minutes avant le cours pour envoyer un rappel
            </p>
            <Input
              id="reminder-minutes"
              type="number"
              min="1"
              value={getSettingValue("reminder_minutes_before")}
              onChange={(e) => updateNumericSetting("reminder_minutes_before", e.target.value)}
              className="max-w-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone" className="text-base">Fuseau horaire</Label>
            <p className="text-sm text-gray-500 mb-2">
              Fuseau horaire utilisé pour les cours
            </p>
            <Input
              id="timezone"
              value={getSettingValue("timezone")}
              onChange={(e) => updateSettingMutation.mutate({ key: "timezone", value: e.target.value })}
              className="max-w-xs"
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => resetSchedulerMutation.mutate()}
            disabled={resetSchedulerMutation.isPending}
          >
            {resetSchedulerMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Réinitialiser le planificateur
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Réinitialise le planificateur de tâches pour appliquer les nouveaux paramètres
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
