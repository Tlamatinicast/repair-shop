import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, recordFailure, recordSuccess } from '@/lib/rateLimit';

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',      type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const emailRaw = credentials.email;

        // Anti fuerza bruta: bloquea el correo tras 5 fallos en 15 min.
        const rl = checkRateLimit(emailRaw);
        if (!rl.allowed) {
          throw new Error(`Demasiados intentos. Espera ${rl.retryMin} min e intenta de nuevo.`);
        }

        const user = await prisma.user.findUnique({ where: { email: emailRaw } });
        if (!user || !user.active) { recordFailure(emailRaw); return null; }
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) { recordFailure(emailRaw); return null; }

        recordSuccess(emailRaw);
        return { id: String(user.id), name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id ? parseInt(token.id as string) : undefined;
      }
      return session;
    },
  },
};
