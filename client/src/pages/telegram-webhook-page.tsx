import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { apiRequestXHR } from "@/lib/api-xhr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function TelegramWebhookPage() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fonction pour ajouter un log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  };

  // Récupérer les informations du webhook actuel
  const { data: webhookInfo, isLoading: isLoadingWebhookInfo, refetch: refetchWebhookInfo } = useQuery({
    queryKey: ["webhookInfo"],
    queryFn: async () => {
      try {
        const response = await apiRequestXHR("GET", "/api/telegram/webhook-info");
        return response;
      } catch (error) {
        console.error("Erreur lors de la récupération des informations du webhook:", error);
        throw error;
      }
    }
  });

  // Mutation pour configurer le webhook
  const setWebhookMutation = useMutation({
    mutationFn: async (url: string) => {
      try {
        addLog(`Configuration du webhook avec l'URL: ${url}`);
        const response = await apiRequestXHR("POST", "/api/telegram/set-webhook", { url });
        return response;
      } catch (error) {
        console.error("Erreur lors de la configuration du webhook:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      addLog(`Webhook configuré avec succès: ${JSON.stringify(data)}`);
      queryClient.invalidateQueries({ queryKey: ["webhookInfo"] });
    },
    onError: (error) => {
      addLog(`Erreur lors de la configuration du webhook: ${error.message}`);
    }
  });

  // Fonction pour configurer le webhook
  const handleSetWebhook = () => {
    if (!webhookUrl) {
      addLog("Veuillez entrer une URL de webhook");
      return;
    }

    setWebhookMutation.mutate(webhookUrl);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Configuration du Webhook Telegram</h1>

      <Tabs defaultValue="config">
        <TabsList className="mb-4">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration du Webhook</CardTitle>
                <CardDescription>
                  Configurez l'URL du webhook pour recevoir les mises à jour de Telegram
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="webhookUrl" className="block text-sm font-medium mb-1">
                      URL du Webhook
                    </label>
                    <Input
                      id="webhookUrl"
                      placeholder="https://votre-domaine.com/api/telegram/webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      L'URL doit être accessible publiquement et utiliser HTTPS
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleSetWebhook}
                  disabled={setWebhookMutation.isPending}
                >
                  {setWebhookMutation.isPending ? "Configuration en cours..." : "Configurer le Webhook"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informations du Webhook</CardTitle>
                <CardDescription>
                  Informations sur le webhook Telegram actuellement configuré
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingWebhookInfo ? (
                  <div className="text-center py-4">Chargement des informations...</div>
                ) : webhookInfo?.data?.result ? (
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">URL:</span>{" "}
                      {webhookInfo.data.result.url || "Non configuré"}
                    </div>
                    <div>
                      <span className="font-medium">Dernier code d'erreur:</span>{" "}
                      {webhookInfo.data.result.last_error_code || "Aucun"}
                    </div>
                    <div>
                      <span className="font-medium">Dernier message d'erreur:</span>{" "}
                      {webhookInfo.data.result.last_error_message || "Aucun"}
                    </div>
                    <div>
                      <span className="font-medium">Nombre maximum de connexions:</span>{" "}
                      {webhookInfo.data.result.max_connections || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Mises à jour en attente:</span>{" "}
                      {webhookInfo.data.result.pending_update_count || 0}
                    </div>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>
                      Impossible de récupérer les informations du webhook
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => refetchWebhookInfo()}>
                  Rafraîchir
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
                <CardDescription>
                  Comment configurer et utiliser le webhook Telegram
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Prérequis</h3>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Un bot Telegram créé via BotFather</li>
                      <li>Un domaine avec HTTPS (Telegram n'accepte que les webhooks HTTPS)</li>
                      <li>Le bot doit être administrateur des groupes pour capter les messages</li>
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium">Étapes de configuration</h3>
                    <ol className="list-decimal pl-5 mt-2 space-y-1">
                      <li>Assurez-vous que votre serveur est accessible publiquement</li>
                      <li>Entrez l'URL complète du webhook (https://votre-domaine.com/api/telegram/webhook)</li>
                      <li>Cliquez sur "Configurer le Webhook"</li>
                      <li>Vérifiez que le statut du webhook est "OK" dans les informations</li>
                    </ol>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium">Fonctionnement</h3>
                    <p className="mt-2">
                      Une fois configuré, le webhook recevra automatiquement tous les messages envoyés dans les groupes où le bot est présent.
                      Ces messages seront enregistrés dans la base de données et utilisés pour calculer l'activité des utilisateurs et attribuer des badges.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs d'exécution</CardTitle>
              <CardDescription>
                Suivez les logs des actions effectuées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 p-4 rounded-md h-96 overflow-y-auto font-mono text-sm">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">Aucun log disponible</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
