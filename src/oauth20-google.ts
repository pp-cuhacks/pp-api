import passport from 'passport';
import GoogleOauth20 from 'passport-google-oauth20';
import { User } from 'User';
import { getUserByEmail, insertUser } from './app';
import { v4 as uuidv4 } from 'uuid';

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
      res.redirect("/userhomepage");
    }
  );
  
  passport.use(GoogleOauth);
}

const GoogleOauth = new GoogleOauth20.Strategy(
  {
    clientID: process.env.OAUTH_GOOGLE_CLIENT_ID,
    clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.OAUTH_GOOGLE_CLIENT_CALLBACK_URL,
  },
  async function (accessToken, refreshToken, profile, done) {
    const user = getUserByEmail(profile.emails[0].value);
    if (!user) {
      const user: Partial<User> = {
        userId: uuidv4(),
        email: profile.emails[0].value,
        name: `${profile.name.givenName} ${profile.name.familyName}`,
        role: 'patient'
      }
      await insertUser(user);
    }
  }
);

export default OAuth20Google;