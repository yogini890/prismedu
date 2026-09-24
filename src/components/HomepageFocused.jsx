import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,BriefcaseBusiness,Building2,ChevronLeft,ChevronRight,FileCheck2,Globe2,Handshake,LandPlot,School,ShoppingBag} from 'lucide-react';

const ecosystem=[
  [School,'School Services','Plan, establish and strengthen educational institutions.','/services'],
  [LandPlot,'School Land & Support','Find, list and assess education-ready property.','/school-land'],
  [ShoppingBag,'Industry Associates','Connect with school products, equipment and providers.','/school-materials'],
  [FileCheck2,'Liaisoning & Legal Services','Coordinate documentation, registration and compliance.','/licensing-affiliation'],
  [Globe2,'Digital Services','Build stronger systems, visibility and admissions journeys.','/services'],
];

export function Ecosystem(){return <section className="bg-[#f4f7fa] py-16 md:py-24"><div className="mx-auto max-w-[1320px] px-5 md:px-8"><div className="mx-auto max-w-3xl text-center"><p className="section-kicker">PRISM EDUCATION ECOSYSTEM</p><h2 className="section-heading">Five Ways to Move Your Educational Vision Forward</h2></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{ecosystem.map(([Icon,title,text,to],i)=><Link key={title} to={to} className="ecosystem-card group"><span className="ecosystem-number">0{i+1}</span><span className="ecosystem-icon"><Icon size={26}/></span><h3>{title}</h3><p>{text}</p><ArrowRight size={18} className="mt-auto transition group-hover:translate-x-1"/></Link>)}</div></div></section>}

export function PracticalStart(){return <section className="relative overflow-hidden bg-[#10263f] py-16 text-white md:py-20"><div className="absolute -right-28 -top-32 h-96 w-96 rounded-full border-[55px] border-white/[.035]"/><div className="relative mx-auto grid max-w-[1200px] gap-9 px-5 md:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center"><div><p className="section-kicker !text-[#f3c35d]">A PRACTICAL STARTING POINT</p><h2 className="section-heading !text-white">One Conversation. A Clear Direction.</h2><p className="mt-5 max-w-2xl text-base leading-8 text-white/70">Every school project begins at a different stage. Share your requirement, challenge or idea with us. We will understand the situation and help identify relevant areas of support.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link to="/contact" className="btn">Start a Conversation<ArrowRight size={17}/></Link><Link to="/contact" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/30 px-5 py-3 text-sm font-bold hover:bg-white/10">Request Consultation</Link></div></div><div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">{['Share Your Requirement','Discuss Your Situation','Identify the Right Direction'].map((x,i)=><div key={x} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.07] p-5 backdrop-blur"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eeb640] font-extrabold text-[#10263f]">{i+1}</span><p className="font-bold text-white">{x}</p></div>)}</div></div></section>}

const services=[
  {icon:School,title:'School Services',text:'Support from feasibility and setup through academics, management and growth.',items:['School Feasibility & Planning','New School Setup','School Incubation','Academic Audit','Curriculum Development','School Management Support'],to:'/services',tone:'from-[#e7f1fa] to-[#f7fbff]',accent:'#26658c'},
  {icon:LandPlot,title:'School Land & Support Services',text:'Property search, listing and planning for education-focused projects.',items:['School Land Search','Land Available for School','School Building Search','Property Listing','Site Assessment','Rent / Sale / Lease'],to:'/school-land',tone:'from-[#edf4e7] to-[#fbfdf9]',accent:'#52743c'},
  {icon:ShoppingBag,title:'Industry Associates',text:'Products, equipment and professional solutions for school requirements.',items:['School Furniture','Smart Classroom','Laboratory Equipment','Computers & IT','ERP Solutions','School Transport'],to:'/school-materials',tone:'from-[#fff4de] to-[#fffaf1]',accent:'#a36b0c'},
  {icon:FileCheck2,title:'Liaisoning & Legal Services',text:'Professional coordination for documentation, registration and compliance.',items:['Registration Guidance','CBSE / Board Affiliation Support','NOC Coordination','Compliance Guidance','Trust / Society Documentation','Renewal Support'],to:'/licensing-affiliation',tone:'from-[#f0eaf8] to-[#fcfaff]',accent:'#684b86'},
  {icon:Globe2,title:'Digital Services',text:'Practical technology and communication systems for modern schools.',items:['Website Development','Mobile Applications','School ERP','Automation','Digital Marketing','SEO & Branding'],to:'/services',tone:'from-[#e6f5f4] to-[#f8fdfc]',accent:'#2c7771'},
];
export function ServicesShowcase(){return <section className="bg-white py-16 md:py-24"><div className="mx-auto max-w-[1280px] px-5 md:px-8"><div className="max-w-3xl"><p className="section-kicker">OUR SERVICES</p><h2 className="section-heading">Integrated Support for Schools, Promoters and Education Entrepreneurs</h2></div><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-6">{services.map((s,i)=>{const Icon=s.icon;return <article key={s.title} className={'service-showcase-card bg-gradient-to-br '+s.tone+' '+(i<3?'lg:col-span-2':'lg:col-span-3')}><span className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm" style={{color:s.accent}}><Icon size={28}/></span><h3>{s.title}</h3><p>{s.text}</p><ul>{s.items.map(x=><li key={x}>{x}</li>)}</ul><Link to={s.to}>Explore {s.title}<ArrowRight size={16}/></Link></article>})}</div></div></section>}

const gallery=[
  {src:'/images/gallery/prism-gallery-01.jpeg',caption:'Learning Beyond the Classroom'},
  {src:'/images/gallery/prism-gallery-02.jpeg',caption:'Student Engagement and Interaction'},
  {src:'/images/gallery/prism-gallery-03.jpeg',caption:'Connecting with Education Leaders'},
  {src:'/images/gallery/prism-gallery-04.jpeg',caption:'Inspiring Young Minds'},
  {src:'/images/gallery/prism-gallery-05.jpeg',caption:'Collaborative Classroom Experiences'},
  {src:'/images/gallery/prism-gallery-06.jpeg',caption:'Building Confidence Through Participation'},
  {src:'/images/gallery/prism-gallery-07.jpeg',caption:'Stronger Schools Through Meaningful Engagement'},
];
export function JourneyGallery(){
  const[index,setIndex]=useState(0),[paused,setPaused]=useState(false),[touch,setTouch]=useState(null);
  const move=n=>setIndex(i=>(i+n+gallery.length)%gallery.length);
  useEffect(()=>{if(paused||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const id=setTimeout(()=>move(1),4500);return()=>clearTimeout(id)},[index,paused]);
  const onKeyDown=e=>{if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}if(e.key==='ArrowRight'){e.preventDefault();move(1)}};
  const slideAt=offset=>gallery[(index+offset+gallery.length)%gallery.length];
  return <section className="journey-gallery" aria-labelledby="journey-gallery-title">
    <div className="mx-auto max-w-[1320px] px-5 md:px-8">
      <header className="journey-gallery-heading">
        <img src="/images/gallery/prism-logo.jpeg" alt="Prism Edu Consultancy" width="74" height="74"/>
        <p className="section-kicker">PRISM IN ACTION</p>
        <h2 id="journey-gallery-title" className="section-heading">Glimpses from Our Educational Journey</h2>
        <p>Explore meaningful moments from our school interactions, student engagement programmes, educational initiatives, leadership networking and collaborative learning experiences.</p>
      </header>
      <div className="journey-carousel" role="region" aria-roledescription="carousel" aria-label="Prism educational journey photographs" tabIndex="0" onKeyDown={onKeyDown} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setPaused(false)}} onTouchStart={e=>setTouch(e.touches[0].clientX)} onTouchEnd={e=>{if(touch!==null){const d=e.changedTouches[0].clientX-touch;if(Math.abs(d)>40)move(d<0?1:-1)}setTouch(null)}}>
        {[-1,0,1].map(offset=>{const item=slideAt(offset);return <figure key={item.src} className={'journey-slide journey-slide-'+(offset===0?'active':offset<0?'previous':'next')} aria-hidden={offset!==0}>
          <img src={item.src} alt={offset===0?item.caption:''} width="1200" height="800" loading={offset===0?'eager':'lazy'} fetchPriority={offset===0?'high':'auto'}/>
          {offset===0&&<figcaption>{item.caption}</figcaption>}
        </figure>})}
        <button type="button" className="journey-control journey-control-prev" onClick={()=>move(-1)} aria-label="Previous photograph"><ChevronLeft/></button>
        <button type="button" className="journey-control journey-control-next" onClick={()=>move(1)} aria-label="Next photograph"><ChevronRight/></button>
      </div>
      <div className="journey-dots" role="group" aria-label="Choose a gallery photograph">{gallery.map((item,i)=><button type="button" key={item.src} onClick={()=>setIndex(i)} aria-label={'Show photograph '+(i+1)+': '+item.caption} aria-current={i===index?'true':undefined} className={i===index?'active':''}/>)}</div>
      <div className="mt-6 text-center"><Link to="/about" className="btn">View Our Journey<ArrowRight size={17}/></Link></div>
    </div>
  </section>
}
export function FinalVisionCTA(){return <section className="relative overflow-hidden bg-gradient-to-br from-[#10263f] via-[#173a5e] to-[#49366f] py-16 text-white md:py-20"><div className="absolute inset-0 opacity-[.05]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'48px 48px'}}/><div className="relative mx-auto max-w-[1100px] px-5 text-center md:px-8"><BriefcaseBusiness size={38} className="mx-auto text-[#eeb640]"/><h2 className="mt-5 text-[clamp(2rem,4.8vw,3.8rem)] font-extrabold text-white">Let’s Build Your Educational Vision Together</h2><p className="mx-auto mt-5 max-w-3xl leading-8 text-white/70">Whether you are planning a new school, strengthening an institution, searching for land, seeking liaisoning support, finding vendors or adopting digital solutions, explore the next suitable step with Prism Edu.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap"><Link to="/contact" className="btn">Request Consultation</Link><Link to="/services" className="cta-outline">Explore Our Services</Link><Link to="/business-meeting" className="cta-outline">Premium School Business Meeting</Link><Link to="/contact" className="cta-outline">Contact Us</Link></div></div></section>}
