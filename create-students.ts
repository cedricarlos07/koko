import { db } from './server/db';
import { users, UserRole } from './shared/schema';
import { eq } from 'drizzle-orm';

async function createSampleStudents() {
  const students = [
    { firstName: 'Sophie', lastName: 'Martin', email: 'sophie.martin@example.com' },
    { firstName: 'Thomas', lastName: 'Bernard', email: 'thomas.bernard@example.com' },
    { firstName: 'Emma', lastName: 'Dubois', email: 'emma.dubois@example.com' },
    { firstName: 'Lucas', lastName: 'Robert', email: 'lucas.robert@example.com' },
    { firstName: 'Chloé', lastName: 'Richard', email: 'chloe.richard@example.com' },
    { firstName: 'Hugo', lastName: 'Petit', email: 'hugo.petit@example.com' },
    { firstName: 'Léa', lastName: 'Leroy', email: 'lea.leroy@example.com' },
    { firstName: 'Noah', lastName: 'Moreau', email: 'noah.moreau@example.com' },
    { firstName: 'Jade', lastName: 'Simon', email: 'jade.simon@example.com' },
    { firstName: 'Louis', lastName: 'Michel', email: 'louis.michel@example.com' },
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
        password: 'b0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // 'secret'
        role: UserRole.STUDENT,
        points: Math.floor(Math.random() * 100),
        createdAt: new Date(),
      });
      count++;
      console.log(`Created student: ${student.firstName} ${student.lastName}`);
    }
  }
  
  console.log(`Created ${count} sample students`);
}

// Run the update
createSampleStudents()
  .then(() => console.log('Done'))
  .catch(err => console.error('Error:', err))
  .finally(() => process.exit(0));
