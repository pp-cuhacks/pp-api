const passport = require('passport');
const GoogleOauth20Strategy = require("passport-google-oauth20");
// TODO: Implement Users
const Users = null;

const OAuth20Google = (app) => {
    app.get('/auth/google',
        passport.authenticate('google', {
            scope: ['profile', 'email']
        })
    )

    app.get(
        "/auth/google/callback",
        passport.authenticate("google"),
        (req, res) => {
          console.log("Successfully logged in");
          // Replace /login with appropriate page
          res.redirect("/login");
        }
      );
    
    passport.use(GoogleOauth20);
}

const GoogleOauth20 = new GoogleOauth20Strategy(
    {
      clientID: process.env.OAUTH_GOOGLE_CLIENT_ID,
      clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.OAUTH_GOOGLE_CLIENT_CALLBACK_URL,
    },
    function (accessToken, refreshToken, profile, done) {
      console.log(profile);
      // TODO: Implement Users 
      Users.findOrCreate(
        { email: profile.emails[0].value },
        {
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
        },
        function (err, user) {
          // auth complete
          return done(err, user.email);
        }
      );
    }
  );

export default OAuth20Google;