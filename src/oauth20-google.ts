import passport from 'passport';
import GoogleOauth20 from 'passport-google-oauth20';
import { User } from 'User';
import { getUserByEmail, insertUser } from './app';
import { v4 as uuidv4 } from 'uuid';

const OAuth20Google = (app) => {
  // Passport/session initialization
  app.use(passport.initialize());
  app.use(passport.session());

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
      res.redirect("/userhomepage");
    }
  );

  passport.use(GoogleOauth);

  // Used to stuff a piece of information into a cookie
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  // Used to decode the received cookie and persist session
  passport.deserializeUser((user, done) => {
    done(null, user);
  });
}

const GoogleOauth = new GoogleOauth20.Strategy(
  {
    clientID: process.env.OAUTH_GOOGLE_CLIENT_ID,
    clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.OAUTH_GOOGLE_CLIENT_CALLBACK_URL,
  },
  async function (accessToken, refreshToken, profile, done) {
    var user;
    try {
      user = await getUserByEmail(profile.emails[0].value);
    } catch (err) {
      const user_Id = uuidv4();
      const user: Partial<User> = {
        user_id: user_Id,
        email: profile.emails[0].value,
        name: `${profile.name.givenName} ${profile.name.familyName}`,
        role: 'patient'
      }
      await insertUser(user);
    }
    return done(null, profile)
  }
);

export default OAuth20Google;