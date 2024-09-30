const passport = require("passport");
const TwitterStrategy = require("passport-twitter").Strategy;

passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      includeEmail: true, // Request email from Twitter
    },
    async (token, tokenSecret, profile, done) => {
      try {
        

        // Process user profile from Twitter
        const userData = {
          id: profile.id,
          displayName: profile.displayName,
          //   username: profile.username,
          email: profile.emails[0]?.value,
          profile: profile.photos[0]?.value,
        };

        // Complete authentication process
        return done(null, userData);
      } catch (error) {
        return done(error);
      }
    }
  )
);
