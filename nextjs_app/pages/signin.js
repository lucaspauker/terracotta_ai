import { useEffect } from 'react';
import Link from 'next/link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { Layout, SimpleLayout } from '../components/layout'
import ForestIcon from '@mui/icons-material/Forest';
import { GiPalmTree, GiPorcelainVase, GiClayBrick } from 'react-icons/gi';

export async function getServerSideProps(context) {
  const session = await getSession(context)

  if (session) {
    return {
      redirect: {
        destination: '/projects',
        permanent: false,
      },
    }
  }

  return {
    props: { session }
  }
}

export default function Home() {
  useEffect(() => {
    signIn();
  }, []);
  return (null);
}

Home.getLayout = function getLayout(page) {
  return (
    <SimpleLayout>
      {page}
    </SimpleLayout>
  )
}
