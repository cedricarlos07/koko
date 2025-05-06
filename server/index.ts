import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initAutomationEngine } from "./automation-engine";
import dotenv from 'dotenv';

// Charger les variables d'environnement depuis le fichier .env
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Ajouter des en-têtes CORS explicites
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Répondre directement aux requêtes OPTIONS (préflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Middleware pour garantir que toutes les réponses sont en JSON
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Sauvegarder les méthodes originales
    const originalSend = res.send;
    const originalEnd = res.end;

    // Remplacer la méthode send
    res.send = function(body: any) {
      try {
        // Si la réponse n'est pas déjà du JSON et que c'est une requête API
        if (req.path.startsWith('/api') && typeof body === 'string' && !res.get('Content-Type')?.includes('application/json')) {
          console.log(`Conversion de la réponse en JSON pour ${req.path}`);
          return res.json({ data: body });
        }
        return originalSend.apply(res, [body]);
      } catch (error) {
        console.error('Erreur dans le middleware send:', error);
        return originalSend.apply(res, [JSON.stringify({ error: 'Erreur interne du serveur' })]);
      }
    };

    // Remplacer la méthode end
    res.end = function(chunk: any) {
      try {
        if (req.path.startsWith('/api') && chunk && typeof chunk === 'string' && !res.get('Content-Type')?.includes('application/json')) {
          console.log(`Conversion de la réponse end en JSON pour ${req.path}`);
          res.setHeader('Content-Type', 'application/json');
          return originalEnd.apply(res, [JSON.stringify({ data: chunk })]);
        }
        return originalEnd.apply(res, arguments);
      } catch (error) {
        console.error('Erreur dans le middleware end:', error);
        res.setHeader('Content-Type', 'application/json');
        return originalEnd.apply(res, [JSON.stringify({ error: 'Erreur interne du serveur' })]);
      }
    };

    next();
  });

  // Middleware de gestion des erreurs
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Erreur interceptée par le middleware:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ error: message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5007
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5007;
  server.listen({
    port,
    host: "localhost",
  }, () => {
    log(`serving on port ${port}`);

    // Initialiser le moteur d'automatisation
    initAutomationEngine();
  });
})();

// Fonction pour insérer les données réelles (non utilisée pour le moment)
/*
// Données réelles extraites du fichier Excel
const realData = [
  {
    courseName: "Mina Lepsanovic - BBG - MW - 7:30pm",
    level: "bbg",
    teacherName: "Mina Lepsanovic",
    day: "monday",
    time: "20:30",
    duration: 60,
    telegramGroup: "-1001280305339",
    zoomHostEmail: "minalepsanovic@gmail.com"
  },
  {
    courseName: "Mina Lepsanovic - BBG - MW - 9:00pm",
    level: "bbg",
    teacherName: "Mina Lepsanovic",
    day: "monday",
    time: "22:00",
    duration: 60,
    telegramGroup: "-1001706969621",
    zoomHostEmail: "minalepsanovic@gmail.com"
  },
  {
    courseName: "Maimouna Koffi - ABG - MW - 8:30pm",
    level: "abg",
    teacherName: "Maimouna Koffi",
    day: "monday",
    time: "21:30",
    duration: 60,
    telegramGroup: "-1001189215986",
    zoomHostEmail: "keita_maimouna@ymail.com"
  },
  {
    courseName: "Maimouna Koffi - ABG - MW - 7:00pm",
    level: "abg",
    teacherName: "Maimouna Koffi",
    day: "monday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001525896262",
    zoomHostEmail: "keita_maimouna@ymail.com"
  },
  {
    courseName: "Wissam Eddine - ABG - MW - 9:00pm",
    level: "abg",
    teacherName: "Wissam Eddine",
    day: "monday",
    time: "22:00",
    duration: 60,
    telegramGroup: "-1001200673710",
    zoomHostEmail: "wissamj8@hotmail.com"
  },
  {
    courseName: "Wissam Eddine - ABG - MW - 7:00pm",
    level: "abg",
    teacherName: "Wissam Eddine",
    day: "monday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001450960271",
    zoomHostEmail: "wissamj8@hotmail.com"
  },
  {
    courseName: "Hafida Faraj - ABG - MW - 7:30pm",
    level: "abg",
    teacherName: "Hafida Faraj",
    day: "monday",
    time: "20:30",
    duration: 60,
    telegramGroup: "-1001674281614",
    zoomHostEmail: "hafidafaraj@gmail.com"
  },
  {
    courseName: "Hafida Faraj - ABG - MW - 9:00pm",
    level: "abg",
    teacherName: "Hafida Faraj",
    day: "monday",
    time: "22:00",
    duration: 60,
    telegramGroup: "-1001730425484",
    zoomHostEmail: "hafidafaraj@gmail.com"
  },
  {
    courseName: "Maryam Dannoun - ABG - MW - 8:00pm",
    level: "abg",
    teacherName: "Maryam Dannoun",
    day: "monday",
    time: "21:00",
    duration: 60,
    telegramGroup: "-1001183569832",
    zoomHostEmail: "missmiriamou@gmail.com"
  },
  {
    courseName: "Maryam Dannoun - ABG - MW - 7:00pm",
    level: "abg",
    teacherName: "Maryam Dannoun",
    day: "monday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001539349411",
    zoomHostEmail: "missmiriamou@gmail.com"
  },
  {
    courseName: "Jahnvi Mahtani - IG - MW- 8:30pm",
    level: "ig",
    teacherName: "Jahnvi Mahtani",
    day: "monday",
    time: "21:30",
    duration: 60,
    telegramGroup: "-1001869970621",
    zoomHostEmail: "jahnvimahtani03@gmail.com"
  },
  {
    courseName: "Mina Lepsanovic - ABG - TT - 7:30pm",
    level: "abg",
    teacherName: "Mina Lepsanovic",
    day: "tuesday",
    time: "20:30",
    duration: 60,
    telegramGroup: "-1001668163742",
    zoomHostEmail: "minalepsanovic@gmail.com"
  },
  {
    courseName: "Mina Lepsanovic - ABG - TT - 9:00pm",
    level: "abg",
    teacherName: "Mina Lepsanovic",
    day: "tuesday",
    time: "22:00",
    duration: 60,
    telegramGroup: "-1001737172709",
    zoomHostEmail: "minalepsanovic@gmail.com"
  },
  {
    courseName: "Maimouna Koffi BBG - TT - 8:30pm",
    level: "bbg",
    teacherName: "Maimouna Koffi",
    day: "tuesday",
    time: "21:30",
    duration: 60,
    telegramGroup: "-1001159742178",
    zoomHostEmail: "keita_maimouna@ymail.com"
  },
  {
    courseName: "Maimouna Koffi - BBG - TT - 7:00pm",
    level: "bbg",
    teacherName: "Maimouna Koffi",
    day: "tuesday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001605585045",
    zoomHostEmail: "keita_maimouna@ymail.com"
  },
  {
    courseName: "Aby Ndiaye - BBG - TT - 7:00pm",
    level: "bbg",
    teacherName: "Aby Ndiaye",
    day: "tuesday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001685687091",
    zoomHostEmail: "sy_aby@yahoo.fr"
  },
  {
    courseName: "Wissam Eddine - BBG -TT - 7:00pm",
    level: "bbg",
    teacherName: "Wissam Eddine",
    day: "tuesday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001268663743",
    zoomHostEmail: "wissamj8@hotmail.com"
  },
  {
    courseName: "Hafida Faraj - ABG - TT - 9:00pm",
    level: "abg",
    teacherName: "Hafida Faraj",
    day: "tuesday",
    time: "22:00",
    duration: 60,
    telegramGroup: "-1001160001497",
    zoomHostEmail: "hafidafaraj@gmail.com"
  },
  {
    courseName: "Maryam Dannoun - IG - TT - 7:00pm",
    level: "ig",
    teacherName: "Maryam Dannoun",
    day: "tuesday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001272552537",
    zoomHostEmail: "missmiriamou@gmail.com"
  },
  {
    courseName: "Maryam Dannoun - ABG - TT - 8:00pm",
    level: "abg",
    teacherName: "Maryam Dannoun",
    day: "tuesday",
    time: "21:00",
    duration: 60,
    telegramGroup: "-1001247646684",
    zoomHostEmail: "missmiriamou@gmail.com"
  }
];

// Fonction pour insérer les données réelles dans la base de données
async function insertRealData() {
  try {
    console.log('Insertion des données réelles dans la base de données...');

    // Supprimer les données existantes
    await db.delete(schema.fixedSchedules).run();
    console.log('Données existantes supprimées');

    // Insérer les nouvelles données
    const now = Date.now();
    let insertedCount = 0;

    for (const course of realData) {
      try {
        // Insérer dans la base de données
        await db.insert(schema.fixedSchedules).values({
          courseName: course.courseName,
          level: course.level,
          teacherName: course.teacherName,
          day: course.day,
          time: course.time,
          duration: course.duration,
          telegramGroup: course.telegramGroup,
          zoomHostEmail: course.zoomHostEmail,
          isActive: true,
          createdAt: now,
          updatedAt: now
        }).run();

        insertedCount++;
        console.log(`Cours inséré: ${course.courseName} (${course.teacherName}) le ${course.day} à ${course.time}`);
      } catch (error) {
        console.error(`Erreur lors de l'insertion du cours ${course.courseName}:`, error);
      }
    }

    console.log(`Insertion terminée: ${insertedCount} cours insérés sur ${realData.length}`);
    return insertedCount;
  } catch (error) {
    console.error('Erreur lors de l\'insertion des données réelles:', error);
    throw error;
  }
}
*/
