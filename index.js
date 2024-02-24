import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import crypto from "crypto";

const secretKey = crypto.randomBytes(32).toString('hex');

const app = express();
const port = 3000;


app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: true
}));

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "secrets",
    password: "golumaskara",
    port: 5432,
  });

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("home.ejs");
});
  
app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
      const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
      if (checkResult.rows.length > 0) {
          res.send("Email already exists. Try logging in.");
      } else {
          const result = await db.query("INSERT INTO users (email, password, secret_text) VALUES ($1, $2, $3)", [email, password, ""]);
          console.log(result);
          req.session.email = email;
          res.render("secrets.ejs", { secret: "" }); 
      }  
  } catch (err) {
      console.log(err);
      res.status(500).send("Error registering user");
  }
});
  
app.post("/login", async (req,res) => {
    const email = req.body.email;
    const password = req.body.password;
  
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedPassword = user.password;
  
        if (password === storedPassword) {
          const secret = user.secret_text;
          req.session.email = email;
          res.render("secrets.ejs", { secret });
        } else {
          res.send("Incorrect Password");
        }
      } else {
        res.send("User not found");
    }
    } catch (err) {
      console.log(err);
    }
});

app.post("/secret", async (req, res) => {
  const secret = req.body.secret; 
  const userEmail = req.session.email; 

  try {
      const result = await db.query("UPDATE users SET secret_text = $1 WHERE email = $2", [secret, userEmail]);
      console.log(result);
      res.redirect("/secrets"); 
  } catch (err) {
      console.error("Error saving secret:", err);
      res.status(500).send("Error saving secret");
  }
});

app.listen(port, () => {
    console.log(`Server running in port ${port}`)
});