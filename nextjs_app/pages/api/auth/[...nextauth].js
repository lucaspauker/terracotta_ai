import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import axios from 'axios';

export const authOptions = {
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
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log("Signing " + profile.email + " in");
      axios.post(process.env.BASE_URL + "/api/user/add", {
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
      return true;
    }
  },
};

export default NextAuth(authOptions);
