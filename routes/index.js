var express = require("express");
var router = express.Router();
const userModel = require("./users");
const postModel = require("./post");
const passport = require("passport");
const localStrategy = require("passport-local");
passport.use(new localStrategy(userModel.authenticate()));
const upload = require("./mutler");
const users = require("./users");

router.get("/", function (req, res, next) {
  res.render("singup");
});

router.get("/login",   function (req, res, next) {
  const error = req.flash("error"); 
  res.render("login", {error});
});

router.post("/upload", isLoggedIn, upload.single("file"), async function (req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded!");
    } 
    // Retrieve the current user using req.user._id
    const user = await userModel.findById(req.user._id);

    // Create a new post
    const postData = await postModel.create({
      image: req.file.filename,
      imageText: req.body.imageText,
      user: user._id,
    });

    // Push the post ID into the user's postArray
    user.posts.push(postData._id);  
    await user.save(); 
    res.redirect("/profile");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error.");
  }
});

router.get("/feed", isLoggedIn, async(req, res) => {
  let posts=await postModel.find().populate("user");
 let user= await userModel.findOne({username: req.session.passport.user}) 
  res.render("feed",{posts,user});
})
router.post("/feed/save", async (req, res) => {
  const postId = req.body.postId;
  const username = req.session.passport.user;
  

  try {
      let user = await userModel.findOne({_id:username });
      if (!user.posts.includes(postId)) {
          user.posts.push(postId);
          await user.save();
      }
      res.status(200).send({ message: 'Post saved successfully' });
  } catch (error) {
      res.status(500).send({ message: 'Error saving post' });
  }
});

router.get("/profile", isLoggedIn, async (req, res) => { 
  const user = await userModel.findById(req.user._id).populate("posts"); 
  res.render("profile", {user})
}) 

router.post("/register", (req, res) => {
  const { username, email, fullname } = req.body;
  const userData = new userModel({ username, email, fullname });

  userModel.register(userData, req.body.password)
    .then(function () {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/profile");
      });
    })
    .catch((error) => {
      console.error(error);
      res.render("error", {error});
    });
});

router.post("/login",
  passport.authenticate("local", {
    successRedirect: "/feed",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

router.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  else res.redirect("/login");
}

module.exports = router; 