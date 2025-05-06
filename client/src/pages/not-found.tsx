import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  const { user } = useAuth();

  // Rediriger vers la page d'authentification si l'utilisateur n'est pas connecté
  if (!user) {
    return <Redirect to="/auth" />;
  }
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>

          <div className="mt-6">
            <Link href="/dashboard">
              <Button className="w-full bg-gradient-to-r from-[#E5133C] to-pink-600 hover:from-[#E5133C]/90 hover:to-pink-600/90 transition-all">
                Retour au tableau de bord
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
