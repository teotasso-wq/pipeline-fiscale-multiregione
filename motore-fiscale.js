// ===== MOTORE FISCALE NAZIONALE — unica fonte di verità =====
// Usato da tutti i test della pipeline (Piemonte, Lombardia-comuni, ecc.)
// Un fix qui si propaga automaticamente a ogni test che lo importa.
// Verificato e allineato al calcolatore ufficiale consegnato a Jet HR
// (regole 2026: 3 scaglioni IRPEF, detrazioni, cuneo fiscale, +65 comma 1-bis,
// soglia INPS aggiuntiva 56.224€).

function progressivo(base, brackets){
  let imposta = 0;
  for(const [min, max, rate] of brackets){
    if(base > min){ imposta += (Math.min(base, max) - min) * rate; }
  }
  return imposta;
}

const SCAGLIONI_IRPEF = [[0,28000,0.23],[28000,50000,0.33],[50000,Infinity,0.43]];

function calcolaINPS(ral){
  const SOGLIA = 56224; // Circolare INPS n.6/2026, fonte primaria inps.it
  if(ral <= SOGLIA) return ral * 0.0919;
  return SOGLIA * 0.0919 + (ral - SOGLIA) * 0.1019;
}

function detrazioneLavoroDipendente(reddito){
  // Calcolata sull'imponibile fiscale (RAL - INPS), non sulla RAL lorda —
  // bug reale trovato e corretto durante la validazione incrociata del
  // calcolatore ufficiale (vedi README del progetto principale).
  let base = 0;
  if(reddito <= 15000) base = 1955;
  else if(reddito <= 28000) base = 1910 + 1190 * (28000 - reddito) / 13000;
  else if(reddito <= 50000) base = 1910 * (50000 - reddito) / 22000;
  // Maggiorazione comma 1-bis: confermata da due fonti indipendenti concordanti
  if(reddito > 25000 && reddito <= 35000) base += 65;
  return Math.max(0, base);
}

function ulterioreDetrazioneCuneo(reddito){
  if(reddito > 20000 && reddito <= 32000) return 1000;
  if(reddito > 32000 && reddito <= 40000) return 1000 * (40000 - reddito) / 8000;
  return 0;
}

function sommaNonImponibileCuneo(reddito){
  if(reddito <= 8500) return reddito * 0.071;
  if(reddito <= 15000) return reddito * 0.053;
  if(reddito <= 20000) return reddito * 0.048;
  return 0;
}

function trattamentoIntegrativo(reddito, irpefLorda, detrLavoro){
  if(reddito <= 15000 && irpefLorda > detrLavoro) return 1200;
  return 0;
}

// Funzione di alto livello: dato RAL + config addizionali locali, ritorna
// tutti i componenti. Ogni test passa la propria configurazione regionale/
// comunale — il motore nazionale resta identico per tutti.
function calcolaNetto(ral, scaglioniRegionali, addComunaleFn){
  const inps = calcolaINPS(ral);
  const imponibile = ral - inps;
  const irpefLorda = progressivo(imponibile, SCAGLIONI_IRPEF);
  const detrLav = detrazioneLavoroDipendente(imponibile);
  const detrCuneo = ulterioreDetrazioneCuneo(imponibile);
  const irpefNetta = Math.max(0, irpefLorda - detrLav - detrCuneo);
  const addReg = progressivo(imponibile, scaglioniRegionali);
  const addCom = addComunaleFn(imponibile);
  const bonus = sommaNonImponibileCuneo(imponibile);
  const trattInt = trattamentoIntegrativo(imponibile, irpefLorda, detrLav);
  const netto = ral - inps - irpefNetta - addReg - addCom + bonus + trattInt;
  return { inps, imponibile, irpefLorda, detrLav, detrCuneo, irpefNetta, addReg, addCom, bonus, trattInt, netto };
}
