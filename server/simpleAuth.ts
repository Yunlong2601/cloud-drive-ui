import type { Express, RequestHandler } from "express";
import session from "express-session";

export interface SimpleUser {
  id: string;
  username: string;
  role: "user" | "admin";
  firstName: string;
  lastName: string;
  email: string;
}

const USERS: { username: string; password: string; user: SimpleUser }[] = [
  {
    username: "user",
    password: "user123",
    user: {
      id: "user-1",
      username: "user",
      role: "user",
      firstName: "Regular",
      lastName: "User",
      email: "user@cloudvault.demo",
    },
  },
  {
    username: "admin",
    password: "admin123",
    user: {
      id: "admin-1",
      username: "admin",
      role: "admin",
      firstName: "Admin",
      lastName: "User",
      email: "admin@cloudvault.demo",
    },
  },
];

declare module "express-session" {
  interface SessionData {
    user?: SimpleUser;
  }
}

export function setupSimpleAuth(app: Express) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const found = USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (!found) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    req.session.user = found.user;
    res.json({ user: found.user });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  console.log("Simple authentication setup complete");
  console.log("Credentials: user/user123 (user role), admin/admin123 (admin role)");
}

export const isSimpleAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
};

export const isAdmin: RequestHandler = (req, res, next) => {
  if (req.session.user?.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
};
