import { createAdminUser } from '../lib/admin/createAdminUser';

async function main() {
  try {
    const result = await createAdminUser(
      'julioverasb@gmail.com',
      'Prueba55'
    );
    console.log('Admin user created:', result);
  } catch (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  }
}

main();