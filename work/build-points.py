import json,re,datetime,hashlib
from pathlib import Path
import pdfplumber
ROOT=Path(__file__).resolve().parents[1]
CHARTS=ROOT/'work/charts'
BASE='https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/'
standard=['09-01/09-30','01-01/01-31,05-01/05-14','05-15/06-10,12-01/12-23','02-01/02-15,06-11/08-31','10-01/11-23,11-27/11-30','02-16/03-20,03-29/04-30,11-24/11-26','03-21/03-28,12-24/12-31']
periods={
'AULV':['01-03/02-27,09-05/10-09,11-10/11-22,11-28/12-23','04-04/04-28,05-06/06-27,10-10/11-09','02-28/03-18,04-29/05-05,08-09/09-04','01-01/01-02,03-19/04-03,06-28/08-08,11-23/11-27,12-24/12-31'],
'HH':['01-01/01-31,12-01/12-17','02-01/03-31,11-01/11-30,12-18/12-31','04-01/06-10,08-28/10-31','06-11/08-27'],
'GCAL-VGC':['01-03/02-27,09-05/09-30','04-04/06-27,10-01/11-22,11-28/12-16','02-28/03-18,06-28/09-04','01-01/01-02,03-19/04-03,11-23/11-27,12-17/12-31'],
'VERO':['09-01/11-23','05-01/05-31,11-27/12-23','01-01/01-31,06-01/08-31,11-24/11-26','02-01/02-13,04-04/04-30','02-14/04-03,12-24/12-31'],
'VDH':['01-01/01-31','05-01/05-22,08-16/09-15','02-01/03-14,09-16/09-30','05-23/05-31,10-01/11-22,11-27/12-17','06-01/08-15','03-15/03-20,03-29/04-30','03-21/03-28,11-23/11-26,12-18/12-31']}
def rooms(types,views):return [(t,v) for t in types for v in views]
S='Deluxe Studio';ONE='1-Bedroom Villa';TWO='2-Bedroom Villa';GRAND='3-Bedroom Grand Villa'
R='Resort View';P='Preferred View';TP='Theme Park View';STD='Standard View';SAV='Savanna View'
plain=lambda ts:rooms(ts,[''])
configs={
'AULV':('Aulani, Ko Olina, Hawaiʻi', [('Hotel Room',STD)]+rooms([S,ONE,TWO],[STD,'Island Gardens View','Poolside Gardens View','Ocean View'])+rooms([GRAND],[STD,'Ocean View'])),
'BLT':('Bay Lake Tower', rooms([S,ONE,TWO],[R,P,TP])+rooms([GRAND],[P,TP])),
'VWL-BRV':('Boulder Ridge Villas',plain([S,ONE,TWO])),
'CFW':('The Cabins at Fort Wilderness',plain(['Cabin'])),
'WCC-CCVC':('Copper Creek Villas & Cabins',plain([S,ONE,TWO,GRAND,'2-Bedroom Cabin'])),
'AKV_AKV2':('Animal Kingdom Villas (Jambo House / Kidani Village)',rooms([S,ONE,TWO],['Value Accommodation',R,SAV,'Kilimanjaro Club Concierge'])+rooms([GRAND],[R,SAV])),
'BCV':('Beach Club Villas',plain([S,ONE,TWO])),
'BWALK':('BoardWalk Villas',rooms([S,ONE,TWO],[R,'Boardwalk / Preferred View'])+rooms([GRAND],['Boardwalk / Preferred View'])),
'HH':('Hilton Head Island Resort',plain([S,ONE,TWO,GRAND])),
'CLUB-OKW':('Old Key West Resort',plain([S,ONE,TWO,GRAND])),
'POLYV':('Polynesian Villas & Bungalows / Island Tower',rooms([S],[R,P])+rooms(['2-Bedroom Bungalow'],[P])+rooms(['Duo Studio (Island Tower)'],[R,P,'Premium View'])+rooms(['Deluxe Studio (Island Tower)','1-Bedroom Villa (Island Tower)','2-Bedroom Villa (Island Tower)'],[R,P,TP])+rooms(['2-Bedroom Penthouse Villa (Island Tower)'],[P,TP])),
'RVA':('Riviera Resort',plain(['Tower Studio'])+rooms([S,ONE,TWO],[R,P])+plain([GRAND])),
'SSR':('Saratoga Springs Resort & Spa',rooms([S,ONE,TWO,GRAND],['Standard','Preferred'])+plain(['3-Bedroom Treehouse Villa'])),
'VERO':('Vero Beach Resort',[('Deluxe Inn Room',STD),(S,''),('Deluxe Inn Room','Ocean View')]+plain([ONE,TWO,'3-Bedroom Beach Cottage'])),
'GCAL-VGC':('Grand Californian Hotel & Spa',plain([S,ONE,TWO,GRAND])),
'VGF':('Grand Floridian Resort & Spa',rooms(['Resort Studio'],[R,P,TP])+rooms([S,ONE,TWO],[R,P])+plain([GRAND])),
'VDH':('The Villas at Disneyland Hotel',rooms(['Duo Studio',S],[STD,P])+rooms([ONE,TWO,GRAND],[P])+plain(['Garden Room Duo Studio','Garden Room Deluxe Studio']))}
resorts=[];checks=0
for code,(name,categories) in configs.items():
 filename='2027-AULV-Updated-2-11-26.pdf' if code=='AULV' else f'2027_{code}.pdf'
 with pdfplumber.open(CHARTS/filename) as pdf:text=pdf.pages[0].extract_text()
 rate_lines=[]
 for line in text.splitlines():
  m=re.search(r'(SUN—THU|SUN—SAT|FRI—SAT)\s+([\d ]+)$',line)
  if m:rate_lines.append((m[1],list(map(int,m[2].split()))))
 ps=periods.get(code,standard)
 assert len(rate_lines)==len(ps)*(1 if code=='AULV' else 2),(code,len(rate_lines))
 # Numeric weekly rows are occasionally positioned above the WEEKLY label in PDFs.
 weekly=[]
 for line in text.splitlines():
  m=re.search(r'WEEKLY\s+([\d ]+)$',line)
  if m:weekly.append(list(map(int,m[1].split())))
  elif re.fullmatch(r'[\d ]+',line) and len(line.split())==len(categories) and len(line.split())>1:weekly.append(list(map(int,line.split())))
 # BRV prints one weekly row without a WEEKLY label.
 if code=='VWL-BRV':
  assert len(weekly)==len(ps)
 assert len(weekly)==len(ps),(code,'weekly',len(weekly))
 output=[];covered=set()
 for i,spec in enumerate(ps):
  wk=rate_lines[i if code=='AULV' else i*2][1];we=wk if code=='AULV' else rate_lines[i*2+1][1]
  assert len(wk)==len(we)==len(categories)==len(weekly[i]),(code,'width')
  assert [5*a+2*b for a,b in zip(wk,we)]==weekly[i],(code,'weekly mismatch',i)
  checks+=len(wk)
  ranges=[];labels=[]
  for pair in spec.split(','):
   a,b=[datetime.date.fromisoformat('2027-'+v) for v in pair.split('/')]
   ranges.append({'start':a.isoformat(),'end':b.isoformat()});labels.append(a.strftime('%b %-d')+' – '+b.strftime('%b %-d'))
   while a<=b:
    assert a.isoformat() not in covered,(code,'overlap',a)
    covered.add(a.isoformat());a+=datetime.timedelta(days=1)
  output.append({'id':str(i+1),'label':'; '.join(labels),'ranges':ranges,'rates':[{'weekday':a,'weekend':b} for a,b in zip(wk,we)]})
 assert len(covered)==365,(code,'coverage',len(covered))
 resorts.append({'id':code,'name':name,'source':BASE+filename,'sourceSha256':hashlib.sha256((CHARTS/filename).read_bytes()).hexdigest(),'categories':[{'room':t,'view':v} for t,v in categories],'periods':output})
 print(code,len(categories),'categories;',len(ps),'periods; full-year coverage; weekly totals match')
data={'year':2027,'sourceIndex':'https://disneyvacationclub.disney.go.com/vacation-planning/points-charts','retrieved':'2026-10-20','resorts':resorts}
(ROOT/'points-2027.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(ROOT/'points-2027.js').write_text('/* Official Disney 2027 chart data. Generated by work/build-points.py. */\nwindow.DVC_POINTS = '+json.dumps(data,ensure_ascii=False)+';\n')
print('Validated',checks,'room/period pairs')
