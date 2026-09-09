import re, json, sys
from html.parser import HTMLParser
src=sys.argv[1]; out=sys.argv[2]
s=open(src).read()
s=re.sub(r'<(?!/?(?:div|p|span|a|br|img|strong|b|i|em|u|ul|ol|li|h\d|html|head|body|meta|link|script|style|title|nav|section|footer|main|input|astro-[\w-]+|!)\b)','&lt;',s)

# --- sidebar taxonomy ---
tax={}
for tab in ('robot','tools','api'):
    tax[tab]=[]
    for m in re.finditer(r'<div class="w-full pt-1 hidden %s-tags">(.*?)</div>\s*</div>\s*(?=<div class="w-full pt-1 hidden|<div class="col-span-5)'%tab, s, re.S):
        blk=m.group(1)
        t=re.search(r'data-title="([^"]*)"[^>]*>([^<]*)<',blk)
        subs=re.findall(r'data-index="([^"]*)"[^>]*>([^<]*)</p>',blk)
        tax[tab].append({'group':t.group(2).strip(),'data_title':t.group(1),'subs':[{'idx':a,'name':b.strip()} for a,b in subs]})

# --- tables ---
class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack=[]; self.tables=[]; self.cur=None; self.cell=None; self.lang=None; self.depth=0; self.celldepth=None; self.tabledepth=None; self.item=None; self.itemdepth=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs); cls=a.get("class",""); VOID={"br","img","hr","input","meta","link"}
        if tag not in VOID: self.depth+=1
        if tag=='div' and re.match(r'pricingItem-(robot|tools|api)\b',cls):
            self.item={'tab':re.match(r'pricingItem-(\w+)',cls).group(1),'idx':a.get('data-index'),'tables':[]}; self.itemdepth=self.depth
        if tag=='div' and 'grid-item' in cls:
            self.cur={'rows':a.get('style',''),'cols':[]}; self.tabledepth=self.depth
        if self.cur is not None and tag=='div' and cls.startswith('p-3 border-r-2'):
            self.cell={'header':'bg-[#e4e0ff]' in cls,'text':{'en':'','zh':'','jp':'','ru':''}}; self.celldepth=self.depth
            if self.cell['header']: self.cur['cols'].append({'header':None,'cells':[]})
        if self.cell is not None and tag=='span' and 'pricing-' in cls:
            self.lang=re.search(r'pricing-(\w+)',cls).group(1)
        if self.cell is not None and tag=='span' and 'h-[2px]' in cls:
            for k in self.cell['text']: self.cell['text'][k]+=' || '
        if self.cell is not None and tag=='br':
            for k in self.cell['text']: self.cell['text'][k]+='\n'
        if self.cell is not None and tag=='a':
            for k in self.cell['text']: self.cell['text'][k]+='[a href=%s]'%a.get('href','')
    def handle_endtag(self,tag):
        if self.lang and tag=='span': self.lang=None
        if self.cell is not None and self.depth==self.celldepth:
            t={k:re.sub(r'\s+',' ',v).strip() for k,v in self.cell['text'].items()}
            col=self.cur['cols'][-1]
            if self.cell['header']: col['header']=t
            else: col['cells'].append(t)
            self.cell=None
        if self.cur is not None and self.depth==self.tabledepth:
            self.item['tables'].append(self.cur); self.cur=None
        if self.item is not None and self.depth==self.itemdepth:
            self.tables.append(self.item); self.item=None
        if tag not in {"br","img","hr","input","meta","link"}: self.depth-=1
    def handle_data(self,d):
        if self.cell is None: return
        if self.lang: self.cell['text'][self.lang]+=d
        else:
            for k in self.cell['text']: self.cell['text'][k]+=d
p=P(); p.feed(s)
json.dump({'taxonomy':tax,'items':p.tables},open(out,'w'),ensure_ascii=False,indent=1)
print('items',len(p.tables),'tables',sum(len(i['tables']) for i in p.tables))
for tab in tax: print(tab,len(tax[tab]),'groups',sum(len(g['subs']) for g in tax[tab]),'subs')
