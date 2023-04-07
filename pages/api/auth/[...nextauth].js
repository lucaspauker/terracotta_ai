import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import axios from 'axios';
axios.defaults.withCredentials = true

export const authOptions = {
  secret: process.env.NEXT_AUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  theme: {
    colorScheme: "light",
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      const newUser = false;
      if (newUser) {
        axios.post("/api/user/add", {
            first_name: profile.given_name,
            last_name: profile.family_name,
            email: profile.email,
            picture: profile.picture,
            datetime: Date.now(),
          }).then((res) => {
            console.log(res.status);
          }).catch((error) => {
            console.log(error);
          });
      }
      return true;
      //const isAllowedToSignIn = true;
      //if (isAllowedToSignIn) {
      //  console.log("Signing in...");
      //  axios.post("http://127.0.0.1:3005/admin/login", {
      //      email: profile.email,
      //      token: account.id_token,
      //   }, {withCredentials: true, credentials: 'include'}).then((res) => {
      //      console.log('Logging in status: ' + res.status);
      //    }).catch((error) => {
      //      console.log(error);
      //    });
      //  return true;
      //} else {
      //  return false;
      //}
    }
  }
};

export default NextAuth(authOptions);
