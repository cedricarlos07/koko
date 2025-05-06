import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { telegramService } from './telegram-service';
import { LogStatus, LogType, automationLogsService } from './automation-logs-service';

// Interface pour les périodes
interface Period {
  start: number;
  end: number;
  name: string;
}

// Classe pour gérer les badges et les statistiques de participation
class TelegramBadgesService {
  // Récupérer tous les badges
  async getAllBadges() {
    try {
      return await db.select().from(schema.telegramBadges).all();
    } catch (error) {
      console.error('Erreur lors de la récupération des badges:', error);
      return [];
    }
  }

  // Récupérer un badge par son ID
  async getBadgeById(id: number) {
    try {
      return await db.select().from(schema.telegramBadges).where(eq(schema.telegramBadges.id, id)).get();
    } catch (error) {
      console.error(`Erreur lors de la récupération du badge ${id}:`, error);
      return null;
    }
  }

  // Récupérer tous les étudiants d'un groupe Telegram
  async getStudentsByGroupId(groupId: string) {
    try {
      return await db.select().from(schema.telegramStudents).where(eq(schema.telegramStudents.telegramGroupId, groupId)).all();
    } catch (error) {
      console.error(`Erreur lors de la récupération des étudiants du groupe ${groupId}:`, error);
      return [];
    }
  }

  // Récupérer les statistiques de participation d'un étudiant pour une période donnée
  async getStudentParticipationStats(studentId: number, groupId: string, periodStart: number, periodEnd: number) {
    try {
      return await db.select()
        .from(schema.telegramParticipationStats)
        .where(
          and(
            eq(schema.telegramParticipationStats.telegramStudentId, studentId),
            eq(schema.telegramParticipationStats.telegramGroupId, groupId),
            gte(schema.telegramParticipationStats.periodEnd, periodStart),
            lte(schema.telegramParticipationStats.periodStart, periodEnd)
          )
        )
        .get();
    } catch (error) {
      console.error(`Erreur lors de la récupération des statistiques de participation de l'étudiant ${studentId}:`, error);
      return null;
    }
  }

  // Récupérer les badges d'un étudiant
  async getStudentBadges(studentId: number) {
    try {
      // Joindre les tables pour récupérer les informations des badges
      const studentBadges = await db.select({
        id: schema.telegramStudentBadges.id,
        telegramStudentId: schema.telegramStudentBadges.telegramStudentId,
        telegramGroupId: schema.telegramStudentBadges.telegramGroupId,
        periodStart: schema.telegramStudentBadges.periodStart,
        periodEnd: schema.telegramStudentBadges.periodEnd,
        awardedAt: schema.telegramStudentBadges.awardedAt,
        badgeId: schema.telegramBadges.id,
        badgeName: schema.telegramBadges.name,
        badgeDescription: schema.telegramBadges.description,
        badgeIcon: schema.telegramBadges.icon,
        badgeColor: schema.telegramBadges.color
      })
        .from(schema.telegramStudentBadges)
        .innerJoin(
          schema.telegramBadges,
          eq(schema.telegramStudentBadges.telegramBadgeId, schema.telegramBadges.id)
        )
        .where(eq(schema.telegramStudentBadges.telegramStudentId, studentId))
        .all();

      return studentBadges;
    } catch (error) {
      console.error(`Erreur lors de la récupération des badges de l'étudiant ${studentId}:`, error);
      return [];
    }
  }

  // Créer ou mettre à jour un étudiant
  async createOrUpdateStudent(studentData: {
    telegramUserId: string;
    telegramUsername?: string;
    telegramFirstName?: string;
    telegramLastName?: string;
    telegramGroupId: string;
  }) {
    try {
      // Vérifier si l'étudiant existe déjà
      const existingStudent = await db.select()
        .from(schema.telegramStudents)
        .where(
          and(
            eq(schema.telegramStudents.telegramUserId, studentData.telegramUserId),
            eq(schema.telegramStudents.telegramGroupId, studentData.telegramGroupId)
          )
        )
        .get();

      const now = Date.now();

      if (existingStudent) {
        // Mettre à jour l'étudiant existant
        await db.update(schema.telegramStudents)
          .set({
            telegramUsername: studentData.telegramUsername,
            telegramFirstName: studentData.telegramFirstName,
            telegramLastName: studentData.telegramLastName,
            updatedAt: now
          })
          .where(eq(schema.telegramStudents.id, existingStudent.id))
          .run();

        return existingStudent.id;
      } else {
        // Créer un nouvel étudiant
        const result = await db.insert(schema.telegramStudents)
          .values({
            telegramUserId: studentData.telegramUserId,
            telegramUsername: studentData.telegramUsername,
            telegramFirstName: studentData.telegramFirstName,
            telegramLastName: studentData.telegramLastName,
            telegramGroupId: studentData.telegramGroupId,
            createdAt: now,
            updatedAt: now
          })
          .run();

        return result.lastInsertRowid;
      }
    } catch (error) {
      console.error(`Erreur lors de la création/mise à jour de l'étudiant:`, error);
      return null;
    }
  }

  // Mettre à jour les statistiques de participation d'un étudiant
  async updateParticipationStats(statsData: {
    telegramStudentId: number;
    telegramGroupId: string;
    messageCount: number;
    reactionCount: number;
    mediaCount: number;
    periodStart: number;
    periodEnd: number;
  }) {
    try {
      // Calculer le score total
      const totalScore = statsData.messageCount * 1 + statsData.reactionCount * 0.5 + statsData.mediaCount * 2;

      // Vérifier si des statistiques existent déjà pour cette période
      const existingStats = await db.select()
        .from(schema.telegramParticipationStats)
        .where(
          and(
            eq(schema.telegramParticipationStats.telegramStudentId, statsData.telegramStudentId),
            eq(schema.telegramParticipationStats.telegramGroupId, statsData.telegramGroupId),
            eq(schema.telegramParticipationStats.periodStart, statsData.periodStart),
            eq(schema.telegramParticipationStats.periodEnd, statsData.periodEnd)
          )
        )
        .get();

      const now = Date.now();

      if (existingStats) {
        // Mettre à jour les statistiques existantes
        await db.update(schema.telegramParticipationStats)
          .set({
            messageCount: statsData.messageCount,
            reactionCount: statsData.reactionCount,
            mediaCount: statsData.mediaCount,
            totalScore,
            updatedAt: now
          })
          .where(eq(schema.telegramParticipationStats.id, existingStats.id))
          .run();

        return existingStats.id;
      } else {
        // Créer de nouvelles statistiques
        const result = await db.insert(schema.telegramParticipationStats)
          .values({
            telegramStudentId: statsData.telegramStudentId,
            telegramGroupId: statsData.telegramGroupId,
            messageCount: statsData.messageCount,
            reactionCount: statsData.reactionCount,
            mediaCount: statsData.mediaCount,
            totalScore,
            periodStart: statsData.periodStart,
            periodEnd: statsData.periodEnd,
            createdAt: now,
            updatedAt: now
          })
          .run();

        return result.lastInsertRowid;
      }
    } catch (error) {
      console.error(`Erreur lors de la mise à jour des statistiques de participation:`, error);
      return null;
    }
  }

  // Attribuer un badge à un étudiant
  async awardBadgeToStudent(badgeData: {
    telegramStudentId: number;
    telegramBadgeId: number;
    telegramGroupId: string;
    periodStart: number;
    periodEnd: number;
  }) {
    try {
      // Vérifier si le badge a déjà été attribué pour cette période
      const existingBadge = await db.select()
        .from(schema.telegramStudentBadges)
        .where(
          and(
            eq(schema.telegramStudentBadges.telegramStudentId, badgeData.telegramStudentId),
            eq(schema.telegramStudentBadges.telegramBadgeId, badgeData.telegramBadgeId),
            eq(schema.telegramStudentBadges.telegramGroupId, badgeData.telegramGroupId),
            eq(schema.telegramStudentBadges.periodStart, badgeData.periodStart),
            eq(schema.telegramStudentBadges.periodEnd, badgeData.periodEnd)
          )
        )
        .get();

      const now = Date.now();

      if (existingBadge) {
        // Le badge a déjà été attribué
        return existingBadge.id;
      } else {
        // Attribuer le badge
        const result = await db.insert(schema.telegramStudentBadges)
          .values({
            telegramStudentId: badgeData.telegramStudentId,
            telegramBadgeId: badgeData.telegramBadgeId,
            telegramGroupId: badgeData.telegramGroupId,
            periodStart: badgeData.periodStart,
            periodEnd: badgeData.periodEnd,
            awardedAt: now,
            createdAt: now,
            updatedAt: now
          })
          .run();

        // Créer un log pour l'attribution du badge
        const student = await db.select().from(schema.telegramStudents).where(eq(schema.telegramStudents.id, badgeData.telegramStudentId)).get();
        const badge = await db.select().from(schema.telegramBadges).where(eq(schema.telegramBadges.id, badgeData.telegramBadgeId)).get();

        if (student && badge) {
          await automationLogsService.createLog(
            LogType.TELEGRAM_MESSAGE,
            LogStatus.SUCCESS,
            `Badge "${badge.name}" attribué à ${student.telegramFirstName || student.telegramUsername || student.telegramUserId} dans le groupe ${badgeData.telegramGroupId}`,
            {
              studentId: badgeData.telegramStudentId,
              badgeId: badgeData.telegramBadgeId,
              groupId: badgeData.telegramGroupId,
              periodStart: badgeData.periodStart,
              periodEnd: badgeData.periodEnd
            }
          );
        }

        return result.lastInsertRowid;
      }
    } catch (error) {
      console.error(`Erreur lors de l'attribution du badge:`, error);
      return null;
    }
  }

  // Récupérer les meilleurs étudiants d'un groupe pour une période donnée
  async getTopStudentsForPeriod(groupId: string, periodStart: number, periodEnd: number, limit = 5) {
    try {
      // Récupérer les statistiques de participation pour la période
      const topStudents = await db.select({
        studentId: schema.telegramParticipationStats.telegramStudentId,
        telegramUserId: schema.telegramStudents.telegramUserId,
        telegramUsername: schema.telegramStudents.telegramUsername,
        telegramFirstName: schema.telegramStudents.telegramFirstName,
        telegramLastName: schema.telegramStudents.telegramLastName,
        messageCount: schema.telegramParticipationStats.messageCount,
        reactionCount: schema.telegramParticipationStats.reactionCount,
        mediaCount: schema.telegramParticipationStats.mediaCount,
        totalScore: schema.telegramParticipationStats.totalScore
      })
        .from(schema.telegramParticipationStats)
        .innerJoin(
          schema.telegramStudents,
          eq(schema.telegramParticipationStats.telegramStudentId, schema.telegramStudents.id)
        )
        .where(
          and(
            eq(schema.telegramParticipationStats.telegramGroupId, groupId),
            gte(schema.telegramParticipationStats.periodEnd, periodStart),
            lte(schema.telegramParticipationStats.periodStart, periodEnd)
          )
        )
        .orderBy(desc(schema.telegramParticipationStats.totalScore))
        .limit(limit)
        .all();

      return topStudents;
    } catch (error) {
      console.error(`Erreur lors de la récupération des meilleurs étudiants pour le groupe ${groupId}:`, error);
      return [];
    }
  }

  // Attribuer des badges aux meilleurs étudiants d'un groupe pour une période donnée
  async awardBadgesToTopStudents(groupId: string, periodStart: number, periodEnd: number) {
    try {
      // Récupérer les badges disponibles
      const badges = await this.getAllBadges();
      if (badges.length === 0) {
        console.error('Aucun badge disponible');
        return false;
      }

      // Récupérer les meilleurs étudiants pour chaque catégorie
      const topStudents = await this.getTopStudentsForPeriod(groupId, periodStart, periodEnd, 10);
      if (topStudents.length === 0) {
        console.error(`Aucun étudiant trouvé pour le groupe ${groupId} durant la période spécifiée`);
        return false;
      }

      // Attribuer le badge "Participation Star" à l'étudiant avec le meilleur score total
      const participationStarBadge = badges.find(badge => badge.name === 'Participation Star');
      if (participationStarBadge && topStudents.length > 0) {
        await this.awardBadgeToStudent({
          telegramStudentId: topStudents[0].studentId,
          telegramBadgeId: participationStarBadge.id,
          telegramGroupId: groupId,
          periodStart,
          periodEnd
        });
      }

      // Attribuer le badge "Media Master" à l'étudiant avec le plus de médias
      const mediaMasterBadge = badges.find(badge => badge.name === 'Media Master');
      if (mediaMasterBadge) {
        const topMediaStudent = [...topStudents].sort((a, b) => b.mediaCount - a.mediaCount)[0];
        if (topMediaStudent && topMediaStudent.mediaCount > 0) {
          await this.awardBadgeToStudent({
            telegramStudentId: topMediaStudent.studentId,
            telegramBadgeId: mediaMasterBadge.id,
            telegramGroupId: groupId,
            periodStart,
            periodEnd
          });
        }
      }

      // Attribuer le badge "Reaction King" à l'étudiant avec le plus de réactions
      const reactionKingBadge = badges.find(badge => badge.name === 'Reaction King');
      if (reactionKingBadge) {
        const topReactionStudent = [...topStudents].sort((a, b) => b.reactionCount - a.reactionCount)[0];
        if (topReactionStudent && topReactionStudent.reactionCount > 0) {
          await this.awardBadgeToStudent({
            telegramStudentId: topReactionStudent.studentId,
            telegramBadgeId: reactionKingBadge.id,
            telegramGroupId: groupId,
            periodStart,
            periodEnd
          });
        }
      }

      // Créer un log pour l'attribution des badges
      await automationLogsService.createLog(
        LogType.TELEGRAM_MESSAGE,
        LogStatus.SUCCESS,
        `Badges attribués aux meilleurs étudiants du groupe ${groupId} pour la période du ${new Date(periodStart).toLocaleDateString()} au ${new Date(periodEnd).toLocaleDateString()}`,
        {
          groupId,
          periodStart,
          periodEnd,
          topStudents: topStudents.map(student => ({
            id: student.studentId,
            name: student.telegramFirstName || student.telegramUsername || student.telegramUserId,
            totalScore: student.totalScore
          }))
        }
      );

      return true;
    } catch (error) {
      console.error(`Erreur lors de l'attribution des badges aux meilleurs étudiants:`, error);
      return false;
    }
  }

  // Générer des périodes (semaine, mois, trimestre)
  generatePeriods(): Period[] {
    const now = new Date();
    const periods: Period[] = [];

    // Semaine dernière
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 7);
    lastWeekStart.setHours(0, 0, 0, 0);
    const lastWeekEnd = new Date(now);
    lastWeekEnd.setHours(23, 59, 59, 999);
    periods.push({
      start: lastWeekStart.getTime(),
      end: lastWeekEnd.getTime(),
      name: 'Semaine dernière'
    });

    // Mois dernier
    const lastMonthStart = new Date(now);
    lastMonthStart.setMonth(now.getMonth() - 1);
    lastMonthStart.setDate(1);
    lastMonthStart.setHours(0, 0, 0, 0);
    const lastMonthEnd = new Date(now);
    lastMonthEnd.setDate(0); // Dernier jour du mois précédent
    lastMonthEnd.setHours(23, 59, 59, 999);
    periods.push({
      start: lastMonthStart.getTime(),
      end: lastMonthEnd.getTime(),
      name: 'Mois dernier'
    });

    // Trimestre dernier
    const lastQuarterStart = new Date(now);
    lastQuarterStart.setMonth(Math.floor(now.getMonth() / 3) * 3 - 3);
    lastQuarterStart.setDate(1);
    lastQuarterStart.setHours(0, 0, 0, 0);
    const lastQuarterEnd = new Date(lastQuarterStart);
    lastQuarterEnd.setMonth(lastQuarterStart.getMonth() + 3);
    lastQuarterEnd.setDate(0); // Dernier jour du trimestre
    lastQuarterEnd.setHours(23, 59, 59, 999);
    periods.push({
      start: lastQuarterStart.getTime(),
      end: lastQuarterEnd.getTime(),
      name: 'Trimestre dernier'
    });

    return periods;
  }

  // Simuler la participation des étudiants pour un groupe
  async simulateStudentParticipation(groupId: string, periodStart: number, periodEnd: number, studentCount = 10) {
    try {
      // Créer des étudiants fictifs
      const studentIds: number[] = [];
      for (let i = 1; i <= studentCount; i++) {
        const studentId = await this.createOrUpdateStudent({
          telegramUserId: `user${i}_${groupId}`,
          telegramUsername: `student${i}`,
          telegramFirstName: `Student`,
          telegramLastName: `${i}`,
          telegramGroupId: groupId
        });

        if (studentId) {
          studentIds.push(Number(studentId));
        }
      }

      // Simuler la participation pour chaque étudiant
      for (const studentId of studentIds) {
        // Générer des statistiques aléatoires
        const messageCount = Math.floor(Math.random() * 50) + 1; // 1-50 messages
        const reactionCount = Math.floor(Math.random() * 30); // 0-30 réactions
        const mediaCount = Math.floor(Math.random() * 10); // 0-10 médias

        await this.updateParticipationStats({
          telegramStudentId: studentId,
          telegramGroupId: groupId,
          messageCount,
          reactionCount,
          mediaCount,
          periodStart,
          periodEnd
        });
      }

      // Attribuer des badges aux meilleurs étudiants
      await this.awardBadgesToTopStudents(groupId, periodStart, periodEnd);

      return true;
    } catch (error) {
      console.error(`Erreur lors de la simulation de la participation des étudiants:`, error);
      return false;
    }
  }

  // Simuler la participation pour tous les groupes et toutes les périodes
  async simulateParticipationForAllGroups() {
    try {
      // Récupérer tous les groupes Telegram
      const fixedSchedules = await db.select().from(schema.fixedSchedules).all();
      const telegramGroups = [...new Set(fixedSchedules.filter(schedule => schedule.telegram_group).map(schedule => schedule.telegram_group))];

      // Générer des périodes
      const periods = this.generatePeriods();

      // Simuler la participation pour chaque groupe et chaque période
      for (const groupId of telegramGroups) {
        for (const period of periods) {
          await this.simulateStudentParticipation(groupId, period.start, period.end);
        }
      }

      return true;
    } catch (error) {
      console.error(`Erreur lors de la simulation de la participation pour tous les groupes:`, error);
      return false;
    }
  }
}

// Exporter une instance du service
export const telegramBadgesService = new TelegramBadgesService();
