import { serve } from "@hono/node-server";
import { PrismaClient } from "./prisma";
import { Hono } from "hono";

const prisma = new PrismaClient();
const app = new Hono();

//add customer details
app.post("/customers", async (c) => {
  const { name, email, phoneNumber, address } = await c.req.json();
  try {
    const customerId = await prisma.customers.findFirst({
      where: {
        OR: [{ email: email }, { phoneNumber: phoneNumber }],
      },
    });
    if (customerId) {
      return c.json({ message: "Bad Request" }, 400);
    }
    const customer = await prisma.customers.create({
      data: {
        name,
        email,
        phoneNumber,
        address,
      },
    });
    return c.json({ message: "Customer created successfully", customer }, 201);
  } catch (e) {
    console.log(e);
  }
});

serve(app);
console.log("Server ON!");
