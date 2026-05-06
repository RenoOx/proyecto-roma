// Importamos el cliente de Prisma
import { PrismaClient } from "@prisma/client";

// Creamos una sola instancia de Prisma para toda la app
// Una instancia = una conexión a la base de datos
const prisma = new PrismaClient();

export default prisma;