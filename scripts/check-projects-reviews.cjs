const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const root = require('node:path').resolve(__dirname, '..') + require('node:path').sep;
let count = 0;
function check(value, message) { assert(value,message); count++; }
let projectsSource=fs.readFileSync(root+'projects.js','utf8').replace(/^import[\s\S]+?from "https:\/\/www.gstatic.com\/firebasejs\/10.12.2\/firebase-firestore.js";\n/, '').replace(/bootstrapProjects\(\);\s*$/,'');
const containers = Object.fromEntries(['upcoming-project-list','upcoming-project-count','finished-project-list','finished-project-count'].map(id=>[id,{innerHTML:'',textContent:''}]));
const projectContext={window:{location:{origin:'https://www.goldenbrickc.com'}}, URL, console, Date, document:{getElementById:id=>containers[id],addEventListener:()=>{}}};
vm.createContext(projectContext); vm.runInContext(projectsSource,projectContext);
check(projectContext.statusLabel({id:'KD8LBlGkDJMsBueSTuav',status:'upcoming'})==='Planned','Bank must remain planned');
check(projectContext.projectText('Whole-Home Renovation')==='Full-Home Renovation','Title terminology');
check(projectContext.projectText('Whole-home renovations')==='Full-home renovations','Sentence case terminology');
check(projectContext.projectText('a whole-home renovation')==='a full-home renovation','Prose terminology');
check(projectContext.projectText('WHOLE HOME RENOVATION')==='FULL-HOME RENOVATION','Uppercase legacy terminology');
check(projectContext.projectText('Published Projects')==='Projects','Internal publishing label removed');
const displayCard=projectContext.renderProjectCard({id:'new',title:'Whole-Home Renovation',projectType:'Whole-Home',description:'A whole-home renovation',scope:['whole-home repairs'],relatedServices:[{label:'Whole-Home Renovation',href:'/projects/italian-market-whole-home-renovation/'}],coverPhoto:{url:'https://example.com/photo.jpg',alt:'whole-home renovation'}});
check(displayCard.includes('/projects/italian-market-whole-home-renovation/'),'Legacy project URL preserved');
check(displayCard.includes('Full-Home Renovation')&&displayCard.includes('A full-home renovation')&&displayCard.includes('full-home repairs')&&displayCard.includes('alt="full-home renovation"'),'All project display fields normalized');

const staticPortfolio=fs.readFileSync(root+'projects.html','utf8');
check(!/<script[^>]+src=["'][^"']*projects\.js/.test(staticPortfolio),'Showcase must not load the project feed');
check(!/data-project-card|id="(?:upcoming|finished)-project-(?:list|count)"/.test(staticPortfolio),'Showcase has no named project records or status lists');
const showcaseLinks=[...staticPortfolio.matchAll(/<a href="([^"]+)" data-media-viewer data-media-gallery="work"/g)].map(match=>match[1]);
check(showcaseLinks.length>=30&&new Set(showcaseLinks).size===showcaseLinks.length,'Showcase includes a varied gallery without duplicate photos');
check(showcaseLinks.every(url=>fs.existsSync(root+url.replace(/^\//,''))),'Every showcase photo opens an existing full-size asset');
check((staticPortfolio.match(/<video controls playsinline preload="none"/g)||[]).length===3,'All three films use visitor-controlled playback');
check(!/firebasestorage\.googleapis\.com|View Project|In Progress and Planned/.test(staticPortfolio),'Showcase contains only curated work rather than project listings');
check(projectContext.renderProjectCard({id:'new',description:'New project description'}).includes('<p>New project description</p>'),'New projects retain their editor descriptions');
check(projectContext.renderProjectCard({id:'new'}).includes('Contact us to learn more about this project.'),'New projects without descriptions retain useful fallback');

check(projectContext.statusLabel({status:'finished'})==='Completed','Completed status');
check(projectContext.statusLabel({status:'planned'})==='Planned','Explicit planned status');
check(projectContext.statusLabel({status:'upcoming'})==='Upcoming','Unknown upcoming must not claim under construction');
check(projectContext.safeProjectUrl('javascript:alert(1)')==='','Unsafe scheme rejected');
check(projectContext.safeProjectUrl('/contact.html')==='https://www.goldenbrickc.com/contact.html','Local URL supported');
check(projectContext.projectPhoto({})==='','No unrelated photo fallback');
const card=projectContext.renderProjectCard({id:'test',title:'<script>Bad</script>',coverPhoto:{url:'https://example.com/main.jpg'},galleryPhotos:[{url:'https://example.com/main.jpg'},{url:'https://example.com/room.jpg',alt:'Renovated kitchen'}]});
check(card.includes('&lt;script&gt;Bad&lt;/script&gt;')&&!card.includes('<script>Bad'),'Titles escaped');
check(card.includes('aria-pressed="true"')&&card.includes('Main photo')&&card.includes('data-gallery-alt="Renovated kitchen"'),'Accessible gallery and original photo return');
projectContext.renderProjects([{id:'old',published:true,status:'finished',completedAt:'2015-01-01',title:'Old project'},{id:'draft',published:true,draftOnly:true,title:'Draft only'}]);
check(containers['finished-project-list'].innerHTML.includes('Old project'),'Completed work never expires');
check(!containers['upcoming-project-list'].innerHTML.includes('Draft only'),'Draft suppressed');

class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.events={};this.hidden=false;this.disabled=false;this._text='';this.map={};this.classList={items:new Set(),add:(...x)=>x.forEach(v=>this.classList.items.add(v)),remove:(...x)=>x.forEach(v=>this.classList.items.delete(v))};}
 appendChild(x){this.children.push(x);return x;} set textContent(v){this._text=v;this.children=[];} get textContent(){return this._text;} setAttribute(k,v){this.attributes[k]=v;} removeAttribute(k){delete this.attributes[k];} querySelector(k){return this.map[k]||null;} querySelectorAll(k){return this.map[k] ? [this.map[k]]:[];} addEventListener(k,f){this.events[k]=f;}
}
function reviewRoot(){const x=new Element();x.dataset={};for(const sel of ['[data-google-review-summary]','[data-google-average-rating]','[data-google-review-count]','.google-review-summary-stars','[data-google-review-list]','[data-google-review-status]','[data-google-reviews-more]'])x.map[sel]=new Element(); x.map['[data-google-review-summary]'].map=x.map;return x;}
let responseMode='success';
const reviewContext={Intl,URL,console,AbortController,window:{location:{origin:'https://www.goldenbrickc.com'},setTimeout,clearTimeout},document:{createElement:t=>new Element(t),createTextNode:t=>({textContent:t}),querySelectorAll:()=>[]},fetch:async()=>responseMode==='success'?{ok:true,json:async()=>({available:true,averageRating:4.2,totalReviewCount:2,reviews:[{reviewerDisplayName:'Client',rating:4,text:'Original review',createTime:'2026-01-01'}],nextCursor:1})}:{ok:false,json:async()=>({message:'Sensitive internal debug text'})}};
vm.createContext(reviewContext);
vm.runInContext(fs.readFileSync(root+'google-reviews.js','utf8').replace('document.querySelectorAll("[data-google-reviews]").forEach(initialiseReviews);','globalThis.testApi={reviewStars,renderSummary,renderUnavailable,initialiseReviews};'),reviewContext);
const {testApi}=reviewContext;
check(testApi.reviewStars(null).textContent==='Rating unavailable','Missing rating never becomes fake one-star');
const r=reviewRoot();testApi.renderSummary(r,{averageRating:4.2,totalReviewCount:3});
check(r.map['.google-review-summary-stars'].textContent==='★★★★☆','Summary stars reflect average');
testApi.renderSummary(r,{averageRating:0,totalReviewCount:0});
check(r.map['.google-review-summary-stars'].textContent===''&&r.map['[data-google-average-rating]'].textContent==='—','No synthetic zero rating');
testApi.renderUnavailable(r);
check(r.map['[data-google-review-summary]'].hidden,'Unavailable summary hidden');
check(r.map['[data-google-reviews-more]'].textContent==='Try again'&&!r.map['[data-google-reviews-more]'].disabled,'Error offers working retry');
check(r.map['[data-google-review-list]'].classList.items.has('is-unavailable'),'Compact error class');
(async()=>{const page=reviewRoot();testApi.initialiseReviews(page);await new Promise(resolve=>setImmediate(resolve));check(page.map['[data-google-review-list]'].children.length===1,'Successful review renders');responseMode='fail';page.map['[data-google-reviews-more]'].events.click();await new Promise(resolve=>setImmediate(resolve));check(page.map['[data-google-review-list]'].children.length===1,'Pagination failure preserves existing reviews');check(page.map['[data-google-reviews-more]'].textContent==='Try again','Pagination failure retry');check(!page.map['[data-google-review-status]'].textContent.includes('Sensitive'),'Raw backend error not displayed');const home=reviewRoot();home.dataset.hideUnavailable="true";testApi.initialiseReviews(home);check(home.hidden,"Homepage widget starts hidden until genuine reviews arrive");await new Promise(resolve=>setImmediate(resolve));check(home.hidden,"Homepage failure stays hidden");responseMode="success";const loadedHome=reviewRoot();loadedHome.dataset.hideUnavailable="true";testApi.initialiseReviews(loadedHome);await new Promise(resolve=>setImmediate(resolve));check(!loadedHome.hidden,"Homepage reveals genuine successfully loaded reviews");console.log(`${count} project/review behavior checks passed.`);})().catch(e=>{console.error(e);process.exitCode=1;});
