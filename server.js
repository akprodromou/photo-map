const http = require('http');
const { hostname } = require('os');
const express = require("express");
const session = require("express-session");
const app = express();

app.use(session({
  secret: "nocode",
  resave: false,
  saveUninitialized: false,
}));

const port = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const passport = require("passport");
const bcrypt = require("bcrypt");
const LocalStrategy = require("passport-local").Strategy;
const flash = require("express-flash");
const methodOverride = require("method-override");
const fs = require("fs");
const multer = require("multer");
const ejs = require('ejs');
const path = require("path");

// SQL prerequisites
const sqlite3 = require("sqlite3").verbose();

// open the database
// const dbusers = new sqlite3.Database(path.join(__dirname, "public/uploads/images/users.db"));
// const dbmarkers = new sqlite3.Database(path.join(__dirname, "public/uploads/images/markers.db"));

const dbusers = new sqlite3.Database("/public/uploads/images/users.db");
const dbmarkers = new sqlite3.Database("/public/uploads/images/markers.db");

// use the express.static middleware to serve the static files in the "public" directory
app.use('/public', express.static('public'))

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(appRoot, "public/uploads/images")); // Set the destination folder for uploaded images
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extname = path.extname(file.originalname);
    cb(null, uniqueSuffix + extname); // Generate a unique filename for the uploaded image
  },
});

// Create a multer upload instance
const upload = multer({ storage: storage });

app.use((req, res, next) => {
  if (req.url.endsWith(".css")) {
    res.setHeader("Content-Type", "text/css");
  } else if (req.url.endsWith(".js")) {
    res.setHeader("Content-Type", "text/javascript");
  }
  next();
});

// create a table called users
dbusers.run(
  `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT,
  password TEXT,
  email TEXT
)`,
  function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Users table created successfully");
    }
  }
);

// create a table called markers
dbmarkers.run(
  `CREATE TABLE IF NOT EXISTS markers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lat REAL,
  lng REAL,
  image BLOB,
  date DATETIME,
  caption TEXT
)`,
  function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Markers table created successfully");
    }
  }
);

// Configure and initialize Passport.js
const initializePassport = (passport) => {
  passport.use(
    new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
      const statement = dbusers.prepare("SELECT * FROM users WHERE email = ?");
      statement.get(email, (err, row) => {
        if (err) {
          return done(err);
        }
        if (!row) {
          return done(null, false, { message: "No user with that email" });
        }
        bcrypt.compare(password, row.password, (err, result) => {
          if (err) {
            return done(err);
          }
          if (result) {
            return done(null, row);
          } else {
            return done(null, false, { message: "Password incorrect" });
          }
        });
      });
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    const statement = dbusers.prepare("SELECT * FROM users WHERE id = ?");
    statement.get(id, (err, row) => {
      if (err) {
        return done(err);
      }
      done(null, row);
    });
  });
};

initializePassport(passport);

// Set the view engine to EJS
app.set("view-engine", "ejs");

// Add middleware for parsing URL-encoded bodies, flash messages, session management, Passport, and method override
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride("_method"));


// Login users
app.get("/login", checkNotAuthenticated, (req, res) => {
  res.render("login.ejs");
});

app.post("/login", passport.authenticate("local", {
  successRedirect: "/index",
  failureRedirect: "/login",
  failureFlash: true
}), (req, res) => {
  isAuthenticated = true;
});

app.delete("/logout", (req, res) => {
  req.logOut();
  res.redirect("/login");
});

// Register user requests
app.get("/register", checkNotAuthenticated, (req, res) => {
  res.render("register.ejs");
});

app.post("/register", checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const statement = dbusers.prepare(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)"
    );
    statement.run(req.body.name, req.body.email, hashedPassword);
    statement.finalize();
    res.redirect("/login");
  } catch {
    res.redirect("/register");
  }
});

// Markers 
// get markers
app.get("/markers", (req, res) => {
  dbmarkers.all("SELECT * FROM markers", (err, markers) => {
    if (err) {
      console.log("Error fetching markers:", err);
      res.sendStatus(500);
    } else {
      const parsedMarkers = markers.map((marker) => ({
        markerId: marker.id, // Include the markerId in the response
        lat: marker.lat,
        lng: marker.lng,
        photo: `data:image/jpeg;base64,${marker.image.toString("base64")}`,
        date: marker.date,
        caption: marker.caption,
      }));
      res.json(parsedMarkers);
    }
  });
});

// add new endpoint to save markers
app.post("/markers", checkAuthenticated, upload.single("image"), async (req, res) => {
  const { lat, lng, date, caption } = req.body;
  const image = req.file;
  try {
    const imageBuffer = fs.readFileSync(image.path); // Read the image file using fs.readFileSync
    await dbmarkers.run(
      "INSERT INTO markers (lat, lng, image, date, caption) VALUES (?, ?, ?, ?, ?)",
      [lat, lng, imageBuffer, date, caption],
      function (err) {
        if (err) {
          console.log(err);
          res.status(500).json({ message: "Error saving marker" });
        } else {
          const markerId = this.lastID; // Use "this" to refer to the dbmarkers object
          res.status(200).json({ markerId: markerId }); // Return the markerId in the response
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error saving marker" });
  } 
});

// Server-side endpoint that handles requests for specific markers
// Retrieve marker data endpoint
app.get('/markers/:id', (req, res) => {
  const markerId = req.params.id;
  // Retrieve the marker data for the given id from your data source
  dbmarkers.get(
    "SELECT * FROM markers WHERE id = ?",
    [markerId],
    (err, row) => {
      if (err) {
        console.error("Error retrieving marker data:", err);
        res.status(500).send("Error retrieving marker data");
      } else if (!row) {
        res.status(404).send("Marker not found");
      } else {
        const markerData = row; // Assuming row contains the marker data
        // Render the marker.ejs template and pass the markerData
        ejs.renderFile('views/marker.ejs', { markerData }, (err, html) => {
          if (err) {
            console.error("Error rendering marker template:", err);
            res.status(500).send("Error rendering marker template");
          } else {
            res.status(200).send(html);
          }
        });
      }
    }
  );
});


// Display the edit page
app.get('/markers/:id/edit', checkAuthenticated, (req, res) => {
  const markerId = req.params.id;
  dbmarkers.get(
    "SELECT * FROM markers WHERE id = ?",
    [markerId],
    (err, row) => {
      if (err) {
        console.error("Error retrieving marker data:", err);
        res.status(500).send("Error retrieving marker data");
      } else if (!row) {
        res.status(404).send("Marker not found");
      } else {
        const markerData = row;
        res.render("edit.ejs", { markerData }); // Render the edit.ejs template and pass the markerData
      }
    }
  );
});

// Handle the form submission to update the marker
app.post('/markers/:id/edit', checkAuthenticated, (req, res) => {
  const markerId = req.params.id;
  const { lat, lng, date, caption } = req.body;

  // Update the marker data in the database
  dbmarkers.run(
    "UPDATE markers SET lat = ?, lng = ?, date = ?, caption = ? WHERE id = ?",
    [lat, lng, date, caption, markerId],
    (err) => {
      if (err) {
        console.error("Error updating marker data:", err);
        res.status(500).send("Error updating marker data");
      } else {
        res.redirect("/index"); // Redirect to the markers page after successful update
      }
    }
  );
});


// Browsing 
app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/index", (req, res) => {
  res.render("index.ejs");
});

// middleware function to check if a user is authenticated
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  // Redirect to login page if not authenticated
  res.redirect("/login");
}

// middleware function to check if a user is not authenticated
function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/index");
  }
  next();
}

// Check authentication
app.get("/check-authentication", function (req, res) {
  const isAuthenticated = req.isAuthenticated(); 
  res.json({ isAuthenticated: isAuthenticated });
});

// Start the server
app.listen(port, () => {
  console.log(`Started on port ${port}`);
});


