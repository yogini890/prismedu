import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Maximize2,X} from 'lucide-react';
import './awards-gallery.css';
import a1 from '../assets/awards/award-1.jpeg';
import a2 from '../assets/awards/award-2.jpeg';
import a3 from '../assets/awards/award-3.jpeg';
import a4 from '../assets/awards/award-4.jpeg';
import a5 from '../assets/awards/award-5.jpeg';
import a6 from '../assets/awards/award-6.jpeg';
import a7 from '../assets/awards/award-7.jpeg';
import a8 from '../assets/awards/award-8.jpeg';
import a9 from '../assets/awards/award-9.jpeg';
import a11 from '../assets/awards/award-11.jpeg';

// Metadata transcribed only from the supplied photographs; unknown fields stay hidden.
const awards=[
  {src:a1,title:'Rabindranath Tagore National Directors Award',organisation:'EK Updesh Media / Brainwonders AI',date:'8 November 2025',description:'Recognition of committed efforts and an innovative approach to developing young learners’ life skills.'},
  {src:a2,title:'Principal’s Lifetime Achievement Award',organisation:'Kaladarpan Art Academy',recipient:'Prajakta Shinde',date:'2025–26',description:'The Academic Golden Star Award, associated with the National Level Art Competition.'},
  {src:a3,title:'Visionary School Leader Award',organisation:'EduDrone',recipient:'Prajakta Shinde',date:'2026',description:'Presented at the Principal Symposium and Awards for leadership, empowering educators and inspiring learners.'},
  {src:a4,title:'Education Icon of the Year 2025',organisation:'Plus 91 Media',recipient:'Prajakta Shinde',date:'28 June 2025',description:'Recognition at the 22nd EduLeaders Summit & Awards in Mumbai.'},
  {src:a5,title:'Innovative Teaching Practices Award',organisation:'EduDrone and Partners',recipient:'Ms. Prajakta Shinde',date:'2024',description:'Presented at the Principal Symposium and Awards to the Academic Director of Silver Birch International School.'},
  {src:a6,title:'Certificate of Participation',organisation:'Athos Edu Solutions',recipient:'Ms. Prajakta Shinde',date:'13 July 2024',description:'Participation in MIMAMSA: A Principal’s Conclave, Pune Chapter, Season 3, at The Corinthians, Pune.'},
  {src:a7,title:'Bharat Bhushan Award',description:'Award Details Coming Soon'},
  {src:a8,title:'Guest of Honour – Educators’ Appreciation',organisation:'NCEAS / ENARK',recipient:'Ms. Prajakta Shinde',date:'30 August 2026',description:'Recognition for presence and support at the NCEAS Launch & Educators’ Appreciation Program, MIT-WPU, Pune.'},
  {src:a9,title:'Certificate of Honour',organisation:'NCEAS; presented by ENARK',recipient:'Ms. Prajakta Shinde',date:'30 August 2026',description:'Guest of Honour certificate for the NCEAS Launch & Educators’ Appreciation Programme at MIT World Peace University, Pune.'},
  {src:a11,title:'Education Icon of the Year 2026',organisation:'Plus 91 Media',recipient:'Prajakta Shinde',date:'18 July 2026',description:'Presented at the Pune Education Conclave, uniting school and higher-education leaders.'},
];

export default function AwardsGallery({existingMedia=[]}){
  const items=[...awards,...existingMedia.map(item=>({...item,title:item.caption,description:item.caption}))];
  const [photo,setPhoto]=useState(null);
  const grid=useRef(null),dialog=useRef(null),trigger=useRef(null);
  const close=()=>{dialog.current?.close();setPhoto(null);trigger.current?.focus()};
  const move=n=>setPhoto(i=>(i+n+items.length)%items.length);
  useEffect(()=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('recognition-pending');observer.unobserve(entry.target)}}),{threshold:.08});
    grid.current.querySelectorAll('article').forEach(card=>{card.classList.add('recognition-pending');observer.observe(card)});
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{if(photo!==null&&!dialog.current.open)dialog.current.showModal()},[photo]);
  const current=photo===null?null:items[photo];
  return <><div ref={grid} className="recognition-grid">{items.map((item,index)=><article key={item.src} className="recognition-card">
    <button className="recognition-image" type="button" aria-label={`View ${item.title}`} onClick={e=>{trigger.current=e.currentTarget;setPhoto(index)}}><img src={item.src} alt={`${item.title} – Prism Edu Consultancy Award`} loading="lazy"/><Maximize2 size={18} aria-hidden="true"/></button>
    <div className="recognition-copy"><h3>{item.title}</h3><dl>{[['Awarding organisation',item.organisation],['Recipient',item.recipient],['Year / date',item.date]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>{item.description}</p></div>
  </article>)}</div>
  <dialog ref={dialog} className="award-lightbox" aria-label="Award photograph viewer" onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===e.currentTarget)close()}} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}}}>
    <button type="button" className="award-lightbox-close" aria-label="Close image viewer" onClick={close} autoFocus><X/></button>
    <button type="button" className="award-lightbox-arrow left-3" aria-label="Previous photograph" onClick={()=>move(-1)}><ArrowLeft/></button>
    {current&&<figure><img src={current.src} alt={`${current.title} – Prism Edu Consultancy Award`}/><figcaption aria-live="polite">{current.title} ({photo+1} / {items.length})</figcaption></figure>}
    <button type="button" className="award-lightbox-arrow right-3" aria-label="Next photograph" onClick={()=>move(1)}><ArrowRight/></button>
  </dialog></>;
}
