import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faClock, faPhone } from '@fortawesome/free-solid-svg-icons'

export default function Branches() {
  const branches = [
    {
      city: 'Beirut',
      label: 'Flagship Branch',
      address: 'Hamra Street, Beirut',
      hours: '9:00 AM – 1:30 AM · Every day',
      phone: '+961 81 950 042',
      whatsapp: '96181950042',
      color: 'var(--teal)',
    },
    {
      city: 'Zouk',
      label: 'Zouk Mikael',
      address: 'Zouk Mikael Main Road, Keserwan',
      hours: '4:30 PM – 1:30 AM · Every day',
      phone: '+961 70 973 242',
      whatsapp: '96170973242',
      color: 'var(--red)',
    },
    {
      city: 'Broummana',
      label: 'Mountain Branch',
      address: 'Broummana Main Street, Metn',
      hours: '4:30 PM – 1:30 AM · Every day',
      phone: '+961 76 648 054',
      whatsapp: '96176648054',
      color: 'var(--purple)',
    },
  ]

  return (
    <section id="branches" style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '6rem 3rem',
    }}>

      {/* Header */}
      <p style={{
        fontSize: '0.7rem',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        color: 'var(--teal)',
        marginBottom: '1rem',
      }}>
        Find Us
      </p>

      <h2 style={{
        fontFamily: 'var(--font-cinzel)',
        fontSize: '2.8rem',
        color: 'var(--offwhite)',
        lineHeight: 1.2,
        marginBottom: '1.5rem',
      }}>
        Three Branches,<br />One Community
      </h2>

      <div style={{
        width: '60px', height: '2px',
        backgroundColor: 'var(--teal)',
        marginBottom: '4rem',
      }} />

      {/* Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.5rem',
      }}>
        {branches.map(({ city, label, address, hours, phone, whatsapp, color }) => (
          <div key={city} style={{
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            {/* Color bar */}
            <div style={{ height: '4px', backgroundColor: color }} />

            <div style={{ padding: '2rem 1.8rem' }}>
              <h3 style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: '1.8rem',
                color: 'var(--offwhite)',
                marginBottom: '0.3rem',
              }}>{city}</h3>

              <p style={{
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'rgba(245,242,236,0.3)',
                marginBottom: '1.8rem',
                fontFamily: 'var(--font-inter)',
              }}>{label}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {[
                  { icon: faLocationDot, text: address },
                  { icon: faClock,       text: hours },
                  { icon: faPhone,       text: phone },
                ].map(({ icon, text }) => (
                  <div key={text} style={{
                    display: 'flex',
                    gap: '0.8rem',
                    fontSize: '0.82rem',
                    color: 'rgba(245,242,236,0.5)',
                    fontFamily: 'var(--font-inter)',
                    alignItems: 'flex-start',
                  }}>
                    <FontAwesomeIcon
                      icon={icon}
                      style={{ color: 'white', width: '14px', marginTop: '2px', flexShrink: 0 }}
                    />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '2rem' }}>
                <button style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(245,242,236,0.6)',
                  padding: '0.6rem',
                  borderRadius: '2px',
                  fontSize: '0.72rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter)',
                }}>
                  Directions
                </button>
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    backgroundColor: color,
                    color: '#fff',
                    padding: '0.6rem',
                    borderRadius: '2px',
                    fontSize: '0.72rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    textAlign: 'center',
                    fontFamily: 'var(--font-inter)',
                  }}>
                  Reserve
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}