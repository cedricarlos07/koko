import { Request, Response } from 'express';
import { fixedScheduleService } from '../services/fixed-schedule-service';
import { zoomService } from '../services/zoom-service';
import { telegramService } from '../services/telegram-service';
import { schedulerService } from '../services/scheduler-service';
import { systemSettingsService } from '../services/system-settings-service';
import { automationLogsService, LogType, LogStatus } from '../services/automation-logs-service';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.cwd(), 'data/csv');

    // Créer le répertoire s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'fix_schedule.csv');
  }
});

export const upload = multer({ storage });

// Contrôleur pour le planning fixe
export class FixedScheduleController {
  // Récupérer tous les cours planifiés
  async getAllFixedSchedules(req: Request, res: Response) {
    try {
      const fixedSchedules = await fixedScheduleService.getAllFixedSchedules();
      res.json(fixedSchedules);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Récupérer un cours planifié par son ID
  async getFixedScheduleById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const fixedSchedule = await fixedScheduleService.getFixedScheduleById(id);

      if (!fixedSchedule) {
        return res.status(404).json({ error: 'Cours planifié non trouvé' });
      }

      res.json(fixedSchedule);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Créer un nouveau cours planifié
  async createFixedSchedule(req: Request, res: Response) {
    try {
      console.log('Requête de création de cours reçue:', req.body);

      // Extraction des données avec valeurs par défaut
      const courseName = req.body.courseName || '';
      const level = req.body.level || 'bbg';
      const teacherName = req.body.teacherName || '';
      const day = req.body.day || 'monday';
      const time = req.body.time || '20:00';
      const duration = parseInt(req.body.duration) || 60;
      const telegramGroup = req.body.telegramGroup || '';
      const zoomHostEmail = req.body.zoomHostEmail || '';

      // Validation simplifiée
      if (!courseName || !teacherName) {
        return res.status(400).json({ error: 'Le nom du cours et le nom du professeur sont requis' });
      }

      // Création du cours avec des données sécurisées
      const courseData = {
        courseName,
        level,
        teacherName,
        day,
        time,
        duration,
        telegramGroup,
        zoomHostEmail,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      console.log('Données du cours à créer (après traitement):', courseData);

      // Insertion directe dans la base de données pour éviter les problèmes
      const result = await db.insert(schema.fixedSchedules).values(courseData).run();
      const insertedId = result.lastInsertRowid as number;

      // Récupération du cours créé
      const fixedSchedule = await db.select().from(schema.fixedSchedules)
        .where(eq(schema.fixedSchedules.id, insertedId))
        .get();

      console.log('Cours créé avec succès:', fixedSchedule);

      // Réponse avec le cours créé
      return res.status(201).json(fixedSchedule || { id: insertedId, ...courseData });
    } catch (error) {
      console.error('Erreur lors de la création du cours:', error);
      return res.status(500).json({ error: error.message || 'Erreur interne du serveur' });
    }
  }

  // Supprimer un cours planifié
  async deleteFixedSchedule(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const success = await fixedScheduleService.deleteFixedSchedule(id);

      if (!success) {
        return res.status(404).json({ error: 'Cours planifié non trouvé' });
      }

      res.json({ success: true, message: 'Cours supprimé avec succès' });
    } catch (error) {
      console.error('Erreur lors de la suppression du cours:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Mettre à jour un cours planifié
  async updateFixedSchedule(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { courseName, level, teacherName, telegramGroup, zoomHostEmail } = req.body;

      const fixedSchedule = await fixedScheduleService.updateFixedSchedule(id, {
        courseName,
        level,
        teacherName,
        telegramGroup,
        zoomHostEmail
      });

      if (!fixedSchedule) {
        return res.status(404).json({ error: 'Cours planifié non trouvé' });
      }

      res.json(fixedSchedule);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Activer ou désactiver un cours planifié
  async toggleFixedScheduleStatus(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'Le paramètre isActive doit être un booléen' });
      }

      const fixedSchedule = await fixedScheduleService.toggleFixedScheduleStatus(id, isActive);

      if (!fixedSchedule) {
        return res.status(404).json({ error: 'Cours planifié non trouvé' });
      }

      res.json(fixedSchedule);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Importer le planning fixe depuis un fichier CSV
  async importFromCSV(req: Request, res: Response) {
    try {
      const filePath = req.file?.path;

      if (!filePath) {
        return res.status(400).json({ error: 'Aucun fichier CSV fourni' });
      }

      const fixedSchedules = await fixedScheduleService.importFromCSV(filePath);
      res.json({ message: 'Planning fixe importé avec succès', count: fixedSchedules.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Importer le planning fixe depuis le fichier CSV par défaut
  async importFromDefaultCSV(req: Request, res: Response) {
    try {
      console.log('Importation du planning fixe depuis le fichier par défaut...');

      // Utiliser le chemin par défaut
      const fixedSchedules = await fixedScheduleService.importFromCSV();

      console.log(`Planning fixe importé avec succès: ${fixedSchedules.length} cours importés`);
      res.json({ message: 'Planning fixe importé avec succès', count: fixedSchedules.length });
    } catch (error) {
      console.error('Erreur lors de l\'importation du planning fixe:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Insérer les données réelles directement
  async insertRealData(req: Request, res: Response) {
    try {
      console.log('Insertion des données réelles dans la base de données...');

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

      // Créer un log de succès
      await automationLogsService.createLog(
        LogType.IMPORT,
        LogStatus.SUCCESS,
        `Données réelles insérées avec succès: ${insertedCount} cours insérés`,
        { count: insertedCount }
      );

      res.json({ message: 'Données réelles insérées avec succès', count: insertedCount });
    } catch (error) {
      console.error('Erreur lors de l\'insertion des données réelles:', error);

      // Créer un log d'erreur
      await automationLogsService.createLog(
        LogType.IMPORT,
        LogStatus.ERROR,
        'Erreur lors de l\'insertion des données réelles',
        { error: error.message }
      );

      res.status(500).json({ error: error.message });
    }
  }

  // Créer une réunion Zoom pour un cours planifié
  async createZoomMeeting(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const zoomMeeting = await zoomService.createMeetingForFixedSchedule(id);
      res.json(zoomMeeting);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Envoyer un message pour un cours planifié
  async sendCourseMessage(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const result = await telegramService.sendCourseMessage(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Envoyer un message de rappel pour un cours planifié
  async sendReminderMessage(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const result = await telegramService.sendReminderMessage(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Exécuter manuellement la tâche de création des réunions Zoom
  async manuallyCreateZoomMeetings(req: Request, res: Response) {
    try {
      await schedulerService.manuallyCreateZoomMeetings();
      res.json({ message: 'Tâche de création des réunions Zoom exécutée avec succès' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Exécuter manuellement la tâche d'envoi des messages de cours
  async manuallySendCourseMessages(req: Request, res: Response) {
    try {
      const { day } = req.query;
      await schedulerService.manuallySendCourseMessages(day as string);
      res.json({ message: 'Tâche d\'envoi des messages de cours exécutée avec succès' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Récupérer les réunions Zoom pour un cours planifié
  async getZoomMeetings(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const zoomMeetings = await zoomService.getZoomMeetingsByFixedSchedule(id);
      res.json(zoomMeetings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Récupérer les logs d'automatisation pour un cours planifié
  async getAutomationLogs(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const logs = await automationLogsService.getLogsByFixedSchedule(id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

// Exporter une instance du contrôleur
export const fixedScheduleController = new FixedScheduleController();
