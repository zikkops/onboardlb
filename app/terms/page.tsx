import type { Metadata } from 'next'
import LegalPage, { Bullets, Strong, ContactLines } from '../components/legal/LegalPage'
import { CUSTOMER_ACCOUNTS_ENABLED as ACCOUNTS } from '../lib/features'

export const metadata: Metadata = {
  title: 'Terms & Conditions — Onboard',
}

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Onboard — Games & Tales"
      title="Terms & Conditions"
      updated="6 October 2026"
      otherLink={{ href: '/privacy', label: 'Read our Privacy Policy' }}
      intro={<>
        <p>
          These terms apply to your use of the Onboard website{ACCOUNTS ? ', your Onboard account,' : ''} and anything you
          buy, reserve or book through it — including board games from our shop{ACCOUNTS ? ', table, event and D&D reservations, and our loyalty program' : ' and table, event and D&D reservations'}. Onboard operates board game cafés in Beirut
          (Hamra), Zouk Mikael and Broummana, Lebanon.
        </p>
        <p>By using the website{ACCOUNTS ? ' or creating an account' : ''}, you agree to these terms. If you don&apos;t agree, please don&apos;t use the site.</p>
      </>}
      sections={[
        ...(!ACCOUNTS ? [] : [{
          heading: 'Your account',
          body: <>
            <p>
              Some features — loyalty points, reservations, friends and the leaderboard — need an account.
              You agree to give us accurate details (name, email, phone number) and to keep them up to date.
            </p>
            <Bullets items={[
              'You are responsible for keeping your password safe and for activity on your account.',
              'One account per person. Usernames must not impersonate anyone or be offensive.',
              'If you are under 18, please use the site with the permission of a parent or guardian.',
              'We may suspend or close accounts that break these terms or abuse the loyalty program.',
            ]} />
          </>,
        }]),
        {
          heading: 'Shop: prices, stock and reservations',
          body: <>
            <p>
              The shop lets you browse our board games and reserve one at a branch through WhatsApp.
              <Strong> Payment is not taken online</Strong> — you pay in store when you collect the game.
            </p>
            <Bullets items={[
              'Prices are shown in US dollars and may change without notice. The price that applies is the one confirmed by the branch when you collect.',
              'Stock counts on the website are updated by our staff and are a guide, not a guarantee. A game shown as available may have just sold.',
              <>A reservation is only <Strong>confirmed once the branch replies to you on WhatsApp</Strong>. The branch will tell you how long it can hold the game for; if it is not collected in that time, the hold may be released.</>,
              'Product photos and descriptions are for illustration. Contents and editions can vary.',
              'We may refuse or cancel a reservation, for example if an item was listed in error or is no longer available.',
            ]} />
          </>,
        },
        {
          heading: 'Returns and faulty games',
          body: <>
            <p>
              Please check your game in store before you leave. If a game you bought is faulty or has missing
              components, contact the branch you bought it from with your receipt as soon as possible and we
              will repair, replace or refund it in line with Lebanese consumer protection law (Law No. 659
              of 2005). Opened games that are not faulty are not returnable unless the branch agrees otherwise.
            </p>
          </>,
        },
        {
          heading: 'Table, event and D&D reservations',
          body: <>
            <Bullets items={[
              ACCOUNTS
                ? 'Reservations are requests until they are approved by our staff. You will see the status in your account.'
                : 'Reservations are made by WhatsApp with the branch, and are only confirmed once the branch replies to you.',
              'Please arrive on time. If you are late, a table may be released to other guests.',
              'If you can no longer make it, please cancel or let the branch know as early as possible.',
              'Event and D&D session fees, where they apply, are confirmed with your booking and paid in store unless we tell you otherwise.',
              'Our house rules apply in every branch. Staff may ask anyone who is disruptive or damages games to leave.',
            ]} />
          </>,
        },
        ...(!ACCOUNTS ? [] : [{
          heading: 'Loyalty program (XP and OB Coins)',
          body: <>
            <p>
              You earn XP and OB Coins by submitting your receipts and taking part in activities. Coins can be
              redeemed for rewards listed on the site.
            </p>
            <Bullets items={[
              'Points and coins have no cash value, cannot be exchanged for money, and cannot be transferred or sold.',
              'Only submit receipts for purchases you made yourself. Each receipt can only be claimed once.',
              'Submissions are reviewed by staff, who may reject any that look invalid.',
              'We may remove points earned by mistake or through misuse, and may close accounts involved in fraud.',
              'We may change rewards, levels, perks and earning rates, or end the program, and will post changes on the site.',
            ]} />
          </>,
        }]),
        {
          heading: 'Wholesale customers',
          body: <p>
            Wholesale accounts and orders are also covered by the terms we agree with each wholesale
            customer separately. Where those terms conflict with these, the wholesale agreement applies.
          </p>,
        },
        {
          heading: 'Acceptable use',
          body: <>
            <p>When using the site, you agree not to:</p>
            <Bullets items={[
              'upload content that is illegal, offensive, or that you don’t have the right to share;',
              'try to access accounts, data or admin areas that aren’t yours;',
              'interfere with the site, or scrape or copy it with automated tools;',
              'use the site to harass other customers or our staff.',
            ]} />
          </>,
        },
        {
          heading: 'Our content',
          body: <p>
            The Onboard name, logo, photos and text on this site belong to Onboard or are used with
            permission. Board game names, artwork and trademarks belong to their publishers. You may not
            reuse our content without written permission.
          </p>,
        },
        {
          heading: 'Liability',
          body: <p>
            We work to keep the website accurate and available, but it is provided &quot;as is&quot; and may
            sometimes be unavailable or contain mistakes. To the extent the law allows, Onboard is not
            liable for indirect losses arising from your use of the site. Nothing in these terms limits
            any rights you have under Lebanese law that cannot be limited.
          </p>,
        },
        {
          heading: 'Changes to these terms',
          body: <p>
            We may update these terms from time to time. The date at the top of this page shows when they
            last changed. If you keep using the site after a change, the updated terms apply.
          </p>,
        },
        {
          heading: 'Governing law',
          body: <p>These terms are governed by the laws of Lebanon, and the courts of Beirut have jurisdiction over any dispute.</p>,
        },
        {
          heading: 'Contact us',
          body: <>
            <p>Questions about these terms? Reach any branch on WhatsApp:</p>
            <ContactLines />
          </>,
        },
      ]}
    />
  )
}
