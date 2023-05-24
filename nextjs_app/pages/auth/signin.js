import { getProviders, signIn } from "next-auth/react"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../api/auth/[...nextauth]";
import { SimpleLayout } from '../../components/layout'
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import GitHubIcon from '@mui/icons-material/GitHub';
import GoogleIcon from '@mui/icons-material/Google';

export default function SignIn({ providers }) {
  return (
    <div className="signin-page">
      <div className='hero-image'></div>
      <div className='signin-box vertical-box'>
        {Object.values(providers).map((provider) => (
          <div key={provider.name}>
            <Button size='large' className="signin-button" variant="outlined" onClick={() => signIn(provider.id, {callbackUrl: '/projects'})}>
              {provider.name === "Google" ?
                <GoogleIcon />
                :
                <GitHubIcon />
              }&nbsp;&nbsp;
              Sign in with {provider.name}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (session) {
    return { redirect: { destination: "/projects" } };
  }

  const providers = await getProviders();

  return {
    props: { providers: providers ?? [] },
  }
}

SignIn.getLayout = function getLayout(page) {
  return (
    <SimpleLayout>
      {page}
    </SimpleLayout>
  )
}
