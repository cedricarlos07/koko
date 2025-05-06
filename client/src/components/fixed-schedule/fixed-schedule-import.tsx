import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, FileUp, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function FixedScheduleImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [importStatus, setImportStatus] = useState<"idle" | "pending" | "success" | "error">("idle");

  // Mutation pour importer le planning fixe
  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/fixed-schedules/import-direct");
      return res.json();
    },
    onMutate: () => {
      setImportStatus("pending");
    },
    onSuccess: (data) => {
      setImportStatus("success");
      queryClient.invalidateQueries({ queryKey: ["/api/fixed-schedules"] });
      toast({
        title: "Planning fixe importé",
        description: `${data.count} cours planifiés ont été importés avec succès`,
      });
    },
    onError: (error) => {
      setImportStatus("error");
      toast({
        title: "Erreur",
        description: `Erreur lors de l'importation du planning fixe: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Fonction pour gérer l'importation
  const handleImport = () => {
    importMutation.mutate();
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Import du Planning Fixe</CardTitle>
        <CardDescription>
          Importez le planning fixe des cours depuis le fichier CSV "fix_schedule.csv"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="py-4 flex flex-col items-center">
          <div className="w-full max-w-lg text-center space-y-6">
            {importStatus === "success" ? (
              <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-left">
                <p className="text-sm font-medium text-green-700">Import réussi</p>
                <p className="text-sm text-gray-600 mt-1">
                  Le planning fixe a été importé avec succès. Vous pouvez maintenant gérer les cours planifiés.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
                <div className="text-blue-500 mr-4">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-700">Importation du planning fixe</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Cette action va importer le planning fixe des cours depuis le fichier CSV "fix_schedule.csv"
                    situé dans le dossier data/csv. Assurez-vous que le fichier est correctement formaté.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Le système lira depuis "data/csv/fix_schedule.csv"
                  </p>
                  <Button
                    className="mt-4"
                    onClick={handleImport}
                    disabled={importStatus === 'pending' || !isAdmin}
                  >
                    {importStatus === 'pending' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importation en cours...
                      </>
                    ) : (
                      <>
                        <FileUp className="mr-2 h-4 w-4" />
                        Importer le planning fixe
                      </>
                    )}
                  </Button>
                  {!isAdmin && (
                    <p className="text-xs text-red-500 mt-2">
                      Seuls les administrateurs peuvent importer le planning fixe
                    </p>
                  )}
                </div>
              </div>
            )}

            {importStatus === "error" && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-left">
                <p className="text-sm font-medium text-red-700">Échec de l'importation</p>
                <p className="text-sm text-gray-600 mt-1">
                  Une erreur s'est produite lors de l'importation du planning fixe. Veuillez réessayer ou contacter l'administrateur.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
