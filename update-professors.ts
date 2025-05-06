import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

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
    'nfaiq89': { firstName: 'Nada', lastName: 'Faiq' },
    'rashaalasou': { firstName: 'Rasha', lastName: 'Alasou' }
  };

  for (const [username, name] of Object.entries(nameMapping)) {
    await db.update(users)
      .set({
        firstName: name.firstName,
        lastName: name.lastName
      })
      .where(eq(users.username, username));
    
    console.log(`Updated professor: ${name.firstName} ${name.lastName} (${username})`);
  }
  
  console.log('Professor names update completed');
}

// Run the update
updateProfessorNames()
  .then(() => console.log('Done'))
  .catch(err => console.error('Error:', err))
  .finally(() => process.exit(0));
