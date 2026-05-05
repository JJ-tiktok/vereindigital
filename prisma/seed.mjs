import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const prisma = new PrismaClient();

const permissions = [
  ["club.manage", "Vereinseinstellungen, Teams und Mitglieder verwalten."],
  ["team.manage", "Teamstammdaten verwalten."],
  ["team.members.manage", "Teammitglieder und Teamrollen verwalten."],
  ["roles.manage", "Rollen und Berechtigungen verwalten."],
  ["invitations.manage", "Einladungen erstellen, versenden und widerrufen."],
  ["calendar.events.read", "Teamkalender und Termine lesen."],
  ["calendar.events.manage", "Trainingseinheiten, Spiele und Events erstellen und bearbeiten."],
  ["attendance.self.manage", "Eigene Rueckmeldungen zu Terminen setzen."],
  ["attendance.manage", "Rueckmeldungen fuer Teammitglieder setzen und bearbeiten."],
  ["availability.self.manage", "Eigene Abwesenheiten verwalten."],
  ["availability.manage", "Abwesenheiten fuer Teammitglieder verwalten."],
  ["player.profile.self.update", "Eigene Spielerprofildaten bearbeiten."],
  ["player.profile.manage", "Spielerprofile im Team verwalten."],
  ["match.read", "Spieltage und Statistiken lesen."],
  ["match.manage", "Spieltage planen und bearbeiten."],
  ["match.stats.manage", "Spielerstatistiken erfassen und bearbeiten."],
  ["training.catalog.read", "Trainingskatalog lesen."],
  ["training.catalog.manage", "Uebungen im Trainingskatalog erstellen und bearbeiten."],
  ["training.plan.manage", "Trainingsplaene aus Uebungen zusammenstellen."],
];

async function main() {
  await prisma.permission.createMany({
    data: permissions.map(([key, description]) => ({ key, description })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${permissions.length} permissions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
