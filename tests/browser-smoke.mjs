// Browser smoke test for the unconfigured/demo build only.
// Start the application separately without Supabase environment variables.
// CHROMIUM_EXECUTABLE_PATH can point to an installed Chromium binary.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';

const url=process.env.BASE_URL || 'http://127.0.0.1:3000';
if(!['127.0.0.1','localhost','::1','[::1]'].includes(new URL(url).hostname)) throw new Error('Browser tests require a local server.');
const executablePath=process.env.CHROMIUM_EXECUTABLE_PATH || undefined;
const args=process.env.CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox','--disable-dev-shm-usage']:[];
const browser=await chromium.launch({executablePath,args,headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900}});
await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
const page=await context.newPage();const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try {
 await page.goto(url,{waitUntil:'networkidle'});
 await page.getByText('Mode démonstration.',{exact:false}).waitFor();
 const nav=page.locator('.sidebar nav');
 await nav.getByRole('button',{name:'Prestations',exact:true}).click();
 await page.getByRole('button',{name:'Ajouter une prestation'}).click();
 let dialog=page.getByRole('dialog');
 await dialog.getByLabel('Nom de la prestation').fill('Service fictif navigateur');
 await dialog.getByLabel('Durée (minutes)').fill('30');
 await dialog.getByLabel('Prix (FCFA)').fill('1234');
 await dialog.getByRole('button',{name:'Ajouter',exact:true}).click();
 await page.getByText('Service fictif navigateur',{exact:true}).waitFor();
 await page.reload();await page.getByText('Mode démonstration.',{exact:false}).waitFor();
 await nav.getByRole('button',{name:'Prestations',exact:true}).click();
 await page.getByText('Service fictif navigateur',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Nouvelle réservation',exact:true}).click();
 dialog=page.getByRole('dialog');
 await dialog.getByLabel('Nom du client').fill('Client fictif navigateur');
 await dialog.getByLabel('Téléphone').fill('0102030405');
 await dialog.getByLabel('Heure').fill('08:15');
 await dialog.getByRole('button',{name:'Enregistrer la demande'}).click();
 await nav.getByRole('button',{name:'Réservations'}).click();
 const row=page.getByRole('row').filter({hasText:'Client fictif navigateur'});
 await row.waitFor();await row.getByRole('combobox').selectOption({label:'Confirmé'});
 await page.reload();await nav.getByRole('button',{name:'Réservations'}).click();
 assert.equal(await page.getByRole('row').filter({hasText:'Client fictif navigateur'}).getByRole('combobox').inputValue(),'Confirmé');
 await page.getByLabel('Rechercher une réservation').fill('Client fictif navigateur');
 assert.equal(await page.locator('tbody tr').count(),1);
 await nav.getByRole('button',{name:'Caisse & finances'}).click();
 await page.getByRole('button',{name:'Ajouter une dépense'}).click();
 dialog=page.getByRole('dialog');await dialog.getByLabel('Libellé').fill('Dépense fictive navigateur');await dialog.getByLabel('Montant (FCFA)').fill('1234');await dialog.getByRole('button',{name:'Ajouter',exact:true}).click();
 await page.getByText('Dépense fictive navigateur',{exact:true}).waitFor();
 await nav.getByRole('button',{name:'Vitrine publique'}).click();await page.getByText('Connectez la plateforme à Supabase').waitFor();
 await page.goto(`${url}/decouvrir`);await page.getByText('La plateforme n’est pas encore connectée.',{exact:false}).waitFor();
 assert.equal(await page.locator('.result-count').count(),0);
 await page.goto(`${url}/espace-vitrine`);await page.getByText('Connectez la plateforme à Supabase').waitFor();
 await page.goto(`${url}/salons/salon-inexistant`);await page.getByText('La plateforme n’est pas encore configurée.').waitFor();
 await page.setViewportSize({width:390,height:844});await page.goto(url);await page.getByText('Mode démonstration.',{exact:false}).waitFor();
 await page.getByRole('button',{name:'Ouvrir le menu'}).click();await page.locator('.sidebar nav').getByRole('button',{name:'Clients',exact:true}).click();await page.getByRole('heading',{name:'Clients récents'}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('OK : démo, persistance locale, navigation mobile, états publics non configurés ; aucune erreur JavaScript.');
} finally {await context.close();await browser.close()}
