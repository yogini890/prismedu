export const materialOptions={
  nature:['Available','Required'],
  transaction:['For Sale','For Rent','For Lease','For Share','Required','Urgent Required'],
  condition:['New','Pre-Owned','Refurbished','Either'],
  status:['Active','Inactive','Sold Out','Rented'],
  category:['Classroom Furniture','Smart Classroom','Computers','Lab Equipment','Books','Sports','Uniforms','School Bus / Transport','Stationery','Playground','Other'],
};
export const materialDefaults={title:'',summary:'',description:'',nature:'Available',transaction:'For Sale',category:'Classroom Furniture',customCategory:'',quantity:'',unit:'Units',condition:'New',price:'',priceOnRequest:true,location:'',contactName:'',email:'',phone:'',tags:[],status:'Active',images:[]};
export const categoryName=x=>x.category==='Other'&&x.customCategory?x.customCategory:x.category;
export const canOrder=x=>!!x&&x.status==='Active'&&x.nature==='Available'&&x.transaction==='For Sale';
export const materialVisible=x=>!!x&&x.status!=='Inactive';
export function validateMaterial(x){
  const errors={};
  for(const [key,max] of Object.entries({title:150,summary:300,description:12000,quantity:60,unit:60,location:180}))if(typeof x[key]!=='string'||!x[key].trim()||x[key].length>max)errors[key]=`Required; maximum ${max} characters.`;
  for(const [key,values] of Object.entries(materialOptions))if(!values.includes(x[key]))errors[key]='Choose a valid option.';
  for(const [key,max] of Object.entries({customCategory:100,contactName:120,email:254,phone:30}))if(typeof x[key]!=='string'||x[key].length>max)errors[key]=`Maximum ${max} characters.`;
  if(x.quantity!==''&&Number.isFinite(Number(x.quantity))&&Number(x.quantity)<=0)errors.quantity='Quantity must be greater than zero.';
  if(!x.priceOnRequest&&(!String(x.price).trim()||!Number.isFinite(Number(x.price))||Number(x.price)<0||Number(x.price)>1e12))errors.price='Enter a valid non-negative price in INR.';
  if(x.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email))errors.email='Enter a valid email.';
  if(x.phone&&!/^\+?[\d ()-]{7,25}$/.test(x.phone))errors.phone='Enter a valid phone number.';
  if((x.nature==='Required')!==['Required','Urgent Required'].includes(x.transaction))errors.transaction='Choose a transaction matching the listing nature.';
  if(['Sold Out','Rented'].includes(x.status)&&x.nature!=='Available')errors.status='Only available listings can be sold or rented.';
  if(!Array.isArray(x.tags)||x.tags.some(t=>!['New','Urgent','Bulk'].includes(t)))errors.tags='Use New, Urgent or Bulk tags.';
  if(!Array.isArray(x.images)||x.images.length>10)errors.images='Use up to 10 images.';
  return errors;
}
export function filterMaterialRecords(records,q){
  const keyword=String(q.q||'').trim().toLowerCase();
  return records.filter(x=>(!keyword||[x.title,x.summary,x.description,categoryName(x),x.location,x.nature,x.transaction,x.condition,...x.tags].join(' ').toLowerCase().includes(keyword))&&['nature','transaction','condition','status'].every(k=>!q[k]||x[k]===q[k])&&(!q.category||categoryName(x)===q.category)&&(!q.location||x.location===q.location));
}
