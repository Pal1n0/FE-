// src/pages/ErrorPage.tsx
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react'; // Alebo iná ikonka
import { Button } from '@/components/ui/button'; // Ak používate shadcn

export const ErrorPage = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = "Nastala neočakávaná chyba.";
  let errorTitle = "Ups!";

  // Zistíme, či je to chyba routovania (napr. 404) alebo iná chyba
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      errorTitle = "404 - Nenájdené";
      errorMessage = "Hľadaná stránka neexistuje.";
    } else {
      errorTitle = `Chyba ${error.status}`;
      errorMessage = error.statusText;
    }
  } else if (error instanceof Error) {
    // Toto zachytí chyby v kóde (napr. ten váš 'Force Stop Loop')
    errorMessage = error.message;
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 text-center">
      <div className="mb-4 rounded-full bg-red-100 p-6">
        <AlertTriangle className="h-12 w-12 text-red-600" />
      </div>
      
      <h1 className="mb-2 text-3xl font-bold text-gray-900">{errorTitle}</h1>
      <p className="mb-8 text-gray-600 max-w-md">{errorMessage}</p>

      <div className="flex gap-4">
        <Button onClick={() => window.location.reload()} variant="outline">
          Obnoviť stránku
        </Button>
        <Button onClick={() => navigate('/')}>
          Späť domov
        </Button>
      </div>
    </div>
  );
};
