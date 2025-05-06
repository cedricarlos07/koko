// Script pour importer directement le planning fixe depuis un fichier Excel
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Database from 'better-sqlite3';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Chemin vers le fichier de base de données SQLite
const dbPath = './data/kodjo-english-v2.db';
console.log(`Utilisation de la base de données SQLite: ${dbPath}`);

// Créer une connexion à la base de données SQLite
const db = new Database(dbPath);

// Fonction pour normaliser le jour de la semaine
function normalizeDay(day) {
  if (!day) return 'monday';

  const normalizedDay = day.toLowerCase().trim();

  switch (normalizedDay) {
    case 'monday':
    case 'lundi':
      return 'monday';
    case 'tuesday':
    case 'mardi':
      return 'tuesday';
    case 'wednesday':
    case 'mercredi':
      return 'wednesday';
    case 'thursday':
    case 'jeudi':
      return 'thursday';
    case 'friday':
    case 'vendredi':
      return 'friday';
    case 'saturday':
    case 'samedi':
      return 'saturday';
    case 'sunday':
    case 'dimanche':
      return 'sunday';
    default:
      console.warn(`Jour de la semaine non reconnu: ${day}, utilisation de 'monday' par défaut`);
      return 'monday';
  }
}

// Fonction pour normaliser le niveau de cours
function normalizeLevel(level) {
  if (!level) return 'bbg';

  const normalizedLevel = level.toLowerCase().trim();

  // Mapping des niveaux CECR vers les niveaux BBG/ABG/IG
  switch (normalizedLevel) {
    case 'a1':
    case 'a2':
    case 'beginner':
    case 'elementary':
    case 'bbg':
      return 'bbg';
    case 'b1':
    case 'b2':
    case 'intermediate':
    case 'abg':
      return 'abg';
    case 'c1':
    case 'c2':
    case 'advanced':
    case 'ig':
      return 'ig';
    default:
      // Par défaut, on utilise 'bbg'
      return 'bbg';
  }
}

// Fonction pour importer le planning fixe depuis un fichier Excel
async function importFromExcel(filePath) {
  try {
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Le fichier ${filePath} n'existe pas.`);
    }

    console.log(`Lecture du fichier Excel: ${filePath}`);

    // Lire le fichier Excel
    const workbook = XLSX.readFile(filePath);

    // Obtenir le nom de la première feuille (Dynamic Schedule)
    const dynamicSheetName = workbook.SheetNames[0];
    const fixSheetName = 'Fix Schedule';

    // Vérifier si la feuille "Fix Schedule" existe
    if (!workbook.SheetNames.includes(fixSheetName)) {
      console.warn(`La feuille "${fixSheetName}" n'existe pas dans le fichier Excel. Utilisation de la feuille par défaut.`);
    }

    // Obtenir les feuilles de calcul
    const dynamicWorksheet = workbook.Sheets[dynamicSheetName];
    const fixWorksheet = workbook.SheetNames.includes(fixSheetName) ? workbook.Sheets[fixSheetName] : null;

    // Convertir les feuilles en JSON
    const data = XLSX.utils.sheet_to_json(dynamicWorksheet);
    const fixData = fixWorksheet ? XLSX.utils.sheet_to_json(fixWorksheet) : [];

    // Créer une map des identifiants de chat Telegram par coach et heure
    const telegramGroupMap = new Map();
    const telegramGroupsById = new Map(); // Map pour stocker tous les groupes par ID

    if (fixData.length > 0) {
      console.log(`Nombre d'enregistrements trouvés dans la feuille Fix Schedule: ${fixData.length}`);

      // Compter les groupes Telegram uniques
      const uniqueGroups = new Set();
      fixData.forEach(record => {
        if (record['TELEGRAM GROUP ID']) {
          uniqueGroups.add(record['TELEGRAM GROUP ID']);
        }
      });
      console.log(`Nombre de groupes Telegram uniques dans la feuille Fix Schedule: ${uniqueGroups.size}`);

      fixData.forEach(record => {
        // Utiliser la colonne 'Salma Choufani' pour le nom du coach
        // Si elle n'existe pas, essayer d'autres colonnes
        let coach = '';
        if (record['Salma Choufani']) {
          coach = record['Salma Choufani'];
        } else if (record['Coach']) {
          coach = record['Coach'];
        } else if (record['ASSISTANT']) {
          coach = record['ASSISTANT'];
        }

        const time = record['TIME (GMT) '] || '';
        const telegramGroupId = record['TELEGRAM GROUP ID'];

        if (coach && time && telegramGroupId) {
          // Mapper par coach et heure
          const key = `${coach}-${time}`;
          telegramGroupMap.set(key, telegramGroupId);

          // Stocker tous les groupes par ID
          if (!telegramGroupsById.has(telegramGroupId)) {
            telegramGroupsById.set(telegramGroupId, {
              coach,
              time,
              telegramGroupId
            });
          }

          console.log(`Groupe Telegram mappé: ${coach} - ${time} -> ${telegramGroupId}`);
        }
      });

      console.log(`Nombre total de groupes Telegram mappés: ${telegramGroupsById.size}`);
    }

    console.log(`Nombre d'enregistrements trouvés: ${data.length}`);

    if (data.length > 0) {
      console.log('Premier enregistrement:', JSON.stringify(data[0], null, 2));

      // Analyser les en-têtes pour déterminer le format
      const headers = Object.keys(data[0]);
      console.log('En-têtes détectés:', headers);
    }

    // Convertir les enregistrements en objets FixedSchedule
    let fixedSchedules = [];
    let uniqueCourses = new Map(); // Map pour détecter les doublons

    // Traiter chaque enregistrement
    data.forEach((record) => {
      // Extraire les informations pertinentes en fonction des en-têtes disponibles
      const topicParts = (record['Topic '] || '').split('-').map(part => part.trim());

      // Extraire le nom du cours, le niveau et le jour/heure
      let courseName = topicParts[0] || '';
      let level = topicParts.length > 1 ? topicParts[1] : '';
      let dayTime = topicParts.length > 2 ? topicParts[2] : '';

      // Conserver le suffixe original (MW, SS, etc.) pour l'affichage
      let daysSuffix = '';
      if (dayTime && dayTime.trim()) {
        // Extraire le suffixe (MW, TT, etc.)
        const suffixMatch = dayTime.match(/([A-Za-z]+)/);
        if (suffixMatch) {
          daysSuffix = suffixMatch[0].trim();
        }
      }

      // Extraire le jour et l'heure
      let day = '';
      let time = '';

      if (dayTime) {
        // Exemple: "MW - 7:30pm" -> jours = ["monday", "wednesday"], time = "19:30"
        // Créer un tableau pour stocker les jours
        const days = [];

        // Vérifier chaque jour possible
        if (dayTime.includes('M')) days.push('monday');
        if (dayTime.includes('T') && !dayTime.includes('Th')) days.push('tuesday');
        if (dayTime.includes('W')) days.push('wednesday');
        if (dayTime.includes('Th')) days.push('thursday');
        if (dayTime.includes('F')) days.push('friday');
        if (dayTime.includes('Sa')) days.push('saturday');
        if (dayTime.includes('Su')) days.push('sunday');

        // Si au moins un jour a été trouvé, utiliser le premier
        if (days.length > 0) {
          day = days[0];
        }

        // Extraire l'heure
        const timeMatch = dayTime.match(/\d+:\d+(?:am|pm)/i);
        if (timeMatch) {
          const timeStr = timeMatch[0];
          // Convertir en format 24h
          const isPM = timeStr.toLowerCase().includes('pm');
          const [hourStr, minuteStr] = timeStr.replace(/(?:am|pm)/i, '').split(':');
          let hour = parseInt(hourStr, 10);
          const minute = parseInt(minuteStr, 10);

          if (isPM && hour < 12) hour += 12;
          if (!isPM && hour === 12) hour = 0;

          time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }
      }

      const teacherName = record['Coach'] || '';
      const duration = parseInt(record['Duration (Min)'] || '60', 10);
      // Extraire le groupe Telegram à partir de la map des identifiants de chat Telegram
      let telegramGroup = '';
      const gmtTime = record['TIME (GMT) '] || '';

      // Essayer de trouver l'identifiant de chat Telegram dans la map
      const key = `${teacherName}-${gmtTime}`;
      const telegramGroupId = telegramGroupMap.get(key);

      if (telegramGroupId) {
        // Utiliser l'identifiant de chat Telegram de la feuille Fix Schedule
        // Les identifiants de groupes Telegram sont des nombres négatifs (ex: -1001280305339)
        telegramGroup = telegramGroupId.toString();
        console.log(`Utilisation de l'identifiant de chat Telegram pour ${teacherName} à ${gmtTime}: ${telegramGroup}`);
      } else {
        // Si le champ TIME (GMT) contient un nom de groupe Telegram, l'utiliser
        if (gmtTime && gmtTime.includes('@')) {
          const match = gmtTime.match(/@[\w_]+/);
          if (match) {
            telegramGroup = match[0];
          }
        }

        // Si aucun groupe n'a été trouvé, générer un nom basé sur le nom du coach
        if (!telegramGroup) {
          // Nettoyer le nom du coach pour créer un nom de groupe valide
          const cleanCoachName = teacherName
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '') // Supprimer tous les caractères non alphanumériques sauf _
            .replace(/\s+/g, ''); // Supprimer les espaces

          telegramGroup = `@${cleanCoachName}_group`;
        }
      }
      const zoomHostEmail = record['Schedule for'] || '';

      // Normaliser le jour de la semaine
      const normalizedDay = normalizeDay(day);

      // Créer un tableau pour stocker les jours
      const days = [];

      // Vérifier chaque jour possible dans dayTime
      if (dayTime) {
        if (dayTime.includes('M')) days.push('monday');
        if (dayTime.includes('T') && !dayTime.includes('Th')) days.push('tuesday');
        if (dayTime.includes('W')) days.push('wednesday');
        if (dayTime.includes('Th')) days.push('thursday');
        if (dayTime.includes('F')) days.push('friday');
        if (dayTime.includes('Sa')) days.push('saturday');
        if (dayTime.includes('Su')) days.push('sunday');
      }

      // Si aucun jour n'a été trouvé, utiliser le jour normalisé
      if (days.length === 0) {
        days.push(normalizedDay);
      }

      // Créer un objet pour chaque jour
      const scheduleObjects = days.map(day => {
        // Ajouter le suffixe au nom du cours s'il existe
        const courseNameWithSuffix = daysSuffix
          ? `${courseName} (${daysSuffix})`
          : courseName;

        return {
          courseName: courseNameWithSuffix,
          level: normalizeLevel(level),
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
      });

      // Ajouter les objets au tableau s'ils ont un nom de cours et un nom de professeur
      // Éviter les doublons en utilisant une clé unique
      scheduleObjects.forEach(schedule => {
        if (schedule.courseName && schedule.teacherName) {
          // Créer une clé unique pour ce cours (nom + niveau + jour + heure + professeur)
          const key = `${schedule.courseName}-${schedule.level}-${schedule.day}-${schedule.time}-${schedule.teacherName}`;

          // Vérifier si ce cours existe déjà
          if (!uniqueCourses.has(key)) {
            uniqueCourses.set(key, schedule);
            fixedSchedules.push(schedule);
          }
        }
      });
    });

    console.log(`Nombre de cours planifiés valides: ${fixedSchedules.length}`);

    // Supprimer les anciens enregistrements et les réunions Zoom associées
    db.prepare('DELETE FROM zoom_meetings').run();
    db.prepare('DELETE FROM fixed_schedules').run();
    console.log('Anciens enregistrements et réunions Zoom supprimés');

    // Ajouter des enregistrements pour tous les groupes Telegram uniques qui n'ont pas été mappés
    // Cela garantit que tous les groupes Telegram sont importés
    telegramGroupsById.forEach((groupInfo, telegramGroupId) => {
      // Vérifier si ce groupe est déjà utilisé dans un cours planifié
      const isUsed = fixedSchedules.some(schedule =>
        schedule.telegramGroup === telegramGroupId.toString());

      // Si le groupe n'est pas utilisé, créer un enregistrement spécial pour lui
      if (!isUsed) {
        // Extraire le suffixe des jours si présent dans le nom du groupe
        let daysSuffix = '';
        const originalRecord = fixData.find(record => record['TELEGRAM GROUP ID'] === telegramGroupId);
        if (originalRecord && originalRecord['Salma Choufani - ABG - SS - 2:00pm']) {
          const topicParts = originalRecord['Salma Choufani - ABG - SS - 2:00pm'].split('-').map(part => part.trim());
          if (topicParts.length > 2) {
            const dayTime = topicParts[2];
            const suffixMatch = dayTime.match(/([A-Za-z]+)/);
            if (suffixMatch) {
              daysSuffix = suffixMatch[0].trim();
            }
          }
        }

        const courseNameWithSuffix = daysSuffix
          ? `Groupe de ${groupInfo.coach} (${daysSuffix})`
          : `Groupe de ${groupInfo.coach}`;

        const specialSchedule = {
          courseName: courseNameWithSuffix,
          level: 'bbg', // Niveau par défaut
          teacherName: groupInfo.coach,
          day: 'monday', // Jour par défaut
          time: groupInfo.time.replace('GMT', '').trim(),
          duration: 60, // Durée par défaut
          telegramGroup: telegramGroupId.toString(),
          zoomHostEmail: '',
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        fixedSchedules.push(specialSchedule);
        console.log(`Ajout d'un enregistrement spécial pour le groupe Telegram ${telegramGroupId}`);
      }
    });

    // Préparer la requête d'insertion
    const insertStmt = db.prepare(`
      INSERT INTO fixed_schedules (
        course_name, level, teacher_name, day, time, duration,
        telegram_group, zoom_host_email, is_active, created_at, updated_at
      ) VALUES (
        @courseName, @level, @teacherName, @day, @time, @duration,
        @telegramGroup, @zoomHostEmail, @isActive, @createdAt, @updatedAt
      )
    `);

    // Insérer les nouveaux enregistrements
    for (const schedule of fixedSchedules) {
      try {
        // Convertir les valeurs booléennes en entiers pour SQLite
        const params = {
          courseName: String(schedule.courseName || ''),
          level: String(schedule.level || 'bbg'),
          teacherName: String(schedule.teacherName || ''),
          day: String(schedule.day || 'monday'),
          time: String(schedule.time || '00:00'),
          duration: Number(schedule.duration || 60),
          telegramGroup: String(schedule.telegramGroup || ''),
          zoomHostEmail: String(schedule.zoomHostEmail || ''),
          isActive: Number(schedule.isActive ? 1 : 0),
          createdAt: Number(schedule.createdAt || Date.now()),
          updatedAt: Number(schedule.updatedAt || Date.now())
        };

        insertStmt.run(params);
        console.log(`Cours planifié créé: ${params.courseName} le ${params.day} à ${params.time}`);
      } catch (error) {
        console.error(`Erreur lors de l'insertion du cours: ${error.message}`);
      }
    }

    console.log('Importation du planning fixe terminée avec succès');
    return fixedSchedules;
  } catch (error) {
    console.error('Erreur lors de l\'importation du planning fixe:', error);
    throw error;
  } finally {
    // Fermer la connexion à la base de données
    db.close();
  }
}

// Chemin vers le fichier Excel
const excelFilePath = path.resolve(__dirname, '../Kodjo English - Classes Schedules (2).xlsx');

// Importer le planning fixe
importFromExcel(excelFilePath).then(() => {
  console.log('Script d\'importation terminé');
}).catch(error => {
  console.error('Erreur dans le script d\'importation:', error);
});
