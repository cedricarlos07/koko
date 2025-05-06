import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Calendar, Check, ChevronRight, Loader2, Lock, Mail, MessageSquare, User, UserPlus, Video, Info } from "lucide-react";
import { FaTelegram } from "react-icons/fa";

const loginSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

const registerSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  firstName: z.string().min(1, {
    message: "Please enter your first name.",
  }),
  lastName: z.string().min(1, {
    message: "Please enter your last name.",
  }),
  role: z.enum(["student", "professor", "coach", "admin"], {
    message: "Please select a valid role.",
  }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, login, register, isLoading } = useAuth();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "student",
    },
  });

  const onLoginSubmit = async (values: LoginFormValues) => {
    try {
      await login(values);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  // Fonction pour se connecter automatiquement avec les identifiants de démonstration
  const loginWithDemo = async () => {
    try {
      // Mettre à jour les champs du formulaire pour l'interface utilisateur
      loginForm.setValue("username", "admin");
      loginForm.setValue("password", "password");

      // Effectuer la connexion
      await login({ username: "admin", password: "password" });
    } catch (err) {
      console.error("Demo login error:", err);
    }
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    try {
      await register(values);
    } catch (err) {
      console.error("Registration error:", err);
    }
  };

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Header moderne avec dégradé et effets */}
      <div className="bg-gradient-to-br from-[#E5133C] via-red-500 to-pink-600 text-white py-8 md:py-12 relative overflow-hidden">
        {/* Cercles décoratifs en arrière-plan */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mt-20 -mr-20 blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -mb-20 -ml-10 blur-lg"></div>
        <div className="absolute -bottom-24 right-20 w-72 h-72 bg-white/5 rounded-full blur-lg"></div>

        <div className="container max-w-7xl mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center text-center">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs md:text-sm font-medium mb-3 md:mb-4">
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                Plateforme d'apprentissage d'anglais
              </span>
            </div>
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-white to-white/70 flex items-center justify-center text-[#E5133C] font-bold mr-2">K</div>
              <span className="text-white font-bold text-3xl">KODJO ENGLISH BOT</span>
            </div>
            <p className="text-white/80 text-sm md:text-base max-w-xl">
              La plateforme complète pour gérer les cours d'anglais avec planification automatisée, intégration Telegram et gestion des réunions Zoom.
            </p>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Authentification requise</h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>Vous devez vous connecter pour accéder à l'application. Utilisez le bouton "Connexion avec compte démo" pour une connexion rapide.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Formulaires d'authentification */}
          <div className="card-3d">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <User size={16} />
                  <span>Connexion</span>
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center gap-2">
                  <UserPlus size={16} />
                  <span>Inscription</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Bienvenue !</h2>
                    <p className="text-gray-500 mt-1">Connectez-vous pour accéder à votre compte</p>
                  </div>

                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom d'utilisateur</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  placeholder="Entrez votre nom d'utilisateur"
                                  className="pl-10"
                                  {...field}
                                />
                              </FormControl>
                              <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mot de passe</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Entrez votre mot de passe"
                                  className="pl-10"
                                  {...field}
                                />
                              </FormControl>
                              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-3">
                        <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-[#E5133C] to-pink-600 hover:from-[#E5133C]/90 hover:to-pink-600/90 transition-all"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Se connecter
                        </Button>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-muted-foreground">
                              Ou
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={loginWithDemo}
                        >
                          <Info className="mr-2 h-4 w-4" />
                          Connexion avec compte démo
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </TabsContent>

              <TabsContent value="register">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Créer un compte</h2>
                    <p className="text-gray-500 mt-1">Rejoignez la plateforme KODJO ENGLISH BOT</p>
                  </div>

                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prénom</FormLabel>
                              <FormControl>
                                <Input placeholder="John" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom</FormLabel>
                              <FormControl>
                                <Input placeholder="Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom d'utilisateur</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  placeholder="johndoe"
                                  className="pl-10"
                                  {...field}
                                />
                              </FormControl>
                              <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="john.doe@example.com"
                                  className="pl-10"
                                  {...field}
                                />
                              </FormControl>
                              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mot de passe</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Minimum 6 caractères"
                                  className="pl-10"
                                  {...field}
                                />
                              </FormControl>
                              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rôle</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionnez un rôle" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="student">Étudiant</SelectItem>
                                <SelectItem value="professor">Professeur</SelectItem>
                                <SelectItem value="coach">Coach</SelectItem>
                                <SelectItem value="admin">Administrateur</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-[#E5133C] to-pink-600 hover:from-[#E5133C]/90 hover:to-pink-600/90 transition-all"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Créer un compte
                      </Button>
                    </form>
                  </Form>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Fonctionnalités */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 pl-1 flex items-center">
              <Check className="w-5 h-5 mr-2 text-[#E5133C]" />
              Fonctionnalités principales
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card-3d group p-5">
                <div className="flex items-center mb-3">
                  <div className="stat-card-icon gradient-red rounded-xl group-hover:scale-110 transition-transform h-10 w-10">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold ml-3">Planification</h3>
                </div>
                <p className="text-gray-500 text-sm">Gestion automatisée des sessions de cours et des horaires</p>
              </div>

              <div className="card-3d group p-5">
                <div className="flex items-center mb-3">
                  <div className="stat-card-icon gradient-blue rounded-xl group-hover:scale-110 transition-transform h-10 w-10">
                    <Video className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold ml-3">Zoom</h3>
                </div>
                <p className="text-gray-500 text-sm">Création et gestion automatique des réunions Zoom</p>
              </div>

              <div className="card-3d group p-5">
                <div className="flex items-center mb-3">
                  <div className="stat-card-icon bg-blue-500 rounded-xl group-hover:scale-110 transition-transform h-10 w-10">
                    <FaTelegram className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold ml-3">Telegram</h3>
                </div>
                <p className="text-gray-500 text-sm">Intégration avec Telegram pour les notifications et interactions</p>
              </div>

              <div className="card-3d group p-5">
                <div className="flex items-center mb-3">
                  <div className="stat-card-icon bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl group-hover:scale-110 transition-transform h-10 w-10">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold ml-3">Automatisations</h3>
                </div>
                <p className="text-gray-500 text-sm">Messages matinaux et rappels automatiques pour les cours</p>
              </div>
            </div>

            <div className="card-3d p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Pourquoi choisir KODJO ENGLISH BOT ?</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="ml-2 text-gray-600">Gestion complète des cours d'anglais</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="ml-2 text-gray-600">Automatisation des tâches répétitives</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="ml-2 text-gray-600">Suivi des performances des étudiants</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="ml-2 text-gray-600">Interface moderne et intuitive</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
