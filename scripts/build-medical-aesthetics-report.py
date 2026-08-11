import json, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
symbols={'sz300896':'爱美客','sh688363':'华熙生物','sh688366':'昊海生科','sh600200':'江苏吴中','sz002612':'朗姿股份'}
rows={}
for code in symbols:
    url=f'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={code},day,2024-01-01,2026-08-10,900,qfq'
    with urllib.request.urlopen(url,timeout=20) as r: payload=json.load(r)
    raw=payload['data'][code].get('qfqday') or payload['data'][code]['day']
    rows[code]={x[0]:{'o':float(x[1]),'c':float(x[2]),'h':float(x[3]),'l':float(x[4]),'v':float(x[5])/10000} for x in raw}

dates=sorted(set.intersection(*(set(x) for x in rows.values())))
dates=dates[-300:]
index=100.0; ohlc=[]; volumes=[]; prices=[]
prev={code:rows[code][dates[0]]['c'] for code in symbols}
for i,d in enumerate(dates):
    day=[rows[c][d] for c in symbols]
    if i==0: ro=rh=rl=rc=1
    else:
        ro=sum(rows[c][d]['o']/prev[c] for c in symbols)/len(symbols)
        rh=sum(rows[c][d]['h']/prev[c] for c in symbols)/len(symbols)
        rl=sum(rows[c][d]['l']/prev[c] for c in symbols)/len(symbols)
        rc=sum(rows[c][d]['c']/prev[c] for c in symbols)/len(symbols)
    op=index*ro; cl=index*rc; hi=max(index*rh,op,cl); lo=min(index*rl,op,cl)
    index=cl
    ohlc.append({'date':d,'open':round(op,2),'high':round(hi,2),'low':round(lo,2),'close':round(cl,2)})
    prices.append(round(cl,2)); volumes.append(round(sum(x['v'] for x in day),2))
    prev={c:rows[c][d]['c'] for c in symbols}

ma=lambda n: sum(prices[-n:])/n
va=lambda n: sum(volumes[-n:])/n
mas={n:round(ma(n),2) for n in [5,10,20,60,90,120,145,250]}
vmas={n:round(va(n),2) for n in [5,10,20,60,90,145]}
last=prices[-1]; vol=volumes[-1]
hi=max(prices); lo=min(prices); fib=[round(lo+(hi-lo)*x,2) for x in [.382,.5,.618]]
above_short=last>mas[20] and last>mas[60]
tech_rating='观察' if above_short else '不适合左侧交易'
report={
 'id':'medical-aesthetics','industry':'医美行业','category':'mixed','asOf':'2026-08-10','updatedAt':'2026-08-11T16:30:00+08:00',
 'decisionOverview':{'items':[{'label':'产业价值','value':'中高','score':76,'comment':'非手术化与合规集中仍是长期方向'},{'label':'商业质量','value':'分化','score':67,'comment':'上游高毛利，但单品与渠道依赖明显'},{'label':'景气位置','value':'磨底','score':48,'comment':'2025龙头收入普遍承压，未全面反转'},{'label':'技术位置','value':tech_rating,'score':58 if above_short else 42,'comment':f'篮子{last:.2f}，MA20/60为{mas[20]:.2f}/{mas[60]:.2f}'},{'label':'综合评级','value':'观察','score':62,'comment':'等待业绩与量价双确认'}],'coreConflict':'长期渗透率、材料创新和合规集中度提升，与短期消费偏弱、产品同质化和渠道价格竞争并存。','action':'不把医美当作整体高景气赛道追涨；优先跟踪有三类证、差异化材料、新品放量和现金流验证的上游产品公司。'},
 'weeklyChanges':{'period':'首次建立','title':'首次建立决策基线','summary':'本期首次建立医美行业结构化基线。下周自动比较景气分、龙头业绩、监管、估值与技术触发状态。','items':[]},
 'prosperity':{'level':'景气磨底','direction':'弱复苏预期、结构分化','directionTone':'warning','score':48,'verdict':'2025年行业消费规模仍增长，但上市上游龙头业绩显示供给竞争与终端需求压力：爱美客收入同比-18.94%，华熙生物主营收入-21.75%，昊海生科医美收入-12.97%。因此当前不是全行业反转，而是重组胶原蛋白、再生材料、合规高端产品与强新品可能率先突围。','dimensions':[{'name':'需求','value':'中性','change':'市场扩容、客单与频次承压','tone':'warning'},{'name':'供给','value':'偏松','change':'产品丰富、同质化竞争','tone':'negative'},{'name':'监管','value':'趋严','change':'利好持证合规龙头','tone':'positive'},{'name':'盈利','value':'承压','change':'2025龙头普遍下滑','tone':'negative'}],'driver':'轻医美渗透率、抗衰需求、新材料审批和合规机构集中度提升。','improvement':'龙头收入连续两个季度恢复双位数增长，毛利率稳定、销售费用率不恶化，且新品收入占比提升。','deterioration':'新品放量不及预期、终端降价传导至出厂价、获客费用持续上升或监管安全事件。'},
 'summary':{'stage':'景气磨底—等待产品周期反转','rating':'观察，暂不做行业级左侧重仓','confidence':'中高','conclusion':f'医美具备长期投资价值，但当前更像“优质细分可研究、板块整体未反转”。2025年三家核心上游龙头收入或医美收入均下降，说明行业规模增长没有等比例转化为上市公司利润。策略上应从材料壁垒、三类证、医生教育、渠道纪律和现金流筛选公司；技术上5股等权篮子为{last:.2f}，应等待业绩拐点与放量突破{fib[0]:.2f}共同确认，再考虑试仓。','evidence':['2025年中国医美服务市场规模第三方口径3701亿元，非手术用户3105万人','爱美客2025收入24.53亿元，同比-18.94%；昊海生科医美收入10.40亿元，同比-12.97%','监管强化机构、人员、产品和广告全链条合规，长期利好持证龙头']},
 'cycle':{'current':'景气磨底—等待产品周期反转','stages':['高速渗透','供给扩张','同质化竞争','需求与利润下行','景气磨底—等待产品周期反转','新品放量复苏','全面景气扩张']},
 'reversalConditions':[
  {'name':'终端需求恢复','dimension':'需求','current':'市场规模增长，但上市公司收入未同步','threshold':'龙头收入连续两季同比>10%','status':'partial','trend':'flat','source':'2025年报与第三方行业统计'},
  {'name':'新品形成第二增长曲线','dimension':'产品','current':'重组胶原蛋白、再生材料等处于放量/导入期','threshold':'新品收入占比提升且不靠明显降价','status':'partial','trend':'up','source':'公司年报与注册信息'},
  {'name':'盈利质量反转','dimension':'利润','current':'爱美客、昊海生科2025利润明显下降','threshold':'利润增速连续两季高于收入，经营现金流改善','status':'unmet','trend':'down','source':'2025年报'},
  {'name':'合规集中度提升','dimension':'监管','current':'十一部门综合监管与UDI追溯持续推进','threshold':'正规机构与持证产品份额持续提升','status':'met','trend':'up','source':'市场监管总局、国家药监局'},
  {'name':'技术趋势确认','dimension':'交易','current':f'篮子{last:.2f}；MA20/60/145={mas[20]:.2f}/{mas[60]:.2f}/{mas[145]:.2f}','threshold':f'放量突破{fib[0]:.2f}且回踩不破','status':'partial' if above_short else 'unmet','trend':'up' if above_short else 'flat','source':'腾讯证券前复权日线，截至2026-08-10'}],
 'metrics':[
  {'label':'2025医美服务规模','value':'3,701','unit':'亿元','change':'第三方估算','direction':'up','series':[2666,3115,3701]},
  {'label':'爱美客2025收入','value':'24.53','unit':'亿元','change':'同比 -18.94%','direction':'down','series':[28.69,30.26,24.53]},
  {'label':'华熙生物2025收入','value':'41.99','unit':'亿元','change':'同比 -21.82%','direction':'down','series':[60.76,53.71,41.99]},
  {'label':'昊海医美收入','value':'10.40','unit':'亿元','change':'同比 -12.97%','direction':'down','series':[9.62,11.95,10.4]},
  {'label':'篮子收盘','value':f'{last:.2f}','unit':'点','change':'截至8月10日','direction':'up' if prices[-1]>prices[-20] else 'down','series':prices[-20:]},
  {'label':'量能/20日均量','value':f'{vol/vmas[20]:.2f}','unit':'倍','change':'突破需>1.2倍','direction':'up' if vol>vmas[20] else 'down','series':volumes[-20:]}],
 'industryChain':[
  {'stage':'上游','title':'生物材料、原料与设备','items':['透明质酸、重组胶原蛋白、PLLA/PCL等材料决定产品壁垒','三类医疗器械注册、临床证据与产能质量体系构成准入门槛','能量源设备依赖研发、注册和医院/机构渠道']},
  {'stage':'中游','title':'医美产品与品牌运营','items':['注射填充、肉毒素、再生材料和光电设备是利润核心','医生教育、学术推广和渠道价格纪律决定放量质量','新品成功率、单品依赖和营销费用是估值关键']},
  {'stage':'下游','title':'机构、医生与消费者','items':['正规医院、连锁机构和医生交付服务','获客成本、复购率、客单价与医疗事故率决定机构利润','合规监管压缩非法机构，长期促进行业集中']}],
 'companyComparison':[
  {'tier':'核心观察','tone':'positive','company':'爱美客','ticker':'300896.SZ','driver':'高毛利注射产品、再生材料与海外布局','valuation':'以可持续利润和新品概率加权估值','risk':'单品依赖、终端需求与价格竞争'},
  {'tier':'成长弹性','tone':'positive','company':'锦波生物','ticker':'920982.BJ','driver':'重组人源化胶原蛋白先发与产能扩张','valuation':'高增长需用收入、费用率和现金流共同验证','risk':'估值较高、竞争者获批与销售投入'},
  {'tier':'修复观察','tone':'warning','company':'华熙生物','ticker':'688363.SH','driver':'原料平台、医药终端与护肤业务调整','valuation':'关注护肤止跌、费用收缩与利润修复','risk':'消费品转型、品牌投入回报'},
  {'tier':'修复观察','tone':'warning','company':'昊海生科','ticker':'688366.SH','driver':'玻尿酸新品、眼科与多产品平台','valuation':'分部估值优于只看整体PE','risk':'医美收入下滑、集采与减值'},
  {'tier':'终端观察','tone':'negative','company':'朗姿股份','ticker':'002612.SZ','driver':'医美机构扩张与运营改善','valuation':'看同店增长、获客成本和门店现金回收','risk':'重资产扩张、医疗合规与跨业务复杂度'}],
 'valuationScenarios':[
  {'name':'乐观','weight':'25%','assumption':'新品放量、消费恢复，龙头收入重回15%以上增长','valuation':'可给成长溢价，但必须由现金流与利润上修支撑','signal':'连续两季收入利润双位数增长'},
  {'name':'基准','weight':'50%','assumption':'行业温和增长、传统玻尿酸承压，结构性新品贡献','valuation':'按存量现金流+新品概率加权，避免给全部管线满估值','signal':'收入止跌、费用率稳定'},
  {'name':'悲观','weight':'25%','assumption':'消费疲弱、同质化降价，新品放量慢','valuation':'回归存量产品现金流和净现金底线','signal':'收入继续下降且销售费用率上升'}],
 'catalysts':[{'date':'2026Q3','event':'2026年中报','expectation':'核心公司收入止跌、利润降幅收窄','status':'pending','statusLabel':'关键验证'},{'date':'持续','event':'三类器械新品获批与放量','expectation':'差异化产品形成真实销售','status':'pending','statusLabel':'跟踪'},{'date':'每季度','event':'终端价格与机构客流','expectation':'客单、复购和渠道库存改善','status':'pending','statusLabel':'跟踪'}],
 'executionPlan':{'action':'观察；满足双确认后试仓','trigger':f'基本面出现连续两季收入/利润改善，同时篮子放量突破{fib[0]:.2f}','add':f'回踩MA60 {mas[60]:.2f}附近不破，且新品收入继续兑现','priceInvalidation':f'跌破样本期低点{lo:.2f}','fundamentalInvalidation':'龙头收入继续双位数下降、销售费用率上行，或发生重大产品安全/监管事件','nextReview':'2026年中报披露及重点新品月度放量数据后'},
 'bearCase':['行业规模口径包含服务收入，不能直接映射上游产品公司的收入利润','消费者长期需求存在，但客单价下降和机构促销可能吞噬量增','重组胶原蛋白和再生材料的高增长可能吸引更多供给，先发溢价会下降','产品获批不等于商业成功，医生教育、渠道库存与真实复购更重要'],
 'evidenceQuality':[{'grade':'A','label':'监管与上市公司财报','note':'国家部委、交易所和公司法定披露'},{'grade':'B','label':'行业市场规模','note':'第三方统计，经国家税务总局转载，不等同官方统计'},{'grade':'A','label':'交易行情','note':'腾讯证券前复权日线，5股等权计算'},{'grade':'D','label':'波浪与缠论','note':'主观结构工具，仅用于择时和失效定义'}],
 'technical':{'instrument':'医美A股5股等权篮子（爱美客、华熙生物、昊海生科、江苏吴中、朗姿股份）','timeframe':'日线 / 周线','trend':f'篮子{last:.2f}；MA5/10/20/60/90/120/145/250分别为'+ '/'.join(f'{mas[n]:.2f}' for n in [5,10,20,60,90,120,145,250])+('。短中期修复，但需长期均线确认。' if above_short else '。短中期仍偏弱。'),'volume':f'当日成交量{vol:.2f}万手，为5/10/20/60/90/145日均量的'+ '/'.join(f'{vol/vmas[n]:.2f}' for n in [5,10,20,60,90,145])+'倍。','wave':f'主计数为下跌后的修复浪；备选计数为下降趋势中继。突破{fib[0]:.2f}提高反转概率，跌破{lo:.2f}失效。','fibonacci':f'以样本高低点{hi:.2f}/{lo:.2f}为锚，0.382/0.5/0.618反弹位为{fib[0]:.2f}/{fib[1]:.2f}/{fib[2]:.2f}。','chan':f'日线需先形成离开中枢的放量上笔，随后回踩不破{fib[0]:.2f}才是较可靠三买候选；仅凭日线不能精确确认30分钟买点。','rating':tech_rating,'riskReward':'当前一般，等待基本面与价格双确认','trigger':f'成交量达到20日均量1.2倍以上突破{fib[0]:.2f}，回踩不破；同时中报验证业绩止跌','invalidation':f'跌破{lo:.2f}或基本面继续恶化','volumeUnit':'5股成交量合计，万手','volumeAverages':[{'days':n,'average':vmas[n],'ratio':round(vol/vmas[n],2)} for n in [5,10,20,60,90,145]],'prices':prices,'volumes':volumes,'ohlc':ohlc},
 'scenarios':[{'name':'乐观','weight':'25%','assumption':'新品周期与消费恢复共振','signal':f'放量突破{fib[1]:.2f}且盈利上修'},{'name':'基准','weight':'50%','assumption':'结构性机会、板块震荡','signal':'上游产品公司分化，等待中报'},{'name':'悲观','weight':'25%','assumption':'价格竞争延续、利润继续承压','signal':f'篮子跌破{lo:.2f}'}],
 'risks':['非医保消费受居民收入与消费信心影响大','三类医疗器械注册与安全事件风险','产品同质化、渠道压货与终端价格战','高销售费用与医生教育投入不一定转化为复购','5股篮子含跨业务公司，仅代表可交易样本，不等于全行业指数'],
 'sources':['国家统计局：2026年上半年社会消费品零售总额，同比增长1.3% https://www.stats.gov.cn/english/PressRelease/202607/t20260717_1964156.html','国家税务总局转载新华社：2025年医美服务规模3701亿元（艾媒咨询口径），2026-05 https://www.chinatax.gov.cn/chinatax/n810219/n810780/c5249434/content.html','市场监管总局等十一部门：关于进一步加强医疗美容行业监管工作的指导意见 https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/ggjgs/art/2023/art_ab97d5643ddc45ae861e7f351842f512.html','国家药监局：第三类医疗器械唯一标识与全程追溯，2026年第21号 https://udi.nmpa.gov.cn/toDetail.html?CatalogId=2&infoId=80','爱美客2025年年度报告（深交所） https://disc.static.szse.cn/disc/disk03/finalpage/2026-03-20/2ca8b363-3791-429a-8bc8-8f1ba61787e9.PDF','华熙生物2025年年度报告 https://static.cninfo.com.cn/finalpage/2026-04-23/1225151451.PDF','昊海生科2025年年度报告 https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12008334&stockid=688366','行情：腾讯证券公开前复权日线；5股等权篮子，截至2026-08-10']
}
(ROOT/'data/reports/medical-aesthetics.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('wrote',len(prices),'trading days; last',last,'MA',mas,'fib',fib)
