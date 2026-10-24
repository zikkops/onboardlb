import type { Metadata } from 'next'
import LegalPage, { Bullets, Strong, ContactLines } from '../components/legal/LegalPage'
import { CUSTOMER_ACCOUNTS_ENABLED as ACCOUNTS } from '../lib/features'

export const metadata: Metadata = {
  title: 'Privacy Policy — Onboard',
}

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Onboard — Games & Tales"
      title="Privacy Policy"
      updated="6 October 2026"
      otherLink={{ href: '/terms', label: 'Read our Terms & Conditions' }}
      intro={<>
        <p>
          This policy explains what personal information Onboard collects through this website, why, who
          it is shared with, and the choices you have. We handle your information in line with Lebanese
          Law No. 81 of 2018 on Electronic Transactions and Personal Data.
        </p>
        <p><Strong>Short version:</Strong> we collect what we need to run {ACCOUNTS ? 'your account, reservations and loyalty points' : 'your reservations and orders'}. We don&apos;t sell your data and we don&apos;t use advertising trackers.</p>
      </>}
      sections={[
        {
          heading: 'What we collect',
          body: <>
            <Bullets items={[
              ...(ACCOUNTS ? [<><Strong>Account details</Strong> — your first and last name, email address, username, phone number and chosen avatar. If you sign in with Google, we receive your name and email from Google. Passwords are handled by our sign-in provider; we never see them.</>,
              <><Strong>Loyalty activity</Strong> — receipt numbers and the receipt photos you upload, your XP, level, OB Coins and reward redemptions.</>,
              <><Strong>Reservations</Strong> — table, event and D&amp;D bookings, including the date, time, branch and party size.</>,
              <><Strong>Social features</Strong> — friends you add and friend or session invites you send and receive.</>] : []),
              <><Strong>Wholesale accounts</Strong> — business name, contact details and order history.</>,
              <><Strong>Messages you send us</Strong> — if you reserve {ACCOUNTS ? 'a game' : 'a game, table, event spot or D&D session'} through WhatsApp, that conversation happens in WhatsApp, not on our website. We use what you tell us there, such as your name, phone number, date and party size, to handle your reservation.</>,
            ]} />
            <p>We do not collect payment card details on this website. Payments are made in store.</p>
          </>,
        },
        {
          heading: 'How we use it',
          body: <Bullets items={[
            ...(ACCOUNTS ? ['to create and run your account and let you sign in;'] : []),
            'to manage your reservations and tell you about their status;',
            ...(ACCOUNTS ? ['to review receipt submissions and run the loyalty program;'] : []),
            'to contact you about your bookings, orders or account (for example by email or WhatsApp);',
            'to prevent fraud and misuse, and keep the site secure;',
            'to meet our legal and accounting obligations.',
          ]} />,
        },
        ...(!ACCOUNTS ? [] : [{
          heading: 'What other people can see',
          body: <>
            <p>
              Your <Strong>username, avatar and level</Strong> can be seen by other customers — for example on
              the leaderboard, and when people search for friends. Your name, email and phone number are
              not shown to other customers.
            </p>
            <p>Our staff can see your account details and activity when they need to, for example to approve a reservation or a receipt.</p>
          </>,
        }]),
        {
          heading: 'Who we share it with',
          body: <>
            <p>We don&apos;t sell or rent your personal information. We share it only with service providers that help us run the site:</p>
            <Bullets items={[
              <><Strong>Google Firebase</Strong> — sign-in and our database, where {ACCOUNTS ? 'your account and activity are' : 'wholesale accounts and orders are'} stored.</>,
              ...(ACCOUNTS ? [<><Strong>ImgBB</Strong> — hosting for images uploaded to the site, such as receipt photos.</>] : []),
              <><Strong>Resend</Strong> — sending emails such as order notifications.</>,
              <><Strong>WhatsApp (Meta)</Strong> — only when you choose to message a branch.</>,
            ]} />
            <p>
              These providers may store data on servers outside Lebanon. We may also disclose information
              if the law requires it, or to protect our customers, staff or business.
            </p>
          </>,
        },
        {
          heading: 'Cookies and local storage',
          body: <p>
            We don&apos;t use advertising or analytics cookies. The site uses your browser&apos;s storage to keep
            you signed in and remember basic preferences. Clearing your browser data will sign you out.
          </p>,
        },
        {
          heading: 'How long we keep it',
          body: ACCOUNTS ? <p>
            We keep your account information for as long as your account is open. Reservation, order and
            loyalty records may be kept longer where we need them for accounting, legal or fraud-prevention
            reasons. When you ask us to delete your account, we delete or anonymise your personal
            information unless we must keep it by law.
          </p> : <p>
            We keep reservation and order records for as long as we need them to serve you, and longer
            where we need them for accounting, legal or fraud-prevention reasons. When you ask us to delete
            your information, we delete or anonymise it unless we must keep it by law.
          </p>,
        },
        {
          heading: 'Your rights',
          body: <>
            <p>You can ask us to:</p>
            <Bullets items={[
              'tell you what personal information we hold about you and give you a copy;',
              'correct information that is wrong;',
              ACCOUNTS ? 'delete your account and personal information;' : 'delete your personal information;',
              'stop contacting you about anything other than your own bookings and orders.',
            ]} />
            <p>To make a request, message any branch using the contacts below. We may need to confirm your identity first.</p>
          </>,
        },
        {
          heading: 'Security',
          body: <p>
            Access to customer information is limited to staff who need it, and our systems use access
            controls and encrypted connections. No system is perfectly secure, so please use a strong
            password and don&apos;t share it.
          </p>,
        },
        {
          heading: 'Children',
          body: <p>
            Our website is not aimed at children under 13, and they should not {ACCOUNTS ? 'create an account' : 'use it to make reservations'}. If you
            believe a child has given us personal information, contact us and we will delete it.
          </p>,
        },
        {
          heading: 'Changes to this policy',
          body: <p>We may update this policy from time to time. The date at the top shows when it last changed.</p>,
        },
        {
          heading: 'Contact us',
          body: <>
            <p>For privacy questions or requests, reach any branch on WhatsApp:</p>
            <ContactLines />
          </>,
        },
      ]}
    />
  )
}
