import { serve } from "@hono/node-server";
import { PrismaClient } from "./prisma";
import { Hono } from "hono";

const prisma = new PrismaClient();
const app = new Hono();

//Add customer details
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

//Retrieving customer details
app.get("/customers/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const customers = await prisma.customers.findMany({
      where: {
        id: Number(id),
      },
    });
    return c.json(customers, 200);
  } catch (e) {
    console.log(e);
  }
});

//Retrieving the orders placed by the customers
app.get("/customers/:id/orders", async (c) => {
  const id = Number(c.req.param("id"));
  try {
    const orders = await prisma.orders.findMany({
      where: { customerId: id },
      include: {
        OrderItem: { include: { menuItem: true } },
        RestId: true,
      },
    });

    if (!orders.length) {
      return c.json({ message: "No orders found" }, 404);
    }

    return c.json(orders, 200);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

//Registering a new Restaurant
app.post("/restaurants", async (c) => {
  const { name, location } = await c.req.json();
  try {
    const resname = await prisma.restaurants.findFirst({
      where: {
        name: name,
      },
    });
    if (resname) {
      return c.json({ message: "Restaurant already exists" }, 400);
    }
    const restaurant = await prisma.restaurants.create({
      data: {
        name,
        location,
      },
    });
    return c.json(restaurant, 201);
  } catch (e) {
    console.log(e);
  }
});

//Retrieving all the menu items available on the restaurant
app.get("/restaurants/:id/menu", async (c) => {
  const id = Number(c.req.param("id"));

  try {
    const menuItems = await prisma.restaurants.findMany({
      where: { id: id },
      include: { MenuItems: true },
    });

    if (!menuItems.length) {
      return c.json({ message: "No available menu items found" }, 404);
    }

    return c.json(menuItems, 200);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

//Adding Menu Items to a Restaurant
app.post("/restaurants/:id/menu", async (c) => {
  const ID = c.req.param("id");
  const { name, price } = await c.req.json();
  try {
    const res = await prisma.restaurants.findFirst({
      where: {
        id: Number(ID),
      },
    });
    const menu = await prisma.menuItems.create({
      data: {
        name: name,
        price: price,
        retaurantId: Number(ID),
      },
    });
    return c.json({ message: "Menu Item Added!", menu: menu }, 201);
  } catch (e) {
    console.log(e);
  }
});

//update availabitity or the price of a menu item
app.patch("/menu/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { price, isAvailable } = await c.req.json();

  try {
    const menuItem = await prisma.menuItems.findUnique({
      where: { id },
    });

    if (!menuItem) {
      return c.json({ error: "Menu item not found" }, 404);
    }

    const updatedMenuItem = await prisma.menuItems.update({
      where: { id },
      data: {
        price: price ?? menuItem.price,
        isAvailable: isAvailable ?? menuItem.isAvailable,
      },
    });

    return c.json(updatedMenuItem, 200);
  } catch (error) {
    console.error("Error updating menu item:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});


serve(app);
console.log("Server ON!");
