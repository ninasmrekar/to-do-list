import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
import session from "express-session";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PW,
  port: process.env.DB_PORT
});

db.connect();
let items = [];
let lists = ["daily", "weekly", "monthly", "yearly"]
let colors = ["#a683e3", "#db83e3", "#e38390", "#e3ae83"]
let currentList = "daily";

function capitalize(word)
{
  return word[0].toUpperCase() + word.slice(1);
}

app.get("/", async (req, res) => {
  if(req.isAuthenticated()){
    try{
      var result = await db.query("SELECT * FROM items WHERE type='daily' AND user_id=$1 ORDER BY id ASC", [req.user.id]);
      items = result.rows;
      currentList = "daily";
      res.render("index.ejs", {
        listTitle: capitalize(lists[0]),
        listItems: items,
        color: colors[0],
      });
    } catch(err){
      console.log(err);
    }
  } else{
    res.redirect("/sign-up");
  }
});

app.get("/daily", async (req, res) => {
  if(req.isAuthenticated()){
    res.redirect("/");
  } else{
    res.redirect("/sign-up");
  }
});

app.get("/weekly", async (req, res) => {
  if(req.isAuthenticated()){
    try{
      var result = await db.query("SELECT * FROM items WHERE type='weekly' AND user_id=$1 ORDER BY id ASC", [req.user.id]);
      items = result.rows;
      currentList = "weekly";
      res.render("index.ejs", {
        listTitle: capitalize(lists[1]),
        listItems: items,
        color: colors[1],
      });
    } catch(err){
      console.log(err);
    }
  } else{
    res.redirect("/sign-up");
  }
});

app.get("/monthly", async (req, res) => {
  if(req.isAuthenticated()){
    try{
      var result = await db.query("SELECT * FROM items WHERE type='monthly' AND user_id=$1 ORDER BY id ASC", [req.user.id]);
      items = result.rows;
      currentList = "monthly";
      res.render("index.ejs", {
        listTitle: capitalize(lists[2]),
        listItems: items,
        color: colors[2],
      });
    } catch(err){
      console.log(err);
    }
  } else{
    res.redirect("/sign-up");
  }
});

app.get("/yearly", async (req, res) => {
  if(req.isAuthenticated()){
    try{
      var result = await db.query("SELECT * FROM items WHERE type='yearly' AND user_id=$1 ORDER BY id ASC", [req.user.id]);
      items = result.rows;
      currentList = "yearly";
      res.render("index.ejs", {
        listTitle: capitalize(lists[3]),
        listItems: items,
        color: colors[3],
      });
    } catch(err){
      console.log(err);
    }
  } else{
    res.redirect("/sign-up");
  }
});

app.post("/add", async (req, res) => {
  if(req.isAuthenticated()){
    try{
      await db.query("INSERT INTO items (title, type, user_id) VALUES($1, $2, $3)", [req.body.newItem, currentList, req.user.id]);  
      res.redirect("/" + currentList);
    } catch(err){
      console.log(err);
    }
  } else{
    res.redirect("/sign-up");
  }
});

app.post("/edit", async (req, res) => {
  if(req.isAuthenticated()){
    try{
      await db.query("UPDATE items SET title=$1 WHERE id=$2 AND type=$3 AND user_id=$4", [req.body.updatedItemTitle, req.body.updatedItemId, currentList, req.user.id]);
      res.redirect("/" + currentList);
    } catch(err){
      console.log(err);
    }
  } else{
    res.redirect("/sign-up");
  }
});

app.post("/delete", async (req, res) => {
  if(req.isAuthenticated()){
    try{
      await db.query("DELETE FROM items WHERE id=$1 AND type=$2 AND user_id =$3", [req.body.deleteItemId, currentList, req.user.id]);
      res.redirect("/" + currentList);
    } catch(err){
      console.log(err);
    }
  } else{
    res.redirect("/sign-up");
  }
});

app.get("/sign-up", async (req, res) => {
  res.render("sign-up.ejs", {message: ""});
});

app.post("/sign-up", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE username=$1", [username]);
    if (checkResult.rows.length > 0) {
      res.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.log("Error hashing password:", err);
          res.render("sign-up.ejs", {message: "Server Error"});
        } else {
          try{            
            const result = await db.query(
              "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
              [username, hash]
            );
            const user = result.rows[0];
            req.login(user, (err) => {
              console.log("success");
              res.redirect("/daily");
            });
          } catch{
            res.render("sign-up.ejs", {message: "User with this username already exists!"});
          }
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/login", async (req, res) => {
  res.render("login.ejs", {message: ""});
});


app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/daily",
    failureRedirect: "/login",
  })

);

app.get("/logout", (req, res) => {
  currentList = "daily";
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE username=$1", [username]); 

      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedPassword = user.password;
        bcrypt.compare(password, storedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
