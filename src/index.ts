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

app.post("/orders", async (c) => {
  try {
    const { customerId, restaurantId, items } = await c.req.json();

    // Validate customer and restaurant
    const customer = await prisma.customers.findUnique({
      where: { id: Number(customerId) },
    });
    const restaurant = await prisma.restaurants.findUnique({
      where: { id: Number(restaurantId) },
    });

    if (!customer) return c.json({ message: "Customer does not exist" }, 400);
    if (!restaurant)
      return c.json({ message: "Restaurant does not exist" }, 400);

    //Creating an order
    const order = await prisma.orders.create({
      data: {
        customerId: Number(customerId),
        RestaurantId: Number(restaurantId),
        status: "Placed",
        totalPrice: 0,
      },
    });

    let totalPrice = 0;

    for (const item of items) {
      const menuItem = await prisma.menuItems.findUnique({
        where: { id: Number(item.menuItemId) },
      });

      if (!menuItem || !menuItem.isAvailable) {
        return c.json(
          {
            message: `Menu item ID ${item.menuItemId} not found or unavailable`,
          },
          400
        );
      }

      const itemTotal = Number(menuItem.price) * item.quantity;
      totalPrice += itemTotal;

      // Create OrderItem table
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: menuItem.id,
          quantity: item.quantity,
        },
      });
    }

    // Step 3: Update  totalPrice
    const updatedOrder = await prisma.orders.update({
      where: { id: order.id },
      data: {
        totalPrice: totalPrice,
        status: "Placed",
      },
    });

    return c.json({ message: updatedOrder }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ message: "Failed to place order" }, 500);
  }
});

//Retrieve details of a  order by id
app.get("/orders/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const order = await prisma.orders.findUnique({
      where: { id: Number(id) },
    });
    if (!order) {
      return c.json({ message: "Order not found" }, 404);
    }
    return c.json(order, 200);
  } catch (error) {
    console.error(error);
    return c.json({ message: "Failed to retrieve order" }, 500);
  }
});

// Update the status of an order
app.patch("/orders/:id/status", async (c) => {
  try {
    const { id } = c.req.param();
    const { status } = await c.req.json();
    const order = await prisma.orders.update({
      where: { id: Number(id) },
      data: { status },
    });
    return c.json(order, 200);
  } catch (error) {
    console.error(error);
    return c.json({ message: "Failed to update order status" }, 500);
  }
});

//Get total revenue of  restaurant
app.get("/restaurants/:id/revenue", async (c) => {
  try {
    const { id } = c.req.param();
    const revenue = await prisma.orders.aggregate({
      where: { RestaurantId: Number(id) },
      _sum: { totalPrice: true },
    });
    return c.json(revenue, 200);
  } catch (error) {
    console.error(error);
    return c.json({ message: "Failed to retrieve revenue" }, 500);
  }
});

// Top items of a restaurant
app.get("/menu/top-items", async (c) => {
  try {
    const topItems = await prisma.orderItem.groupBy({
      by: ["menuItemId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 1,
    });
    const menuItem = topItems[0]
      ? await prisma.menuItems.findUnique({
          where: { id: topItems[0].menuItemId },
        })
      : null;
    return c.json(menuItem);
  } catch (error) {
    console.error(error);
    return c.json({ message: "Failed to retrieve top menu items" }, 500);
  }
});

//Top 5 customers
app.get("/customers/top", async (c) => {
  try {
    const topCustomers = await prisma.orders.groupBy({
      by: ["customerId"],
      _count: { customerId: true },
      orderBy: { _count: { customerId: "desc" } },
      take: 5,
    });

    const result = await Promise.all(
      topCustomers.map(async (entry) => {
        const customer = await prisma.customers.findUnique({
          where: { id: entry.customerId },
        });
        return { customer, orderCount: entry._count.customerId };
      })
    );

    return c.json(result);
  } catch (error) {
    console.error(error);
    return c.json({ message: "Failed to retrieve top customers" }, 500);
  }
});

serve(app);
console.log("Server ON!");
