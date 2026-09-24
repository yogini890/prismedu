export const options = {
  type: ['Land Available', 'Land Required'],
  propertyType: ['Open Land', 'School Building', 'Existing School Campus', 'Commercial/Educational Property'],
  transaction: ['For Sale', 'For Rent', 'For Lease', 'Sale / Rent', 'Rent / Lease', 'Any Suitable Option', 'Sale / Lease'],
  dealStatus: ['Open', 'Sold', 'Rented', 'Leased', 'Requirement Fulfilled', 'Closed'],
  adminStatus: ['Active', 'Inactive', 'Archived'],
  approvalStatus: ['Pending', 'Approved', 'Rejected'],
  publicationStatus: ['Draft', 'Published', 'Unpublished'],
  areaUnit: ['sq. ft.', 'sq. m.', 'Acres', 'Hectares'],
};
export const textFields = ['title','propertyType','transaction','location','city','district','state','pinCode','areaUnit','terms','summary','description','suitability','connectivity','landmarks','facilities','ownerName','contactName','phone','whatsapp','email','listingDate','expiryDate','internalNotes','video'];
export const privateFields = ['ownerName','contactName','phone','whatsapp','email','internalNotes','consent','authorization','submissionKey','notification'];
export const publicFields = ['id','slug','reference','type','title','propertyType','transaction','dealStatus','urgent','location','city','district','state','pinCode','area','areaUnit','terms','summary','description','suitability','connectivity','landmarks','facilities','listingDate','expiryDate','images','video','updatedAt'];
export const defaults = { type:'Land Available', propertyType:'Open Land', transaction:'For Sale', dealStatus:'Open', adminStatus:'Inactive', approvalStatus:'Pending', publicationStatus:'Draft', urgent:false, featured:false, keepCompletedVisible:false, displayOrder:0, area:0, areaUnit:'sq. ft.', images:[], listingDate:'' };
export function isVisible(record, activeOnly = false) {
  return record.approvalStatus === 'Approved' && record.adminStatus === 'Active' && record.publicationStatus === 'Published' && (!record.expiryDate || record.expiryDate >= new Date().toISOString().slice(0,10)) && (record.dealStatus === 'Open' || (!activeOnly && record.keepCompletedVisible));
}
export function publicRecord(record) { return Object.fromEntries(publicFields.filter(key => record[key] !== undefined).map(key => [key, record[key]])); }
export const phoneValid = value => /^\+?[\d ()-]{7,20}$/.test(value || '') && (value.match(/\d/g)||[]).length >= 7;
export const emailValid = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
export function validate(input, {publicSubmission = false} = {}) {
  const errors = {};
  for (const key of ['title','location','city','state','description']) if (!String(input[key] || '').trim()) errors[key] = 'This field is required.';
  if (!(Number(input.area) > 0) || !Number.isFinite(Number(input.area))) errors.area = 'Enter an area greater than zero.';
  for (const [key, values] of Object.entries(options)) if (!values.includes(input[key])) errors[key] = 'Select a valid option.';
  for (const key of textFields) if (String(input[key] || '').length > (['description','internalNotes'].includes(key) ? 10000 : 2000)) errors[key] = 'This value is too long.';
  if (input.email && !emailValid(input.email)) errors.email = 'Enter a valid email address.';
  for (const key of ['phone','whatsapp']) if (input[key] && !phoneValid(input[key])) errors[key] = 'Enter a valid phone number.';
  if (input.pinCode && !/^\d{6}$/.test(input.pinCode)) errors.pinCode = 'Enter a six-digit PIN code.';
  for (const key of ['listingDate','expiryDate']) if (input[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(input[key]) || !Number.isFinite(Date.parse(input[key])) || new Date(input[key]).toISOString().slice(0,10)!==input[key])) errors[key] = 'Enter a valid date.';
  if (input.expiryDate && input.listingDate && input.expiryDate < input.listingDate) errors.expiryDate = 'Expiry must follow the listing date.';
  if (!Number.isInteger(Number(input.displayOrder)) || Math.abs(Number(input.displayOrder)) > 100000) errors.displayOrder = 'Enter a whole number between -100000 and 100000.';
  if (input.video) { try { if (new URL(input.video).protocol !== 'https:') throw Error(); } catch { errors.video = 'Use a valid HTTPS video URL.'; } }
  if (publicSubmission) {
    for (const key of ['contactName','phone','email']) if (!input[key]?.trim()) errors[key] = 'This field is required.';
    if (input.consent !== true) errors.consent = 'Consent is required.';
    if (input.type === 'Land Available' && input.authorization !== true) errors.authorization = 'Confirm ownership or authorization.';
  }
  return errors;
}

