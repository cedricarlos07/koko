import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { db } from './db';
import { 
  courses, 
  users, 
  sessions, 
  UserRole, 
  UserRoleType,
  CourseLevel,
  CourseLevelType,
} from '@shared/schema';
import { eq } from 'drizzle-orm';

// Course name mapping for the different types
type CourseCodeMap = {
  [key: string]: {
    name: string;
    level: keyof typeof CourseLevel;
  }
};

const COURSE_CODE_MAP: CourseCodeMap = {
  'BBG': { name: 'Business Beginners', level: 'BBG' },
  'ABG': { name: 'Academic Beginners', level: 'ABG' },
  'ZBG': { name: 'Conversational Beginners', level: 'BBG' }, // Using BBG as fallback
  'IG': { name: 'Intermediate General', level: 'IG' },
  'IAG': { name: 'Intermediate Academic', level: 'IG' }, // Using IG as fallback
};

// Day code mapping
const DAY_CODE_MAP: { [key: string]: string } = {
  'MW': 'Monday-Wednesday',
  'TT': 'Tuesday-Thursday',
  'FS': 'Friday-Saturday',
  'SS': 'Saturday-Sunday',
};

export async function importSessions() {
  try {
    // Make sure we have an admin user
    await createAdminIfNeeded();

    // Read and parse CSV file - use correct path
    const data = readFileSync('./attached_assets/Kodjo English - Classes Schedules - Dynamic Schedule.csv', 'utf8');
    const records = parse(data, {
      columns: true, // Use first line as column names
      skip_empty_lines: true,
      trim: true
    });

    console.log(`Parsed ${records.length} sessions from CSV`);

    // Track our progress
    let processedCount = 0;
    let createdCourses = 0;
    let createdProfessors = 0;
    let createdSessions = 0;
    let errors = 0;

    // Process each record
    for (const record of records) {
      try {
        processedCount++;
        const topic = record['Topic '] || '';
        const duration = parseInt(record['Duration (Min)'] || '60');
        const coach = record['Coach'] || '';
        const email = record['Schedule for'] || '';
        const date = record['Start Date & Time'] ? new Date(record['Start Date & Time']) : new Date();
        const zoomLink = record['Zoom Link'] || '';
        const zoomId = record['ZOOM ID'] || '';
        const timeGmt = record['TIME (GMT) '] || '';
        const timeFrance = record['TIME (France)'] || '';

        // Parse the topic to extract course info
        const parts = topic.split('-').map((p: string) => p.trim());
        
        // Default values in case parsing fails
        let coachName = coach;
        let courseCode = 'BBG';
        let dayCode = 'MW';
        let time = '19:00';
        
        // Try to parse the parts if available
        if (parts.length >= 1) coachName = parts[0].trim();
        
        // Extract course code from parts
        for (const part of parts) {
          for (const code of Object.keys(COURSE_CODE_MAP)) {
            if (part.includes(code)) {
              courseCode = code;
              break;
            }
          }
        }
        
        // Extract day code from parts
        for (const part of parts) {
          for (const code of Object.keys(DAY_CODE_MAP)) {
            if (part.includes(code)) {
              dayCode = code;
              break;
            }
          }
        }
        
        // Find or create professor
        const nameParts = coachName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        let professor = await db.select().from(users)
          .where(eq(users.email, email))
          .then(results => results[0]);
          
        if (!professor) {
          const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
          
          professor = await db.insert(users).values({
            username,
            email,
            firstName,
            lastName,
            password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // 'secret'
            role: UserRole.PROFESSOR,
            points: 0,
            createdAt: new Date(),
          }).returning().then(results => results[0]);
          
          createdProfessors++;
          console.log(`Created new professor: ${firstName} ${lastName} (${email})`);
        } else if (!professor.firstName || !professor.lastName) {
          // Update professor with missing name
          await db.update(users)
            .set({
              firstName: firstName || professor.firstName,
              lastName: lastName || professor.lastName
            })
            .where(eq(users.id, professor.id))
            .returning();
            
          console.log(`Updated professor: ${firstName} ${lastName} (${email})`);
        }
        
        // Find a suitable course name
        const courseInfo = COURSE_CODE_MAP[courseCode] || { 
          name: 'General English', 
          level: 'BBG' as keyof typeof CourseLevel
        };
        
        const courseName = `${courseInfo.name} (${DAY_CODE_MAP[dayCode] || dayCode})`;
        
        // Find or create course
        let course = await db.select().from(courses)
          .where(eq(courses.name, courseName))
          .then(results => results[0]);
          
        if (!course) {
          course = await db.insert(courses).values({
            name: courseName,
            level: CourseLevel[courseInfo.level],
            description: `${courseInfo.name} classes on ${DAY_CODE_MAP[dayCode] || dayCode}`,
            createdAt: new Date(),
          }).returning().then(results => results[0]);
          
          createdCourses++;
          console.log(`Created new course: ${course.name}`);
        }
        
        // Get time from GMT time string
        let scheduledTime = "00:00";
        
        // First try to get time from GMT time string
        const timeMatch = timeGmt.match(/(\d+)h\s*(\d+)?/);
        if (timeMatch) {
          const hours = timeMatch[1].padStart(2, '0');
          const minutes = timeMatch[2] ? timeMatch[2].padStart(2, '0') : '00';
          scheduledTime = `${hours}:${minutes}`;
        } 
        // If that fails, extract from datetime
        else if (date instanceof Date) {
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          scheduledTime = `${hours}:${minutes}`;
        }
        
        console.log(`Extracted time for session: ${scheduledTime} from ${timeGmt} or ${date}`);
        
        
        // Check if session already exists
        const existingSession = await db.select().from(sessions)
          .where(eq(sessions.zoomMeetingId, zoomId))
          .then(results => results[0]);
          
        if (!existingSession) {
          const session = await db.insert(sessions).values({
            courseId: course.id,
            professorId: professor.id,
            scheduledDate: date,
            scheduledTime,
            timeZone: "GMT",
            sessionNumber: Math.floor(Math.random() * 10) + 1, // Random session number 1-10
            status: 'scheduled',
            zoomMeetingId: zoomId,
            zoomMeetingUrl: zoomLink,
          }).returning().then(results => results[0]);
          
          createdSessions++;
          console.log(`Created new session for course: ${course.name} at ${new Date(session.scheduledDate).toLocaleString()}`);
        } else if (existingSession.scheduledTime === "00:00" && scheduledTime !== "00:00") {
          // Update session with correct time if needed
          await db.update(sessions)
            .set({ scheduledTime })
            .where(eq(sessions.id, existingSession.id))
            .returning();
          console.log(`Updated session with Zoom ID ${zoomId}, set time to ${scheduledTime}`);
        } else {
          console.log(`Session with Zoom ID ${zoomId} already exists, skipping`);
        }
      } catch (error) {
        errors++;
        console.error(`Error processing record ${processedCount}:`, error);
      }
    }

    console.log('Import completed successfully');
    console.log(`Summary: ${processedCount} records processed`);
    console.log(`- ${createdProfessors} new professors created`);
    console.log(`- ${createdCourses} new courses created`);
    console.log(`- ${createdSessions} new sessions created`);
    console.log(`- ${errors} errors encountered`);
    
    return { 
      success: true, 
      processed: processedCount,
      professors: createdProfessors,
      courses: createdCourses,
      sessions: createdSessions,
      errors: errors
    };
  } catch (error) {
    console.error('Error importing sessions:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Helper function to create admin user if it doesn't exist
async function createAdminIfNeeded() {
  const adminExists = await db.select().from(users)
    .where(eq(users.username, 'admin'))
    .then(results => results.length > 0);
    
  if (!adminExists) {
    await db.insert(users).values({
      username: 'admin',
      email: 'admin@kodjo.english',
      firstName: 'Admin',
      lastName: 'User',
      password: '$2b$10$wq8C2jXBwzlWsHQltQ/38.NZ3MkIPpx5XpXkJQJ15TRRwW1dGRQme', // 'password'
      role: UserRole.ADMIN,
      points: 100,
      createdAt: new Date(),
    });
    console.log('Created admin user');
  }
}

// Add some students to the system
async function createSampleStudents() {
  const students = [
    { firstName: 'Sophie', lastName: 'Martin', email: 'sophie.martin@example.com' },
    { firstName: 'Thomas', lastName: 'Bernard', email: 'thomas.bernard@example.com' },
    { firstName: 'Emma', lastName: 'Dubois', email: 'emma.dubois@example.com' },
    { firstName: 'Lucas', lastName: 'Robert', email: 'lucas.robert@example.com' },
    { firstName: 'Chloé', lastName: 'Richard', email: 'chloe.richard@example.com' },
  ];
  
  let count = 0;
  for (const student of students) {
    const exists = await db.select().from(users)
      .where(eq(users.email, student.email))
      .then(results => results.length > 0);
      
    if (!exists) {
      await db.insert(users).values({
        username: student.email.split('@')[0],
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
        password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // 'secret'
        role: UserRole.STUDENT as UserRoleType,
        points: Math.floor(Math.random() * 100),
        createdAt: new Date(),
      });
      count++;
    }
  }
  
  console.log(`Created ${count} sample students`);
}

// Update professors with missing names
async function updateProfessorNames() {
  // Map usernames to proper names
  const nameMapping = {
    'keitamaimouna': { firstName: 'Maimouna', lastName: 'Keita' },
    'wissamj8': { firstName: 'Wissam', lastName: 'Jahjah' },
    'hafidafaraj': { firstName: 'Hafida', lastName: 'Faraj' },
    'missmiriamou': { firstName: 'Miriam', lastName: 'Ouadah' },
    'jahnvimahtani03': { firstName: 'Jahnvi', lastName: 'Mahtani' },
    'syaby': { firstName: 'Sy', lastName: 'Aby' },
    'hanaeelkraid': { firstName: 'Hanae', lastName: 'El Kraid' },
    'nfaiq89': { firstName: 'Nada', lastName: 'Faiq' }
  };

  // Get all professors with missing names
  const professors = await db.select().from(users)
    .where(eq(users.role, UserRole.PROFESSOR))
    .then(results => results.filter(user => !user.firstName || !user.lastName));

  let updatedCount = 0;
  for (const professor of professors) {
    const mapping = nameMapping[professor.username];
    
    if (mapping) {
      await db.update(users)
        .set({
          firstName: mapping.firstName,
          lastName: mapping.lastName
        })
        .where(eq(users.id, professor.id))
        .returning();
      
      console.log(`Updated professor name: ${mapping.firstName} ${mapping.lastName} (${professor.email})`);
      updatedCount++;
    }
  }
  
  console.log(`Updated ${updatedCount} professor names`);
}

// Entry point - run the import process
async function main() {
  try {
    // Import sessions from CSV
    const importResult = await importSessions();
    console.log('Import result:', importResult);
    
    // Create sample students
    await createSampleStudents();
    
    // Update professor names
    await updateProfessorNames();
    
    console.log('All data imported successfully');
  } catch (error) {
    console.error('Import process failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the import
main();