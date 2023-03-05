//jshint esversion:6
const bodyParser = require("body-parser");
const express = require("express");
const ejs = require("ejs");

require("dotenv").config();

const session = require("express-session");
const passport = require("passport");

const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const User = require("./db.model");

app.use(
  session({
    secret: "Our Little Secret.",
    resave: false,
    saveUninitialized: false,
  })
);

//Passport is an authentication middleware for Node that authenticates requests.
//In a Connect or Express-based application, passport.initialize()
//middleware is required to initialize Passport. If your application uses persistent login
//sessions, passport.session() middleware must also be used.
app.use(passport.initialize());
passport.use(User.createStrategy());

//passport.session() acts as a middleware to alter the req object and change the 'user' value that
//is currently the session id (from the client cookie) into the true deserialized user object.
app.use(passport.session());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate(
        {
          name: profile.displayName,
          username: profile.id,
        },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

//FOR FACEBOOK authentication

// passport.use(new FacebookStrategy({
//   clientID: process.env.CLIENT_ID,
//   clientSecret: process.env.CLIENT_SECRET,
//   callbackURL: "http://localhost:3000/auth/facebook/secrets"
// },
// function(accessToken, refreshToken, profile, cb) {
//   // console.log(profile);
//   User.findOrCreate({
//     username: profile.id,
//     name: profile.displayName
//   }, function(err, user) {

//     return cb(err, user);
//   });
// }
// ));

app.get("/", function (req, res) {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/secrets");
  }
);

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

//Level 4 - Salting and Hashing Passwords with bcrypt

app.get("/secrets", function (req, res) {
  //if session id saved then directly direct to secrets page
  //  if(req.isAuthenticated()){
  //   res.render("secrets");
  //  }
  //  else{
  //   res.redirect("/login");
  //  }

  User.find(
    {
      secrets: { $ne: null },
    },
    (err, docs) => {
      if (err) {
        console.log(`Error: ` + err);
      } else {
        if (docs.length === 0) {
          console.log("No secrets found");
        } else {
          res.render("secrets", { userWithSecrets: docs });
        }
      }
    }
  );
});

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function (req, res) {
  const submittedSecret = req.body.secret;

  //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  // console.log(req.user.id);

  User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function () {
          res.redirect("/secrets");
        });
      }
    }
  });
});

//when logged out, no longer able to directly access secrets page
app.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.post("/register", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

module.exports = app;
