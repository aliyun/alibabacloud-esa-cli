import { resources, deleteTestProject } from './cloud-client.mjs';
const failures = [];
for (const name of resources()) {
  try {
    await deleteTestProject(name);
    console.log(`Cleaned ${name}`);
  } catch {
    failures.push(name);
  }
}
if (failures.length)
  throw new Error(`Clean these test projects manually: ${failures.join(', ')}`);
