import express from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { UserRole } from '@shared/schema';
import { zoomService } from '../services/zoom-service';

const router = express.Router();

// Middleware pour vérifier si l'utilisateur est authentifié
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Vous devez être connecté pour accéder à cette ressource.' });
  }
  next();
};

// Middleware pour vérifier si l'utilisateur est administrateur
const isAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: 'Accès refusé. Vous devez être administrateur.' });
  }
  next();
};

// Récupérer toutes les réunions Zoom
router.get('/zoom/meetings', isAuthenticated, async (req, res) => {
  try {
    const meetings = await zoomService.getAllZoomMeetings();
    
    // Récupérer les informations des cours pour chaque réunion
    const meetingsWithCourseInfo = await Promise.all(meetings.map(async (meeting) => {
      const fixedSchedule = await db.select()
        .from(schema.fixedSchedules)
        .where(schema.fixedSchedules.id == meeting.fixedScheduleId)
        .get();
      
      return {
        ...meeting,
        courseName: fixedSchedule?.courseName || 'Cours inconnu',
        teacherName: fixedSchedule?.teacherName || 'Enseignant inconnu',
        level: fixedSchedule?.level || 'Niveau inconnu',
        day: fixedSchedule?.day || 'Jour inconnu',
        time: fixedSchedule?.time || 'Heure inconnue'
      };
    }));
    
    res.json(meetingsWithCourseInfo);
  } catch (error) {
    console.error('Erreur lors de la récupération des réunions Zoom:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des réunions Zoom' });
  }
});

// Récupérer les participants d'une réunion Zoom
router.get('/zoom/meetings/:meetingId/participants', isAuthenticated, async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    // Récupérer les participants depuis la base de données
    const participants = await db.select()
      .from(schema.zoomParticipants)
      .where(schema.zoomParticipants.zoomMeetingId == meetingId)
      .all();
    
    // Si aucun participant n'est trouvé, essayer de les récupérer via l'API Zoom
    if (participants.length === 0) {
      try {
        const savedCount = await zoomService.saveParticipants(meetingId);
        
        if (savedCount > 0) {
          // Récupérer les participants nouvellement enregistrés
          const newParticipants = await db.select()
            .from(schema.zoomParticipants)
            .where(schema.zoomParticipants.zoomMeetingId == meetingId)
            .all();
          
          return res.json(newParticipants);
        }
      } catch (apiError) {
        console.error(`Erreur lors de la récupération des participants via l'API Zoom:`, apiError);
      }
    }
    
    res.json(participants);
  } catch (error) {
    console.error('Erreur lors de la récupération des participants:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des participants' });
  }
});

// Récupérer les statistiques d'une réunion Zoom
router.get('/zoom/meetings/:meetingId/stats', isAuthenticated, async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    // Récupérer les statistiques
    const stats = await zoomService.getMeetingStats(meetingId);
    
    if (!stats) {
      return res.status(404).json({ message: 'Statistiques non trouvées' });
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

// Récupérer les statistiques de toutes les réunions Zoom
router.get('/zoom/stats', isAuthenticated, async (req, res) => {
  try {
    const stats = await zoomService.getAllMeetingStats();
    
    // Récupérer les informations des cours pour chaque réunion
    const statsWithCourseInfo = await Promise.all(stats.map(async (stat) => {
      const fixedSchedule = await db.select()
        .from(schema.fixedSchedules)
        .where(schema.fixedSchedules.id == stat.fixedScheduleId)
        .get();
      
      return {
        ...stat,
        courseName: fixedSchedule?.courseName || 'Cours inconnu',
        teacherName: fixedSchedule?.teacherName || 'Enseignant inconnu',
        level: fixedSchedule?.level || 'Niveau inconnu'
      };
    }));
    
    res.json(statsWithCourseInfo);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

// Rafraîchir les statistiques d'une réunion Zoom
router.post('/zoom/meetings/:meetingId/refresh-stats', isAuthenticated, async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    // Supprimer les participants existants
    await db.delete(schema.zoomParticipants)
      .where(schema.zoomParticipants.zoomMeetingId == meetingId)
      .run();
    
    // Supprimer les statistiques existantes
    await db.delete(schema.zoomMeetingStats)
      .where(schema.zoomMeetingStats.zoomMeetingId == meetingId)
      .run();
    
    // Récupérer et enregistrer les nouveaux participants
    const savedCount = await zoomService.saveParticipants(meetingId);
    
    // Récupérer les nouvelles statistiques
    const stats = await zoomService.getMeetingStats(meetingId);
    
    res.json({
      message: 'Statistiques rafraîchies avec succès',
      participantsCount: savedCount,
      stats
    });
  } catch (error) {
    console.error('Erreur lors du rafraîchissement des statistiques:', error);
    res.status(500).json({ message: 'Erreur lors du rafraîchissement des statistiques' });
  }
});

export default router;
