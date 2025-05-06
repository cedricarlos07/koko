import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequestXHR } from "@/lib/api-xhr";
import {
  Loader2,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  MessageSquare,
  Users,
  Clock,
  Medal,
  ArrowRightLeft,
  Send,
  AlertCircle,
  Zap
} from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

// Types
interface TestFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "idle" | "pending" | "success" | "error";
  message: string;
  timestamp: number;
}

interface PlaygroundProps {
  groupId: string;
  onGroupIdChange: (groupId: string) => void;
  isConnected: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}

export function TelegramPlayground({
  groupId,
  onGroupIdChange,
  isConnected,
  isLoading,
  onRefresh
}: PlaygroundProps) {
  const [activeTab, setActiveTab] = useState("messages");
  const [customMessage, setCustomMessage] = useState("");
  const [channelId, setChannelId] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [features, setFeatures] = useState<TestFeature[]>([
    {
      id: "countMembers",
      name: "Comptage des membres",
      description: "Teste la capacité à récupérer et compter les membres du groupe",
      icon: <Users className="h-5 w-5" />,
      status: "idle",
      message: "",
      timestamp: 0
    },
    {
      id: "sendMessage",
      name: "Envoi de message",
      description: "Teste l'envoi d'un message dans le groupe",
      icon: <Send className="h-5 w-5" />,
      status: "idle",
      message: "",
      timestamp: 0
    },
    {
      id: "sendZoomLink",
      name: "Envoi de lien Zoom",
      description: "Teste la génération et l'envoi d'un lien Zoom dans le groupe",
      icon: <MessageSquare className="h-5 w-5" />,
      status: "idle",
      message: "",
      timestamp: 0
    },
    {
      id: "countMessages",
      name: "Comptage des messages",
      description: "Teste la capacité à récupérer et compter les messages du groupe",
      icon: <MessageSquare className="h-5 w-5" />,
      status: "idle",
      message: "",
      timestamp: 0
    },
    {
      id: "assignBadges",
      name: "Attribution de badges",
      description: "Teste l'analyse d'activité et l'attribution de badges aux membres les plus actifs",
      icon: <Medal className="h-5 w-5" />,
      status: "idle",
      message: "",
      timestamp: 0
    },
    {
      id: "forwardMessage",
      name: "Transfert de message",
      description: "Teste le transfert d'un message depuis une chaîne vers le groupe",
      icon: <ArrowRightLeft className="h-5 w-5" />,
      status: "idle",
      message: "",
      timestamp: 0
    },
    {
      id: "sendReminder",
      name: "Envoi de rappel",
      description: "Teste l'envoi d'un rappel programmé dans le groupe",
      icon: <Clock className="h-5 w-5" />,
      status: "idle",
      message: "",
      timestamp: 0
    }
  ]);

  // Mutation pour exécuter un test
  const testMutation = useMutation({
    mutationFn: async ({ testId }: { testId: string }) => {
      if (!groupId) {
        throw new Error("Veuillez entrer un ID de groupe Telegram");
      }
      
      // Mettre à jour le statut du test
      updateFeatureStatus(testId, "pending", "Test en cours...");
      addLog(`Exécution du test: ${getFeatureName(testId)}`);
      
      return await apiRequestXHR("POST", `/api/telegram/test/run-test`, {
        testId,
        groupId
      });
    },
    onSuccess: (data, variables) => {
      const { testId } = variables;
      updateFeatureStatus(testId, data.success ? "success" : "error", data.message);
      addLog(`Résultat du test ${getFeatureName(testId)}: ${data.message}`);
      
      toast({
        title: data.success ? "Test réussi" : "Test échoué",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      
      // Rafraîchir les données si nécessaire
      if (data.success) {
        onRefresh();
      }
    },
    onError: (error, variables) => {
      const { testId } = variables;
      updateFeatureStatus(testId, "error", error.message);
      addLog(`Erreur lors du test ${getFeatureName(testId)}: ${error.message}`);
      
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pour envoyer un message personnalisé
  const sendCustomMessageMutation = useMutation({
    mutationFn: async () => {
      if (!groupId || !customMessage) {
        throw new Error("Veuillez entrer un ID de groupe et un message");
      }
      
      addLog(`Envoi d'un message personnalisé dans le groupe ${groupId}`);
      
      return await apiRequestXHR("POST", `/api/telegram/test/send-message`, {
        groupId,
        message: customMessage,
        parseMode: "HTML"
      });
    },
    onSuccess: () => {
      addLog(`Message personnalisé envoyé avec succès dans le groupe ${groupId}`);
      
      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé avec succès dans le groupe.",
      });
      
      // Réinitialiser le message
      setCustomMessage("");
    },
    onError: (error) => {
      addLog(`Erreur lors de l'envoi du message personnalisé: ${error.message}`);
      
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pour transférer un message depuis une chaîne
  const forwardMessageMutation = useMutation({
    mutationFn: async () => {
      if (!groupId || !channelId) {
        throw new Error("Veuillez entrer un ID de groupe et un ID de chaîne");
      }
      
      addLog(`Transfert d'un message depuis la chaîne ${channelId} vers le groupe ${groupId}`);
      
      return await apiRequestXHR("POST", `/api/telegram/test/forward-message`, {
        sourceChannelId: channelId,
        targetGroupId: groupId
      });
    },
    onSuccess: () => {
      addLog(`Message transféré avec succès depuis la chaîne ${channelId} vers le groupe ${groupId}`);
      
      toast({
        title: "Message transféré",
        description: "Le message a été transféré avec succès.",
      });
    },
    onError: (error) => {
      addLog(`Erreur lors du transfert du message: ${error.message}`);
      
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fonction pour mettre à jour le statut d'une fonctionnalité
  const updateFeatureStatus = (id: string, status: TestFeature["status"], message: string) => {
    setFeatures(prev => prev.map(feature => 
      feature.id === id 
        ? { ...feature, status, message, timestamp: Date.now() } 
        : feature
    ));
  };

  // Fonction pour obtenir le nom d'une fonctionnalité par son ID
  const getFeatureName = (id: string): string => {
    const feature = features.find(f => f.id === id);
    return feature ? feature.name : id;
  };

  // Fonction pour ajouter un log
  const addLog = (message: string) => {
    const timestamp = format(new Date(), 'HH:mm:ss');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  };

  // Fonction pour exécuter un test
  const runTest = (testId: string) => {
    testMutation.mutate({ testId });
  };

  // Fonction pour envoyer un message personnalisé
  const sendCustomMessage = () => {
    if (!customMessage) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un message à envoyer.",
        variant: "destructive",
      });
      return;
    }
    
    sendCustomMessageMutation.mutate();
  };

  // Fonction pour transférer un message depuis une chaîne
  const forwardMessage = () => {
    if (!channelId) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un ID de chaîne source.",
        variant: "destructive",
      });
      return;
    }
    
    forwardMessageMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="mr-2 h-5 w-5 text-yellow-500" />
            Playground Telegram
          </CardTitle>
          <CardDescription>
            Testez toutes les fonctionnalités de l'intégration Telegram dans un environnement contrôlé
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="features">Fonctionnalités</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="messages" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Envoyer un message personnalisé</h3>
                  <Textarea
                    placeholder="Écrivez votre message ici... (supporte le format HTML)"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={sendCustomMessage}
                      disabled={!isConnected || !customMessage || sendCustomMessageMutation.isPending}
                    >
                      {sendCustomMessageMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Envoyer
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Transférer un message depuis une chaîne</h3>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="ID de la chaîne source (ex: @channel ou -100...)"
                      value={channelId}
                      onChange={(e) => setChannelId(e.target.value)}
                    />
                    <Button
                      onClick={forwardMessage}
                      disabled={!isConnected || !channelId || forwardMessageMutation.isPending}
                    >
                      {forwardMessageMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                      )}
                      Transférer
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="features" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature) => (
                  <Card key={feature.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 rounded-full bg-gray-100">
                            {feature.icon}
                          </div>
                          <div>
                            <h3 className="font-medium">{feature.name}</h3>
                            <p className="text-sm text-gray-500">{feature.description}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => runTest(feature.id)}
                          disabled={!isConnected || feature.status === "pending" || testMutation.isPending}
                        >
                          {feature.status === "pending" || (testMutation.isPending && testMutation.variables?.testId === feature.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      
                      {feature.status !== "idle" && (
                        <div className="mt-4">
                          <div className="flex items-center space-x-2">
                            {feature.status === "pending" && <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />}
                            {feature.status === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {feature.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                            <span className={`text-sm ${
                              feature.status === "success" ? "text-green-500" :
                              feature.status === "error" ? "text-red-500" :
                              "text-yellow-500"
                            }`}>
                              {feature.status === "pending" ? "En cours..." :
                               feature.status === "success" ? "Succès" :
                               "Échec"}
                            </span>
                          </div>
                          {feature.message && (
                            <p className="text-sm mt-1">{feature.message}</p>
                          )}
                          {feature.timestamp > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(feature.timestamp), 'HH:mm:ss')}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="logs" className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-md h-[400px] overflow-y-auto font-mono text-sm">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="py-1 border-b border-gray-200 last:border-0">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-center py-4">
                    Aucun log disponible. Exécutez des tests pour générer des logs.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
