// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "../../../lib/mongodb";

// Import our new models and connection helper
import dbConnect from '../../../lib/mongoose';
import Profile from '../../../models/Profile';
import UserSession from '../../../models/UserSession';

// --- THIS IS THE KEY CHANGE ---
// 1. Define your configuration object as a constant and EXPORT it.
export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  events: {
    async signIn(message) {
      await dbConnect();
      const userEmail = message.user.email;
      const emailDomain = userEmail.split('@')[1];
      const userDomain = emailDomain === 'umn.edu' ? 'umn' : 'non-umn';
      await UserSession.findOneAndUpdate(
        { userId: message.user.id },
        { 
          $set: { lastLogin: new Date() },
          $setOnInsert: {
            userId: message.user.id,
            domain: userDomain,
          }
        },
        { upsert: true, new: true }
      );
      if (message.isNewUser) {
        await Profile.create({
          userId: message.user.id,
          name: message.user.name,
        });
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// 2. Pass the authOptions object to the NextAuth function.
export default NextAuth(authOptions);