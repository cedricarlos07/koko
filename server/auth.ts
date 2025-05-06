import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema-sqlite";
import SQLiteStore from "better-sqlite3-session-store";
import { sqlite } from "./db";

const SQLiteStoreFactory = SQLiteStore(session);

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// Middleware to check if user has admin role
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user && (req.user as User).role === "admin") {
    return next();
  }
  res.status(403).json({ error: "Forbidden: Admin access required" });
}

// Middleware to check if user has professor role or higher
export function isProfessorOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user && ((req.user as User).role === "admin" || (req.user as User).role === "professor")) {
    return next();
  }
  res.status(403).json({ error: "Forbidden: Professor or Admin access required" });
}

export function setupAuth(app: Express) {
  // Initialize session storage with SQLite
  const sessionStore = new SQLiteStoreFactory({
    client: sqlite,
    expired: {
      clear: true,
      intervalMs: 900000 // 15min
    }
  });

  // Session configuration
  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'kodjo-english-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Incorrect username or password" });
      }

      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return done(null, false, { message: "Incorrect username or password" });
      }

      // Update last login time
      await storage.updateUser(user.id, {
        lastLogin: Date.now(),
      });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  // Serialization for session
  passport.serializeUser((user, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Authentication routes
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(req.body.password);

      // Create new user with hashed password
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        points: 0,
        createdAt: new Date(),
      });

      // Log activity
      await storage.logActivity({
        type: "registration",
        description: `User ${user.username} registered`,
        userId: user.id,
        createdAt: new Date(),
      });

      // Log the user in
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }

        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        return res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).json({ error: info.message || "Login failed" });
      }

      req.login(user, async (err) => {
        if (err) {
          return next(err);
        }

        try {
          // Log activity
          await storage.logActivity({
            type: "login",
            description: `User ${user.username} logged in`,
            userId: user.id,
            createdAt: new Date(),
          });

          // Remove password from response
          const { password, ...userWithoutPassword } = user;
          return res.json(userWithoutPassword);
        } catch (error) {
          next(error);
        }
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    // Log activity if user was logged in
    if (req.user) {
      storage.logActivity({
        type: "logout",
        description: `User ${(req.user as User).username} logged out`,
        userId: (req.user as User).id,
        createdAt: new Date(),
      }).catch(console.error);
    }

    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Error during logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });
}