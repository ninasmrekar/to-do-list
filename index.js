import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "permalist",
  password: "1234",
  port: 5432
});

db.connect();
let items = [];
let lists = ["daily", "weekly", "monthly", "yearly"]
let colors = ["#a683e3", "#db83e3", "#e38390", "#e3ae83"]
let currentList = "daily";
let currentUser = "";

function capitalize(word)
{
    return word[0].toUpperCase() + word.slice(1);
}

app.get("/", async (req, res) => {
  if(currentUser !== ""){
    try{
      var result = await db.query("SELECT * FROM items WHERE type='daily' AND user_id=$1 ORDER BY id ASC", [currentUser.id]);
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
  if(currentUser !== ""){
    res.redirect("/");
  } else{
    res.redirect("/sign-up");
  }
});

app.get("/weekly", async (req, res) => {
  if(currentUser !== ""){
    try{
      var result = await db.query("SELECT * FROM items WHERE type='weekly' AND user_id=$1 ORDER BY id ASC", [currentUser.id]);
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
  if(currentUser !== ""){
    try{
      var result = await db.query("SELECT * FROM items WHERE type='monthly' AND user_id=$1 ORDER BY id ASC", [currentUser.id]);
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
  if(currentUser !== ""){
    try{
      var result = await db.query("SELECT * FROM items WHERE type='yearly' AND user_id=$1 ORDER BY id ASC", [currentUser.id]);
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
  if(currentUser !== ""){
    try{
      await db.query("INSERT INTO items (title, type, user_id) VALUES($1, $2, $3)", [req.body.newItem, currentList, currentUser.id]);  
      res.redirect("/" + currentList);
    } catch(err){
      console.log(err);
    }
  } else{
    res.redirect("/sign-up");
  }
});

app.post("/edit", async (req, res) => {
  if(currentUser !== ""){
    try{
      await db.query("UPDATE items SET title=$1 WHERE id=$2 AND type=$3 AND user_id=$4", [req.body.updatedItemTitle, req.body.updatedItemId, currentList, currentUser.id]);
      res.redirect("/" + currentList);
    } catch(err){
      console.log(err);
    }
  } else{
    res.redirect("/sign-up");
  }
});

app.post("/delete", async (req, res) => {
  if(currentUser !== ""){
    try{
      await db.query("DELETE FROM items WHERE id=$1 AND type=$2 AND user_id =$3", [req.body.deleteItemId, currentList, currentUser.id]);
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
  try{
    await db.query("INSERT INTO users (username, password) VALUES($1, $2)", [req.body.username, req.body.password]);  
    res.redirect("/login");
  } catch(err){
    res.render("sign-up.ejs", {message: "User with this username already exists!"});
  }
});

app.get("/login", async (req, res) => {
  res.render("login.ejs", {message: ""});
});

app.post("/login", async (req, res) => {
  try{
    const result = await db.query("SELECT id, username FROM users WHERE username=$1 AND password=$2", [req.body.username, req.body.password]); 
    if(result.rows[0].username !== ""){
      currentUser = result.rows[0]; 
      res.redirect("/" + currentList);
    }
  } catch(err){
    res.render("login.ejs", {message: "Wrong username or password!"});

  }
});

app.get("/logout", async (req, res) => {
  currentUser = "";
  currentList = "daily";
  res.redirect("/sign-up");
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
