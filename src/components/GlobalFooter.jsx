import {ArrowRight,BriefcaseBusiness,Camera,Globe2,Mail,MapPin,MessageCircle,Phone,PhoneCall,Video} from 'lucide-react';
import {Link} from 'react-router-dom';

const contact={
  address:['Pimpri Nilakh, 411027'],
  phones:['9518963309'],
  email:'info@prismedu.in',
};

const socialLinks=[
  {label:'Facebook',url:'',Icon:Globe2},
  {label:'Instagram',url:'',Icon:Camera},
  {label:'LinkedIn',url:'',Icon:BriefcaseBusiness},
  {label:'YouTube',url:'',Icon:Video},
  {label:'WhatsApp',url:'',Icon:MessageCircle},
];

const quickLinks=[['Home','/'],['About Us','/about'],['School Land','/school-land'],['Our Services','/services'],['Shop School Material','/school-materials'],['Resources','/resources'],['Contact Us','/contact'],['Request Consultation','/contact?enquiry=consultation']];
const serviceLinks=[['School Services','/services#school-services'],['School Land & Support Services','/services#school-land-support'],['Industry Associates','/services#vendor-services'],['Licensing & Legal Support Services','/services#licensing-legal'],['Web & Digital Solutions Services','/services#digital-services']];
const policyLinks=[['Privacy Policy','/resources?policy=privacy'],['Terms and Conditions','/resources?policy=terms'],['Website Disclaimer','/resources?policy=website-disclaimer'],['Service Disclaimer','/resources?policy=service-disclaimer'],['Cancellation and Refund Policy','/resources?policy=cancellation-refund'],['Shipping and Delivery Policy','/resources?policy=shipping-delivery'],['Sitemap','/sitemap.xml'],['Accessibility Statement','/resources?policy=accessibility']];

function FooterLink({to,children}){return to.endsWith('.xml')?<a className="footer-link" href={to}>{children}<ArrowRight size={13} aria-hidden="true"/></a>:<Link className="footer-link" to={to}>{children}<ArrowRight size={13} aria-hidden="true"/></Link>}

export default function GlobalFooter(){return <footer className="global-footer">
  <div className="footer-cta wrap">
    <div><p className="footer-eyebrow">LET’S WORK TOGETHER</p><h2>Let’s Build a Stronger Educational Institution Together</h2><p>Connect with Prism Edu Consultancy for practical guidance, professional services, and long-term institutional support.</p></div>
    <div className="footer-cta-actions">
      <Link className="footer-action footer-action-primary" to="/contact?enquiry=consultation">Request Consultation <ArrowRight size={17}/></Link>
      <a className="footer-action" href={'tel:+91'+contact.phones[0]}><PhoneCall size={17}/>Call Now</a>
      <span className="footer-action is-disabled" aria-disabled="true" title="Official WhatsApp link to be provided"><Phone size={17}/>WhatsApp Us</span>
      <a className="footer-action" href={'mailto:'+contact.email}><Mail size={17}/>Email Us</a>
    </div>
  </div>
  <div className="footer-main wrap">
    <section className="footer-brand" aria-labelledby="footer-brand-title"><img src="/images/prism-official/prism-logo.jpg" alt="Prism Edu Consultancy" width="190" height="150" loading="lazy"/><h2 id="footer-brand-title" className="sr-only">Prism Edu Consultancy</h2><p>Prism Edu Consultancy supports school founders, management teams, educators, and education entrepreneurs through practical guidance, professional services, and sustainable institutional-development solutions.</p><strong>From Vision to Institution. From Setup to Sustainable Growth.</strong><div className="footer-socials">{socialLinks.map(({label,url,Icon})=>url?<a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon size={18}/></a>:<span key={label} className="is-disabled" aria-label={`${label} link to be provided`} title={`${label} link to be provided`}><Icon size={18}/></span>)}</div></section>
    <nav aria-labelledby="footer-quick-title"><h2 id="footer-quick-title">Quick Links</h2>{quickLinks.map(([label,to])=><FooterLink key={label} to={to}>{label}</FooterLink>)}</nav>
    <nav aria-labelledby="footer-services-title"><h2 id="footer-services-title">Our Core Services</h2>{serviceLinks.map(([label,to])=><FooterLink key={label} to={to}>{label}</FooterLink>)}</nav>
    <nav aria-labelledby="footer-info-title"><h2 id="footer-info-title">Professional Information</h2>{policyLinks.map(([label,to])=><FooterLink key={label} to={to}>{label}</FooterLink>)}</nav>
    <section aria-labelledby="footer-contact-title"><h2 id="footer-contact-title">Contact Us</h2><address className="footer-contact"><div><MapPin size={18}/><p>{contact.address.map(line=><span key={line}>{line}</span>)}</p></div>{contact.phones.map(number=><a key={number} href={'tel:+91'+number}><Phone size={17}/>{number}</a>)}<a href={'mailto:'+contact.email}><Mail size={17}/>{contact.email}</a></address></section>
  </div>
  <div className="footer-disclaimer wrap"><p><strong>Disclaimer:</strong> Prism Edu Consultancy provides educational consultancy, institutional support, facilitation, and professional guidance services. Approvals, affiliations, licences, admissions, business outcomes, and institutional results are subject to applicable laws, regulations, eligibility requirements, documentation, authority decisions, market conditions, and client implementation. No specific approval, admission, financial return, or institutional outcome is guaranteed.</p><p>Property and school-material listings are published for informational and facilitation purposes. Users should independently verify ownership, condition, legal status, pricing, documentation, and suitability before entering into any transaction.</p></div>
  <div className="footer-bottom"><div className="wrap"><p>© 2026 Prism Edu Consultancy. All rights reserved.</p><nav aria-label="Footer legal links"><Link to="/resources?policy=privacy">Privacy Policy</Link><Link to="/resources?policy=terms">Terms and Conditions</Link><Link to="/resources?policy=website-disclaimer">Disclaimer</Link><a href="/sitemap.xml">Sitemap</a></nav></div></div>
</footer>}
