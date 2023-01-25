import dayjs from "dayjs";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "./lib/prisma";

//toda função de rotas tem q ser async
export async function appRoutes(app: FastifyInstance) {
  /**
   * Método HTTP: Get, Post, Put, Patch, Delete
   */

  //Criação de hábito
  app.post("/habits", async (request) => {
    //corpo da requisição para criar um novo habito
    //esta variável é um objeto com o titutlo e os dias da semana, que vai ser um array de números de 0 a 6
    //[0, 1, 2, 3, 4, 5, 6] => Domingo, Segunda, Terça
    const createHabitBody = z.object({
      title: z.string(),
      weekDays: z.array(z.number().min(0).max(6)),
    });

    //recebe o title e o weekDays
    const { title, weekDays } = createHabitBody.parse(request.body);

    const today = dayjs().startOf("day").toDate();

    //chama o método create habit
    await prisma.habit.create({
      //os dados são title e created_at
      //o prisma permite criar as chaves estrangeiras
      data: {
        title,
        created_at: today,
        weekDays: {
          //Percorre os weekDays para cada dia da semana, retorna um objeto com as informações a serem inseridas
          //retorna o week_day vai ser o weekDay recebido como parâmetro, dessa forma, um array de dias
          create: weekDays.map((weekDay) => {
            return {
              week_day: weekDay,
            };
          }),
        },
      },
    });
  });

  //Detalhe do dia (hábitos completos/possíveis)
  app.get("/day", async (request) => {
    //Usando o zod, crio uma constante
    //Qual dia eu estou visualizando
    const getDayParams = z.object({
      //vou receber uma string e para transformar ela em date
      //coerce é um método do zod
      date: z.coerce.date(),
    });

    //o request query: http://localhost:3333/day?date=2022-01-13T00
    const { date } = getDayParams.parse(request.query);

    const parsedDate = dayjs(date).startOf("day");
    const weekDay = parsedDate.get("day");

    // os hábitos possíveis
    // hábitos que já foram completados

    const possibleHabits = await prisma.habit.findMany({
      //cria o join automaticamente
      where: {
        created_at: {
          lte: date,
        },
        //none, every, some
        weekDays: {
          some: {
            week_day: weekDay,
          },
        },
      },
    });

    //day pode ser vazio
    const day = await prisma.day.findUnique({
      //dia onde a data seja a passada
      where: {
        date: parsedDate.toDate(),
      },
      include: { dayHabits: true },
    });

    //verifica se o dia esta vazio, percorre o dia e retorna o id_habit
    const completedHabits = day?.dayHabits.map((dayHabit) => {
      return dayHabit.habit_id;
    });

    return {
      possibleHabits,
      completedHabits,
    };
  });
}
