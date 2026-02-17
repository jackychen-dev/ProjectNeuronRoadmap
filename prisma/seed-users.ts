/**
 * Seed only the user accounts (idempotent — skips existing users).
 * Usage: npx tsx prisma/seed-users.ts
 *
 * All users get the default password: password123
 * They should change it after first login.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEAM_USERS = [
  { email: "admin@neuron.dev",  name: "Admin User",  role: "ADMIN"  },
  { email: "dq@neuron.dev",     name: "Dan Q.",      role: "ADMIN"  },
  { email: "jc@neuron.dev",     name: "Jacky C.",    role: "MEMBER" },
  { email: "ab@neuron.dev",     name: "Anita B.",    role: "MEMBER" },
  { email: "mk@neuron.dev",     name: "Mike K.",     role: "MEMBER" },
  { email: "sr@neuron.dev",     name: "Sara R.",     role: "MEMBER" },
  { email: "tl@neuron.dev",     name: "Tom L.",      role: "MEMBER" },
  { email: "np@neuron.dev",     name: "Nina P.",     role: "MEMBER" },
  { email: "rg@neuron.dev",     name: "Ryan G.",     role: "MEMBER" },
  { email: "lw@neuron.dev",     name: "Lisa W.",     role: "MEMBER" },
];

async function main() {
  const hash = await bcrypt.hash("password123", 10);

  for (const u of TEAM_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`  ⏭  ${u.email} already exists`);
      continue;
    }
    await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        passwordHash: hash,
        role: u.role,
      },
    });
    console.log(`  ✅ Created ${u.email} (${u.role})`);
  }

  console.log(`\nDone. All passwords are: password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

