import {useState} from 'react';
import './clients.css';
import yspm from '../assets/client-logos/yspm.jpeg';
import rajarshi from '../assets/client-logos/rajarshi-shahu.jpeg';
import jayawantrao from '../assets/client-logos/jayawantrao-sawant-college.jpeg';
import jspm from '../assets/client-logos/jspm.jpeg';
import geetanjali from '../assets/client-logos/geetanjali-olympiad-school.jpeg';
import cm from '../assets/client-logos/cm-international-school.jpeg';
import globalAchievers from '../assets/client-logos/global-achievers-school.jpeg';
import silverBirch from '../assets/client-logos/silver-birch-international-school.jpeg';
import delhiPublic from '../assets/client-logos/delhi-public-international-school.jpeg';
import pccoe from '../assets/client-logos/pccoe.jpeg';
import keystone from '../assets/client-logos/keystone-school-of-engineering.jpeg';
import aitrc from '../assets/client-logos/aitrc.jpeg';

const clients = [
  [yspm, 'YSPM'],
  [rajarshi, 'Rajarshi Shahu (RSCP)'],
  [jayawantrao, 'JSPM’s Jayawantrao Sawant College of Engineering'],
  [jspm, 'JSPM'],
  [geetanjali, 'Geetanjali Olympiad School'],
  [cm, 'C M International School'],
  [globalAchievers, 'Global Achievers School'],
  [silverBirch, 'Silver Birch International School'],
  [delhiPublic, 'Delhi Public International School'],
  [pccoe, 'Pimpri Chinchwad College of Engineering (PCCOE)'],
  [keystone, 'Keystone School of Engineering'],
  [aitrc, 'AITRC'],
];

export default function ClientsSection({standalone = false}) {
  const [expanded, setExpanded] = useState(false);
  return <section id={standalone ? 'our-clients' : 'about-clients'} className={`about-anchor-section prism-clients bg-[#edf5f8] py-16 md:py-24${standalone ? ' prism-clients-page' : ''}`} aria-labelledby="clients-heading">
    <div className="wrap">
      <div className="mx-auto max-w-4xl text-center">
        <p className="section-kicker">OUR CLIENTS</p>
        {standalone ? <><h1 id="clients-heading" className="section-heading">Our Clients</h1><h2 className="mt-4 text-xl font-semibold text-[#10263f] md:text-2xl">Trusted by Educational Institutions</h2><p className="mx-auto mt-5 max-w-3xl leading-8 text-slate-600">Prism Edu Consultancy builds trusted relationships with schools and educational institutions through collaboration, practical guidance and a shared commitment to educational growth.</p></> : <h2 id="clients-heading" className="section-heading">Who Prism Edu Supports</h2>}
      </div>
      <div id="prism-client-grid" className="prism-clients-grid">
        {clients.slice(0, standalone || expanded ? clients.length : 10).map(([file, name]) => <figure className="prism-client-card" key={file}>
          <div className="prism-client-image"><img src={file} alt={`${name} – Prism Edu Consultancy Client`} loading="lazy" decoding="async"/></div>
          <figcaption>{name}</figcaption>
        </figure>)}
      </div>
      {!standalone && clients.length > 10 && <div className="mt-8 text-center"><button type="button" className="btn" aria-expanded={expanded} aria-controls="prism-client-grid" onClick={() => setExpanded(value => !value)}>{expanded ? 'Show Fewer Clients' : 'View All Clients'}</button></div>}
    </div>
  </section>;
}
